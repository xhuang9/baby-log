/**
 * Baby Serializer
 *
 * Converts baby database records to JSON-safe format.
 */

import type { babiesSchema } from '@/models/Schema';

export function serializeBaby(baby: typeof babiesSchema.$inferSelect): Record<string, unknown> {
  return {
    id: baby.id,
    name: baby.name,
    birthDate: baby.birthDate?.toISOString() ?? null,
    gender: baby.gender,
    birthWeightG: baby.birthWeightG,
    archivedAt: baby.archivedAt?.toISOString() ?? null,
    ownerUserId: baby.ownerUserId,
    createdAt: baby.createdAt.toISOString(),
    updatedAt: baby.updatedAt?.toISOString() ?? baby.createdAt.toISOString(),
  };
}
