/**
 * Nappy Logs Hook
 *
 * Reactive hook for fetching nappy logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalNappyLog, NappyType } from '@/lib/local-db';
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
 * Get nappy logs for a specific baby
 */
export function useNappyLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalNappyLog[] | undefined {
  return useActivityLogsForBaby(localDb.nappyLogs, babyId, limit);
}

/**
 * Get nappy logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useNappyLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalNappyLog[] | undefined {
  return useActivityLogsByDateRange(localDb.nappyLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent nappy log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestNappyLog(
  babyId: number | null | undefined,
): LocalNappyLog | null | undefined {
  return useLatestActivityLog(localDb.nappyLogs, babyId);
}

/**
 * Get nappy logs count for a baby
 */
export function useNappyLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.nappyLogs, babyId);
}

/**
 * Get today's nappy logs for a baby
 */
export function useTodaysNappyLogs(babyId: number | null | undefined): LocalNappyLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useNappyLogsByDateRange(babyId, today, tomorrow);
}

/**
 * Get nappy logs filtered by type for a baby
 */
export function useNappyLogsByType(
  babyId: number | null | undefined,
  nappyType: NappyType,
  limit?: number,
): LocalNappyLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      const logs = await localDb.nappyLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.type === nappyType)
        .toArray();

      // Sort descending by startedAt (newest first)
      logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

      if (limit) {
        return logs.slice(0, limit);
      }

      return logs;
    },
    [babyId, nappyType, limit],
    undefined,
  );
}

/**
 * Get count of nappy changes by type for today
 */
export function useTodaysNappyCountByType(
  babyId: number | null | undefined,
): Record<NappyType, number> | undefined {
  const { today, tomorrow } = getTodayDateRange();

  return useLiveQuery(
    async () => {
      if (!babyId) {
        return { wee: 0, poo: 0, mixed: 0, dry: 0, clean: 0 };
      }

      const logs = await localDb.nappyLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.startedAt >= today && log.startedAt < tomorrow)
        .toArray();

      const counts: Record<NappyType, number> = { wee: 0, poo: 0, mixed: 0, dry: 0, clean: 0 };
      for (const log of logs) {
        if (log.type) {
          counts[log.type]++;
        }
      }

      return counts;
    },
    [babyId, today.getTime()],
    undefined,
  );
}
