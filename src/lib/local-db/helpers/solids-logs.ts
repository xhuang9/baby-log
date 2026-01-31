/**
 * Solids Log Helper Functions
 *
 * Functions for managing solids log data in IndexedDB.
 */

import type { LocalSolidsLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save solids logs to local database
 */
export async function saveSolidsLogs(logs: LocalSolidsLog[]): Promise<void> {
  await localDb.solidsLogs.bulkPut(logs);
}

/**
 * Get solids logs for a baby
 */
export async function getSolidsLogsForBaby(babyId: number, limit?: number): Promise<LocalSolidsLog[]> {
  const logs = await localDb.solidsLogs
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
 * Get solids logs for a baby within a date range
 */
export async function getSolidsLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalSolidsLog[]> {
  const logs = await localDb.solidsLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single solids log by ID
 */
export async function getSolidsLog(logId: string): Promise<LocalSolidsLog | undefined> {
  return localDb.solidsLogs.get(logId);
}

/**
 * Delete a solids log
 */
export async function deleteSolidsLog(logId: string): Promise<void> {
  await localDb.solidsLogs.delete(logId);
}
