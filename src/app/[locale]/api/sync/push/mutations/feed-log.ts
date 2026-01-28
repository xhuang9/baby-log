/**
 * Feed Log Mutation Processor
 *
 * Handles create, update, and delete operations for feed log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { feedLogSchema } from '@/models/Schema';
import { serializeFeedLog } from '../serializers';

export async function processFeedLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  // Feed log IDs are UUIDs (strings), not numeric IDs
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(feedLogSchema)
      .values({
        id: payload.id as string, // Use client-generated UUID
        babyId,
        loggedByUserId: userId,
        method: payload.method as string,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        amountMl: payload.amountMl as number | null,
        isEstimated: (payload.isEstimated as boolean) ?? false,
        estimatedSource: payload.estimatedSource as string | null,
        endSide: payload.endSide as string | null,
      })
      .returning();

    // Record sync event
    await writeSyncEvent({
      babyId,
      entityType: 'feed_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeFeedLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    // Check for conflict (LWW - server data wins if newer)
    const [existing] = await db
      .select()
      .from(feedLogSchema)
      .where(eq(feedLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Entity not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    // If server has newer data, return conflict
    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeFeedLog(existing),
      };
    }

    // Apply update
    const [updated] = await db
      .update(feedLogSchema)
      .set({
        method: payload.method as string,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        amountMl: payload.amountMl as number | null,
        isEstimated: (payload.isEstimated as boolean) ?? false,
        endSide: payload.endSide as string | null,
      })
      .where(eq(feedLogSchema.id, logId))
      .returning();

    // Record sync event
    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'feed_log',
      entityId: logId,
      op: 'update',
      payload: serializeFeedLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: feedLogSchema.babyId })
      .from(feedLogSchema)
      .where(eq(feedLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      // Already deleted, consider success
      return { mutationId, status: 'success' };
    }

    await db.delete(feedLogSchema).where(eq(feedLogSchema.id, logId));

    // Record sync event
    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'feed_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
