/**
 * Activity Log Serializer
 *
 * Converts activity log database records to JSON-safe format.
 */

import type { activityLogSchema } from '@/models/Schema';

export function serializeActivityLog(log: typeof activityLogSchema.$inferSelect): Record<string, unknown> {
  return {
    id: log.id,
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    activityType: log.activityType,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
