import type { User } from '@clerk/nextjs/server';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { acceptInvite, createBaby, resolveAccountContext, setDefaultBaby } from './babyActions';

// Mock Clerk auth
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

// Mock database
vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

// Mock Next.js cache
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('babyActions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('resolveAccountContext', () => {
    it('should return error if user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should upsert user and return locked status if user is locked', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            firstName: 'John',
            primaryEmailAddress: { emailAddress: 'john@example.com' },
            imageUrl: 'https://example.com/avatar.jpg',
          } as Partial<User>),
        },
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                email: 'john@example.com',
                firstName: 'John',
                locked: true,
                defaultBabyId: null,
              },
            ]),
          }),
        }),
      });

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              orderBy: vi.fn().mockResolvedValue([]),
            }),
          }),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.user).toEqual({
          id: 'clerk_123',
          localId: 1,
          firstName: 'John',
          email: 'john@example.com',
          imageUrl: 'https://example.com/avatar.jpg',
        });
        expect(result.nextStep.type).toBe('locked');
      }
    });

    it('should redirect to shared page if no babies but has pending invites', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            firstName: 'John',
            primaryEmailAddress: { emailAddress: 'john@example.com' },
            imageUrl: 'https://example.com/avatar.jpg',
          } as Partial<User>),
        },
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                email: 'john@example.com',
                firstName: 'John',
                locked: false,
                defaultBabyId: null,
              },
            ]),
          }),
        }),
      });

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: babyAccess (empty)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: pendingInvites (has invites) - needs to handle chained innerJoin
          const innerJoinChain = {
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([
              {
                id: 1,
                babyName: 'Baby One',
                inviterEmail: 'parent@example.com',
              },
            ]),
          };
          return {
            from: vi.fn().mockReturnValue(innerJoinChain),
          };
        }
        // Third+ call: access requests (none)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success && result.nextStep.type === 'shared') {
        expect(result.nextStep.invites).toHaveLength(1);
        expect(result.nextStep.invites[0]).toEqual({
          id: 1,
          babyName: 'Baby One',
          inviterEmail: 'parent@example.com',
        });
      }
    });

    it('should redirect to onboarding if no babies and no invites', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            firstName: 'John',
            primaryEmailAddress: { emailAddress: 'john@example.com' },
            imageUrl: 'https://example.com/avatar.jpg',
          } as Partial<User>),
        },
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                email: 'john@example.com',
                firstName: 'John',
                locked: false,
                defaultBabyId: null,
              },
            ]),
          }),
        }),
      });

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: babyAccess (empty)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([]),
                }),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: pendingInvites (empty) - needs to handle chained innerJoin
          const innerJoinChain = {
            innerJoin: vi.fn().mockReturnThis(),
            where: vi.fn().mockResolvedValue([]),
          };
          return {
            from: vi.fn().mockReturnValue(innerJoinChain),
          };
        }
        // Third+ call: access requests (none)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('onboarding');
      }
    });

    it('should redirect to overview with default baby if one baby exists', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            firstName: 'John',
            primaryEmailAddress: { emailAddress: 'john@example.com' },
            imageUrl: 'https://example.com/avatar.jpg',
          } as Partial<User>),
        },
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                email: 'john@example.com',
                firstName: 'John',
                locked: false,
                defaultBabyId: 1,
              },
            ]),
          }),
        }),
      });

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: babyAccess (has one baby)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([
                    {
                      babyId: 1,
                      name: 'Baby One',
                      accessLevel: 'owner',
                      caregiverLabel: 'Parent',
                      lastAccessedAt: new Date(),
                      archivedAt: null,
                    },
                  ]),
                }),
              }),
            }),
          };
        }
        // Second call: pendingInvites (empty) - needs to handle chained innerJoin
        const innerJoinChain = {
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        };
        return {
          from: vi.fn().mockReturnValue(innerJoinChain),
        };
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success && result.nextStep.type === 'overview') {
        expect(result.nextStep.baby).toEqual({
          babyId: 1,
          name: 'Baby One',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        });
      }
    });

    it('should redirect to select page if multiple babies without default', async () => {
      const { auth, clerkClient } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            firstName: 'John',
            primaryEmailAddress: { emailAddress: 'john@example.com' },
            imageUrl: 'https://example.com/avatar.jpg',
          } as Partial<User>),
        },
      } as any);

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                email: 'john@example.com',
                firstName: 'John',
                locked: false,
                defaultBabyId: null,
              },
            ]),
          }),
        }),
      });

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: babyAccess (has two babies)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  orderBy: vi.fn().mockResolvedValue([
                    {
                      babyId: 1,
                      name: 'Baby One',
                      accessLevel: 'owner',
                      caregiverLabel: 'Parent',
                      lastAccessedAt: new Date(),
                      archivedAt: null,
                    },
                    {
                      babyId: 2,
                      name: 'Baby Two',
                      accessLevel: 'editor',
                      caregiverLabel: 'Caregiver',
                      lastAccessedAt: new Date(),
                      archivedAt: null,
                    },
                  ]),
                }),
              }),
            }),
          };
        }
        // Second call: pendingInvites (empty) - needs to handle chained innerJoin
        const innerJoinChain = {
          innerJoin: vi.fn().mockReturnThis(),
          where: vi.fn().mockResolvedValue([]),
        };
        return {
          from: vi.fn().mockReturnValue(innerJoinChain),
        };
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success && result.nextStep.type === 'select') {
        expect(result.nextStep.babies).toHaveLength(2);
        expect(result.nextStep.babies[0]?.babyId).toBe(1);
        expect(result.nextStep.babies[1]?.babyId).toBe(2);
      }
    });
  });

  describe('createBaby', () => {
    it('should return error if user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should return error if user is not found', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });

    it('should return error if user account is locked', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                locked: true,
              },
            ]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await createBaby({ name: 'Test Baby' });

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Account is locked');
      }
    });

    it('should successfully create baby with owner access', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                locked: false,
              },
            ]),
          }),
        }),
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'Test Baby',
              ownerUserId: 1,
              birthDate: null,
              gender: null,
              birthWeightG: null,
            },
          ]),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await createBaby({
        name: 'Test Baby',
        caregiverLabel: 'Parent',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 1,
          name: 'Test Baby',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        });
      }
    });

    it('should create baby with all optional fields', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([
              {
                id: 1,
                clerkId: 'clerk_123',
                locked: false,
              },
            ]),
          }),
        }),
      });

      const birthDate = new Date('2024-01-01');
      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              id: 1,
              name: 'Test Baby',
              ownerUserId: 1,
              birthDate,
              gender: 'female',
              birthWeightG: 3500,
            },
          ]),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await createBaby({
        name: 'Test Baby',
        birthDate,
        gender: 'female',
        birthWeightG: 3500,
        caregiverLabel: 'Mom',
      });

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby.babyId).toBe(1);
        expect(result.baby.name).toBe('Test Baby');
        expect(result.baby.accessLevel).toBe('owner');
        expect(result.baby.caregiverLabel).toBe('Mom');
      }
    });
  });

  describe('acceptInvite', () => {
    it('should return error if user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should return error if invite not found', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        // Second call: get invite (not found)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await acceptInvite(999);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite not found');
      }
    });

    it('should return error if invite is not pending', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        // Second call: get invite (already accepted)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 1,
                    babyId: 1,
                    accessLevel: 'viewer',
                    status: 'accepted',
                    expiresAt: new Date(Date.now() + 86400000),
                    babyName: 'Test Baby',
                  },
                ]),
              }),
            }),
          }),
        };
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite is not pending');
      }
    });

    it('should return error if invite has expired', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        // Second call: get invite (expired)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    id: 1,
                    babyId: 1,
                    accessLevel: 'viewer',
                    status: 'pending',
                    expiresAt: new Date(Date.now() - 1000),
                    babyName: 'Test Baby',
                  },
                ]),
              }),
            }),
          }),
        };
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Invite has expired');
      }
    });

    it('should return error if user already has access', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: get invite (valid)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: 1,
                      babyId: 1,
                      accessLevel: 'viewer',
                      status: 'pending',
                      expiresAt: new Date(Date.now() + 86400000),
                      babyName: 'Test Baby',
                    },
                  ]),
                }),
              }),
            }),
          };
        }
        // Third call: check existing access (found)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([
                { babyId: 1, userId: 1, accessLevel: 'viewer' },
              ]),
            }),
          }),
        };
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('You already have access to this baby');
      }
    });

    it('should successfully accept invite and create baby access', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false, defaultBabyId: null },
                ]),
              }),
            }),
          };
        }
        if (selectCallCount === 2) {
          // Second call: get invite (valid)
          return {
            from: vi.fn().mockReturnValue({
              innerJoin: vi.fn().mockReturnValue({
                where: vi.fn().mockReturnValue({
                  limit: vi.fn().mockResolvedValue([
                    {
                      id: 1,
                      babyId: 1,
                      accessLevel: 'editor',
                      status: 'pending',
                      expiresAt: new Date(Date.now() + 86400000),
                      babyName: 'Test Baby',
                    },
                  ]),
                }),
              }),
            }),
          };
        }
        // Third call: check existing access (not found)
        return {
          from: vi.fn().mockReturnValue({
            where: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue([]),
            }),
          }),
        };
      });

      const mockInsert = vi.fn().mockReturnValue({
        values: vi.fn().mockReturnValue({
          returning: vi.fn().mockResolvedValue([
            {
              babyId: 1,
              userId: 1,
              accessLevel: 'editor',
              caregiverLabel: null,
            },
          ]),
        }),
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.insert).mockImplementation(mockInsert as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await acceptInvite(1);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 1,
          name: 'Test Baby',
          accessLevel: 'editor',
          caregiverLabel: null,
        });
      }
    });
  });

  describe('setDefaultBaby', () => {
    it('should return error if user is not authenticated', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }
    });

    it('should return error if user not found', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      const mockSelect = vi.fn().mockReturnValue({
        from: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('User not found');
      }
    });

    it('should return error if user does not have access to baby', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        // Second call: verify access (not found)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([]),
              }),
            }),
          }),
        };
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);

      const result = await setDefaultBaby(999);

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('You do not have access to this baby');
      }
    });

    it('should successfully set default baby and update lastAccessedAt', async () => {
      const { auth } = await import('@clerk/nextjs/server');
      const { db } = await import('@/lib/db');

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);

      let selectCallCount = 0;
      const mockSelect = vi.fn().mockImplementation(() => {
        selectCallCount++;
        if (selectCallCount === 1) {
          // First call: get user
          return {
            from: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  { id: 1, clerkId: 'clerk_123', locked: false },
                ]),
              }),
            }),
          };
        }
        // Second call: verify access (found)
        return {
          from: vi.fn().mockReturnValue({
            innerJoin: vi.fn().mockReturnValue({
              where: vi.fn().mockReturnValue({
                limit: vi.fn().mockResolvedValue([
                  {
                    babyId: 1,
                    babyName: 'Test Baby',
                    accessLevel: 'owner',
                    caregiverLabel: 'Parent',
                  },
                ]),
              }),
            }),
          }),
        };
      });

      const mockUpdate = vi.fn().mockReturnValue({
        set: vi.fn().mockReturnValue({
          where: vi.fn().mockResolvedValue(undefined),
        }),
      });

      vi.mocked(db.select).mockImplementation(mockSelect as any);
      vi.mocked(db.update).mockImplementation(mockUpdate as any);

      const result = await setDefaultBaby(1);

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.baby).toEqual({
          babyId: 1,
          name: 'Test Baby',
          accessLevel: 'owner',
          caregiverLabel: 'Parent',
        });
      }

      // Verify that update was called twice (once for defaultBabyId, once for lastAccessedAt)
      expect(mockUpdate).toHaveBeenCalledTimes(2);
    });
  });
});
