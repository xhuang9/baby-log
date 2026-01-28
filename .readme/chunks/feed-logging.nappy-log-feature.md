---
last_verified_at: 2026-01-28T00:00:00Z
source_paths:
  - src/models/Schema.ts
  - src/app/[locale]/api/sync/push/mutations/nappy-log.ts
  - src/app/[locale]/api/sync/push/serializers/nappy-log.ts
  - src/lib/local-db/nappy-logs.ts
  - src/app/[locale]/(auth)/(app)/logs/_components/NappyTile.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/NappyLogModal.tsx
---

# Nappy Log Feature

## Purpose

Complete logging system for nappy (diaper) changes following the same patterns as feed and sleep logging. Tracks type (wee/poo/mixed/dry), optional notes, and caregiver attribution. Integrates with local-first sync and timeline display.

## Feature Overview

Nappy logs are instant events (no duration) recording when a baby's diaper was changed. Supports:

- **Quick entry**: TimeSwiper for time selection, 4 pill buttons for type
- **Optional notes**: Free-text field for additional context
- **Edit/delete**: Full modification with confirmation dialogs
- **Caregiver tracking**: Records which user logged the change
- **Offline support**: Local-first with sync
- **Timeline display**: Grouped in activity logs with other logs

## Database Schema

```typescript
export const nappyLogSchema = pgTable('nappy_log', {
  id: text('id').primaryKey(),                              // Client-generated UUID
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  loggedByUserId: integer('logged_by_user_id').references(() => userSchema.id).notNull(),
  type: nappyTypeEnum('type'),                              // 'wee' | 'poo' | 'mixed' | 'dry' | null
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),                                     // Optional notes
  ...timestamps,                                            // createdAt, updatedAt
}, t => [
  index('nappy_log_baby_started_at_idx').on(t.babyId, t.startedAt),
]);

export const nappyTypeEnum = pgEnum('nappy_type_enum', [
  'wee',
  'poo',
  'mixed',
  'dry',
]);
```

**Key decisions**:
- `id` is client-generated UUID (see `.readme/chunks/database.uuid-migration.md`)
- `type` is nullable to allow "diaper change" events without specifying type
- `startedAt` defaults to current time for convenience in UI
- Index on `(baby_id, started_at)` enables efficient timeline queries

## Nappy Types

- **wee**: Urination only
- **poo**: Defecation only
- **mixed**: Both urination and defecation
- **dry**: Clean diaper change (no output)

## IndexedDB Schema

In `src/lib/local-db/nappy-logs.ts`:

```typescript
db.nappyLogs.bulkPut(logRecords);
db.nappyLogs.where('babyId').equals(babyId)
  .and(log => log.startedAt >= minTime)
  .toArray();
```

Uses same indexes as feed/sleep logs: `[babyId, startedAt]` for efficient queries.

## Mutation Handlers

### Server-Side Processing

From `src/app/[locale]/api/sync/push/mutations/nappy-log.ts`:

**Create Operation**:
```typescript
await db.insert(nappyLogSchema).values({
  id: payload.id as string,           // Client UUID
  babyId,
  loggedByUserId: userId,
  type: payload.type as NappyType,
  startedAt: new Date(payload.startedAt),
  notes: payload.notes as string | null,
});

await writeSyncEvent({
  babyId,
  entityType: 'nappy_log',
  entityId: inserted!.id,
  op: 'create',
  payload: serializeNappyLog(inserted!),
});
```

**Update Operation**:
- LWW conflict detection via `serverUpdatedAt > clientUpdatedAt`
- Server data returned on conflict for client resolution
- Sync event recorded for pull-based sync

**Delete Operation**:
- Soft-delete pattern (physical removal, sync event recorded)
- Idempotent (deleting non-existent record returns success)

## Serialization

Nappy logs serialized to JSON for sync_events payload:

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  type: "poo",
  startedAt: "2026-01-28T14:32:00Z",
  notes: "Explosive",
  loggedByUserId: 5,
  babyId: 3,
  createdAt: "2026-01-28T14:32:00Z",
  updatedAt: "2026-01-28T14:32:00Z"
}
```

## UI Components

### NappyLogModal (Add/Edit)

Full-screen bottom sheet modal with two modes:

**Add Mode**:
- TimeSwiper with label "Start" (time selection with -7 to +1 day constraint)
- 4 pill buttons for type selection (Wee / Poo / Mixed / Dry)
- Optional notes field (textarea)
- Submit button

**Edit Mode**:
- Pre-filled fields from existing log
- Delete button (with confirmation)
- Submit button for edits

**Key interactions**:
- Hand-mode ergonomics (all controls accessible one-handed)
- Timeout dismissal after successful submission
- Confirmation dialog before delete

### NappyTile (Overview)

Timeline tile for logs page displaying:
- Icon representing type (poo, wee, mixed, dry)
- Time display ("2h 15m ago")
- Optional notes preview
- Edit/delete long-press or swipe gesture

## Timeline Display Default

Nappy logs are instant events (no duration). Timeline display defaults to **15-minute span** (vs. 1-hour for sleep, 2-hour for feed):

**Why 15 minutes?**
- Diaper changes are typically 5-10 minute events
- Need visibility of context before/after (5 minutes each)
- Prevents excessive zoom to see single point events

**Implementation**:
- Set in logs page timeline query:
  ```typescript
  const timelineStart = baseTime.minus({ minutes: 7.5 });
  const timelineEnd = baseTime.plus({ minutes: 7.5 });
  ```

## Server Actions

No dedicated server action (uses sync mutations instead). All operations go through:
- Local IndexedDB write
- Outbox enqueue (mutation record)
- Background sync to `/api/sync/push`

This follows the operations layer pattern documented in `.readme/chunks/local-first.operations-layer-pattern.md`.

## Activity Filtering

Nappy logs filterable in logs page by type:

```typescript
const filteredLogs = logs.filter(log => {
  if (activeType && log.type !== activeType) return false;
  return true;
});
```

Filter controls in logs page UI: buttons for Wee / Poo / Mixed / Dry / All.

## Sync Integration

Full delta sync support:

- **Entity type**: `'nappy_log'` in sync_events
- **Operations**: create, update, delete
- **Conflicts**: LWW via `updatedAt` timestamp
- **Idempotency**: Entity ID + operation ID ensures replays are safe
- **Caregiver sync**: Changes visible to all caregivers with access within seconds

## Gotchas

- **Type nullability**: `type` column is nullable; UI always provides value, but API accepts null
- **Notes length**: No server-side validation on notes length; client should cap input
- **Instant event timeline**: Default 15-minute span is hardcoded; changing requires UI config
- **Caregiver attribution**: `loggedByUserId` is immutable after creation; edit doesn't change who logged it
- **Time constraints**: TimeSwiper constrains time to -7 days to +1 day (shared constraint with feed/sleep)

## Related

- `.readme/chunks/ui-patterns.activity-modals.md` - Modal architecture and patterns
- `.readme/chunks/feed-logging.timeswiper-date-range.md` - TimeSwiper constraints
- `.readme/chunks/local-first.operations-layer-pattern.md` - Operations layer for mutations
- `.readme/chunks/feed-logging.activity-logs-page.md` - Logs page integration
- `.readme/chunks/database.uuid-migration.md` - UUID primary keys
