'use client';

/**
 * Sync Provider Component (Local-First)
 *
 * Implements local-first architecture:
 * 1. Always hydrates from IndexedDB first (instant, works offline)
 * 2. Renders immediately if local data exists
 * 3. Syncs with server in background when online (non-blocking)
 * 4. Only blocks UI if IndexedDB is empty and initial sync is needed
 *
 * This ensures the app works offline and feels instant.
 */

import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useSyncScheduler } from '@/hooks/useSyncScheduler';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

type SyncState = {
  isReady: boolean;
  isLoading: boolean;
  error: string | null;
};

type SyncProviderProps = {
  children: React.ReactNode;
};

export function SyncProvider({ children }: SyncProviderProps) {
  const { userId: clerkId, isLoaded: authLoaded } = useAuth();
  const [state, setState] = useState<SyncState>({
    isReady: false,
    isLoading: true,
    error: null,
  });

  const hasInitialized = useRef(false);
  const userStore = useUserStore;
  const babyStore = useBabyStore;

  const initialize = useCallback(async () => {
    if (hasInitialized.current || !authLoaded || !clerkId) {
      return;
    }

    hasInitialized.current = true;

    try {
      // Step 1: Always try to hydrate from IndexedDB first (local-first)
      await userStore.getState().hydrateFromIndexedDB();

      const user = userStore.getState().user;

      if (user) {
        // We have local data - hydrate baby store and render immediately
        await babyStore.getState().hydrateFromIndexedDB(user.localId);

        // App is ready to use with local data
        setState({ isReady: true, isLoading: false, error: null });

        // Step 2: Background sync is handled by BackgroundSyncScheduler component
        // which uses useSyncScheduler hook for polling
      } else {
        // No local data - need initial sync from server
        if (!navigator.onLine) {
          // Offline and no local data - can't proceed
          setState({
            isReady: false,
            isLoading: false,
            error: 'No local data available. Please connect to the internet to sync.',
          });
          return;
        }

        // Online - perform initial sync (blocking, required for first use)
        const result = await performInitialSyncAndHydrate(clerkId);

        if (result.success) {
          setState({ isReady: true, isLoading: false, error: null });
        } else {
          setState({ isReady: false, isLoading: false, error: result.error });
        }
      }
    } catch (error) {
      console.error('[SyncProvider] Initialization error:', error);
      setState({
        isReady: false,
        isLoading: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      });
    }
  }, [authLoaded, clerkId, userStore, babyStore]);

  useEffect(() => {
    if (authLoaded && clerkId) {
      initialize();
    } else if (authLoaded && !clerkId) {
      // Not signed in
      setState({ isReady: false, isLoading: false, error: 'Not signed in' });
    }
  }, [authLoaded, clerkId, initialize]);

  // Loading auth
  if (!authLoaded) {
    return null;
  }

  // Loading local data / initial sync
  if (state.isLoading) {
    return (
      <div className="flex h-screen items-center justify-center">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  // Error state
  if (state.error) {
    return (
      <div className="flex h-screen flex-col items-center justify-center gap-4">
        <div className="text-destructive">{state.error}</div>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-primary-foreground"
        >
          Retry
        </button>
      </div>
    );
  }

  // Ready - render children with background sync
  return (
    <>
      {children}
      <BackgroundSyncScheduler />
    </>
  );
}

/**
 * Background sync scheduler component
 * Uses useSyncScheduler to poll for changes from other caregivers
 */
function BackgroundSyncScheduler() {
  const activeBaby = useBabyStore(state => state.activeBaby);

  // Only sync if we have an active baby
  useSyncScheduler({
    babyId: activeBaby?.babyId ?? 0,
    enabled: !!activeBaby?.babyId,
  });

  return null;
}

/**
 * Perform initial sync from server and hydrate stores
 * Only called when IndexedDB has no data (first login)
 */
async function performInitialSyncAndHydrate(
  _clerkId: string,
): Promise<{ success: true } | { success: false; error: string }> {
  try {
    const { performInitialSync } = await import('@/services/initial-sync');
    const result = await performInitialSync();

    if (!result.success) {
      return { success: false, error: result.error };
    }

    // Hydrate stores with the synced data
    const { data } = result;
    const userStore = useUserStore.getState();
    const babyStore = useBabyStore.getState();

    userStore.setUser({
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
        accessLevel: access?.accessLevel ?? ('viewer' as const),
        caregiverLabel: access?.caregiverLabel ?? null,
      };
    });

    babyStore.setAllBabies(activeBabies);
    if (activeBabies.length > 0 && activeBabies[0]) {
      babyStore.setActiveBaby(activeBabies[0]);
    }

    return { success: true };
  } catch (error) {
    console.error('[performInitialSyncAndHydrate] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Sync failed',
    };
  }
}
