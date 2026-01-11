/**
 * Sync On Login Hook
 *
 * Orchestrates the initial data sync when a user logs in.
 * Handles both critical (blocking) and background (non-blocking) sync.
 *
 * Usage:
 * ```tsx
 * function AuthLayout({ children }) {
 *   const { isReady, error } = useSyncOnLogin(clerkId);
 *   if (!isReady) return <LoadingSpinner />;
 *   if (error) return <ErrorMessage error={error} />;
 *   return children;
 * }
 * ```
 *
 * @see .readme/planning/01-state-management-sync.md
 */

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { useBabyStore } from '@/stores/useBabyStore';
import { useSyncStore } from '@/stores/useSyncStore';
import { useUserStore } from '@/stores/useUserStore';

type SyncOnLoginState = {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
};

export function useSyncOnLogin(clerkId: string | null | undefined): SyncOnLoginState {
  const [state, setState] = useState<SyncOnLoginState>({
    isReady: false,
    isLoading: false,
    error: null,
  });

  const hasInitialized = useRef(false);
  const setUser = useUserStore(s => s.setUser);
  const setAllBabies = useBabyStore(s => s.setAllBabies);
  const setActiveBaby = useBabyStore(s => s.setActiveBaby);
  const setInitialSyncComplete = useSyncStore(s => s.setInitialSyncComplete);
  const setBackgroundProgress = useSyncStore(s => s.setBackgroundProgress);

  const performSync = useCallback(async () => {
    if (!clerkId || hasInitialized.current) {
      return;
    }

    hasInitialized.current = true;
    setState({ isReady: false, isLoading: true, error: null });

    try {
      // Import services dynamically to avoid SSR issues
      const { needsInitialSync, performInitialSync } = await import('@/services/initial-sync');
      const { syncWorkerManager } = await import('@/services/sync-worker-manager');

      // Check if we need to sync
      const needsSync = await needsInitialSync(clerkId);

      if (needsSync) {
        // Perform critical initial sync
        const result = await performInitialSync();

        if (!result.success) {
          setState({ isReady: false, isLoading: false, error: result.error });
          return;
        }

        // Update Zustand stores with synced data
        const { data } = result;

        setUser({
          id: data.user.clerkId,
          localId: data.user.id,
          firstName: data.user.firstName,
          email: data.user.email,
          imageUrl: data.user.imageUrl ?? '',
        });

        const activeBabies = data.babies.map((baby) => {
          const access = data.babyAccess.find(a => a.babyId === baby.id);
          return {
            babyId: baby.id,
            name: baby.name,
            accessLevel: access?.accessLevel ?? 'viewer' as const,
            caregiverLabel: access?.caregiverLabel ?? null,
          };
        });

        setAllBabies(activeBabies);

        if (activeBabies.length > 0 && activeBabies[0]) {
          setActiveBaby(activeBabies[0]);
        }

        // Start background sync for historical data
        const babyIds = data.babies.map(b => b.id);
        if (babyIds.length > 0) {
          syncWorkerManager.startSync(babyIds, (progress) => {
            setBackgroundProgress(progress);
          });
        }
      } else {
        // Hydrate from existing IndexedDB data
        const userStore = useUserStore.getState();
        await userStore.hydrateFromIndexedDB();

        const user = useUserStore.getState().user;
        if (user) {
          const babyStore = useBabyStore.getState();
          await babyStore.hydrateFromIndexedDB(user.localId);
        }
      }

      setInitialSyncComplete(true);
      setState({ isReady: true, isLoading: false, error: null });
    } catch (error) {
      console.error('Sync on login error:', error);
      setState({
        isReady: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown sync error',
      });
    }
  }, [clerkId, setUser, setAllBabies, setActiveBaby, setInitialSyncComplete, setBackgroundProgress]);

  useEffect(() => {
    if (clerkId) {
      performSync();
    }
  }, [clerkId, performSync]);

  // Cleanup worker on unmount
  useEffect(() => {
    return () => {
      import('@/services/sync-worker-manager').then(({ syncWorkerManager }) => {
        syncWorkerManager.terminate();
      });
    };
  }, []);

  return state;
}

/**
 * Hook to check if sync is needed without triggering it
 */
export function useNeedsSync(clerkId: string | null | undefined): boolean | null {
  const [needsSync, setNeedsSync] = useState<boolean | null>(null);

  useEffect(() => {
    if (!clerkId) {
      setNeedsSync(null);
      return;
    }

    import('@/services/initial-sync').then(({ needsInitialSync }) => {
      needsInitialSync(clerkId).then(setNeedsSync);
    });
  }, [clerkId]);

  return needsSync;
}
