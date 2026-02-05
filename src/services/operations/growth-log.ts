/**
 * Growth Log Operations
 *
 * Centralized operations for growth log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { LocalGrowthLog } from '@/lib/local-db';
import { addToOutbox, localDb, saveGrowthLogs } from '@/lib/local-db';
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

export type CreateGrowthLogInput = {
  babyId: number;
  startedAt: Date;
  weightG?: number | null;
  heightMm?: number | null;
  headCircumferenceMm?: number | null;
  notes?: string | null;
};

export type UpdateGrowthLogInput = {
  id: string;
  babyId: number;
  startedAt?: Date;
  weightG?: number | null;
  heightMm?: number | null;
  headCircumferenceMm?: number | null;
  notes?: string | null;
};

// ============================================================================
// Growth Log Operations
// ============================================================================

/**
 * Create a new growth log entry
 * - Creates growth log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createGrowthLog(
  input: CreateGrowthLogInput,
): Promise<OperationResult<LocalGrowthLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.startedAt) {
      return failure('Measurement date is required');
    }

    // At least one measurement should be provided
    if (input.weightG == null && input.heightMm == null && input.headCircumferenceMm == null) {
      return failure('At least one measurement is required');
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

    // Generate UUID for growth log (client-side ID)
    const growthLogId = crypto.randomUUID();
    const now = new Date();

    // Create growth log object
    const growthLog: LocalGrowthLog = {
      id: growthLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      startedAt: input.startedAt,
      weightG: input.weightG ?? null,
      heightMm: input.heightMm ?? null,
      headCircumferenceMm: input.headCircumferenceMm ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveGrowthLogs([growthLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'growth_log',
      entityId: growthLogId,
      op: 'create',
      payload: {
        id: growthLog.id,
        babyId: growthLog.babyId,
        loggedByUserId: growthLog.loggedByUserId,
        startedAt: growthLog.startedAt.toISOString(),
        weightG: growthLog.weightG,
        heightMm: growthLog.heightMm,
        headCircumferenceMm: growthLog.headCircumferenceMm,
        notes: growthLog.notes,
        createdAt: growthLog.createdAt.toISOString(),
        updatedAt: growthLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(growthLog);
  } catch (err) {
    console.error('Failed to create growth log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create growth log');
  }
}

/**
 * Update an existing growth log entry
 * - Updates growth log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateGrowthLog(
  input: UpdateGrowthLogInput,
): Promise<OperationResult<LocalGrowthLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing growth log
    const existing = await localDb.growthLogs.get(input.id);
    if (!existing) {
      return failure('Growth log not found');
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
    const updated: LocalGrowthLog = {
      ...existing,
      startedAt: input.startedAt ?? existing.startedAt,
      weightG: input.weightG !== undefined ? input.weightG : existing.weightG,
      heightMm: input.heightMm !== undefined ? input.heightMm : existing.heightMm,
      headCircumferenceMm: input.headCircumferenceMm !== undefined ? input.headCircumferenceMm : existing.headCircumferenceMm,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveGrowthLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'growth_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        startedAt: updated.startedAt.toISOString(),
        weightG: updated.weightG,
        heightMm: updated.heightMm,
        headCircumferenceMm: updated.headCircumferenceMm,
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
    console.error('Failed to update growth log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update growth log');
  }
}

/**
 * Delete a growth log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteGrowthLog(
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
    await localDb.growthLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'growth_log',
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
    console.error('Failed to delete growth log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete growth log');
  }
}
