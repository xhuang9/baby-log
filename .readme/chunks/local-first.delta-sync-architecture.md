---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/models/Schema.ts
  - src/app/[locale]/api/sync/pull/route.ts
  - src/app/[locale]/api/sync/push/route.ts
conversation_context: "Updated delta sync architecture docs after adding baby entity support to sync push."
---

# Delta Sync Architecture

> Status: active
> Last updated: 2026-01-18
> Owner: Core

## Purpose

Provide cursor-based incremental sync using `sync_events` for pull, and outbox push for mutations.

## Key Deviations from Standard

- **Event log cursor**: The `sync_events.id` serial column is the cursor for pull pagination.
- **Server-side conflict resolution**: Push uses LWW checks and returns `conflict` with server data when needed.

## Architecture / Implementation

### Components
- `src/models/Schema.ts` - `sync_events` table + `sync_op_enum`.
- `src/app/[locale]/api/sync/pull/route.ts` - Pull endpoint with `since` cursor.
- `src/app/[locale]/api/sync/push/route.ts` - Push endpoint for outbox mutations.

### Data Flow
1. Client calls `/api/sync/pull?babyId=...&since=...` to fetch new events.
2. Server reads `sync_events` for the baby and returns changes + `nextCursor`.
3. Client pushes outbox mutations to `/api/sync/push`.
4. Server applies writes, inserts `sync_events`, and returns per-mutation results.

### Code Pattern
```ts
const changes = await db
  .select({ id: syncEventsSchema.id, entityType: syncEventsSchema.entityType })
  .from(syncEventsSchema)
  .where(and(eq(syncEventsSchema.babyId, babyId), gt(syncEventsSchema.id, sinceCursor)))
  .orderBy(syncEventsSchema.id)
  .limit(limit + 1);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `since` | `0` | Cursor for pull requests; uses `sync_events.id`.
| `limit` | `100` | Pull batch size (max `500`).
| `sync_op_enum` | `create/update/delete` | Allowed ops recorded in `sync_events`.
| `entityType` | `baby/feed_log/sleep_log/nappy_log` | Entity types emitted into `sync_events` and accepted by push.

## Gotchas / Constraints

- **Access enforcement**: Pull and push endpoints both verify baby access before processing.
- **Payload format**: `sync_events.payload` stores JSON strings; consumers must `JSON.parse`.
- **Baby access not included**: Baby sync events serialize the baby row only; `baby_access` rows are created server-side but not emitted in the payload.

## Testing Notes

- Create a feed log, then pull with `since=0` and verify the event appears.
- Push an update with an older `updatedAt` to exercise conflict handling.

## Related Systems

- `.readme/chunks/local-first.outbox-pattern.md` - Mutation queue driving push.
- `.readme/chunks/local-first.sync-status-tracking.md` - Client cursor storage.
