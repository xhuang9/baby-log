/**
 * Bath Logs Hook
 *
 * Reactive hook for fetching bath logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalBathLog } from '@/lib/local-db';
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get bath logs for a specific baby
 */
export function useBathLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalBathLog[] | undefined {
  return useActivityLogsForBaby(localDb.bathLogs, babyId, limit);
}

/**
 * Get bath logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useBathLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalBathLog[] | undefined {
  return useActivityLogsByDateRange(localDb.bathLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent bath log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestBathLog(
  babyId: number | null | undefined,
): LocalBathLog | null | undefined {
  return useLatestActivityLog(localDb.bathLogs, babyId);
}

/**
 * Get bath logs count for a baby
 */
export function useBathLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.bathLogs, babyId);
}

/**
 * Get today's bath logs for a baby
 */
export function useTodaysBathLogs(babyId: number | null | undefined): LocalBathLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useBathLogsByDateRange(babyId, today, tomorrow);
}
