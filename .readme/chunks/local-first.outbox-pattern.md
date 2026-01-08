---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/lib/local-db.ts
---

# Outbox Pattern for Offline Mutations

## Purpose
Documents the outbox table pattern for durable offline mutations. Ensures mutations are reliably replayed when connectivity returns, with idempotent server writes to prevent duplicates.

## Key Deviations from Standard

Unlike typical optimistic updates that fail silently when offline:
- **Outbox persists mutations** in IndexedDB until server confirms
- **Client-generated UUIDs** enable idempotent replay (no duplicates on retry)
- **Status tracking** (pending → syncing → synced/failed) for observability
- **Automatic retry** via TanStack Query's refetch triggers

## Outbox Schema

### Table Structure

```typescript
export type OutboxEntry = {
  mutationId: string;        // UUID, unique identifier for mutation attempt
  entityType: OutboxEntityType;  // 'feed_log' | 'sleep_log' | 'baby'
  entityId: string;          // UUID of the entity being mutated
  op: OutboxOperation;       // 'create' | 'update' | 'delete'
  payload: unknown;          // Full row or patch data
  createdAt: Date;           // When mutation was created locally
  status: OutboxStatus;      // 'pending' | 'syncing' | 'synced' | 'failed'
  lastAttemptAt: Date | null;  // Last sync attempt timestamp
  errorMessage: string | null;  // Error from last failed attempt
};
```

### Index Strategy

```typescript
// Indexed for efficient queries
outbox: 'mutationId, status, createdAt, entityType'
```

**Why**:
- `status` index for `WHERE status = 'pending'` queries
- `createdAt` index for FIFO replay order
- `entityType` index for filtering by entity type

## Patterns

### Create with Outbox Entry

```typescript
import { v4 as uuid } from 'uuid';
import { localDb, addToOutbox } from '@/lib/local-db';

async function createFeedLog(feedLog: Omit<LocalFeedLog, 'id' | 'createdAt' | 'updatedAt'>) {
  // 1. Generate client UUID (enables idempotent server write)
  const id = uuid();
  const now = new Date();

  const newFeedLog: LocalFeedLog = {
    ...feedLog,
    id,
    createdAt: now,
    updatedAt: now,
  };

  // 2. Write to local Dexie (optimistic update)
  await localDb.feedLogs.add(newFeedLog);

  // 3. Add to outbox for server sync
  await addToOutbox({
    mutationId: uuid(), // Separate UUID for mutation tracking
    entityType: 'feed_log',
    entityId: id,
    op: 'create',
    payload: newFeedLog,
  });

  // 4. UI instantly shows new feed log (from Dexie via liveQuery)
  // 5. TanStack Query will flush outbox when online
}
```

**Key Points**:
- `mutationId` ≠ `entityId` (mutation can be retried, entity is created once)
- Write to Dexie FIRST for instant UI update
- Outbox entry persists even if app closes before sync

### Update with Outbox Entry

```typescript
async function updateFeedLog(feedLogId: string, patch: Partial<LocalFeedLog>) {
  const mutationId = uuid();

  // 1. Apply patch to Dexie
  await localDb.feedLogs.update(feedLogId, {
    ...patch,
    updatedAt: new Date(),
  });

  // 2. Add to outbox
  await addToOutbox({
    mutationId,
    entityType: 'feed_log',
    entityId: feedLogId,
    op: 'update',
    payload: patch, // Only send changed fields
  });
}
```

### Delete with Outbox Entry

```typescript
async function deleteFeedLog(feedLogId: string) {
  const mutationId = uuid();

  // 1. Delete from Dexie (or soft-delete)
  await localDb.feedLogs.delete(feedLogId);

  // 2. Add to outbox
  await addToOutbox({
    mutationId,
    entityType: 'feed_log',
    entityId: feedLogId,
    op: 'delete',
    payload: { id: feedLogId }, // Minimal payload for delete
  });
}
```

## Outbox Flush (Sync to Server)

### Get Pending Entries

```typescript
import { getPendingOutboxEntries } from '@/lib/local-db';

const pendingMutations = await getPendingOutboxEntries();
// Returns all entries with status === 'pending'
```

### Replay Pattern

