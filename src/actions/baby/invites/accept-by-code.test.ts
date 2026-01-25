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
    transaction: vi.fn(),
  },
}));

vi.mock('@/lib/invites/invite-helpers', () => ({
  hashToken: vi.fn(),
}));

vi.mock('@/lib/db/helpers/sync-events', () => ({
  getLatestSyncCursor: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { acceptInviteByCode } = await import('./accept-by-code');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { hashToken } = await import('@/lib/invites/invite-helpers');
  const { getLatestSyncCursor } = await import('@/lib/db/helpers/sync-events');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    acceptInviteByCode,
    auth,
    db,
    hashToken,
    getLatestSyncCursor,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('acceptInviteByCode', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { acceptInviteByCode, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });
  });

  describe('invite lookup', () => {
    it('should fail with generic error for non-existent code', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed_code');

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInviteByCode({ code: '999999' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invalid or expired code');
      }
    });

    it('should fail for expired invite', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed_code');

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
                usesCount: 0,
                maxUses: 1,
                babyName: 'Baby',
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invalid or expired code');
      }
    });

    it('should fail when max uses reached', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed_code');

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
                usesCount: 1,
                maxUses: 1,
                babyName: 'Baby',
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invalid or expired code');
      }
    });
  });

  describe('accepting invite', () => {
    it('should fail if user already has access', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed_code');

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
                usesCount: 0,
                maxUses: 1,
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

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('You already have access to this baby');
      }
    });

    it('should accept invite and return baby details', async () => {
      const {
        acceptInviteByCode,
        auth,
        getLocalUserByClerkId,
        db,
        hashToken,
        getLatestSyncCursor,
        revalidatePath,
      } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed_code');

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
                usesCount: 0,
                maxUses: 1,
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

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockTx = {
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockResolvedValue(undefined),
          }),
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
        };
        return callback(mockTx as any);
      });

      vi.mocked(getLatestSyncCursor).mockResolvedValue(12345);

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 42,
          name: 'Test Baby',
          accessLevel: 'editor',
          caregiverLabel: null,
        });
        expect(result.initialSyncCursor).toBe(12345);
      }

      expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
      expect(revalidatePath).toHaveBeenCalledWith('/account/bootstrap');
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed');

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

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { acceptInviteByCode, auth, getLocalUserByClerkId, db, hashToken } = await loadSubject();

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

      vi.mocked(hashToken).mockReturnValue('hashed');

      vi.mocked(db.select).mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockRejectedValue('Unknown string error'),
            }),
          }),
        }),
      } as any);

      const result = await acceptInviteByCode({ code: '123456' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
