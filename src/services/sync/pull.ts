/**
 * Pull Changes
 *
 * Pulls changes from server and applies them to local IndexedDB.
 */

import type { PullResponse, SyncResult } from './types';
import {
  clearRevokedBabyData,
  getSyncCursor,
  updateSyncCursor,
} from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';
import { applyChange } from './apply';

/**
 * Pull changes from server for a baby since the given cursor
 */
export async function pullChanges(babyId: number): Promise<SyncResult> {
  try {
    const cursor = await getSyncCursor(babyId);

    const response = await fetch(
      `/api/sync/pull?babyId=${babyId}&since=${cursor}&limit=100`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        cache: 'no-store',
      },
    );

    // Handle 403 - access revoked
    if (response.status === 403) {
      const userId = useUserStore.getState().user?.localId;
      if (userId) {
        await clearRevokedBabyData(babyId, userId);
      }
      return {
        success: false,
        error: 'Access to this baby has been revoked',
        errorType: 'access_revoked',
        revokedBabyId: babyId,
      };
    }

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to pull changes: ${error}`, errorType: 'network' };
    }

    const data: PullResponse = await response.json();

    // Apply changes to local database
    let changesApplied = 0;
    for (const change of data.changes) {
      await applyChange(change);
      changesApplied++;
    }

    // Update cursor
    if (data.nextCursor > cursor) {
      await updateSyncCursor(babyId, data.nextCursor);
    }

    // If there are more changes, continue pulling
    if (data.hasMore) {
      const moreResult = await pullChanges(babyId);
      if (moreResult.success && moreResult.changesApplied) {
        changesApplied += moreResult.changesApplied;
      }
    }

    return { success: true, changesApplied };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during pull',
    };
  }
}
