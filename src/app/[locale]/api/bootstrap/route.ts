/**
 * Bootstrap API Endpoint
 *
 * Unified endpoint for post-login flow that:
 * - Validates session and upserts user
 * - Determines account state (locked, no_baby, pending_request, etc.)
 * - Returns all sync data needed for offline-first operation
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

import type { ActiveBaby } from '@/stores/useBabyStore';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, desc, eq, gte, or, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessRequestsSchema,
  babyAccessSchema,
  babyInvitesSchema,
  feedLogSchema,
  nappyLogSchema,
  sleepLogSchema,
  userSchema,
} from '@/models/Schema';

export const dynamic = 'force-dynamic';

// ============================================================================
// Types
// ============================================================================

type BootstrapUser = {
  id: number;
  clerkId: string;
  email: string | null;
  firstName: string | null;
  imageUrl: string | null;
  locked: boolean;
  defaultBabyId: number | null;
  createdAt: string;
  updatedAt: string;
};

type BootstrapBaby = {
  id: number;
  name: string;
  birthDate: string | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG: number | null;
  archivedAt: string | null;
  ownerUserId: number;
  createdAt: string;
  updatedAt: string;
};

type BootstrapBabyAccess = {
  oduserId: number;
  babyId: number;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: string | null;
};

type BootstrapInvite = {
  id: number;
  babyId: number;
  babyName: string;
  inviterEmail: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  expiresAt: string;
};

type BootstrapPendingRequest = {
  id: number;
  targetEmail: string;
  status: 'pending';
  message: string | null;
  createdAt: string;
};

type AccountState
  = | { type: 'locked' }
    | { type: 'no_baby' }
    | { type: 'pending_request'; request: BootstrapPendingRequest }
    | { type: 'has_invites'; invites: BootstrapInvite[] }
    | { type: 'select_baby'; babies: ActiveBaby[] }
    | { type: 'ready'; activeBaby: ActiveBaby };

type BootstrapResponse = {
  user: BootstrapUser;
  accountState: AccountState;
  syncData: {
    babies: BootstrapBaby[];
    babyAccess: BootstrapBabyAccess[];
    recentFeedLogs: Array<{
      id: string;
      babyId: number;
      loggedByUserId: number;
      method: string;
      startedAt: string;
      endedAt: string | null;
      durationMinutes: number | null;
      amountMl: number | null;
      isEstimated: boolean;
      endSide: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    recentSleepLogs: Array<{
      id: string;
      babyId: number;
      loggedByUserId: number;
      startedAt: string;
      endedAt: string | null;
      durationMinutes: number | null;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    recentNappyLogs: Array<{
      id: string;
      babyId: number;
      loggedByUserId: number;
      type: 'wee' | 'poo' | 'mixed' | 'dry' | null;
      startedAt: string;
      notes: string | null;
      createdAt: string;
      updatedAt: string;
    }>;
    uiConfig: null; // UI config is stored locally only for now
  };
  syncedAt: string;
};

// ============================================================================
// GET Handler
// ============================================================================

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    // Get Clerk user data
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(clerkId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    const firstName = clerkUser.firstName ?? null;
    const imageUrl = clerkUser.imageUrl ?? null;

    // Upsert user in database
    const userResult = await db
      .insert(userSchema)
      .values({
        clerkId: clerkUser.id,
        email,
        firstName,
      })
      .onConflictDoUpdate({
        target: userSchema.clerkId,
        set: {
          email,
          firstName,
          updatedAt: new Date(),
        },
      })
      .returning();

    const userArray = Array.isArray(userResult) ? userResult : [];
    if (userArray.length === 0) {
      return NextResponse.json(
        { error: 'Failed to create or update user' },
        { status: 500 },
      );
    }

    const localUser = userArray[0]!;

    // Build user object
    const user: BootstrapUser = {
      id: localUser.id,
      clerkId: localUser.clerkId ?? clerkId,
      email: localUser.email,
      firstName: localUser.firstName,
      imageUrl,
      locked: localUser.locked ?? false,
      defaultBabyId: localUser.defaultBabyId,
      createdAt: localUser.createdAt.toISOString(),
      updatedAt: localUser.updatedAt?.toISOString() ?? localUser.createdAt.toISOString(),
    };

    // Check if user is locked
    if (localUser.locked) {
      return NextResponse.json({
        user,
        accountState: { type: 'locked' },
        syncData: {
          babies: [],
          babyAccess: [],
          recentFeedLogs: [],
          recentSleepLogs: [],
          recentNappyLogs: [],
          uiConfig: null,
        },
        syncedAt: new Date().toISOString(),
      } satisfies BootstrapResponse);
    }

    // Get all babies user has access to
    const babyAccessRecords = await db
      .select({
        oduserId: babyAccessSchema.userId,
        babyId: babyAccessSchema.babyId,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
        babyName: babiesSchema.name,
        babyArchivedAt: babiesSchema.archivedAt,
      })
      .from(babyAccessSchema)
      .innerJoin(babiesSchema, eq(babyAccessSchema.babyId, babiesSchema.id))
      .where(
        and(
          eq(babyAccessSchema.userId, localUser.id),
          sql`${babiesSchema.archivedAt} IS NULL`,
        ),
      )
      .orderBy(desc(babyAccessSchema.lastAccessedAt));

    // Check for pending invites
    const pendingInvites = email
      ? await db
          .select({
            id: babyInvitesSchema.id,
            babyId: babyInvitesSchema.babyId,
            babyName: babiesSchema.name,
            inviterEmail: userSchema.email,
            accessLevel: babyInvitesSchema.accessLevel,
            expiresAt: babyInvitesSchema.expiresAt,
          })
          .from(babyInvitesSchema)
          .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
          .innerJoin(userSchema, eq(babyInvitesSchema.inviterUserId, userSchema.id))
          .where(
            and(
              eq(babyInvitesSchema.invitedEmail, email.toLowerCase()),
              eq(babyInvitesSchema.status, 'pending'),
              sql`${babyInvitesSchema.expiresAt} > NOW()`,
            ),
          )
      : [];

    // If no babies, determine the no-baby state
    if (babyAccessRecords.length === 0) {
      // Check for outgoing pending access requests
      const outgoingRequests = await db
        .select({
          id: babyAccessRequestsSchema.id,
          targetEmail: babyAccessRequestsSchema.targetEmail,
          status: babyAccessRequestsSchema.status,
          message: babyAccessRequestsSchema.message,
          createdAt: babyAccessRequestsSchema.createdAt,
        })
        .from(babyAccessRequestsSchema)
        .where(
          and(
            eq(babyAccessRequestsSchema.requesterUserId, localUser.id),
            eq(babyAccessRequestsSchema.status, 'pending'),
          ),
        )
        .limit(1);

      if (outgoingRequests.length > 0) {
        const request = outgoingRequests[0]!;
        return NextResponse.json({
          user,
          accountState: {
            type: 'pending_request',
            request: {
              id: request.id,
              targetEmail: request.targetEmail,
              status: 'pending',
              message: request.message,
              createdAt: request.createdAt.toISOString(),
            },
          },
          syncData: {
            babies: [],
            babyAccess: [],
            recentFeedLogs: [],
            recentSleepLogs: [],
            recentNappyLogs: [],
            uiConfig: null,
          },
          syncedAt: new Date().toISOString(),
        } satisfies BootstrapResponse);
      }

      // Check for incoming pending access requests or invites
      const incomingRequests = await db
        .select()
        .from(babyAccessRequestsSchema)
        .where(
          and(
            or(
              eq(babyAccessRequestsSchema.targetUserId, localUser.id),
              eq(babyAccessRequestsSchema.targetEmail, email?.toLowerCase() ?? ''),
            ),
            eq(babyAccessRequestsSchema.status, 'pending'),
          ),
        )
        .limit(1);

      if (incomingRequests.length > 0 || pendingInvites.length > 0) {
        return NextResponse.json({
          user,
          accountState: {
            type: 'has_invites',
            invites: pendingInvites.map(inv => ({
              id: inv.id,
              babyId: inv.babyId,
              babyName: inv.babyName,
              inviterEmail: inv.inviterEmail ?? 'Unknown',
              accessLevel: inv.accessLevel,
              expiresAt: inv.expiresAt.toISOString(),
            })),
          },
          syncData: {
            babies: [],
            babyAccess: [],
            recentFeedLogs: [],
            recentSleepLogs: [],
            recentNappyLogs: [],
            uiConfig: null,
          },
          syncedAt: new Date().toISOString(),
        } satisfies BootstrapResponse);
      }

      // No requests or invites, go to onboarding
      return NextResponse.json({
        user,
        accountState: { type: 'no_baby' },
        syncData: {
          babies: [],
          babyAccess: [],
          recentFeedLogs: [],
          recentSleepLogs: [],
          recentNappyLogs: [],
          uiConfig: null,
        },
        syncedAt: new Date().toISOString(),
      } satisfies BootstrapResponse);
    }

    // User has babies - get full baby data and logs
    const babyIds = babyAccessRecords.map(r => r.babyId);

    // Get baby details
    const babies = await db
      .select({
        id: babiesSchema.id,
        name: babiesSchema.name,
        birthDate: babiesSchema.birthDate,
        gender: babiesSchema.gender,
        birthWeightG: babiesSchema.birthWeightG,
        archivedAt: babiesSchema.archivedAt,
        ownerUserId: babiesSchema.ownerUserId,
        createdAt: babiesSchema.createdAt,
        updatedAt: babiesSchema.updatedAt,
      })
      .from(babiesSchema)
      .where(
        sql`${babiesSchema.id} IN (${sql.join(babyIds.map(id => sql`${id}`), sql`, `)})`,
      );

    // Get recent logs (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeedLogs = await db
      .select({
        id: feedLogSchema.id,
        babyId: feedLogSchema.babyId,
        loggedByUserId: feedLogSchema.loggedByUserId,
        method: feedLogSchema.method,
        startedAt: feedLogSchema.startedAt,
        endedAt: feedLogSchema.endedAt,
        durationMinutes: feedLogSchema.durationMinutes,
        amountMl: feedLogSchema.amountMl,
        isEstimated: feedLogSchema.isEstimated,
        endSide: feedLogSchema.endSide,
        createdAt: feedLogSchema.createdAt,
        updatedAt: feedLogSchema.updatedAt,
      })
      .from(feedLogSchema)
      .where(
        and(
          sql`${feedLogSchema.babyId} IN (${sql.join(babyIds.map(id => sql`${id}`), sql`, `)})`,
          gte(feedLogSchema.startedAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(feedLogSchema.startedAt));

    const recentSleepLogs = await db
      .select({
        id: sleepLogSchema.id,
        babyId: sleepLogSchema.babyId,
        loggedByUserId: sleepLogSchema.loggedByUserId,
        startedAt: sleepLogSchema.startedAt,
        endedAt: sleepLogSchema.endedAt,
        durationMinutes: sleepLogSchema.durationMinutes,
        notes: sleepLogSchema.notes,
        createdAt: sleepLogSchema.createdAt,
        updatedAt: sleepLogSchema.updatedAt,
      })
      .from(sleepLogSchema)
      .where(
        and(
          sql`${sleepLogSchema.babyId} IN (${sql.join(babyIds.map(id => sql`${id}`), sql`, `)})`,
          gte(sleepLogSchema.startedAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(sleepLogSchema.startedAt));

    const recentNappyLogs = await db
      .select({
        id: nappyLogSchema.id,
        babyId: nappyLogSchema.babyId,
        loggedByUserId: nappyLogSchema.loggedByUserId,
        type: nappyLogSchema.type,
        startedAt: nappyLogSchema.startedAt,
        notes: nappyLogSchema.notes,
        createdAt: nappyLogSchema.createdAt,
        updatedAt: nappyLogSchema.updatedAt,
      })
      .from(nappyLogSchema)
      .where(
        and(
          sql`${nappyLogSchema.babyId} IN (${sql.join(babyIds.map(id => sql`${id}`), sql`, `)})`,
          gte(nappyLogSchema.startedAt, sevenDaysAgo),
        ),
      )
      .orderBy(desc(nappyLogSchema.startedAt));

    // Build sync data
    const syncData: BootstrapResponse['syncData'] = {
      babies: babies.map(baby => ({
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate?.toISOString() ?? null,
        gender: baby.gender,
        birthWeightG: baby.birthWeightG,
        archivedAt: baby.archivedAt?.toISOString() ?? null,
        ownerUserId: baby.ownerUserId!,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt?.toISOString() ?? baby.createdAt.toISOString(),
      })),
      babyAccess: babyAccessRecords.map(access => ({
        oduserId: access.oduserId!,
        babyId: access.babyId!,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
        lastAccessedAt: access.lastAccessedAt?.toISOString() ?? null,
      })),
      recentFeedLogs: recentFeedLogs.map(log => ({
        id: String(log.id),
        babyId: log.babyId,
        loggedByUserId: log.loggedByUserId,
        method: log.method,
        startedAt: log.startedAt.toISOString(),
        endedAt: log.endedAt?.toISOString() ?? null,
        durationMinutes: log.durationMinutes,
        amountMl: log.amountMl,
        isEstimated: log.isEstimated,
        endSide: log.endSide,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
      })),
      recentSleepLogs: recentSleepLogs.map(log => ({
        id: String(log.id),
        babyId: log.babyId,
        loggedByUserId: log.loggedByUserId,
        startedAt: log.startedAt.toISOString(),
        endedAt: log.endedAt?.toISOString() ?? null,
        durationMinutes: log.durationMinutes,
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
      })),
      recentNappyLogs: recentNappyLogs.map(log => ({
        id: String(log.id),
        babyId: log.babyId,
        loggedByUserId: log.loggedByUserId,
        type: log.type,
        startedAt: log.startedAt.toISOString(),
        notes: log.notes,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
      })),
      uiConfig: null,
    };

    // Determine active baby
    let defaultBaby = babyAccessRecords.find(b => b.babyId === localUser.defaultBabyId);

    // If no valid default, pick the most recently accessed one
    if (!defaultBaby) {
      defaultBaby = babyAccessRecords[0];

      // Update default baby in database
      if (defaultBaby) {
        await db
          .update(userSchema)
          .set({ defaultBabyId: defaultBaby.babyId })
          .where(eq(userSchema.id, localUser.id));
      }
    }

    // Build ActiveBaby list for state
    const allBabies: ActiveBaby[] = babyAccessRecords.map(b => ({
      babyId: b.babyId!,
      name: b.babyName,
      accessLevel: b.accessLevel,
      caregiverLabel: b.caregiverLabel,
    }));

    // Determine account state
    let accountState: AccountState;

    if (allBabies.length === 1 || defaultBaby) {
      const activeBaby: ActiveBaby = {
        babyId: defaultBaby!.babyId!,
        name: defaultBaby!.babyName,
        accessLevel: defaultBaby!.accessLevel,
        caregiverLabel: defaultBaby!.caregiverLabel,
      };

      // Update lastAccessedAt
      await db
        .update(babyAccessSchema)
        .set({ lastAccessedAt: new Date() })
        .where(
          and(
            eq(babyAccessSchema.babyId, defaultBaby!.babyId!),
            eq(babyAccessSchema.userId, localUser.id),
          ),
        );

      accountState = { type: 'ready', activeBaby };
    } else {
      // Multiple babies without a clear default
      accountState = { type: 'select_baby', babies: allBabies };
    }

    return NextResponse.json({
      user,
      accountState,
      syncData,
      syncedAt: new Date().toISOString(),
    } satisfies BootstrapResponse);
  } catch (error) {
    console.error('Bootstrap error:', error);
    return NextResponse.json(
      { error: 'Failed to bootstrap account' },
      { status: 500 },
    );
  }
}
