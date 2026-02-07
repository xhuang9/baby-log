/**
 * Activity Log Mutation Processor
 *
 * Handles create, update, and delete operations for activity log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
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

    const [inserted] = await db
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

    await writeSyncEvent({
      babyId,
      entityType: 'activity_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeActivityLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(activityLogSchema)
      .where(eq(activityLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Entity not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeActivityLog(existing),
      };
    }

    const [updated] = await db
      .update(activityLogSchema)
      .set({
        activityType: payload.activityType as 'tummy_time' | 'indoor_play' | 'outdoor_play' | 'screen_time' | 'other',
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        notes: payload.notes as string | null,
      })
      .where(eq(activityLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'activity_log',
      entityId: logId,
      op: 'update',
      payload: serializeActivityLog(updated!),
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
