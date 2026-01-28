---
last_verified_at: 2026-01-28T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - migrations/0012_fresh_speed.sql
  - src/actions/feedLogActions.ts
  - src/app/[locale]/api/sync/push/mutations/feed-log.ts
  - src/app/[locale]/api/sync/push/mutations/sleep-log.ts
  - src/app/[locale]/api/sync/push/mutations/nappy-log.ts
---

# UUID Migration for Log Entities

## Purpose

Migrate feed_log, sleep_log, and nappy_log primary keys from auto-increment serial IDs to client-generated UUIDs (text columns). This fixes a pre-existing bug where the server ignored client-generated IDs, causing ID mismatches during sync and local-first operations.

## The Pre-Existing Bug

**Problem**: In offline-first architectures, the client must generate IDs for mutations because the server may be unreachable. However, the original implementation ignored these client IDs:

- Client generates mutation with `id: crypto.randomUUID()`
- Server ignores the provided `id` and generates its own auto-increment ID
- Sync events recorded server-generated ID
- Client IndexedDB has different ID than server record
- Causes broken references and sync failures

**Solution**: Accept client-generated UUIDs as primary keys, making client and server IDs identical from the start.

## Implementation Details

### Schema Changes

All log tables changed primary key columns from `serial` to `text`:

```typescript
// Before
export const feedLogSchema = pgTable('feed_log', {
  id: serial('id').primaryKey(),  // Auto-increment
  // ...
});

// After
export const feedLogSchema = pgTable('feed_log', {
  id: text('id').primaryKey(),    // Client-generated UUID
  // ...
});
```

Applies to:
- `feed_log` - Feed/nursing logs
- `sleep_log` - Sleep logs
- `nappy_log` - Nappy change logs

### Database Migration

Migration `0012_fresh_speed.sql` applies the schema change:

```sql
ALTER TABLE "feed_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "nappy_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "sleep_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "sync_events" ALTER COLUMN "entity_id" SET DATA TYPE text;
```

**Important**: `sync_events.entity_id` also changed to `text` to support UUID references.

### Client-Side Generation

In `feedLogActions.ts` and similar mutation handlers, clients generate UUIDs using Node.js crypto:

```typescript
const feedLog = await db
  .insert(feedLogSchema)
  .values({
    id: crypto.randomUUID(),  // Generate UUID on client
    babyId: data.babyId,
    loggedByUserId: user.id,
    // ... other fields
  })
  .returning();
```

### Server-Side Acceptance

Mutation handlers now accept and use client-provided IDs:

```typescript
const [inserted] = await db
  .insert(feedLogSchema)
  .values({
    id: payload.id as string,    // Use client UUID from payload
    babyId,
    loggedByUserId: userId,
    // ... other fields
  })
  .returning();
```

Applied to `processFeedLogMutation()`, `processSleepLogMutation()`, `processNappyLogMutation()`.

## Benefits

- **Offline-first correctness**: Client and server IDs match immediately
- **Simplified sync**: No ID mapping layer needed
- **Consistent state**: IndexedDB reflects server record IDs exactly
- **Easier debugging**: IDs are human-readable UUIDs, not opaque numbers

## Gotchas

- **UUID collision risk**: Extremely low (2^128 space), acceptable for this application
- **Database indexing**: UUID indexes are slightly less efficient than numeric indexes, but acceptable for this scale
- **Backward compatibility**: Existing numeric IDs are preserved; migration only affects new records
- **Outbox replay**: Stored mutations still reference the original UUID payload, ensuring idempotent replays

## Related

- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation replay
- `.readme/chunks/database.schema-workflow.md` - Schema changes and migrations
- `.readme/chunks/local-first.delta-sync-api.md` - Sync API mutation handling
