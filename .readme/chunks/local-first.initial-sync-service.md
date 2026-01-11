---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/services/initial-sync.ts
  - src/app/[locale]/api/sync/initial/route.ts
  - src/hooks/useSyncOnLogin.ts
---

# Initial Sync Service

## Purpose
Handles the critical initial data synchronization when a user logs in. Fetches user profile, babies, access records, and recent logs (last 7 days) from the server and stores them in IndexedDB to enable offline-first functionality.

## Key Files

| File | Purpose |
|------|---------|
| `src/services/initial-sync.ts` | Client-side sync orchestration |
| `src/app/[locale]/api/sync/initial/route.ts` | Server API endpoint |
| `src/hooks/useSyncOnLogin.ts` | React hook for login sync |

## Architecture

### Two-Phase Sync Strategy

**Phase 1: Initial Sync (Blocking)**
- Fetches critical data needed to render UI
- User waits for this to complete
- Stores in IndexedDB with sync status tracking

**Phase 2: Background Sync (Non-blocking)**
- Fetches historical logs older than 7 days
- Runs in Web Worker to avoid blocking UI
- See `.readme/chunks/local-first.background-sync-worker.md`

## API Contract

### Request
```typescript
GET /api/sync/initial
Headers: { Cookie: Clerk session }
```

### Response
```typescript
type InitialSyncResponse = {
  user: {
    id: number;                  // Local DB user ID
    clerkId: string;             // Clerk user ID
    email: string | null;
    firstName: string | null;
    imageUrl: string | null;
    defaultBabyId: number | null;
    locked: boolean;
    createdAt: string;           // ISO 8601
    updatedAt: string;
  };
  babies: Baby[];                // All accessible babies
  babyAccess: BabyAccess[];      // Access level for each baby
  recentFeedLogs: FeedLog[];     // Last 7 days
  recentSleepLogs: SleepLog[];   // Last 7 days
  recentNappyLogs: NappyLog[];   // Last 7 days
  uiConfig: Partial<UIConfig> | null;
};
```

## Usage Pattern

### In React Components

```typescript
import { useSyncOnLogin } from '@/hooks/useSyncOnLogin';

function AuthLayout({ children }: { children: React.ReactNode }) {
  const { isReady, isLoading, error } = useSyncOnLogin(clerkId);

  if (isLoading) return <LoadingSpinner />;
  if (error) return <ErrorMessage error={error} />;
  if (!isReady) return null;

  return children;
}
```

### In Server Actions

```typescript
import { needsInitialSync, performInitialSync } from '@/services/initial-sync';

const needsSync = await needsInitialSync(clerkId);
if (needsSync) {
  const result = await performInitialSync();
  if (!result.success) {
    console.error('Sync failed:', result.error);
  }
}
```

## Multi-Log-Type Support

### Adding a New Log Type

When adding a new log type (e.g., `solidsLogs`), update these files:

1. **API endpoint** (`route.ts`): Add query for recent logs
2. **Response type** (`initial-sync.ts`): Add `recentSolidsLogs: SolidsLog[]`
3. **Transform function** (`initial-sync.ts`): Add date parsing logic
4. **Store function** (`initial-sync.ts`): Add `saveSolidsLogs()` call
5. **Sync status** (`initial-sync.ts`): Add `updateSyncStatus('solids_logs', ...)`

### Sync Status Tracking

Each entity type has independent sync status:

```typescript
type SyncEntityType =
  | 'user'
  | 'babies'
  | 'baby_access'
  | 'feed_logs'
  | 'sleep_logs'
  | 'nappy_logs'
  | 'ui_config';
```

Status values: `'idle' | 'syncing' | 'complete' | 'error'`

## Error Handling

### Network Failures

```typescript
const result = await performInitialSync();
if (!result.success) {
  // Check if local data exists
  const localUser = await getLocalUserByClerkId(clerkId);
  if (localUser) {
    // Use stale data, show "offline mode" banner
  } else {
    // No local data, show "connect to continue" message
  }
}
```

### Partial Sync Failures

Sync status is updated per entity. If `feed_logs` fails but `user` succeeds, the app can still render with partial data.

## Data Freshness

### Recent vs Historical Data

- **Recent** (7 days): Fetched during initial sync
  - Rationale: Most caregivers check recent activity
  - Enables immediate UI rendering

- **Historical** (>7 days): Fetched by background worker
  - Non-blocking, progressive loading
  - Prioritized by baby usage frequency

### Sync Timestamp

```typescript
// Stored in syncStatus table
type SyncStatus = {
  entityType: SyncEntityType;
  status: SyncStatusValue;
  lastSyncAt: Date | null;
  errorMessage: string | null;
};
```

## Performance Characteristics

### Blocking Time
- **Target**: <2 seconds for initial sync
- **Typical**: 500ms - 1.5s depending on data volume

### Data Volume (Initial Sync)
- User profile: ~500 bytes
- Babies (avg 2): ~1KB
- Recent logs (7 days, avg 50): ~25KB
- **Total**: ~30KB

### IndexedDB Write Time
- ~100ms for initial sync data
- Bulk insert is faster than individual writes

## Zustand Store Hydration

After storing in IndexedDB, hydrate Zustand stores:

```typescript
// From useSyncOnLogin hook
setUser({
  id: data.user.clerkId,
  localId: data.user.id,
  firstName: data.user.firstName,
  email: data.user.email,
  imageUrl: data.user.imageUrl ?? '',
});

setAllBabies(activeBabies);
setActiveBaby(activeBabies[0]);
setInitialSyncComplete(true);
```

## Gotchas

### Session Expiration
- Initial sync validates Clerk session
- If expired during sync → 401 → redirect to sign-in
- Local data persists but mutations may fail

### Database Quota
- IndexedDB quota errors are rare but possible
- Handle by clearing old data or prompting user
- Monitor quota usage: `navigator.storage.estimate()`

### Date Serialization
- API returns ISO 8601 strings
- Transform to `Date` objects before storing in IndexedDB
- Dexie indexes work with Date objects, not strings

## Related

- `.readme/chunks/local-first.dexie-schema.md` - Database schema
- `.readme/chunks/local-first.background-sync-worker.md` - Historical sync
- `.readme/chunks/local-first.outbox-pattern.md` - Offline mutations
- `.readme/planning/01-state-management-sync.md` - Sync strategy doc
