/**
 * Background Sync Worker
 *
 * Web Worker for fetching historical data without blocking the main thread.
 * Handles chunked data fetching and progress reporting.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

// ============================================================================
// Message Types
// ============================================================================

export type SyncWorkerCommand = { type: 'START_SYNC'; babyIds: number[] } | { type: 'STOP_SYNC' };

type SyncStarted = { type: 'SYNC_STARTED'; totalBabies: number };
type BabySyncStarted = { type: 'BABY_SYNC_STARTED'; babyId: number; babyName?: string };
type BabySyncProgress = { type: 'BABY_SYNC_PROGRESS'; babyId: number; fetched: number; total: number };
type BabySyncComplete = { type: 'BABY_SYNC_COMPLETE'; babyId: number; logCount: number };
type BabySyncError = { type: 'BABY_SYNC_ERROR'; babyId: number; error: string };
type SyncComplete = { type: 'SYNC_COMPLETE'; totalLogs: number };
type SyncError = { type: 'SYNC_ERROR'; error: string };

export type SyncWorkerEvent = SyncStarted | BabySyncStarted | BabySyncProgress | BabySyncComplete | BabySyncError | SyncComplete | SyncError;

// ============================================================================
// Worker State
// ============================================================================

let isRunning = false;
let abortController: AbortController | null = null;

// ============================================================================
// Fetch Functions
// ============================================================================

type FetchLogsResponse = {
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
  nextCursor: number | null;
  hasMore: boolean;
};

async function fetchLogsChunk(
  babyId: number,
  cursor: number | null,
  limit: number,
  signal: AbortSignal,
): Promise<FetchLogsResponse> {
  const params = new URLSearchParams({
    babyId: String(babyId),
    limit: String(limit),
  });

  if (cursor !== null) {
    params.set('before', String(cursor));
  }

  const response = await fetch(`/api/sync/logs?${params.toString()}`, {
    method: 'GET',
    headers: { 'Content-Type': 'application/json' },
    signal,
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Failed to fetch logs: ${error}`);
  }

  return response.json();
}

// ============================================================================
// Sync Logic
// ============================================================================

async function syncBabyLogs(babyId: number, signal: AbortSignal): Promise<number> {
  const CHUNK_SIZE = 100;
  let cursor: number | null = null;
  let totalFetched = 0;
  let hasMore = true;

  globalThis.postMessage({
    type: 'BABY_SYNC_STARTED',
    babyId,
  } satisfies SyncWorkerEvent);

  while (hasMore && !signal.aborted) {
    const result = await fetchLogsChunk(babyId, cursor, CHUNK_SIZE, signal);

    if (result.logs.length > 0) {
      // Send logs to main thread for storage in IndexedDB
      // The main thread will handle the actual Dexie operations
      globalThis.postMessage({
        type: 'LOGS_FETCHED',
        babyId,
        logs: result.logs,
      });

      totalFetched += result.logs.length;
    }

    globalThis.postMessage({
      type: 'BABY_SYNC_PROGRESS',
      babyId,
      fetched: totalFetched,
      total: totalFetched + (result.hasMore ? CHUNK_SIZE : 0), // Estimate
    } satisfies SyncWorkerEvent);

    cursor = result.nextCursor;
    hasMore = result.hasMore;

    // Small delay to avoid overwhelming the server
    if (hasMore) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }

  globalThis.postMessage({
    type: 'BABY_SYNC_COMPLETE',
    babyId,
    logCount: totalFetched,
  } satisfies SyncWorkerEvent);

  return totalFetched;
}

async function runSync(babyIds: number[]): Promise<void> {
  if (isRunning) {
    globalThis.postMessage({
      type: 'SYNC_ERROR',
      error: 'Sync already in progress',
    } satisfies SyncWorkerEvent);
    return;
  }

  isRunning = true;
  abortController = new AbortController();

  globalThis.postMessage({
    type: 'SYNC_STARTED',
    totalBabies: babyIds.length,
  } satisfies SyncWorkerEvent);

  let totalLogs = 0;

  try {
    for (const babyId of babyIds) {
      if (abortController.signal.aborted) {
        break;
      }

      try {
        const logCount = await syncBabyLogs(babyId, abortController.signal);
        totalLogs += logCount;
      } catch (error) {
        if (error instanceof Error && error.name === 'AbortError') {
          break;
        }
        globalThis.postMessage({
          type: 'BABY_SYNC_ERROR',
          babyId,
          error: error instanceof Error ? error.message : 'Unknown error',
        } satisfies SyncWorkerEvent);
      }
    }

    if (!abortController.signal.aborted) {
      globalThis.postMessage({
        type: 'SYNC_COMPLETE',
        totalLogs,
      } satisfies SyncWorkerEvent);
    }
  } catch (error) {
    globalThis.postMessage({
      type: 'SYNC_ERROR',
      error: error instanceof Error ? error.message : 'Unknown error',
    } satisfies SyncWorkerEvent);
  } finally {
    isRunning = false;
    abortController = null;
  }
}

function stopSync(): void {
  if (abortController) {
    abortController.abort();
  }
}

// ============================================================================
// Message Handler
// ============================================================================

globalThis.onmessage = (event: MessageEvent<SyncWorkerCommand>) => {
  const command = event.data;

  switch (command.type) {
    case 'START_SYNC':
      runSync(command.babyIds);
      break;
    case 'STOP_SYNC':
      stopSync();
      break;
  }
};

// Export for type checking (won't be used at runtime)
export {};
