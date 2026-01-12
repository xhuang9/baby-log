# Sync API Endpoints & Outbox Flush

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Medium

---

## Overview

Build the server-side sync endpoints and client-side outbox flush logic to enable bidirectional data synchronization.

---

## API Endpoints

### 1. Initial Sync

```
GET /api/sync/initial
Authorization: Bearer <clerk-token>

Response:
{
  "user": { id, email, firstName, preferences },
  "babies": [{ id, name, birthDate, accessLevel }],
  "uiConfig": { theme, handMode, defaultViews },
  "recentLogs": {
    "feedLogs": [...],
    "sleepLogs": [...]
  },
  "syncCursors": {
    "babyId_1": 12345,
    "babyId_2": 67890
  }
}
```

### 2. Delta Sync (Pull)

```
GET /api/sync/pull?babyId=123&since=12345&limit=100
Authorization: Bearer <clerk-token>

Response:
{
  "changes": [
    { "type": "feed_log", "op": "create", "data": {...} },
    { "type": "feed_log", "op": "update", "data": {...} },
    { "type": "feed_log", "op": "delete", "id": "uuid" }
  ],
  "nextCursor": 12400,
  "hasMore": false
}
```

### 3. Mutation Push (Outbox Flush)

```
POST /api/sync/push
Authorization: Bearer <clerk-token>
Content-Type: application/json

Request:
{
  "mutations": [
    {
      "mutationId": "uuid",
      "entityType": "feed_log",
      "entityId": "uuid",
      "op": "create",
      "payload": { ... }
    }
  ]
}

Response:
{
  "results": [
    { "mutationId": "uuid", "status": "success" },
    { "mutationId": "uuid", "status": "conflict", "serverData": {...} }
  ],
  "newCursor": 12450
}
```

### 4. Historical Logs (Background)

```
GET /api/sync/logs?babyId=123&before=12345&limit=500
Authorization: Bearer <clerk-token>

Response:
{
  "logs": [...],
  "nextCursor": 11845,
  "hasMore": true
}
```

---

## Server Implementation

### Cursor Strategy

- Each baby has a monotonic cursor (auto-increment event ID)
- Every mutation increments the cursor
- Clients track `lastSyncCursor` per baby
- Delta queries: `WHERE event_id > cursor ORDER BY event_id LIMIT N`

### Database Schema Addition

```sql
-- Add to existing schema
CREATE TABLE sync_events (
  id SERIAL PRIMARY KEY,
  baby_id INTEGER REFERENCES babies(id),
  entity_type VARCHAR(50) NOT NULL,
  entity_id UUID NOT NULL,
  op VARCHAR(20) NOT NULL, -- create, update, delete
  payload JSONB,
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_sync_events_baby_cursor
  ON sync_events(baby_id, id);
```

---

## Client Implementation

### Outbox Flush Logic

```typescript
// src/services/outbox-sync.ts

export async function flushOutbox() {
  const pending = await getPendingOutboxEntries();
  if (pending.length === 0) return;

  // Mark as syncing
  await Promise.all(
    pending.map(e => updateOutboxStatus(e.mutationId, 'syncing'))
  );

  try {
    const response = await fetch('/api/sync/push', {
      method: 'POST',
      body: JSON.stringify({ mutations: pending }),
    });

    const { results, newCursor } = await response.json();

    for (const result of results) {
      if (result.status === 'success') {
        await updateOutboxStatus(result.mutationId, 'synced');
      } else if (result.status === 'conflict') {
        // LWW: server wins, update local with server data
        await applyServerData(result.serverData);
        await updateOutboxStatus(result.mutationId, 'synced');
      }
    }

    await updateSyncCursor(babyId, newCursor);
  } catch (error) {
    // Network error, keep as pending for retry
    await Promise.all(
      pending.map(e => updateOutboxStatus(e.mutationId, 'pending'))
    );
  }
}
```

### Sync Scheduler

```typescript
// src/hooks/useSyncScheduler.ts

export function useSyncScheduler(babyId: number) {
  const isOnline = useOnlineStatus();

  // Pull sync every 5 seconds when active
  useQuery({
    queryKey: queryKeys.sync.changes(babyId, cursor),
    queryFn: () => pullChanges(babyId),
    refetchInterval: 5000,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
    enabled: isOnline,
  });

  // Flush outbox when online
  useEffect(() => {
    if (isOnline) {
      flushOutbox();
    }
  }, [isOnline]);
}
```

---

## Implementation Tasks

### Phase 1: Server Endpoints

- [ ] Create `src/app/api/sync/initial/route.ts`
- [ ] Create `src/app/api/sync/pull/route.ts`
- [ ] Create `src/app/api/sync/push/route.ts`
- [ ] Create `src/app/api/sync/logs/route.ts`
- [ ] Add `sync_events` table to schema
- [ ] Implement cursor-based pagination

### Phase 2: Client Sync Service

- [ ] Create `src/services/sync-service.ts`
- [ ] Implement `pullChanges()` function
- [ ] Implement `flushOutbox()` function
- [ ] Implement `applyServerData()` for conflicts

### Phase 3: React Integration

- [ ] Create `useSyncScheduler` hook
- [ ] Create `useOnlineStatus` hook
- [ ] Add sync trigger on window focus
- [ ] Add sync trigger on network reconnect

### Phase 4: Error Handling

- [ ] Implement retry with exponential backoff
- [ ] Handle partial sync failures
- [ ] Log sync errors for debugging
- [ ] Show user-friendly error messages

---

## Success Criteria

- [ ] Initial sync completes in < 2 seconds
- [ ] Delta sync fetches only new changes
- [ ] Outbox flushes reliably when online
- [ ] Conflicts resolved via LWW
- [ ] No duplicate mutations on retry
