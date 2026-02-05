/**
 * Apply Growth Log Changes
 *
 * Applies growth log entity changes from the server to local IndexedDB.
 */

import type { LocalGrowthLog } from '@/lib/local-db';
import { deleteGrowthLog, saveGrowthLogs } from '@/lib/local-db';

/**
 * Apply a growth log change from the server
 */
export async function applyGrowthLogChange(
  op: string,
  id: number | string, // Can be number (old data) or string (UUID)
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id); // Convert to string for IndexedDB

  if (op === 'delete') {
    await deleteGrowthLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const growthLog: LocalGrowthLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    startedAt: new Date(data.startedAt as string),
    weightG: (data.weightG as number) ?? null,
    heightMm: (data.heightMm as number) ?? null,
    headCircumferenceMm: (data.headCircumferenceMm as number) ?? null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveGrowthLogs([growthLog]);
}
