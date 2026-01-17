---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/workers/sync-worker.ts
  - src/services/sync-worker-manager.ts
  - src/stores/useSyncStore.ts
---

# Background Sync Worker

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Fetch historical feed logs in a Web Worker and stream them into IndexedDB without blocking the UI.

## Key Deviations from Standard

- **Worker fetch, main-thread writes**: The worker only fetches and posts log batches; Dexie writes happen in `sync-worker-manager`.
- **Feed-log focused**: Current worker manager updates `feed_logs` sync status only.

## Architecture / Implementation

### Components
- `src/workers/sync-worker.ts` - Fetches logs in chunks via `/api/sync/logs`.
- `src/services/sync-worker-manager.ts` - Owns the worker lifecycle and writes logs to IndexedDB.
- `src/stores/useSyncStore.ts` - Stores background sync progress for UI.

### Data Flow
1. `syncWorkerManager.startSync(babyIds)` spawns the worker and sends `START_SYNC`.
2. Worker fetches chunks and posts `LOGS_FETCHED` + progress events.
3. Manager converts payloads to `LocalFeedLog` and calls `saveFeedLogs`.
4. Progress updates are pushed into `useSyncStore`.

### Code Pattern
```ts
this.worker = new Worker(
  new URL('../workers/sync-worker.ts', import.meta.url),
  { type: 'module' },
);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CHUNK_SIZE` | `100` | Logs fetched per request in the worker loop.
| `chunkDelayMs` | `100` | Delay between chunks to avoid server overload.

## Gotchas / Constraints

- **Abort behavior**: `STOP_SYNC` aborts via `AbortController`; partial progress is expected.
- **Feed-only status**: `sync-worker-manager` updates `feed_logs` sync status, not other entities.

## Testing Notes

- Trigger `startSync` with a known baby ID and confirm `LOGS_FETCHED` batches are stored.
- Call `stopSync()` mid-run and ensure the worker halts without errors.

## Related Systems

- `.readme/chunks/local-first.initial-sync-service.md` - Initial blocking sync vs background worker.
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync state UI.
