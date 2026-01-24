# State Management & Initial Sync

**Priority:** High
**Dependencies:** None
**Estimated Scope:** Large

---

## Overview

Implement comprehensive state management for babies and user data. When a user logs in, sync everything into IndexedDB via Dexie.js to enable offline-first experience. Architecture supports multiple log types (feed, sleep, nappy, etc.) with easy extensibility.

---

## Log Types Architecture

### Current & Planned Log Types

| Log Type | Table Name | Status | Key Fields |
|----------|------------|--------|------------|
| Feed | `feed_log` / `feedLogs` | ✅ Implemented | method, amountMl, durationMinutes, endSide |
| Sleep | `sleep_log` / `sleepLogs` | ✅ Schema added | startedAt, endedAt, durationMinutes |
| Nappy | `nappy_log` / `nappyLogs` | ✅ Schema added | type (wee/poo/mixed/dry), notes |
| Solids | `solids_log` / `solidsLogs` | 🔜 Planned | foodType, amount, reaction |
| Bath | `bath_log` / `bathLogs` | 🔜 Planned | durationMinutes, notes |
| Activity | `activity_log` / `activityLogs` | 🔜 Planned | type, description |

### Base Log Fields

All log types extend a base with common fields, then add type-specific attributes:

```typescript
// Shared fields for sync and querying
type BaseLog = {
  id: string;              // UUID - client-generated
  babyId: number;          // FK to babies
  loggedByUserId: number;  // FK to user who logged
  startedAt: Date;         // When the activity started
  notes: string | null;    // Optional notes
  createdAt: Date;
  updatedAt: Date;
};

// Each log type extends with its own fields
type LocalFeedLog = BaseLog & {
  method: 'breast' | 'bottle';
  endedAt: Date | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: 'left' | 'right' | null;
};

type LocalSleepLog = BaseLog & {
  endedAt: Date | null;     // null = ongoing
  durationMinutes: number | null;
};

type LocalNappyLog = BaseLog & {
  type: 'wee' | 'poo' | 'mixed' | 'dry' | null;
  // No endedAt - instant event
};

type LocalSolidsLog = BaseLog & {
  foodType: string;
  amount: 'taste' | 'some' | 'full';
  reaction: 'loved' | 'neutral' | 'disliked' | null;
  // No endedAt - instant event
};
```

Note: Some logs have `endedAt` (feed, sleep - duration-based), others don't (nappy, solids - instant events).

### Adding a New Log Type (Checklist)

When adding a new log type, see `.readme/user/03-adding-new-log-types.md` for detailed steps.

Summary:
1. **Schema.ts**: Add table definition
2. **local-db.ts**: Add type, table, helpers
3. **Sync types**: Add to `SyncEntityType` and `OutboxEntityType`
4. **initial-sync.ts**: Add to sync data types
5. **Bootstrap API**: Include in response
6. **UI**: Create hook and components

---

## Requirements

### Data to Sync on Login

| Data Type | Priority | Loading Strategy |
|-----------|----------|------------------|
| User profile & preferences | Critical | Immediate (blocking) |
| Active baby basic info | Critical | Immediate (blocking) |
| All accessible babies list | High | Immediate (blocking) |
| UI configuration (theme, hand mode) | High | Immediate (blocking) |
| Recent logs - ALL types (last 7 days) | High | Immediate (non-blocking) |
| Historical logs - ALL types | Medium | Background (Web Worker) |

### Sync Flow

```
User Login
    │
    ▼
[1] Fetch critical data (user, babies, UI config)
    │ Store in IndexedDB + Zustand
    ▼
[2] Fetch recent logs for ALL log types (last 7 days)
    │ Store in IndexedDB
    │ Parallel fetch: feedLogs, sleepLogs, nappyLogs, etc.
    ▼
[3] Render UI immediately from local state
    │
    ▼
[4] Background: Spawn Web Worker for historical data
    │ Progressive sync per log type
    │ Prioritize by usage frequency
    ▼
[5] UI reactively updates via useLiveQuery
```

---

## Dexie Schema Design

### Multi-Log Type Schema

```typescript
class BabyLogDatabase extends Dexie {
  // Core data tables
  feedLogs!: EntityTable<LocalFeedLog, 'id'>;
  sleepLogs!: EntityTable<LocalSleepLog, 'id'>;
  nappyLogs!: EntityTable<LocalNappyLog, 'id'>;
  solidsLogs!: EntityTable<LocalSolidsLog, 'id'>;  // Future

  // Shared indexes for all log types:
  // - 'id' (primary key)
  // - 'babyId' (for filtering by baby)
  // - 'startedAt' (for date range queries)
  // - '[babyId+startedAt]' (compound for efficient baby+date queries)

  constructor() {
    super('baby-log');

    this.version(3).stores({
      // Core log tables - consistent index pattern
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]',

      // User & config
      users: 'id, clerkId',
      babies: 'id, ownerUserId',
      babyAccess: '[userId+babyId], userId, babyId',
      uiConfig: 'userId',

      // Sync management
      syncMeta: 'babyId',
      syncStatus: 'entityType',
      outbox: 'mutationId, status, createdAt, entityType',
    });
  }
}
```

### Sync Status Per Log Type

```typescript
type SyncEntityType =
  | 'user'
  | 'babies'
  | 'baby_access'
  | 'ui_config'
  // Log types - add new ones here
  | 'feed_logs'
  | 'sleep_logs'
  | 'nappy_logs'
  | 'solids_logs';
```

---

## Implementation Tasks

### Phase 1: Add Sleep Logs to Dexie

