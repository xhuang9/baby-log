/**
 * Sleep Log Serializer
 *
 * Converts sleep log database records to JSON-safe format.
 */

import type { sleepLogSchema } from '@/models/Schema';

export function serializeSleepLog(log: typeof sleepLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
