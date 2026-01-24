/**
 * Sleep Log Operations
 *
 * Centralized operations for sleep log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalSleepLog } from '@/lib/local-db';
import { addToOutbox, localDb, saveSleepLogs } from '@/lib/local-db';
import { flushOutbox } from '@/services/sync';
import { useUserStore } from '@/stores/useUserStore';

import {
  failure,
  generateMutationId,
  isClientSide,
  success,
} from './types';

// ============================================================================
// Input Types
// ============================================================================

export type CreateSleepLogInput = {
  babyId: number;
  startedAt: Date;
  durationMinutes?: number | null;
  notes?: string | null;
};

export type UpdateSleepLogInput = {
  id: string;
  startedAt?: Date;
  durationMinutes?: number | null;
  notes?: string | null;
};

// ============================================================================
// Sleep Log Operations
// ============================================================================

/**
 * Create a new sleep log entry
 * - Creates sleep log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createSleepLog(
  input: CreateSleepLogInput,
): Promise<OperationResult<LocalSleepLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.startedAt) {
      return failure('Start time is required');
    }

    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Check access to baby
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Generate UUID for sleep log (client-side ID)
    const sleepLogId = crypto.randomUUID();
    const now = new Date();

    // Calculate endedAt from duration if provided
    const endedAt = input.durationMinutes
      ? new Date(input.startedAt.getTime() + input.durationMinutes * 60 * 1000)
      : null;

    // Create sleep log object
    const sleepLog: LocalSleepLog = {
      id: sleepLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      startedAt: input.startedAt,
      endedAt,
      durationMinutes: input.durationMinutes ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveSleepLogs([sleepLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'sleep_log',
      entityId: sleepLogId,
      op: 'create',
      payload: {
        id: sleepLog.id,
        babyId: sleepLog.babyId,
        loggedByUserId: sleepLog.loggedByUserId,
        startedAt: sleepLog.startedAt.toISOString(),
        endedAt: sleepLog.endedAt?.toISOString() ?? null,
        durationMinutes: sleepLog.durationMinutes,
        notes: sleepLog.notes,
        createdAt: sleepLog.createdAt.toISOString(),
        updatedAt: sleepLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(sleepLog);
  } catch (err) {
    console.error('Failed to create sleep log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create sleep log');
  }
}

/**
 * Update an existing sleep log entry
 * - Updates sleep log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function updateSleepLog(
  input: UpdateSleepLogInput,
): Promise<OperationResult<LocalSleepLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing log
    const existing = await localDb.sleepLogs.get(input.id);
    if (!existing) {
      return failure('Sleep log not found');
    }

    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Check access to baby
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, existing.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Merge updates
    const startedAt = input.startedAt ?? existing.startedAt;
    const durationMinutes = input.durationMinutes !== undefined ? input.durationMinutes : existing.durationMinutes;
    const notes = input.notes !== undefined ? input.notes : existing.notes;

    // Calculate endedAt from duration if provided
    const endedAt = durationMinutes
      ? new Date(startedAt.getTime() + durationMinutes * 60 * 1000)
      : null;

    const updated: LocalSleepLog = {
      ...existing,
      startedAt,
      endedAt,
      durationMinutes,
      notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveSleepLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'sleep_log',
      entityId: input.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString() ?? null,
        durationMinutes: updated.durationMinutes,
        notes: updated.notes,
        createdAt: updated.createdAt.toISOString(),
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    void flushOutbox();

    return success(updated);
  } catch (err) {
    console.error('Failed to update sleep log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update sleep log');
  }
}

/**
 * Delete a sleep log entry
 * - Removes sleep log from IndexedDB
 * - Enqueues delete to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function deleteSleepLog(
  id: string,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing log
    const existing = await localDb.sleepLogs.get(id);
    if (!existing) {
      return failure('Sleep log not found');
    }

    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Check access to baby
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, existing.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Delete from IndexedDB
    await localDb.sleepLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'sleep_log',
      entityId: id,
      op: 'delete',
      payload: null,
    });

    // Trigger background sync
    void flushOutbox();

    return success(undefined);
  } catch (err) {
    console.error('Failed to delete sleep log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete sleep log');
  }
}
