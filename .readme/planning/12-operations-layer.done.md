# Operations Layer (Service-First Mutations)

**Priority:** High
**Dependencies:** 01-state-management-sync.md, 02-offline-first-architecture.md, 03-sync-api-endpoints.md
**Estimated Scope:** Large

---

## Overview

UI components should not touch Dexie (IndexedDB) or server actions directly. All
writes flow through a client-side operations layer that centralizes:

- IndexedDB writes (immediate local-first updates)
- Zustand store updates (active baby, settings, etc.)
- Outbox enqueue for non-blocking server sync
- Optional sync trigger (fire-and-forget)

This keeps the UI simple and makes write paths consistent across the app.

---

## Goals

- Single entry point for all write operations in the UI.
- Local-first behavior by default (write local, sync async).
- Predictable error handling and result types.
- Clear runtime boundaries (client-only services).

## Non-Goals

- Rewriting all read paths or useLiveQuery usage in one pass.
- Changing sync architecture or conflict strategy (LWW stays).
- Introducing new persistence layers beyond Dexie + outbox.

---

## Proposed Structure

```
src/services/operations/
  index.ts
  types.ts
  baby.ts
  feed-log.ts
  sleep-log.ts
  nappy-log.ts
  ui-config.ts
  auth.ts
```

- `types.ts` defines a shared `OperationResult<T>` union.
- Each file exposes mutation functions (no React hooks).
- Components import from `@/services/operations/*` only.

---

## Key Data Flow (Example: rename baby)

1. Validate input and read current user context.
2. Write to IndexedDB (baby record + babyAccess label in a transaction).
3. Update Zustand store (active baby + list).
4. Enqueue outbox mutation for server sync.
5. Trigger `flushOutbox()` non-blocking (if online).

---

## Delivery Plan (High-Level)

1. **Scaffold operations layer** (types, helpers, file structure).
2. **Add baby operations** and extend sync push/pull to support `baby` entity.
3. **Migrate UI write paths** (baby edit, create, default select, feed log create).
4. **Migrate UI config writes** (theme, hand mode, sliders, widgets).
5. **Clean up and add tests** (unit tests for operations, update docs).

---

## Success Criteria

- No UI component calls `localDb.*` or server actions directly for writes.
- All mutations are expressed as operations in `src/services/operations`.
- Outbox supports `baby` updates end-to-end.
- UI updates immediately from local state and sync happens in background.

---

## Detailed Docs

- `./12/01-operation-contracts.md`
- `./12/02-migration-plan.md`
