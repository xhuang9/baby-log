/**
 * Growth Log Helper Functions
 *
 * Functions for managing growth log data in IndexedDB.
 */

import type { LocalGrowthLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save growth logs to local database
 */
export async function saveGrowthLogs(logs: LocalGrowthLog[]): Promise<void> {
  await localDb.growthLogs.bulkPut(logs);
}

/**
 * Get growth logs for a baby
 */
export async function getGrowthLogsForBaby(babyId: number, limit?: number): Promise<LocalGrowthLog[]> {
  const logs = await localDb.growthLogs
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
 * Get growth logs for a baby within a date range
 */
export async function getGrowthLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalGrowthLog[]> {
  const logs = await localDb.growthLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single growth log by ID
 */
export async function getGrowthLog(logId: string): Promise<LocalGrowthLog | undefined> {
  return localDb.growthLogs.get(logId);
}

/**
 * Delete a growth log
 */
export async function deleteGrowthLog(logId: string): Promise<void> {
  await localDb.growthLogs.delete(logId);
}
