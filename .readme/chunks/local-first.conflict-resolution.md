---
last_verified_at: 2026-01-17T13:01:43Z
source_paths:
  - src/app/[locale]/api/sync/push/route.ts
  - src/services/sync-service.ts
  - src/lib/local-db/helpers/outbox.ts
  - src/lib/local-db/types/outbox.ts
---

# Outbox Conflict Resolution (TODO)

> Status: LWW implemented, conflict UX pending
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Define how conflicts are resolved between IndexedDB outbox updates and the canonical Postgres state, and capture the intended improvements.

## Current Behavior (Implemented)

### Server-Side Conflict Detection
**Location:** `src/app/[locale]/api/sync/push/route.ts`

- For updates, the server compares `payload.updatedAt` (client) with `existing.updatedAt` (server).
- If the server is newer, it returns `{ status: 'conflict', serverData }`.
- If the client is newer or `updatedAt` is missing, the update proceeds and the server becomes authoritative.

```ts
const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt as string) : null;
const serverUpdatedAt = existing.updatedAt;

if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
  return { mutationId, status: 'conflict', serverData: serializeFeedLog(existing) };
}
```

### Client-Side Conflict Handling
**Location:** `src/services/sync-service.ts`

- `flushOutbox` treats `conflict` as LWW: apply `serverData` locally and mark the mutation as `synced`.
- `applyServerData` overwrites the local record with server values.

```ts
if (result.status === 'conflict') {
  if (result.serverData) {
    await applyServerData(result.serverData);
  }
  await updateOutboxStatus(result.mutationId, 'synced');
}
```

## Intent & Rationale (Preserved)

The guiding idea is simple: **server wins on conflicts**, but conflict detection should be based on **client `updatedAt` vs server `updatedAt`** so that newer local edits are not overwritten by stale remote data. This keeps the sync system deterministic and low-complexity while still honoring the most recent edit.

## TODO (Planned Improvements)

- Ensure outbox update payloads include `updatedAt` from IndexedDB before enqueueing.
- Store conflict metadata (local payload + server data) instead of auto-discarding local edits.
- Add a conflict review UI (optional: "Reapply my change" or "Keep server version").
- Add tests for conflict scenarios (push API + client applyServerData).
- Consider field-level LWW for notes vs numeric fields if user feedback requires it.

## Gotchas / Constraints

- If `payload.updatedAt` is missing, the server cannot detect staleness and will accept the update.
- Conflicts are silent today; users will not see that their local edit was overwritten.

## Related

- `.readme/chunks/local-first.outbox-pattern.md` - Outbox enqueue/flush flow
- `.readme/chunks/local-first.delta-sync-architecture.md` - Sync endpoints and cursor design
