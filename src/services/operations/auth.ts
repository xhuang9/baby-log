/**
 * Auth Operations
 *
 * Centralized operations for authentication-related actions.
 * These are client-side cleanup operations that don't sync to server.
 */

import type { OperationResult } from './types';
import { clearAllLocalData } from '@/lib/local-db';
import { useBabyStore } from '@/stores/useBabyStore';

import { useUserStore } from '@/stores/useUserStore';
import {
  failure,
  isClientSide,

  success,
} from './types';

// ============================================================================
// Auth Operations
// ============================================================================

/**
 * Sign out cleanup
 * - Clears all IndexedDB data (11 tables)
 * - Clears Zustand stores (which also clear sessionStorage)
 * - Clears additional sessionStorage keys
 */
export async function signOutCleanup(): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // 1. Clear all IndexedDB data (11 tables)
    try {
      await clearAllLocalData();
      console.log('[Logout] Successfully cleared all IndexedDB data');
    } catch (error) {
      // Log but continue - session invalidation is primary security
      console.error('[Logout] Failed to clear IndexedDB:', error);
    }

    // 2. Clear Zustand stores (also clears sessionStorage)
    const userStore = useUserStore.getState();
    const babyStore = useBabyStore.getState();

    userStore.clearUser();
    babyStore.clearActiveBaby();

    // 3. Clear additional sessionStorage keys
    sessionStorage.removeItem('baby-log:init-step');

    console.log('[Logout] Cleanup complete');
    return success(undefined);
  } catch (error) {
    console.error('[Logout] Cleanup failed:', error);
    return failure(
      error instanceof Error ? error.message : 'Failed to cleanup on sign out',
    );
  }
}
