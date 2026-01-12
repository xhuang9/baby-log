/**
 * Sync Status Helper Functions
 *
 * Functions for tracking synchronization state in IndexedDB.
 */

import type { LocalSyncStatus, SyncEntityType, SyncMeta, SyncStatusValue } from '../types/sync';
import { localDb } from '../database';

// ============================================================================
// Sync Status Functions
// ============================================================================

/**
 * Get sync status for an entity type
 */
export async function getSyncStatus(entityType: SyncEntityType): Promise<LocalSyncStatus> {
  const existing = await localDb.syncStatus.get(entityType);
  if (existing) {
    return existing;
  }

  return {
    entityType,
    status: 'idle',
    lastSyncAt: null,
    errorMessage: null,
    progress: null,
  };
}

/**
 * Update sync status
 */
export async function updateSyncStatus(
  entityType: SyncEntityType,
  status: SyncStatusValue,
  options?: { errorMessage?: string; progress?: number; lastSyncedAt?: string },
): Promise<void> {
  let lastSyncAt: Date | null;

  if (options?.lastSyncedAt) {
    lastSyncAt = new Date(options.lastSyncedAt);
  } else if (status === 'complete') {
    lastSyncAt = new Date();
  } else {
    lastSyncAt = (await getSyncStatus(entityType)).lastSyncAt;
  }

  await localDb.syncStatus.put({
    entityType,
    status,
    lastSyncAt,
    errorMessage: options?.errorMessage ?? null,
    progress: options?.progress ?? null,
  });
}

/**
 * Get all sync statuses
 */
export async function getAllSyncStatuses(): Promise<LocalSyncStatus[]> {
  return localDb.syncStatus.toArray();
}

/**
 * Reset all sync statuses to idle
 */
export async function resetAllSyncStatuses(): Promise<void> {
  await localDb.syncStatus.clear();
}

// ============================================================================
// Sync Cursor Functions
// ============================================================================

/**
 * Get sync cursor for a baby
 */
export async function getSyncCursor(babyId: number): Promise<number> {
  const meta = await localDb.syncMeta.get(babyId);
  return meta?.cursor ?? 0;
}

/**
 * Update sync cursor for a baby
 */
export async function updateSyncCursor(
  babyId: number,
  cursor: number,
): Promise<void> {
  await localDb.syncMeta.put({
    babyId,
    cursor,
    lastSyncAt: new Date(),
  });
}

/**
 * Get sync metadata for a baby
 */
export async function getSyncMeta(babyId: number): Promise<SyncMeta | undefined> {
  return localDb.syncMeta.get(babyId);
}
