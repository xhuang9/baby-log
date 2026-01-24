---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/types/
---

# Dexie IndexedDB Schema

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Define the local-first IndexedDB schema used as the UI read model for offline and instant access.

## Key Deviations from Standard

- **Local DB as primary read**: UI queries go to Dexie first; server is authoritative but not the primary read path.
- **Compound indexes for logs**: All log tables index `[babyId+startedAt]` for fast recent-log queries.

## Architecture / Implementation

### Components
- `src/lib/local-db/database.ts` - Dexie schema + indexes.
- `src/lib/local-db/types/*` - Type definitions for entities, logs, sync, and outbox.

### Data Flow
1. Local data is written into Dexie tables.
2. UI reads via `useLiveQuery` or helper functions.
3. Sync processes update Dexie and advance cursors in `syncMeta`.

### Code Pattern
```ts
this.version(1).stores({
  feedLogs: 'id, babyId, startedAt, [babyId+startedAt]',
  babyAccess: '[userId+babyId], userId, babyId',
  outbox: 'mutationId, status, createdAt, entityType',
});
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `feedLogs` | `id, babyId, startedAt, [babyId+startedAt]` | Feed log indexes for per-baby time queries.
| `babyAccess` | `[userId+babyId], userId, babyId` | Compound index for access lookup.
| `syncStatus` | `entityType` | Tracks per-entity sync state.
| `authSession` | `id` | Singleton record for offline auth session.

## Gotchas / Constraints

- **Single schema version**: Only `version(1)` is defined; schema changes require a migration plan.
- **Date storage**: Dexie stores `Date` objects; server sync must convert from/to ISO strings.

## Testing Notes

- Validate that `babyAccess` queries use the compound `[userId+babyId]` index.
- Insert logs and confirm queries by `babyId` + `startedAt` are efficient.

## Related Systems

- `.readme/chunks/local-first.modular-db-structure.md` - Local DB module layout.
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync status tables.
