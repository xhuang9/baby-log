/**
 * Solids Log Serializer
 *
 * Converts solids log database records to JSON-safe format.
 */

import type { solidsLogSchema } from '@/models/Schema';

export function serializeSolidsLog(log: typeof solidsLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id, // Already text (UUID)
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    food: log.food,
    reaction: log.reaction,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
