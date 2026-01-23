---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/services/sync/index.ts
  - src/services/sync/pull.ts
  - src/services/sync/push.ts
  - src/services/sync/conflict.ts
  - src/services/sync/full-sync.ts
  - src/services/sync/apply/index.ts
  - src/services/sync/apply/baby.ts
  - src/services/sync/apply/feed-log.ts
conversation_context: "Created after refactoring sync-service.ts into modular sync/ folder structure."
---

# Sync Service Structure

## Purpose
Documents the modular structure of the client-side sync service, organized into separate modules for pull, push, conflict resolution, and entity-specific change application.

## Folder Organization

```
src/services/sync/
├── index.ts                # Barrel exports
├── types.ts                # SyncChange, PullResponse, SyncResult
├── pull.ts                 # pullChanges - fetch from server
├── push.ts                 # flushOutbox - send to server
├── conflict.ts             # applyServerData - LWW conflict resolution
├── full-sync.ts            # performFullSync - bidirectional sync
└── apply/
    ├── index.ts            # applyChange dispatcher
    ├── baby.ts             # applyBabyChange
    ├── feed-log.ts         # applyFeedLogChange
    ├── sleep-log.ts        # applySleepLogChange
    └── nappy-log.ts        # applyNappyLogChange
```

## Import Pattern

All sync functions are re-exported from the barrel index:

```typescript
// Recommended: Import from barrel
import { pullChanges, flushOutbox, performFullSync } from '@/services/sync';

// Also works: Import from specific modules
import { pullChanges } from '@/services/sync/pull';
import { flushOutbox } from '@/services/sync/push';
```

## Module Responsibilities

### pull.ts - Server to Client

Fetches changes from server since last cursor and applies them to local IndexedDB.

**Function signature:**
```typescript
async function pullChanges(babyId: number): Promise<SyncResult>

type SyncResult = {
  success: boolean;
  error?: string;
  changesApplied?: number;
  errorType?: 'access_revoked' | 'network_error' | 'unknown';
  revokedBabyId?: number;
};
```

**Process:**
1. Get cursor: `const cursor = await getSyncCursor(babyId)`
2. Fetch: `GET /api/sync/pull?babyId=${babyId}&since=${cursor}`
3. For each change: `await applyChange(change)`
4. Update cursor: `await updateSyncCursor(babyId, nextCursor)`
5. If `hasMore`, recursively fetch next batch

**Error handling:**
- **access_revoked**: Returns `errorType: 'access_revoked'` + `revokedBabyId`
- **network_error**: Returns `errorType: 'network_error'`
- Other errors: Returns generic error message

**Example:**
```typescript
const result = await pullChanges(1);

if (!result.success && result.errorType === 'access_revoked') {
  // Handle access revocation
  await clearRevokedBabyData(result.revokedBabyId, user.localId);
  setAllBabies(allBabies.filter(b => b.babyId !== result.revokedBabyId));
}
```

### push.ts - Client to Server

Flushes pending mutations from outbox to server, handling conflicts and errors.

**Function signature:**
```typescript
async function flushOutbox(): Promise<SyncResult>
```

**Process:**
1. Get pending: `const pending = await getPendingOutboxEntries()`
2. Mark syncing: `await updateOutboxStatus(id, 'syncing')`
3. Batch POST: `POST /api/sync/push { mutations: [...] }`
4. Handle results per mutation:
   - **success**: `updateOutboxStatus(id, 'synced')` → remove from outbox
   - **conflict**: `await applyServerData(result.serverData)` → `updateOutboxStatus(id, 'synced')`
   - **error**: `updateOutboxStatus(id, 'failed', errorMessage)`
5. Update cursor: `await updateSyncCursor(babyId, newCursor)`
6. Clear synced: `await clearSyncedOutboxEntries()`

**Conflict Resolution:**
When server returns `status: 'conflict'`, apply server data (LWW):
```typescript
if (result.status === 'conflict') {
  await applyServerData(result.serverData); // Server wins
  await updateOutboxStatus(entry.id, 'synced'); // Clear outbox
}
```

**Error Handling:**
```typescript
if (result.status === 'error') {
  if (result.error?.includes('Access denied')) {
    // Parse baby ID from error message
    const match = result.error.match(/baby (\d+)/);
    const revokedBabyId = match ? parseInt(match[1]) : undefined;

    return {
      success: false,
      error: result.error,
      errorType: 'access_revoked',
      revokedBabyId,
    };
  }

  await updateOutboxStatus(entry.id, 'failed', result.error);
}
```

### conflict.ts - Conflict Resolution (LWW)

Applies server data to IndexedDB when conflicts occur (Last-Write-Wins strategy).

**Function signature:**
```typescript
async function applyServerData(serverData: Record<string, unknown>): Promise<void>
```

**Entity Detection:**
Detects entity type from payload fields:
- Has `method` field → `feed_log`
- Has `durationMinutes` + no `method` → `sleep_log`
- Has `type` + `startedAt` → `nappy_log`
- Has `name` + `ownerUserId` (no `babyId`) → `baby`

**Date Conversion:**
Converts ISO strings to Date objects:
```typescript
function parseDates(obj: any) {
  const dateFields = ['startedAt', 'endedAt', 'createdAt', 'updatedAt', 'birthDate'];
  for (const field of dateFields) {
    if (obj[field] && typeof obj[field] === 'string') {
      obj[field] = new Date(obj[field]);
    }
  }
  return obj;
}
```

**Baby Sync:**
Baby payloads include optional `access` array:
```typescript
if (serverData.access) {
  // Update babyAccess table
  await saveBabyAccess(serverData.access.map(a => ({
    userId: a.userId,
    babyId: serverData.id,
    accessLevel: a.accessLevel,
    caregiverLabel: a.caregiverLabel,
    ...
  })));
}
```

