---
last_verified_at: 2026-01-08T02:39:45Z
source_paths:
  - src/
  - src/actions/
  - src/app/[locale]/
  - src/components/
  - src/libs/
  - src/models/
  - src/stores/
  - src/templates/
  - src/utils/
  - src/validations/
  - tests/
  - .readme/tree.txt
---

# Folder Structure Plan (Revised)

## Purpose
Reorganize the folder structure to fix current pain points while staying aligned with Next.js App Router conventions. Prepare for PWA offline-first patterns and future iOS API without over-engineering.

## Guiding Principles

1. **Keep it simple** — This is a baby tracking app, not an enterprise platform. Avoid deep nesting.
2. **Respect Next.js conventions** — Colocate page-specific code with routes. Use App Router patterns.
3. **Incremental iOS preparation** — Don't build abstractions until iOS is actually in development.
4. **PWA via proven libraries** — Use TanStack Query + persistQueryClient, not custom sync engines.
5. **Flat over nested** — Prefer `lib/cache.ts` over `features/baby/data/client/cache.ts`.

## Current Pain Points

| Problem | Location | Impact |
|---------|----------|--------|
| Providers mixed with UI components | `components/analytics/`, `components/providers/` | Confusing — providers aren't "components" |
| Domain UI mixed with shared UI | `components/overview/` alongside `components/ui/` | Hard to find domain-specific code |
| No clear home for business logic | Scattered in actions + inline in pages | Duplicated auth/access checks |
| Boilerplate demo code still present | `CounterForm`, `DemoBadge`, `portfolio/`, etc. | Clutter |

## Target Structure

```
src/
  app/
    [locale]/
      (auth)/
        (app)/                    # Main app routes (keep as-is)
          overview/
            _components/          # Page-specific components (NEW pattern)
              ActivityTile.tsx
              FeedTile.tsx
              AddFeedSheet.tsx
          settings/
            _components/          # Settings-specific components
          logs/
            _components/
        account/                  # Account flows (keep as-is)
      (marketing)/                # Public pages (keep as-is)
      api/                        # Locale-prefixed API (existing)
    api/                          # Non-localized API for iOS (NEW, when needed)
      v1/
        feed/
        baby/

  components/
    ui/                           # shadcn/ui primitives (keep as-is)
    navigation/                   # App navigation (keep as-is)

  providers/                      # Move from components/ (NEW location)
    ThemeProvider.tsx
    PostHogProvider.tsx
    QueryProvider.tsx             # TanStack Query provider (NEW)

  actions/                        # Server actions (keep flat)
    accessRequestActions.ts
    babyActions.ts
    feedLogActions.ts

  lib/                            # Rename from libs/ to match Next.js convention
    db.ts                         # Rename from DB.ts (lowercase)
    env.ts
    i18n.ts
    local-db.ts                   # Dexie.js local-first database (NEW)
    query-keys.ts                 # TanStack Query key factory (NEW)

  stores/                         # Zustand stores (keep as-is)

  services/                       # Shared business logic (NEW)
    baby-access.ts                # Auth/access checking logic
    feed-log.ts                   # Feed calculation/validation logic

  models/
    Schema.ts                     # Drizzle schema (keep as-is)
    types.ts                      # Derived TypeScript types (NEW)

  validations/                    # Zod schemas (keep as-is, expand)

  templates/                      # Shell layouts (keep as-is)
  styles/                         # Global styles (keep as-is)
  config/                         # App config (keep as-is)
  hooks/                          # Shared hooks (keep as-is)
  types/                          # Global types (keep as-is)
  utils/                          # Utilities (keep as-is)
```

## Key Changes Explained

### 1. Page-Specific `_components/` Folders
Next.js ignores folders starting with `_` in routing. This lets us colocate page-specific components:

```
app/[locale]/(auth)/(app)/overview/
  page.tsx
  _components/
    ActivityTile.tsx      # Only used by overview page
    FeedTile.tsx
    AddFeedSheet.tsx
```

**Why:** Keeps related code together. When working on overview, everything is in one folder.

### 2. `providers/` Extracted from `components/`
Providers are infrastructure, not UI. They deserve their own top-level folder:

```
src/providers/
  ThemeProvider.tsx       # From components/providers/
  PostHogProvider.tsx     # From components/analytics/
  QueryProvider.tsx       # New for TanStack Query
```

### 3. `services/` for Shared Business Logic
Extract repeated auth/access logic from actions into reusable services:

