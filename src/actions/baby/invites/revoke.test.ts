import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babyInvitesSchema } from '@/models/Schema';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
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
  const { revokeInvite } = await import('./revoke');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    revokeInvite,
    auth,
    db,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('revokeInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { revokeInvite, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await revokeInvite({ inviteId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.update).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await revokeInvite({ inviteId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Invite exists
      const inviteSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 100, babyId: 42 }]),
        }),
      });

      // User is not owner
      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: inviteSelectFrom } as any)
        .mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await revokeInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Only baby owners can revoke invites');
      }

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should fail when invite not found', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Invite not found
      const inviteSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: inviteSelectFrom } as any);

      const result = await revokeInvite({ inviteId: 999 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite not found');
      }
    });
  });

  describe('revoking invite', () => {
    it('should update invite status to revoked', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId, db, revalidatePath } = await loadSubject();

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
          limit: vi.fn().mockResolvedValue([{ id: 100, babyId: 42 }]),
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

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await revokeInvite({ inviteId: 100 });

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(babyInvitesSchema);
      expect(updateSet).toHaveBeenCalledWith(
        expect.objectContaining({
          status: 'revoked',
          revokedAt: expect.any(Date),
        }),
      );
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await revokeInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { revokeInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await revokeInvite({ inviteId: 100 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
