---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/lib/local-db/
  - src/lib/query-keys.ts
  - src/providers/QueryProvider.tsx
  - src/services/initial-sync.ts
  - src/services/sync-worker-manager.ts
  - src/workers/sync-worker.ts
  - src/stores/useSyncStore.ts
  - src/hooks/useSyncOnLogin.ts
---

# Local-First Architecture

## Purpose
Documents the local-first architecture foundation using Dexie (IndexedDB) as the immediate read model and TanStack Query as an ephemeral network scheduler. This architecture enables offline-first PWA functionality and prepares for future iOS app development.

## Scope
The local-first architecture addresses three key concerns:

1. **Instant UI Updates**: IndexedDB serves as the immediate read model, eliminating server round-trip delays
2. **Offline Support**: Mutations are stored in an outbox and replayed when connectivity returns
3. **Conflict Resolution**: Last-Write-Wins (LWW) strategy avoids complex merge logic

**Critical Principle**: Server (Postgres) remains the canonical truth. Client IndexedDB is a synchronized cache, not the source of truth.

## Key Architectural Decisions

### Separation of Concerns
- **Dexie (IndexedDB)**: Durable storage, immediate read model, outbox for offline mutations
- **TanStack Query**: Ephemeral network scheduler, NOT a persistence layer
- **Server (Postgres)**: Canonical truth, handles all writes via API

### Why NOT Persist TanStack Query Cache?
This project explicitly does NOT use `@tanstack/react-query-persist-client` because:
- TanStack Query cache is meant to be ephemeral (short-lived in-memory)
- Dexie provides the durable storage layer
- Mixing concerns leads to confusion about source of truth
- Simpler mental model: "Dexie is the client database, TanStack Query is the network scheduler"

### Conflict Resolution: Last-Write-Wins (LWW)
- No complex per-field merging or version vectors
- Server timestamp wins on conflicts
- Client updates from server response after mutation
- Explicit trade-off: simplicity over sophisticated conflict handling
- Acceptable for baby tracking use case (single caregiver editing at a time is common)

## Chunks

### Core Architecture

- `.readme/chunks/local-first.dexie-schema.md`
  - Content: Dexie database schema with tables, indexes, and design rationale
  - Read when: Working with IndexedDB, adding tables, understanding local data model

- `.readme/chunks/local-first.modular-db-structure.md`
  - Content: Modular file organization for local-db (types, helpers, database separation)
  - Read when: Adding new log types, understanding code organization, or working with local-db helpers

- `.readme/chunks/local-first.tanstack-query-setup.md`
  - Content: TanStack Query configuration as ephemeral scheduler with focus/reconnect triggers
  - Read when: Configuring sync behavior, understanding query client setup, or working with network scheduling

- `.readme/chunks/local-first.query-keys.md`
  - Content: Type-safe query key factory pattern for cache management
  - Read when: Adding new queries, invalidating cache, or understanding query key hierarchy

### Sync System

- `.readme/chunks/local-first.initial-sync-service.md`
  - Content: Initial data sync on login (user, babies, recent 7-day logs) with API contract
  - Read when: Understanding login flow, implementing new log types, or debugging sync issues

- `.readme/chunks/local-first.background-sync-worker.md`
  - Content: Web Worker for progressive historical data fetching without blocking UI
  - Read when: Working with background sync, understanding worker lifecycle, or debugging historical sync

- `.readme/chunks/local-first.sync-status-tracking.md`
  - Content: Per-entity sync status tracking in Zustand and IndexedDB
  - Read when: Implementing sync indicators, debugging sync state, or adding new entities

### Offline & Conflict Handling

- `.readme/chunks/local-first.outbox-pattern.md`
  - Content: Outbox table for offline mutation replay with idempotent server writes
  - Read when: Implementing offline mutations, understanding sync replay, or adding mutation tracking

- `.readme/chunks/local-first.conflict-resolution.md`
  - Content: Last-Write-Wins (LWW) conflict resolution strategy and rationale
  - Read when: Understanding sync conflicts, implementing merge logic, or debugging data inconsistencies

### Business Logic

- `.readme/chunks/local-first.services-layer.md`
  - Content: Shared business logic extracted to services/ for reuse across server actions and future API routes
  - Read when: Adding business logic, preparing for iOS API, or understanding access control patterns
