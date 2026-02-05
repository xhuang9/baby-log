/**
 * Pumping Log Mutation Processor
 *
 * Handles create, update, and delete operations for pumping log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { pumpingLogSchema } from '@/models/Schema';
import { serializePumpingLog } from '../serializers';

export async function processPumpingLogMutation(
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
      .insert(pumpingLogSchema)
      .values({
        id: payload.id as string,
        babyId,
        loggedByUserId: userId,
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        leftMl: payload.leftMl as number | null,
        rightMl: payload.rightMl as number | null,
        totalMl: payload.totalMl as number,
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'pumping_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializePumpingLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(pumpingLogSchema)
      .where(eq(pumpingLogSchema.id, logId))
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
        serverData: serializePumpingLog(existing),
      };
    }

    const [updated] = await db
      .update(pumpingLogSchema)
      .set({
        startedAt: new Date(payload.startedAt as string),
        endedAt: payload.endedAt ? new Date(payload.endedAt as string) : null,
        leftMl: payload.leftMl as number | null,
        rightMl: payload.rightMl as number | null,
        totalMl: payload.totalMl as number,
        notes: payload.notes as string | null,
      })
      .where(eq(pumpingLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'pumping_log',
      entityId: logId,
      op: 'update',
      payload: serializePumpingLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: pumpingLogSchema.babyId })
      .from(pumpingLogSchema)
      .where(eq(pumpingLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(pumpingLogSchema).where(eq(pumpingLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'pumping_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
