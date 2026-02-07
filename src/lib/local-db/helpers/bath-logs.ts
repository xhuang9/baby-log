/**
 * Bath Log Helper Functions
 *
 * Functions for managing bath log data in IndexedDB.
 */

import type { LocalBathLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save bath logs to local database
 */
export async function saveBathLogs(logs: LocalBathLog[]): Promise<void> {
  await localDb.bathLogs.bulkPut(logs);
}

/**
 * Get bath logs for a baby
 */
export async function getBathLogsForBaby(babyId: number, limit?: number): Promise<LocalBathLog[]> {
  const logs = await localDb.bathLogs
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
 * Get bath logs for a baby within a date range
 */
export async function getBathLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalBathLog[]> {
  const logs = await localDb.bathLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single bath log by ID
 */
export async function getBathLog(logId: string): Promise<LocalBathLog | undefined> {
  return localDb.bathLogs.get(logId);
}

/**
 * Delete a bath log
 */
export async function deleteBathLog(logId: string): Promise<void> {
  await localDb.bathLogs.delete(logId);
}
