/**
 * Bath Log Serializer
 *
 * Converts bath log database records to JSON-safe format.
 */

import type { bathLogSchema } from '@/models/Schema';

export function serializeBathLog(log: typeof bathLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id, // Already text (UUID)
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
