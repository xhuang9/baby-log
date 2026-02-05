/**
 * Pumping Logs Hook
 *
 * Reactive hook for fetching pumping logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 */

'use client';

import type { LocalPumpingLog } from '@/lib/local-db';
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get pumping logs for a specific baby
 */
export function usePumpingLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalPumpingLog[] | undefined {
  return useActivityLogsForBaby(localDb.pumpingLogs, babyId, limit);
}

/**
 * Get pumping logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function usePumpingLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalPumpingLog[] | undefined {
  return useActivityLogsByDateRange(localDb.pumpingLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent pumping log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestPumpingLog(
  babyId: number | null | undefined,
): LocalPumpingLog | null | undefined {
  return useLatestActivityLog(localDb.pumpingLogs, babyId);
}

/**
 * Get pumping logs count for a baby
 */
export function usePumpingLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.pumpingLogs, babyId);
}

/**
 * Get today's pumping logs for a baby
 */
export function useTodaysPumpingLogs(babyId: number | null | undefined): LocalPumpingLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return usePumpingLogsByDateRange(babyId, today, tomorrow);
}
