/**
 * Feed Log Operations
 *
 * Centralized operations for feed log creation. All operations:
 * 1. Write to IndexedDB immediately (local-first)
 * 2. Update Zustand stores if needed (or rely on useLiveQuery)
 * 3. Enqueue mutations to outbox for background sync
 * 4. Trigger non-blocking server sync
 */

import type { OperationResult } from './types';
import type { FeedMethod, FeedSide, LocalFeedLog } from '@/lib/local-db';
import { addToOutbox, localDb, saveFeedLogs } from '@/lib/local-db';
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

export type CreateFeedLogInput = {
  babyId: number;
  method: FeedMethod;
  startedAt: Date;
  // For bottle feeds
  amountMl?: number | null;
  isEstimated?: boolean;
  // For breast feeds
  durationMinutes?: number | null;
  endSide?: FeedSide | null;
  notes?: string | null;
};

// ============================================================================
// Feed Log Operations
// ============================================================================

/**
 * Create a new feed log entry
 * - Creates feed log in IndexedDB
 * - Enqueues to outbox for sync
 * - UI updates via useLiveQuery automatically
 */
export async function createFeedLog(
  input: CreateFeedLogInput,
): Promise<OperationResult<LocalFeedLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }

    if (!input.method) {
      return failure('Feed method is required');
    }

    if (!input.startedAt) {
      return failure('Start time is required');
    }

    // Validate method-specific fields
    if (input.method === 'bottle' && !input.amountMl) {
      return failure('Amount is required for bottle feeds');
    }

    if (input.method === 'breast' && !input.durationMinutes) {
      return failure('Duration is required for breast feeds');
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

    // Generate UUID for feed log (client-side ID)
    const feedLogId = crypto.randomUUID();
    const now = new Date();

    // Calculate endedAt for breast feeds based on duration
    let endedAt: Date | null = null;
    if (input.method === 'breast' && input.durationMinutes) {
      endedAt = new Date(input.startedAt.getTime() + input.durationMinutes * 60 * 1000);
    }

    const feedLog: LocalFeedLog = {
      id: feedLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      method: input.method,
      startedAt: input.startedAt,
      endedAt,
      durationMinutes: input.durationMinutes ?? null,
      amountMl: input.amountMl ?? null,
      isEstimated: input.isEstimated ?? false,
      endSide: input.endSide ?? null,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // Write to IndexedDB
    await saveFeedLogs([feedLog]);

    // Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'feed_log',
      entityId: feedLogId,
      op: 'create',
      payload: {
        id: feedLog.id,
        babyId: feedLog.babyId,
        loggedByUserId: feedLog.loggedByUserId,
        method: feedLog.method,
        startedAt: feedLog.startedAt.toISOString(),
        endedAt: feedLog.endedAt?.toISOString() ?? null,
        durationMinutes: feedLog.durationMinutes,
        amountMl: feedLog.amountMl,
        isEstimated: feedLog.isEstimated,
        endSide: feedLog.endSide,
        notes: feedLog.notes,
        createdAt: feedLog.createdAt.toISOString(),
        updatedAt: feedLog.updatedAt.toISOString(),
      },
    });

    // Trigger background sync
    void flushOutbox();

    return success(feedLog);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to create feed log',
    );
  }
}
