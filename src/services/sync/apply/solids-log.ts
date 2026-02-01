/**
 * Apply Solids Log Changes
 *
 * Applies solids log entity changes from the server to local IndexedDB.
 */

import type { LocalSolidsLog, SolidsReaction } from '@/lib/local-db';
import { deleteSolidsLog, saveSolidsLogs } from '@/lib/local-db';

/**
 * Apply a solids log change from the server
 */
export async function applySolidsLogChange(
  op: string,
  id: number | string, // Can be number (old data) or string (UUID)
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id); // Convert to string for IndexedDB

  if (op === 'delete') {
    await deleteSolidsLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const solidsLog: LocalSolidsLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    food: data.food as string,
    foodTypeIds: (data.foodTypeIds as string[]) ?? [],
    reaction: data.reaction as SolidsReaction,
    startedAt: new Date(data.startedAt as string),
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveSolidsLogs([solidsLog]);
}
