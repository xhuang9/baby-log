---
last_verified_at: 2026-01-28T00:00:00Z
source_paths:
  - src/app/[locale]/api/sync/pull/route.ts
  - src/models/Schema.ts
---

# Sync Pagination: ID-Based Cursor vs. Timestamp-Based

## Purpose

Describes the pagination strategy for sync_events query in the delta sync API (`GET /api/sync/pull`). After the UUID migration, pagination uses the auto-increment `sync_events.id` column (not log entity IDs) to ensure correct cursor behavior.

## Pagination Strategy: ID-Based Cursor

### Why NOT Timestamp-Based?

Initial consideration was using `startedAt` timestamps for pagination:
- **Pro**: Timestamp semantics are explicit ("give me events since 5 minutes ago")
- **Con**: Timestamps are not unique (multiple events created in same millisecond)
- **Con**: Requires tie-breaking logic for exact cursor position
- **Con**: Less efficient for large databases

### ID-Based Cursor (Chosen)

The API uses `sync_events.id` (auto-increment) as the pagination cursor:

```sql
-- Get changes after cursor (ID-based)
SELECT * FROM sync_events
WHERE baby_id = $1 AND id > $2  -- $2 is the "since" cursor
ORDER BY id
LIMIT $3 + 1;
```

**Why this works**:
- `sync_events.id` is guaranteed unique and monotonically increasing
- No tie-breaking needed
- Single column cursor is efficient
- Works correctly across all log types (feed, sleep, nappy)

### Key Implementation Details

From `src/app/[locale]/api/sync/pull/route.ts`:

```typescript
const sinceCursor = sinceParam ? Number.parseInt(sinceParam, 10) : 0;

// Build query conditions
const conditions = [eq(syncEventsSchema.babyId, babyId)];
if (sinceCursor > 0) {
  conditions.push(gt(syncEventsSchema.id, sinceCursor));  // ID-based, not timestamp
}

// Fetch with limit + 1 to detect hasMore
const changes = await db
  .select({ /* fields */ })
  .from(syncEventsSchema)
  .where(and(...conditions))
  .orderBy(syncEventsSchema.id)
  .limit(limit + 1);

// Get next cursor from last returned ID
const nextCursor = resultChanges.length > 0
  ? resultChanges[resultChanges.length - 1]?.id ?? sinceCursor
  : sinceCursor;
```

## Cursor Lifecycle

1. **Initial Pull**: Client calls `/api/sync/pull?babyId=42` (no `since`)
   - Server returns first 100 sync_events, last ID is 500
   - Response includes `nextCursor: 500`

2. **Client Storage**: Client stores cursor in IndexedDB: `{ babyId: 42, lastSyncCursor: 500 }`

3. **Next Pull**: Client calls `/api/sync/pull?babyId=42&since=500`
   - Server returns events where `id > 500`
   - Returns 100 more changes, last ID is 612
   - Response includes `nextCursor: 612`

4. **Repeat**: Client advances cursor indefinitely

## Implications After UUID Migration

### Log Entity IDs vs. Sync Event IDs

**Before migration**: Log entity IDs were numeric serial values.
- `feed_log.id: 1, 2, 3, ...`
- `sync_events.id: 1, 2, 3, ...` (same sequence)
- Potential confusion between the two

**After migration**: Log entity IDs are UUIDs, sync event IDs still numeric.
- `feed_log.id: "550e8400-e29b-41d4-a716-446655440000"` (UUID)
- `sync_events.id: 1, 2, 3, ...` (still auto-increment)
- `sync_events.entity_id: "550e8400..."` (UUID, matches feed_log.id)

**Key point**: Pagination cursor is always `sync_events.id`, never `feed_log.id`.

## Handling Edge Cases

### Multiple Changes in Single Request

If client misses multiple changes, cursor jump is safe:

```
Missed changes: sync_events.id 100, 101, 102
Client has cursor: 99
Next pull: since=99 returns 100, 101, 102, ...
```

### Duplicate Mutations

Same mutation can appear in sync_events multiple times (if edited):

```
sync_events.id = 50  -> feed_log id=abc op=create
sync_events.id = 51  -> feed_log id=abc op=update
```

Client applies both in order, LWW conflict resolution ensures correctness.

## Performance Notes

- **Index**: `sync_events_baby_id_idx` on `baby_id` enables efficient scans
- **Scan strategy**: Linear scan through `sync_events` by `id` (highly sequential)
- **Scalability**: Works well up to millions of events per baby
- **Memory**: Limit of 500 events per request prevents memory overload

## Related

- `.readme/chunks/local-first.delta-sync-api.md` - Full API contract
- `.readme/chunks/database.uuid-migration.md` - UUID changes to log tables
- `.readme/chunks/local-first.conflict-resolution.md` - Handling duplicate/update events
