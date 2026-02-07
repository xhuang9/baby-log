/**
 * Medication Logs Hook
 *
 * Reactive hook for fetching medication logs from IndexedDB using Dexie's useLiveQuery.
 * Automatically updates when underlying data changes.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import type { LocalMedicationLog } from '@/lib/local-db';
import { localDb } from '@/lib/local-db';
import {
  getTodayDateRange,
  useActivityLogsByDateRange,
  useActivityLogsCount,
  useActivityLogsForBaby,
  useLatestActivityLog,
} from './useActivityLogs';

/**
 * Get medication logs for a specific baby
 */
export function useMedicationLogsForBaby(
  babyId: number | null | undefined,
  limit?: number,
): LocalMedicationLog[] | undefined {
  return useActivityLogsForBaby(localDb.medicationLogs, babyId, limit);
}

/**
 * Get medication logs for a baby within a date range
 * If startDate and endDate are both null, returns all logs
 */
export function useMedicationLogsByDateRange(
  babyId: number | null | undefined,
  startDate: Date | null,
  endDate: Date | null,
): LocalMedicationLog[] | undefined {
  return useActivityLogsByDateRange(localDb.medicationLogs, babyId, startDate, endDate);
}

/**
 * Get the most recent medication log for a baby
 * Only considers past logs (startedAt <= now) - excludes future scheduled logs
 */
export function useLatestMedicationLog(
  babyId: number | null | undefined,
): LocalMedicationLog | null | undefined {
  return useLatestActivityLog(localDb.medicationLogs, babyId);
}

/**
 * Get medication logs count for a baby
 */
export function useMedicationLogsCount(babyId: number | null | undefined): number | undefined {
  return useActivityLogsCount(localDb.medicationLogs, babyId);
}

/**
 * Get today's medication logs for a baby
 */
export function useTodaysMedicationLogs(babyId: number | null | undefined): LocalMedicationLog[] | undefined {
  const { today, tomorrow } = getTodayDateRange();
  return useMedicationLogsByDateRange(babyId, today, tomorrow);
}
