---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/services/operations/nappy-log.ts
  - src/services/operations/baby/create.ts
  - src/services/operations/baby/update.ts
  - src/services/operations/baby/index.ts
  - src/services/operations/index.ts
  - src/services/operations/types.ts
---

# Operations Layer Pattern (Client-Side Mutations)

## Purpose

Standardized pattern for client-side mutations that follow the local-first write path: immediate IndexedDB write → outbox enqueue → background sync. This pattern ensures consistent, offline-capable mutations across all activity types.

## Why This Pattern Exists

Before the operations layer:
- Mutations scattered across components and hooks
- Inconsistent error handling and validation
- Direct IndexedDB writes without outbox tracking
- Difficult to test and maintain
- UI logic mixed with data logic

The operations layer provides:
- Single source of truth for each mutation type
- Consistent validation and error handling
- Guaranteed outbox enqueuing for offline support
- Clean separation: UI components call operations, operations handle data
- Easy testing via isolated operation functions

## Pattern Structure

Every operation follows this signature:

```typescript
export async function operationName(
  input: InputType
): Promise<OperationResult<EntityType>>
```

Where `OperationResult` is:
```typescript
type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string }
```

## Standard Operation Flow

All operations follow the same 6-step pattern:

### 1. Client-Side Check
```typescript
if (!isClientSide()) {
  return failure('Client-only operation');
}
```

### 2. Input Validation
```typescript
if (!input.babyId) {
  return failure('Baby ID is required');
}
if (!input.type) {
  return failure('Nappy type is required');
}
```

### 3. Authentication Check
```typescript
const user = useUserStore.getState().user;
if (!user?.localId) {
  return failure('Not authenticated');
}
```

### 4. Access Control Check
```typescript
const access = await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([user.localId, input.babyId])
  .first();

if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
  return failure('Access denied to this baby');
}
```

### 5. Write to IndexedDB + Outbox
```typescript
// Generate client-side UUID
const entityId = crypto.randomUUID();
const now = new Date();

// Create entity object
const entity: LocalEntity = {
  id: entityId,
  babyId: input.babyId,
  loggedByUserId: user.localId,
  // ... entity-specific fields
  createdAt: now,
  updatedAt: now,
};

// Write to IndexedDB
await saveEntities([entity]);

// Enqueue to outbox
await addToOutbox({
  mutationId: generateMutationId(),
  entityType: 'entity_type',
  entityId,
  op: 'create',
  payload: {
    // Serialize entity with ISO dates
    ...entity,
    startedAt: entity.startedAt.toISOString(),
    createdAt: entity.createdAt.toISOString(),
    updatedAt: entity.updatedAt.toISOString(),
  },
});
```

### 6. Trigger Background Sync
```typescript
// Non-blocking sync
flushOutbox().catch(err => {
  console.warn('Background sync failed:', err);
});

return success(entity);
```

## Reference Implementation: Nappy Log

**File:** `src/services/operations/nappy-log.ts`

```typescript
export async function createNappyLog(
  input: CreateNappyLogInput,
): Promise<OperationResult<LocalNappyLog>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // 1. Validate input
    if (!input.babyId) {
      return failure('Baby ID is required');
    }
    if (!input.type) {
      return failure('Nappy type is required');
    }
    if (!input.startedAt) {
      return failure('Start time is required');
    }

    // 2. Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // 3. Check access
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([user.localId, input.babyId])
      .first();

    if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
      return failure('Access denied to this baby');
    }

    // 4. Generate UUID and create entity
    const nappyLogId = crypto.randomUUID();
    const now = new Date();

    const nappyLog: LocalNappyLog = {
      id: nappyLogId,
      babyId: input.babyId,
      loggedByUserId: user.localId,
      type: input.type,
      startedAt: input.startedAt,
      notes: input.notes ?? null,
      createdAt: now,
      updatedAt: now,
    };

    // 5. Write to IndexedDB
    await saveNappyLogs([nappyLog]);

    // 6. Enqueue to outbox
    await addToOutbox({
      mutationId: generateMutationId(),
      entityType: 'nappy_log',
      entityId: nappyLogId,
      op: 'create',
      payload: {
        id: nappyLog.id,
        babyId: nappyLog.babyId,
        loggedByUserId: nappyLog.loggedByUserId,
        type: nappyLog.type,
        startedAt: nappyLog.startedAt.toISOString(),
        notes: nappyLog.notes,
        createdAt: nappyLog.createdAt.toISOString(),
        updatedAt: nappyLog.updatedAt.toISOString(),
      },
    });

    // 7. Trigger background sync (non-blocking)
    flushOutbox().catch(err => {
      console.warn('Background sync failed:', err);
    });

    return success(nappyLog);
  } catch (err) {
    console.error('Failed to create nappy log:', err);
    return failure(err instanceof Error ? err.message : 'Failed to create nappy log');
  }
}
```

## Using Operations from Components

Components should call operations and handle results:

```typescript
import { createNappyLog } from '@/services/operations';

// In component
const handleSubmit = async (values: FormValues) => {
  const result = await createNappyLog({
    babyId: activeBaby.babyId,
    type: values.type,
    startedAt: values.startedAt,
    notes: values.notes,
  });

  if (!result.success) {
    toast.error('Failed to log nappy', {
      description: result.error,
    });
    return;
  }

  toast.success('Nappy logged');
  // UI updates via useLiveQuery automatically
};
```

## UI Updates: useLiveQuery Pattern

Components don't need to manually update state. Dexie's `useLiveQuery` automatically refreshes:

```typescript
import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db';

// In component
const nappyLogs = useLiveQuery(
  () => localDb.nappyLogs
    .where('babyId')
    .equals(activeBaby.babyId)
    .reverse()
    .sortBy('startedAt'),
  [activeBaby.babyId]
);

// When createNappyLog writes to IndexedDB,
// useLiveQuery automatically re-runs and component re-renders
```

