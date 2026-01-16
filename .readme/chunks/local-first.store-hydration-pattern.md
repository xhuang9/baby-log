---
last_verified_at: 2026-01-16T00:00:00Z
source_paths:
  - src/components/SyncProvider.tsx
  - src/stores/useUserStore.ts
  - src/stores/useBabyStore.ts
  - src/templates/AppShell.tsx
---

# Store Hydration Pattern (Local-First)

## Purpose
Implements the local-first initialization flow for Zustand stores, ensuring instant app readiness with IndexedDB data while performing background sync with the server.

## Problem Solved

**Original Issue**: Components that read from stores (e.g., TimeSwiper) failed to load user settings because stores were never hydrated from IndexedDB, only from sessionStorage (which is empty on first visit).

**Root Cause**: No centralized hydration logic. Each component tried to read userId directly from stores without waiting for hydration to complete.

## Architecture

### Three-Stage Hydration Flow

```
┌─────────────────────────────────────────────────────────┐
│ Stage 1: IndexedDB Hydration (Instant, Offline-Safe)   │
└─────────────────────────────────────────────────────────┘
         ↓
  Store hydrated with local data
  isHydrated = true
         ↓
┌─────────────────────────────────────────────────────────┐
│ Stage 2: Immediate Render (No blocking)                │
└─────────────────────────────────────────────────────────┘
         ↓
  App renders with local data
         ↓
┌─────────────────────────────────────────────────────────┐
│ Stage 3: Background Sync (Non-blocking, Online only)   │
└─────────────────────────────────────────────────────────┘
  Fetch updates from server
  Merge with local data (LWW)
```

### Key Principle: **Hydrate First, Render Immediately**

