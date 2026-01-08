# README Addendum — Corrections & Refinements (Local-First + Sync) for BabyLog

This document amends the previous README context. Assume the earlier README is already in context; this addendum only **corrects / refines** points based on the latest decisions.

---

## Decision Updates / Corrections

### 1) Local-first storage: IndexedDB remains the durable store, but merging is intentionally simple
- IndexedDB (Dexie) remains the durable client store for dashboard data.
- **Complex merge / conflict-resolution strategies are NOT required** for this product scope.
- Conflict policy is explicitly **Last-Write-Wins (LWW)** for:
  - log edits (feed/sleep/activities/etc.)
  - baby profile edits
- Concurrent log creation is naturally conflict-free (two rows).

### 2) Still required: offline replay safety (NOT “complex merging”)
Even with LWW, the system still needs minimal correctness mechanisms:
- **Client-generated stable IDs** (UUID) for created logs/entities to prevent duplicates on retries.
- **Idempotent server writes** (e.g. insert/upsert semantics keyed by client UUID).
- A lightweight **outbox** to persist pending offline mutations and replay them when online.
These are considered minimal reliability features, not “complex merging”.

### 3) Version/hash is optional; prefer a monotonic cursor for delta pull
- The earlier “version check UI” approach remains valid as an optional UX signal.
- However, the preferred sync primitive is a **monotonic cursor** (e.g. event id) enabling delta pull.
- Hash-based freshness checks are not required for correctness; they are at most a UI hint.

---

## Updated Mental Model (Authoritative)

### Server vs Local
- Local IndexedDB is the **immediate read model** for UX.
- Server (Next.js API + Neon) is the **canonical truth**.
- “Remote respects local” is not the rule; instead:
  - Local mutations are queued and later applied to server (idempotently).
  - Server returns canonical state; client updates IndexedDB accordingly.
- Conflict handling is **LWW** rather than merges.

---

## Updated Sync Contract (Minimal, LWW-Compatible)

### A) Client-generated IDs (required)
For append-heavy tables like feed/sleep logs:
- Client generates `id: uuid` at creation time.
- Server uses the same ID (primary key or unique constraint).
- Create operation becomes idempotent:
  - repeated submits do not create duplicates.

### B) Outbox (required for offline)
Store pending mutations durably:
- `mutation_id: uuid` (unique)
- `entity_type` (feed_log | sleep_log | baby | etc.)
- `entity_id` (uuid)
- `op` (create | update | delete)
- `payload` (full row or patch)
- `created_at`
- `status`

No `baseVersion` compare is required since conflicts resolve via LWW.

### C) Delta pull (recommended)
Maintain a per-baby cursor:
- `last_event_id` (or equivalent monotonic marker)

Pull endpoint returns changes since cursor:
- `GET /api/babies/:babyId/sync?since=last_event_id`
- Response includes:
  - `events[]` (or changesets)
  - `nextCursor`

Apply returned changes into IndexedDB; update cursor.

---

## Updated Client Runtime Pattern (Next.js + TanStack Query + Dexie)

### Server Components (unchanged)
Still gate access using RSC/SSR for:
- Clerk authentication
- baby membership authorization
- selecting scope (`babyId`)
This is the only “block render” step.

### Client Components (refined)
- UI renders from Dexie immediately.
- TanStack Query is used to **schedule**:
  - flush outbox when online / on focus
  - periodic pull (e.g. every 5s foreground)
- TanStack Query persistence (`@tanstack/react-query-persist-client`) is not required in this architecture because Dexie is the durable store.

---

## What to Avoid (Clarification)
- Do not treat TanStack Query cache (persisted or not) as the source of truth.
- Do not implement heavy per-field merge logic or strict version gating for edits:
  - LWW is explicitly accepted for this product.

---

## Key Principle Summary (Corrected)
- Next.js (API routes) on Vercel + Neon remains the full stack.
- Dashboard is local-first via IndexedDB (Dexie).
- Near-realtime sync uses pull-based delta sync (monotonic cursor), plus periodic foreground checks.
- Conflicts are resolved by LWW; the only necessary “correctness” mechanics are:
  - stable client IDs
  - idempotent server writes
  - durable outbox replay

---