/**
 * Apply Nappy Log Changes
 *
 * Applies nappy log entity changes from the server to local IndexedDB.
 */

import type { LocalNappyLog, NappyType } from '@/lib/local-db';
import { deleteNappyLog, saveNappyLogs } from '@/lib/local-db';

/**
 * Apply a nappy log change from the server
 */
export async function applyNappyLogChange(
  op: string,
  id: number,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteNappyLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const nappyLog: LocalNappyLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    type: data.type as NappyType | null,
    startedAt: new Date(data.startedAt as string),
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveNappyLogs([nappyLog]);
}
