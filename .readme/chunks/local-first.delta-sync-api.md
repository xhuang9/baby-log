---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/app/[locale]/api/sync/pull/route.ts
  - src/app/[locale]/api/sync/push/route.ts
---

# Delta Sync API Endpoints

## Purpose
Documents the HTTP API contracts for bidirectional delta sync. Defines request/response formats for pull (download changes) and push (upload mutations) operations.

## Pull Endpoint: GET /api/sync/pull

### Purpose
Fetch changes for a baby since a given cursor. Returns incremental updates from `sync_events` table.

### Request

**Method**: `GET`

**Query Parameters**:
```typescript
type PullRequest = {
  babyId: number;      // Required: Baby ID to fetch changes for
  since?: number;      // Optional: Cursor (sync_events.id), default 0
  limit?: number;      // Optional: Max changes to return, default 100, max 500
};
```

**Example**:
```
GET /api/sync/pull?babyId=1&since=42&limit=100
```

**Authorization**:
- Requires Clerk authentication (checks `auth()` userId)
- Verifies user has access to babyId via `baby_access` table

### Response

**Success (200)**:
```typescript
type PullResponse = {
  changes: SyncChange[];  // Array of sync events
  nextCursor: number;     // Cursor for next request (last change.id)
  hasMore: boolean;       // True if more changes available
};

type SyncChange = {
  type: string;                         // Entity type: feed_log, sleep_log, nappy_log
  op: 'create' | 'update' | 'delete';  // Operation
  id: number;                           // Entity ID (NOT sync_events.id)
  data: Record<string, unknown> | null; // Entity data (null for delete)
  createdAt: string;                    // ISO 8601 timestamp
};
```

**Example response**:
```json
{
  "changes": [
    {
      "type": "feed_log",
      "op": "create",
      "id": 123,
      "data": {
        "id": "123",
        "babyId": 1,
        "method": "bottle",
        "amountMl": 120,
        "startedAt": "2026-01-12T10:00:00Z",
        "createdAt": "2026-01-12T10:00:00Z",
        "updatedAt": "2026-01-12T10:00:00Z"
      },
      "createdAt": "2026-01-12T10:00:00Z"
    },
    {
      "type": "feed_log",
      "op": "update",
      "id": 123,
      "data": {
        "id": "123",
        "amountMl": 150,
        "updatedAt": "2026-01-12T10:05:00Z"
      },
      "createdAt": "2026-01-12T10:05:00Z"
    },
    {
      "type": "sleep_log",
      "op": "delete",
      "id": 456,
      "data": null,
      "createdAt": "2026-01-12T10:10:00Z"
    }
  ],
  "nextCursor": 142,
  "hasMore": false
}
```

**Error Responses**:
- `401 Unauthorized`: No Clerk userId
- `400 Bad Request`: Missing or invalid babyId
- `403 Forbidden`: User lacks access to babyId
- `404 Not Found`: User not found in database
- `500 Internal Server Error`: Database error

### Implementation Details

**Query logic** (`src/app/[locale]/api/sync/pull/route.ts`):
```typescript
// Fetch changes with one extra to determine hasMore
const changes = await db
  .select({
    id: syncEventsSchema.id,
    entityType: syncEventsSchema.entityType,
    entityId: syncEventsSchema.entityId,
    op: syncEventsSchema.op,
    payload: syncEventsSchema.payload,
    createdAt: syncEventsSchema.createdAt,
  })
  .from(syncEventsSchema)
  .where(and(
    eq(syncEventsSchema.babyId, babyId),
    gt(syncEventsSchema.id, sinceCursor)
  ))
  .orderBy(syncEventsSchema.id)
  .limit(limit + 1); // Fetch +1 to check hasMore

const hasMore = changes.length > limit;
const resultChanges = hasMore ? changes.slice(0, limit) : changes;
```

