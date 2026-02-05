/**
 * Pumping Log Helper Functions
 *
 * Functions for managing pumping log data in IndexedDB.
 */

import type { LocalPumpingLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save pumping logs to local database
 */
export async function savePumpingLogs(logs: LocalPumpingLog[]): Promise<void> {
  await localDb.pumpingLogs.bulkPut(logs);
}

/**
 * Get pumping logs for a baby
 */
export async function getPumpingLogsForBaby(babyId: number, limit?: number): Promise<LocalPumpingLog[]> {
  const logs = await localDb.pumpingLogs
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
 * Get pumping logs for a baby within a date range
 */
export async function getPumpingLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalPumpingLog[]> {
  const logs = await localDb.pumpingLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single pumping log by ID
 */
export async function getPumpingLog(logId: string): Promise<LocalPumpingLog | undefined> {
  return localDb.pumpingLogs.get(logId);
}

/**
 * Delete a pumping log
 */
export async function deletePumpingLog(logId: string): Promise<void> {
  await localDb.pumpingLogs.delete(logId);
}
