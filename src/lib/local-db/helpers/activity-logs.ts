/**
 * Activity Log Helper Functions
 *
 * Functions for managing activity log data in IndexedDB.
 */

import type { LocalActivityLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save activity logs to local database
 */
export async function saveActivityLogs(logs: LocalActivityLog[]): Promise<void> {
  await localDb.activityLogs.bulkPut(logs);
}

/**
 * Get activity logs for a baby
 */
export async function getActivityLogsForBabyLocal(babyId: number, limit?: number): Promise<LocalActivityLog[]> {
  const logs = await localDb.activityLogs
    .where('babyId')
    .equals(babyId)
    .toArray();

  // Sort descending by startedAt (newest first)
  logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  if (limit) {
    return logs.slice(0, limit);
  }

  return logs;
}

/**
 * Get activity logs for a baby within a date range
 */
export async function getActivityLogsByDateRangeLocal(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalActivityLog[]> {
  const logs = await localDb.activityLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single activity log by ID
 */
export async function getActivityLog(logId: string): Promise<LocalActivityLog | undefined> {
  return localDb.activityLogs.get(logId);
}

/**
 * Delete an activity log
 */
export async function deleteActivityLogLocal(logId: string): Promise<void> {
  await localDb.activityLogs.delete(logId);
}
