/**
 * Apply Feed Log Changes
 *
 * Applies feed log entity changes from the server to local IndexedDB.
 */

import type { FeedMethod, FeedSide, LocalFeedLog } from '@/lib/local-db';
import { deleteFeedLog, saveFeedLogs } from '@/lib/local-db';

/**
 * Apply a feed log change from the server
 */
export async function applyFeedLogChange(
  op: string,
  id: number | string, // Can be number (old data) or string (UUID)
  data: Record<string, unknown> | null,
): Promise<void> {
  const stringId = String(id); // Convert to string for IndexedDB

  if (op === 'delete') {
    await deleteFeedLog(stringId);
    return;
  }

  if (!data) {
    return;
  }

  const feedLog: LocalFeedLog = {
    id: data.id as string,
    babyId: data.babyId as number,
    loggedByUserId: data.loggedByUserId as number,
    method: data.method as FeedMethod,
    startedAt: new Date(data.startedAt as string),
    endedAt: data.endedAt ? new Date(data.endedAt as string) : null,
    durationMinutes: data.durationMinutes as number | null,
    amountMl: data.amountMl as number | null,
    isEstimated: data.isEstimated as boolean,
    endSide: data.endSide as FeedSide | null,
    notes: (data.notes as string) ?? null,
    createdAt: new Date(data.createdAt as string),
    updatedAt: new Date(data.updatedAt as string),
  };

  await saveFeedLogs([feedLog]);
}
