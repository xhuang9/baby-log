import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    insert: vi.fn(),
    update: vi.fn(),
  },
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { acceptInvite } = await import('./accept-legacy');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    acceptInvite,
    auth,
    db,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('acceptInvite (legacy)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { acceptInvite, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });
  });

  describe('invite lookup', () => {
    it('should fail when invite not found', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInvite(999);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite not found');
      }
    });

    it('should fail for expired invite', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const expiredDate = new Date('2020-01-01');

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 100,
                babyId: 42,
                accessLevel: 'editor',
                status: 'pending',
                expiresAt: expiredDate,
                babyName: 'Baby',
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite has expired');
      }
    });

    it('should fail for non-pending invite', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 100,
                babyId: 42,
                accessLevel: 'editor',
                status: 'accepted',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                babyName: 'Baby',
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite is not pending');
      }
    });
  });

  describe('accepting invite', () => {
    it('should fail if user already has access', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 100,
                babyId: 42,
                accessLevel: 'editor',
                status: 'pending',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                babyName: 'Baby',
              },
            ]),
          }),
        }),
      });

      const existingAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: existingAccessSelectFrom } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('You already have access to this baby');
      }
    });

    it('should create babyAccess and update invite', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db, revalidatePath } = await loadSubject();

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

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 100,
                babyId: 42,
                accessLevel: 'editor',
                status: 'pending',
                expiresAt: new Date(Date.now() + 1000 * 60 * 60),
                babyName: 'Test Baby',
              },
            ]),
          }),
        }),
      });

      const existingAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: existingAccessSelectFrom } as any);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { babyId: 42, userId: 1, accessLevel: 'editor', caregiverLabel: null },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 42,
          name: 'Test Baby',
          accessLevel: 'editor',
          caregiverLabel: null,
        });
      }

      expect(db.insert).toHaveBeenCalled();
      expect(db.update).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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
              limit: vi.fn().mockRejectedValue(testError),
            }),
          }),
        }),
      } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { acceptInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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
              limit: vi.fn().mockRejectedValue('Unknown string error'),
            }),
          }),
        }),
      } as any);

      const result = await acceptInvite(100);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
