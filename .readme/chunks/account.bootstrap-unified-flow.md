---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - src/app/[locale]/api/bootstrap/route.ts
  - src/app/[locale]/(auth)/account/bootstrap/page.tsx
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/types/bootstrap.ts
  - src/app/[locale]/(auth)/layout.tsx
---

# Bootstrap Unified Post-Login Flow

## Purpose
Documents the unified bootstrap system that replaces the previous multi-page account resolution flow with a single endpoint and state machine for post-authentication flows.

## The Problem This Solves

**Before**: Account resolution was split across multiple pages:
- `/account/resolve` - Entry point
- `/account/onboarding/baby` - New user flow
- `/account/select-baby` - Multi-baby selection
- `/account/shared` - Invite acceptance
- `/account/request-access` - Access request page

Each page made separate API calls, leading to:
- Multiple round trips to the server
- Race conditions during navigation
- Duplicated account state logic
- Poor offline support (no cached state)

**After**: Single `/api/bootstrap` endpoint + unified `/account/bootstrap` page:
- One API call returns complete account state + sync data
- State machine handles all account states in one place
- Offline fallback using IndexedDB cache
- Cleaner separation of concerns

## Architecture

### 1. Bootstrap API Endpoint

**Location**: `src/app/[locale]/api/bootstrap/route.ts`

**Responsibilities**:
1. Validates Clerk session
2. Upserts user in Postgres
3. Determines account state (locked, no_baby, pending_request, etc.)
4. Returns all sync data needed for offline-first operation

**API Contract**:

```typescript
GET /api/bootstrap

Response: BootstrapResponse = {
  user: BootstrapUser;
  accountState: AccountState;
  syncData: BootstrapSyncData;
  syncedAt: string;
}
```

**Account State Types**:
- `locked` - User account is locked
- `no_baby` - New user, needs onboarding
- `pending_request` - User has sent an access request, waiting for approval
- `has_invites` - User has pending invites to accept
- `select_baby` - User has multiple babies, needs to pick one
- `ready` - User is ready to use the app (has active baby)

**Sync Data Included** (last 7 days):
- All babies user has access to
- Baby access records (permissions)
- Recent feed logs
- Recent sleep logs
- Recent nappy logs

### 2. Bootstrap Page Component

**Location**: `src/app/[locale]/(auth)/account/bootstrap/page.tsx`

**Responsibilities**:
- Renders state-specific UI components
- Handles redirects based on state machine output
- Provides retry/select baby actions

**State Components** (in `states/` subfolder):
- `BootstrapInit.tsx` - Initial loading state
- `BootstrapSyncing.tsx` - Syncing from server
- `BootstrapOffline.tsx` - Using cached data (offline mode)
- `BootstrapSyncError.tsx` - Sync failed, show retry
- `BootstrapLocked.tsx` - Account locked message
- `BootstrapNoBaby.tsx` - Redirect to onboarding
- `BootstrapPendingRequest.tsx` - Show pending request status
- `BootstrapInvites.tsx` - Redirect to invite acceptance
- `BootstrapSelectBaby.tsx` - Show baby selection UI
- `BootstrapReady.tsx` - Redirect to overview (implicit)

### 3. Bootstrap State Machine Hook

**Location**: `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts`

**Responsibilities**:
- Manages state transitions using useReducer
- Fetches bootstrap data from API
- Stores data in IndexedDB
- Updates Zustand stores
- Handles offline fallback

**State Machine Flow**:

```
init
  ↓
[Check Clerk auth]
  ↓
syncing
  ↓
[Fetch /api/bootstrap]
  ↓
[Online success] → accountState type → (locked|no_baby|pending_request|has_invites|select_baby|ready)
  ↓
[Offline or error] → offline_ok (if has IndexedDB cache) OR sync_error (no cache)
```

**Key Features**:
- **Offline Support**: Falls back to IndexedDB if network unavailable
- **Store Hydration**: Updates both IndexedDB and Zustand stores
- **Retry Logic**: Allows user to retry failed syncs
- **Baby Selection**: Handles multi-baby selection without page reload

## Bootstrap Types

**Location**: `src/types/bootstrap.ts`

Defines all types used across the bootstrap system:
- `BootstrapUser` - User data from server
- `BootstrapBaby` - Baby entity
- `BootstrapBabyAccess` - Access control record
- `BootstrapInvite` - Pending invite
- `BootstrapPendingRequest` - Outgoing access request
- `AccountState` - Discriminated union of all account states
- `BootstrapSyncData` - Sync payload structure
- `BootstrapResponse` - Complete API response
- `BootstrapMachineState` - State machine states
- `BootstrapMachineAction` - State machine actions

## Integration Points

### Auth Layout Configuration

**Location**: `src/app/[locale]/(auth)/layout.tsx`

Clerk is configured to redirect to `/account/bootstrap` after sign-in/sign-up:

```typescript
<ClerkProvider
  signInFallbackRedirectUrl={accountBootstrapUrl}
  signUpFallbackRedirectUrl={accountBootstrapUrl}
>
```

This ensures ALL authenticated users pass through the bootstrap flow.

### Proxy Configuration

**Location**: `src/proxy.ts`

Bootstrap API routes are protected:

```typescript
const isProtectedRoute = createRouteMatcher([
  '/api/bootstrap(.*)',
  '/:locale/api/bootstrap(.*)',
  // ...
]);
```

## Offline Behavior

**Online**:
1. Fetch from `/api/bootstrap`
2. Store in IndexedDB
3. Update Zustand stores
4. Transition to appropriate state

**Offline**:
1. Check IndexedDB for cached bootstrap data
2. If found: Load cached data, show `offline_ok` state
3. If not found: Show `sync_error` with message "You need an internet connection to sign in for the first time"
4. Display `OfflineBanner` component indicating stale data

**Reconnection**:
- `OfflineBanner` shows "Back online" message
- User can trigger manual sync via retry button

## Migration from Old System

**Old Flow**:
```
/account/resolve
  → /account/onboarding/baby (if no baby)
  → /account/shared (if has invites)
  → /account/request-access (if pending request)
  → /account/select-baby (if multiple babies)
  → /overview (if ready)
```

**New Flow**:
```
/account/bootstrap
  → Render state-specific UI in-place
  → Redirect only when necessary (onboarding, invites, ready)
```

**Benefits**:
- Fewer page loads (single endpoint call)
- Better offline support (cached state)
- Cleaner code (one state machine vs. multiple pages)
- Easier to add new account states

## When to Read This

- Working on post-authentication flows
- Adding new account states (e.g., "trial_expired")
- Debugging redirect loops after login
- Implementing offline-first features
- Understanding how user/baby data is loaded
- Preparing for iOS app (same bootstrap API can be reused)

## Related Chunks

- `.readme/chunks/local-first.initial-sync-service.md` - How bootstrap data is stored in IndexedDB
- `.readme/chunks/account.state-sync-pattern.md` - How Zustand stores are updated
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk redirect configuration
