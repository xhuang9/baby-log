import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babyAccessSchema, userSchema } from '@/models/Schema';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { update: vi.fn() },
}));

vi.mock('@/services/baby-access', () => ({
  assertUserCanAccessBaby: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { setDefaultBaby } = await import('./set-default');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { assertUserCanAccessBaby } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    setDefaultBaby,
    auth,
    db,
    assertUserCanAccessBaby,
    revalidatePath,
  };
};

describe('setDefaultBaby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { setDefaultBaby, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should fail when user cannot access baby', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: false,
        error: 'Access denied',
      });

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Access denied');
      }

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('setting default baby', () => {
    it('should update user defaultBabyId', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await setDefaultBaby(42);

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(userSchema);
      expect(updateSet).toHaveBeenCalledWith({ defaultBabyId: 42 });
    });

    it('should update lastAccessedAt on babyAccess', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const userUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      const accessUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update)
        .mockReturnValueOnce({ set: userUpdateSet } as any)
        .mockReturnValueOnce({ set: accessUpdateSet } as any);

      await setDefaultBaby(42);

      expect(db.update).toHaveBeenCalledTimes(2);
      expect(db.update).toHaveBeenNthCalledWith(1, userSchema);
      expect(db.update).toHaveBeenNthCalledWith(2, babyAccessSchema);
      expect(accessUpdateSet).toHaveBeenCalledWith({ lastAccessedAt: expect.any(Date) });
    });

    it('should return baby details on success', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'editor', caregiverLabel: 'Grandma', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await setDefaultBaby(42);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 42,
          name: 'Baby',
          accessLevel: 'editor',
          caregiverLabel: 'Grandma',
        });
      }
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate multiple paths', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db, revalidatePath } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await setDefaultBaby(42);

      expect(revalidatePath).toHaveBeenCalledWith('/overview');
      expect(revalidatePath).toHaveBeenCalledWith('/account/bootstrap');
      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const testError = new Error('Database connection failed');
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue(testError),
        }),
      } as any);

      const result = await setDefaultBaby(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { setDefaultBaby, auth, assertUserCanAccessBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanAccessBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: null },
          access: { babyId: 42, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockRejectedValue('Unknown string error'),
        }),
      } as any);

      const result = await setDefaultBaby(42);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
