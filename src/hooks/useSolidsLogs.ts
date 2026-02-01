/**
 * Solids Logs Hook
 *
 * Reactive hook for fetching solids logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalSolidsLog, SolidsReaction } from '@/lib/local-db';
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
 * Get solids logs for a specific baby
 */
export function useSolidsLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalSolidsLog[] | undefined {
  return useActivityLogsForBaby(localDb.solidsLogs, babyId, limit);
}

/**
 * Get solids logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useSolidsLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalSolidsLog[] | undefined {
  return useActivityLogsByDateRange(localDb.solidsLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent solids log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestSolidsLog(
  babyId: number | null | undefined,
): LocalSolidsLog | null | undefined {
  return useLatestActivityLog(localDb.solidsLogs, babyId);
}

/**
 * Get solids logs count for a baby
 */
export function useSolidsLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.solidsLogs, babyId);
}

/**
 * Get today's solids logs for a baby
 */
export function useTodaysSolidsLogs(babyId: number | null | undefined): LocalSolidsLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useSolidsLogsByDateRange(babyId, today, tomorrow);
}

/**
 * Get solids logs filtered by reaction for a baby
 */
export function useSolidsLogsByReaction(
  babyId: number | null | undefined,
  reaction: SolidsReaction,
  limit?: number,
): LocalSolidsLog[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      const logs = await localDb.solidsLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.reaction === reaction)
        .toArray();

      // Sort descending by startedAt (newest first)
      logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

      if (limit) {
        return logs.slice(0, limit);
      }

      return logs;
    },
    [babyId, reaction, limit],
    undefined,
  );
}

/**
 * Get count of solids by reaction for today
 */
export function useTodaysSolidsCountByReaction(
  babyId: number | null | undefined,
): Record<SolidsReaction, number> | undefined {
  const { today, tomorrow } = getTodayDateRange();

  return useLiveQuery(
    async () => {
      if (!babyId) {
        return { allergic: 0, hate: 0, liked: 0, loved: 0 };
      }

      const logs = await localDb.solidsLogs
        .where('babyId')
        .equals(babyId)
        .and(log => log.startedAt >= today && log.startedAt < tomorrow)
        .toArray();

      const counts: Record<SolidsReaction, number> = { allergic: 0, hate: 0, liked: 0, loved: 0 };
      for (const log of logs) {
        counts[log.reaction]++;
      }

      return counts;
    },
    [babyId, today.getTime()],
    undefined,
  );
}

/**
 * Get unique foods tried by a baby
 */
export function useUniqueFoods(babyId: number | null | undefined): string[] | undefined {
  return useLiveQuery(
    async () => {
      if (!babyId) {
        return [];
      }

      const logs = await localDb.solidsLogs
        .where('babyId')
        .equals(babyId)
        .toArray();

      // Get unique food names, case-insensitive
      const foodSet = new Set<string>();
      for (const log of logs) {
        foodSet.add(log.food.toLowerCase());
      }

      return Array.from(foodSet).sort();
    },
    [babyId],
    undefined,
  );
}
