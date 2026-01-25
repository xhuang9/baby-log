'use client';

import type { ActivityType } from './useLogsFilters';
import type { UnifiedLog } from '@/lib/format-log';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';
import { useFeedLogsByDateRange } from './useFeedLogs';
import { useSleepLogsByDateRange } from './useSleepLogs';

/**
 * Fetch all activity logs (feed + sleep) for a baby within a date range
 * Returns unified logs sorted DESC by startedAt with caregiver labels
 *
 * Usage:
 * ```
 * const { activeTypes, startDate, endDate } = useLogsFilters();
 * const logs = useAllActivityLogs(babyId, activeTypes, startDate, endDate);
 * ```
 */
export function useAllActivityLogs(
  babyId: number | null | undefined,
  activeTypes: ActivityType[],
  startDate: Date | null,
  endDate: Date | null,
): UnifiedLog[] | undefined {
  // Query each activity type conditionally
  const feeds = useFeedLogsByDateRange(
    activeTypes.includes('feed') ? babyId : null,
    startDate,
    endDate,
  );

  const sleeps = useSleepLogsByDateRange(
    activeTypes.includes('sleep') ? babyId : null,
    startDate,
    endDate,
  );

  // Merge and enrich with caregiver data
  const allLogs = useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      // If any feed/sleep queries are loading (undefined), return undefined
      if (
        (activeTypes.includes('feed') && feeds === undefined)
        || (activeTypes.includes('sleep') && sleeps === undefined)
      ) {
        return undefined;
      }

      const unified: UnifiedLog[] = [];

      // Transform feeds
      if (feeds) {
        for (const feed of feeds) {
          const access = await localDb.babyAccess
            .where('[userId+babyId]')
            .equals([feed.loggedByUserId, babyId])
            .first();

          unified.push({
            id: feed.id,
            type: 'feed',
            babyId: feed.babyId,
            startedAt: feed.startedAt,
            caregiverLabel: access?.caregiverLabel ?? null,
            data: feed,
          });
        }
      }

      // Transform sleeps
      if (sleeps) {
        for (const sleep of sleeps) {
          const access = await localDb.babyAccess
            .where('[userId+babyId]')
            .equals([sleep.loggedByUserId, babyId])
            .first();

          unified.push({
            id: sleep.id,
            type: 'sleep',
            babyId: sleep.babyId,
            startedAt: sleep.startedAt,
            caregiverLabel: access?.caregiverLabel ?? null,
            data: sleep,
          });
        }
      }

      // Sort DESC by startedAt (newest first)
      return unified.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    },
    [babyId, feeds, sleeps, activeTypes.join(',')],
    undefined,
  );

  return allLogs;
}
