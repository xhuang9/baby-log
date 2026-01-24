'use server';

import { auth } from '@clerk/nextjs/server';
import { and, desc, eq } from 'drizzle-orm';
import { revalidatePath } from 'next/cache';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { babyAccessSchema, feedLogSchema } from '@/models/Schema';
import {
  assertUserCanAccessBaby,
  assertUserCanLogForBaby,
} from '@/services/baby-access';
import { serializeFeedLog } from '@/app/[locale]/api/sync/push/serializers/feed-log';

export type FeedMethod = 'breast' | 'bottle';
export type EndSide = 'left' | 'right';

export type FeedLogWithCaregiver = {
  id: number;
  babyId: number;
  method: FeedMethod;
  startedAt: Date;
  endedAt: Date | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: EndSide | null;
  caregiverLabel: string | null;
  createdAt: Date;
};

type CreateFeedLogResult
  = | { success: true; feedLog: FeedLogWithCaregiver }
    | { success: false; error: string };

type CreateFeedLogData = {
  babyId: number;
  method: FeedMethod;
  startedAt: Date;
  // For bottle feeds
  amountMl?: number;
  // For breast feeds
  durationMinutes?: number;
  endSide?: EndSide;
};

export async function createFeedLog(data: CreateFeedLogData): Promise<CreateFeedLogResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user can log for this baby (owner or editor)
    const accessResult = await assertUserCanLogForBaby(userId, data.babyId);
    if (!accessResult.success) {
      return accessResult;
    }

    const { user, access } = accessResult.data;

    // Calculate endedAt for breast feeds based on duration
    let endedAt: Date | null = null;
    if (data.method === 'breast' && data.durationMinutes) {
      endedAt = new Date(data.startedAt.getTime() + data.durationMinutes * 60 * 1000);
    }

    // For bottle feeds, set endedAt to startedAt (instant)
    if (data.method === 'bottle') {
      endedAt = data.startedAt;
    }

    // Estimate amount for breast feeds based on duration
    // Simple estimation: ~1ml per minute of feeding (can be refined with baby age/gender)
    let amountMl = data.amountMl ?? null;
    let isEstimated = false;
    let estimatedSource: string | null = null;

    if (data.method === 'breast' && data.durationMinutes && !amountMl) {
      // Basic estimation: approximately 1-1.5ml per minute for newborns
      // This can be improved with baby's age and gender
      amountMl = Math.round(data.durationMinutes * 1.2);
      isEstimated = true;
      estimatedSource = 'default_model';
    }

    const feedLogResult = await db
      .insert(feedLogSchema)
      .values({
        babyId: data.babyId,
        loggedByUserId: user.id,
        method: data.method,
        startedAt: data.startedAt,
        endedAt,
        durationMinutes: data.durationMinutes ?? null,
        amountMl,
        isEstimated,
        estimatedSource,
        endSide: data.endSide ?? null,
      })
      .returning();

    const feedLog = feedLogResult[0];
    if (!feedLog) {
      return { success: false, error: 'Failed to create feed log' };
    }

    // Write sync event for other caregivers to pull
    await writeSyncEvent({
      babyId: data.babyId,
      entityType: 'feed_log',
      entityId: feedLog.id,
      op: 'create',
      payload: serializeFeedLog(feedLog),
    });

    revalidatePath('/overview');
    revalidatePath('/logs');

    return {
      success: true,
      feedLog: {
        id: feedLog.id,
        babyId: feedLog.babyId,
        method: feedLog.method as FeedMethod,
        startedAt: feedLog.startedAt,
        endedAt: feedLog.endedAt,
        durationMinutes: feedLog.durationMinutes,
        amountMl: feedLog.amountMl,
        isEstimated: feedLog.isEstimated,
        endSide: feedLog.endSide as EndSide | null,
        caregiverLabel: access.caregiverLabel,
        createdAt: feedLog.createdAt,
      },
    };
  } catch (error) {
    console.error('Error creating feed log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

type GetLatestFeedLogResult
  = | { success: true; feedLog: FeedLogWithCaregiver | null }
    | { success: false; error: string };

export async function getLatestFeedLog(babyId: number): Promise<GetLatestFeedLogResult> {
  const { userId } = await auth();
  if (!userId) {
    return { success: false, error: 'Not authenticated' };
  }

  try {
    // Verify user can access this baby
    const accessResult = await assertUserCanAccessBaby(userId, babyId);
    if (!accessResult.success) {
      return accessResult;
    }

    const [feedLog] = await db
      .select({
        id: feedLogSchema.id,
        babyId: feedLogSchema.babyId,
        method: feedLogSchema.method,
        startedAt: feedLogSchema.startedAt,
        endedAt: feedLogSchema.endedAt,
        durationMinutes: feedLogSchema.durationMinutes,
        amountMl: feedLogSchema.amountMl,
        isEstimated: feedLogSchema.isEstimated,
        endSide: feedLogSchema.endSide,
        caregiverLabel: babyAccessSchema.caregiverLabel,
        createdAt: feedLogSchema.createdAt,
      })
      .from(feedLogSchema)
      .innerJoin(
        babyAccessSchema,
        and(
          eq(babyAccessSchema.babyId, feedLogSchema.babyId),
          eq(babyAccessSchema.userId, feedLogSchema.loggedByUserId),
        ),
      )
      .where(eq(feedLogSchema.babyId, babyId))
      .orderBy(desc(feedLogSchema.startedAt))
      .limit(1);

    if (!feedLog) {
      return { success: true, feedLog: null };
    }

    return {
      success: true,
      feedLog: {
        id: feedLog.id,
        babyId: feedLog.babyId,
        method: feedLog.method as FeedMethod,
        startedAt: feedLog.startedAt,
        endedAt: feedLog.endedAt,
        durationMinutes: feedLog.durationMinutes,
        amountMl: feedLog.amountMl,
        isEstimated: feedLog.isEstimated,
        endSide: feedLog.endSide as EndSide | null,
        caregiverLabel: feedLog.caregiverLabel,
        createdAt: feedLog.createdAt,
      },
    };
  } catch (error) {
    console.error('Error getting latest feed log:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