**Access control**:
```typescript
// Verify user has access to this baby
const [access] = await db
  .select({ babyId: babyAccessSchema.babyId })
  .from(babyAccessSchema)
  .where(and(
    eq(babyAccessSchema.userId, localUser.id),
    eq(babyAccessSchema.babyId, babyId)
  ))
  .limit(1);

if (!access) {
  return NextResponse.json({ error: 'Access denied' }, { status: 403 });
}
```

## Push Endpoint: POST /api/sync/push

### Purpose
Upload mutations from client outbox to server. Processes create/update/delete operations and handles conflicts via LWW.

### Request

**Method**: `POST`

**Body**:
```typescript
type PushRequest = {
  mutations: Mutation[];
};

type Mutation = {
  mutationId: string;              // Client-generated UUID for tracking
  entityType: EntityType;          // feed_log, sleep_log, nappy_log
  entityId: string;                // Entity ID (string for client UUIDs)
  op: 'create' | 'update' | 'delete';
  payload: Record<string, unknown>; // Entity data
};

type EntityType = 'feed_log' | 'sleep_log' | 'nappy_log';
```

**Example**:
```json
{
  "mutations": [
    {
      "mutationId": "abc-123-def-456",
      "entityType": "feed_log",
      "entityId": "789",
      "op": "update",
      "payload": {
        "babyId": 1,
        "method": "bottle",
        "amountMl": 150,
        "startedAt": "2026-01-12T10:00:00Z",
        "updatedAt": "2026-01-12T10:05:00Z"
      }
    }
  ]
}
```

**Authorization**:
- Requires Clerk authentication
- Validates user has **edit access** (owner or editor) to babyId in payload

### Response

**Success (200)**:
```typescript
type PushResponse = {
  results: MutationResult[];
  newCursor: number | null; // Latest sync_events.id after processing
};

type MutationResult = {
  mutationId: string;
  status: 'success' | 'conflict' | 'error';
  serverData?: Record<string, unknown>; // Present if status = 'conflict'
  error?: string;                       // Present if status = 'error'
};
```

**Example response**:
```json
{
  "results": [
    {
      "mutationId": "abc-123-def-456",
      "status": "success"
    },
    {
      "mutationId": "xyz-789",
      "status": "conflict",
      "serverData": {
        "id": "789",
        "amountMl": 180,
        "updatedAt": "2026-01-12T10:06:00Z"
      }
    },
    {
      "mutationId": "fail-123",
      "status": "error",
      "error": "Access denied to this baby"
    }
  ],
  "newCursor": 150
}
```

**Error Responses**:
- `401 Unauthorized`: No Clerk userId
- `400 Bad Request`: Invalid JSON or missing mutations array
- `404 Not Found`: User not found
- `500 Internal Server Error`: Database error

### Implementation Details

**Mutation processing** (`src/app/[locale]/api/sync/push/route.ts`):

#### Create Operation
```typescript
if (op === 'create') {
  const [inserted] = await db
    .insert(feedLogSchema)
    .values({
      babyId,
      loggedByUserId: userId,
      method: payload.method,
      startedAt: new Date(payload.startedAt),
      // ... other fields
    })
    .returning();

  // Record sync event
  await db.insert(syncEventsSchema).values({
    babyId,
    entityType: 'feed_log',
    entityId: inserted.id,
    op: 'create',
    payload: JSON.stringify(serializeFeedLog(inserted)),
  });

  return { mutationId, status: 'success' };
}
```

#### Update Operation (with LWW conflict check)
```typescript
if (op === 'update') {
  const [existing] = await db
    .select()
    .from(feedLogSchema)
    .where(eq(feedLogSchema.id, numericId))
    .limit(1);

  if (!existing) {
    return { mutationId, status: 'error', error: 'Entity not found' };
  }

  const clientUpdatedAt = payload.updatedAt ? new Date(payload.updatedAt) : null;
  const serverUpdatedAt = existing.updatedAt;

  // If server has newer data, return conflict
  if (serverUpdatedAt && clientUpdatedAt && serverUpdatedAt > clientUpdatedAt) {
    return {
      mutationId,
      status: 'conflict',
      serverData: serializeFeedLog(existing),
    };
  }

  // Apply update
  const [updated] = await db
    .update(feedLogSchema)
    .set({ /* fields */ })
    .where(eq(feedLogSchema.id, numericId))
    .returning();

  // Record sync event
  await db.insert(syncEventsSchema).values({
    babyId: existing.babyId,
    entityType: 'feed_log',
    entityId: numericId,
    op: 'update',
    payload: JSON.stringify(serializeFeedLog(updated)),
  });

  return { mutationId, status: 'success' };
}
```

