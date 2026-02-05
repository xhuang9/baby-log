/**
 * Growth Logs Hook
 *
 * Reactive hook for fetching growth logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalGrowthLog } from '@/lib/local-db';
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get growth logs for a specific baby
 */
export function useGrowthLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalGrowthLog[] | undefined {
  return useActivityLogsForBaby(localDb.growthLogs, babyId, limit);
}

/**
 * Get growth logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useGrowthLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalGrowthLog[] | undefined {
  return useActivityLogsByDateRange(localDb.growthLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent growth log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestGrowthLog(
  babyId: number | null | undefined,
): LocalGrowthLog | null | undefined {
  return useLatestActivityLog(localDb.growthLogs, babyId);
}

/**
 * Get growth logs count for a baby
 */
export function useGrowthLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.growthLogs, babyId);
}

/**
 * Get today's growth logs for a baby
 */
export function useTodaysGrowthLogs(babyId: number | null | undefined): LocalGrowthLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useGrowthLogsByDateRange(babyId, today, tomorrow);
}
