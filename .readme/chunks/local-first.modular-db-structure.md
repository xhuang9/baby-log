---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/index.ts
  - src/lib/local-db/types/
  - src/lib/local-db/helpers/
---

# Modular Local Database Structure

## Purpose
Documents the modular file organization of the local-first database (`src/lib/local-db/`). This structure separates types, database schema, and helper functions to improve maintainability and scalability as new log types are added.

## Directory Structure

```
src/lib/local-db/
├── index.ts                      # Public API exports
├── database.ts                   # Dexie class & schema
├── types/
│   ├── index.ts                  # Re-exports all types
│   ├── entities.ts               # User, Baby, BabyAccess, UIConfig
│   ├── logs.ts                   # FeedLog, SleepLog, NappyLog
│   ├── sync.ts                   # SyncStatus, SyncMeta
│   └── outbox.ts                 # OutboxEntry, mutation types
└── helpers/
    ├── index.ts                  # Re-exports all helpers
    ├── user.ts                   # saveLocalUser, getLocalUser
    ├── baby.ts                   # saveBabies, getBabiesForUser
    ├── feed-logs.ts              # saveFeedLogs, getFeedLogsForBaby
    ├── sleep-logs.ts             # saveSleepLogs, getSleepLogsForBaby
    ├── nappy-logs.ts             # saveNappyLogs, getNappyLogsForBaby
    ├── ui-config.ts              # getUIConfig, updateUIConfig
    ├── sync-status.ts            # updateSyncStatus, getAllSyncStatuses
    └── outbox.ts                 # addToOutbox, getPendingMutations
```

## Design Rationale

### Why Modular Structure?

**Before** (single file):
- 1000+ lines in `local-db.ts`
- Hard to navigate
- Merge conflicts when multiple features add log types

**After** (modular):
- Each concern in its own file
- Easy to add new log types (copy pattern from existing)
- Types and helpers co-located by domain

### File Responsibilities

| File Type | Purpose | Example |
|-----------|---------|---------|
| `types/*.ts` | TypeScript interfaces, no logic | `LocalFeedLog` type |
| `database.ts` | Dexie class, schema versions, indexes | `feedLogs: 'id, babyId, startedAt'` |
| `helpers/*.ts` | CRUD operations, query helpers | `getFeedLogsForBaby()` |
| `index.ts` | Public API surface, re-exports | `export * from './types'` |

## Database Schema (database.ts)

### Version History Pattern

```typescript
class BabyLogDatabase extends Dexie {
  constructor() {
    super('baby-log');

    // Version 1: Initial schema
    this.version(1).stores({
      feedLogs: 'id, babyId, startedAt',
      // ...
    });

    // Version 2: Add user tables
    this.version(2).stores({
      feedLogs: 'id, babyId, startedAt',  // Keep from v1
      users: 'id, clerkId',                // New in v2
      // ...
    });

    // Version 3: Add sleep/nappy logs, compound indexes
    this.version(3).stores({
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',  // Improved index
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]', // New
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]', // New
      // ...
    });
  }
}
```

**Critical Rule**: Never delete old versions. Users upgrading from v1 need migration path.

### Compound Index Pattern

All log tables use `[babyId+startedAt]` compound index:

```typescript
feedLogs: 'id, babyId, startedAt, [babyId+startedAt]'
sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]'
nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]'
```

**Why?**
- Most queries filter by `babyId` and sort by `startedAt`
- Compound index enables efficient queries: `WHERE babyId = X ORDER BY startedAt DESC`
- Single index covers both access patterns

## Type Organization (types/)

### Domain-Based Separation

**entities.ts** - Core data models:
```typescript
export type LocalUser = {
  id: number;
  clerkId: string;
  email: string | null;
  // ...
};

export type LocalBaby = {
  id: number;
  name: string;
  birthDate: Date | null;
  // ...
};
```

**logs.ts** - Activity logs:
```typescript
export type LocalFeedLog = {
  id: string;
  babyId: number;
  method: 'breast' | 'bottle';
  startedAt: Date;
  // ...
};

export type LocalSleepLog = {
  id: string;
  babyId: number;
  startedAt: Date;
  endedAt: Date | null;
  // ...
};
```

**sync.ts** - Sync metadata:
```typescript
export type SyncEntityType =
  | 'user'
  | 'babies'
  | 'baby_access'
  | 'feed_logs'
  | 'sleep_logs'
  | 'nappy_logs';

export type LocalSyncStatus = {
  entityType: SyncEntityType;
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  // ...
};
```

**outbox.ts** - Offline mutations:
```typescript
export type OutboxEntityType =
  | 'feed_log'
  | 'sleep_log'
  | 'baby';

export type OutboxEntry = {
  mutationId: string;
  entityType: OutboxEntityType;
  op: 'create' | 'update' | 'delete';
  // ...
};
```

## Helper Functions (helpers/)

### Pattern: One File Per Entity Type

Each helper file exports CRUD operations for one entity type:

**helpers/feed-logs.ts**:
```typescript
export async function saveFeedLogs(logs: LocalFeedLog[]): Promise<void> {
  await localDb.feedLogs.bulkPut(logs);
}

export async function getFeedLogsForBaby(
  babyId: number,
  limit = 10
): Promise<LocalFeedLog[]> {
  return localDb.feedLogs
    .where({ babyId })
    .reverse()
    .sortBy('startedAt')
    .then(logs => logs.slice(0, limit));
}

export async function getFeedLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date
): Promise<LocalFeedLog[]> {
  return localDb.feedLogs
    .where('[babyId+startedAt]')
    .between([babyId, startDate], [babyId, endDate], true, true)
    .toArray();
}
```

### Consistent Naming Convention

