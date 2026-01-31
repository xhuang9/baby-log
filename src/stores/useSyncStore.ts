/**
 * Sync Status Store
 *
 * Tracks the synchronization status of different data entities.
 * Used to show sync indicators in the UI.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import type { SyncEntityType, SyncStatusValue } from '@/lib/local-db';
import type { SyncProgress } from '@/services/sync-worker-manager';
import { create } from 'zustand';
import { getAllSyncStatuses } from '@/lib/local-db';

export type EntitySyncStatus = {
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  progress: number | null;
};

type SyncStore = {
  // Per-entity sync status
  entities: Record<SyncEntityType, EntitySyncStatus>;

  // Background worker sync progress
  backgroundSync: SyncProgress;

  // Overall sync state
  isInitialSyncComplete: boolean;
  isBackgroundSyncRunning: boolean;

  // Actions
  setEntityStatus: (entity: SyncEntityType, status: EntitySyncStatus) => void;
  setBackgroundProgress: (progress: SyncProgress) => void;
  setInitialSyncComplete: (complete: boolean) => void;
  hydrateFromIndexedDB: () => Promise<void>;
  reset: () => void;
};

const defaultEntityStatus: EntitySyncStatus = {
  status: 'idle',
  lastSyncAt: null,
  errorMessage: null,
  progress: null,
};

const defaultBackgroundSync: SyncProgress = {
  status: 'idle',
  currentBabyId: null,
  totalBabies: 0,
  completedBabies: 0,
  totalLogs: 0,
  error: null,
};

export const useSyncStore = create<SyncStore>((set, get) => ({
  entities: {
    user: { ...defaultEntityStatus },
    babies: { ...defaultEntityStatus },
    baby_access: { ...defaultEntityStatus },
    feed_logs: { ...defaultEntityStatus },
    sleep_logs: { ...defaultEntityStatus },
    nappy_logs: { ...defaultEntityStatus },
    solids_logs: { ...defaultEntityStatus },
    ui_config: { ...defaultEntityStatus },
    bootstrap: { ...defaultEntityStatus },
  },

  backgroundSync: { ...defaultBackgroundSync },
  isInitialSyncComplete: false,
  isBackgroundSyncRunning: false,

  setEntityStatus: (entity, status) => {
    set(state => ({
      entities: {
        ...state.entities,
        [entity]: status,
      },
    }));
  },

  setBackgroundProgress: (progress) => {
    set({
      backgroundSync: progress,
      isBackgroundSyncRunning: progress.status === 'syncing',
    });
  },

  setInitialSyncComplete: (complete) => {
    set({ isInitialSyncComplete: complete });
  },

  hydrateFromIndexedDB: async () => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const statuses = await getAllSyncStatuses();

      const entities = { ...get().entities };
      for (const status of statuses) {
        entities[status.entityType] = {
          status: status.status,
          lastSyncAt: status.lastSyncAt,
          errorMessage: status.errorMessage,
          progress: status.progress,
        };
      }

      // Check if initial sync was completed
      const criticalEntities: SyncEntityType[] = ['user', 'babies', 'baby_access'];
      const allCriticalComplete = criticalEntities.every(
        entity => entities[entity].status === 'complete',
      );

      set({
        entities,
        isInitialSyncComplete: allCriticalComplete,
      });
    } catch (error) {
      console.error('Failed to hydrate sync status:', error);
    }
  },

  reset: () => {
    set({
      entities: {
        user: { ...defaultEntityStatus },
        babies: { ...defaultEntityStatus },
        baby_access: { ...defaultEntityStatus },
        feed_logs: { ...defaultEntityStatus },
        sleep_logs: { ...defaultEntityStatus },
        nappy_logs: { ...defaultEntityStatus },
        solids_logs: { ...defaultEntityStatus },
        ui_config: { ...defaultEntityStatus },
        bootstrap: { ...defaultEntityStatus },
      },
      backgroundSync: { ...defaultBackgroundSync },
      isInitialSyncComplete: false,
      isBackgroundSyncRunning: false,
    });
  },
}));

// ============================================================================
// Selector Hooks
// ============================================================================

/**
 * Get the overall sync status across all entities
 */
export function useOverallSyncStatus(): 'idle' | 'syncing' | 'complete' | 'error' {
  return useSyncStore((state) => {
    const statuses = Object.values(state.entities).map(e => e.status);

    if (statuses.includes('error')) {
      return 'error';
    }
    if (statuses.includes('syncing')) {
      return 'syncing';
    }
    if (statuses.every(s => s === 'complete')) {
      return 'complete';
    }
    return 'idle';
  });
}

/**
 * Check if there are any sync errors
 */
export function useSyncErrors(): string[] {
  return useSyncStore((state) => {
    return Object.values(state.entities)
      .filter(e => e.errorMessage)
      .map(e => e.errorMessage!);
  });
}
