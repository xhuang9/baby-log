import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babyAccessSchema, userSchema } from '@/models/Schema';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    select: vi.fn(),
    delete: vi.fn(),
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
  const { removeCaregiver } = await import('./remove');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    removeCaregiver,
    auth,
    db,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('removeCaregiver', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { removeCaregiver, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await removeCaregiver({ babyId: 1, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });

    it('should fail when user not found', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await removeCaregiver({ babyId: 1, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Caller is not owner
      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: callerAccessSelectFrom } as any);

      const result = await removeCaregiver({ babyId: 42, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Only baby owners can remove caregivers');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('validation', () => {
    it('should fail when trying to remove self', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Caller is owner
      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select).mockReturnValueOnce({ from: callerAccessSelectFrom } as any);

      const result = await removeCaregiver({ babyId: 42, userId: 1 }); // userId matches localUser.id

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Cannot remove yourself');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });

    it('should fail when trying to remove owner', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Caller is owner
      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      // Target is also owner
      const targetAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: callerAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: targetAccessSelectFrom } as any);

      const result = await removeCaregiver({ babyId: 42, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Cannot remove another owner');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });

    it('should fail when caregiver not found', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Caller is owner
      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      // Target not found
      const targetAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: callerAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: targetAccessSelectFrom } as any);

      const result = await removeCaregiver({ babyId: 42, userId: 999 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User does not have access to this baby');
      }

      expect(db.delete).not.toHaveBeenCalled();
    });
  });

  describe('removing caregiver', () => {
    it('should delete babyAccess record', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      // Caller is owner
      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      // Target is editor
      const targetAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'editor' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: callerAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: targetAccessSelectFrom } as any);

      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: deleteWhere } as any);

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await removeCaregiver({ babyId: 42, userId: 2 });

      expect(result.success).toBe(true);
      expect(db.delete).toHaveBeenCalledWith(babyAccessSchema);
      expect(deleteWhere).toHaveBeenCalled();
    });

    it('should clear defaultBabyId if it matches removed baby', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      const targetAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'editor' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: callerAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: targetAccessSelectFrom } as any);

      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: deleteWhere } as any);

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await removeCaregiver({ babyId: 42, userId: 2 });

      expect(db.update).toHaveBeenCalledWith(userSchema);
      expect(updateSet).toHaveBeenCalledWith({ defaultBabyId: null });
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate share and overview paths', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db, revalidatePath } = await loadSubject();

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

      const callerAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'owner' }]),
        }),
      });

      const targetAccessSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ accessLevel: 'viewer' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: callerAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: targetAccessSelectFrom } as any);

      const deleteWhere = vi.fn().mockResolvedValue(undefined);
      vi.mocked(db.delete).mockReturnValue({ where: deleteWhere } as any);

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });
      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await removeCaregiver({ babyId: 42, userId: 2 });

      expect(revalidatePath).toHaveBeenCalledWith('/settings/babies/42/share');
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await removeCaregiver({ babyId: 42, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { removeCaregiver, auth, getLocalUserByClerkId, db } = await loadSubject();

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

      const result = await removeCaregiver({ babyId: 42, userId: 2 });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
