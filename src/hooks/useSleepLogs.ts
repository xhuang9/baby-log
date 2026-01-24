/**
 * Sleep Logs Hook
 *
 * Reactive hook for fetching sleep logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalSleepLog } from '@/lib/local-db';
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';

/**
 * Get sleep logs for a specific baby
 */
export function useSleepLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalSleepLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      let query = localDb.sleepLogs
        .where('babyId')
        .equals(babyId)
        .reverse();

      if (limit) {
        query = query.limit(limit);
      }

      return query.toArray();
    },
    [babyId, limit],
    undefined,
  );
}

/**
 * Get sleep logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useSleepLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalSleepLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      // If no date range specified (all history), return all logs
      if (startDate === null && endDate === null) {
        return localDb.sleepLogs
          .where('babyId')
          .equals(babyId)
          .reverse()
          .toArray();
      }

      // If dates are provided, filter by date range
      if (!startDate || !endDate) {
        return [];
      }

      const logs = await localDb.sleepLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
        .toArray();

      // Sort descending by startedAt (newest first)
      return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    },
    [babyId, startDate?.getTime(), endDate?.getTime()],
    undefined,
  );
}

/**
 * Get the most recent sleep log for a baby
 */
export function useLatestSleepLog(
  babyId: number | null | undefined,
): LocalSleepLog | null | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return null;
      }

      const logs = await localDb.sleepLogs
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
 * Get sleep logs count for a baby
 */
export function useSleepLogsCount(babyId: number | null | undefined): number | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return 0;
      }

      return localDb.sleepLogs
        .where('babyId')
        .equals(babyId)
        .count();
    },
    [babyId],
    undefined,
  );
}

/**
 * Get today's sleep logs for a baby
 */
export function useTodaysSleepLogs(babyId: number | null | undefined): LocalSleepLog[] | undefined {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  return useSleepLogsByDateRange(babyId, today, tomorrow);
}

/**
 * Get ongoing sleep (started but not ended) for a baby
 */
export function useOngoingSleep(
  babyId: number | null | undefined,
): LocalSleepLog | null | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return null;
      }

      const logs = await localDb.sleepLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.endedAt === null)
        .toArray();

      return logs[0] ?? null;
    },
    [babyId],
    undefined,
  );
}
