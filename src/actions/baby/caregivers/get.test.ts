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
  const { getCaregivers } = await import('./get');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');

  return {
    getCaregivers,
    auth,
    db,
    getLocalUserByClerkId,
  };
};

describe('getCaregivers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { getCaregivers, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await getCaregivers(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await getCaregivers(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }

      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should fail when user has no access to baby', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // User has no access to baby
      const accessCheckSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessCheckSelectFrom } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('No access to this baby');
      }
    });
  });

  describe('fetching caregivers', () => {
    it('should return empty array when no caregivers', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // User has access
      const accessCheckSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      // No caregivers (this shouldn't really happen, but testing edge case)
      const caregiversSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: accessCheckSelectFrom } as any)
        .mockReturnValueOnce({ from: caregiversSelectFrom } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.caregivers).toEqual([]);
      }
    });

    it('should return all caregivers with access to baby', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'current@example.com',
          firstName: 'Current',
          locked: false,
          defaultBabyId: null,
        },
      });

      const lastAccessedAt = new Date('2024-01-15T10:00:00Z');

      // User has access
      const accessCheckSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      // Multiple caregivers
      const caregiversSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { userId: 1, email: 'current@example.com', firstName: 'Current', accessLevel: 'owner', caregiverLabel: 'Parent', lastAccessedAt },
            { userId: 2, email: 'other@example.com', firstName: 'Other', accessLevel: 'editor', caregiverLabel: 'Grandma', lastAccessedAt },
          ]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: accessCheckSelectFrom } as any)
        .mockReturnValueOnce({ from: caregiversSelectFrom } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.caregivers).toHaveLength(2);
        expect(result.caregivers[0]).toEqual({
          userId: 1,
          email: 'current@example.com',
          firstName: 'Current',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
          lastAccessedAt: lastAccessedAt.toISOString(),
          isCurrentUser: true,
        });
        expect(result.caregivers[1]).toEqual({
          userId: 2,
          email: 'other@example.com',
          firstName: 'Other',
          accessLevel: 'editor',
          caregiverLabel: 'Grandma',
          lastAccessedAt: lastAccessedAt.toISOString(),
          isCurrentUser: false,
        });
      }
    });

    it('should mark current user correctly', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 5,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      const accessCheckSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      const caregiversSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { userId: 1, email: 'a@example.com', firstName: 'A', accessLevel: 'owner', caregiverLabel: 'Parent', lastAccessedAt: null },
            { userId: 5, email: 'b@example.com', firstName: 'B', accessLevel: 'editor', caregiverLabel: 'Nanny', lastAccessedAt: null },
            { userId: 10, email: 'c@example.com', firstName: 'C', accessLevel: 'viewer', caregiverLabel: null, lastAccessedAt: null },
          ]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: accessCheckSelectFrom } as any)
        .mockReturnValueOnce({ from: caregiversSelectFrom } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.caregivers[0]!.isCurrentUser).toBe(false);
        expect(result.caregivers[1]!.isCurrentUser).toBe(true);
        expect(result.caregivers[2]!.isCurrentUser).toBe(false);
      }
    });

    it('should handle null lastAccessedAt', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const accessCheckSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      const caregiversSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue([
            { userId: 1, email: 'test@example.com', firstName: 'Test', accessLevel: 'owner', caregiverLabel: 'Parent', lastAccessedAt: null },
          ]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: accessCheckSelectFrom } as any)
        .mockReturnValueOnce({ from: caregiversSelectFrom } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.caregivers[0]!.lastAccessedAt).toBeNull();
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

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
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue(testError),
          }),
        }),
      } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { getCaregivers, auth, getLocalUserByClerkId, db } = await loadSubject();

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
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockRejectedValue('Unknown string error'),
          }),
        }),
      } as any);

      const result = await getCaregivers(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
