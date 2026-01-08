---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/lib/local-db.ts
---

# Dexie IndexedDB Schema

## Purpose
Defines the client-side database schema using Dexie.js for offline-first data storage. This is the **immediate read model** that the dashboard UI reads from for instant responsiveness.

## Key Deviations from Standard

Unlike typical React applications that rely solely on server API calls:
- **IndexedDB is the primary read source** for the UI (not server API)
- **Server updates are applied to IndexedDB** after successful mutations
- **All UI queries use `liveQuery`** from Dexie for reactive updates
- **Schema mirrors server Postgres schema** to enable seamless sync

## Schema Design

### Core Tables

```typescript
// src/lib/local-db.ts

class BabyLogDatabase extends Dexie {
  feedLogs!: EntityTable<LocalFeedLog, 'id'>;
  babies!: EntityTable<LocalBaby, 'id'>;
  babyAccess!: EntityTable<LocalBabyAccess, 'userId'>;
  syncMeta!: EntityTable<SyncMeta, 'babyId'>;
  outbox!: EntityTable<OutboxEntry, 'mutationId'>;
}
```

### Table Purposes

| Table | Purpose | Primary Key | Indexes |
|-------|---------|-------------|---------|
| `feedLogs` | Mirror of server feed_logs table | `id` (UUID) | `babyId`, `startedAt`, `createdAt` |
| `babies` | Mirror of server babies table | `id` (number) | - |
| `babyAccess` | Mirror of server baby_access table | `[userId+babyId]` | `userId`, `babyId` |
| `syncMeta` | Delta sync cursors per baby | `babyId` | - |
| `outbox` | Pending offline mutations | `mutationId` (UUID) | `status`, `createdAt`, `entityType` |

### Index Strategy

```typescript
this.version(1).stores({
  // Feed logs - indexed for queries by baby and time
  feedLogs: 'id, babyId, startedAt, createdAt',

  // Babies - simple id lookup
  babies: 'id',

  // Baby access - compound index for user+baby lookup
  babyAccess: '[userId+babyId], userId, babyId',

  // Sync metadata - one entry per baby
  syncMeta: 'babyId',

  // Outbox - for offline mutation replay
  outbox: 'mutationId, status, createdAt, entityType',
});
```

**Index Rationale**:
- `feedLogs` indexed by `babyId` and `startedAt` for efficient "recent feeds for baby X" queries
- `babyAccess` uses compound index `[userId+babyId]` for fast permission checks
- `outbox` indexed by `status` to quickly find `pending` entries for sync

## Type Mirroring

Types in `local-db.ts` mirror server schema with adjustments for client use:

```typescript
export type LocalFeedLog = {
  id: string;              // UUID - client-generated for idempotent creates
  babyId: number;
  loggedByUserId: number;
  method: FeedMethod;
  startedAt: Date;         // Date objects (not strings) for IndexedDB
  endedAt: Date | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: FeedSide | null;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
};
```

**Key Differences from Server Schema**:
- `id` is `string` (UUID) not auto-increment (enables client-generated IDs)
- Dates are `Date` objects (IndexedDB native) not ISO strings
- Nullable fields use `| null` explicitly

## Helper Functions

### Outbox Operations

```typescript
// Add mutation to outbox for later replay
await addToOutbox({
  mutationId: uuid(),
  entityType: 'feed_log',
  entityId: feedLog.id,
  op: 'create',
  payload: feedLog,
});

// Get pending mutations for sync
const pending = await getPendingOutboxEntries();

// Update status after sync attempt
await updateOutboxStatus(mutationId, 'synced');
```

### Sync Cursor Management

```typescript
// Get cursor for delta sync
const cursor = await getSyncCursor(babyId);

// Fetch changes since cursor from server
const changes = await fetch(`/api/babies/${babyId}/sync?since=${cursor}`);

// Update cursor after successful sync
await updateSyncCursor(babyId, newCursor);
```

## Patterns

### Client-Generated UUIDs
All new entities use client-generated UUIDs (not server auto-increment):
```typescript
import { v4 as uuid } from 'uuid';

const feedLog: LocalFeedLog = {
  id: uuid(), // Client generates UUID
  babyId: currentBaby.id,
  // ... other fields
};

await localDb.feedLogs.add(feedLog);
await addToOutbox({
  mutationId: uuid(),
  entityType: 'feed_log',
  entityId: feedLog.id,
  op: 'create',
  payload: feedLog,
});
```

**Why**: Enables idempotent replay. Server can use `INSERT ... ON CONFLICT (id) DO UPDATE` without creating duplicates.

### Reactive Queries with liveQuery

```typescript
import { useLiveQuery } from 'dexie-react-hooks';

// UI components read from Dexie, not server
const feedLogs = useLiveQuery(
  () => localDb.feedLogs
    .where('babyId').equals(babyId)
    .reverse()
    .sortBy('startedAt'),
  [babyId]
);
```

**Why**: Instant UI updates when IndexedDB changes (no server round-trip needed).

## Gotchas

### No Auto-Increment IDs
- **Don't** rely on server auto-increment for entity IDs
- **Do** use client-generated UUIDs for all new entities
- Server schema must accept UUID primary keys or have unique constraints

### Date Serialization
- IndexedDB stores `Date` objects natively
- When syncing to/from server, convert between `Date` ↔ ISO strings:
  ```typescript
  // Server → IndexedDB
  createdAt: new Date(serverData.created_at)

  // IndexedDB → Server
  created_at: feedLog.createdAt.toISOString()
  ```

### Schema Migrations
- Dexie uses version numbers: `this.version(2).stores({ ... })`
- Increment version when adding fields or tables
- Existing data persists across schema changes
- See Dexie docs for upgrade handlers

## Related
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation replay pattern
- `.readme/chunks/local-first.tanstack-query-setup.md` - Network scheduler using TanStack Query
- `.readme/chunks/local-first.conflict-resolution.md` - LWW conflict resolution strategy
