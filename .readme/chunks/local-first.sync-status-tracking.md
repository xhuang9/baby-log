---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/stores/useSyncStore.ts
  - src/lib/local-db/helpers/sync-status.ts
  - src/lib/local-db/types/sync.ts
---

# Sync Status Tracking

## Purpose
Tracks the synchronization status of different data entities (user, babies, logs) to show accurate sync indicators in the UI and coordinate sync operations. Status is persisted in IndexedDB and hydrated into Zustand for reactive updates.

## Key Files

| File | Purpose |
|------|---------|
| `src/stores/useSyncStore.ts` | Zustand store for runtime sync state |
| `src/lib/local-db/helpers/sync-status.ts` | IndexedDB CRUD operations |
| `src/lib/local-db/types/sync.ts` | Type definitions |

## Architecture

### Two-Layer State Management

```
┌─────────────────────────────────────────────────────────┐
│ Zustand (Runtime State)                                 │
│                                                          │
│  useSyncStore {                                         │
│    entities: {                                          │
│      user: { status: 'complete', lastSyncAt: Date },   │
│      feed_logs: { status: 'syncing', progress: 0.5 }   │
│    },                                                   │
│    backgroundSync: { status: 'syncing', ... }          │
│  }                                                      │
└───────────────────┬─────────────────────────────────────┘
                    │ Persisted to/from
┌───────────────────▼─────────────────────────────────────┐
│ IndexedDB (Durable Storage)                             │
│                                                          │
│  syncStatus table {                                     │
│    entityType (PK): 'user',                            │
│    status: 'complete',                                 │
│    lastSyncAt: Date,                                   │
│    errorMessage: null                                  │
│  }                                                      │
└─────────────────────────────────────────────────────────┘
```

**Why both?**
- **Zustand**: Fast in-memory access for UI rendering
- **IndexedDB**: Survives page refresh, enables offline-first

## Entity Types

### SyncEntityType

```typescript
type SyncEntityType =
  | 'user'               // User profile
  | 'babies'             // All accessible babies
  | 'baby_access'        // Access permissions
  | 'feed_logs'          // Feed log history
  | 'sleep_logs'         // Sleep log history
  | 'nappy_logs'         // Nappy log history
  | 'ui_config';         // UI preferences
```

Each entity syncs independently. If `feed_logs` fails, other entities can still complete.

### SyncStatusValue

```typescript
type SyncStatusValue =
  | 'idle'      // Not started or reset
  | 'syncing'   // Currently fetching/storing
  | 'complete'  // Successfully synced
  | 'error';    // Failed with error
```

## Sync Status Schema

### IndexedDB Table

```typescript
type LocalSyncStatus = {
  entityType: SyncEntityType;     // Primary key
  status: SyncStatusValue;
  lastSyncAt: Date | null;        // When last completed
  errorMessage: string | null;    // Error details if status='error'
  progress: number | null;        // 0-1 for in-progress syncs
};
```

**Index**: `entityType` (primary key)

### Zustand Store Shape

```typescript
type EntitySyncStatus = {
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  errorMessage: string | null;
  progress: number | null;
};

type SyncStore = {
  // Per-entity sync status
  entities: Record<SyncEntityType, EntitySyncStatus>;

  // Background worker progress
  backgroundSync: SyncProgress;

  // Overall flags
  isInitialSyncComplete: boolean;
  isBackgroundSyncRunning: boolean;

  // Actions
  setEntityStatus: (entity: SyncEntityType, status: EntitySyncStatus) => void;
  setBackgroundProgress: (progress: SyncProgress) => void;
  hydrateFromIndexedDB: () => Promise<void>;
  reset: () => void;
};
```

## Usage Patterns

### Updating Sync Status

```typescript
import { updateSyncStatus } from '@/lib/local-db';

// Start sync
await updateSyncStatus('feed_logs', 'syncing');

try {
  await fetchAndStoreLogs();
  // Complete
  await updateSyncStatus('feed_logs', 'complete');
} catch (error) {
  // Error with message
  await updateSyncStatus('feed_logs', 'error', {
    errorMessage: error.message,
  });
}
```

### Reading Sync Status

