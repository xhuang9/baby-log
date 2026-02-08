/**
 * Medication Log Mutation Processor
 *
 * Handles create, update, and delete operations for medication log entities.
 */

import type { MutationOp, MutationResult } from '../types';
import { eq } from 'drizzle-orm';
import { db } from '@/lib/db';
import { writeSyncEvent } from '@/lib/db/helpers/sync-events';
import { medicationLogSchema } from '@/models/Schema';
import { serializeMedicationLog } from '../serializers';

export async function processMedicationLogMutation(
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
      .insert(medicationLogSchema)
      .values({
        id: payload.id as string,
        babyId,
        loggedByUserId: userId,
        medicationType: payload.medicationType as string,
        medicationTypeId: payload.medicationTypeId as string,
        amount: payload.amount as number,
        unit: payload.unit as string,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .returning();

    await writeSyncEvent({
      babyId,
      entityType: 'medication_log',
      entityId: inserted!.id,
      op: 'create',
      payload: serializeMedicationLog(inserted!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'update') {
    const [existing] = await db
      .select()
      .from(medicationLogSchema)
      .where(eq(medicationLogSchema.id, logId))
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
        serverData: serializeMedicationLog(existing),
      };
    }

    const [updated] = await db
      .update(medicationLogSchema)
      .set({
        medicationType: payload.medicationType as string,
        medicationTypeId: payload.medicationTypeId as string,
        amount: payload.amount as number,
        unit: payload.unit as string,
        startedAt: new Date(payload.startedAt as string),
        notes: payload.notes as string | null,
      })
      .where(eq(medicationLogSchema.id, logId))
      .returning();

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'medication_log',
      entityId: logId,
      op: 'update',
      payload: serializeMedicationLog(updated!),
    });

    return { mutationId, status: 'success' };
  }

  if (op === 'delete') {
    const [existing] = await db
      .select({ babyId: medicationLogSchema.babyId })
      .from(medicationLogSchema)
      .where(eq(medicationLogSchema.id, logId))
      .limit(1);

    if (!existing) {
      return { mutationId, status: 'success' };
    }

    await db.delete(medicationLogSchema).where(eq(medicationLogSchema.id, logId));

    await writeSyncEvent({
      babyId: existing.babyId,
      entityType: 'medication_log',
      entityId: logId,
      op: 'delete',
      payload: null,
    });

    return { mutationId, status: 'success' };
  }

  return { mutationId, status: 'error', error: `Unknown operation: ${op}` };
}
