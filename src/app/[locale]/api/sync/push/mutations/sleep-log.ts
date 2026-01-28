/**
 * Sleep Log Mutation Processor
 *
 * Handles create, update, and delete operations for sleep log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { sleepLogSchema } from '@/models/Schema';
import { serializeSleepLog } from '../serializers';

export async function processSleepLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  // Sleep log IDs are UUIDs (strings), not numeric IDs
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(sleepLogSchema)
      .values({
        id: payload.id as string, // Use client-generated UUID
        babyId,
        loggedByUserId: userId,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'sleep_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeSleepLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(sleepLogSchema)
      .where(eq(sleepLogSchema.id, logId))
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
        serverData: serializeSleepLog(existing),
      };
    }

    const [updated] = await db
      .update(sleepLogSchema)
      .set({
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        durationMinutes: payload.durationMinutes as number | null,
        notes: payload.notes as string | null,
      })
      .where(eq(sleepLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'sleep_log',
      entityId: logId,
      op: 'update',
      payload: serializeSleepLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: sleepLogSchema.babyId })
      .from(sleepLogSchema)
      .where(eq(sleepLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(sleepLogSchema).where(eq(sleepLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'sleep_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
