/**
 * Activity Log Operations
 *
 * Centralized operations for activity log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { ActivityLogCategory, LocalActivityLog } from '@/lib/local-db';
import { addToOutbox, localDb, saveActivityLogs } from '@/lib/local-db';
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

export type CreateActivityLogInput = {
  babyId: number;
  activityType: ActivityLogCategory;
  startedAt: Date;
  endedAt?: Date | null;
  notes?: string | null;
};

export type UpdateActivityLogInput = {
  id: string;
  babyId: number;
  activityType?: ActivityLogCategory;
  startedAt?: Date;
  endedAt?: Date | null;
  notes?: string | null;
};

// ============================================================================
// Activity Log Operations
// ============================================================================

/**
 * Create a new activity log entry
 * - Creates activity log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createActivityLog(
  input: CreateActivityLogInput,
): Promise<OperationResult<LocalActivityLog>> {
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

    if (!input.activityType) {
      return failure('Activity type is required');
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

    // Generate UUID for activity log (client-side ID)
    const activityLogId = crypto.randomUUID();
    const now = new Date();

    // Create activity log object
    const activityLog: LocalActivityLog = {
      id: activityLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      activityType: input.activityType,
      startedAt: input.startedAt,
      endedAt: input.endedAt ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB via helper
    await saveActivityLogs([activityLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'activity_log',
      entityId: activityLogId,
      op: 'create',
      payload: {
        id: activityLog.id,
        babyId: activityLog.babyId,
        loggedByUserId: activityLog.loggedByUserId,
        activityType: activityLog.activityType,
        startedAt: activityLog.startedAt.toISOString(),
        endedAt: activityLog.endedAt?.toISOString() ?? null,
        notes: activityLog.notes,
        createdAt: activityLog.createdAt.toISOString(),
        updatedAt: activityLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync (non-blocking)
    flushOutbox().catch((err) => {
      console.warn('Background sync failed:', err);
    });

    return success(activityLog);
  } catch (err) {
    console.error('Failed to create activity log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create activity log');
  }
}

/**
 * Update an existing activity log entry
 * - Updates activity log in IndexedDB
 * - Enqueues to outbox for sync
 */
export async function updateActivityLog(
  input: UpdateActivityLogInput,
): Promise<OperationResult<LocalActivityLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get existing activity log
    const existing = await localDb.activityLogs.get(input.id);
    if (!existing) {
      return failure('Activity log not found');
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
    const updated: LocalActivityLog = {
      ...existing,
      activityType: input.activityType ?? existing.activityType,
      startedAt: input.startedAt ?? existing.startedAt,
      endedAt: input.endedAt !== undefined ? input.endedAt : existing.endedAt,
      notes: input.notes !== undefined ? input.notes : existing.notes,
      updatedAt: new Date(),
    };

    // Write to IndexedDB
    await saveActivityLogs([updated]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'activity_log',
      entityId: updated.id,
      op: 'update',
      payload: {
        id: updated.id,
        babyId: updated.babyId,
        loggedByUserId: updated.loggedByUserId,
        activityType: updated.activityType,
        startedAt: updated.startedAt.toISOString(),
        endedAt: updated.endedAt?.toISOString() ?? null,
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
    console.error('Failed to update activity log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to update activity log');
  }
}

/**
 * Delete an activity log entry
 * - Removes from IndexedDB
 * - Enqueues deletion to outbox for sync
 */
export async function deleteActivityLog(
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
    await localDb.activityLogs.delete(id);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'activity_log',
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
    console.error('Failed to delete activity log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to delete activity log');
  }
}