```typescript
import { useSyncStore } from '@/stores/useSyncStore';

function SyncIndicator() {
  const feedStatus = useSyncStore(s => s.entities.feed_logs);

  if (feedStatus.status === 'syncing') {
    return <Spinner>Syncing feed logs...</Spinner>;
  }

  if (feedStatus.status === 'error') {
    return <Error>{feedStatus.errorMessage}</Error>;
  }

  if (feedStatus.status === 'complete' && feedStatus.lastSyncAt) {
    return <Text>Last synced {formatDate(feedStatus.lastSyncAt)}</Text>;
  }

  return null;
}
```

### Overall Sync Status

```typescript
import { useOverallSyncStatus } from '@/stores/useSyncStore';

function AppShell() {
  const overallStatus = useOverallSyncStatus();
  // Returns: 'idle' | 'syncing' | 'complete' | 'error'

  if (overallStatus === 'syncing') {
    return <TopBanner>Syncing data...</TopBanner>;
  }

  // Render app
}
```

**Logic**:
- If ANY entity is `'error'` → overall is `'error'`
- Else if ANY entity is `'syncing'` → overall is `'syncing'`
- Else if ALL entities are `'complete'` → overall is `'complete'`
- Else → `'idle'`

## Initial Sync Complete Flag

### Purpose
Determines if critical data is loaded and app is ready to render.

### Criteria

```typescript
const criticalEntities: SyncEntityType[] = [
  'user',
  'babies',
  'baby_access'
];

const isInitialSyncComplete = criticalEntities.every(
  entity => entities[entity].status === 'complete'
);
```

**Why these entities?**
- `user`: Needed for auth context
- `babies`: Needed to display baby list
- `baby_access`: Needed for permission checks

**Not included**:
- `feed_logs`, `sleep_logs`, etc.: Nice to have, not blocking

### Usage in Auth Layout

```typescript
function AuthLayout({ children }) {
  const isReady = useSyncStore(s => s.isInitialSyncComplete);

  if (!isReady) {
    return <LoadingSpinner />;
  }

  return children;
}
```

## Background Sync Progress

### SyncProgress Type

```typescript
type SyncProgress = {
  status: 'idle' | 'syncing' | 'complete' | 'error';
  currentBabyId: number | null;   // Which baby is syncing
  totalBabies: number;
  completedBabies: number;
  totalLogs: number;               // Total fetched so far
  error: string | null;
};
```

### Tracking Worker Progress

```typescript
import { syncWorkerManager } from '@/services/sync-worker-manager';
import { useSyncStore } from '@/stores/useSyncStore';

const setBackgroundProgress = useSyncStore(s => s.setBackgroundProgress);

syncWorkerManager.startSync(babyIds, (progress) => {
  setBackgroundProgress(progress);
});
```

### Displaying Progress

```typescript
function BackgroundSyncBanner() {
  const progress = useSyncStore(s => s.backgroundSync);

  if (progress.status !== 'syncing') return null;

  return (
    <Banner>
      Syncing historical data...
      {progress.completedBabies} / {progress.totalBabies} babies
      ({progress.totalLogs} logs fetched)
    </Banner>
  );
}
```

## Hydration from IndexedDB

### On App Load

```typescript
// In root layout or auth provider
useEffect(() => {
  useSyncStore.getState().hydrateFromIndexedDB();
}, []);
```

**What it does:**
1. Reads all `syncStatus` records from IndexedDB
2. Populates Zustand store's `entities` map
3. Checks if initial sync was completed
4. Sets `isInitialSyncComplete` flag

### Why Hydrate?

User refreshes page while sync is in progress:
- IndexedDB persists sync status
- On reload, Zustand hydrates from IndexedDB
- UI shows correct "syncing" state immediately

## Error Handling

### Per-Entity Errors

```typescript
import { useSyncErrors } from '@/stores/useSyncStore';

function SyncErrorBanner() {
  const errors = useSyncErrors();
  // Returns: string[] of error messages

  if (errors.length === 0) return null;

  return (
    <ErrorBanner>
      {errors.map(error => (
        <div key={error}>{error}</div>
      ))}
    </ErrorBanner>
  );
}
```