| Operation | Function Name | Example |
|-----------|---------------|---------|
| Insert/Upsert | `save<Entity>` | `saveFeedLogs(logs)` |
| Get by ID | `get<Entity>ById` | `getBabyById(id)` |
| Get for parent | `get<Entity>For<Parent>` | `getFeedLogsForBaby(babyId)` |
| Get by date range | `get<Entity>ByDateRange` | `getFeedLogsByDateRange(...)` |
| Delete | `delete<Entity>` | `deleteFeedLog(id)` |

## Adding a New Log Type

Follow this checklist when adding a new log type (e.g., `solidsLog`):

### 1. Add Type Definition

**types/logs.ts**:
```typescript
export type LocalSolidsLog = {
  id: string;
  babyId: number;
  loggedByUserId: number;
  startedAt: Date;
  foodType: string;
  amount: 'taste' | 'some' | 'full';
  reaction: 'loved' | 'neutral' | 'disliked' | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

### 2. Update Database Schema

**database.ts**:
```typescript
class BabyLogDatabase extends Dexie {
  solidsLogs!: EntityTable<LocalSolidsLog, 'id'>;  // Add property

  constructor() {
    super('baby-log');

    // Increment version
    this.version(4).stores({
      // Copy all existing tables
      feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      sleepLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      nappyLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      // Add new table with same index pattern
      solidsLogs: 'id, babyId, startedAt, [babyId+startedAt]',
      // ...
    });
  }
}
```

### 3. Create Helper File

**helpers/solids-logs.ts**:
```typescript
import type { LocalSolidsLog } from '../types';
import { localDb } from '../database';

export async function saveSolidsLogs(logs: LocalSolidsLog[]): Promise<void> {
  await localDb.solidsLogs.bulkPut(logs);
}

export async function getSolidsLogsForBaby(
  babyId: number,
  limit = 10
): Promise<LocalSolidsLog[]> {
  return localDb.solidsLogs
    .where({ babyId })
    .reverse()
    .sortBy('startedAt')
    .then(logs => logs.slice(0, limit));
}

export async function getSolidsLogsByDateRange(
  babyId: number,
  startDate: Date,
  endDate: Date
): Promise<LocalSolidsLog[]> {
  return localDb.solidsLogs
    .where('[babyId+startedAt]')
    .between([babyId, startDate], [babyId, endDate], true, true)
    .toArray();
}
```

### 4. Update Sync Types

**types/sync.ts**:
```typescript
export type SyncEntityType =
  | 'user'
  | 'babies'
  | 'baby_access'
  | 'feed_logs'
  | 'sleep_logs'
  | 'nappy_logs'
  | 'solids_logs';  // Add here
```

**types/outbox.ts**:
```typescript
export type OutboxEntityType =
  | 'feed_log'
  | 'sleep_log'
  | 'nappy_log'
  | 'solids_log'  // Add here (singular)
  | 'baby';
```

### 5. Export from Index Files

**types/index.ts**:
```typescript
export type { LocalSolidsLog } from './logs';
```

**helpers/index.ts**:
```typescript
export * from './solids-logs';
```

## Public API Surface (index.ts)

The `index.ts` file controls what consumers can import:

```typescript
// Database instance
export { localDb } from './database';

// Types
export * from './types';

// Helpers
export * from './helpers';
```

**Usage**:
```typescript
// ✅ Clean imports from single entry point
import {
  localDb,
  type LocalFeedLog,
  saveFeedLogs,
  getFeedLogsForBaby,
} from '@/lib/local-db';

// ❌ Don't import from internal files
import { localDb } from '@/lib/local-db/database';  // Internal
```

## Gotchas

### Dexie Version Migrations

**Problem**: Users on v2 upgrading to v3 need all intermediate schemas defined.

**Solution**: Never delete old version definitions. Always increment and copy.

```typescript
// ❌ Wrong: Deleted v1 and v2
this.version(3).stores({ /* only v3 */ });

// ✅ Correct: Keep all versions
this.version(1).stores({ /* v1 */ });
this.version(2).stores({ /* v2 */ });
this.version(3).stores({ /* v3 */ });
```

### Compound Index Order

Index order matters! `[babyId+startedAt]` is different from `[startedAt+babyId]`.

```typescript
// ✅ Correct: Filters by babyId first, then sorts by startedAt
.where('[babyId+startedAt]')
.between([babyId, startDate], [babyId, endDate])

// ❌ Wrong: Index doesn't match this query pattern
.where('[startedAt+babyId]')  // babyId is not first!
```

### Bulk Operations

Use `bulkPut()` instead of individual `put()` calls:

```typescript
// ❌ Slow: N transactions
for (const log of logs) {
  await localDb.feedLogs.put(log);
}

// ✅ Fast: Single transaction
await localDb.feedLogs.bulkPut(logs);
```

## Testing Considerations

### Mock Database for Tests

```typescript
// In test file
import Dexie from 'dexie';
import 'fake-indexeddb/auto';  // Polyfill for Node.js

describe('Feed Log Helpers', () => {
  beforeEach(async () => {
    await localDb.delete();  // Clear between tests
    await localDb.open();
  });

  it('should save and retrieve logs', async () => {
    await saveFeedLogs([mockLog]);
    const logs = await getFeedLogsForBaby(1);
    expect(logs).toHaveLength(1);
  });
});
```

## Related

- `.readme/chunks/local-first.dexie-schema.md` - Full schema documentation
- `.readme/chunks/local-first.initial-sync-service.md` - How data gets into IndexedDB
- `.readme/planning/01-state-management-sync.md` - Multi-log-type sync strategy
- `.readme/user/qa.md` - Dexie versioning documentation
