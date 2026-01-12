---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/services/sync-service.ts
  - src/hooks/useSyncScheduler.ts
---

# Delta Sync Client Service and Hooks

## Purpose
Documents the client-side sync service and React hooks for bidirectional delta synchronization. Handles automatic polling, outbox flushing, and conflict resolution.

## Sync Service (src/services/sync-service.ts)

### Purpose
Low-level service for pull/push operations. Used by hooks and manual sync triggers.

### pullChanges(babyId)

Pull changes from server since last cursor and apply to Dexie.

**Function signature**:
```typescript
async function pullChanges(babyId: number): Promise<SyncResult>

type SyncResult = {
  success: boolean;
  error?: string;
  changesApplied?: number;
};
```

**Process**:
1. Read local cursor: `await getSyncCursor(babyId)`
2. Fetch from API: `GET /api/sync/pull?babyId=${babyId}&since=${cursor}`
3. Apply each change: `await applyChange(change)`
4. Update cursor: `await updateSyncCursor(babyId, data.nextCursor)`
5. If `hasMore = true`, recursively fetch next batch

**Example usage**:
```typescript
import { pullChanges } from '@/services/sync-service';

const result = await pullChanges(1);
if (result.success) {
  console.log(`Applied ${result.changesApplied} changes`);
} else {
  console.error(result.error);
}
```

### flushOutbox()

Push pending mutations from outbox to server.

**Function signature**:
```typescript
async function flushOutbox(): Promise<SyncResult>
```

**Process**:
1. Read pending outbox entries: `await getPendingOutboxEntries()`
2. Mark as syncing: `await updateOutboxStatus(id, 'syncing')`
3. Batch POST to API: `POST /api/sync/push { mutations: [...] }`
4. Handle results:
   - **success**: Mark as synced, clear from outbox
   - **conflict**: Apply `serverData` to Dexie (LWW), mark as synced
   - **error**: Mark as failed with error message
5. Update cursor: `await updateSyncCursor(babyId, newCursor)`
6. Clear synced entries: `await clearSyncedOutboxEntries()`

**Example usage**:
```typescript
import { flushOutbox } from '@/services/sync-service';

const result = await flushOutbox();
if (result.success) {
  console.log(`Synced ${result.changesApplied} mutations`);
}
```

### applyServerData(serverData)

Apply server data to Dexie (used for conflict resolution).

**Function signature**:
```typescript
async function applyServerData(serverData: Record<string, unknown>): Promise<void>
```

**Behavior**:
- Detects entity type from data structure (e.g., `method` field → feed_log)
- Converts dates from ISO strings to Date objects
- Upserts to Dexie (overwrites local data)

**Example**:
```typescript
// When push returns conflict
if (result.status === 'conflict') {
  await applyServerData(result.serverData); // Server wins
}
```

### performFullSync(babyIds)

Perform full bidirectional sync for multiple babies.

**Function signature**:
```typescript
async function performFullSync(babyIds: number[]): Promise<SyncResult>
```

**Process**:
1. Flush outbox first: `await flushOutbox()`
2. Pull for each baby: `for (babyId of babyIds) await pullChanges(babyId)`
3. Return total changes applied

**Example usage**:
```typescript
import { performFullSync } from '@/services/sync-service';

// Sync all accessible babies
const result = await performFullSync([1, 2, 3]);
```

## Sync Scheduler Hook (src/hooks/useSyncScheduler.ts)

### useSyncScheduler

Manages automatic synchronization for a single baby.

**Function signature**:
```typescript
function useSyncScheduler({
  babyId: number,
  enabled?: boolean,      // Default: true
  syncInterval?: number,  // Default: 5000ms
}): SyncSchedulerState

type SyncSchedulerState = {
  isSyncing: boolean;
  error: string | null;
  lastSyncChanges: number;
  lastSyncAt: Date | null;
  triggerSync: () => Promise<void>;
};
```

