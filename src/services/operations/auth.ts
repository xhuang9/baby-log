/**
 * Auth Operations
 *
 * Centralized operations for authentication-related actions.
 * These are client-side cleanup operations that don't sync to server.
 */

import { clearAuthSession } from '@/lib/local-db';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

import {
  failure,
  isClientSide,
  success,
  type OperationResult,
} from './types';

// ============================================================================
// Auth Operations
// ============================================================================

/**
 * Sign out cleanup
 * - Clears Zustand stores (which also clear sessionStorage)
 * - Clears additional sessionStorage keys
 * - Clears auth session in IndexedDB
 */
export async function signOutCleanup(): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Clear Zustand stores (which also clear sessionStorage)
    const userStore = useUserStore.getState();
    const babyStore = useBabyStore.getState();

    userStore.clearUser();
    babyStore.clearActiveBaby();

    // Clear additional sessionStorage keys
    sessionStorage.removeItem('baby-log:init-step');

    // Clear auth session marker for offline access
    // This prevents offline access after explicit sign out
    await clearAuthSession();

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to cleanup on sign out',
    );
  }
}
