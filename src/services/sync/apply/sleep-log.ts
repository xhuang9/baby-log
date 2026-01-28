/**
 * Apply Sleep Log Changes
 *
 * Applies sleep log entity changes from the server to local IndexedDB.
 */

import type { LocalSleepLog } from '@/lib/local-db';
import { deleteSleepLog, saveSleepLogs } from '@/lib/local-db';

/**
 * Apply a sleep log change from the server
 */
export async function applySleepLogChange(
  op: string,
  id: number | string, // Can be number (old data) or string (UUID)
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id); // Convert to string for IndexedDB

  if (op === 'delete') {
    await deleteSleepLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const sleepLog: LocalSleepLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    durationMinutes: data.durationMinutes as number | null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveSleepLogs([sleepLog]);
}
