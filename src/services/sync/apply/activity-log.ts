/**
 * Apply Activity Log Changes
 *
 * Applies activity log entity changes from the server to local IndexedDB.
 */

import type { ActivityLogCategory, LocalActivityLog } from '@/lib/local-db';
import { deleteActivityLogLocal, saveActivityLogs } from '@/lib/local-db';

/**
 * Apply an activity log change from the server
 */
export async function applyActivityLogChange(
  op: string,
  id: number | string,
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id);

  if (op === 'delete') {
    await deleteActivityLogLocal(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const activityLog: LocalActivityLog = {
    id: stringId,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    activityType: data.activityType as ActivityLogCategory,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveActivityLogs([activityLog]);
}
