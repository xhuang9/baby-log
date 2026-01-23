/**
 * Full Sync
 *
 * Performs a complete bidirectional sync (push + pull) for all accessible babies.
 */

import type { SyncResult } from './types';
import { refreshAuthSession } from '@/lib/local-db';
import { pullChanges } from './pull';
import { flushOutbox } from './push';

/**
 * Perform a full sync for all accessible babies
 */
export async function performFullSync(babyIds: number[]): Promise<SyncResult> {
  try {
    // First, flush outbox to push any pending changes
    const pushResult = await flushOutbox();
    if (!pushResult.success) {
      console.warn('Outbox flush failed:', pushResult.error);
      // Continue with pull even if push fails
    }

    // Then, pull changes for each baby
    let totalChanges = pushResult.changesApplied ?? 0;

    for (const babyId of babyIds) {
      const pullResult = await pullChanges(babyId);
      if (pullResult.success && pullResult.changesApplied) {
        totalChanges += pullResult.changesApplied;
      }
    }

    // Refresh auth session on successful sync (extends offline access window)
    if (totalChanges > 0 || pushResult.success) {
      try {
        await refreshAuthSession();
      } catch (e) {
        // Non-critical: don't fail sync if session refresh fails
        console.warn('Failed to refresh auth session:', e);
      }
    }

    return { success: true, changesApplied: totalChanges };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during sync',
    };
  }
}
