/**
 * Baby Operations Tests
 *
 * Unit tests for baby CRUD operations
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import type { LocalBaby, LocalBabyAccess } from '@/lib/local-db';
import { createBaby, updateBabyProfile, setDefaultBaby, deleteBaby } from './baby';

// Mock dependencies
vi.mock('@/lib/local-db', () => ({
  localDb: {
    transaction: vi.fn((mode: string, tables: unknown[], callback: () => Promise<void>) => callback()),
    babies: {
      get: vi.fn(),
      bulkPut: vi.fn(),
    },
    babyAccess: {
      where: vi.fn(() => ({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn(),
        })),
      })),
    },
  },
  addToOutbox: vi.fn(),
  getAllLocalBabies: vi.fn(),
  getLocalBaby: vi.fn(),
  saveBabies: vi.fn(),
  saveBabyAccess: vi.fn(),
}));

vi.mock('@/services/sync-service', () => ({
  flushOutbox: vi.fn(),
}));

vi.mock('@/stores/useBabyStore', () => ({
  useBabyStore: {
    getState: vi.fn(() => ({
      activeBaby: null,
      allBabies: [],
      setActiveBaby: vi.fn(),
      setAllBabies: vi.fn(),
      clearActiveBaby: vi.fn(),
    })),
  },
}));

vi.mock('@/stores/useUserStore', () => ({
  useUserStore: {
    getState: vi.fn(() => ({
      user: {
        localId: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
      },
    })),
  },
}));

// Mock crypto.randomUUID for consistent IDs in tests
vi.stubGlobal('crypto', {
  randomUUID: vi.fn(() => 'test-uuid-1234'),
});

describe('Baby Operations', () => {
  beforeEach(async () => {
    vi.clearAllMocks();

    // Reset user store to default authenticated state
    const { useUserStore } = await import('@/stores/useUserStore');
    vi.mocked(useUserStore.getState).mockReturnValue({
      user: {
        localId: 1,
        clerkUserId: 'user_123',
        email: 'test@example.com',
      },
    });
  });

  describe('createBaby', () => {
    it('should create a baby successfully', async () => {
      const { addToOutbox, saveBabies, saveBabyAccess, getAllLocalBabies, localDb } = await import('@/lib/local-db');
      const { flushOutbox } = await import('@/services/sync-service');
      const { useBabyStore } = await import('@/stores/useBabyStore');

      vi.mocked(getAllLocalBabies).mockResolvedValue([]);

      // Mock babyAccess query for getting all babies
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn(),
          toArray: vi.fn().mockResolvedValue([]),
        })),
      } as never);

      const mockBabyStore = {
        activeBaby: null,
        allBabies: [],
        setActiveBaby: vi.fn(),
        setAllBabies: vi.fn(),
        clearActiveBaby: vi.fn(),
      };
      vi.mocked(useBabyStore.getState).mockReturnValue(mockBabyStore);

      const result = await createBaby({
        name: 'Test Baby',
        birthDate: new Date('2024-01-01'),
        gender: 'female',
        birthWeightG: 3500,
        caregiverLabel: 'Mom',
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('Test Baby');
        expect(result.data.gender).toBe('female');
        expect(result.data.birthWeightG).toBe(3500);
      }

      // Verify IndexedDB calls
      expect(saveBabies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            name: 'Test Baby',
            gender: 'female',
            birthWeightG: 3500,
          }),
        ])
      );

      expect(saveBabyAccess).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            accessLevel: 'owner',
            caregiverLabel: 'Mom',
            defaultBaby: true,
          }),
        ])
      );

      // Verify outbox enqueue
      expect(addToOutbox).toHaveBeenCalledWith(
        expect.objectContaining({
          mutationId: 'test-uuid-1234',
          entityType: 'baby',
          op: 'create',
          payload: expect.objectContaining({
            name: 'Test Baby',
          }),
        })
      );

      // Verify sync trigger
      expect(flushOutbox).toHaveBeenCalled();

      // Verify store updates
      expect(mockBabyStore.setActiveBaby).toHaveBeenCalled();
      expect(mockBabyStore.setAllBabies).toHaveBeenCalled();
    });

    it('should fail if name is empty', async () => {
      const result = await createBaby({
        name: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Baby name is required');
      }
    });

    it('should fail if user is not authenticated', async () => {
      const { useUserStore } = await import('@/stores/useUserStore');
      vi.mocked(useUserStore.getState).mockReturnValue({
        user: null,
      });

      const result = await createBaby({
        name: 'Test Baby',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Not authenticated');
      }
    });
  });

  describe('updateBabyProfile', () => {
    const mockBaby: LocalBaby = {
      id: 1,
      name: 'Old Name',
      birthDate: null,
      gender: null,
      birthWeightG: null,
      archivedAt: null,
      ownerUserId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockAccess: LocalBabyAccess = {
      oduserId: 1,
      babyId: 1,
      accessLevel: 'owner',
      caregiverLabel: 'Parent',
      lastAccessedAt: new Date(),
      defaultBaby: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should update baby profile successfully', async () => {
      const { getLocalBaby, localDb, saveBabies, addToOutbox } = await import('@/lib/local-db');
      const { flushOutbox } = await import('@/services/sync-service');

      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
          toArray: vi.fn(),
        })),
      } as never);

      const result = await updateBabyProfile(1, {
        name: 'New Name',
        birthDate: new Date('2024-01-15'),
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.name).toBe('New Name');
        expect(result.data.birthDate).toEqual(new Date('2024-01-15'));
      }

      // Verify IndexedDB update
      expect(saveBabies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            name: 'New Name',
            birthDate: new Date('2024-01-15'),
          }),
        ])
      );

      // Verify outbox enqueue
      expect(addToOutbox).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'baby',
          entityId: '1',
          op: 'update',
          payload: expect.objectContaining({
            name: 'New Name',
          }),
        })
      );

      // Verify sync trigger
      expect(flushOutbox).toHaveBeenCalled();
    });

    it('should fail if baby not found', async () => {
      const { getLocalBaby } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(undefined);

      const result = await updateBabyProfile(999, {
        name: 'New Name',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Baby not found');
      }
    });

    it('should fail if user does not have edit access', async () => {
      const { getLocalBaby, localDb } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            ...mockAccess,
            accessLevel: 'viewer',
          }),
          toArray: vi.fn(),
        })),
      } as never);

      const result = await updateBabyProfile(1, {
        name: 'New Name',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Access denied');
      }
    });

    it('should fail if name is empty', async () => {
      const { getLocalBaby, localDb } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
          toArray: vi.fn(),
        })),
      } as never);

      const result = await updateBabyProfile(1, {
        name: '',
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Baby name is required');
      }
    });
  });

  describe('setDefaultBaby', () => {
    const mockBaby: LocalBaby = {
      id: 1,
      name: 'Test Baby',
      birthDate: null,
      gender: null,
      birthWeightG: null,
      archivedAt: null,
      ownerUserId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockAccess: LocalBabyAccess = {
      oduserId: 1,
      babyId: 1,
      accessLevel: 'owner',
      caregiverLabel: 'Parent',
      lastAccessedAt: new Date(),
      defaultBaby: false,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should set default baby successfully', async () => {
      const { getLocalBaby, localDb, saveBabyAccess } = await import('@/lib/local-db');
      const { useBabyStore } = await import('@/stores/useBabyStore');

      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
          toArray: vi.fn(),
        })),
      } as never);

      const mockBabyStore = {
        activeBaby: null,
        allBabies: [],
        setActiveBaby: vi.fn(),
        setAllBabies: vi.fn(),
        clearActiveBaby: vi.fn(),
      };
      vi.mocked(useBabyStore.getState).mockReturnValue(mockBabyStore);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(true);

      // Verify access record update
      expect(saveBabyAccess).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            babyId: 1,
            defaultBaby: true,
          }),
        ])
      );

      // Verify store update
      expect(mockBabyStore.setActiveBaby).toHaveBeenCalledWith(
        expect.objectContaining({
          babyId: 1,
          name: 'Test Baby',
        })
      );
    });

    it('should fail if baby not found', async () => {
      const { getLocalBaby } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(undefined);

      const result = await setDefaultBaby(999);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Baby not found');
      }
    });

    it('should fail if user does not have access', async () => {
      const { getLocalBaby, localDb } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(undefined),
          toArray: vi.fn(),
        })),
      } as never);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Access denied');
      }
    });
  });

  describe('deleteBaby', () => {
    const mockBaby: LocalBaby = {
      id: 1,
      name: 'Test Baby',
      birthDate: null,
      gender: null,
      birthWeightG: null,
      archivedAt: null,
      ownerUserId: 1,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    const mockAccess: LocalBabyAccess = {
      oduserId: 1,
      babyId: 1,
      accessLevel: 'owner',
      caregiverLabel: 'Parent',
      lastAccessedAt: new Date(),
      defaultBaby: true,
      createdAt: new Date('2024-01-01'),
      updatedAt: new Date('2024-01-01'),
    };

    it('should delete baby successfully (soft delete)', async () => {
      const { getLocalBaby, localDb, saveBabies, addToOutbox } = await import('@/lib/local-db');
      const { flushOutbox } = await import('@/services/sync-service');
      const { useBabyStore } = await import('@/stores/useBabyStore');

      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue(mockAccess),
          toArray: vi.fn(),
        })),
      } as never);

      const mockBabyStore = {
        activeBaby: { babyId: 1, name: 'Test Baby', accessLevel: 'owner' as const, caregiverLabel: null },
        allBabies: [{ babyId: 1, name: 'Test Baby', accessLevel: 'owner' as const, caregiverLabel: null }],
        setActiveBaby: vi.fn(),
        setAllBabies: vi.fn(),
        clearActiveBaby: vi.fn(),
      };
      vi.mocked(useBabyStore.getState).mockReturnValue(mockBabyStore);

      const result = await deleteBaby(1);

      expect(result.success).toBe(true);

      // Verify soft delete (archivedAt set)
      expect(saveBabies).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            id: 1,
            archivedAt: expect.any(Date),
          }),
        ])
      );

      // Verify outbox enqueue
      expect(addToOutbox).toHaveBeenCalledWith(
        expect.objectContaining({
          entityType: 'baby',
          entityId: '1',
          op: 'delete',
          payload: expect.objectContaining({
            archivedAt: expect.any(String),
          }),
        })
      );

      // Verify sync trigger
      expect(flushOutbox).toHaveBeenCalled();

      // Verify store update (baby removed from list)
      expect(mockBabyStore.setAllBabies).toHaveBeenCalledWith([]);
      expect(mockBabyStore.clearActiveBaby).toHaveBeenCalled();
    });

    it('should fail if user is not the owner', async () => {
      const { getLocalBaby, localDb } = await import('@/lib/local-db');
      vi.mocked(getLocalBaby).mockResolvedValue(mockBaby);
      vi.mocked(localDb.babyAccess.where).mockReturnValue({
        equals: vi.fn(() => ({
          first: vi.fn().mockResolvedValue({
            ...mockAccess,
            accessLevel: 'editor',
          }),
          toArray: vi.fn(),
        })),
      } as never);

      const result = await deleteBaby(1);

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error).toContain('Only the owner can delete');
      }
    });
  });
});
