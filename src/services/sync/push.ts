/**
 * Push Changes (Flush Outbox)
 *
 * Flushes pending mutations from the outbox to the server.
 */

import type { PushResponse, SyncResult } from './types';
import {
  clearRevokedBabyData,
  clearSyncedOutboxEntries,
  getPendingOutboxEntries,
  updateOutboxStatus,
  updateSyncCursor,
} from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';
import { applyServerData } from './conflict';

/**
 * Flush pending mutations from the outbox to the server
 */
export async function flushOutbox(): Promise<SyncResult> {
  try {
    const pending = await getPendingOutboxEntries();

    if (pending.length === 0) {
      return { success: true, changesApplied: 0 };
    }

    // Mark as syncing
    await Promise.all(
      pending.map(e => updateOutboxStatus(e.mutationId, 'syncing')),
    );

    const response = await fetch('/api/sync/push', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        mutations: pending.map(e => ({
          mutationId: e.mutationId,
          entityType: e.entityType,
          entityId: e.entityId,
          op: e.op,
          payload: e.payload,
        })),
      }),
    });

    // Handle 403 - access revoked for one of the babies
    if (response.status === 403) {
      // Clear pending mutations and local data for affected babies
      const userId = useUserStore.getState().user?.localId;
      if (userId) {
        // Get unique baby IDs from pending mutations
        const affectedBabyIds = new Set<number>();
        for (const mutation of pending) {
          if (mutation.entityType === 'baby') {
            affectedBabyIds.add(Number.parseInt(mutation.entityId, 10));
          } else {
            const payload = mutation.payload as { babyId?: number };
            if (payload.babyId) {
              affectedBabyIds.add(payload.babyId);
            }
          }
        }

        // Clear data for each affected baby
        for (const babyId of affectedBabyIds) {
          await clearRevokedBabyData(babyId, userId);
        }

        // Return the first affected baby ID for UI notification
        const firstBabyId = affectedBabyIds.values().next().value as number | undefined;
        return {
          success: false,
          error: 'Access to baby has been revoked',
          errorType: 'access_revoked',
          revokedBabyId: firstBabyId,
        };
      }
    }

    if (!response.ok) {
      // Network error, keep as pending for retry
      await Promise.all(
        pending.map(e => updateOutboxStatus(e.mutationId, 'pending')),
      );
      const error = await response.text();
      return { success: false, error: `Failed to push mutations: ${error}`, errorType: 'network' };
    }

    const { results, newCursor }: PushResponse = await response.json();

    let changesApplied = 0;

    for (const result of results) {
      if (result.status === 'success') {
        await updateOutboxStatus(result.mutationId, 'synced');
        changesApplied++;
      } else if (result.status === 'conflict') {
        // LWW: server wins, update local with server data
        if (result.serverData) {
          await applyServerData(result.serverData);
        }
        await updateOutboxStatus(result.mutationId, 'synced');
        changesApplied++;
      } else {
        // Error
        await updateOutboxStatus(
          result.mutationId,
          'failed',
          result.error ?? 'Unknown error',
        );
      }
    }

    // Update sync cursor if provided
    if (newCursor) {
      // Get the first baby ID from pending mutations for cursor update
      const firstBabyId = pending[0]?.payload as Record<string, unknown> | undefined;
      if (firstBabyId?.babyId) {
        await updateSyncCursor(firstBabyId.babyId as number, newCursor);
      }
    }

    // Clear synced entries
    await clearSyncedOutboxEntries();

    return { success: true, changesApplied };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during push',
    };
  }
}
