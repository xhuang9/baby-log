# Offline-First Architecture & Bootstrap Flow

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Large

---

## Overview

Define the SSR strategy for the dashboard, enable true offline mode, and consolidate all post-login account resolution into a single `/account/bootstrap` page that handles the complete sync and validation flow.

---

## Key Architectural Decision: Unified Bootstrap Page

### Current State (to be replaced)

Multiple separate pages handle post-login flows:
- `/account/resolve` - Server-side routing logic
- `/account/locked` - Locked account display
- `/account/request-access` - Request access form
- `/account/select-baby` - Baby picker for multi-baby users
- `/account/onboarding/baby` - New baby creation
- `/account/shared` - Pending invites handling

**Problems:**
1. Server-centric: Each page queries Postgres directly
2. No local-first: Doesn't sync to IndexedDB
3. Fragmented: User bounces between pages
4. Not offline-aware: Fails without network

### New State: `/account/bootstrap`

Single client-side page that:
1. Validates session
2. Syncs server data to IndexedDB
3. Handles all account states via state machine
4. Shows inline UI for each state (no redirects between states)
5. Only exits to `/overview` when fully ready

---

## Bootstrap State Machine

```
┌─────────────────────────────────────────────────────────────────────┐
│                        BOOTSTRAP STATES                              │
├─────────────────────────────────────────────────────────────────────┤
│                                                                      │
│  ┌──────────────┐                                                   │
│  │   INIT       │ Check Clerk session, check IndexedDB              │
│  └──────┬───────┘                                                   │
│         │                                                            │
│         ├──────────────────┬──────────────────┐                     │
│         │                  │                  │                     │
│         ▼                  ▼                  ▼                     │
│  ┌──────────────┐   ┌──────────────┐   ┌──────────────┐            │
│  │ OFFLINE_OK   │   │ SYNCING      │   │ NO_SESSION   │            │
│  │              │   │              │   │              │            │
│  │ Has local    │   │ Fetching     │   │ Redirect to  │            │
│  │ data, skip   │   │ from server  │   │ /sign-in     │            │
│  │ server sync  │   │              │   │              │            │
│  └──────┬───────┘   └──────┬───────┘   └──────────────┘            │
│         │                  │                                        │
│         └────────┬─────────┘                                        │
│                  │                                                   │
│                  ▼                                                   │
│         ┌──────────────┐                                            │
│         │ VALIDATING   │ Check account state from local data        │
│         └──────┬───────┘                                            │
│                │                                                     │
│    ┌───────────┼───────────┬───────────┬───────────┬──────────┐    │
│    ▼           ▼           ▼           ▼           ▼          ▼    │
│ ┌───────┐ ┌─────────┐ ┌─────────┐ ┌─────────┐ ┌────────┐ ┌──────┐ │
│ │LOCKED │ │NO_BABY  │ │PENDING  │ │SELECT   │ │INVITES │ │READY │ │
│ │       │ │         │ │_REQUEST │ │_BABY    │ │        │ │      │ │
│ │Sign   │ │Create   │ │Show     │ │Pick     │ │Accept/ │ │Exit  │ │
│ │out    │ │baby     │ │pending  │ │baby     │ │decline │ │to    │ │
│ │only   │ │form     │ │request  │ │from     │ │invites │ │/over │ │
│ │       │ │         │ │status   │ │list     │ │        │ │view  │ │
│ └───────┘ └────┬────┘ └────┬────┘ └────┬────┘ └───┬────┘ └──────┘ │
│                │           │           │          │                 │
│                └───────────┴───────────┴──────────┘                 │
│                                    │                                 │
│                                    ▼                                 │
│                            ┌──────────────┐                         │
│                            │   READY      │ → redirect to /overview │
│                            └──────────────┘                         │
│                                                                      │
└─────────────────────────────────────────────────────────────────────┘
```

---

## Bootstrap Flow Details

### State: INIT

**Purpose:** Determine starting point based on session and local data.

