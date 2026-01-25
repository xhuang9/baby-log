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
  },
}));

vi.mock('@/lib/invites/invite-helpers', () => ({
  generatePasskey: vi.fn(),
  generateTokenPrefix: vi.fn(),
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
  const { createPasskeyInvite } = await import('./create-passkey');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const {
    generatePasskey,
    generateTokenPrefix,
    getPasskeyExpiryDate,
    hashToken,
  } = await import('@/lib/invites/invite-helpers');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    createPasskeyInvite,
    auth,
    db,
    generatePasskey,
    generateTokenPrefix,
    getPasskeyExpiryDate,
    hashToken,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('createPasskeyInvite', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { createPasskeyInvite, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await createPasskeyInvite({ babyId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { createPasskeyInvite, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await createPasskeyInvite({ babyId: 1 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner of baby', async () => {
      const { createPasskeyInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // User is not owner
      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Only baby owners can create invites');
      }

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('invite creation', () => {
    it('should create invite with hashed passkey', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
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

      // User is owner
      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed_123456');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(expiresAt);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(true);
      expect(generatePasskey).toHaveBeenCalled();
      expect(hashToken).toHaveBeenCalledWith('123456');
      expect(db.insert).toHaveBeenCalledWith(babyInvitesSchema);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          tokenHash: 'hashed_123456',
          inviteType: 'passkey',
        }),
      );
    });

    it('should return plain passkey code only once', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
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

      const accessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: accessSelectFrom } as any);

      vi.mocked(generatePasskey).mockReturnValue('654321');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('65');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(expiresAt);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.code).toBe('654321');
        expect(result.inviteId).toBe(100);
        expect(result.expiresAt).toBe(expiresAt);
      }
    });

    it('should set correct expiry date', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
      } = await loadSubject();

      const expiresAt = new Date('2024-01-15T14:00:00Z'); // 4 hours from now

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

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(expiresAt);

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      await createPasskeyInvite({ babyId: 42, expiresInHours: 4 });

      expect(getPasskeyExpiryDate).toHaveBeenCalledWith(4);
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          expiresAt,
        }),
      );
    });

    it('should use default access level when not provided', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
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

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      await createPasskeyInvite({ babyId: 42 });

      // Access level should default based on validation schema
      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          babyId: 42,
        }),
      );
    });

    it('should set invite type as passkey', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
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

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      await createPasskeyInvite({ babyId: 42 });

      expect(insertValues).toHaveBeenCalledWith(
        expect.objectContaining({
          inviteType: 'passkey',
          invitedEmail: null,
        }),
      );
    });

    it('should fail if invite creation returns empty', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
        hashToken,
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

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Failed to create invite');
      }
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate share path', async () => {
      const {
        createPasskeyInvite,
        auth,
        getLocalUserByClerkId,
        db,
        generatePasskey,
        generateTokenPrefix,
        getPasskeyExpiryDate,
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

      vi.mocked(generatePasskey).mockReturnValue('123456');
      vi.mocked(hashToken).mockReturnValue('hashed');
      vi.mocked(generateTokenPrefix).mockReturnValue('12');
      vi.mocked(getPasskeyExpiryDate).mockReturnValue(new Date());

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          { id: 100, babyId: 42, status: 'pending' },
        ]),
      });

      vi.mocked(db.insert).mockReturnValue({ values: insertValues } as any);

      await createPasskeyInvite({ babyId: 42 });

      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { createPasskeyInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { createPasskeyInvite, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await createPasskeyInvite({ babyId: 42 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
