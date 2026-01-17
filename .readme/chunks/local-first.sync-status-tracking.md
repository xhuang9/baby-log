---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/stores/useSyncStore.ts
  - src/lib/local-db/helpers/sync-status.ts
  - src/lib/local-db/types/sync.ts
---

# Sync Status Tracking

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Persist per-entity sync status in IndexedDB and hydrate it into Zustand for UI indicators.

## Key Deviations from Standard

- **Bootstrap included**: `SyncEntityType` includes a `bootstrap` entry to track bootstrap sync.
- **Durable status**: Sync state survives refresh via `syncStatus` table.

## Architecture / Implementation

### Components
- `src/lib/local-db/types/sync.ts` - Entity + status types.
- `src/lib/local-db/helpers/sync-status.ts` - Read/write helpers.
- `src/stores/useSyncStore.ts` - Zustand store for runtime sync state.

### Data Flow
1. Sync routines call `updateSyncStatus(entity, status, options)`.
2. `useSyncStore.hydrateFromIndexedDB()` loads stored statuses into memory.
3. UI reads `entities` or `useOverallSyncStatus()` to show indicators.

### Code Pattern
```ts
await updateSyncStatus('feed_logs', 'syncing');
await updateSyncStatus('feed_logs', 'complete');
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `SyncEntityType` | `... + bootstrap` | Includes bootstrap status in entity set.
| `SyncStatusValue` | `idle/syncing/complete/error` | Allowed sync states.
| `progress` | `null` | Optional 0-100 progress value for partial sync.

## Gotchas / Constraints

- **Last sync time**: `updateSyncStatus` sets `lastSyncAt` on `complete` or uses `lastSyncedAt` override.
- **Partial data**: A single entity error does not block others; UI must decide how to surface.

## Testing Notes

- Write a status entry in IndexedDB and confirm `useSyncStore.hydrateFromIndexedDB()` reflects it.
- Ensure `useOverallSyncStatus()` returns `error` if any entity has status `error`.

## Related Systems

- `.readme/chunks/local-first.initial-sync-service.md` - Initial status updates.
- `.readme/chunks/local-first.background-sync-worker.md` - Background sync progress.
