# BabyLog Monorepo Context (Next.js + Vercel + Neon) — Local-First Dashboard + Push/Pull Sync

This document summarizes architectural decisions and agreed patterns from the design discussion. It is intended as context for other LLMs/agents working on the project.

---

## Decisions (Final)

### Keep Next.js as the backend (on Vercel)
- **Do not move off Next.js** to a separate long-lived Node server.
- Use **Next.js App Router** and **API Route Handlers** (`app/api/...`) as the backend.
- Deploy **entirely on Vercel**.
- Use **Neon Postgres** as the sole database.
- **No other hosting provider** and no always-on servers.

### Sync model: Push/Pull without WebSockets
- Real-time requirement is “near real-time” between two accounts sharing the same baby.
- **No WebSockets** (Vercel Functions cannot act as a WebSocket server).
- Use **pull-based delta sync** with periodic validation while the app is active.

### TanStack Query: add it to Next.js (not TanStack Router)
- TanStack Query is adopted for:
  - client caching
  - retry/backoff
  - online/focus awareness
  - periodic refetch scheduling for pull sync
- **Do not add TanStack Router**; keep Next routing for both marketing and app routes.

---

## Why Next.js API Routes Are Used (and what we accept)
- Next API routes on Vercel run as **request-driven functions** (serverless/edge depending on configuration), not long-lived processes.
- This is acceptable for this project since the design avoids:
  - WebSocket server requirements
  - indefinite streaming connections
  - always-on background workers
- Background or long-running processing is intentionally minimized to fit Vercel’s execution model.

---

## High-Level Architecture

### Components
- **PWA Dashboard (Next.js)**: local-first UI, reads from IndexedDB, syncs via API
- **Marketing Site (Next.js)**: SEO/SSR/RSC-friendly pages using standard Next patterns
- **Backend (Next.js Route Handlers)**: authz gating + sync endpoints + mutation endpoints
- **Database (Neon Postgres)**: source-of-truth; clients never connect to Postgres directly

### Key Principle: Postgres is not a client-facing bridge
- iOS/PWA must **not** talk directly to Neon Postgres.
- All client access goes through Next.js APIs to avoid:
  - credential exposure
  - schema surface exposure
  - lack of business rules enforcement
  - inability to apply server-side concurrency controls cleanly

---

## Local-First Strategy (Dashboard)

### Source of truth on client: IndexedDB
- Dashboard UI should render from **IndexedDB first**.
- IndexedDB holds:
  - local materialized views of baby entities/logs (feed/sleep/etc.)
  - sync cursor/version metadata
  - outbox of pending offline mutations (if/when offline edits are supported)

Recommended IndexedDB library:
- **Dexie** (plus `dexie-react-hooks` / `liveQuery`) for reactive reads.

### What TanStack Query is *not* used for
- TanStack Query persistence to `localStorage` is **not** the local-first database.
- TanStack Query cache is treated as **ephemeral network cache / scheduler**, not durable state.

### What TanStack Query *is* used for
- Scheduling periodic **pull sync** while the app is active (e.g. 5s interval).
- Using focus/online awareness to:
  - refetch on window focus
  - pause/slow when not active
- Coordinating background retries and deduping network calls.
- Optional: running a “version check” query and showing “updates available” UI.

---

## Protected Dashboard Rendering Model (Next App Router)

### Server components handle gating (block render)
Use server components to block rendering for:
- Clerk authentication checks
- authorization (user access to baby)
- route scope selection (`babyId`, membership validation)

Server gating produces a safe “frame”:
- The page only renders the client dashboard component if:
  - user is authenticated
  - baby access is authorized

### Client components handle local-first data display
Once gated, the client dashboard:
- renders instantly from IndexedDB
- starts pull sync in the background
- merges server updates into IndexedDB, triggering reactive UI updates

---

## Sync Model (Push/Pull)

### Pull: preferred mechanism for “near realtime”
- When app is active:
  - validate sync state every ~5 seconds (configurable)
  - if newer server state exists, pull deltas and apply to IndexedDB
- Also pull on:
  - app foreground / page focus
  - network regained

### Use a monotonic cursor/version, not a hash
Instead of a “version hash”, prefer:
- a monotonic **cursor** (event id) or
- a monotonic **version int** per baby

Reason:
- cheap comparisons
- deterministic ordering
- supports delta queries: “give me everything since cursor/version X”

### Delta sync shape (directional guidance)
Two viable approaches (choose one):
1) **Event cursor**
   - `GET /sync?since=cursor`
   - returns events + `nextCursor`
2) **Per-baby version**
   - `GET /version`
   - `GET /changes?sinceVersion=x`

The UI may optionally show an “Updates available” indicator when server version > local version, but the recommended UX is to begin background sync immediately and reflect changes once local DB updates.

---

## Concurrency & Conflicts (No Redis required)

Correctness is handled at the database layer:
- **Optimistic concurrency** (preferred): `version` column (or `updated_at`) with compare-and-swap updates.
- **Row locks** (`SELECT ... FOR UPDATE`) for truly critical serialized operations only.
- **Constraints** (unique / partial unique indexes) to enforce invariants.

Redis is not required for mutation locking or correctness in this design.

---

## Clerk Authentication & Authorization Flow

### Shared pattern across PWA and mobile-style clients
- Use Clerk token (bearer) for API calls.
- Server enforces:
  - authenticated userId presence
  - membership access to `babyId`
  - all data fetching and mutations are authorized on the server

Client does not decide access; it only provides token and receives authorized results.

---

## Scope Exclusions (Handled Elsewhere)
- Push notification mechanics (PWA + iOS) are explicitly excluded from this doc.

---

## Implementation Direction Checklist

### Next.js (App Router)
- Protected routes via server components:
  - `(app)` route group layout checks auth
  - `babies/[babyId]` page checks membership
- Route handlers implement:
  - version/cursor endpoint
  - delta sync endpoint
  - mutation endpoint

### Client (Dashboard)
- Dexie schema for:
  - `feed_logs`, `sleep_logs`, etc.
  - `meta` table (cursor/version per baby)
  - optional `outbox` for offline edits
- TanStack Query:
  - `useQuery` that triggers periodic sync pull
  - refetch on focus/online
  - query keys scoped by `babyId`

---

## Core Principle Summary
- Next.js remains both web and backend (Vercel-first).
- Dashboard is local-first:
  - IndexedDB is the primary read model
  - TanStack Query schedules sync, does not replace IndexedDB
- Sync is push/pull without websockets:
  - monotonic cursor/version
  - delta pull, applied into IndexedDB
- Database correctness uses Postgres concurrency controls; no Redis required.

---