```typescript
async function flushOutbox() {
  const pending = await getPendingOutboxEntries();

  for (const entry of pending) {
    // Update status to 'syncing'
    await updateOutboxStatus(entry.mutationId, 'syncing');

    try {
      // Send to server (idempotent endpoint)
      const response = await fetch('/api/sync/mutations', {
        method: 'POST',
        body: JSON.stringify({
          mutationId: entry.mutationId,
          entityType: entry.entityType,
          entityId: entry.entityId,
          op: entry.op,
          payload: entry.payload,
        }),
      });

      if (!response.ok) throw new Error(await response.text());

      // Mark as synced
      await updateOutboxStatus(entry.mutationId, 'synced');

      // Optional: update Dexie with server response (LWW)
      const serverData = await response.json();
      await applyServerDataToDexie(serverData);

    } catch (error) {
      // Mark as failed, will retry later
      await updateOutboxStatus(
        entry.mutationId,
        'failed',
        error.message
      );
    }
  }
}
```

**Idempotent Server Endpoint**:
```typescript
// Server: /api/sync/mutations
export async function POST(request: Request) {
  const { mutationId, entityType, entityId, op, payload } = await request.json();

  // Use entityId (client UUID) as primary key
  // Prevents duplicates on retry
  if (op === 'create') {
    await db.insert(feedLogsSchema).values({
      id: entityId, // Client-generated UUID
      ...payload,
    }).onConflictDoUpdate({
      target: feedLogsSchema.id,
      set: payload, // Idempotent: same data on retry
    });
  }

  // Return canonical server data (for LWW)
  const serverData = await db.select().from(feedLogsSchema).where(eq(feedLogsSchema.id, entityId));
  return Response.json(serverData);
}
```

## Status Lifecycle

```
pending → syncing → synced (success)
                  ↘ failed (error, will retry)
```

### Automatic Retry Triggers

TanStack Query triggers flush on:
1. **Window Focus**: User returns to app
2. **Reconnect**: Network restored
3. **Interval**: Periodic refetch (e.g., every 30s)

```typescript
// In QueryProvider or sync hook
useQuery({
  queryKey: queryKeys.outbox.pending(),
  queryFn: flushOutbox,
  refetchOnWindowFocus: true,   // Retry on focus
  refetchOnReconnect: true,     // Retry on online
  refetchInterval: 30000,       // Retry every 30s
});
```

## Observability

### Pending Mutations Count

```typescript
const { data: pendingCount } = useQuery({
  queryKey: queryKeys.outbox.pendingCount(),
  queryFn: async () => {
    const pending = await getPendingOutboxEntries();
    return pending.length;
  },
  refetchInterval: 5000, // Update UI every 5s
});

// Show in UI: "3 changes pending sync"
```

### Failed Mutations Alert

```typescript
const failedMutations = await localDb.outbox
  .where('status').equals('failed')
  .toArray();

if (failedMutations.length > 0) {
  // Show notification: "Some changes failed to sync. Retry?"
}
```

## Gotchas

### Client UUIDs are Critical
**Wrong**:
```typescript
// ❌ Server auto-increment - creates duplicates on retry
const feedLog = { /* no id */ };
await localDb.feedLogs.add(feedLog); // Dexie generates auto-increment ID
await addToOutbox({ entityId: feedLog.id, ... }); // Server gets different ID on retry
```

**Right**:
```typescript
// ✅ Client-generated UUID - idempotent on retry
const feedLog = { id: uuid(), /* ... */ };
await localDb.feedLogs.add(feedLog);
await addToOutbox({ entityId: feedLog.id, ... }); // Same UUID on retry
```

### Don't Delete Synced Entries Immediately
- Keep `synced` entries for debugging (e.g., 24 hours)
- Add cleanup job: `DELETE FROM outbox WHERE status = 'synced' AND createdAt < NOW() - INTERVAL 1 DAY`

### Failed Mutations Need Manual Intervention
- Automatic retry may fail permanently (e.g., validation error)
- Show UI for user to review and discard failed mutations
- Log `errorMessage` for debugging

## Related
- `.readme/chunks/local-first.dexie-schema.md` - Outbox table schema
- `.readme/chunks/local-first.conflict-resolution.md` - LWW after server response
- `.readme/chunks/local-first.tanstack-query-setup.md` - Retry triggers
