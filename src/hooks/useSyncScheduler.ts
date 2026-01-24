/**
 * Sync Scheduler Hook
 *
 * Manages automatic synchronization for a baby's data.
 * Handles pull sync on interval and outbox flush on reconnect.
 *
 * @see .readme/planning/03-sync-api-endpoints.md
 */

'use client';

import { useQuery, useQueryClient } from '@tanstack/react-query';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getSyncCursor } from '@/lib/local-db';
import { notifySystem } from '@/lib/notify';
import { queryKeys } from '@/lib/query-keys';
import { flushOutbox, pullChanges } from '@/services/sync';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';
import { useOnlineStatus, useOnlineStatusChange } from './useOnlineStatus';

// ============================================================================
// Configuration
// ============================================================================

const SYNC_INTERVAL_MS = 5000; // Pull sync every 5 seconds
const INITIAL_SYNC_DELAY_MS = 1000; // Wait 1 second before first sync

// ============================================================================
// Hook
// ============================================================================

type UseSyncSchedulerOptions = {
  /** Baby ID to sync */
  babyId: number;
  /** Whether sync is enabled (default: true) */
  enabled?: boolean;
  /** Custom sync interval in ms (default: 5000) */
  syncInterval?: number;
};

type SyncSchedulerState = {
  /** Whether sync is currently in progress */
  isSyncing: boolean;
  /** Last error from sync */
  error: string | null;
  /** Number of changes applied in last sync */
  lastSyncChanges: number;
  /** Timestamp of last successful sync */
  lastSyncAt: Date | null;
  /** Manually trigger a sync */
  triggerSync: () => Promise<void>;
};

export function useSyncScheduler({
  babyId,
  enabled = true,
  syncInterval = SYNC_INTERVAL_MS,
}: UseSyncSchedulerOptions): SyncSchedulerState {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [lastSyncAt, setLastSyncAt] = useState<Date | null>(null);
  const [lastSyncChanges, setLastSyncChanges] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  // Get baby store for access revocation handling
  const { activeBaby, allBabies, setActiveBaby, setAllBabies } = useBabyStore();
  const user = useUserStore(s => s.user);

  // Fetch cursor to use in query key
  const { data: cursor = 0 } = useQuery({
    queryKey: queryKeys.sync.version(babyId),
    queryFn: () => getSyncCursor(babyId),
    enabled: enabled && isOnline,
    staleTime: Infinity, // Cursor is updated manually after sync
  });

  // Main sync query - pulls changes on interval
  const { isFetching: isPulling, error: pullError } = useQuery({
    queryKey: queryKeys.sync.changes(babyId, cursor),
    queryFn: async () => {
      const result = await pullChanges(babyId);

      if (result.success) {
        setLastSyncAt(new Date());
        setLastSyncChanges(result.changesApplied ?? 0);
        setLastError(null);

        // Invalidate cursor query to get updated cursor
        queryClient.invalidateQueries({
          queryKey: queryKeys.sync.version(babyId),
        });

        // Invalidate feed logs to refresh UI
        queryClient.invalidateQueries({
          queryKey: queryKeys.feedLogs.list(babyId),
        });
      } else if (result.errorType === 'access_revoked') {
        // Handle access revocation
        setLastError(result.error ?? 'Access revoked');

        // Remove the revoked baby from allBabies
        const updatedBabies = allBabies.filter(b => b.babyId !== result.revokedBabyId);
        setAllBabies(updatedBabies);

        // If the active baby was revoked, switch to another baby
        if (activeBaby?.babyId === result.revokedBabyId) {
          const nextBaby = updatedBabies[0] ?? null;
          if (nextBaby) {
            setActiveBaby(nextBaby);
          }
        }

        // Show toast notification
        toast.error('Access Revoked', {
          description: 'Your access to this baby has been removed by the owner.',
        });

        // Log to notification system
        if (user?.localId) {
          void notifySystem.access('error', {
            userId: user.localId,
            title: 'Access Revoked',
            message: 'Your access to this baby has been removed by the owner.',
            babyId: result.revokedBabyId,
            dedupeKey: `access-revoked-${result.revokedBabyId}`,
          });
        }

        // Invalidate queries to refresh UI
        queryClient.invalidateQueries();
      } else {
        setLastError(result.error ?? 'Unknown error');
      }

      return result;
    },
    enabled: enabled && isOnline,
    refetchInterval: syncInterval,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    refetchIntervalInBackground: false, // Don't sync when tab is not visible
    staleTime: syncInterval / 2, // Consider stale after half the interval
  });

  // Flush outbox when coming online
  useOnlineStatusChange(
    useCallback(async () => {
      if (enabled) {
        await flushOutbox();
        // After flushing, trigger a pull to get any updates
        queryClient.invalidateQueries({
          queryKey: queryKeys.sync.changes(babyId, cursor),
        });
      }
    }, [enabled, babyId, cursor, queryClient]),
    undefined, // No callback for going offline
  );

  // Initial sync with delay
  useEffect(() => {
    if (!enabled || !isOnline) {
      return undefined;
    }

    const timeoutId = setTimeout(async () => {
      await flushOutbox();
    }, INITIAL_SYNC_DELAY_MS);

    return () => {
      clearTimeout(timeoutId);
    };
  }, [enabled, isOnline]);

  // Manual sync trigger
  const triggerSync = useCallback(async () => {
    if (!isOnline) {
      return;
    }

    // Flush outbox first
    await flushOutbox();

    // Then pull changes
    await queryClient.invalidateQueries({
      queryKey: queryKeys.sync.changes(babyId, cursor),
    });
  }, [isOnline, babyId, cursor, queryClient]);

  return {
    isSyncing: isPulling,
    error: pullError instanceof Error ? pullError.message : lastError,
    lastSyncChanges,
    lastSyncAt,
    triggerSync,
  };
}