```typescript
// src/services/baby-access.ts
export async function assertUserCanAccessBaby(userId: string, babyId: string) {
  // Single source of truth for access checks
  // Used by both server actions AND future API routes
}
```

**Why:** When iOS API routes are added, they call the same `services/` functions as server actions. No duplication.

### 4. `lib/` Naming Convention
Rename `libs/` → `lib/` and use lowercase filenames to match Next.js conventions:

```
src/lib/
  db.ts          # Was DB.ts (server-side Drizzle connection)
  env.ts         # Was Env.ts
  local-db.ts    # New: Dexie.js local-first database (client-side)
  query-keys.ts  # New: TanStack Query key factory
```

### 5. Local-First Strategy: Dexie + TanStack Query (Separation of Concerns)

**Key principles:**
- IndexedDB (via Dexie) is the **immediate read model** for UX
- Server (Next.js API + Neon) is the **canonical truth**
- TanStack Query is an **ephemeral network scheduler**, not a persistence layer
- Conflicts resolved via **Last-Write-Wins (LWW)** - no complex merge logic needed

```
┌─────────────────────────────────────────────────────────────┐
│  Dashboard UI                                               │
│  (React components)                                         │
└─────────────────┬───────────────────────────────────────────┘
                  │ reads via liveQuery (reactive)
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Dexie (IndexedDB) - Immediate Read Model                   │
│  - feed_logs, babies, baby_access tables                    │
│  - sync_meta table (cursor per baby for delta pull)         │
│  - outbox table (pending offline mutations)                 │
└──────────┬──────────────────────────────────────────────────┘
           │                              ▲
           │ flush outbox                 │ apply server response
           ▼                              │
┌──────────────────────────────────────────────────────────────┐
│  TanStack Query - Ephemeral Scheduler                        │
│  - Schedules outbox flush when online/focus                  │
│  - Schedules periodic pull sync (~5s while active)           │
│  - Focus/online awareness, retry/backoff                     │
│  - NO persistence (Dexie is the durable store)               │
└─────────────────┬────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Next.js API Routes                                         │
│  - Mutation endpoints (idempotent via client UUID)          │
│  - GET /api/babies/:babyId/sync?since=cursor (delta pull)   │
└─────────────────────────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│  Neon Postgres (Canonical Truth)                            │
└─────────────────────────────────────────────────────────────┘
```

### Offline Safety Requirements (Not "Complex Merging")

| Requirement | Why | How |
|-------------|-----|-----|
| **Client-generated UUIDs** | Prevent duplicates on retry | Client creates `id: uuid` at entity creation |
| **Idempotent server writes** | Safe replay | Server uses client UUID as primary key / upsert |
| **Outbox** | Durable offline mutations | Store pending mutations, replay when online |

```typescript
// src/lib/local-db.ts
import Dexie from 'dexie';

class BabyLogDatabase extends Dexie {
  feedLogs!: Dexie.Table<FeedLog, string>;
  babies!: Dexie.Table<Baby, string>;
  syncMeta!: Dexie.Table<{ babyId: string; cursor: number; lastSync: Date }, string>;
  outbox!: Dexie.Table<OutboxEntry, string>;

  constructor() {
    super('baby-log');
    this.version(1).stores({
      feedLogs: 'id, babyId, createdAt',
      babies: 'id',
      syncMeta: 'babyId',
      outbox: 'mutationId, entityType, status, createdAt',
    });
  }
}

// Outbox entry for offline mutations
interface OutboxEntry {
  mutationId: string;      // UUID, unique
  entityType: 'feed_log' | 'sleep_log' | 'baby';
  entityId: string;        // UUID of the entity
  op: 'create' | 'update' | 'delete';
  payload: unknown;        // Full row or patch
  createdAt: Date;
  status: 'pending' | 'syncing' | 'synced' | 'failed';
}

export const localDb = new BabyLogDatabase();
```

```typescript
// src/providers/QueryProvider.tsx
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// No persistence - TanStack Query is ephemeral scheduler only
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 5,           // 5 seconds - triggers sync checks
      gcTime: 1000 * 60 * 5,         // 5 minutes - short, data lives in Dexie
      refetchOnWindowFocus: true,    // Flush outbox + pull sync on focus
      refetchOnReconnect: true,      // Flush outbox + pull sync on network regain
    },
  },
});
```

**Why this architecture:**
- **Dexie** = immediate read model, durable storage, outbox for offline
- **TanStack Query** = network scheduler, NOT the source of truth
- **LWW** = simple conflict resolution, no per-field merge logic
- **Client UUIDs + idempotent writes** = safe offline replay without duplicates