### Retry Logic

```typescript
async function retrySyncEntity(entity: SyncEntityType) {
  await updateSyncStatus(entity, 'syncing');

  try {
    // Retry the sync operation
    await performSync(entity);
    await updateSyncStatus(entity, 'complete');
  } catch (error) {
    await updateSyncStatus(entity, 'error', {
      errorMessage: error.message,
    });
  }
}
```

## Reset on Logout

### Clear Sync State

```typescript
import { useSyncStore } from '@/stores/useSyncStore';
import { localDb } from '@/lib/local-db';

async function handleLogout() {
  // Clear Zustand
  useSyncStore.getState().reset();

  // Clear IndexedDB
  await localDb.delete();

  // Redirect to sign-in
  window.location.href = '/sign-in';
}
```

**Why clear?**
- Prevent stale data from previous user
- Avoid showing wrong sync status after re-login
- Security: don't leak data between users

## Progress Tracking (Optional)

### Use Case
Show percentage for large sync operations.

```typescript
await updateSyncStatus('feed_logs', 'syncing', {
  progress: 0.5  // 50% complete
});
```

### UI Display

```typescript
function SyncProgress() {
  const feedStatus = useSyncStore(s => s.entities.feed_logs);

  if (feedStatus.status === 'syncing' && feedStatus.progress) {
    return (
      <ProgressBar value={feedStatus.progress * 100}>
        {Math.round(feedStatus.progress * 100)}% synced
      </ProgressBar>
    );
  }

  return null;
}
```

## Gotchas

### Race Conditions

**Problem**: Multiple sync operations update same entity concurrently.

**Solution**: Use timestamp checks or abort previous sync before starting new one.

```typescript
let currentSyncAbort: AbortController | null = null;

async function startSync(entity: SyncEntityType) {
  // Abort previous sync
  currentSyncAbort?.abort();
  currentSyncAbort = new AbortController();

  await updateSyncStatus(entity, 'syncing');
  // ... sync with abort signal
}
```

### Stale Status After Error

**Problem**: Error status persists even after fixing the issue.

**Solution**: Retry button that resets status to `'syncing'` before re-attempting.

```typescript
<Button onClick={() => retrySyncEntity('feed_logs')}>
  Retry Sync
</Button>
```

### IndexedDB Transaction Limits

**Problem**: Too many concurrent `updateSyncStatus()` calls can exhaust IndexedDB transaction pool.

**Solution**: Batch updates or use single transaction for related updates.

```typescript
// ❌ Bad: Multiple transactions
await updateSyncStatus('feed_logs', 'syncing');
await updateSyncStatus('sleep_logs', 'syncing');
await updateSyncStatus('nappy_logs', 'syncing');

// ✅ Better: Batch updates (if implementing)
await batchUpdateSyncStatus([
  { entity: 'feed_logs', status: 'syncing' },
  { entity: 'sleep_logs', status: 'syncing' },
  { entity: 'nappy_logs', status: 'syncing' },
]);
```

## Testing

### Mock Sync Store

```typescript
import { create } from 'zustand';

const mockSyncStore = create<SyncStore>(() => ({
  entities: {
    user: { status: 'complete', lastSyncAt: new Date(), errorMessage: null, progress: null },
    feed_logs: { status: 'syncing', lastSyncAt: null, errorMessage: null, progress: 0.5 },
    // ...
  },
  // ...
}));
```

### Test Hydration

```typescript
it('should hydrate from IndexedDB', async () => {
  // Seed IndexedDB
  await updateSyncStatus('user', 'complete');

  // Hydrate store
  await useSyncStore.getState().hydrateFromIndexedDB();

  // Assert
  const userStatus = useSyncStore.getState().entities.user;
  expect(userStatus.status).toBe('complete');
});
```

## Related

- `.readme/chunks/local-first.initial-sync-service.md` - How initial sync updates status
- `.readme/chunks/local-first.background-sync-worker.md` - How background sync updates status
- `.readme/chunks/local-first.dexie-schema.md` - syncStatus table schema
- `.readme/planning/01-state-management-sync.md` - Overall sync strategy
