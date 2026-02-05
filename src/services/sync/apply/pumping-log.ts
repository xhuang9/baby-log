/**
 * Apply Pumping Log Changes
 *
 * Applies pumping log entity changes from the server to local IndexedDB.
 */

import type { LocalPumpingLog } from '@/lib/local-db';
import { deletePumpingLog, savePumpingLogs } from '@/lib/local-db';

/**
 * Apply a pumping log change from the server
 */
export async function applyPumpingLogChange(
  op: string,
  id: number | string,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deletePumpingLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const pumpingLog: LocalPumpingLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    leftMl: (data.leftMl as number) ?? null,
    rightMl: (data.rightMl as number) ?? null,
    totalMl: data.totalMl as number,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await savePumpingLogs([pumpingLog]);
}
