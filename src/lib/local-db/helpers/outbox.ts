/**
 * Outbox Helper Functions
 *
 * Functions for managing the offline mutation queue (outbox pattern).
 */

import type { OutboxEntry, OutboxStatus } from '../types/outbox';
import { localDb } from '../database';

/**
 * Get pending outbox entries for sync
 */
export async function getPendingOutboxEntries(): Promise<OutboxEntry[]> {
  return localDb.outbox.where('status').equals('pending').toArray();
}

/**
 * Get all outbox entries
 */
export async function getAllOutboxEntries(): Promise<OutboxEntry[]> {
  return localDb.outbox.toArray();
}

/**
 * Add a mutation to the outbox
 */
export async function addToOutbox(
  entry: Omit<OutboxEntry, 'createdAt' | 'status' | 'lastAttemptAt' | 'errorMessage'>,
): Promise<void> {
  await localDb.outbox.add({
    ...entry,
    createdAt: new Date(),
    status: 'pending',
    lastAttemptAt: null,
    errorMessage: null,
  });
}

/**
 * Update outbox entry status
 */
export async function updateOutboxStatus(
  mutationId: string,
  status: OutboxStatus,
  errorMessage?: string,
): Promise<void> {
  await localDb.outbox.update(mutationId, {
    status,
    lastAttemptAt: new Date(),
    errorMessage: errorMessage ?? null,
  });
}

/**
 * Remove synced entries from outbox
 */
export async function clearSyncedOutboxEntries(): Promise<number> {
  return localDb.outbox.where('status').equals('synced').delete();
}

/**
 * Get failed outbox entries
 */
export async function getFailedOutboxEntries(): Promise<OutboxEntry[]> {
  return localDb.outbox.where('status').equals('failed').toArray();
}

/**
 * Retry failed outbox entries
 */
export async function retryFailedOutboxEntries(): Promise<void> {
  await localDb.outbox
    .where('status')
    .equals('failed')
    .modify({ status: 'pending', errorMessage: null });
}
