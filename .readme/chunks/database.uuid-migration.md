---
last_verified_at: 2026-02-02T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - migrations/0012_fresh_speed.sql
  - migrations/0017_parched_eternity.sql
  - src/actions/feedLogActions.ts
  - src/app/[locale]/api/sync/push/mutations/feed-log.ts
  - src/app/[locale]/api/sync/push/mutations/sleep-log.ts
  - src/app/[locale]/api/sync/push/mutations/nappy-log.ts
  - src/app/[locale]/api/sync/push/mutations/solids-log.ts
  - src/app/[locale]/api/sync/push/mutations/food-types.ts
---

# UUID Migration for Log Entities

## Purpose

Migrate feed_log, sleep_log, nappy_log, solids_log, and food_types primary keys from text to native PostgreSQL `uuid` type. This provides better validation, storage efficiency (16 bytes vs ~36 bytes), and type-safe constraints at the database level.

**Timeline**:
1. **Migration 0012** (2026-01): Convert from auto-increment serial → text UUIDs (client-generated)
2. **Migration 0017** (2026-02): Convert from text → native PostgreSQL uuid type

## The Pre-Existing Bug

**Problem**: In offline-first architectures, the client must generate IDs for mutations because the server may be unreachable. However, the original implementation ignored these client IDs:

- Client generates mutation with `id: crypto.randomUUID()`
- Server ignores the provided `id` and generates its own auto-increment ID
- Sync events recorded server-generated ID
- Client IndexedDB has different ID than server record
- Causes broken references and sync failures

**Solution**: Accept client-generated UUIDs as primary keys, making client and server IDs identical from the start.

## Implementation Details

### Schema Changes (Migration 0017)

All log tables changed primary key columns from `text` to native `uuid`:

```typescript
// Before (Migration 0012)
export const feedLogSchema = pgTable('feed_log', {
  id: text('id').primaryKey(),    // Client-generated UUID (text type)
  // ...
});

// After (Migration 0017)
export const feedLogSchema = pgTable('feed_log', {
  id: uuid('id').primaryKey(),    // Native PostgreSQL uuid type
  // ...
});
```

Applies to:
- `feed_log` - Feed/nursing logs
- `sleep_log` - Sleep logs
- `nappy_log` - Nappy change logs
- `solids_log` - Solids/food introduction logs
- `food_types` - User-defined food type library

### Database Migration

**Migration 0012** converts serial → text:
```sql
ALTER TABLE "feed_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "nappy_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "sleep_log" ALTER COLUMN "id" SET DATA TYPE text;
ALTER TABLE "sync_events" ALTER COLUMN "entity_id" SET DATA TYPE text;
```

**Migration 0017** converts text → native uuid:
```sql
-- Delete legacy data with invalid UUID format (pre-migration cleanup)
DELETE FROM "feed_log" WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM "nappy_log" WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM "sleep_log" WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';
DELETE FROM "solids_log" WHERE id !~ '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$';

-- Perform type conversion with explicit casting
ALTER TABLE "feed_log" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "feed_log" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;
ALTER TABLE "nappy_log" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "nappy_log" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;
ALTER TABLE "sleep_log" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "sleep_log" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;
ALTER TABLE "solids_log" ALTER COLUMN "id" DROP DEFAULT;
ALTER TABLE "solids_log" ALTER COLUMN "id" SET DATA TYPE uuid USING id::uuid;
```

**Important notes**:
- Migration 0017 also creates the `food_types` table with native `uuid` primary key
- `sync_events.entity_id` remains as `text` to support mixed types (integer baby IDs + UUID log IDs)
- `solids_log.food_type_ids` remains as `text[]` (Drizzle limitation for UUID arrays)

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

### From Migration 0012 (text UUIDs)
- **Offline-first correctness**: Client and server IDs match immediately
- **Simplified sync**: No ID mapping layer needed
- **Consistent state**: IndexedDB reflects server record IDs exactly
- **Easier debugging**: IDs are human-readable UUIDs, not opaque numbers

### From Migration 0017 (native uuid type)
- **Storage efficiency**: 16 bytes (uuid) vs ~36 bytes (text) per ID
- **Database validation**: PostgreSQL automatically rejects invalid UUIDs at insert time
- **Better indexing**: B-tree indexes on uuid are more efficient than text
- **Type safety**: Stronger database-level constraints prevent invalid UUID values

## Gotchas

- **UUID collision risk**: Extremely low (2^128 space), acceptable for this application
- **Database indexing**: UUID indexes are slightly less efficient than integer indexes, but acceptable for this scale
- **Data cleanup**: Migration 0017 deletes any records with invalid UUID format (preserves only valid UUIDs from clients)
- **Type conversion**: Must use explicit `USING id::uuid` casting to convert from text to uuid in PostgreSQL
- **Outbox replay**: Stored mutations still reference the original UUID payload, ensuring idempotent replays
- **Mixed entity IDs**: `sync_events.entity_id` remains text because it references both integer baby IDs and UUID log IDs

## Related

- `.readme/chunks/local-first.outbox-pattern.md` - Outbox mutation replay
- `.readme/chunks/database.schema-workflow.md` - Schema changes and migrations
- `.readme/chunks/local-first.delta-sync-api.md` - Sync API mutation handling