- **Local-first**: Always try IndexedDB first (works offline)
- **Non-blocking**: Render as soon as local data is available
- **Background sync**: Fetch server updates in background (doesn't block UI)
- **Offline fallback**: If offline and no local data, show error with retry

## Implementation

### SyncProvider Component

Located at `src/components/SyncProvider.tsx`.

**Responsibilities:**
1. Hydrate user store from IndexedDB on mount
2. Hydrate baby store after user store is ready
3. Track hydration state with `isReady` flag
4. Perform background sync with server (non-blocking)
5. Handle offline scenarios

**Key Code:**

```typescript
export function SyncProvider({ children }: SyncProviderProps) {
  const { userId: clerkId, isLoaded: authLoaded } = useAuth();
  const [state, setState] = useState<SyncState>({
    isReady: false,
    isLoading: true,
    error: null,
  });

  const initialize = useCallback(async () => {
    // Step 1: Always hydrate from IndexedDB first
    await userStore.getState().hydrateFromIndexedDB();
    const user = userStore.getState().user;

    if (user) {
      // We have local data - hydrate baby store and render immediately
      await babyStore.getState().hydrateFromIndexedDB(user.localId);
      setState({ isReady: true, isLoading: false, error: null });

      // Step 2: Background sync (non-blocking, online only)
      if (navigator.onLine) {
        backgroundSync(clerkId).catch(err => {
          console.warn('Background sync failed (non-blocking):', err);
        });
      }
    } else {
      // No local data - need initial sync from server
      if (!navigator.onLine) {
        // Offline and no local data - can't proceed
        setState({
          isReady: false,
          isLoading: false,
          error: 'No local data available. Please connect to the internet to sync.',
        });
        return;
      }

      // Online - perform initial sync (blocking, required for first use)
      const result = await performInitialSyncAndHydrate(clerkId);
      setState(result.success
        ? { isReady: true, isLoading: false, error: null }
        : { isReady: false, isLoading: false, error: result.error }
      );
    }
  }, [authLoaded, clerkId]);

  // Render loading/error states or children when ready
  return state.isLoading ? <LoadingSpinner />
       : state.error ? <ErrorWithRetry error={state.error} />
       : <>{children}</>;
}
```

### Store Hydration Methods

Both `useUserStore` and `useBabyStore` implement dual hydration:

**useUserStore:**
```typescript
type UserStore = {
  user: StoredUser | null;
  isHydrated: boolean;
  hydrate: () => void; // sessionStorage only (fast, SSR-safe)
  hydrateFromIndexedDB: () => Promise<void>; // IndexedDB (durable)
};

hydrateFromIndexedDB: async () => {
  const users = await localDb.users.toArray();
  if (users.length > 0) {
    const localUser = users[0];
    const storedUser = {
      id: localUser.clerkId,
      localId: localUser.id,
      firstName: localUser.firstName,
      email: localUser.email,
      imageUrl: localUser.imageUrl ?? '',
    };

    // Update both store and sessionStorage
    set({ user: storedUser, isHydrated: true });
    sessionStorage.setItem('baby-log:user', JSON.stringify(storedUser));
  } else {
    set({ isHydrated: true });
  }
}
```

**useBabyStore:**
```typescript
type BabyStore = {
  activeBaby: ActiveBaby | null;
  allBabies: ActiveBaby[];
  isHydrated: boolean;
  hydrate: () => void; // sessionStorage only
  hydrateFromIndexedDB: (userId: number) => Promise<void>; // IndexedDB
};

hydrateFromIndexedDB: async (userId: number) => {
  // Get baby access records for this user
  const accessRecords = await localDb.babyAccess
    .where('oduserId')
    .equals(userId)
    .toArray();

  // Get baby details
  const babyIds = accessRecords.map(a => a.babyId);
  const babies = await localDb.babies.where('id').anyOf(babyIds).toArray();

  // Build ActiveBaby list and determine active baby
  const allBabies = buildActiveBabies(accessRecords, babies);
  const activeBaby = selectActiveBaby(allBabies, currentActiveBaby);

  // Update store and sessionStorage
  set({ activeBaby, allBabies, isHydrated: true });
  sessionStorage.setItem('baby-log:active-baby', JSON.stringify(activeBaby));
  sessionStorage.setItem('baby-log:all-babies', JSON.stringify(allBabies));
}
```

### Integration with AppShell

Located at `src/templates/AppShell.tsx`.

**Wrapping Order:**
```typescript
export const AppShell = ({ children, locale }: AppShellProps) => {
  return (
    <SyncProvider>  {/* ← Wraps entire app */}
      <SidebarProvider>
        <DatabaseHealthCheck />
        <OfflineBanner />
        <AppSidebar locale={locale} />
        <SidebarInset>
          <AppHeader />
          <main>{children}</main>
        </SidebarInset>
        <MobileBottomBar locale={locale} />
      </SidebarProvider>
    </SyncProvider>
  );
};
```

**Critical**: SyncProvider must wrap SidebarProvider to ensure stores are hydrated before any child components try to read from them.

## Usage Pattern: Waiting for Hydration

Components that read from stores must wait for hydration:

### Example: TimeSwiper Component

**Before (Broken):**
```typescript
// BAD: Reads userId immediately, before hydration
const userId = useUserStore(s => s.user?.localId);

useEffect(() => {
  if (!userId) return;

  // This never runs because userId is always undefined
  const config = await getUIConfig(userId);
  setSettings(config.data.timeSwiper);
}, [userId]);
```

**After (Fixed):**
```typescript
// GOOD: Wait for hydration flag
const user = useUserStore(s => s.user);
const userId = user?.localId;
const isHydrated = useUserStore(s => s.isHydrated);

useEffect(() => {
  // Wait for store to hydrate before loading settings
  if (!isHydrated) {
    console.log('Skipping - not hydrated yet');
    return;
  }

  if (!userId) {
    console.log('Skipping - no userId');
    return;
  }

  // Now safe to read from IndexedDB
  const config = await getUIConfig(userId);
  setSettings(config.data.timeSwiper);
}, [isHydrated, userId]);
```

### Pattern Summary

```typescript
// 1. Read both data and hydration flag
const data = useStore(s => s.data);
const isHydrated = useStore(s => s.isHydrated);

// 2. Wait for hydration in useEffect
useEffect(() => {
  if (!isHydrated) return; // ← Guard against premature reads

  // Now safe to use data
  doSomethingWith(data);
}, [isHydrated, data]);
```

## Dual Persistence Strategy

### sessionStorage (Fast Path)

- **Purpose**: Quick hydration for SSR/CSR transitions
- **When**: Client-side navigation, page refreshes within session
- **Limitations**: Cleared on tab close, not available across tabs

### IndexedDB (Durable Path)

- **Purpose**: Offline-first persistence, survives tab close
- **When**: App initialization, offline mode
- **Limitations**: Async (requires await), not SSR-safe

### Why Both?

1. **sessionStorage** enables instant reads in `getServerSideProps` or client-side navigation (no async)
2. **IndexedDB** enables offline-first persistence (survives browser restart)
3. **SyncProvider** bridges the gap: hydrates from IndexedDB on mount, syncs to sessionStorage

## Offline Behavior

### Scenario 1: Offline with Local Data
```
1. SyncProvider hydrates from IndexedDB
2. App renders immediately with local data
3. Background sync skipped (offline)
4. User can interact normally
```

### Scenario 2: Offline without Local Data (First Visit)
```
1. SyncProvider tries to hydrate from IndexedDB
2. No data found
3. Check network: offline
4. Show error: "Please connect to the internet to sync"
5. Provide retry button
```

### Scenario 3: Online with Local Data
```
1. SyncProvider hydrates from IndexedDB
2. App renders immediately
3. Background sync starts (non-blocking)
4. Server updates merged with local data (LWW)
5. UI updates if changes detected
```

### Scenario 4: Online without Local Data (First Login)
```
1. SyncProvider tries to hydrate from IndexedDB
2. No data found
3. Check network: online
4. Perform initial sync (blocking)
5. Hydrate stores with synced data
6. Render app
```

## Background Sync (Future Implementation)

**TODO**: Currently a placeholder. When implemented:

```typescript
async function backgroundSync(clerkId: string): Promise<void> {
  // 1. Pull updates from server
  const response = await fetch('/api/sync/pull', {
    method: 'POST',
    body: JSON.stringify({ lastSyncedAt: getLastSyncTimestamp() })
  });

  const { users, babies, babyAccess, logs } = await response.json();

  // 2. Merge updates with local data (LWW)
  await mergeRemoteUpdates(users, babies, babyAccess, logs);

  // 3. Update stores with merged data
  await userStore.getState().hydrateFromIndexedDB();
  const user = userStore.getState().user;
  if (user) {
    await babyStore.getState().hydrateFromIndexedDB(user.localId);
  }

  // 4. Update last sync timestamp
  setLastSyncTimestamp(new Date());
}
```

## Debug Logging

All hydration operations include console logs for debugging:

```typescript
console.log('[SyncProvider] Starting initialization for clerkId:', clerkId);
console.log('[SyncProvider] Step 1: Hydrating from IndexedDB...');
console.log('[SyncProvider] After hydration, user:', user);
console.log('[SyncProvider] Local user found, hydrating baby store...');
console.log('[SyncProvider] Online - starting background sync...');
```

**Purpose**: Trace hydration flow during development. Remove or gate behind feature flag in production.

## Gotchas

1. **Always check `isHydrated` before reading store data**: Prevents reading undefined/null values during initialization.

2. **SyncProvider must wrap entire app**: If placed too deep, child components may render before hydration completes.

3. **Don't call `hydrateFromIndexedDB` manually**: SyncProvider handles this. Manual calls can cause race conditions.

4. **sessionStorage is NOT durable**: Cleared on tab close. Always use IndexedDB as source of truth for offline scenarios.

5. **Background sync is non-blocking**: Errors don't prevent app from working. Always handle failures gracefully.

6. **Initial sync is blocking (first login)**: Required to populate IndexedDB. Show loading spinner during this phase.

## Related

- `.readme/chunks/local-first.initial-sync-service.md` - Initial data sync on login
- `.readme/chunks/local-first.bootstrap-storage.md` - Bootstrap API data storage
- `.readme/chunks/local-first.ui-config-storage.md` - UI settings persistence (uses same pattern)
- `.readme/chunks/local-first.offline-auth-bypass.md` - Offline authentication flow
