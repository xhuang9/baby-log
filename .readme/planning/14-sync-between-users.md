# Sync Between Users (Broadcast Updates)

## Current Behavior (from code)
- Changes are recorded in `sync_events` on the server and pulled by clients via `/api/sync/pull` using a per-baby cursor.
- Clients run `useSyncScheduler` which:
  - Pulls changes every **5 seconds** when the app is active and online.
  - Re-pulls on window focus and on reconnect.
  - Flushes the local outbox on reconnect and shortly after startup.
- Result: User B sees User A’s changes on their **next pull** (typically within ~5s if the app is open and visible; otherwise on focus/login/reconnect).

## Goal
Make cross-user updates predictable and near-real-time using a Postgres outbox (`sync_events`) + client outbox (IndexedDB), with clear handling for edits, deletes, access changes, and conflicts.

## Strategy (Broadcast via Postgres Outbox)
1. **Client Outbox (IndexedDB)**
   - All mutations (create/update/delete for logs + baby edits) are first written locally and added to a client outbox.
   - Outbox flush pushes mutations to `/api/sync/push`.

2. **Server Outbox (`sync_events`)**
   - Every successful mutation writes a `sync_events` row in the same DB transaction.
   - Each event includes: `babyId`, `entityType`, `entityId`, `op`, `payload`, `createdAt`.
   - This acts as the broadcast stream for all caregivers on that baby.

3. **Cursor-Based Pull**
   - Each client keeps a `syncMeta.cursor` per baby.
   - `/api/sync/pull` returns all events after the cursor and advances it.
   - Clients apply changes idempotently to local DB.

## Required Enhancements

### 1) Ensure *all* shared mutations write `sync_events`
- **Server actions** that modify babies/logs must also record a sync event.
- Use a shared helper to insert into `sync_events` to avoid drift.

### 2) Add missing update flows
- Add/update outbox mutation types for **log edits** (future-proof).
- Ensure baby edits (name/weight/gender) go through the push pipeline or write sync events directly.

### 3) Access changes and new babies
- When a user gains access to a new baby:
  - Trigger **initial sync** for that baby and set cursor to latest.
- When access is revoked:
  - Pull returns 403; client clears local data and stops sync for that baby.

### 4) Sync cadence tuning
- Keep 5s polling as baseline for active tabs.
- Optional: push a “sync hint” by triggering a manual pull after successful outbox flush.

## Edge Cases and How to Handle Them

### Offline Updates
- User A edits offline → changes stay in outbox.
- User B sees nothing until User A reconnects and pushes, then B pulls.

### Conflicts (Two caregivers edit same item)
- Use **last-write-wins** (server authoritative by `updatedAt`).
- On conflict responses from `/api/sync/push`, apply `serverData` back to local DB.

### Deleted vs Updated
- Treat deletes as tombstones; `sync_events` should include delete payload when needed.
- Ensure local apply logic can handle delete for missing entities.

### Cursor Gaps / Pagination
- Pull uses `limit` + `hasMore` — keep looping until `hasMore = false`.
- Always advance cursor only after applying changes.

### Access Revocation While Outbox Pending
- If B loses access, `/api/sync/pull` returns 403 and local data is cleared.
- If A loses access, `/api/sync/push` returns 403 for new mutations; mark local outbox entries as failed and show UI.

### Event Retention
- Do not delete `sync_events` too aggressively.
- If cleanup is needed, do it only after all clients can safely advance cursors (or after a long TTL).

## Suggested Implementation Plan

1. **Audit Mutation Paths**
   - Confirm all baby/log mutations use outbox or insert sync events.

2. **Server Helper**
   - Add a helper to write `sync_events` with consistent payload shape.

3. **Outbox Support for Updates**
   - Add update operations for logs (feed/sleep/nappy) and babies.

4. **Access Change Handling**
   - When a new baby access is granted, trigger initial sync and reset cursor.
   - On access loss, stop sync and clear local data.

5. **Conflict Handling**
   - Standardize `conflict` result handling in `/api/sync/push` and client.

6. **Observability**
   - Track last sync timestamp per baby.
   - Surface sync errors in UI.

## Files to Review/Change
- `src/app/[locale]/api/sync/push/route.ts`
- `src/app/[locale]/api/sync/pull/route.ts`
- `src/services/sync-service.ts`
- `src/hooks/useSyncScheduler.ts`
- `src/lib/local-db/*` (outbox + sync cursor)
- `src/actions/*` (baby + log actions)
- `src/models/Schema.ts` (sync_events, entities)

## Success Criteria
- User B sees User A changes within one polling interval while active.
- All create/update/delete operations broadcast via `sync_events`.
- Access grants/revokes update local stores consistently.
- Conflicts resolve deterministically without data corruption.
