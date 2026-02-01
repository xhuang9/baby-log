/**
 * Solids Log Operations
 *
 * Centralized operations for solids log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalSolidsLog, SolidsReaction } from '@/lib/local-db';
import { addToOutbox, localDb, saveSolidsLogs } from '@/lib/local-db';
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

export type CreateSolidsLogInput = {
  babyId: number;
  foodTypeIds: string[]; // Array of food type UUIDs
  foodDisplay: string; // Display text: "Apple, Pear, Carrot"
  reaction: SolidsReaction;
  startedAt: Date;
  notes?: string | null;
};

export type UpdateSolidsLogInput = {
  id: string;
  babyId: number;
  foodTypeIds?: string[];
  foodDisplay?: string;
  reaction?: SolidsReaction;
  startedAt?: Date;
  notes?: string | null;
};

// ============================================================================
// Solids Log Operations
// ============================================================================

/**
 * Create a new solids log entry
 * - Creates solids log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createSolidsLog(
  input: CreateSolidsLogInput,
): Promise<OperationResult<LocalSolidsLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.foodTypeIds || input.foodTypeIds.length === 0) {
      return failure('Please select at least one food');
    }

    if (!input.foodDisplay || input.foodDisplay.trim() === '') {
      return failure('Food display name is required');
    }

    if (!input.reaction) {
      return failure('Reaction is required');
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

    // Generate UUID for solids log (client-side ID)
    const solidsLogId = crypto.randomUUID();
    const now = new Date();

    // Create solids log object
    const solidsLog: LocalSolidsLog = {
      id: solidsLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      food: input.foodDisplay.trim(),
      foodTypeIds: input.foodTypeIds,
      reaction: input.reaction,
      startedAt: input.startedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveSolidsLogs([solidsLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'solids_log',
      entityId: solidsLogId,
      op: 'create',
      payload: {
        id: solidsLog.id,
        babyId: solidsLog.babyId,
        loggedByUserId: solidsLog.loggedByUserId,
        food: solidsLog.food,
        foodTypeIds: solidsLog.foodTypeIds,
        reaction: solidsLog.reaction,
        startedAt: solidsLog.startedAt.toISOString(),
        notes: solidsLog.notes,
        createdAt: solidsLog.createdAt.toISOString(),
        updatedAt: solidsLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(solidsLog);
  } catch (err) {
    console.error('Failed to create solids log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create solids log');
  }
}

/**
 * Update an existing solids log entry
 * - Updates solids log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateSolidsLog(
  input: UpdateSolidsLogInput,
): Promise<OperationResult<LocalSolidsLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing solids log
    const existing = await localDb.solidsLogs.get(input.id);
    if (!existing) {
      return failure('Solids log not found');
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
    const updated: LocalSolidsLog = {
      ...existing,
      food: input.foodDisplay !== undefined ? input.foodDisplay.trim() : existing.food,
      foodTypeIds: input.foodTypeIds ?? existing.foodTypeIds,
      reaction: input.reaction ?? existing.reaction,
      startedAt: input.startedAt ?? existing.startedAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveSolidsLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'solids_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        food: updated.food,
        foodTypeIds: updated.foodTypeIds,
        reaction: updated.reaction,
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
    console.error('Failed to update solids log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update solids log');
  }
}

/**
 * Delete a solids log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteSolidsLog(
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
    await localDb.solidsLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'solids_log',
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
    console.error('Failed to delete solids log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete solids log');
  }
}