### 6. Future iOS API Structure
When iOS development starts, add non-localized API routes:

```
src/app/api/v1/
  feed/
    route.ts              # GET /api/v1/feed
  baby/
    route.ts              # GET /api/v1/baby
    [babyId]/
      route.ts            # GET /api/v1/baby/:babyId
```

These routes import from `services/` for business logic, keeping code DRY.

## What NOT to Do

| Tempting Pattern | Why to Avoid |
|-----------------|--------------|
| `features/` domain slices | Over-engineering for 4 domains. Creates deep nesting. |
| `server/repositories/` | Next.js isn't NestJS. Actions + services is enough. |
| TanStack Query persistence to IndexedDB | Wrong mental model. TanStack Query = ephemeral scheduler. Dexie = durable store. |
| Complex per-field merge / version gating | Over-engineering. LWW is explicitly accepted for this product scope. |
| WebSockets for real-time sync | Vercel Functions can't act as WebSocket server. Use pull-based delta sync. |
| Direct Postgres connection from client | Security risk. All client access through Next.js API routes. |
| Server-generated IDs for entities | Use client-generated UUIDs for idempotent offline replay. |
| Extract to monorepo now | Do this when iOS actually starts, not before. |
| Rename `templates/` → `layouts/` | Conflicts with Next.js `layout.tsx` terminology. |

## Architecture Decisions Reference

See `.readme/task/llm-chat.md` for detailed architectural decisions including:
- Why Next.js remains both web and backend (Vercel-first)
- Local-first strategy with Dexie as immediate read model
- Push/pull sync model without WebSockets
- Postgres concurrency controls (no Redis needed)

See `.readme/task/llm-chat-correction.md` for refinements including:
- LWW (Last-Write-Wins) conflict resolution - no complex merging
- Offline safety requirements: client UUIDs, idempotent writes, outbox
- Server as canonical truth, client updates from server response
- Outbox schema for pending mutations

## Implementation Steps

### Phase 1: Cleanup (Low Risk)
Remove boilerplate demo code that's no longer needed.

- [ ] **1.1** Delete demo components: `CounterForm.tsx`, `CurrentCount.tsx`, `DemoBadge.tsx`, `DemoBanner.tsx`, `Sponsors.tsx`
- [ ] **1.2** Delete demo pages: `counter/`, `portfolio/`, `about/` (if not needed)
- [ ] **1.3** Delete demo API route: `api/counter/`
- [ ] **1.4** Delete demo validation: `CounterValidation.ts`
- [ ] **1.5** Delete example components: `component-example.tsx`, `example.tsx`
- [ ] **1.6** Update any imports that referenced deleted files
- [ ] **1.7** Run `pnpm run check:deps` to find any orphaned references

### Phase 2: Extract Providers (Low Risk)
Move infrastructure code out of `components/`.

- [ ] **2.1** Create `src/providers/` directory
- [ ] **2.2** Move `components/providers/ThemeProvider.tsx` → `providers/ThemeProvider.tsx`
- [ ] **2.3** Move `components/analytics/PostHogProvider.tsx` → `providers/PostHogProvider.tsx`
- [ ] **2.4** Move `components/analytics/PostHogPageView.tsx` → `providers/PostHogPageView.tsx`
- [ ] **2.5** Delete empty `components/providers/` and `components/analytics/` folders
- [ ] **2.6** Update all imports (use find-replace: `@/components/providers/` → `@/providers/`)
- [ ] **2.7** Update all imports (use find-replace: `@/components/analytics/` → `@/providers/`)

### Phase 3: Rename libs → lib (Medium Risk)
Align with Next.js naming conventions.

- [ ] **3.1** Rename `src/libs/` → `src/lib/`
- [ ] **3.2** Rename files to lowercase: `DB.ts` → `db.ts`, `Env.ts` → `env.ts`, etc.
- [ ] **3.3** Update `tsconfig.json` paths if using alias for libs
- [ ] **3.4** Global find-replace: `@/libs/` → `@/lib/`
- [ ] **3.5** Global find-replace: `from '@/lib/DB'` → `from '@/lib/db'` (and other files)
- [ ] **3.6** Run TypeScript check: `pnpm run check:types`

### Phase 4: Colocate Page Components (Medium Risk)
Move domain-specific components next to their pages.

