/**
 * Feed Log Helper Functions
 *
 * Functions for managing feed log data in IndexedDB.
 */

import type { LocalFeedLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save feed logs to local database
 */
export async function saveFeedLogs(logs: LocalFeedLog[]): Promise<void> {
  await localDb.feedLogs.bulkPut(logs);
}

/**
 * Get feed logs for a baby
 */
export async function getFeedLogsForBaby(babyId: number, limit?: number): Promise<LocalFeedLog[]> {
  let query = localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .reverse();

  if (limit) {
    query = query.limit(limit);
  }

  return query.sortBy('startedAt');
}

/**
 * Get feed logs for a baby within a date range
 */
export async function getFeedLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalFeedLog[]> {
  return localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();
}

/**
 * Get a single feed log by ID
 */
export async function getFeedLog(logId: string): Promise<LocalFeedLog | undefined> {
  return localDb.feedLogs.get(logId);
}

/**
 * Delete a feed log
 */
export async function deleteFeedLog(logId: string): Promise<void> {
  await localDb.feedLogs.delete(logId);
}
