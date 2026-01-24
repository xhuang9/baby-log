import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babiesSchema, babyAccessSchema, userSchema } from '@/models/Schema';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { insert: vi.fn(), update: vi.fn() },
}));

vi.mock('@/lib/db/helpers/sync-events', () => ({
  writeSyncEvent: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { createBaby } = await import('./create');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { writeSyncEvent } = await import('@/lib/db/helpers/sync-events');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    createBaby,
    auth,
    db,
    writeSyncEvent,
    getLocalUserByClerkId,
    revalidatePath,
  };
};

describe('createBaby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { createBaby, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('user checks', () => {
    it('should return error when user is not found', async () => {
      const { createBaby, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: false,
        error: 'User not found',
      });

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
      expect(db.insert).not.toHaveBeenCalled();
    });

    it('should return error when account is locked', async () => {
      const { createBaby, auth, getLocalUserByClerkId, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(getLocalUserByClerkId).mockResolvedValue({
        success: true,
        data: {
          id: 1,
          clerkId: 'clerk_123',
          email: null,
          firstName: null,
          locked: true,
          defaultBabyId: null,
        },
      });

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Account is locked');
      }
      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('database operations', () => {
    it('should return error when baby creation fails', async () => {
      const { createBaby, auth, getLocalUserByClerkId, db } = await loadSubject();
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

      const insertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([]),
      });

      vi.mocked(db.insert).mockReturnValue({
        values: insertValues,
      } as any);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toBe('Failed to create baby');
      }
      expect(db.insert).toHaveBeenCalledTimes(1);
    });

    it('should create baby and owner access', async () => {
      const {
        createBaby,
        auth,
        db,
        getLocalUserByClerkId,
        writeSyncEvent,
        revalidatePath,
      } = await loadSubject();

      const createdAt = new Date('2024-01-15T10:00:00Z');

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

      const babyInsertValues = vi.fn().mockReturnValue({
        returning: vi.fn().mockResolvedValue([
          {
            id: 42,
            name: 'Test Baby',
            ownerUserId: 1,
            birthDate: null,
            gender: null,
            birthWeightG: null,
            createdAt,
            updatedAt: createdAt,
            archivedAt: null,
          },
        ]),
      });

      const accessInsertValues = vi.fn().mockResolvedValue(undefined);

      vi.mocked(db.insert)
        .mockReturnValueOnce({
          values: babyInsertValues,
        } as any)
        .mockReturnValueOnce({
          values: accessInsertValues,
        } as any);

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      } as any);

      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 42,
          name: 'Test Baby',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        });
      }

      expect(db.insert).toHaveBeenNthCalledWith(1, babiesSchema);
      expect(db.insert).toHaveBeenNthCalledWith(2, babyAccessSchema);
      expect(db.update).toHaveBeenCalledWith(userSchema);

      expect(babyInsertValues).toHaveBeenCalledWith({
        ownerUserId: 1,
        name: 'Test Baby',
        birthDate: null,
        gender: null,
        birthWeightG: null,
      });

      expect(accessInsertValues).toHaveBeenCalledWith({
        babyId: 42,
        userId: 1,
        accessLevel: 'owner',
        caregiverLabel: 'Parent',
        lastAccessedAt: expect.any(Date),
      });

      expect(writeSyncEvent).toHaveBeenCalledWith({
        babyId: 42,
        entityType: 'baby',
        entityId: 42,
        op: 'create',
        payload: {
          id: 42,
          name: 'Test Baby',
          birthDate: null,
          gender: null,
          birthWeightG: null,
          archivedAt: null,
          ownerUserId: 1,
          createdAt: createdAt.toISOString(),
          updatedAt: createdAt.toISOString(),
        },
      });

      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });
  });
});
