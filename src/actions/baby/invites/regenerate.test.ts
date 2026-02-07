import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    transaction: vi.fn(),
  },
}));

vi.mock('@/lib/invites/invite-helpers', () => ({
  createEmailInviteJWT: vi.fn(),
  generateJti: vi.fn(),
  generatePasskey: vi.fn(),
  generateTokenPrefix: vi.fn(),
  getEmailInviteExpiryDate: vi.fn(),
  getPasskeyExpiryDate: vi.fn(),
  hashToken: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { regenerateInvite } = await import('./regenerate');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const {
    createEmailInviteJWT,
    generateJti,
    generatePasskey,
    generateTokenPrefix,
    getEmailInviteExpiryDate,
    getPasskeyExpiryDate,
    hashToken,
  } = await import('@/lib/invites/invite-helpers');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    regenerateInvite,
    auth,
    db,
    createEmailInviteJWT,
    generateJti,
    generatePasskey,
    generateTokenPrefix,
    getEmailInviteExpiryDate,
    getPasskeyExpiryDate,
    hashToken,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('regenerateInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { regenerateInvite, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await regenerateInvite({ inviteId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.select).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await regenerateInvite({ inviteId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 100, babyId: 42, accessLevel: 'editor', inviteType: 'passkey', invitedEmail: null, status: 'pending' },
          ]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Only baby owners can regenerate invites');
      }
    });
  });

  describe('validation', () => {
    it('should fail when invite not found', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await regenerateInvite({ inviteId: 999 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite not found');
      }
    });

    it('should fail when invite is not pending', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 100, babyId: 42, accessLevel: 'editor', inviteType: 'passkey', invitedEmail: null, status: 'accepted' },
          ]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Can only regenerate pending invites');
      }
    });
  });

  describe('regenerating passkey invite', () => {
    it('should revoke old invite and create new passkey', async () => {
      const {
        regenerateInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        hashToken,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        revalidatePath,
      } = await loadSubject();

      const expiresAt = new Date('2024-01-15T11:00:00Z');

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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 100, babyId: 42, accessLevel: 'editor', inviteType: 'passkey', invitedEmail: null, status: 'pending' },
          ]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      vi.mocked(generatePasskey).mockReturnValue('654321');
      vi.mocked(hashToken).mockReturnValue('hashed_654321');
      vi.mocked(generateTokenPrefix).mockReturnValue('65');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(expiresAt);

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 200, babyId: 42 }]),
            }),
          }),
        };
        return callback(mockTx as any);
      });

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(true);

      if (result.success && result.inviteType === 'passkey') {
        expect(result.code).toBe('654321');
        expect(result.expiresAt).toBe(expiresAt);
        expect(result.inviteId).toBe(200);
      }

      expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('regenerating email invite', () => {
    it('should revoke old invite and create new email invite', async () => {
      const {
        regenerateInvite,
        auth,
        getLocalUserByClerkId,
        db,
        createEmailInviteJWT,
        generateJti,
        hashToken,
        getEmailInviteExpiryDate,
        revalidatePath,
      } = await loadSubject();

      const expiresAt = new Date('2024-01-22T10:00:00Z');

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
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([
            { id: 100, babyId: 42, accessLevel: 'viewer', inviteType: 'email', invitedEmail: 'invited@example.com', status: 'pending' },
          ]),
        }),
      });

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      vi.mocked(getEmailInviteExpiryDate).mockReturnValue(expiresAt);
      vi.mocked(generateJti).mockReturnValue('test-jti-uuid');
      vi.mocked(hashToken).mockReturnValue('hashed_jti');
      vi.mocked(createEmailInviteJWT).mockReturnValue('new_jwt_token');

      vi.mocked(db.transaction).mockImplementation(async (callback) => {
        const mockTx = {
          update: vi.fn().mockReturnValue({
            set: vi.fn().mockReturnValue({
              where: vi.fn().mockResolvedValue(undefined),
            }),
          }),
          insert: vi.fn().mockReturnValue({
            values: vi.fn().mockReturnValue({
              returning: vi.fn().mockResolvedValue([{ id: 200, babyId: 42 }]),
            }),
          }),
        };
        return callback(mockTx as any);
      });

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(true);

      if (result.success && result.inviteType === 'email') {
        expect(result.inviteLink).toContain('new_jwt_token');
        expect(result.expiresAt).toBe(expiresAt);
        expect(result.inviteId).toBe(200);
      }

      expect(generateJti).toHaveBeenCalled();
      expect(hashToken).toHaveBeenCalledWith('test-jti-uuid');
      expect(db.transaction).toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { regenerateInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await regenerateInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