**Behavior**:
- **Automatic pull**: Every `syncInterval` ms (default 5s)
- **Flush on reconnect**: Automatically flushes outbox when online
- **Window focus**: Triggers sync when tab regains focus
- **Manual trigger**: Exposes `triggerSync()` for pull-to-refresh

**Example usage**:
```typescript
'use client';

import { useSyncScheduler } from '@/hooks/useSyncScheduler';

export function BabyFeedPage({ babyId }: { babyId: number }) {
  const { isSyncing, error, lastSyncAt, triggerSync } = useSyncScheduler({
    babyId,
    enabled: true,
    syncInterval: 5000, // Pull every 5 seconds
  });

  return (
    <div>
      {isSyncing && <span>Syncing...</span>}
      {error && <span>Error: {error}</span>}
      {lastSyncAt && <span>Last sync: {lastSyncAt.toLocaleTimeString()}</span>}
      <button onClick={triggerSync}>Refresh</button>
      {/* Feed log list renders from Dexie via liveQuery */}
    </div>
  );
}
```

**Implementation details**:

#### Automatic Pull (TanStack Query)
```typescript
const { isFetching: isPulling } = useQuery({
  queryKey: queryKeys.sync.changes(babyId, cursor),
  queryFn: async () => {
    const result = await pullChanges(babyId);
    if (result.success) {
      // Invalidate cursor query to refetch updated cursor
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.version(babyId) });
      // Invalidate feed logs to refresh UI
      queryClient.invalidateQueries({ queryKey: queryKeys.feedLogs.list(babyId) });
    }
    return result;
  },
  enabled: enabled && isOnline,
  refetchInterval: syncInterval,
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
  refetchIntervalInBackground: false, // Don't sync when tab hidden
});
```

#### Outbox Flush on Reconnect
```typescript
useOnlineStatusChange(
  useCallback(async () => {
    if (enabled) {
      await flushOutbox();
      // Trigger pull to get updates after push
      queryClient.invalidateQueries({ queryKey: queryKeys.sync.changes(babyId, cursor) });
    }
  }, [enabled, babyId, cursor, queryClient]),
);
```

#### Initial Sync with Delay
```typescript
useEffect(() => {
  if (!enabled || !isOnline) return;

  const timeoutId = setTimeout(async () => {
    await flushOutbox(); // Flush any pending mutations on mount
  }, 1000); // Wait 1 second after mount

  return () => clearTimeout(timeoutId);
}, [enabled, isOnline]);
```

### useMultiBabySync

Sync scheduler for multiple babies (used in home page or baby switcher).

**Function signature**:
```typescript
function useMultiBabySync({
  babyIds: number[],
  enabled?: boolean,
}): {
  triggerSync: () => Promise<void>;
  isSyncing: boolean;
}
```

**Behavior**:
- **Single outbox flush**: Shared across all babies
- **Per-baby pull**: Each baby pulls changes independently
- **Manual trigger only**: No automatic polling (use `triggerSync()`)
- **Flush on reconnect**: Automatically flushes when online

**Example usage**:
```typescript
'use client';

import { useMultiBabySync } from '@/hooks/useSyncScheduler';

export function HomePage({ babies }: { babies: Baby[] }) {
  const { triggerSync, isSyncing } = useMultiBabySync({
    babyIds: babies.map(b => b.id),
    enabled: true,
  });

  return (
    <div>
      <button onClick={triggerSync} disabled={isSyncing}>
        {isSyncing ? 'Syncing...' : 'Sync All'}
      </button>
      {/* Baby cards */}
    </div>
  );
}
```

