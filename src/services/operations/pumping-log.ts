/**
 * Pumping Log Operations
 *
 * Centralized operations for pumping log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalPumpingLog } from '@/lib/local-db';
import { addToOutbox, localDb, savePumpingLogs } from '@/lib/local-db';
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

export type CreatePumpingLogInput = {
  babyId: number;
  startedAt: Date;
  endedAt?: Date | null;
  leftMl?: number | null;
  rightMl?: number | null;
  totalMl: number;
  notes?: string | null;
};

export type UpdatePumpingLogInput = {
  id: string;
  babyId: number;
  startedAt?: Date;
  endedAt?: Date | null;
  leftMl?: number | null;
  rightMl?: number | null;
  totalMl?: number;
  notes?: string | null;
};

// ============================================================================
// Pumping Log Operations
// ============================================================================

/**
 * Create a new pumping log entry
 * - Creates pumping log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createPumpingLog(
  input: CreatePumpingLogInput,
): Promise<OperationResult<LocalPumpingLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.startedAt) {
      return failure('Start time is required');
    }

    if (input.totalMl < 0) {
      return failure('Total amount must be non-negative');
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

    // Generate UUID for pumping log (client-side ID)
    const pumpingLogId = crypto.randomUUID();
    const now = new Date();

    // Create pumping log object
    const pumpingLog: LocalPumpingLog = {
      id: pumpingLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? null,
      leftMl: input.leftMl ?? null,
      rightMl: input.rightMl ?? null,
      totalMl: input.totalMl,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await savePumpingLogs([pumpingLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'pumping_log',
      entityId: pumpingLogId,
      op: 'create',
      payload: {
        id: pumpingLog.id,
        babyId: pumpingLog.babyId,
        loggedByUserId: pumpingLog.loggedByUserId,
        startedAt: pumpingLog.startedAt.toISOString(),
        endedAt: pumpingLog.endedAt?.toISOString() ?? null,
        leftMl: pumpingLog.leftMl,
        rightMl: pumpingLog.rightMl,
        totalMl: pumpingLog.totalMl,
        notes: pumpingLog.notes,
        createdAt: pumpingLog.createdAt.toISOString(),
        updatedAt: pumpingLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(pumpingLog);
  } catch (err) {
    console.error('Failed to create pumping log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create pumping log');
  }
}

/**
 * Update an existing pumping log entry
 * - Updates pumping log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updatePumpingLog(
  input: UpdatePumpingLogInput,
): Promise<OperationResult<LocalPumpingLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing pumping log
    const existing = await localDb.pumpingLogs.get(input.id);
    if (!existing) {
      return failure('Pumping log not found');
    }

    // Verify access
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Update fields
    const updated: LocalPumpingLog = {
      ...existing,
      startedAt: input.startedAt ?? existing.startedAt,
      endedAt: input.endedAt !== undefined ? input.endedAt : existing.endedAt,
      leftMl: input.leftMl !== undefined ? input.leftMl : existing.leftMl,
      rightMl: input.rightMl !== undefined ? input.rightMl : existing.rightMl,
      totalMl: input.totalMl ?? existing.totalMl,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await savePumpingLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'pumping_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString() ?? null,
        leftMl: updated.leftMl,
        rightMl: updated.rightMl,
        totalMl: updated.totalMl,
        notes: updated.notes,
        updatedAt: updated.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(updated);
  } catch (err) {
    console.error('Failed to update pumping log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update pumping log');
  }
}

/**
 * Delete a pumping log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deletePumpingLog(
  id: string,
  babyId: number,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Verify access
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // Delete from IndexedDB
    await localDb.pumpingLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'pumping_log',
      entityId: id,
      op: 'delete',
      payload: {},
    });

    // Trigger background sync
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(undefined);
  } catch (err) {
    console.error('Failed to delete pumping log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete pumping log');
  }
}
