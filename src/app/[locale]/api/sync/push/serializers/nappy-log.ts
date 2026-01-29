/**
 * Nappy Log Serializer
 *
 * Converts nappy log database records to JSON-safe format.
 */

import type { nappyLogSchema } from '@/models/Schema';

export function serializeNappyLog(log: typeof nappyLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id, // Already text (UUID)
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    type: log.type,
    colour: log.colour,
    texture: log.texture,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
