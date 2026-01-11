---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/workers/sync-worker.ts
  - src/services/sync-worker-manager.ts
  - src/stores/useSyncStore.ts
---

# Background Sync Worker

## Purpose
Fetches historical data (logs older than 7 days) in a Web Worker to avoid blocking the main thread. Enables progressive loading of complete log history while keeping the UI responsive.

## Key Files

| File | Purpose |
|------|---------|
| `src/workers/sync-worker.ts` | Web Worker implementation |
| `src/services/sync-worker-manager.ts` | Main thread manager/coordinator |
| `src/stores/useSyncStore.ts` | Sync progress state |

## Architecture

### Main Thread vs Worker Thread

```
┌─────────────────────────────────────────────────────────────┐
│ Main Thread                                                  │
│                                                              │
│  ┌──────────────────┐        ┌────────────────────┐        │
│  │ React Component  │───────▶│ SyncWorkerManager  │        │
│  │ (useSyncOnLogin) │        │                    │        │
│  └──────────────────┘        └────────┬───────────┘        │
│                                       │                     │
│                                       │ postMessage()       │
│                                       ▼                     │
│                              ┌────────────────────┐         │
│                              │   IndexedDB        │         │
│                              │   (Dexie)          │         │
│                              └────────────────────┘         │
└──────────────────────────────────┼───────────────────────────┘
                                   │ Message passing
┌──────────────────────────────────▼───────────────────────────┐
│ Worker Thread                                                 │
│                                                               │
│  ┌────────────────────────────────────────────────┐          │
│  │ sync-worker.ts                                 │          │
│  │  - Fetch logs from API in chunks              │          │
│  │  - Send logs back to main thread              │          │
│  │  - Progress reporting                         │          │
│  └────────────────────────────────────────────────┘          │
│                            │                                  │
│                            ▼                                  │
│                   ┌────────────────┐                          │
│                   │ Fetch API      │                          │
│                   │ /api/sync/logs │                          │
│                   └────────────────┘                          │
└───────────────────────────────────────────────────────────────┘
```

### Why Web Worker?

**Problem**: Fetching thousands of historical logs blocks the main thread
- UI freezes during large data fetches
- Poor user experience during initial setup

**Solution**: Offload network operations to worker
- Main thread stays responsive
- User can interact with app while sync runs
- Progress indicator shows background work

## Message Protocol

### Commands (Main → Worker)

```typescript
type SyncWorkerCommand =
  | { type: 'START_SYNC'; babyIds: number[] }
  | { type: 'STOP_SYNC' };
```

### Events (Worker → Main)

```typescript
type SyncWorkerEvent =
  | { type: 'SYNC_STARTED'; totalBabies: number }
  | { type: 'BABY_SYNC_STARTED'; babyId: number }
  | { type: 'BABY_SYNC_PROGRESS'; babyId: number; fetched: number; total: number }
  | { type: 'BABY_SYNC_COMPLETE'; babyId: number; logCount: number }
  | { type: 'BABY_SYNC_ERROR'; babyId: number; error: string }
  | { type: 'LOGS_FETCHED'; babyId: number; logs: FeedLog[] }
  | { type: 'SYNC_COMPLETE'; totalLogs: number }
  | { type: 'SYNC_ERROR'; error: string };
```

## Usage Pattern

### Starting Background Sync

```typescript
import { syncWorkerManager } from '@/services/sync-worker-manager';
import { useSyncStore } from '@/stores/useSyncStore';

function MyComponent() {
  const setBackgroundProgress = useSyncStore(s => s.setBackgroundProgress);

  useEffect(() => {
    // Start sync after initial sync completes
    const babyIds = [1, 2, 3];
    syncWorkerManager.startSync(babyIds, (progress) => {
      setBackgroundProgress(progress);
    });

    // Cleanup on unmount
    return () => {
      syncWorkerManager.terminate();
    };
  }, []);
}
```

### Monitoring Progress

```typescript
import { useSyncStore } from '@/stores/useSyncStore';

function SyncIndicator() {
  const progress = useSyncStore(s => s.backgroundSync);

  if (progress.status === 'idle') return null;

  return (
    <div>
      Syncing baby {progress.currentBabyId}...
      {progress.completedBabies} / {progress.totalBabies} babies
      {progress.totalLogs} logs synced
    </div>
  );
}
```

## Chunked Fetching Strategy

### API Endpoint

```typescript
GET /api/sync/logs?babyId=1&before=1234567890&limit=100

Response:
{
  logs: FeedLog[],
  nextCursor: number | null,  // Timestamp-based cursor
  hasMore: boolean
}
```

### Chunk Size
- **Default**: 100 logs per request
- **Rationale**: Balance between network overhead and memory usage
- **Delay**: 100ms between chunks to avoid server overload

### Cursor-Based Pagination

