/**
 * Unit Tests for Delta Sync Pull API Endpoint
 *
 * @see src/app/[locale]/api/sync/pull/route.ts
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
  },
}));

describe('GET /api/sync/pull', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return 401 if not authenticated', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: null } as never);

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1', since: '0' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(401);
    expect(data.error).toBe('Unauthorized');
  });

  it('should return 400 if babyId is missing', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ since: '0' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('babyId is required');
  });

  it('should return 400 if babyId is not a number', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: 'invalid' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(400);
    expect(data.error).toBe('babyId must be a number');
  });

  it('should return 404 if user not found', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    // Mock user lookup returning empty
    vi.mocked(db.select).mockReturnValue({
      from: vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      }),
    } as never);

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(404);
    expect(data.error).toBe('User not found');
  });

  it('should return 403 if user has no access to baby', async () => {
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
      // Access lookup - no access
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as never;
    });

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(403);
    expect(data.error).toBe('Access denied to this baby');
  });

  it('should return changes for authorized user', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    const mockChanges = [
      {
        id: 1,
        entityType: 'feed_log',
        entityId: 101,
        op: 'create',
        payload: JSON.stringify({ id: '101', babyId: 1, method: 'bottle' }),
        createdAt: new Date('2024-01-01T10:00:00Z'),
      },
      {
        id: 2,
        entityType: 'feed_log',
        entityId: 102,
        op: 'update',
        payload: JSON.stringify({ id: '102', babyId: 1, method: 'breast' }),
        createdAt: new Date('2024-01-01T11:00:00Z'),
      },
    ];

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
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ babyId: 1 }]),
            }),
          }),
        } as never;
      }
      // Sync events lookup
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockChanges),
            }),
          }),
        }),
      } as never;
    });

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1', since: '0', limit: '100' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.changes).toHaveLength(2);
    expect(data.changes[0].type).toBe('feed_log');
    expect(data.changes[0].op).toBe('create');
    expect(data.nextCursor).toBe(2);
    expect(data.hasMore).toBe(false);
  });

  it('should return hasMore=true when more results exist', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    // Create 3 changes (limit + 1 to indicate hasMore)
    const mockChanges = Array.from({ length: 3 }, (_, i) => ({
      id: i + 1,
      entityType: 'feed_log',
      entityId: 100 + i,
      op: 'create',
      payload: JSON.stringify({ id: String(100 + i), babyId: 1 }),
      createdAt: new Date(),
    }));

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
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ babyId: 1 }]),
            }),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue(mockChanges),
            }),
          }),
        }),
      } as never;
    });

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1', limit: '2' }),
      },
    } as unknown as NextRequest;

    const response = await GET(request);
    const data = await response.json();

    expect(response.status).toBe(200);
    expect(data.changes).toHaveLength(2);
    expect(data.hasMore).toBe(true);
    expect(data.nextCursor).toBe(2);
  });

  it('should clamp limit to max 500', async () => {
    const { auth } = await import('@clerk/nextjs/server');
    const { db } = await import('@/lib/db');

    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as never);

    let capturedLimit: number | undefined;

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
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([{ babyId: 1 }]),
            }),
          }),
        } as never;
      }
      return {
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockReturnValue({
              limit: vi.fn().mockImplementation((limit: number) => {
                capturedLimit = limit;
                return Promise.resolve([]);
              }),
            }),
          }),
        }),
      } as never;
    });

    const { GET } = await import('./route');

    const request = {
      nextUrl: {
        searchParams: new URLSearchParams({ babyId: '1', limit: '1000' }),
      },
    } as unknown as NextRequest;

    await GET(request);

    // Should be clamped to 500 + 1 (for hasMore check)
    expect(capturedLimit).toBe(501);
  });
});
