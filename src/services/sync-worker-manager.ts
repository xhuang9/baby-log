/**
 * Sync Worker Manager
 *
 * Manages the background sync Web Worker from the main thread.
 * Handles worker lifecycle, message passing, and IndexedDB updates.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import type { LocalFeedLog } from '@/lib/local-db';
import type { SyncWorkerCommand, SyncWorkerEvent } from '@/workers/sync-worker';
import { saveFeedLogs, updateSyncStatus } from '@/lib/local-db';

// ============================================================================
// Types
// ============================================================================

type LogsFetchedEvent = {
  type: 'LOGS_FETCHED';
  babyId: number;
  logs: Array<{
    id: string;
    babyId: number;
    loggedByUserId: number;
    method: 'breast' | 'bottle';
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    amountMl: number | null;
    isEstimated: boolean;
    endSide: 'left' | 'right' | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
};

type WorkerMessage = SyncWorkerEvent | LogsFetchedEvent;

export type SyncProgress = {
  status: 'idle' | 'syncing' | 'complete' | 'error';
  currentBabyId: number | null;
  totalBabies: number;
  completedBabies: number;
  totalLogs: number;
  error: string | null;
};

export type SyncProgressCallback = (progress: SyncProgress) => void;

// ============================================================================
// Worker Manager Class
// ============================================================================

class SyncWorkerManager {
  private worker: Worker | null = null;
  private progressCallback: SyncProgressCallback | null = null;
  private progress: SyncProgress = {
    status: 'idle',
    currentBabyId: null,
    totalBabies: 0,
    completedBabies: 0,
    totalLogs: 0,
    error: null,
  };

  /**
   * Initialize the worker
   */
  private initWorker(): Worker {
    if (this.worker) {
      return this.worker;
    }

    // Create worker using dynamic import URL
    this.worker = new Worker(
      new URL('../workers/sync-worker.ts', import.meta.url),
      { type: 'module' },
    );

    this.worker.onmessage = (event: MessageEvent<WorkerMessage>) => {
      this.handleWorkerMessage(event.data);
    };

    this.worker.onerror = (error) => {
      console.error('Sync worker error:', error);
      this.updateProgress({
        status: 'error',
        error: error.message || 'Worker error',
      });
    };

    return this.worker;
  }

  /**
   * Handle messages from the worker
   */
  private async handleWorkerMessage(message: WorkerMessage): Promise<void> {
    switch (message.type) {
      case 'SYNC_STARTED':
        this.updateProgress({
          status: 'syncing',
          totalBabies: message.totalBabies,
          completedBabies: 0,
          totalLogs: 0,
          error: null,
        });
        await updateSyncStatus('feed_logs', 'syncing');
        break;

      case 'BABY_SYNC_STARTED':
        this.updateProgress({
          currentBabyId: message.babyId,
        });
        break;

      case 'BABY_SYNC_PROGRESS':
        // Progress update - could be used for more granular UI
        break;

      case 'BABY_SYNC_COMPLETE':
        this.updateProgress({
          completedBabies: this.progress.completedBabies + 1,
          totalLogs: this.progress.totalLogs + message.logCount,
        });
        break;

      case 'BABY_SYNC_ERROR':
        console.error(`Baby sync error for ${message.babyId}:`, message.error);
        break;

      case 'LOGS_FETCHED':
        await this.storeLogs(message.logs);
        break;

      case 'SYNC_COMPLETE':
        this.updateProgress({
          status: 'complete',
          currentBabyId: null,
          totalLogs: message.totalLogs,
        });
        await updateSyncStatus('feed_logs', 'complete');
        break;

      case 'SYNC_ERROR':
        this.updateProgress({
          status: 'error',
          error: message.error,
        });
        await updateSyncStatus('feed_logs', 'error', { errorMessage: message.error });
        break;
    }
  }

  /**
   * Store fetched logs in IndexedDB
   */
  private async storeLogs(logs: LogsFetchedEvent['logs']): Promise<void> {
    const localLogs: LocalFeedLog[] = logs.map(log => ({
      id: log.id,
      babyId: log.babyId,
      loggedByUserId: log.loggedByUserId,
      method: log.method,
      startedAt: new Date(log.startedAt),
      endedAt: log.endedAt ? new Date(log.endedAt) : null,
      durationMinutes: log.durationMinutes,
      amountMl: log.amountMl,
      isEstimated: log.isEstimated,
      endSide: log.endSide,
      notes: log.notes,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    }));

    await saveFeedLogs(localLogs);
  }

  /**
   * Update progress and notify callback
   */
  private updateProgress(updates: Partial<SyncProgress>): void {
    this.progress = { ...this.progress, ...updates };
    this.progressCallback?.(this.progress);
  }

  /**
   * Start background sync for the given babies
   */
  startSync(babyIds: number[], onProgress?: SyncProgressCallback): void {
    if (typeof window === 'undefined') {
      return; // Skip on server
    }

    this.progressCallback = onProgress ?? null;
    const worker = this.initWorker();

    worker.postMessage({
      type: 'START_SYNC',
      babyIds,
    } satisfies SyncWorkerCommand);
  }

  /**
   * Stop the current sync
   */
  stopSync(): void {
    if (this.worker) {
      this.worker.postMessage({
        type: 'STOP_SYNC',
      } satisfies SyncWorkerCommand);
    }
  }

  /**
   * Terminate the worker completely
   */
  terminate(): void {
    if (this.worker) {
      this.worker.terminate();
      this.worker = null;
    }
    this.progressCallback = null;
    this.progress = {
      status: 'idle',
      currentBabyId: null,
      totalBabies: 0,
      completedBabies: 0,
      totalLogs: 0,
      error: null,
    };
  }

  /**
   * Get current sync progress
   */
  getProgress(): SyncProgress {
    return { ...this.progress };
  }
}

// ============================================================================
// Singleton Export
// ============================================================================

export const syncWorkerManager = new SyncWorkerManager();
