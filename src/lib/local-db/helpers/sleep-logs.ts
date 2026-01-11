/**
 * Sleep Log Helper Functions
 *
 * Functions for managing sleep log data in IndexedDB.
 */

import type { LocalSleepLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save sleep logs to local database
 */
export async function saveSleepLogs(logs: LocalSleepLog[]): Promise<void> {
  await localDb.sleepLogs.bulkPut(logs);
}

/**
 * Get sleep logs for a baby
 */
export async function getSleepLogsForBaby(babyId: number, limit?: number): Promise<LocalSleepLog[]> {
  let query = localDb.sleepLogs
    .where('babyId')
    .equals(babyId)
    .reverse();

  if (limit) {
    query = query.limit(limit);
  }

  return query.sortBy('startedAt');
}

/**
 * Get sleep logs for a baby within a date range
 */
export async function getSleepLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalSleepLog[]> {
  return localDb.sleepLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();
}

/**
 * Get a single sleep log by ID
 */
export async function getSleepLog(logId: string): Promise<LocalSleepLog | undefined> {
  return localDb.sleepLogs.get(logId);
}

/**
 * Delete a sleep log
 */
export async function deleteSleepLog(logId: string): Promise<void> {
  await localDb.sleepLogs.delete(logId);
}
