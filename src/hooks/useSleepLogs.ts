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
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get sleep logs for a specific baby
 */
export function useSleepLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalSleepLog[] | undefined {
  return useActivityLogsForBaby(localDb.sleepLogs, babyId, limit);
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
  return useActivityLogsByDateRange(localDb.sleepLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent sleep log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestSleepLog(
  babyId: number | null | undefined,
): LocalSleepLog | null | undefined {
  return useLatestActivityLog(localDb.sleepLogs, babyId);
}

/**
 * Get sleep logs count for a baby
 */
export function useSleepLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.sleepLogs, babyId);
}

/**
 * Get today's sleep logs for a baby
 */
export function useTodaysSleepLogs(babyId: number | null | undefined): LocalSleepLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
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

      // Sort descending by startedAt to get the most recent ongoing sleep
      logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
      return logs[0] ?? null;
    },
    [babyId],
    undefined,
  );
}
