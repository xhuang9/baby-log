# State Management & Initial Sync

**Priority:** High
**Dependencies:** None
**Estimated Scope:** Large

---

## Overview

Implement comprehensive state management for babies and user data. When a user logs in, sync everything into IndexedDB via Dexie.js to enable offline-first experience.

---

## Requirements

### Data to Sync on Login

| Data Type | Priority | Loading Strategy |
|-----------|----------|------------------|
| User profile & preferences | Critical | Immediate (blocking) |
| Active baby basic info | Critical | Immediate (blocking) |
| All accessible babies list | High | Immediate (blocking) |
| UI configuration (theme, hand mode) | High | Immediate (blocking) |
| Recent logs (last 7 days) | High | Immediate (non-blocking) |
| Historical logs (all babies) | Medium | Background (Web Worker) |

### Sync Flow

```
User Login
    │
    ▼
[1] Fetch critical data (user, babies, UI config)
    │ Store in IndexedDB + Zustand
    ▼
[2] Render UI immediately from local state
    │
    ▼
[3] Background: Spawn Web Worker for historical data
    │ Progressively sync older logs
    │ Update IndexedDB without blocking UI
    ▼
[4] UI reactively updates via useLiveQuery
```

---

## Implementation Tasks

### Phase 1: Expand Dexie Schema

- [ ] Add `users` table to `local-db.ts`
- [ ] Add `uiConfig` table for preferences (theme, hand mode, default views)
- [ ] Add `syncStatus` table to track per-entity sync progress
- [ ] Update `LocalBaby` type with all needed UI fields

### Phase 2: Initial Sync Service

- [ ] Create `src/services/initial-sync.ts`
- [ ] Implement `fetchCriticalData()` - user, babies, recent logs
- [ ] Implement `storeCriticalData()` - write to IndexedDB
- [ ] Create sync status tracking (pending, syncing, complete, error)

### Phase 3: Background Sync Worker

- [ ] Create `src/workers/sync-worker.ts` (Web Worker)
- [ ] Implement chunked historical log fetching
- [ ] Add progress reporting back to main thread
- [ ] Handle worker termination on logout

### Phase 4: Zustand Store Updates

- [ ] Update `useBabyStore` to sync with IndexedDB
- [ ] Create `useUserStore` sync with IndexedDB
- [ ] Create `useSyncStore` for tracking sync status
- [ ] Implement hydration from IndexedDB on app load

### Phase 5: React Integration

- [ ] Create `useSyncOnLogin` hook
- [ ] Add sync status indicator in UI
- [ ] Implement `useLiveQuery` for reactive data
- [ ] Handle sync errors gracefully

---

## API Endpoints Needed

```
GET /api/sync/initial
  Returns: { user, babies, recentLogs, uiConfig }

GET /api/sync/logs?babyId=X&before=cursor&limit=100
  Returns: { logs, nextCursor, hasMore }
```

---

## Data Flow Diagram

```
┌─────────────────────────────────────────────────────────┐
│  Zustand Stores (Runtime State)                         │
│  - useBabyStore (activeBaby, allBabies)                 │
│  - useUserStore (user profile)                          │
│  - useSyncStore (sync status)                           │
└─────────────────┬───────────────────────────────────────┘
                  │ hydrate on load, persist on change
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Dexie (IndexedDB) - Durable Local Store                │
│  - users, babies, babyAccess                            │
│  - feedLogs, sleepLogs, etc.                            │
│  - uiConfig, syncMeta                                   │
└─────────────────┬───────────────────────────────────────┘
                  │ sync via API
                  ▼
┌─────────────────────────────────────────────────────────┐
│  Next.js API → Neon Postgres                            │
└─────────────────────────────────────────────────────────┘
```

---

## Success Criteria

- [ ] User sees data immediately after login (from IndexedDB)
- [ ] Historical logs load in background without UI jank
- [ ] Sync status visible to user
- [ ] App works offline after initial sync
- [ ] Web Worker doesn't block main thread
