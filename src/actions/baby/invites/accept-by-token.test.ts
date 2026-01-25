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
  verifyEmailInviteJWT: vi.fn(),
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
  const { acceptInviteByToken } = await import('./accept-by-token');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { verifyEmailInviteJWT, hashToken } = await import('@/lib/invites/invite-helpers');
  const { getLatestSyncCursor } = await import('@/lib/db/helpers/sync-events');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    acceptInviteByToken,
    auth,
    db,
    verifyEmailInviteJWT,
    hashToken,
    getLatestSyncCursor,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('acceptInviteByToken', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { acceptInviteByToken, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });
  });

  describe('JWT validation', () => {
    it('should fail with invalid JWT', async () => {
      const { acceptInviteByToken, auth, verifyEmailInviteJWT } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue(null);

      const result = await acceptInviteByToken({ token: 'invalid_token' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invalid or expired invite link');
      }
    });
  });

  describe('email verification', () => {
    it('should fail when user email does not match invite', async () => {
      const { acceptInviteByToken, auth, verifyEmailInviteJWT, getLocalUserByClerkId }
        = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'different@example.com',
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('This invite was sent to a different email address');
      }
    });

    it('should succeed when emails match (case insensitive)', async () => {
      const {
        acceptInviteByToken,
        auth,
        verifyEmailInviteJWT,
        hashToken,
        getLocalUserByClerkId,
        db,
        getLatestSyncCursor,
      } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'INVITED@EXAMPLE.COM',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'invited@example.com',
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });
      vi.mocked(hashToken).mockReturnValue('hashed_jti');

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

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(true);
    });
  });

  describe('accepting invite', () => {
    it('should accept invite and return baby details', async () => {
      const {
        acceptInviteByToken,
        auth,
        verifyEmailInviteJWT,
        hashToken,
        getLocalUserByClerkId,
        db,
        getLatestSyncCursor,
        revalidatePath,
      } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'invited@example.com',
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });
      vi.mocked(hashToken).mockReturnValue('hashed_jti');

      const inviteSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 100,
                babyId: 42,
                accessLevel: 'viewer',
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

      vi.mocked(getLatestSyncCursor).mockResolvedValue(54321);

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 42,
          name: 'Test Baby',
          accessLevel: 'viewer',
          caregiverLabel: null,
        });
        expect(result.initialSyncCursor).toBe(54321);
      }

      expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
      expect(revalidatePath).toHaveBeenCalledWith('/account/bootstrap');
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });

    it('should fail if user already has access', async () => {
      const {
        acceptInviteByToken,
        auth,
        verifyEmailInviteJWT,
        hashToken,
        getLocalUserByClerkId,
        db,
      } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'invited@example.com',
          firstName: null,
          locked: false,
          defaultBabyId: null,
        },
      });
      vi.mocked(hashToken).mockReturnValue('hashed_jti');

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

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('You already have access to this baby');
      }
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { acceptInviteByToken, auth, verifyEmailInviteJWT, hashToken, getLocalUserByClerkId, db }
        = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'invited@example.com',
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

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { acceptInviteByToken, auth, verifyEmailInviteJWT, hashToken, getLocalUserByClerkId, db }
        = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(verifyEmailInviteJWT).mockReturnValue({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
        jti: 'unique_id',
      });
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: 'invited@example.com',
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

      const result = await acceptInviteByToken({ token: 'valid_jwt_token_string' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