- [ ] **4.1** Create `src/app/[locale]/(auth)/(app)/overview/_components/`
- [ ] **4.2** Move `components/overview/ActivityTile.tsx` → `overview/_components/ActivityTile.tsx`
- [ ] **4.3** Move `components/overview/FeedTile.tsx` → `overview/_components/FeedTile.tsx`
- [ ] **4.4** Move `components/overview/AddFeedSheet.tsx` → `overview/_components/AddFeedSheet.tsx`
- [ ] **4.5** Delete empty `components/overview/` folder
- [ ] **4.6** Update imports in `overview/page.tsx` to use relative paths: `'./_components/FeedTile'`
- [ ] **4.7** Repeat for any other domain-specific component folders in `components/`

### Phase 5: Add Services Layer (Medium Risk)
Extract shared business logic from actions.

- [ ] **5.1** Create `src/services/` directory
- [ ] **5.2** Create `services/baby-access.ts` with access checking functions
- [ ] **5.3** Extract `canUserAccessBaby`, `getUserBabyAccess` logic from `babyActions.ts`
- [ ] **5.4** Update `babyActions.ts` to import from `services/baby-access.ts`
- [ ] **5.5** Update `accessRequestActions.ts` to use shared service
- [ ] **5.6** Create `services/feed-log.ts` for feed-related business logic if needed
- [ ] **5.7** Run tests: `pnpm run test`

### Phase 6: Local-First Foundation Setup (Direction Only)
Set up the infrastructure for local-first architecture. This phase establishes the pattern without full sync implementation.

**Goal:** Prepare the codebase direction for PWA local-first and future iOS API. Not implementing full sync yet.

- [ ] **6.1** Install dependencies: `pnpm add @tanstack/react-query dexie dexie-react-hooks`
  - Note: NO `@tanstack/react-query-persist-client` - TanStack Query is ephemeral, Dexie is the store
- [ ] **6.2** Create `src/lib/local-db.ts` with Dexie schema:
  - `feedLogs` table (mirrors server schema, indexed by `babyId`, `createdAt`)
  - `babies` table
  - `syncMeta` table (cursor per baby for future delta sync)
  - `outbox` table (pending offline mutations: mutationId, entityType, entityId, op, payload, status)
- [ ] **6.3** Create `src/providers/QueryProvider.tsx`:
  - Basic QueryClient setup (no persistence)
  - Configure `refetchOnWindowFocus`, `refetchOnReconnect` for future sync
- [ ] **6.4** Create `src/lib/query-keys.ts` with query key factory for type-safe keys
- [ ] **6.5** Add `QueryProvider` to root layout
- [ ] **6.6** Document the local-first pattern in `.readme/` for future reference
- [ ] **6.7** Verify Dexie works: simple test writing/reading from IndexedDB in dev tools

**Deferred to future phases (when needed):**
- Delta sync API endpoint (`GET /api/babies/:babyId/sync?since=cursor`)
- `useLiveQuery` integration for reactive UI reads from Dexie
- Sync scheduler using TanStack Query's `refetchInterval`
- Outbox flush logic (replay pending mutations when online)
- Client-generated UUID pattern for new entities (idempotent creates)

**Note:** Conflict resolution is LWW (Last-Write-Wins) - no complex merge logic needed.

### Phase 7: iOS API Preparation (When Needed)
Only do this when iOS development actually begins.

- [ ] **7.1** Create `src/app/api/v1/` directory structure
- [ ] **7.2** Update middleware to skip i18n for `/api/v1/*` paths
- [ ] **7.3** Create API routes that call `services/` functions
- [ ] **7.4** Add API authentication (JWT or similar)
- [ ] **7.5** Document API endpoints

## File Movement Summary

| From | To | Reason |
|------|-----|--------|
| `components/providers/*` | `providers/*` | Infrastructure ≠ UI |
| `components/analytics/*` | `providers/*` | Infrastructure ≠ UI |
| `components/overview/*` | `app/.../overview/_components/` | Colocation |
| `libs/*` | `lib/*` | Next.js convention |
| Business logic in actions | `services/*` | Reusability for API |

## Validation Checklist

After each phase:
- [ ] `pnpm run check:types` passes
- [ ] `pnpm run lint` passes
- [ ] `pnpm run test` passes
- [ ] `pnpm run build` succeeds
- [ ] App runs correctly: `pnpm run dev`

## Related Documentation
- `.readme/chunks/architecture.route-structure.md` — Route groups and layouts
- `.readme/chunks/architecture.libs-pattern.md` — Library configuration (update after Phase 3)
- `.readme/tree.txt` — Update after reorganization complete
