---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/components/SyncProvider.tsx
  - src/hooks/useSyncScheduler.ts
  - src/services/sync-service.ts
  - src/app/[locale]/api/sync/pull/route.ts
---

# Background Sync Pull Architecture

## Purpose

Documents the background polling system that pulls changes from other caregivers. In a multi-user baby tracking app, caregivers need to see each other's logged activities without manual refresh.

## Push vs Pull: Two Sync Directions

The sync system has two complementary mechanisms:

| Direction | Trigger | Purpose |
|-----------|---------|---------|
| **Push** (Outbox) | User mutation | Send local changes to server immediately |
| **Pull** (Polling) | Timer interval | Fetch changes from other users periodically |

### Why Both Are Needed

- **Push-only problem:** User A logs a feed, User B never sees it (no incoming sync)
- **Pull-only problem:** User's own changes delayed until next poll (poor UX)

**Solution:** Push for immediate outbound sync, pull for periodic inbound sync.

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                        SyncProvider                         │
│                                                             │
│  ┌─────────────────┐    ┌──────────────────────────────┐   │
│  │   App Content   │    │  BackgroundSyncScheduler     │   │
│  │   (children)    │    │  (invisible, no UI)          │   │
│  └─────────────────┘    │                              │   │
│                         │  useSyncScheduler({          │   │
│                         │    babyId: activeBaby.id,    │   │
│                         │    enabled: true             │   │
│                         │  })                          │   │
│                         └──────────────────────────────┘   │
└─────────────────────────────────────────────────────────────┘
                                    │
                                    │ Every 5 seconds
                                    ▼
                         ┌──────────────────────┐
                         │  GET /api/sync/pull  │
                         │  ?babyId=123         │
                         │  &cursor=1705678900  │
                         └──────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Apply changes to    │
                         │  IndexedDB           │
                         └──────────────────────┘
                                    │
                                    ▼
                         ┌──────────────────────┐
                         │  Invalidate queries  │
                         │  (UI refreshes)      │
                         └──────────────────────┘
```

## Implementation

### SyncProvider Component

The `SyncProvider` renders children plus an invisible sync scheduler:

```typescript
// src/components/SyncProvider.tsx
export function SyncProvider({ children }: SyncProviderProps) {
  // ... initialization logic ...

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
  const activeBaby = useBabyStore((state) => state.activeBaby);

  // Only sync if we have an active baby
  useSyncScheduler({
    babyId: activeBaby?.babyId ?? 0,
    enabled: !!activeBaby?.babyId,
  });

  return null;  // No UI, just side effects
}
```

### useSyncScheduler Hook

The hook manages periodic polling using TanStack Query's `refetchInterval`:

```typescript
// src/hooks/useSyncScheduler.ts
const SYNC_INTERVAL_MS = 5000; // Pull sync every 5 seconds