```typescript
// Worker loop
let cursor: number | null = null;
while (hasMore) {
  const result = await fetchLogsChunk(babyId, cursor, 100, signal);

  // Send logs to main thread
  globalThis.postMessage({
    type: 'LOGS_FETCHED',
    babyId,
    logs: result.logs,
  });

  cursor = result.nextCursor;
  hasMore = result.hasMore;

  await new Promise(resolve => setTimeout(resolve, 100));
}
```

## IndexedDB Access Pattern

### Why Main Thread Handles Writes

**Problem**: Dexie doesn't work reliably in Web Workers
- Requires SharedWorker or complex setup
- IndexedDB transactions across contexts are tricky

**Solution**: Worker fetches, main thread writes
1. Worker fetches logs from API
2. Worker sends logs to main thread via `postMessage`
3. Main thread calls `saveFeedLogs()` (Dexie operation)

```typescript
// In sync-worker-manager.ts
private async handleWorkerMessage(message: WorkerMessage) {
  switch (message.type) {
    case 'LOGS_FETCHED':
      await this.storeLogs(message.logs);  // Dexie write
      break;
  }
}
```

## Worker Lifecycle Management

### Initialization

```typescript
class SyncWorkerManager {
  private worker: Worker | null = null;

  private initWorker(): Worker {
    if (this.worker) return this.worker;

    this.worker = new Worker(
      new URL('../workers/sync-worker.ts', import.meta.url),
      { type: 'module' }
    );

    this.worker.onmessage = (event) => {
      this.handleWorkerMessage(event.data);
    };

    return this.worker;
  }
}
```

### Termination

**When to terminate:**
- User logs out
- Component unmounts (cleanup)
- Sync completes or errors

```typescript
syncWorkerManager.terminate();  // Kills worker, cleans state
```

## Sync Progress State

### SyncProgress Type

```typescript
type SyncProgress = {
  status: 'idle' | 'syncing' | 'complete' | 'error';
  currentBabyId: number | null;
  totalBabies: number;
  completedBabies: number;
  totalLogs: number;
  error: string | null;
};
```

### Stored in Zustand

```typescript
const useSyncStore = create<SyncStore>((set) => ({
  backgroundSync: {
    status: 'idle',
    currentBabyId: null,
    totalBabies: 0,
    completedBabies: 0,
    totalLogs: 0,
    error: null,
  },
  setBackgroundProgress: (progress) => {
    set({
      backgroundSync: progress,
      isBackgroundSyncRunning: progress.status === 'syncing',
    });
  },
}));
```

## Error Handling

### Network Errors

```typescript
// Worker continues to next baby on error
try {
  await syncBabyLogs(babyId, signal);
} catch (error) {
  globalThis.postMessage({
    type: 'BABY_SYNC_ERROR',
    babyId,
    error: error.message,
  });
  // Continue with next baby instead of failing entire sync
}
```

### Abort Handling

```typescript
// Worker respects abort signal
const abortController = new AbortController();

// User navigates away or logs out
syncWorkerManager.stopSync();  // Signals worker to abort

// In worker
while (hasMore && !signal.aborted) {
  // Fetch next chunk
}
```

## Performance Characteristics

### Memory Usage
- Worker fetches 100 logs at a time (~5KB)
- Main thread writes to IndexedDB immediately
- No large in-memory accumulation

### Network Usage
- ~5KB per chunk
- 100ms delay between chunks = ~50KB/s
- Throttled to avoid mobile data concerns

### IndexedDB Write Performance
- Bulk insert: ~10ms per 100 logs
- Uses compound index `[babyId+startedAt]` for fast queries

## Multi-Baby Sync

### Sequential Processing

```typescript
// Sync babies one at a time
for (const babyId of babyIds) {
  await syncBabyLogs(babyId, signal);
  // Progress: completedBabies++
}
```

**Why sequential?**
- Simpler error handling
- Predictable progress reporting
- Avoids overwhelming server with parallel requests

## Gotchas

### Worker Scope
- No `window`, `document`, or DOM access
- Use `globalThis` instead of `window`
- `fetch` API is available

### Module Workers
```typescript
// ✅ Correct: type: 'module'
new Worker(new URL('./worker.ts', import.meta.url), { type: 'module' });

// ❌ Wrong: Classic workers don't support import
new Worker('./worker.ts');
```

### Message Serialization
- Only structured-cloneable data can be sent
- `Date` objects are serialized as ISO strings
- Functions cannot be passed

### AbortController
- Must create new controller per sync run
- Signal cannot be reused after abort
- Worker checks `signal.aborted` in loop

## Future Enhancements

### Priority-Based Sync
- Sync default baby first
- Then recently accessed babies
- Then archived babies

### Resume on Reconnect
- Track last synced cursor per baby
- Resume from cursor instead of re-fetching

### Delta Sync
- Only fetch logs changed since last sync
- Requires `updatedAt` cursor support

## Related

- `.readme/chunks/local-first.initial-sync-service.md` - Initial sync (7-day window)
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema
- `.readme/planning/01-state-management-sync.md` - Overall sync strategy
