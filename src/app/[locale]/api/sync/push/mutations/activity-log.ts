/**
 * Activity Log Mutation Processor
 *
 * Handles create, update, and delete operations for activity log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { and, eq, lte, isNull, or } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { activityLogSchema } from '@/models/Schema';
import { serializeActivityLog } from '../serializers';

export async function processActivityLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    return await db.transaction(async (tx) => {
      const [inserted] = await tx
        .insert(activityLogSchema)
        .values({
          id: payload.id as string,
          babyId,
          loggedByUserId: userId,
          activityType: payload.activityType as 'tummy_time' | 'indoor_play' | 'outdoor_play' | 'screen_time' | 'other',
          startedAt: new Date(payload.startedAt as string),
          endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
          notes: payload.notes as string | null,
        })
        .returning();

      if (!inserted) {
        return { mutationId, status: 'error' as const, error: 'Failed to insert activity log' };
      }

      await writeSyncEvent({
        babyId,
        entityType: 'activity_log',
        entityId: inserted.id,
        op: 'create',
        payload: serializeActivityLog(inserted),
      }, tx);

      return { mutationId, status: 'success' as const };
    });
  }

  if (op === 'update') {
    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;

    const [updated] = await db
      .update(activityLogSchema)
      .set({
        activityType: payload.activityType as 'tummy_time' | 'indoor_play' | 'outdoor_play' | 'screen_time' | 'other',
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        notes: payload.notes as string | null,
      })
      .where(
        and(
          eq(activityLogSchema.id, logId),
          clientUpdatedAt
            ? or(
                lte(activityLogSchema.updatedAt, clientUpdatedAt),
                isNull(activityLogSchema.updatedAt),
              )
            : isNull(activityLogSchema.updatedAt),
        ),
      )
      .returning();

    if (!updated) {
      // No rows updated — either entity missing or conflict
      const [existing] = await db
        .select()
        .from(activityLogSchema)
        .where(eq(activityLogSchema.id, logId))
        .limit(1);

      if (!existing) {
        return { mutationId, status: 'error', error: 'Entity not found' };
      }

      return {
        mutationId,
        status: 'conflict',
        serverData: serializeActivityLog(existing),
      };
    }

    await writeSyncEvent({
      babyId: updated.babyId,
      entityType: 'activity_log',
      entityId: logId,
      op: 'update',
      payload: serializeActivityLog(updated),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: activityLogSchema.babyId })
      .from(activityLogSchema)
      .where(eq(activityLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(activityLogSchema).where(eq(activityLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'activity_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
