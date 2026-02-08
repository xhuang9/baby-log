/**
 * Medication Log Serializer
 *
 * Converts medication log database records to JSON-safe format.
 */

import type { medicationLogSchema } from '@/models/Schema';

export function serializeMedicationLog(log: typeof medicationLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id,
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    medicationType: log.medicationType,
    medicationTypeId: log.medicationTypeId,
    amount: log.amount,
    unit: log.unit,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
