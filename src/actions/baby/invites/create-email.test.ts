import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babyInvitesSchema } from '@/models/Schema';

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

vi.mock('@/lib/invites/invite-helpers', () => ({
  createEmailInviteJWT: vi.fn(),
  getEmailInviteExpiryDate: vi.fn(),
  hashToken: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { createEmailInvite } = await import('./create-email');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { createEmailInviteJWT, getEmailInviteExpiryDate, hashToken } = await import(
    '@/lib/invites/invite-helpers',
  );
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    createEmailInvite,
    auth,
    db,
    createEmailInviteJWT,
    getEmailInviteExpiryDate,
    hashToken,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('createEmailInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { createEmailInvite, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await createEmailInvite({ babyId: 1, invitedEmail: 'test@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { createEmailInvite, auth, getLocalUserByClerkId } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await createEmailInvite({ babyId: 1, invitedEmail: 'test@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      const { createEmailInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'test@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Only baby owners can create invites');
      }
    });
  });

  describe('invite creation', () => {
    it('should create placeholder then update with JWT', async () => {
      const {
        createEmailInvite,
        auth,
        getLocalUserByClerkId,
        db,
        createEmailInviteJWT,
        getEmailInviteExpiryDate,
        hashToken,
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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);
      vi.mocked(getEmailInviteExpiryDate).mockReturnValue(expiresAt);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 100, babyId: 42, status: 'pending' }]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      vi.mocked(createEmailInviteJWT).mockReturnValue('jwt_token_here');
      vi.mocked(hashToken).mockReturnValue('hashed_jwt');

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'invited@example.com' });

      expect(result.success).toBe(true);
      expect(db.insert).toHaveBeenCalledWith(babyInvitesSchema);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          token: 'placeholder',
          inviteType: 'email',
          invitedEmail: 'invited@example.com',
        }),
      );
      expect(createEmailInviteJWT).toHaveBeenCalledWith({
        inviteId: 100,
        babyId: 42,
        email: 'invited@example.com',
      });
      expect(hashToken).toHaveBeenCalledWith('jwt_token_here');
      expect(db.update).toHaveBeenCalled();
    });

    it('should return invite URL with token', async () => {
      const {
        createEmailInvite,
        auth,
        getLocalUserByClerkId,
        db,
        createEmailInviteJWT,
        getEmailInviteExpiryDate,
        hashToken,
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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);
      vi.mocked(getEmailInviteExpiryDate).mockReturnValue(expiresAt);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 100, babyId: 42, status: 'pending' }]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);
      vi.mocked(createEmailInviteJWT).mockReturnValue('test_jwt_token');
      vi.mocked(hashToken).mockReturnValue('hashed');

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'invited@example.com' });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.inviteLink).toContain('test_jwt_token');
        expect(result.inviteLink).toContain('/account/bootstrap?invite=');
        expect(result.expiresAt).toBe(expiresAt);
        expect(result.inviteId).toBe(100);
      }
    });

    it('should fail if invite creation returns empty', async () => {
      const {
        createEmailInvite,
        auth,
        getLocalUserByClerkId,
        db,
        getEmailInviteExpiryDate,
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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);
      vi.mocked(getEmailInviteExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'invited@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Failed to create invite');
      }
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate share path', async () => {
      const {
        createEmailInvite,
        auth,
        getLocalUserByClerkId,
        db,
        createEmailInviteJWT,
        getEmailInviteExpiryDate,
        hashToken,
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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);
      vi.mocked(getEmailInviteExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([{ id: 100, babyId: 42, status: 'pending' }]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);
      vi.mocked(createEmailInviteJWT).mockReturnValue('jwt');
      vi.mocked(hashToken).mockReturnValue('hashed');

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await createEmailInvite({ babyId: 42, invitedEmail: 'invited@example.com' });

      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { createEmailInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'test@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { createEmailInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await createEmailInvite({ babyId: 42, invitedEmail: 'test@example.com' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
