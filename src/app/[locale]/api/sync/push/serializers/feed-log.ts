/**
 * Feed Log Serializer
 *
 * Converts feed log database records to JSON-safe format.
 */

import type { feedLogSchema } from '@/models/Schema';

export function serializeFeedLog(log: typeof feedLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id, // Already text (UUID)
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    method: log.method,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    amountMl: log.amountMl,
    isEstimated: log.isEstimated,
    endSide: log.endSide,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
