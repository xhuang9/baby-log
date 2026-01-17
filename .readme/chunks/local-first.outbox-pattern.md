---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/helpers/outbox.ts
  - src/lib/local-db/types/outbox.ts
  - src/services/sync-service.ts
  - src/hooks/useSyncScheduler.ts
---

# Outbox Pattern for Offline Mutations

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Queue offline mutations in IndexedDB and flush them to the server when connectivity returns.

## Key Deviations from Standard

- **Durable queue**: Mutations persist in `outbox` until explicitly synced or failed.
- **Conflict handling**: Push responses can return `conflict`, and the client applies server data (LWW).

## Architecture / Implementation

### Components
- `src/lib/local-db/helpers/outbox.ts` - CRUD helpers for outbox entries.
- `src/lib/local-db/types/outbox.ts` - Outbox entry schema and status enums.
- `src/services/sync-service.ts` - `flushOutbox` implementation and conflict resolution.
- `src/hooks/useSyncScheduler.ts` - Flushes outbox on reconnect and schedule.

### Data Flow
1. Client adds mutations with `addToOutbox` (status `pending`).
2. `flushOutbox` posts mutations to `/api/sync/push`.
3. Entries update to `synced` or `failed` based on response.
4. `useSyncScheduler` triggers flush on reconnect/interval.

### Code Pattern
```ts
const pending = await getPendingOutboxEntries();
await Promise.all(pending.map(e => updateOutboxStatus(e.mutationId, 'syncing')));
const response = await fetch('/api/sync/push', { method: 'POST', body: JSON.stringify({ mutations }) });
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `OutboxEntityType` | `feed_log/sleep_log/nappy_log/baby` | Entities supported by outbox entries.
| `OutboxStatus` | `pending/syncing/synced/failed` | Mutation lifecycle statuses.
| `pushEndpoint` | `/api/sync/push` | Server endpoint for outbox flush.

## Gotchas / Constraints

- **No automatic retries for failed entries**: `retryFailedOutboxEntries()` must be triggered to requeue failures.
- **Payload shape**: Server expects `entityType`, `entityId`, `op`, and full payload.

## Testing Notes

- Insert a pending outbox entry and verify `flushOutbox` moves it to `synced`.
- Force a server error and ensure the entry becomes `failed` with `errorMessage`.

## Related Systems

- `.readme/chunks/local-first.delta-sync-architecture.md` - Push endpoint contract.
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync status in IndexedDB.
