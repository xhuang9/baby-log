---
last_verified_at: 2026-01-29T00:00:00Z
source_paths:
  - src/hooks/useAllActivityLogs.ts
  - src/hooks/useFeedLogs.ts
  - src/hooks/useSleepLogs.ts
  - src/hooks/useNappyLogs.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx
  - src/lib/local-db/helpers/feed-logs.ts
  - src/lib/local-db/helpers/sleep-logs.ts
  - src/lib/local-db/helpers/nappy-logs.ts
---

# Dexie Query Patterns: Correct Sorting and Future Log Filtering

## Purpose

Document two critical bug fixes in Dexie query patterns that affect all activity log queries: correct chronological sorting and defensive filtering of future-dated logs from UI display.

## Key Deviations from Standard

1. **Manual sorting required**: `.reverse().sortBy()` does NOT sort chronologically; must use `.toArray()` + manual sort
2. **Future log filtering**: "Latest" queries must exclude `startedAt > now` to prevent future-dated entries from blocking actual past logs

## Why These Patterns Exist

### Sort Order Bug (Dexie Anti-Pattern)

**Issue:** `.reverse().sortBy('startedAt')` sorts by UUID string order, not chronologically.

```typescript
// WRONG - sorts by UUID, not date
const logs = await localDb.feedLogs
  .where('babyId')
  .equals(babyId)
  .reverse()
  .sortBy('startedAt');

// Result: [uuid-999, uuid-888, uuid-777] (string order)
// NOT: [2026-01-29 10:00, 2026-01-29 09:00, 2026-01-29 08:00] (chronological)
```

**Root Cause:** Dexie's `.sortBy()` returns results in index order (by primary key), then reverses the array. It does NOT re-sort by the specified field.

**Solution:** Use `.toArray()` followed by manual JavaScript sort:

```typescript
// CORRECT - explicit JavaScript sort by Date.getTime()
const logs = await localDb.feedLogs
  .where('babyId')
  .equals(babyId)
  .toArray();

// Sort newest to oldest
logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
```

### Future Log Filtering (UX Defense)

**Issue:** Users sometimes accidentally set feed/sleep/nappy times in the future. Without filtering, these future logs block actual past logs from displaying in "latest" tiles.

```typescript
// Without filtering:
// Overview shows: "Bottle (1/1/2050 10:00 AM)" instead of "Breast (1/29/2026 9:30 AM)"

// With filtering:
// Overview shows: "Breast (1/29/2026 9:30 AM)" ✓
// Future log still in database, synced, but not shown in "latest" queries
```

**Solution:** Add `startedAt <= now` filter in all "latest" queries:

```typescript
const now = new Date();
const logs = await localDb.feedLogs
  .where('babyId')
  .equals(babyId)
  .filter(log => log.startedAt <= now)  // Exclude future logs
  .toArray();

// Sort newest to oldest (most recent first)
logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

return logs[0] ?? null; // Safe to access index 0
```

## Implementation Pattern

### 1. Helper Functions Pattern

All activity log helpers follow this pattern:

**File:** `src/lib/local-db/helpers/feed-logs.ts`

```typescript
export async function getLatestFeedLog(babyId: number): Promise<LocalFeedLog | undefined> {
  const now = new Date();
  const logs = await localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .filter(log => log.startedAt <= now)  // Exclude future logs
    .toArray();

  // Sort newest first
  logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return logs[0];
}

export async function getAllFeedLogsByBaby(babyId: number): Promise<LocalFeedLog[]> {
  const logs = await localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .toArray();

  // Sort newest first
  logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return logs;
}

export async function getAllActivityLogs(babyId: number): Promise<ActivityLog[]> {
  const now = new Date();

  // Query all log types in parallel
  const [feedLogs, sleepLogs, nappyLogs] = await Promise.all([
    localDb.feedLogs.where('babyId').equals(babyId).toArray(),
    localDb.sleepLogs.where('babyId').equals(babyId).toArray(),
    localDb.nappyLogs.where('babyId').equals(babyId).toArray(),
  ]);

  // Combine and exclude future logs
  const allLogs = [
    ...feedLogs.map(log => ({ ...log, type: 'feed' as const })),
    ...sleepLogs.map(log => ({ ...log, type: 'sleep' as const })),
    ...nappyLogs.map(log => ({ ...log, type: 'nappy' as const })),
  ].filter(log => log.startedAt <= now);

  // Sort newest first
  allLogs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());

  return allLogs;
}
```

### 2. Hook Usage Pattern

Hooks use the helper functions via `useLiveQuery`:

**File:** `src/hooks/useFeedLogs.ts`

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { getLatestFeedLog, getAllFeedLogsByBaby } from '@/lib/local-db/helpers/feed-logs';

export function useLatestFeedLog(babyId: number) {
  return useLiveQuery(
    () => getLatestFeedLog(babyId),
    [babyId]
  );
}

export function useAllFeedLogs(babyId: number) {
  return useLiveQuery(
    () => getAllFeedLogsByBaby(babyId),
    [babyId]
  );
}
```

### 3. Component Usage Pattern

Components use hooks and don't need to worry about sorting:

**File:** `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx`

```typescript
export function OverviewContent({ babyId }: Props) {
  const latestFeed = useLatestFeedLog(babyId);
  const latestSleep = useLatestSleepLog(babyId);
  const latestNappy = useLatestNappyLog(babyId);

  return (
    <div>
      {/* Tiles show latest logs, always correctly sorted */}
      {latestFeed && <FeedTile log={latestFeed} />}
      {latestSleep && <SleepTile log={latestSleep} />}
      {latestNappy && <NappyTile log={latestNappy} />}
    </div>
  );
}
```

## Gotchas / Constraints

### 1. Manual Sort Performance

**Issue:** Sorting large arrays in JavaScript can be slow for thousands of logs.

**Mitigation:**
- Queries already filter by `babyId` (compound index)
- "Latest" queries only fetch one record (after sort)
- "All logs" queries are paginated or time-windowed (recent 7 days)
- Manual sort is acceptable for typical log counts (10-100 per baby)

### 2. useLiveQuery Re-runs

**Issue:** `useLiveQuery` re-runs the entire query function when dependencies change, including the sort.

**Expected Behavior:**
- Query dependencies: `[babyId]` only
- Re-runs when: `babyId` changes
- Does NOT re-run on every keystroke (safe)

```typescript
useLiveQuery(
  () => getLatestFeedLog(babyId),
  [babyId]  // Only re-run when babyId changes
);
```

### 3. Time-Dependent Filtering

**Issue:** `filter(log => log.startedAt <= now)` uses `now` from query execution time, not component render time.

**Expected Behavior:**
- A log added at 2026-01-29 23:59:59 may appear for a few seconds before filtering on next refresh
- User time zone must match server time zone (set in browser or use UTC consistently)
- For instant feedback, consider refetching after user action

### 4. Compound Index Still Works

**Issue:** Does `.toArray()` bypass the compound index?

**No:** Dexie still uses the index to narrow results:
```typescript
.where('babyId').equals(babyId)  // Uses index
.toArray()                        // Fetches matching records
```

The manual sort happens on the filtered result set, not the entire table.

## Related Systems

- `.readme/chunks/local-first.dexie-schema.md` - Compound index design (`[babyId+startedAt]`)
- `.readme/chunks/feed-logging.activity-logs-page.md` - Log list queries with grouping
- `.readme/chunks/local-first.query-keys.md` - TanStack Query key management
