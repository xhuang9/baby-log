---
last_verified_at: 2026-01-17T13:44:08Z
source_paths:
  - src/services/baby-access.ts
  - src/services/initial-sync.ts
  - src/services/sync-service.ts
  - src/services/sync-worker-manager.ts
  - src/services/sync-service.test.ts
  - src/hooks/useSyncOnLogin.ts
  - src/hooks/useSyncScheduler.ts
  - src/components/SyncProvider.tsx
  - src/app/[locale]/api/sync/initial/route.ts
---

# Services Layer (Local-First)

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose
Centralize shared logic that spans client sync, background sync, and server-side access checks. This folder mixes server-only and client-only services, so runtime boundaries matter.

## Service Inventory

| File | Runtime | Role |
|------|---------|------|
| `baby-access.ts` | Server | Permission checks + user/baby access lookup for server actions. |
| `initial-sync.ts` | Client | Fetch `/api/sync/initial`, transform data, store in IndexedDB, update sync status, merge UI config. |
| `sync-service.ts` | Client | Pull/push delta sync, outbox flush, LWW conflict handling. |
| `sync-worker-manager.ts` | Client | Manages background sync Web Worker and stores fetched logs. |
| `sync-service.test.ts` | Test | Unit tests for `sync-service` behaviors. |

## Runtime Split

- **Server-only**: `baby-access.ts` talks directly to Postgres via Drizzle. It does NOT import Clerk or Next.js, and expects IDs to be passed in from server actions/routes.
- **Client-only**: `initial-sync.ts`, `sync-service.ts`, `sync-worker-manager.ts` use `fetch` + IndexedDB helpers and guard against SSR (`typeof window`).

## Common Patterns

### Result Unions (No Throws)
Most services return explicit result unions instead of throwing:

```typescript
export type ServiceResult<T>
  = | { success: true; data: T }
    | { success: false; error: string };
```

`initial-sync.ts` and `sync-service.ts` follow the same success/error shape with their own result types.

### LWW Conflict Handling
`sync-service.ts` treats `conflict` results from `/api/sync/push` as server-authoritative and overwrites IndexedDB via `applyServerData`.

## Usage

- `useSyncOnLogin` calls `needsInitialSync()` + `performInitialSync()` and then starts `syncWorkerManager` for background history.
- `SyncProvider` uses `performInitialSync()` when IndexedDB is empty, then hydrates stores.
- `useSyncScheduler` uses `pullChanges()` + `flushOutbox()` on intervals and reconnects.

## Gaps / TODO

- `/api/sync/initial` currently returns only feed logs and `uiConfig: null`, while `initial-sync.ts` expects sleep/nappy logs and UI config. Align the endpoint and the service types.
- `sync-worker-manager` currently processes feed logs only (via `/api/sync/logs`). Extend for other log types if needed.

## Related

- `.readme/chunks/local-first.bootstrap-storage.md` - Bootstrap data storage in IndexedDB
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox queue + flush flow
- `.readme/chunks/local-first.delta-sync-architecture.md` - Pull/push endpoint design
