---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/lib/query-keys.ts
---

# Type-Safe Query Key Factory

## Purpose
Provides a centralized, type-safe query key factory for TanStack Query cache management. Follows hierarchical key structure for efficient cache invalidation.

## Key Deviations from Standard

Unlike ad-hoc query keys scattered throughout components:
- **Centralized in `src/lib/query-keys.ts`** - single source of truth
- **Hierarchical structure** - enables granular or broad invalidation
- **Factory functions** - prevents typos and ensures consistency
- **Type-safe** - TypeScript enforces correct key usage

## Query Key Structure

### Hierarchy Pattern

```
[domain, scope, ...params]
```

Examples:
```typescript
['sync']                           // All sync operations
['sync', 'version', babyId]        // Version check for specific baby
['feedLogs']                       // All feed log queries
['feedLogs', 'list', babyId]       // Feed list for specific baby
['feedLogs', 'detail', feedLogId]  // Single feed log detail
```

**Why Hierarchical**: Enables both targeted and broad invalidation:
```typescript
// Invalidate ALL feed logs
queryClient.invalidateQueries({ queryKey: queryKeys.feedLogs.all });

// Invalidate only feed lists (not details)
queryClient.invalidateQueries({ queryKey: queryKeys.feedLogs.lists() });

// Invalidate feed list for specific baby
queryClient.invalidateQueries({ queryKey: queryKeys.feedLogs.list(babyId) });
```

## Implementation

### Query Key Factory

```typescript
// src/lib/query-keys.ts

export const queryKeys = {
  sync: {
    all: ['sync'] as const,
    version: (babyId: number) => ['sync', 'version', babyId] as const,
    changes: (babyId: number, cursor: number) =>
      ['sync', 'changes', babyId, cursor] as const,
  },

  feedLogs: {
    all: ['feedLogs'] as const,
    lists: () => ['feedLogs', 'list'] as const,
    list: (babyId: number) => ['feedLogs', 'list', babyId] as const,
    listByDate: (babyId: number, date: string) =>
      ['feedLogs', 'list', babyId, date] as const,
    details: () => ['feedLogs', 'detail'] as const,
    detail: (feedLogId: string) => ['feedLogs', 'detail', feedLogId] as const,
    latest: (babyId: number) => ['feedLogs', 'latest', babyId] as const,
  },

  // ... other domains
} as const;
```

### Type Helper

```typescript
/** Extract query key type from a query key factory function */
export type QueryKeyOf<T extends (...args: never[]) => readonly unknown[]>
  = ReturnType<T>;
```

Usage:
```typescript
type FeedListKey = QueryKeyOf<typeof queryKeys.feedLogs.list>;
// Type: readonly ["feedLogs", "list", number]
```

## Patterns

### Basic Usage

```typescript
import { queryKeys } from '@/lib/query-keys';

// In a component
const { data } = useQuery({
  queryKey: queryKeys.feedLogs.list(babyId),
  queryFn: async () => {
    // Sync operation (not data read - data comes from Dexie)
    await pullFeedLogsFromServer(babyId);
  },
});
```

### Invalidation Strategies

**Invalidate Everything for a Domain**:
```typescript
// After creating a new feed log
queryClient.invalidateQueries({
  queryKey: queryKeys.feedLogs.all
});
```

**Invalidate Specific Scope**:
```typescript
// After updating a baby's feed logs
queryClient.invalidateQueries({
  queryKey: queryKeys.feedLogs.list(babyId)
});
```

**Invalidate Multiple Domains**:
```typescript
// After switching babies
queryClient.invalidateQueries({
  queryKey: queryKeys.feedLogs.all
});
queryClient.invalidateQueries({
  queryKey: queryKeys.sync.all
});
```

### Mutation with Targeted Invalidation

```typescript
const createFeedLog = useMutation({
  mutationFn: async (feedLog: LocalFeedLog) => {
    // Write to Dexie + outbox
    await localDb.feedLogs.add(feedLog);
    await addToOutbox({ /* ... */ });
  },
  onSuccess: (_, variables) => {
    // Invalidate only this baby's feed list
    queryClient.invalidateQueries({
      queryKey: queryKeys.feedLogs.list(variables.babyId)
    });

    // Trigger sync
    queryClient.invalidateQueries({
      queryKey: queryKeys.sync.version(variables.babyId)
    });
  },
});
```

## Domain Organization

### Sync Domain
```typescript
sync: {
  all: ['sync'] as const,
  version: (babyId: number) => ['sync', 'version', babyId] as const,
  changes: (babyId: number, cursor: number) =>
    ['sync', 'changes', babyId, cursor] as const,
}
```

**Purpose**: Sync operations (version checks, delta pulls)

### Feed Logs Domain
```typescript
feedLogs: {
  all: ['feedLogs'] as const,
  lists: () => ['feedLogs', 'list'] as const,
  list: (babyId: number) => ['feedLogs', 'list', babyId] as const,
  listByDate: (babyId: number, date: string) =>
    ['feedLogs', 'list', babyId, date] as const,
  details: () => ['feedLogs', 'detail'] as const,
  detail: (feedLogId: string) => ['feedLogs', 'detail', feedLogId] as const,
  latest: (babyId: number) => ['feedLogs', 'latest', babyId] as const,
}
```

**Purpose**: Feed log queries (list, detail, latest feed)

### Outbox Domain
```typescript
outbox: {
  all: ['outbox'] as const,
  pendingCount: () => ['outbox', 'pending', 'count'] as const,
  pending: () => ['outbox', 'pending'] as const,
}
```

**Purpose**: Outbox mutation tracking (pending count, pending entries)

## Gotchas

### Always Use `as const`
**Wrong**:
```typescript
// ❌ Type is string[], loses literal types
version: (babyId: number) => ['sync', 'version', babyId]
```

**Right**:
```typescript
// ✅ Type is readonly ["sync", "version", number]
version: (babyId: number) => ['sync', 'version', babyId] as const
```

**Why**: TanStack Query relies on stable key references for caching.

### Don't Inline Query Keys
**Wrong**:
```typescript
// ❌ Easy to introduce typos and inconsistencies
useQuery({
  queryKey: ['feed-logs', 'list', babyId],
  // ...
});
```

**Right**:
```typescript
// ✅ Centralized, type-safe, consistent
useQuery({
  queryKey: queryKeys.feedLogs.list(babyId),
  // ...
});
```

### Invalidation Matches Prefix
```typescript
// queryKey: ['feedLogs', 'list', 123]
// queryKey: ['feedLogs', 'list', 456]
// queryKey: ['feedLogs', 'detail', 'abc']

// Invalidates ALL above (prefix match)
invalidateQueries({ queryKey: ['feedLogs'] });

// Invalidates only first two (prefix match)
invalidateQueries({ queryKey: ['feedLogs', 'list'] });

// Invalidates only first one (exact match)
invalidateQueries({ queryKey: ['feedLogs', 'list', 123] });
```

## Related
- `.readme/chunks/local-first.tanstack-query-setup.md` - TanStack Query configuration
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation pattern
