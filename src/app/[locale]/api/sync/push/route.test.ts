/**
 * Unit Tests for Mutation Push API Endpoint
 *
 * @see src/app/[locale]/api/sync/push/route.ts
 */

import type { NextRequest } from 'next/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mock external dependencies
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
  },
}));

function createRequest(body: unknown): NextRequest {
  return {
    json: () => Promise.resolve(body),
  } as unknown as NextRequest;
}

describe('POST /api/sync/push', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
  });

  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '1',
        op: 'create',
        payload: { babyId: 1 },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if mutations array is missing', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const { POST } = await import('./route');

    const request = createRequest({});

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('mutations array is required');
  });

  it('should return 400 if mutations is not an array', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const { POST } = await import('./route');

    const request = createRequest({ mutations: 'invalid' });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('mutations array is required');
  });

  it('should return empty results for empty mutations array', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const { POST } = await import('./route');

    const request = createRequest({ mutations: [] });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toEqual([]);
    expect(data.newCursor).toBeNull();
  });

  it('should return 404 if user not found', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '1',
        op: 'create',
        payload: { babyId: 1 },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should process create mutation for feed_log', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // User lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        // Access lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      // Latest sync event cursor
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 10 }]),
          }),
        }),
      } as never;
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 101,
          babyId: 1,
          loggedByUserId: 1,
          method: 'bottle',
          startedAt: new Date(),
          endedAt: null,
          durationMinutes: null,
          amountMl: 120,
          isEstimated: false,
          endSide: null,
          createdAt: new Date(),
          updatedAt: null,
        }]),
      }),
    } as never);

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '1',
        op: 'create',
        payload: {
          babyId: 1,
          method: 'bottle',
          startedAt: new Date().toISOString(),
          amountMl: 120,
        },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(1);
    expect(data.results[0].mutationId).toBe('mut_1');
    expect(data.results[0].status).toBe('success');
  });

  it('should return error if user lacks access to baby', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // User lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        // Access lookup - only viewer access
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'viewer' },
            ]),
          }),
        } as never;
      }
      // Latest sync event cursor
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never;
    });

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '1',
        op: 'create',
        payload: { babyId: 1, method: 'bottle', startedAt: new Date().toISOString() },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].status).toBe('error');
    expect(data.results[0].error).toBe('Access denied to this baby');
  });

  it('should handle update mutation with conflict detection', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const serverUpdatedAt = new Date('2024-01-02T00:00:00Z');
    const clientUpdatedAt = new Date('2024-01-01T00:00:00Z'); // Older than server

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        // User lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        // Access lookup
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      if (selectCallCount === 3) {
        // Existing entity lookup for conflict check
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{
                id: 101,
                babyId: 1,
                method: 'bottle',
                startedAt: new Date(),
                endedAt: null,
                durationMinutes: null,
                amountMl: 100,
                isEstimated: false,
                endSide: null,
                loggedByUserId: 1,
                createdAt: new Date(),
                updatedAt: serverUpdatedAt, // Server has newer data
              }]),
            }),
          }),
        } as never;
      }
      // Latest sync event cursor
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 10 }]),
          }),
        }),
      } as never;
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
          method: 'bottle',
          startedAt: new Date().toISOString(),
          amountMl: 150,
          updatedAt: clientUpdatedAt.toISOString(),
        },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].status).toBe('conflict');
    expect(data.results[0].serverData).toBeDefined();
    expect(data.results[0].serverData.amountMl).toBe(100); // Server value
  });

  it('should handle delete mutation', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      if (selectCallCount === 3) {
        // Existing entity check
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ babyId: 1 }]),
            }),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 10 }]),
          }),
        }),
      } as never;
    });

    vi.mocked(db.delete).mockReturnValue({
      where: vi.fn().mockResolvedValue(undefined),
    } as never);

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockResolvedValue(undefined),
    } as never);

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '101',
        op: 'delete',
        payload: { babyId: 1 },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].status).toBe('success');
  });

  it('should handle delete of non-existent entity as success', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      if (selectCallCount === 3) {
        // Entity not found
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never;
    });

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'feed_log',
        entityId: '999',
        op: 'delete',
        payload: { babyId: 1 },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].status).toBe('success');
  });

  it('should return error for unknown entity type', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never;
    });

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [{
        mutationId: 'mut_1',
        entityType: 'unknown_type',
        entityId: '1',
        op: 'create',
        payload: { babyId: 1 },
      }],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results[0].status).toBe('error');
    expect(data.results[0].error).toContain('Unknown entity type');
  });

  it('should process multiple mutations', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let selectCallCount = 0;
    vi.mocked(db.select).mockImplementation(() => {
      selectCallCount++;
      if (selectCallCount === 1) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ id: 1 }]),
            }),
          }),
        } as never;
      }
      if (selectCallCount === 2) {
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { babyId: 1, accessLevel: 'owner' },
            ]),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          orderBy: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([{ id: 20 }]),
          }),
        }),
      } as never;
    });

    vi.mocked(db.insert).mockReturnValue({
      values: vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{
          id: 101,
          babyId: 1,
          loggedByUserId: 1,
          method: 'bottle',
          startedAt: new Date(),
          endedAt: null,
          durationMinutes: null,
          amountMl: 120,
          isEstimated: false,
          endSide: null,
          createdAt: new Date(),
          updatedAt: null,
        }]),
      }),
    } as never);

    const { POST } = await import('./route');

    const request = createRequest({
      mutations: [
        {
          mutationId: 'mut_1',
          entityType: 'feed_log',
          entityId: '1',
          op: 'create',
          payload: { babyId: 1, method: 'bottle', startedAt: new Date().toISOString() },
        },
        {
          mutationId: 'mut_2',
          entityType: 'feed_log',
          entityId: '2',
          op: 'create',
          payload: { babyId: 1, method: 'breast', startedAt: new Date().toISOString() },
        },
      ],
    });

    const response = await POST(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.results).toHaveLength(2);
    expect(data.results[0].mutationId).toBe('mut_1');
    expect(data.results[1].mutationId).toBe('mut_2');
  });
});