```typescript
type InitResult =
  | { next: 'NO_SESSION' }           // No Clerk session
  | { next: 'OFFLINE_OK', data: LocalData }  // Has local data, offline OK
  | { next: 'SYNCING' }              // Need to sync from server
  | { next: 'SYNC_ERROR', error: string }    // Network error, no local data
```

**Logic:**
1. Check if Clerk session exists → if not, redirect to `/sign-in`
2. Check if online:
   - If offline AND has local user data → `OFFLINE_OK`
   - If offline AND no local data → `SYNC_ERROR` (show "need network" message)
3. If online → `SYNCING`

### State: SYNCING

**Purpose:** Fetch all data from server and store in IndexedDB.

**API Call:** `GET /api/bootstrap`

**Returns:**
```typescript
type BootstrapResponse = {
  user: {
    id: number;
    clerkId: string;
    email: string | null;
    firstName: string | null;
    locked: boolean;
    defaultBabyId: number | null;
  };
  accountState:
    | { type: 'locked' }
    | { type: 'no_baby' }
    | { type: 'pending_request', request: AccessRequest }
    | { type: 'has_invites', invites: Invite[] }
    | { type: 'select_baby', babies: Baby[] }
    | { type: 'ready', activeBaby: Baby };
  syncData: {
    babies: Baby[];
    babyAccess: BabyAccess[];
    recentLogs: FeedLog[];  // Last 7 days
    uiConfig: UIConfig | null;
  };
};
```

**On Success:**
1. Store all `syncData` in IndexedDB
2. Store sync timestamp
3. Transition to `VALIDATING`

**On Failure:**
- If has local data → `OFFLINE_OK` (use stale data)
- If no local data → `SYNC_ERROR` (show retry UI)

### State: VALIDATING

**Purpose:** Determine which account state to show based on local data.

**Logic (same as current resolveAccountContext but reads from IndexedDB):**
1. Read user from IndexedDB
2. If `user.locked` → `LOCKED`
3. Read babyAccess from IndexedDB
4. If no babies:
   - Check pending requests → `PENDING_REQUEST`
   - Check pending invites → `INVITES`
   - Otherwise → `NO_BABY`
5. If multiple babies and no default → `SELECT_BABY`
6. Otherwise → `READY`

### State: LOCKED

**UI:** "Account locked" message with sign-out button only.
**Actions:** Sign out → redirect to `/sign-in`

### State: NO_BABY

**UI:** Inline baby creation form (same as current onboarding/baby).
**Actions:**
- Create baby → API call → re-sync → `READY`
- Request access → `PENDING_REQUEST`

### State: PENDING_REQUEST

**UI:** Show pending request status with option to cancel.
**Actions:**
- Cancel request → delete → `NO_BABY`
- Refresh → re-check status

### State: INVITES

**UI:** List of pending invites to accept/decline.
**Actions:**
- Accept invite → API call → re-sync → `READY`
- Decline invite → API call → re-check state

### State: SELECT_BABY

**UI:** Baby picker cards (same as current select-baby).
**Actions:**
- Select baby → update default → `READY`

### State: READY

**Actions:** Immediate redirect to `/overview`

---

## Offline Robustness Matrix

| Scenario | Online | Has Local Data | Behavior |
|----------|--------|----------------|----------|
| Fresh login | Yes | No | SYNCING → full sync → VALIDATING |
| Return visit | Yes | Yes | SYNCING → refresh sync → VALIDATING |
| Return visit | No | Yes | OFFLINE_OK → VALIDATING (use local) |
| Fresh login | No | No | SYNC_ERROR → "Connect to continue" |
| Session expired | Yes | Yes | SYNCING → re-auth if needed |
| Session expired | No | Yes | OFFLINE_OK → queue warning |

---

## Error Handling

### Network Errors During Sync

```typescript
type SyncError =
  | { type: 'network', canRetry: true }
  | { type: 'auth', message: 'Session expired' }
  | { type: 'server', message: string };
```

**Recovery:**
- Network error with local data → Use stale data, show "offline mode" banner
- Network error without local data → Show retry button
- Auth error → Redirect to `/sign-in`
- Server error → Show error message with retry

