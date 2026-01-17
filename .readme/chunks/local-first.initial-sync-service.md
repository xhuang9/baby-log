---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/services/initial-sync.ts
  - src/app/[locale]/api/sync/initial/route.ts
  - src/hooks/useSyncOnLogin.ts
---

# Initial Sync Service

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Fetch the minimum data required for first-time use and store it in IndexedDB for local-first rendering.

## Key Deviations from Standard

- **Feed logs only**: The initial sync endpoint currently returns recent feed logs; sleep/nappy logs and UI config are not yet populated.
- **Explicit sync-status updates**: `storeInitialSyncData` marks each entity status during the write process.

## Architecture / Implementation

### Components
- `src/services/initial-sync.ts` - Fetch, transform, and store initial data.
- `src/app/[locale]/api/sync/initial/route.ts` - Server endpoint for initial sync.
- `src/hooks/useSyncOnLogin.ts` - Optional hook to run initial sync and background worker.

### Data Flow
1. `fetchInitialSyncData()` GETs `/api/sync/initial`.
2. `storeInitialSyncData()` writes users, babies, access, logs, and UI config (if present).
3. `useSyncOnLogin` hydrates Zustand stores and starts the background worker.

### Code Pattern
```ts
const result = await performInitialSync();
if (result.success) {
  setUser({ id: result.data.user.clerkId, localId: result.data.user.id });
  syncWorkerManager.startSync(result.data.babies.map(b => b.id));
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `sync window` | `7 days` | Server query window for `recentFeedLogs`.
| `sync statuses` | `syncing → complete` | Per-entity status transitions during store.

## Gotchas / Constraints

- **UI config null**: API returns `uiConfig: null`, so `mergeUIConfig` is only called when provided.
- **No sleep/nappy logs**: Initial sync does not populate those log tables yet.

## Testing Notes

- Hit `/api/sync/initial` and verify the response includes `recentFeedLogs` but not sleep/nappy.
- Run `performInitialSync()` and confirm `syncStatus` entries update for each entity.

## Related Systems

- `.readme/chunks/local-first.background-sync-worker.md` - Optional background sync after initial load.
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync status storage.
