/**
 * Activity Logs Hook
 *
 * Reactive hook for fetching activity logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 */

'use client';

import type { LocalActivityLog } from '@/lib/local-db';
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get activity logs for a specific baby
 */
export function useActivitiesForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalActivityLog[] | undefined {
  return useActivityLogsForBaby(localDb.activityLogs, babyId, limit);
}

/**
 * Get activity logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useActivitiesByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalActivityLog[] | undefined {
  return useActivityLogsByDateRange(localDb.activityLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent activity log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestActivity(
  babyId: number | null | undefined,
): LocalActivityLog | null | undefined {
  return useLatestActivityLog(localDb.activityLogs, babyId);
}

/**
 * Get activity logs count for a baby
 */
export function useActivitiesCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.activityLogs, babyId);
}

/**
 * Get today's activity logs for a baby
 */
export function useTodaysActivities(babyId: number | null | undefined): LocalActivityLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useActivitiesByDateRange(babyId, today, tomorrow);
}