#### Delete Operation
```typescript
if (op === 'delete') {
  const [existing] = await db
    .select({ babyId: feedLogSchema.babyId })
    .from(feedLogSchema)
    .where(eq(feedLogSchema.id, numericId))
    .limit(1);

  if (!existing) {
    // Already deleted, consider success (idempotent)
    return { mutationId, status: 'success' };
  }

  await db.delete(feedLogSchema).where(eq(feedLogSchema.id, numericId));

  // Record sync event
  await db.insert(syncEventsSchema).values({
    babyId: existing.babyId,
    entityType: 'feed_log',
    entityId: numericId,
    op: 'delete',
    payload: null, // No data for delete
  });

  return { mutationId, status: 'success' };
}
```

**Access control**:
```typescript
// Get all baby IDs user has edit access to
const userAccess = await db
  .select({
    babyId: babyAccessSchema.babyId,
    accessLevel: babyAccessSchema.accessLevel,
  })
  .from(babyAccessSchema)
  .where(eq(babyAccessSchema.userId, localUser.id));

const editableBabyIds = new Set(
  userAccess
    .filter(a => a.accessLevel === 'owner' || a.accessLevel === 'editor')
    .map(a => a.babyId),
);

// For each mutation
if (babyId && !editableBabyIds.has(babyId)) {
  return { mutationId, status: 'error', error: 'Access denied' };
}
```

## Entity Serialization

Both endpoints use consistent serialization for entity data:

### Feed Log
```typescript
function serializeFeedLog(log: typeof feedLogSchema.$inferSelect) {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    method: log.method,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    amountMl: log.amountMl,
    isEstimated: log.isEstimated,
    endSide: log.endSide,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
```

### Sleep Log
```typescript
function serializeSleepLog(log: typeof sleepLogSchema.$inferSelect) {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    startedAt: log.startedAt.toISOString(),
    endedAt: log.endedAt?.toISOString() ?? null,
    durationMinutes: log.durationMinutes,
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
```

### Nappy Log
```typescript
function serializeNappyLog(log: typeof nappyLogSchema.$inferSelect) {
  return {
    id: String(log.id),
    babyId: log.babyId,
    loggedByUserId: log.loggedByUserId,
    type: log.type,
    startedAt: log.startedAt.toISOString(),
    notes: log.notes,
    createdAt: log.createdAt.toISOString(),
    updatedAt: log.updatedAt?.toISOString() ?? log.createdAt.toISOString(),
  };
}
```

**Why serialize**:
- Consistent date format (ISO 8601 strings)
- Null safety (`updatedAt` fallback to `createdAt`)
- ID conversion (number to string for client compatibility)

## Gotchas

### Batch Size Limits
- Pull: Max 500 changes per request (use `hasMore` + recursive fetch)
- Push: No hard limit, but batches of 50-100 mutations recommended

### Timestamp Precision
- Server uses `timestamp with timezone` (microsecond precision)
- Client uses `Date` objects (millisecond precision)
- LWW conflict detection compares timestamps as-is (microsecond differences may cause false conflicts)

### Empty Mutations Array
```typescript
// Server accepts empty array (no-op)
POST /api/sync/push { mutations: [] }
// Returns: { results: [], newCursor: null }
```

### Idempotent Deletes
- Deleting already-deleted entity returns `success` (not `error`)
- Enables retry without manual client state cleanup

## Related
- `.readme/chunks/local-first.delta-sync-architecture.md` - Overall sync design
- `.readme/chunks/local-first.delta-sync-client.md` - Client-side service using these APIs
- `.readme/chunks/local-first.conflict-resolution.md` - LWW strategy
