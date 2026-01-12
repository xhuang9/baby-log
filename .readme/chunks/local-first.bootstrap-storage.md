---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/hooks/useBootstrapMachine.ts
  - src/lib/local-db/helpers/sync-status.ts
  - src/lib/local-db/types/sync.ts
  - src/stores/useSyncStore.ts
---

# Bootstrap Data Storage in IndexedDB

## Purpose
Documents how bootstrap data from `/api/bootstrap` is stored in IndexedDB for offline access and how sync status is tracked.

## Bootstrap Storage Flow

When `useBootstrapMachine` receives a successful response from `/api/bootstrap`, it stores all data in IndexedDB:

### 1. User Data

```typescript
await saveLocalUser({
  id: response.user.id,           // Postgres ID
  clerkId: response.user.clerkId, // Clerk user ID
  email: response.user.email,
  firstName: response.user.firstName,
  imageUrl: response.user.imageUrl,
  defaultBabyId: response.user.defaultBabyId,
  locked: response.user.locked,
  createdAt: new Date(response.user.createdAt),
  updatedAt: new Date(response.user.updatedAt),
});
```

Stored in: `localDb.users` table

### 2. Baby Data

```typescript
await saveBabies(response.syncData.babies.map(baby => ({
  id: baby.id,
  name: baby.name,
  birthDate: baby.birthDate ? new Date(baby.birthDate) : null,
  gender: baby.gender,
  birthWeightG: baby.birthWeightG,
  archivedAt: baby.archivedAt ? new Date(baby.archivedAt) : null,
  ownerUserId: baby.ownerUserId,
  createdAt: new Date(baby.createdAt),
  updatedAt: new Date(baby.updatedAt),
})));
```

Stored in: `localDb.babies` table

### 3. Baby Access Records

```typescript
await saveBabyAccess(response.syncData.babyAccess.map(access => ({
  oduserId: access.oduserId,
  babyId: access.babyId,
  accessLevel: access.accessLevel,
  caregiverLabel: access.caregiverLabel,
  lastAccessedAt: access.lastAccessedAt ? new Date(access.lastAccessedAt) : null,
})));
```

Stored in: `localDb.babyAccess` table

### 4. Activity Logs (Last 7 Days)

**Feed Logs**:
```typescript
await saveFeedLogs(response.syncData.recentFeedLogs.map(log => ({
  id: log.id,
  babyId: log.babyId,
  loggedByUserId: log.loggedByUserId,
  method: log.method as 'breast' | 'bottle',
  startedAt: new Date(log.startedAt),
  endedAt: log.endedAt ? new Date(log.endedAt) : null,
  durationMinutes: log.durationMinutes,
  amountMl: log.amountMl,
  isEstimated: log.isEstimated,
  endSide: log.endSide as 'left' | 'right' | null,
  notes: null,
  createdAt: new Date(log.createdAt),
  updatedAt: new Date(log.updatedAt),
})));
```

Stored in: `localDb.feedLogs` table

**Sleep Logs**: Stored in `localDb.sleepLogs`
**Nappy Logs**: Stored in `localDb.nappyLogs`

### 5. Sync Status Tracking

After all data is stored, update sync status:

```typescript
await updateSyncStatus('bootstrap', 'complete', {
  lastSyncedAt: new Date(response.syncedAt).toISOString(),
});
```

Stored in: `localDb.syncStatus` table with key `'bootstrap'`

## Sync Status System

**Location**: `src/lib/local-db/helpers/sync-status.ts`

### Sync Entity Types

```typescript
type SyncEntityType =
  | 'user'
  | 'babies'
  | 'baby_access'
  | 'feed_logs'
  | 'sleep_logs'
  | 'nappy_logs'
  | 'ui_config'
  | 'bootstrap'; // Tracks the unified bootstrap sync
```

### Sync Status Values

```typescript
type SyncStatusValue = 'idle' | 'syncing' | 'complete' | 'error';
```

### Sync Status Schema

```typescript
type LocalSyncStatus = {
  entityType: SyncEntityType; // Primary key
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  progress: number | null; // 0-100 for progressive sync
};
```

### Helper Functions

**Get Sync Status**:
```typescript
const status = await getSyncStatus('bootstrap');
// Returns { entityType: 'bootstrap', status: 'complete', lastSyncAt: Date, ... }
```

**Update Sync Status**:
```typescript
await updateSyncStatus('bootstrap', 'complete', {
  lastSyncedAt: new Date().toISOString(),
});
```

**Get All Sync Statuses**:
```typescript
const allStatuses = await getAllSyncStatuses();
// Returns array of all sync status records
```

## Zustand Sync Store

**Location**: `src/stores/useSyncStore.ts`

Tracks sync status in memory for reactive UI updates:

```typescript
type SyncStore = {
  // Per-entity sync status
  entities: Record<SyncEntityType, EntitySyncStatus>;

  // Background worker sync progress
  backgroundSync: SyncProgress;

  // Overall sync state
  isInitialSyncComplete: boolean;
  isBackgroundSyncRunning: boolean;

  // Actions
  setEntityStatus: (entity: SyncEntityType, status: EntitySyncStatus) => void;
  setBackgroundProgress: (progress: SyncProgress) => void;
  hydrateFromIndexedDB: () => Promise<void>;
};
```

**Hydration Pattern**:

```typescript
// On app load, hydrate sync store from IndexedDB
const syncStore = useSyncStore.getState();
await syncStore.hydrateFromIndexedDB();

// Check if initial sync was completed
const criticalEntities: SyncEntityType[] = ['user', 'babies', 'baby_access'];
const allCriticalComplete = criticalEntities.every(
  entity => entities[entity].status === 'complete',
);
```

## Offline Fallback Behavior

When `useBootstrapMachine` detects offline mode or API error:

1. **Check IndexedDB for cached data**:
   ```typescript
   const { hasData, lastSyncedAt } = await checkLocalData();
   ```

2. **If cached data exists**:
   - Transition to `offline_ok` state
   - Hydrate Zustand stores from IndexedDB
   - Display `OfflineBanner` with last sync time

3. **If no cached data**:
   - Transition to `sync_error` state
   - Show error message: "You need an internet connection to sign in for the first time"

## Store Hydration from IndexedDB

When using cached data, the bootstrap machine hydrates Zustand stores:

```typescript
// Hydrate user store
const userStore = useUserStore.getState();
await userStore.hydrateFromIndexedDB();

const user = useUserStore.getState().user;
if (user) {
  // Hydrate baby store
  const babyStore = useBabyStore.getState();
  await babyStore.hydrateFromIndexedDB(user.localId);

  const activeBaby = useBabyStore.getState().activeBaby;
  if (activeBaby) {
    dispatch({ type: 'GO_READY', activeBaby });
    onReady?.(activeBaby);
  }
}
```

## When to Read This

- Understanding how bootstrap data is cached for offline use
- Implementing sync indicators in the UI
- Debugging why offline mode isn't working
- Adding new entity types to sync system
- Working with sync status tracking

## Related Chunks

- `.readme/chunks/account.bootstrap-unified-flow.md` - Bootstrap API and state machine
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema
- `.readme/chunks/local-first.sync-status-tracking.md` - Sync status UI patterns