// ============================================================================
// Multi-Baby Sync Hook
// ============================================================================

type UseMultiBabySyncOptions = {
  /** Baby IDs to sync */
  babyIds: number[];
  /** Whether sync is enabled (default: true) */
  enabled?: boolean;
};

/**
 * Sync scheduler for multiple babies
 * Uses a single outbox flush but pulls changes for each baby
 */
export function useMultiBabySync({
  babyIds,
  enabled = true,
}: UseMultiBabySyncOptions): {
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
} {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSyncingRef = useRef(false);

  // Get baby store for access revocation handling
  const { activeBaby, allBabies, setActiveBaby, setAllBabies } = useBabyStore();
  const user = useUserStore(s => s.user);

  // Flush outbox when coming online
  useOnlineStatusChange(
    useCallback(async () => {
      if (enabled) {
        const result = await flushOutbox();

        // Handle access revocation from outbox flush
        if (result.errorType === 'access_revoked' && result.revokedBabyId) {
          const updatedBabies = allBabies.filter(b => b.babyId !== result.revokedBabyId);
          setAllBabies(updatedBabies);

          if (activeBaby?.babyId === result.revokedBabyId) {
            const nextBaby = updatedBabies[0] ?? null;
            if (nextBaby) {
              setActiveBaby(nextBaby);
            }
          }

          toast.error('Access Revoked', {
            description: 'Your access to this baby has been removed by the owner.',
          });

          // Log to notification system
          const currentUser = useUserStore.getState().user;
          if (currentUser?.localId) {
            void notifySystem.access('error', {
              userId: currentUser.localId,
              title: 'Access Revoked',
              message: 'Your access to this baby has been removed by the owner.',
              babyId: result.revokedBabyId,
              dedupeKey: `access-revoked-${result.revokedBabyId}`,
            });
          }
        }
      }
    }, [enabled, allBabies, activeBaby, setAllBabies, setActiveBaby]),
  );

  const triggerSync = useCallback(async () => {
    if (!isOnline || isSyncingRef.current) {
      return;
    }

    isSyncingRef.current = true;
    setIsSyncing(true);

    try {
      // Flush outbox first
      const flushResult = await flushOutbox();

      // Handle access revocation from outbox flush
      if (flushResult.errorType === 'access_revoked' && flushResult.revokedBabyId) {
        const updatedBabies = allBabies.filter(b => b.babyId !== flushResult.revokedBabyId);
        setAllBabies(updatedBabies);

        if (activeBaby?.babyId === flushResult.revokedBabyId) {
          const nextBaby = updatedBabies[0] ?? null;
          if (nextBaby) {
            setActiveBaby(nextBaby);
          }
        }

        toast.error('Access Revoked', {
          description: 'Your access to this baby has been removed by the owner.',
        });

        // Log to notification system
        if (user?.localId) {
          void notifySystem.access('error', {
            userId: user.localId,
            title: 'Access Revoked',
            message: 'Your access to this baby has been removed by the owner.',
            babyId: flushResult.revokedBabyId,
            dedupeKey: `access-revoked-${flushResult.revokedBabyId}`,
          });
        }
      }

      // Pull changes for each baby
      for (const babyId of babyIds) {
        const result = await pullChanges(babyId);

        // Handle access revocation
        if (result.errorType === 'access_revoked' && result.revokedBabyId) {
          const currentBabies = useBabyStore.getState().allBabies;
          const updatedBabies = currentBabies.filter(b => b.babyId !== result.revokedBabyId);
          setAllBabies(updatedBabies);

          const currentActive = useBabyStore.getState().activeBaby;
          if (currentActive?.babyId === result.revokedBabyId) {
            const nextBaby = updatedBabies[0] ?? null;
            if (nextBaby) {
              setActiveBaby(nextBaby);
            }
          }

          toast.error('Access Revoked', {
            description: 'Your access to this baby has been removed by the owner.',
          });

          // Log to notification system
          if (user?.localId) {
            void notifySystem.access('error', {
              userId: user.localId,
              title: 'Access Revoked',
              message: 'Your access to this baby has been removed by the owner.',
              babyId: result.revokedBabyId,
              dedupeKey: `access-revoked-${result.revokedBabyId}`,
            });
          }
        }
      }

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: queryKeys.sync.all,
      });
      queryClient.invalidateQueries({
        queryKey: queryKeys.feedLogs.all,
      });
    } finally {
      isSyncingRef.current = false;
      setIsSyncing(false);
    }
  }, [isOnline, babyIds, queryClient, allBabies, activeBaby, setAllBabies, setActiveBaby, user]);

  return {
    triggerSync,
    isSyncing,
  };
}
