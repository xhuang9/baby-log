---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/providers/QueryProvider.tsx
---

# TanStack Query as Ephemeral Scheduler

## Purpose
Documents the TanStack Query setup configured as an **ephemeral network scheduler**, NOT a persistence layer. This is a critical architectural distinction in the local-first design.

## Key Deviations from Standard

Most TanStack Query tutorials show it as the primary data cache. This project uses it differently:

- **Dexie (IndexedDB) is the durable store**, not TanStack Query cache
- **TanStack Query schedules sync operations**, not data storage
- **NO `@tanstack/react-query-persist-client`** is used (deliberately omitted)
- **Short `gcTime` (5 min)** because data lives in Dexie, not React Query cache

## Configuration

### QueryClient Setup

```typescript
// src/providers/QueryProvider.tsx

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Short stale time - triggers sync checks frequently
      staleTime: 1000 * 5, // 5 seconds

      // Short gc time - data lives in Dexie, not in React Query cache
      gcTime: 1000 * 60 * 5, // 5 minutes

      // Auto-sync on focus/reconnect
      refetchOnWindowFocus: true,
      refetchOnReconnect: true,

      // Retry configuration for network errors
      retry: 3,
      retryDelay: attemptIndex => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 2,
      retryDelay: 1000,
    },
  },
});
```

### Configuration Rationale

| Option | Value | Reason |
|--------|-------|--------|
| `staleTime: 5s` | 5 seconds | Triggers sync checks frequently while app is active |
| `gcTime: 5min` | 5 minutes | Data lives in Dexie, so short GC is fine. Prevents memory bloat. |
| `refetchOnWindowFocus: true` | Enable | Flush outbox + pull sync when user returns to app |
| `refetchOnReconnect: true` | Enable | Flush outbox + pull sync when network restored |
| `retry: 3` | 3 attempts | Exponential backoff for transient network errors |

## What TanStack Query Does (Scheduler Role)

1. **Triggers Sync Operations**
   - On window focus → flush outbox + pull changes
   - On reconnect → flush outbox + pull changes
   - On interval (if configured) → pull changes

2. **Retry Logic**
   - Exponential backoff for failed sync attempts
   - Automatic retry on network restoration

3. **Loading States**
   - Provides `isLoading`, `isFetching` states for UI
   - Mutation states for optimistic updates

## What TanStack Query Does NOT Do

1. **NOT the Source of Truth**
   - Data lives in Dexie, not React Query cache
   - UI reads from Dexie via `useLiveQuery`, not `useQuery`

2. **NOT Persisted**
   - Cache cleared on page refresh (intentional)
   - Dexie persists data across sessions

3. **NOT Used for All Data Reads**
   - Only used for triggering sync operations
   - UI queries Dexie directly for instant reads

## Patterns

### Sync Trigger Pattern

```typescript
// Use TanStack Query to trigger periodic sync
const { data: syncStatus } = useQuery({
  queryKey: queryKeys.sync.version(babyId),
  queryFn: async () => {
    // 1. Flush outbox (send pending mutations)
    await flushOutbox();

    // 2. Pull changes from server
    const cursor = await getSyncCursor(babyId);
    const changes = await fetch(`/api/babies/${babyId}/sync?since=${cursor}`);

    // 3. Apply changes to Dexie
    await applyChangesToDexie(changes);

    return { lastSync: new Date() };
  },
  refetchInterval: 30000, // Pull every 30s while active
  refetchOnWindowFocus: true,
  refetchOnReconnect: true,
});
```

**Why**: TanStack Query handles scheduling, retry, and network awareness. Dexie handles storage.

### Mutation with Outbox Pattern

```typescript
const createFeedLog = useMutation({
  mutationFn: async (feedLog: LocalFeedLog) => {
    // 1. Write to Dexie immediately (optimistic update)
    await localDb.feedLogs.add(feedLog);

    // 2. Add to outbox for server sync
    await addToOutbox({
      mutationId: uuid(),
      entityType: 'feed_log',
      entityId: feedLog.id,
      op: 'create',
      payload: feedLog,
    });

    // 3. Trigger immediate outbox flush (if online)
    if (navigator.onLine) {
      await flushOutbox();
    }
  },
  onSuccess: () => {
    // Invalidate sync queries to trigger pull
    queryClient.invalidateQueries({ queryKey: queryKeys.sync.all });
  },
});
```

**Why**: Mutation writes to Dexie first (instant UI), then queues for server via outbox.

## SSR Singleton Pattern

```typescript
// Singleton for SSR - prevents creating new client on every render
let browserQueryClient: QueryClient | undefined;

function getQueryClient(): QueryClient {
  if (typeof window === 'undefined') {
    // Server: always make a new query client
    return makeQueryClient();
  }

  // Browser: reuse existing client
  if (!browserQueryClient) {
    browserQueryClient = makeQueryClient();
  }
  return browserQueryClient;
}
```

**Why**: Next.js App Router with React Server Components requires singleton in browser, fresh instance on server.

## Gotchas

### Don't Use `useQuery` for Data Reads
**Wrong**:
```typescript
// ❌ Don't read data from React Query cache
const { data: feedLogs } = useQuery({
  queryKey: ['feedLogs', babyId],
  queryFn: () => localDb.feedLogs.where('babyId').equals(babyId).toArray(),
});
```

**Right**:
```typescript
// ✅ Read directly from Dexie with liveQuery
const feedLogs = useLiveQuery(
  () => localDb.feedLogs.where('babyId').equals(babyId).toArray(),
  [babyId]
);
```

**Why**: `useLiveQuery` is reactive (updates when IndexedDB changes). `useQuery` requires manual invalidation.

### Don't Persist the Query Cache
**Wrong**:
```typescript
// ❌ Don't use persist-client plugin
import { persistQueryClient } from '@tanstack/react-query-persist-client';
```

**Right**:
```typescript
// ✅ Dexie is the persistence layer, not React Query
// No persistence plugins needed
```

**Why**: Mixing two persistence layers creates confusion and sync bugs.

### Cache GC is Aggressive (Intentional)
- Query cache clears after 5 minutes of inactivity
- This is **intentional** - data lives in Dexie
- If you need cached data, query Dexie, not React Query

## Related
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema as durable store
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation pattern
- `.readme/chunks/local-first.query-keys.md` - Type-safe query key factory
