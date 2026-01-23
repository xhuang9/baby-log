/**
 * Apply Baby Changes
 *
 * Applies baby entity changes from the server to local IndexedDB.
 */

import type { LocalBaby, LocalBabyAccess } from '@/lib/local-db';
import { saveBabies, saveBabyAccess } from '@/lib/local-db';

/**
 * Apply a baby change from the server
 */
export async function applyBabyChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  // Baby deletion is soft delete (archivedAt), not hard delete
  if (op === 'delete') {
    // For soft delete, we need the baby data with archivedAt set
    if (!data) {
      console.warn(`Baby delete operation missing data for id ${id}`);
      return;
    }
  }

  if (!data) {
    return;
  }

  const baby: LocalBaby = {
    id: data.id as number,
    name: data.name as string,
    birthDate: data.birthDate ? new Date(data.birthDate as string) : null,
    gender: (data.gender as 'male' | 'female' | 'other' | 'unknown' | null) ?? null,
    birthWeightG: (data.birthWeightG as number | null) ?? null,
    archivedAt: data.archivedAt ? new Date(data.archivedAt as string) : null,
    ownerUserId: data.ownerUserId as number,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveBabies([baby]);

  // If babyAccess data is included, save it too
  if (data.access && Array.isArray(data.access)) {
    const accessRecords: LocalBabyAccess[] = (data.access as Array<Record<string, unknown>>).map(
      acc => ({
        userId: acc.userId as number,
        babyId: acc.babyId as number,
        accessLevel: acc.accessLevel as 'owner' | 'editor' | 'viewer',
        caregiverLabel: acc.caregiverLabel as string | null,
        lastAccessedAt: acc.lastAccessedAt ? new Date(acc.lastAccessedAt as string) : null,
        createdAt: new Date(acc.createdAt as string),
        updatedAt: new Date(acc.updatedAt as string),
      }),
    );
    await saveBabyAccess(accessRecords);
  }
}