This eliminates the need for manual state updates in Zustand stores for activity logs.

## Key Patterns and Conventions

### 1. Client-Side UUIDs

All activity logs use client-generated UUIDs (via `crypto.randomUUID()`):
- Enables offline-first writes without server coordination
- Prevents ID collisions across clients
- Idempotent server writes (same UUID = same record)

### 2. Date Serialization

Dates stored as `Date` objects in IndexedDB, serialized to ISO strings in outbox:
```typescript
// IndexedDB
startedAt: new Date()

// Outbox payload
startedAt: entity.startedAt.toISOString()
```

This ensures:
- Type-safe operations in TypeScript
- Consistent JSON serialization for API
- Correct date parsing on server

### 3. Non-Blocking Sync

Background sync is fire-and-forget:
```typescript
flushOutbox().catch(err => {
  console.warn('Background sync failed:', err);
});
```

**Why non-blocking:**
- User sees instant feedback (IndexedDB write completes immediately)
- Sync failures don't block UI
- Outbox retries on next sync attempt (5s interval or reconnect)

### 4. Access Level Enforcement

All operations check access level before writing:
```typescript
if (!access || (access.accessLevel !== 'owner' && access.accessLevel !== 'editor')) {
  return failure('Access denied to this baby');
}
```

**Access levels:**
- `owner`: Full access (can edit baby, manage caregivers)
- `editor`: Can create/edit logs, cannot manage caregivers
- `viewer`: Read-only, cannot create logs (enforced client-side)

Server also validates access, this is defense-in-depth.

## When to Create New Operations

Create a new operation file when:
- Adding a new activity log type (potty training, diaper rash, etc.)
- Implementing batch operations (e.g., bulk delete)
- Adding complex multi-entity mutations

Use the nappy-log operation as a template.

## File Organization

```
src/services/operations/
├── index.ts                 # Exports all operations
├── types.ts                 # Shared types (OperationResult, helpers)
├── baby/                    # Baby operations (refactored into folder)
│   ├── index.ts             # Barrel exports
│   ├── types.ts             # CreateBabyInput, UpdateBabyInput
│   ├── create.ts            # createBaby
│   ├── update.ts            # updateBabyProfile
│   ├── delete.ts            # deleteBaby
│   └── set-default.ts       # setDefaultBaby
├── nappy-log.ts            # Nappy log operations
├── feed-log.ts             # Feed log operations
└── sleep-log.ts            # Sleep log operations
```

**Export pattern:**
```typescript
// src/services/operations/index.ts
export * from './types';
export * from './baby';
export * from './nappy-log';
export * from './feed-log';
export * from './sleep-log';
```

Components import from the index:
```typescript
import { createNappyLog, createFeedLog, createBaby } from '@/services/operations';
```

## Comparison: Before vs After

### Before (Inline Mutation in Component)
```typescript
// In component
const handleSubmit = async (values) => {
  const user = useUserStore.getState().user;
  if (!user) return;

  const id = crypto.randomUUID();
  const nappyLog = {
    id,
    babyId: activeBaby.babyId,
    loggedByUserId: user.localId,
    type: values.type,
    startedAt: values.startedAt,
    notes: values.notes,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  await localDb.nappyLogs.put(nappyLog);
  await localDb.outbox.add({
    mutationId: crypto.randomUUID(),
    entityType: 'nappy_log',
    entityId: id,
    op: 'create',
    payload: nappyLog,
    status: 'pending',
  });

  flushOutbox();
};
```

**Problems:**
- Validation logic mixed in UI
- No access control check
- No error handling
- Hard to test
- Duplicated across components

### After (Operations Layer)
```typescript
// In component
const handleSubmit = async (values) => {
  const result = await createNappyLog({
    babyId: activeBaby.babyId,
    type: values.type,
    startedAt: values.startedAt,
    notes: values.notes,
  });

  if (!result.success) {
    toast.error('Failed to log', { description: result.error });
    return;
  }

  toast.success('Nappy logged');
};

// In src/services/operations/nappy-log.ts
export async function createNappyLog(input) {
  // Validation, access control, IndexedDB, outbox, sync
  // All in one tested, reusable function
}
```

**Benefits:**
- Clean component code
- Reusable across app
- Testable in isolation
- Consistent error handling
- Single source of truth

## Testing Operations

Operations are pure functions that can be tested in isolation:

```typescript
// nappy-log.test.ts
import { createNappyLog } from '@/services/operations';
import { localDb } from '@/lib/local-db';

describe('createNappyLog', () => {
  it('should create nappy log and enqueue to outbox', async () => {
    const result = await createNappyLog({
      babyId: 1,
      type: 'wet',
      startedAt: new Date(),
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.type).toBe('wet');

      // Verify IndexedDB write
      const saved = await localDb.nappyLogs.get(result.data.id);
      expect(saved).toBeDefined();

      // Verify outbox entry
      const outboxEntry = await localDb.outbox
        .where('entityId')
        .equals(result.data.id)
        .first();
      expect(outboxEntry).toBeDefined();
    }
  });

  it('should return error for invalid input', async () => {
    const result = await createNappyLog({
      babyId: 0, // Invalid
      type: 'wet',
      startedAt: new Date(),
    });

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('Baby ID is required');
    }
  });
});
```

## Related

- `.readme/chunks/local-first.outbox-pattern.md` - Outbox table and retry logic
- `.readme/chunks/local-first.delta-sync-client.md` - Background sync via flushOutbox
- `.readme/chunks/local-first.dexie-schema.md` - IndexedDB schema and tables
- `.readme/chunks/local-first.modular-db-structure.md` - Local-db helpers organization
