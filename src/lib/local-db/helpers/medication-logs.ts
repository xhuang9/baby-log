/**
 * Medication Log Helper Functions
 *
 * Functions for managing medication log data in IndexedDB.
 */

import type { LocalMedicationLog } from '../types/logs';
import { localDb } from '../database';

/**
 * Save medication logs to local database
 */
export async function saveMedicationLogs(logs: LocalMedicationLog[]): Promise<void> {
  await localDb.medicationLogs.bulkPut(logs);
}

/**
 * Get medication logs for a baby
 */
export async function getMedicationLogsForBaby(babyId: number, limit?: number): Promise<LocalMedicationLog[]> {
  const logs = await localDb.medicationLogs
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
 * Get medication logs for a baby within a date range
 */
export async function getMedicationLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date,
): Promise<LocalMedicationLog[]> {
  const logs = await localDb.medicationLogs
    .where('babyId')
    .equals(babyId)
    .and(log => log.startedAt >= startDate && log.startedAt <= endDate)
    .toArray();

  // Sort descending by startedAt (newest first)
  return logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}

/**
 * Get a single medication log by ID
 */
export async function getMedicationLog(logId: string): Promise<LocalMedicationLog | undefined> {
  return localDb.medicationLogs.get(logId);
}

/**
 * Delete a medication log
 */
export async function deleteMedicationLog(logId: string): Promise<void> {
  await localDb.medicationLogs.delete(logId);
}
