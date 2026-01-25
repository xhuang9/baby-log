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
  const { verifyBabyAccess } = await import('./verify');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');

  return {
    verifyBabyAccess,
    auth,
    db,
    getLocalUserByClerkId,
  };
};

describe('verifyBabyAccess', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { verifyBabyAccess, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await verifyBabyAccess(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await verifyBabyAccess(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }

      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('access verification', () => {
    it('should return owner access level', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Mock baby exists query
      const babySelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, name: 'Baby' }]),
        }),
      });

      // Mock access check query
      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babySelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(true);

      if (result.success && result.hasAccess) {
        expect(result.accessLevel).toBe('owner');
      }
    });

    it('should return editor access level', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const babySelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, name: 'Baby' }]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'editor' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babySelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(true);

      if (result.success && result.hasAccess) {
        expect(result.accessLevel).toBe('editor');
      }
    });

    it('should return viewer access level', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const babySelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, name: 'Baby' }]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'viewer' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babySelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(true);

      if (result.success && result.hasAccess) {
        expect(result.accessLevel).toBe('viewer');
      }
    });

    it('should return no access when user has no access record', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const babySelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 42, name: 'Baby' }]),
        }),
      });

      // No access record found
      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babySelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(true);

      if (result.success && !result.hasAccess) {
        expect(result.reason).toBe('no_access');
      }
    });

    it('should return baby_not_found when baby does not exist', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Baby not found
      const babySelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: babySelectFrom } as any);

      const result = await verifyBabyAccess(999);

      expect(result.success).toBe(true);

      if (result.success && !result.hasAccess) {
        expect(result.reason).toBe('baby_not_found');
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { verifyBabyAccess, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await verifyBabyAccess(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
