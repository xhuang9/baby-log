/**
 * Bath Log Operations
 *
 * Centralized operations for bath log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalBathLog } from '@/lib/local-db';
import { addToOutbox, localDb, saveBathLogs } from '@/lib/local-db';
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

export type CreateBathLogInput = {
  babyId: number;
  startedAt: Date;
  notes?: string | null;
};

export type UpdateBathLogInput = {
  id: string;
  babyId: number;
  startedAt?: Date;
  notes?: string | null;
};

// ============================================================================
// Bath Log Operations
// ============================================================================

/**
 * Create a new bath log entry
 * - Creates bath log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createBathLog(
  input: CreateBathLogInput,
): Promise<OperationResult<LocalBathLog>> {
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

    // Generate UUID for bath log (client-side ID)
    const bathLogId = crypto.randomUUID();
    const now = new Date();

    // Create bath log object
    const bathLog: LocalBathLog = {
      id: bathLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      startedAt: input.startedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveBathLogs([bathLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'bath_log',
      entityId: bathLogId,
      op: 'create',
      payload: {
        id: bathLog.id,
        babyId: bathLog.babyId,
        loggedByUserId: bathLog.loggedByUserId,
        startedAt: bathLog.startedAt.toISOString(),
        notes: bathLog.notes,
        createdAt: bathLog.createdAt.toISOString(),
        updatedAt: bathLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(bathLog);
  } catch (err) {
    console.error('Failed to create bath log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create bath log');
  }
}

/**
 * Update an existing bath log entry
 * - Updates bath log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateBathLog(
  input: UpdateBathLogInput,
): Promise<OperationResult<LocalBathLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing bath log
    const existing = await localDb.bathLogs.get(input.id);
    if (!existing) {
      return failure('Bath log not found');
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
    const updated: LocalBathLog = {
      ...existing,
      startedAt: input.startedAt ?? existing.startedAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveBathLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'bath_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        startedAt: updated.startedAt.toISOString(),
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
    console.error('Failed to update bath log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update bath log');
  }
}

/**
 * Delete a bath log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteBathLog(
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
    await localDb.bathLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'bath_log',
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
    console.error('Failed to delete bath log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete bath log');
  }
}
