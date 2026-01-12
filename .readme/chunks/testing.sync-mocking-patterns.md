---
last_verified_at: 2026-01-13T00:00:00Z
source_paths:
  - src/app/[locale]/api/sync/pull/route.test.ts
  - src/app/[locale]/api/sync/push/route.test.ts
  - src/services/sync-service.test.ts
---

# Sync API Test Mocking Patterns

## Purpose
Documents the specific mocking patterns used for testing the sync API implementation (pull/push endpoints and sync service) with Clerk auth, Drizzle ORM, and IndexedDB.

## Key Deviations from Standard
- Uses dynamic imports with `vi.resetModules()` for test isolation
- Mocks Clerk auth before importing route handlers
- Mocks Drizzle ORM chain methods for query building
- Tracks mock call counts to simulate different database responses
- Mocks `globalThis.fetch` for API endpoint testing in client service

## Mock Setup Patterns

### Clerk Authentication Mock
```typescript
// At top of test file (before imports)
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

// In test cases - use dynamic import to get mocked version
const { auth } = await import('@clerk/nextjs/server');
vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);
```

**Why:** Clerk's `auth()` must be mocked before importing route handlers that use it. Dynamic imports ensure the mocked version is used.

### Drizzle ORM Database Mock
```typescript
// At top of test file
vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

// In test - mock query builder chain
const { db } = await import('@/lib/db');

vi.mocked(db.select).mockReturnValue({
  from: vi.fn().mockReturnValue({
    where: vi.fn().mockReturnValue({
      limit: vi.fn().mockResolvedValue([{ id: 1, name: 'Test' }]),
    }),
  }),
} as never);
```

**Why:** Drizzle uses method chaining (`db.select().from().where().limit()`). Each method must return an object with the next method in the chain.

### Multiple Database Query Mocking
```typescript
let selectCallCount = 0;
vi.mocked(db.select).mockImplementation(() => {
  selectCallCount++;
  if (selectCallCount === 1) {
    // First query: user lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1 }]),
        }),
      }),
    } as never;
  }
  if (selectCallCount === 2) {
    // Second query: access lookup
    return {
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue([{ babyId: 1, accessLevel: 'owner' }]),
      }),
    } as never;
  }
  // Third query: sync events
  return {
    from: vi.fn().mockReturnValue({
      where: vi.fn().mockReturnValue({
        orderBy: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    }),
  } as never;
});
```

**Why:** Sync routes make multiple database queries. Counter pattern allows different mock responses per query while keeping assertions simple.

### IndexedDB (local-db) Mock
```typescript
// At top of test file
vi.mock('@/lib/local-db', () => ({
  getSyncCursor: vi.fn(),
  updateSyncCursor: vi.fn(),
  getPendingOutboxEntries: vi.fn(),
  updateOutboxStatus: vi.fn(),
  clearSyncedOutboxEntries: vi.fn(),
  saveFeedLogs: vi.fn(),
  saveSleepLogs: vi.fn(),
  saveNappyLogs: vi.fn(),
  deleteFeedLog: vi.fn(),
  deleteSleepLog: vi.fn(),
  deleteNappyLog: vi.fn(),
}));

// In test - use dynamic import and mock specific functions
const { getSyncCursor, updateSyncCursor, saveFeedLogs } = await import('@/lib/local-db');
vi.mocked(getSyncCursor).mockResolvedValue(0);
vi.mocked(saveFeedLogs).mockResolvedValue(undefined);
```

**Why:** Dexie IndexedDB operations can't run in Node environment. Mock all helpers as simple async functions.

### Global Fetch Mock
```typescript
// At top of test file
const mockFetch = vi.fn();
globalThis.fetch = mockFetch;

// In test
mockFetch.mockResolvedValue({
  ok: true,
  json: async () => ({
    changes: [],
    nextCursor: 10,
    hasMore: false,
  }),
});
```

**Why:** Client sync service uses `fetch()` to call API routes. Mocking `globalThis.fetch` intercepts all HTTP calls in tests.