- [ ] Add `LocalSleepLog` type to `local-db.ts`
- [ ] Add `sleepLogs` table to Dexie class
- [ ] Increment Dexie version to 3
- [ ] Add `'sleep_logs'` to `SyncEntityType`
- [ ] Add `'sleep_log'` to `OutboxEntityType`
- [ ] Add helpers: `saveSleepLogs()`, `getSleepLogsForBaby()`, `getSleepLogsByDateRange()`

### Phase 2: Initial Sync Service

- [ ] Update `InitialSyncData` to include all log types
- [ ] Create `fetchRecentLogs()` that fetches all log types in parallel
- [ ] Update `storeInitialSyncData()` to save all log types
- [ ] Add sync status tracking per log type

### Phase 3: Background Sync Worker

- [ ] Create `src/workers/sync-worker.ts` (Web Worker)
- [ ] Implement log type registry for worker:
  ```typescript
  const LOG_TYPES = ['feed_logs', 'sleep_logs', 'nappy_logs'] as const;
  ```
- [ ] Implement chunked historical log fetching per type
- [ ] Add progress reporting per log type
- [ ] Handle worker termination on logout

### Phase 4: Zustand Store Updates

- [ ] Update `useBabyStore` to sync with IndexedDB
- [ ] Create `useUserStore` sync with IndexedDB
- [ ] Create `useSyncStore` for tracking sync status per log type
- [ ] Implement hydration from IndexedDB on app load

### Phase 5: React Hooks

- [ ] Create `useFeedLogs(babyId, dateRange?)` with `useLiveQuery`
- [ ] Create `useSleepLogs(babyId, dateRange?)` with `useLiveQuery`
- [ ] Create `useSyncOnLogin` hook
- [ ] Add sync status indicator in UI
- [ ] (Add hooks for new log types as they're implemented)

---

## API Endpoints

### Initial Sync (All Log Types)

```
GET /api/bootstrap
  Returns: {
    user,
    babies,
    babyAccess,
    uiConfig,
    recentLogs: {
      feedLogs: [...],    // Last 7 days
      sleepLogs: [...],   // Last 7 days
      nappyLogs: [...],  // Last 7 days (when implemented)
    }
  }
```

### Historical Sync (Per Log Type)

```
GET /api/sync/logs/:logType?babyId=X&before=cursor&limit=100
  logType: 'feed' | 'sleep' | 'nappy' | ...
  Returns: { logs, nextCursor, hasMore }
```

### Log Type Registry (Optional - for dynamic types)

```
GET /api/sync/log-types
  Returns: ['feed', 'sleep', 'nappy', 'solids', 'bath', 'activity']
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Zustand Stores (Runtime State)                         │
│  - useBabyStore (activeBaby, allBabies)                 │
│  - useUserStore (user profile)                          │
│  - useSyncStore (sync status per log type)              │
└─────────────────┬───────────────────────────────────────┘
                  │ hydrate on load, persist on change
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Dexie (IndexedDB) - Durable Local Store                │
│  ├── users, babies, babyAccess                          │
│  ├── feedLogs ──────────┐                               │
│  ├── sleepLogs ─────────┼── All use consistent         │
│  ├── nappyLogs ────────┤   (babyId, startedAt) index  │
│  ├── solidsLogs ────────┘                               │
│  └── uiConfig, syncMeta, syncStatus, outbox             │
└─────────────────┬───────────────────────────────────────┘
                  │ sync via API
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API → Neon Postgres                            │
│  - feed_log, sleep_log, nappy_log tables               │
│  - All use consistent (baby_id, started_at) index       │
└─────────────────────────────────────────────────────────┘
```

---

## Outbox for Offline Mutations

All log types use the same outbox pattern:

```typescript
type OutboxEntityType =
  | 'feed_log'
  | 'sleep_log'
  | 'nappy_log'  // Add new types here
  | 'baby';

type OutboxEntry = {
  mutationId: string;
  entityType: OutboxEntityType;  // Determines which API endpoint
  entityId: string;
  op: 'create' | 'update' | 'delete';
  payload: unknown;
  createdAt: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
  lastAttemptAt: Date | null;
  errorMessage: string | null;
};
```

### Outbox Flush Strategy

```
On reconnect:
1. Group pending entries by entityType
2. Batch API calls per type (e.g., POST /api/feed-logs/batch)
3. Mark as synced or failed
4. Retry failed with exponential backoff
```

---

## Timeline View (Cross-Log Query)

For showing a unified timeline of all activities:

```typescript
// Get all logs for a baby in a date range
async function getTimelineForBaby(
  babyId: number,
  startDate: Date,
  endDate: Date
): Promise<TimelineEntry[]> {
  const [feedLogs, sleepLogs, nappyLogs] = await Promise.all([
    getFeedLogsByDateRange(babyId, startDate, endDate),
    getSleepLogsByDateRange(babyId, startDate, endDate),
    getNappyLogsByDateRange(babyId, startDate, endDate),
  ]);

  return [
    ...feedLogs.map(log => ({ type: 'feed', ...log })),
    ...sleepLogs.map(log => ({ type: 'sleep', ...log })),
    ...nappyLogs.map(log => ({ type: 'nappy', ...log })),
  ].sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
}
```

---

## Success Criteria

- [ ] User sees data immediately after login (from IndexedDB)
- [ ] Feed and sleep logs sync correctly
- [ ] Adding new log type follows documented checklist
- [ ] Historical logs load in background without UI jank
- [ ] Sync status visible per log type
- [ ] App works offline after initial sync
- [ ] Web Worker doesn't block main thread
- [ ] Timeline view shows all log types unified
- [ ] Outbox handles all log types
