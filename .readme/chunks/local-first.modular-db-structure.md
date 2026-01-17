---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/lib/local-db/database.ts
  - src/lib/local-db/index.ts
  - src/lib/local-db/types/
  - src/lib/local-db/helpers/
---

# Modular Local Database Structure

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Document the modular organization of the local-first database layer to keep schema, types, and helpers separated.

## Key Deviations from Standard

- **V1-only schema**: Dexie schema is defined only in `version(1)`; migrations are not yet implemented.

## Architecture / Implementation

### Components
- `src/lib/local-db/database.ts` - Dexie schema and indexes.
- `src/lib/local-db/index.ts` - Public API exports (database + helpers + types).
- `src/lib/local-db/types/*` - Type definitions for entities, logs, sync, outbox.
- `src/lib/local-db/helpers/*` - CRUD/query helpers per domain.

### Data Flow
1. Callers import from `@/lib/local-db`.
2. Helpers write/read via `localDb` tables.
3. Types keep local schema aligned with sync APIs.

### Code Pattern
```ts
export { localDb } from './database';
export * from './helpers';
export * from './types';
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `database.name` | `baby-log` | Dexie database name.
| `schema.version` | `1` | Single schema version used in development.

## Gotchas / Constraints

- **No migrations**: Changing schema requires bumping version and providing upgrade logic.
- **Helpers are authoritative**: Prefer helper functions over direct Dexie access to keep logic centralized.

## Testing Notes

- Import `localDb` from `@/lib/local-db` in a test and ensure helpers write to expected tables.
- Verify helper exports in `helpers/index.ts` remain comprehensive after changes.

## Related Systems

- `.readme/chunks/local-first.dexie-schema.md` - Table definitions and indexes.
- `.readme/chunks/local-first.ui-config-storage.md` - UI config helper usage.
