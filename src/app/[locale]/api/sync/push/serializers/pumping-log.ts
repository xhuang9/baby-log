/**
 * Pumping Log Serializer
 *
 * Converts pumping log database records to JSON-safe format.
 */

import type { pumpingLogSchema } from '@/models/Schema';

export function serializePumpingLog(log: typeof pumpingLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id,
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    leftMl: log.leftMl,
    rightMl: log.rightMl,
    totalMl: log.totalMl,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
