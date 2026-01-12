/**
 * Nappy Log Helper Functions
 *
 * Functions for managing nappy log data in IndexedDB.
 */

import type { LocalNappyLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save nappy logs to local database
 */
export async function saveNappyLogs(logs: LocalNappyLog[]): Promise<void> {
  await localDb.nappyLogs.bulkPut(logs);
}

/**
 * Get nappy logs for a baby
 */
export async function getNappyLogsForBaby(babyId: number, limit?: number): Promise<LocalNappyLog[]> {
  let query = localDb.nappyLogs
    .where('babyId')
    .equals(babyId)
    .reverse();

  if (limit) {
    query = query.limit(limit);
  }

  return query.sortBy('startedAt');
}

/**
 * Get nappy logs for a baby within a date range
 */
export async function getNappyLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalNappyLog[]> {
  return localDb.nappyLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();
}

/**
 * Get a single nappy log by ID
 */
export async function getNappyLog(logId: string): Promise<LocalNappyLog | undefined> {
  return localDb.nappyLogs.get(logId);
}

/**
 * Delete a nappy log
 */
export async function deleteNappyLog(logId: string): Promise<void> {
  await localDb.nappyLogs.delete(logId);
}
