/**
 * Feed Logs Hook
 *
 * Reactive hook for fetching feed logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalFeedLog } from '@/lib/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';

/**
 * Get feed logs for a specific baby
 */
export function useFeedLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalFeedLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      let query = localDb.feedLogs
        .where('babyId')
        .equals(babyId)
        .reverse();

      if (limit) {
        query = query.limit(limit);
      }

      return query.sortBy('startedAt');
    },
    [babyId, limit],
    undefined,
  );
}

/**
 * Get feed logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useFeedLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalFeedLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      // If no date range specified (all history), return all logs
      if (startDate === null && endDate === null) {
        return localDb.feedLogs
          .where('babyId')
          .equals(babyId)
          .reverse()
          .sortBy('startedAt');
      }

      // If dates are provided, filter by date range
      if (!startDate || !endDate) {
        return [];
      }

      return localDb.feedLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
        .reverse()
        .sortBy('startedAt');
    },
    [babyId, startDate?.getTime(), endDate?.getTime()],
    undefined,
  );
}

/**
 * Get the most recent feed log for a baby
 */
export function useLatestFeedLog(
  babyId: number | null | undefined,
): LocalFeedLog | null | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return null;
      }

      const logs = await localDb.feedLogs
        .where('babyId')
        .equals(babyId)
        .reverse()
        .limit(1)
        .toArray();

      return logs[0] ?? null;
    },
    [babyId],
    undefined,
  );
}

/**
 * Get feed logs count for a baby
 */
export function useFeedLogsCount(babyId: number | null | undefined): number | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return 0;
      }

      return localDb.feedLogs
        .where('babyId')
        .equals(babyId)
        .count();
    },
    [babyId],
    undefined,
  );
}

/**
 * Get today's feed logs for a baby
 */
export function useTodaysFeedLogs(babyId: number | null | undefined): LocalFeedLog[] | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useFeedLogsByDateRange(babyId, today, tomorrow);
}
