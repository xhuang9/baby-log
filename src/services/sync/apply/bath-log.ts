/**
 * Apply Bath Log Changes
 *
 * Applies bath log entity changes from the server to local IndexedDB.
 */

import type { LocalBathLog } from '@/lib/local-db';
import { deleteBathLog, saveBathLogs } from '@/lib/local-db';

/**
 * Apply a bath log change from the server
 */
export async function applyBathLogChange(
  op: string,
  id: number | string, // Can be number (old data) or string (UUID)
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id); // Convert to string for IndexedDB

  if (op === 'delete') {
    await deleteBathLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const bathLog: LocalBathLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    startedAt: new Date(data.startedAt as string),
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveBathLogs([bathLog]);
}
