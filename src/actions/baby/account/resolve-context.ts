'use server';

/**
 * Resolve Account Context
 *
 * Determines the appropriate next step for a user after authentication.
 */

import type { ResolveAccountResult } from '../types';
import type { ActiveBaby } from '@/stores/useBabyStore';
import type { StoredUser } from '@/stores/useUserStore';
import { auth, clerkClient } from '@clerk/nextjs/server';
import { and, desc, eq, or, sql } from 'drizzle-orm';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessRequestsSchema,
  babyAccessSchema,
  babyInvitesSchema,
  userSchema,
} from '@/models/Schema';

export async function resolveAccountContext(): Promise<ResolveAccountResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    const clerk = await clerkClient();
    const clerkUser = await clerk.users.getUser(userId);
    const email = clerkUser.primaryEmailAddress?.emailAddress ?? null;
    const firstName = clerkUser.firstName ?? null;

    // Upsert user in local database
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
      return { success: false, error: 'Failed to create or update user' };
    }

    const localUser = userArray[0]!;

    const user: StoredUser = {
      id: clerkUser.id,
      localId: localUser.id,
      firstName,
      email,
      imageUrl: clerkUser.imageUrl,
    };

    // Check if user is locked
    if (localUser.locked) {
      return {
        success: true,
        user,
        nextStep: { type: 'locked' },
      };
    }

    // Get all babies the user has access to
    const babyAccess = await db
      .select({
        babyId: babiesSchema.id,
        name: babiesSchema.name,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
        archivedAt: babiesSchema.archivedAt,
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
    const pendingInvites = await db
      .select({
        id: babyInvitesSchema.id,
        babyName: babiesSchema.name,
        inviterEmail: userSchema.email,
      })
      .from(babyInvitesSchema)
      .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
      .innerJoin(userSchema, eq(babyInvitesSchema.inviterUserId, userSchema.id))
      .where(
        and(
          eq(babyInvitesSchema.invitedEmail, email ?? ''),
          eq(babyInvitesSchema.status, 'pending'),
          sql`${babyInvitesSchema.expiresAt} > NOW()`,
        ),
      );

    // If no babies, check for access requests and invites
    if (babyAccess.length === 0) {
      // Check for outgoing pending access requests
      const outgoingRequests = await db
        .select()
        .from(babyAccessRequestsSchema)
        .where(
          and(
            eq(babyAccessRequestsSchema.requesterUserId, localUser.id),
            eq(babyAccessRequestsSchema.status, 'pending'),
          ),
        )
        .limit(1);

      if (outgoingRequests.length > 0) {
        return {
          success: true,
          user,
          nextStep: { type: 'requestAccess' },
        };
      }

      // Check for incoming pending access requests
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
        return {
          success: true,
          user,
          nextStep: {
            type: 'shared',
            invites: pendingInvites.map(inv => ({
              id: inv.id,
              babyName: inv.babyName,
              inviterEmail: inv.inviterEmail ?? 'Unknown',
            })),
          },
        };
      }

      // No requests or invites, go to onboarding
      return {
        success: true,
        user,
        nextStep: { type: 'onboarding' },
      };
    }

    // Check if default baby is valid
    let defaultBaby = babyAccess.find(b => b.babyId === localUser.defaultBabyId);

    // If no valid default, pick the most recently accessed one
    if (!defaultBaby) {
      defaultBaby = babyAccess[0];

      // Update default baby in database
      if (defaultBaby) {
        await db
          .update(userSchema)
          .set({ defaultBabyId: defaultBaby.babyId })
          .where(eq(userSchema.id, localUser.id));
      }
    }

    if (!defaultBaby) {
      return {
        success: true,
        user,
        nextStep: { type: 'onboarding' },
      };
    }

    // If exactly one baby or default is set, go to overview
    if (babyAccess.length === 1 || defaultBaby) {
      const activeBaby: ActiveBaby = {
        babyId: defaultBaby.babyId,
        name: defaultBaby.name,
        accessLevel: defaultBaby.accessLevel,
        caregiverLabel: defaultBaby.caregiverLabel,
      };

      // Update lastAccessedAt
      await db
        .update(babyAccessSchema)
        .set({ lastAccessedAt: new Date() })
        .where(
          and(
            eq(babyAccessSchema.babyId, defaultBaby.babyId),
            eq(babyAccessSchema.userId, localUser.id),
          ),
        );

      return {
        success: true,
        user,
        nextStep: { type: 'overview', baby: activeBaby },
      };
    }

    // Multiple babies without a default, go to select page
    const babies: Array<ActiveBaby> = babyAccess.map(b => ({
      babyId: b.babyId,
      name: b.name,
      accessLevel: b.accessLevel,
      caregiverLabel: b.caregiverLabel,
    }));

    return {
      success: true,
      user,
      nextStep: { type: 'select', babies },
    };
  } catch (error) {
    console.error('Error resolving account context:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
