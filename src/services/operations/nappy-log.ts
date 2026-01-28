/**
 * Nappy Log Operations
 *
 * Centralized operations for nappy log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalNappyLog, NappyType } from '@/lib/local-db';
import { addToOutbox, localDb, saveNappyLogs } from '@/lib/local-db';
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

export type CreateNappyLogInput = {
  babyId: number;
  type: NappyType;
  startedAt: Date;
  notes?: string | null;
};

export type UpdateNappyLogInput = {
  id: string;
  babyId: number;
  type?: NappyType;
  startedAt?: Date;
  notes?: string | null;
};

// ============================================================================
// Nappy Log Operations
// ============================================================================

/**
 * Create a new nappy log entry
 * - Creates nappy log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createNappyLog(
  input: CreateNappyLogInput,
): Promise<OperationResult<LocalNappyLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.type) {
      return failure('Nappy type is required');
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

    // Generate UUID for nappy log (client-side ID)
    const nappyLogId = crypto.randomUUID();
    const now = new Date();

    // Create nappy log object
    const nappyLog: LocalNappyLog = {
      id: nappyLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      type: input.type,
      startedAt: input.startedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveNappyLogs([nappyLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'nappy_log',
      entityId: nappyLogId,
      op: 'create',
      payload: {
        id: nappyLog.id,
        babyId: nappyLog.babyId,
        loggedByUserId: nappyLog.loggedByUserId,
        type: nappyLog.type,
        startedAt: nappyLog.startedAt.toISOString(),
        notes: nappyLog.notes,
        createdAt: nappyLog.createdAt.toISOString(),
        updatedAt: nappyLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(nappyLog);
  } catch (err) {
    console.error('Failed to create nappy log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create nappy log');
  }
}

/**
 * Update an existing nappy log entry
 * - Updates nappy log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateNappyLog(
  input: UpdateNappyLogInput,
): Promise<OperationResult<LocalNappyLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing nappy log
    const existing = await localDb.nappyLogs.get(input.id);
    if (!existing) {
      return failure('Nappy log not found');
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
    const updated: LocalNappyLog = {
      ...existing,
      type: input.type ?? existing.type,
      startedAt: input.startedAt ?? existing.startedAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveNappyLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'nappy_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        type: updated.type,
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
    console.error('Failed to update nappy log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update nappy log');
  }
}

/**
 * Delete a nappy log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteNappyLog(
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
    await localDb.nappyLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'nappy_log',
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
    console.error('Failed to delete nappy log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete nappy log');
  }
}