**Implementation**:
```typescript
const triggerSync = useCallback(async () => {
  if (!isOnline || isSyncingRef.current) return;

  isSyncingRef.current = true;
  setIsSyncing(true);

  try {
    // Flush outbox first
    await flushOutbox();

    // Pull changes for each baby
    for (const babyId of babyIds) {
      await pullChanges(babyId);
    }

    // Invalidate queries
    queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
    queryClient.invalidateQueries({ queryKey: queryKeys.feedLogs.all });
  } finally {
    isSyncingRef.current = false;
    setIsSyncing(false);
  }
}, [isOnline, babyIds, queryClient]);
```

## Configuration

### Sync Interval
```typescript
const SYNC_INTERVAL_MS = 5000; // Pull every 5 seconds
```

**Why 5 seconds**:
- Balance between freshness and network usage
- Acceptable latency for multi-device collaboration
- Adjust per use case (e.g., 2s for real-time, 10s for battery saving)

### Initial Sync Delay
```typescript
const INITIAL_SYNC_DELAY_MS = 1000; // Wait 1 second before first sync
```

**Why 1 second delay**:
- Allows UI to render before triggering network requests
- Prevents flash of loading state on page load
- Gives time for bootstrap data to populate Dexie

## Patterns

### Pull-to-Refresh
```typescript
const { triggerSync, isSyncing } = useSyncScheduler({ babyId: 1 });

<PullToRefresh onRefresh={triggerSync} refreshing={isSyncing}>
  <FeedLogList babyId={1} />
</PullToRefresh>
```

### Sync Indicator
```typescript
const { isSyncing, lastSyncAt } = useSyncScheduler({ babyId: 1 });

<div className="sync-status">
  {isSyncing ? (
    <Spinner />
  ) : (
    <span>Last synced: {formatDistanceToNow(lastSyncAt)}</span>
  )}
</div>
```

### Conditional Sync (e.g., only sync active baby)
```typescript
const [activeBabyId, setActiveBabyId] = useState(1);

useSyncScheduler({
  babyId: activeBabyId,
  enabled: true, // Only syncs active baby
});
```

## Gotchas

### Don't Call pullChanges/flushOutbox in Render
**Wrong**:
```typescript
// ❌ Causes infinite render loop
function MyComponent() {
  pullChanges(1); // Called on every render
  return <div>...</div>;
}
```

**Right**:
```typescript
// ✅ Use hook for automatic sync
function MyComponent() {
  useSyncScheduler({ babyId: 1 }); // Handles sync lifecycle
  return <div>...</div>;
}
```

### Multiple useSyncScheduler Instances
- Each instance runs independent polling
- Multiple babies → multiple concurrent polls (intentional)
- Use `useMultiBabySync` if you need single trigger for all babies

### Offline Behavior
- `useSyncScheduler` automatically disables when offline
- Outbox still accumulates mutations (replayed when online)
- `useOnlineStatusChange` triggers flush immediately on reconnect

### Cursor Invalidation
- After pull, **must** invalidate cursor query: `queryClient.invalidateQueries({ queryKey: queryKeys.sync.version(babyId) })`
- After push, server returns `newCursor` - update local cursor
- Forgetting to update cursor causes duplicate pulls or missed changes

## Performance Considerations

### Polling Overhead
- 5-second interval = ~12 requests/minute per baby
- Multi-baby sync: N babies × 12 req/min
- Mitigation: Use `useMultiBabySync` for home page (manual trigger only)

### Background Tab Sync
```typescript
refetchIntervalInBackground: false, // Pauses sync when tab hidden
```

**Why**:
- Saves battery on mobile
- Reduces server load from inactive tabs
- Resumes immediately on window focus

### Batch Pull Optimization
- Server limits to 500 changes per request
- Recursive pull for large backlogs (e.g., after days offline)
- Each batch updates Dexie incrementally (no blocking UI)

## Related
- `.readme/chunks/local-first.delta-sync-architecture.md` - Overall sync design
- `.readme/chunks/local-first.delta-sync-api.md` - API endpoint contracts
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox for offline mutations
- `.readme/chunks/local-first.conflict-resolution.md` - LWW strategy