export function useSyncScheduler({
  babyId,
  enabled = true,
  syncInterval = SYNC_INTERVAL_MS,
}: UseSyncSchedulerOptions): SyncSchedulerState {
  const queryClient = useQueryClient();
  const isOnline = useOnlineStatus();

  // Main sync query - pulls changes on interval
  const { isFetching: isPulling } = useQuery({
    queryKey: queryKeys.sync.changes(babyId, cursor),
    queryFn: async () => {
      const result = await pullChanges(babyId);

      if (result.success) {
        // Invalidate queries to refresh UI with new data
        queryClient.invalidateQueries({
          queryKey: queryKeys.feedLogs.list(babyId),
        });
      }

      return result;
    },
    enabled: enabled && isOnline,
    refetchInterval: syncInterval,           // Poll every 5 seconds
    refetchOnWindowFocus: true,              // Sync when tab becomes active
    refetchOnReconnect: true,                // Sync when coming back online
    refetchIntervalInBackground: false,      // Don't waste bandwidth in hidden tabs
  });

  // ... rest of hook
}
```

### Key Configuration Options

| Option | Value | Purpose |
|--------|-------|---------|
| `refetchInterval` | 5000ms | How often to poll |
| `refetchOnWindowFocus` | true | Catch up when user returns to tab |
| `refetchOnReconnect` | true | Catch up after network restoration |
| `refetchIntervalInBackground` | false | Don't poll hidden tabs |
| `staleTime` | 2500ms | Consider data fresh for half interval |

## The Pull Flow

### 1. Pull Request

```typescript
// src/services/sync-service.ts
export async function pullChanges(babyId: number) {
  const cursor = await getSyncCursor(babyId);

  const response = await fetch(
    `/api/sync/pull?babyId=${babyId}&cursor=${cursor}`
  );

  const data = await response.json();
  // { changes: [...], newCursor: 1705679000 }

  // Apply changes to IndexedDB
  await applyChangesToIndexedDB(data.changes);

  // Update cursor for next pull
  await setSyncCursor(babyId, data.newCursor);

  return { success: true, changesApplied: data.changes.length };
}
```

### 2. Server Response

The server returns all sync_events since the cursor:

```json
{
  "changes": [
    {
      "entityType": "feed_log",
      "entityId": "abc123",
      "op": "create",
      "payload": { "id": "abc123", "type": "breast", ... },
      "version": 1705678950
    }
  ],
  "newCursor": 1705679000
}
```

### 3. IndexedDB Update

Changes are applied to the appropriate tables:

```typescript
async function applyChangesToIndexedDB(changes: SyncEvent[]) {
  for (const change of changes) {
    switch (change.entityType) {
      case 'feed_log':
        if (change.op === 'create' || change.op === 'update') {
          await saveFeedLogs([change.payload]);
        } else if (change.op === 'delete') {
          await localDb.feedLogs.delete(change.entityId);
        }
        break;
      // ... other entity types
    }
  }
}
```

### 4. UI Refresh

Query invalidation triggers re-render:

```typescript
queryClient.invalidateQueries({
  queryKey: queryKeys.feedLogs.list(babyId),
});
```

Components using `useLiveQuery` on IndexedDB refresh automatically.

## When Sync Happens

| Event | Push (Outbox) | Pull (Polling) |
|-------|---------------|----------------|
| User logs activity | Yes (immediate) | No |
| Timer tick (5s) | No | Yes |
| Tab becomes visible | Yes (flush) | Yes |
| Network reconnects | Yes (flush) | Yes |
| Initial app load | Yes (flush pending) | Yes (after init) |

## Error Handling

### Access Revocation

If pull returns 403, the hook handles access revocation:

```typescript
if (result.errorType === 'access_revoked') {
  // Remove revoked baby from store
  const updatedBabies = allBabies.filter(b => b.babyId !== result.revokedBabyId);
  setAllBabies(updatedBabies);

  // Switch to another baby if needed
  if (activeBaby?.babyId === result.revokedBabyId) {
    const nextBaby = updatedBabies[0] ?? null;
    if (nextBaby) setActiveBaby(nextBaby);
  }

  toast.error('Access Revoked', {
    description: 'Your access to this baby has been removed.',
  });
}
```

### Network Errors

TanStack Query handles retries automatically. Failed syncs don't block UI.

## Performance Considerations

### 1. Only Sync Active Baby

The scheduler only pulls for the currently active baby:

```typescript
useSyncScheduler({
  babyId: activeBaby?.babyId ?? 0,
  enabled: !!activeBaby?.babyId,  // Disabled if no active baby
});
```

### 2. Cursor-Based Delta Sync

Only fetches changes since last sync, not full data:

```
First sync:  cursor=0 → fetch all
Next sync:   cursor=1705678900 → fetch only new changes
```

### 3. Background Tab Optimization

Polling stops when tab is hidden:

```typescript
refetchIntervalInBackground: false
```

## Multi-Baby Sync

For syncing all babies (not just active), use `useMultiBabySync`:

```typescript
const { triggerSync } = useMultiBabySync({
  babyIds: allBabies.map(b => b.babyId),
  enabled: true,
});

// Manual sync all babies
await triggerSync();
```

This is used for explicit refresh actions, not automatic polling.

## Related

- `.readme/chunks/local-first.delta-sync-architecture.md` - Full sync system design
- `.readme/chunks/local-first.delta-sync-client.md` - Client sync service details
- `.readme/chunks/local-first.outbox-pattern.md` - Push sync via outbox
- `.readme/chunks/local-first.access-revocation-handling.md` - 403 handling
