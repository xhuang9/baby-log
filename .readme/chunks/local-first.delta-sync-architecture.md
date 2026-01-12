---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - src/app/[locale]/api/sync/pull/route.ts
  - src/app/[locale]/api/sync/push/route.ts
---

# Delta Sync Architecture

## Purpose
Documents the cursor-based delta sync system that efficiently synchronizes changes between server and client. Replaces periodic full fetches with incremental change tracking via the `sync_events` table.

## Key Deviations from Standard

Unlike typical full-fetch sync patterns:
- **Cursor-based pagination**: Pull only changes since last sync, not entire dataset
- **Append-only event log**: `sync_events` table records all CUD operations
- **Per-baby cursors**: Each baby tracks its own sync position independently
- **Bidirectional sync**: Push (outbox flush) and pull (delta changes) as separate operations
- **Conflict resolution via LWW**: Server timestamp wins when client update collides with newer server data

## Database Schema

### sync_events Table

```typescript
export const syncEventsSchema = pgTable('sync_events', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  entityType: text('entity_type').notNull(), // feed_log, sleep_log, nappy_log, baby
  entityId: integer('entity_id').notNull(), // ID of the entity being synced
  op: syncOpEnum('op').notNull(), // create, update, delete
  payload: text('payload'), // JSON string of entity data (for create/update)
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
}, t => [
  index('sync_events_baby_id_idx').on(t.babyId, t.id),
]);
```

**Why this design**:
- `id` is auto-incrementing cursor (monotonically increasing)
- `babyId` index enables efficient `WHERE babyId = X AND id > cursor` queries
- `payload` stores full entity JSON for create/update (null for delete)
- `op` enum distinguishes between create/update/delete operations
- Append-only: events never modified, only inserted

### Cursor Storage (Client)

```typescript
// In Dexie schema (src/lib/local-db/database.ts)
syncCursors: {
  babyId: number;    // Primary key
  cursor: number;    // Last sync_events.id seen
  updatedAt: Date;
}
```

**Why**:
- Persists across app restarts (survives offline periods)
- Per-baby isolation (multi-baby accounts sync independently)
- Single source of truth for "what have I synced"

## Architecture Flow

### Pull Sync (Delta Download)

```
Client                           Server
  |                                 |
  |-- GET /api/sync/pull?babyId=1&since=42&limit=100
  |                                 |
  |          <-- Read sync_events WHERE babyId = 1 AND id > 42
  |          <-- Order by id ASC, limit 101 (fetch +1 to check hasMore)
  |                                 |
  |<-- { changes: [...], nextCursor: 142, hasMore: false }
  |                                 |
  | Apply changes to Dexie
  | Update local cursor to 142
  |                                 |
```

**Process**:
1. Client reads local cursor for babyId (e.g., `42`)
2. Requests changes since cursor: `GET /api/sync/pull?babyId=1&since=42`
3. Server queries `sync_events` table: `WHERE babyId = 1 AND id > 42 ORDER BY id LIMIT 101`
4. Server returns up to 100 changes + `hasMore` flag (if 101 fetched)
5. Client applies each change to Dexie (upsert/delete)
6. Client updates cursor to highest `id` seen (`nextCursor`)
7. If `hasMore = true`, recursively fetch next batch

### Push Sync (Outbox Flush)

```
Client                           Server
  |                                 |
  | Read pending outbox entries
  |                                 |
  |-- POST /api/sync/push { mutations: [...] }
  |                                 |
  |          <-- For each mutation:
  |          <--   Validate access (babyAccess check)
  |          <--   Apply to Postgres (insert/update/delete)
  |          <--   Check LWW conflict (compare updatedAt)
  |          <--   Record sync_event
  |                                 |
  |<-- { results: [...], newCursor: 150 }
  |                                 |
  | For each result:
  |   - success: Mark outbox as synced
  |   - conflict: Apply serverData to Dexie, mark synced
  |   - error: Mark outbox as failed
  |                                 |
  | Update cursor to newCursor (150)
  | Clear synced outbox entries
  |                                 |
```

**Process**:
1. Client reads pending outbox entries (status = 'pending')
2. Batch mutations in single POST to `/api/sync/push`
3. Server processes each mutation:
   - Validates user has edit access to babyId
   - For **create**: Insert into entity table, record sync_event
   - For **update**: Check LWW (server `updatedAt` > client `updatedAt`), apply if client wins or return conflict
   - For **delete**: Delete entity, record sync_event
