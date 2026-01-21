/**
 * Initial Sync API Endpoint
 *
 * Returns all data needed for initial client sync:
 * - User profile
 * - All accessible babies
 * - Baby access records
 * - Recent feed logs (last 7 days)
 * - UI configuration
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import { auth } from '@clerk/nextjs/server';
import { and, desc, eq, gte, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { db } from '@/lib/db';
import {
  babiesSchema,
  babyAccessSchema,
  feedLogSchema,
  userSchema,
} from '@/models/Schema';

export const dynamic = 'force-dynamic';

export async function GET() {
  const { userId: clerkId } = await auth();

  if (!clerkId) {
    return NextResponse.json(
      { error: 'Unauthorized' },
      { status: 401 },
    );
  }

  try {
    // Get local user
    const [localUser] = await db
      .select()
      .from(userSchema)
      .where(eq(userSchema.clerkId, clerkId))
      .limit(1);

    if (!localUser) {
      return NextResponse.json(
        { error: 'User not found' },
        { status: 404 },
      );
    }

    // Get all babies user has access to
    const babyAccessRecords = await db
      .select({
        userId: babyAccessSchema.userId,
        babyId: babyAccessSchema.babyId,
        accessLevel: babyAccessSchema.accessLevel,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        lastAccessedAt: babyAccessSchema.lastAccessedAt,
        createdAt: babyAccessSchema.createdAt,
        updatedAt: babyAccessSchema.updatedAt,
      })
      .from(babyAccessSchema)
      .where(eq(babyAccessSchema.userId, localUser.id));

    const babyIds = babyAccessRecords.map(r => r.babyId);

    // Get baby details
    const babies = babyIds.length > 0
      ? await db
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
            and(
              sql`${babiesSchema.id} IN (${sql.join(babyIds.map(id => sql`${id}`), sql`, `)})`,
              sql`${babiesSchema.archivedAt} IS NULL`,
            ),
          )
      : [];

    // Get recent feed logs (last 7 days) for all accessible babies
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    const recentFeedLogs = babyIds.length > 0
      ? await db
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
          .orderBy(desc(feedLogSchema.startedAt))
      : [];

    // Build response
    const response = {
      user: {
        id: localUser.id,
        clerkId: localUser.clerkId,
        email: localUser.email,
        firstName: localUser.firstName,
        imageUrl: null, // We don't store this in DB, client gets from Clerk
        defaultBabyId: localUser.defaultBabyId,
        locked: localUser.locked,
        createdAt: localUser.createdAt.toISOString(),
        updatedAt: localUser.updatedAt.toISOString(),
      },
      babies: babies.map(baby => ({
        id: baby.id,
        name: baby.name,
        birthDate: baby.birthDate?.toISOString() ?? null,
        gender: baby.gender,
        birthWeightG: baby.birthWeightG,
        archivedAt: baby.archivedAt?.toISOString() ?? null,
        ownerUserId: baby.ownerUserId,
        createdAt: baby.createdAt.toISOString(),
        updatedAt: baby.updatedAt.toISOString(),
      })),
      babyAccess: babyAccessRecords.map(access => ({
        userId: access.userId,
        babyId: access.babyId,
        accessLevel: access.accessLevel,
        caregiverLabel: access.caregiverLabel,
        lastAccessedAt: access.lastAccessedAt?.toISOString() ?? null,
        createdAt: access.createdAt.toISOString(),
        updatedAt: access.updatedAt?.toISOString() ?? access.createdAt.toISOString(),
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
        notes: null,
        createdAt: log.createdAt.toISOString(),
        updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
      })),
      uiConfig: null, // UI config is stored locally only for now
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Initial sync error:', error);
    return NextResponse.json(
      { error: 'Failed to fetch initial sync data' },
      { status: 500 },
    );
  }
}
