/**
 * Growth Log Serializer
 *
 * Converts growth log database records to JSON-safe format.
 */

import type { growthLogSchema } from '@/models/Schema';

export function serializeGrowthLog(log: typeof growthLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id, // Already text (UUID)
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    weightG: log.weightG,
    heightMm: log.heightMm,
    headCircumferenceMm: log.headCircumferenceMm,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