### NextRequest Mock
```typescript
function createRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

// Usage
const request = createRequest({
  mutations: [
    {
      mutationId: 'mut_1',
      entityType: 'feed_log',
      entityId: '1',
      op: 'create',
      payload: { babyId: 1 },
    },
  ],
});
```

**Why:** Next.js `NextRequest` has many properties. Helper function creates minimal mock with only needed methods (`json()` for POST body).

## Test Isolation Pattern

```typescript
import { beforeEach, describe, it, vi } from 'vitest';

describe('API Tests', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should test something', async () => {
    // Set up mocks
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    // Dynamic import to get fresh module with mocks applied
    const { POST } = await import('./route');

    // Run test
    const response = await POST(request);
    expect(response.status).toBe(200);
  });
});
```

**Why:**
- `vi.clearAllMocks()` - Resets call counts and mock implementation history
- `vi.resetModules()` - Clears module cache, ensures fresh imports
- Dynamic `await import()` - Gets mocked version of module after mocks are set up

## Testing Conflict Resolution

```typescript
it('should handle update mutation with conflict detection', async () => {
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');

  vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

  const serverUpdatedAt = new Date('2024-01-02T00:00:00Z');
  const clientUpdatedAt = new Date('2024-01-01T00:00:00Z'); // Older than server

  // Mock existing entity with newer timestamp
  vi.mocked(db.select).mockImplementation(() => {
    // ... setup to return entity with serverUpdatedAt
  });

  const { POST } = await import('./route');

  const request = createRequest({
    mutations: [{
      mutationId: 'mut_1',
      entityType: 'feed_log',
      entityId: '101',
      op: 'update',
      payload: {
        babyId: 1,
        amountMl: 150,
        updatedAt: clientUpdatedAt.toISOString(),
      },
    }],
  });

  const response = await POST(request);
  const data = await response.json();

  expect(data.results[0].status).toBe('conflict');
  expect(data.results[0].serverData).toBeDefined();
  expect(data.results[0].serverData.amountMl).toBe(100); // Server wins
});
```

**Why:** Tests Last-Write-Wins (LWW) conflict resolution by comparing `updatedAt` timestamps.

## Test Coverage Areas

### API Route Tests
1. **Authentication:** 401 if not authenticated
2. **Authorization:** 403 if no access to baby
3. **Validation:** 400 for missing/invalid params
4. **Success paths:** 200 with correct data
5. **Conflict resolution:** LWW for concurrent updates
6. **Pagination:** `hasMore`, `nextCursor`, limit clamping

### Sync Service Tests
1. **Pull changes:** Fetch and apply server changes to IndexedDB
2. **Push mutations:** Upload pending outbox entries
3. **Conflict handling:** Apply server data on conflict
4. **Error handling:** Network failures, server errors
5. **Full sync:** Flush outbox + pull for all babies

## Test Files Structure
```
src/
├── app/[locale]/api/sync/
│   ├── pull/
│   │   ├── route.ts
│   │   └── route.test.ts        # 8 tests (auth, validation, success, pagination)
│   └── push/
│       ├── route.ts
│       └── route.test.ts        # 12 tests (auth, validation, CRUD ops, conflicts)
└── services/
    ├── sync-service.ts
    └── sync-service.test.ts     # 18 tests (pull, push, full sync, errors)
```

## Gotchas / Constraints

- **Must use dynamic imports:** Static imports happen before mocks are set up
- **Reset between tests:** Without `vi.resetModules()`, tests can interfere with each other
- **Call count tracking:** When mocking multiple queries, use counter pattern instead of multiple mock setups
- **Type assertions:** Often need `as never` or `as unknown as Type` to satisfy TypeScript with partial mocks
- **Chain methods:** Each method in Drizzle chain must return an object with the next method
- **Async mocks:** Use `mockResolvedValue()` not `mockReturnValue()` for async functions

## Related
- `.readme/chunks/testing.vitest-dual-mode.md` - Vitest configuration and test environment selection
- `.readme/chunks/local-first.delta-sync-api.md` - Implementation details of sync API endpoints
- `.readme/chunks/local-first.delta-sync-client.md` - Sync service implementation