4. Server returns results array (success/conflict/error per mutation)
5. Client handles results:
   - **success**: Mark outbox entry as synced
   - **conflict**: Overwrite Dexie with `serverData` (server wins), mark synced
   - **error**: Mark outbox as failed with error message
6. Client updates cursor to `newCursor` (latest sync_event.id)
7. Client clears synced outbox entries

## Conflict Resolution: Last-Write-Wins (LWW)

### Update Conflict Check

```typescript
// Server: /api/sync/push route
const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
const serverUpdatedAt = existing.updatedAt;

// If server has newer data, return conflict
if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
  return {
    mutationId,
    status: 'conflict',
    serverData: serializeFeedLog(existing), // Return server's version
  };
}
```

**Client handling**:
```typescript
// Client: sync-service.ts flushOutbox()
if (result.status === 'conflict') {
  // LWW: server wins, update local with server data
  if (result.serverData) {
    await applyServerData(result.serverData);
  }
  await updateOutboxStatus(result.mutationId, 'synced');
}
```

**Why LWW**:
- Simple, predictable (no complex merge logic)
- Acceptable for baby tracking (single caregiver editing at a time is common)
- Prevents data corruption from stale client state
- Trade-off: Last writer discards previous changes (explicit design choice)

## Patterns

### Initial Sync (Bootstrap)

On first login or new baby access:
1. **Full snapshot**: Bootstrap API returns current state (user, babies, recent logs)
2. **Save to Dexie**: Populate local database
3. **Initialize cursor**: Set cursor to 0 (or latest sync_event.id from bootstrap)
4. **Start delta sync**: Subsequent syncs use cursor-based pull

### Periodic Sync (useSyncScheduler)

```typescript
// Automatic pull sync every 5 seconds (when online)
const { isSyncing, triggerSync } = useSyncScheduler({
  babyId: 1,
  enabled: true,
  syncInterval: 5000, // ms
});
```

**Triggers**:
- Every 5 seconds (interval)
- Window focus (user returns to app)
- Reconnect (network restored)
- Manual trigger (`triggerSync()`)

### Multi-Baby Sync

```typescript
// Sync all accessible babies
const { triggerSync } = useMultiBabySync({
  babyIds: [1, 2, 3],
  enabled: true,
});
```

**Behavior**:
- Single outbox flush (shared across babies)
- Per-baby pull sync (each baby has own cursor)
- Parallel pull requests for performance

## Gotchas

### Cursor Must Be Monotonically Increasing
**Wrong**:
```typescript
// ❌ Using timestamp as cursor - not guaranteed unique/sequential
const cursor = new Date().getTime();
```

**Right**:
```typescript
// ✅ Using auto-increment ID - guaranteed sequential
const cursor = syncEvent.id; // serial('id')
```

### Don't Delete sync_events
- **Append-only**: Never delete sync_events (archive if needed)
- **Retention**: Keep events for reasonable period (e.g., 90 days)
- **Compaction**: Optional advanced pattern (merge create+update+delete into single event)

### Handle Empty Cursor (First Sync)
```typescript
// Default to 0 if no cursor found
const cursor = await getSyncCursor(babyId) ?? 0;
```

### Recursive Pull Must Check hasMore
```typescript
// Prevent infinite loop if server bug
let safetyCounter = 0;
while (data.hasMore && safetyCounter++ < 100) {
  await pullChanges(babyId);
}
```

## Performance Characteristics

### Pull Sync
- **Small changes**: ~50-200ms for 100 events (depends on payload size)
- **Large backlog**: Batched in chunks of 100, recursive fetch until `hasMore = false`
- **Network efficient**: Only fetches changed entities, not entire table

### Push Sync
- **Batch operations**: Single HTTP request for all pending mutations
- **Transactional**: Each mutation is atomic (server DB transaction)
- **Idempotent retries**: Failed mutations can be replayed (outbox persists)

## Related
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox for offline mutations
- `.readme/chunks/local-first.conflict-resolution.md` - LWW strategy details
- `.readme/chunks/local-first.sync-status-tracking.md` - UI sync indicators
- `.readme/chunks/local-first.delta-sync-api.md` - API endpoint contracts
- `.readme/chunks/local-first.delta-sync-client.md` - Client-side sync service and hooks
