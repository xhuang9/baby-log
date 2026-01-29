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
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get feed logs for a specific baby
 */
export function useFeedLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalFeedLog[] | undefined {
  return useActivityLogsForBaby(localDb.feedLogs, babyId, limit);
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
  return useActivityLogsByDateRange(localDb.feedLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent feed log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestFeedLog(
  babyId: number | null | undefined,
): LocalFeedLog | null | undefined {
  return useLatestActivityLog(localDb.feedLogs, babyId);
}

/**
 * Get feed logs count for a baby
 */
export function useFeedLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.feedLogs, babyId);
}

/**
 * Get today's feed logs for a baby
 */
export function useTodaysFeedLogs(babyId: number | null | undefined): LocalFeedLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useFeedLogsByDateRange(babyId, today, tomorrow);
}
