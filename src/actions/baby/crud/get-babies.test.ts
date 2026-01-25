import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
  },
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

const loadSubject = async () => {
  const { getUserBabies } = await import('./get-babies');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');

  return {
    getUserBabies,
    auth,
    db,
    getLocalUserByClerkId,
  };
};

describe('getUserBabies', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { getUserBabies, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found in database', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await getUserBabies();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }

      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('fetching babies', () => {
    it('should return empty array when user has no babies', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      const selectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue({ from: selectFrom } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.babies).toEqual([]);
      }
    });

    it('should return babies user has access to', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: 1,
        },
      });

      const mockBabies = [
        {
          babyId: 1,
          name: 'Baby One',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        },
        {
          babyId: 2,
          name: 'Baby Two',
          accessLevel: 'editor',
          caregiverLabel: 'Grandma',
        },
      ];

      const selectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockBabies),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue({ from: selectFrom } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.babies).toHaveLength(2);
        expect(result.babies[0]).toEqual({
          babyId: 1,
          name: 'Baby One',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        });
        expect(result.babies[1]).toEqual({
          babyId: 2,
          name: 'Baby Two',
          accessLevel: 'editor',
          caregiverLabel: 'Grandma',
        });
      }
    });

    it('should include correct structure for each baby', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: 1,
        },
      });

      const mockBabies = [
        {
          babyId: 42,
          name: 'Test Baby',
          accessLevel: 'viewer',
          caregiverLabel: null,
        },
      ];

      const selectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue(mockBabies),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValue({ from: selectFrom } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.babies[0]).toHaveProperty('babyId', 42);
        expect(result.babies[0]).toHaveProperty('name', 'Test Baby');
        expect(result.babies[0]).toHaveProperty('accessLevel', 'viewer');
        expect(result.babies[0]).toHaveProperty('caregiverLabel', null);
      }
    });

    it('should call database with correct query structure', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      const orderByMock = vi.fn().mockResolvedValue([]);
      const whereMock = vi.fn().mockReturnValue({ orderBy: orderByMock });
      const innerJoinMock = vi.fn().mockReturnValue({ where: whereMock });
      const fromMock = vi.fn().mockReturnValue({ innerJoin: innerJoinMock });

      vi.mocked(db.select).mockReturnValue({ from: fromMock } as any);

      await getUserBabies();

      expect(db.select).toHaveBeenCalled();
      expect(fromMock).toHaveBeenCalled();
      expect(innerJoinMock).toHaveBeenCalled();
      expect(whereMock).toHaveBeenCalled();
      expect(orderByMock).toHaveBeenCalled();
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      const testError = new Error('Database connection failed');
      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockRejectedValue(testError),
            }),
          }),
        }),
      } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { getUserBabies, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockRejectedValue('Unknown string error'),
            }),
          }),
        }),
      } as any);

      const result = await getUserBabies();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
