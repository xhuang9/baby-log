import { beforeEach, describe, expect, it, vi } from 'vitest';
import { babiesSchema, babyAccessSchema } from '@/models/Schema';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: { update: vi.fn() },
}));

vi.mock('@/lib/db/helpers/sync-events', () => ({
  writeSyncEvent: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  assertUserCanEditBaby: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

const loadSubject = async () => {
  const { updateBaby } = await import('./update');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  const { writeSyncEvent } = await import('@/lib/db/helpers/sync-events');
  const { assertUserCanEditBaby } = await import('@/services/baby-access');
  const { revalidatePath } = await import('next/cache');

  return {
    updateBaby,
    auth,
    db,
    writeSyncEvent,
    assertUserCanEditBaby,
    revalidatePath,
  };
};

describe('updateBaby', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { updateBaby, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await updateBaby(1, { name: 'Updated Name' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('authorization', () => {
    it('should fail when user cannot edit baby', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: false,
        error: 'Access denied',
      });

      const result = await updateBaby(1, { name: 'Updated Name' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Access denied');
      }

      expect(db.update).not.toHaveBeenCalled();
    });
  });

  describe('baby profile updates', () => {
    it('should update baby name only', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent, revalidatePath }
        = await loadSubject();

      const updatedAt = new Date('2024-01-15T10:00:00Z');
      const createdAt = new Date('2024-01-01T10:00:00Z');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Old Name' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'Updated Name',
              ownerUserId: 1,
              birthDate: null,
              gender: null,
              birthWeightG: null,
              createdAt,
              updatedAt,
              archivedAt: null,
            },
          ]),
        }),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);
      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      const result = await updateBaby(1, { name: 'Updated Name' });

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalledWith(babiesSchema);
      expect(updateSet).toHaveBeenCalledWith({ name: 'Updated Name' });
      expect(writeSyncEvent).toHaveBeenCalledWith({
        babyId: 1,
        entityType: 'baby',
        entityId: 1,
        op: 'update',
        payload: expect.objectContaining({
          id: 1,
          name: 'Updated Name',
        }),
      });
      expect(revalidatePath).toHaveBeenCalledWith('/settings');
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });

    it('should update baby with all profile fields', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent } = await loadSubject();

      const birthDate = new Date('2023-06-15');
      const updatedAt = new Date('2024-01-15T10:00:00Z');
      const createdAt = new Date('2024-01-01T10:00:00Z');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Old Name' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'New Baby',
              ownerUserId: 1,
              birthDate,
              gender: 'female',
              birthWeightG: 3500,
              createdAt,
              updatedAt,
              archivedAt: null,
            },
          ]),
        }),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);
      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      const result = await updateBaby(1, {
        name: 'New Baby',
        birthDate,
        gender: 'female',
        birthWeightG: 3500,
      });

      expect(result.success).toBe(true);
      expect(updateSet).toHaveBeenCalledWith({
        name: 'New Baby',
        birthDate,
        gender: 'female',
        birthWeightG: 3500,
      });
      expect(writeSyncEvent).toHaveBeenCalledWith(
        expect.objectContaining({
          payload: expect.objectContaining({
            name: 'New Baby',
            gender: 'female',
            birthWeightG: 3500,
          }),
        }),
      );
    });

    it('should handle null values for optional fields', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent } = await loadSubject();

      const updatedAt = new Date('2024-01-15T10:00:00Z');
      const createdAt = new Date('2024-01-01T10:00:00Z');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'Baby',
              ownerUserId: 1,
              birthDate: null,
              gender: null,
              birthWeightG: null,
              createdAt,
              updatedAt,
              archivedAt: null,
            },
          ]),
        }),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);
      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      const result = await updateBaby(1, {
        birthDate: null,
        gender: null,
        birthWeightG: null,
      });

      expect(result.success).toBe(true);
      expect(updateSet).toHaveBeenCalledWith({
        birthDate: null,
        gender: null,
        birthWeightG: null,
      });
    });
  });

  describe('caregiver label updates', () => {
    it('should update caregiver label without baby fields', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent, revalidatePath }
        = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await updateBaby(1, { caregiverLabel: 'Grandma' });

      expect(result.success).toBe(true);
      // Should only update babyAccessSchema for caregiver label
      expect(db.update).toHaveBeenCalledTimes(1);
      expect(db.update).toHaveBeenCalledWith(babyAccessSchema);
      expect(updateSet).toHaveBeenCalledWith({ caregiverLabel: 'Grandma' });
      // Should NOT write sync event for caregiver-only updates
      expect(writeSyncEvent).not.toHaveBeenCalled();
      expect(revalidatePath).toHaveBeenCalledWith('/settings');
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });

    it('should update both baby profile and caregiver label', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent } = await loadSubject();

      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-15T10:00:00Z');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const babyUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'New Name',
              ownerUserId: 1,
              birthDate: null,
              gender: null,
              birthWeightG: null,
              createdAt,
              updatedAt,
              archivedAt: null,
            },
          ]),
        }),
      });

      const accessUpdateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update)
        .mockReturnValueOnce({ set: babyUpdateSet } as any)
        .mockReturnValueOnce({ set: accessUpdateSet } as any);

      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      const result = await updateBaby(1, { name: 'New Name', caregiverLabel: 'Grandma' });

      expect(result.success).toBe(true);
      expect(db.update).toHaveBeenCalledTimes(2);
      expect(db.update).toHaveBeenNthCalledWith(1, babiesSchema);
      expect(db.update).toHaveBeenNthCalledWith(2, babyAccessSchema);
      expect(babyUpdateSet).toHaveBeenCalledWith({ name: 'New Name' });
      expect(accessUpdateSet).toHaveBeenCalledWith({ caregiverLabel: 'Grandma' });
      expect(writeSyncEvent).toHaveBeenCalled();
    });
  });

  describe('sync events', () => {
    it('should write sync event after baby profile update', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent } = await loadSubject();

      const createdAt = new Date('2024-01-01T10:00:00Z');
      const updatedAt = new Date('2024-01-15T10:00:00Z');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Old Name' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'New Name',
              ownerUserId: 1,
              birthDate: null,
              gender: null,
              birthWeightG: null,
              createdAt,
              updatedAt,
              archivedAt: null,
            },
          ]),
        }),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);
      vi.mocked(writeSyncEvent).mockResolvedValue(1);

      await updateBaby(1, { name: 'New Name' });

      expect(writeSyncEvent).toHaveBeenCalledWith({
        babyId: 1,
        entityType: 'baby',
        entityId: 1,
        op: 'update',
        payload: {
          id: 1,
          name: 'New Name',
          birthDate: null,
          gender: null,
          birthWeightG: null,
          archivedAt: null,
          ownerUserId: 1,
          createdAt: createdAt.toISOString(),
          updatedAt: updatedAt.toISOString(),
        },
      });
    });

    it('should NOT write sync event for caregiver-only updates', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, writeSyncEvent } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await updateBaby(1, { caregiverLabel: 'Grandma' });

      expect(writeSyncEvent).not.toHaveBeenCalled();
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate settings and overview paths after update', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db, revalidatePath } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      await updateBaby(1, { caregiverLabel: 'Grandma' });

      expect(revalidatePath).toHaveBeenCalledWith('/settings');
      expect(revalidatePath).toHaveBeenCalledWith('/overview');
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      const testError = new Error('Database connection failed');
      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(testError),
          }),
        }),
      } as any);

      const result = await updateBaby(1, { name: 'New Name' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { updateBaby, auth, assertUserCanEditBaby, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(assertUserCanEditBaby).mockResolvedValue({
        success: true,
        data: {
          user: { id: 1, clerkId: 'clerk_123', email: null, firstName: null, locked: false, defaultBabyId: 1 },
          access: { babyId: 1, userId: 1, accessLevel: 'owner', caregiverLabel: 'Parent', babyName: 'Baby' },
        },
      });

      vi.mocked(db.update).mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue('Unknown string error'),
          }),
        }),
      } as any);

      const result = await updateBaby(1, { name: 'New Name' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });
  });
});