### Stale Data Handling

When using offline data, show subtle indicator:
- "Last synced 2 hours ago"
- "Offline mode - changes will sync when online"

---

## Implementation Plan

### Phase 1: Bootstrap API & Page Shell

- [ ] Create `GET /api/bootstrap` endpoint
  - Returns user, accountState, and syncData
  - Single query that resolves all account state
- [ ] Create `/account/bootstrap/page.tsx` (client component)
- [ ] Implement state machine hook `useBootstrapState`
- [ ] Add loading/transition UI between states

### Phase 2: State UI Components

- [ ] `BootstrapLocked` - locked account display
- [ ] `BootstrapNoBaby` - inline baby creation form
- [ ] `BootstrapPendingRequest` - pending request status
- [ ] `BootstrapInvites` - invite list with accept/decline
- [ ] `BootstrapSelectBaby` - baby picker grid
- [ ] `BootstrapSyncError` - error with retry

### Phase 3: IndexedDB Integration

- [ ] Implement `storeBootstrapData()` - write sync data to Dexie
- [ ] Implement `readLocalAccountState()` - determine state from local data
- [ ] Add sync timestamp tracking
- [ ] Handle IndexedDB quota errors

### Phase 4: Offline Detection & Handling

- [ ] Create `useOnlineStatus` hook
- [ ] Implement offline-first flow in state machine
- [ ] Add "offline mode" banner component
- [ ] Show stale data warnings appropriately

### Phase 5: Migration & Cleanup

- [ ] Update Clerk middleware to redirect auth users to `/account/bootstrap`
- [ ] Remove old pages:
  - `/account/resolve`
  - `/account/locked`
  - `/account/request-access`
  - `/account/select-baby`
  - `/account/shared`
- [ ] Update any remaining redirects to use bootstrap

### Phase 6: Background Sync After Bootstrap

- [ ] After READY state, spawn Web Worker for historical sync
- [ ] Implement progressive log sync (older than 7 days)
- [ ] Add sync progress indicator in overview

---

## SSR Strategy

| Route | Strategy | Reason |
|-------|----------|--------|
| Marketing pages | Full SSR | SEO, fast initial load |
| `/sign-in`, `/sign-up` | SSR | Clerk needs server |
| `/account/bootstrap` | Client-only | State machine, IndexedDB access |
| Dashboard shell | SSR | Fast perceived load, cacheable |
| Dashboard content | Client-only | Data from IndexedDB |

---

## Security Considerations

### Session Validation

1. `/api/bootstrap` validates Clerk session server-side
2. If session invalid → return 401 → client redirects to sign-in
3. IndexedDB data is cleared on sign-out

### Offline Session Handling

1. Store `lastValidatedAt` timestamp in IndexedDB
2. If offline > 24 hours, show warning: "Session may have expired"
3. On reconnect: validate session before syncing

### Data Access Control

1. Server always validates baby access permissions
2. Local data is cached version of server state
3. Any local tampering is corrected on next sync
4. Mutations go through outbox → server validates

---

## Component Structure

```
/account/bootstrap/
├── page.tsx                    # Main bootstrap page
├── BootstrapProvider.tsx       # State machine context
├── states/
│   ├── BootstrapInit.tsx       # Initial loading
│   ├── BootstrapSyncing.tsx    # Sync progress
│   ├── BootstrapLocked.tsx     # Account locked
│   ├── BootstrapNoBaby.tsx     # Create first baby
│   ├── BootstrapPendingRequest.tsx
│   ├── BootstrapInvites.tsx
│   ├── BootstrapSelectBaby.tsx
│   └── BootstrapError.tsx      # Sync/network errors
└── hooks/
    └── useBootstrapMachine.ts  # XState or useReducer machine
```

---

## Success Criteria

- [ ] Single page handles all post-login states
- [ ] Works offline with existing local data
- [ ] Clear error messages when network required
- [ ] Syncs all critical data before allowing app access
- [ ] No server round-trips after initial bootstrap (until next login)
- [ ] Graceful degradation when offline
- [ ] Old account pages removed