### full-sync.ts - Bidirectional Sync

Performs full push + pull cycle for multiple babies.

**Function signature:**
```typescript
async function performFullSync(babyIds: number[]): Promise<SyncResult>
```

**Process:**
1. Flush outbox: `await flushOutbox()`
2. For each baby: `await pullChanges(babyId)`
3. Aggregate results

**Example:**
```typescript
const result = await performFullSync([1, 2, 3]);
console.log(`Synced ${result.changesApplied} changes across 3 babies`);
```

### apply/index.ts - Change Dispatcher

Routes sync changes to entity-specific apply handlers.

**Function signature:**
```typescript
async function applyChange(change: SyncChange): Promise<void>

type SyncChange = {
  type: 'feed_log' | 'sleep_log' | 'nappy_log' | 'baby';
  op: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
};
```

**Routing logic:**
```typescript
switch (change.type) {
  case 'feed_log':
    return applyFeedLogChange(change);
  case 'sleep_log':
    return applySleepLogChange(change);
  case 'nappy_log':
    return applyNappyLogChange(change);
  case 'baby':
    return applyBabyChange(change);
  default:
    console.warn(`Unknown change type: ${change.type}`);
}
```

### apply/baby.ts - Baby Changes

Applies baby create/update/delete operations.

**Function signature:**
```typescript
async function applyBabyChange(change: SyncChange): Promise<void>
```

**Operations:**
- **create**: Insert baby + owner access
- **update**: Update baby record
- **delete**: Soft delete (set `archivedAt`)

**Example change:**
```typescript
{
  type: 'baby',
  op: 'update',
  data: {
    id: 1,
    name: 'Emma Rose',
    birthDate: '2024-01-15',
    gender: 'female',
    updatedAt: '2024-01-20T10:00:00Z',
  }
}
```

### apply/feed-log.ts - Feed Log Changes

Applies feed log create/update/delete operations.

**Function signature:**
```typescript
async function applyFeedLogChange(change: SyncChange): Promise<void>
```

**Operations:**
- **create/update**: Upsert to `feed_logs` table
- **delete**: Remove from `feed_logs` table

**Date parsing:**
Converts `startedAt`, `endedAt`, `createdAt`, `updatedAt` from ISO strings to Date objects.

### apply/sleep-log.ts & apply/nappy-log.ts

Similar to feed-log.ts, handles sleep and nappy log changes respectively.

## Types (types.ts)

### SyncChange
```typescript
type SyncChange = {
  type: 'feed_log' | 'sleep_log' | 'nappy_log' | 'baby';
  op: 'create' | 'update' | 'delete';
  data: Record<string, unknown>;
};
```

### PullResponse
```typescript
type PullResponse = {
  changes: SyncChange[];
  nextCursor: number;
  hasMore: boolean;
};
```

### SyncResult
```typescript
type SyncResult = {
  success: boolean;
  error?: string;
  changesApplied?: number;
  errorType?: 'access_revoked' | 'network_error' | 'unknown';
  revokedBabyId?: number;
};
```

## Patterns

### Recursive Pull for Large Backlogs

```typescript
async function pullChanges(babyId: number): Promise<SyncResult> {
  const cursor = await getSyncCursor(babyId);
  const response = await fetch(`/api/sync/pull?babyId=${babyId}&since=${cursor}`);
  const data: PullResponse = await response.json();

  // Apply changes
  for (const change of data.changes) {
    await applyChange(change);
  }

  // Update cursor
  await updateSyncCursor(babyId, data.nextCursor);

  // Recursive pull if more changes
  if (data.hasMore) {
    return pullChanges(babyId); // Fetch next batch
  }

  return {
    success: true,
    changesApplied: data.changes.length,
  };
}
```

### Error Propagation

Errors bubble up from apply handlers:
```typescript
try {
  await applyChange(change);
} catch (error) {
  console.error('Failed to apply change:', error);
  // Continue applying other changes (best effort)
}
```

### Access Revocation Detection

Both pull and push detect access revocation:
```typescript
// Pull
if (response.status === 403) {
  return {
    success: false,
    error: 'Access denied',
    errorType: 'access_revoked',
    revokedBabyId: babyId,
  };
}

// Push
if (result.error?.includes('Access denied')) {
  const match = result.error.match(/baby (\d+)/);
  return {
    success: false,
    errorType: 'access_revoked',
    revokedBabyId: match ? parseInt(match[1]) : undefined,
  };
}
```

## Benefits of Modular Structure

### Before (Single File)
- `sync-service.ts`: 576 LOC
- Hard to navigate and maintain
- All logic in one file

### After (Modular Folder)
- Each module <200 LOC
- Clear separation of concerns
- Easy to test individual modules
- Scalable for new entity types

## Testing Strategy

Each module can be tested independently:

```typescript
// pull.test.ts
describe('pullChanges', () => {
  it('should fetch and apply changes', async () => {
    // Mock fetch
    global.fetch = vi.fn().mockResolvedValue({
      json: () => Promise.resolve({
        changes: [{ type: 'feed_log', op: 'create', data: {...} }],
        nextCursor: 5,
        hasMore: false,
      }),
    });

    const result = await pullChanges(1);
    expect(result.success).toBe(true);
    expect(result.changesApplied).toBe(1);
  });
});
```

## Related

- `.readme/chunks/local-first.delta-sync-client.md` - Client sync service usage
- `.readme/chunks/local-first.delta-sync-api.md` - API endpoint contracts
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox for offline mutations
- `.readme/chunks/local-first.conflict-resolution.md` - LWW strategy details
