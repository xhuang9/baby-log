/**
 * Baby Mutation Processor
 *
 * Handles create, update, and delete operations for baby entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { babiesSchema, babyAccessSchema } from '@/models/Schema';
import { serializeBaby } from '../serializers';

export async function processBabyMutation(
  mutationId: string,
  entityId: string,
  op: MutationOp,
  payload: Record<string, unknown>,
  userId: number,
): Promise<MutationResult> {
  const numericId = Number.parseInt(entityId, 10);

  if (op === 'create') {
    const insertedArray = await db
      .insert(babiesSchema)
      .values({
        name: payload.name as string,
        birthDate: payload.birthDate ? new Date(payload.birthDate as string) : null,
        gender: payload.gender as 'male' | 'female' | 'other' | 'unknown' | null,
        birthWeightG: payload.birthWeightG as number | null,
        ownerUserId: userId,
      })
      .returning() as unknown[];

    const inserted = insertedArray[0] as typeof babiesSchema.$inferSelect;

    // Create owner access record
    await db.insert(babyAccessSchema).values({
      userId,
      babyId: inserted.id,
      accessLevel: 'owner',
      lastAccessedAt: new Date(),
    });

    // Record sync event
    await writeSyncEvent({
      babyId: inserted.id,
      entityType: 'baby',
      entityId: inserted.id,
      op: 'create',
      payload: serializeBaby(inserted),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    // Check for conflict (LWW - server data wins if newer)
    const [existing] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, numericId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'error', error: 'Baby not found' };
    }

    const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
    const serverUpdatedAt = existing.updatedAt;

    // If server has newer data, return conflict
    if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
      return {
        mutationId,
        status: 'conflict',
        serverData: serializeBaby(existing),
      };
    }

    // Apply update
    console.log('[SYNC] Applying baby update to DB:', { numericId, name: payload.name });
    const [updated] = await db
      .update(babiesSchema)
      .set({
        name: payload.name as string,
        birthDate: payload.birthDate ? new Date(payload.birthDate as string) : null,
        gender: payload.gender as 'male' | 'female' | 'other' | 'unknown' | null,
        birthWeightG: payload.birthWeightG as number | null,
        archivedAt: payload.archivedAt ? new Date(payload.archivedAt as string) : null,
        updatedAt: new Date(),
      })
      .where(eq(babiesSchema.id, numericId))
      .returning();

    console.log('[SYNC] Baby updated successfully:', { id: updated?.id, name: updated?.name });

    // Record sync event
    await writeSyncEvent({
      babyId: numericId,
      entityType: 'baby',
      entityId: numericId,
      op: 'update',
      payload: serializeBaby(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    // Soft delete: set archivedAt
    const [existing] = await db
      .select()
      .from(babiesSchema)
      .where(eq(babiesSchema.id, numericId))
      .limit(1);

    if (!existing) {
      // Already deleted, consider success
      return { mutationId, status: 'success' };
    }

    const [archived] = await db
      .update(babiesSchema)
      .set({
        archivedAt: new Date(),
        updatedAt: new Date(),
      })
      .where(eq(babiesSchema.id, numericId))
      .returning();

    // Record sync event
    await writeSyncEvent({
      babyId: numericId,
      entityType: 'baby',
      entityId: numericId,
      op: 'delete',
      payload: serializeBaby(archived!),
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
