/**
 * Growth Log Mutation Processor
 *
 * Handles create, update, and delete operations for growth log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { growthLogSchema } from '@/models/Schema';
import { serializeGrowthLog } from '../serializers';

export async function processGrowthLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  // Growth log IDs are UUIDs (strings), not numeric IDs
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(growthLogSchema)
      .values({
        id: payload.id as string, // Use client-generated UUID
        babyId,
        loggedByUserId: userId,
        startedAt: new Date(payload.startedAt as string),
        weightG: payload.weightG as number | null,
        heightMm: payload.heightMm as number | null,
        headCircumferenceMm: payload.headCircumferenceMm as number | null,
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'growth_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeGrowthLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(growthLogSchema)
      .where(eq(growthLogSchema.id, logId))
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
        serverData: serializeGrowthLog(existing),
      };
    }

    const [updated] = await db
      .update(growthLogSchema)
      .set({
        startedAt: new Date(payload.startedAt as string),
        weightG: payload.weightG as number | null,
        heightMm: payload.heightMm as number | null,
        headCircumferenceMm: payload.headCircumferenceMm as number | null,
        notes: payload.notes as string | null,
      })
      .where(eq(growthLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'growth_log',
      entityId: logId,
      op: 'update',
      payload: serializeGrowthLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: growthLogSchema.babyId })
      .from(growthLogSchema)
      .where(eq(growthLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(growthLogSchema).where(eq(growthLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'growth_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
