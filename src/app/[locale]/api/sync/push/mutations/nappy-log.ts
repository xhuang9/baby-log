/**
 * Nappy Log Mutation Processor
 *
 * Handles create, update, and delete operations for nappy log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import type { NappyColour, NappyTexture } from '@/lib/local-db';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { nappyLogSchema } from '@/models/Schema';
import { serializeNappyLog } from '../serializers';

export async function processNappyLogMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
  babyId: number | undefined,
): Promise<MutationResult> {
  // Nappy log IDs are UUIDs (strings), not numeric IDs
  const logId = entityId;

  if (op === 'create') {
    if (!babyId) {
      return { mutationId, status: 'error', error: 'babyId is required for create' };
    }

    const [inserted] = await db
      .insert(nappyLogSchema)
      .values({
        id: payload.id as string, // Use client-generated UUID
        babyId,
        loggedByUserId: userId,
        type: payload.type as 'wee' | 'poo' | 'mixed' | 'dry' | 'clean' | null,
        colour: payload.colour as NappyColour | null,
        texture: payload.texture as NappyTexture | null,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'nappy_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeNappyLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(nappyLogSchema)
      .where(eq(nappyLogSchema.id, logId))
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
        serverData: serializeNappyLog(existing),
      };
    }

    const [updated] = await db
      .update(nappyLogSchema)
      .set({
        type: payload.type as 'wee' | 'poo' | 'mixed' | 'dry' | 'clean' | null,
        colour: payload.colour as NappyColour | null,
        texture: payload.texture as NappyTexture | null,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .where(eq(nappyLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'nappy_log',
      entityId: logId,
      op: 'update',
      payload: serializeNappyLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: nappyLogSchema.babyId })
      .from(nappyLogSchema)
      .where(eq(nappyLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(nappyLogSchema).where(eq(nappyLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'nappy_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
