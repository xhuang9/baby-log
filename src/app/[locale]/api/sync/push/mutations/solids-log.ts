/**
 * Solids Log Mutation Processor
 *
 * Handles create, update, and delete operations for solids log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import type { SolidsReaction } from '@/lib/local-db';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { solidsLogSchema } from '@/models/Schema';
import { serializeSolidsLog } from '../serializers';

export async function processSolidsLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  // Solids log IDs are UUIDs (strings), not numeric IDs
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(solidsLogSchema)
      .values({
        id: payload.id as string, // Use client-generated UUID
        babyId,
        loggedByUserId: userId,
        food: payload.food as string,
        reaction: payload.reaction as SolidsReaction,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'solids_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeSolidsLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(solidsLogSchema)
      .where(eq(solidsLogSchema.id, logId))
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
        serverData: serializeSolidsLog(existing),
      };
    }

    const [updated] = await db
      .update(solidsLogSchema)
      .set({
        food: payload.food as string,
        reaction: payload.reaction as SolidsReaction,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .where(eq(solidsLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'solids_log',
      entityId: logId,
      op: 'update',
      payload: serializeSolidsLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: solidsLogSchema.babyId })
      .from(solidsLogSchema)
      .where(eq(solidsLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(solidsLogSchema).where(eq(solidsLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'solids_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
