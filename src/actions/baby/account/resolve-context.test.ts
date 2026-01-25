import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
  clerkClient: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    select: vi.fn(),
    update: vi.fn(),
  },
}));

const loadSubject = async () => {
  const { resolveAccountContext } = await import('./resolve-context');
  const { auth, clerkClient } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');

  return {
    resolveAccountContext,
    auth,
    clerkClient,
    db,
  };
};

describe('resolveAccountContext', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      const { resolveAccountContext, auth, db } = await loadSubject();
      vi.mocked(auth).mockResolvedValue({ userId: null } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Not authenticated');
      }

      expect(db.insert).not.toHaveBeenCalled();
    });
  });

  describe('user states', () => {
    it('should return locked when user account is locked', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      // Mock upsert user
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: true, defaultBabyId: null },
            ]),
          }),
        }),
      } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('locked');
      }
    });

    it('should return onboarding for new user with no babies', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      // Mock upsert user
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: false, defaultBabyId: null },
            ]),
          }),
        }),
      } as any);

      // Mock baby access query - no babies
      const babyAccessSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock pending invites query - no invites
      const invitesSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock outgoing access requests - no requests
      const outgoingRequestsSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      // Mock incoming access requests - no requests
      const incomingRequestsSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babyAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: invitesSelectFrom } as any)
        .mockReturnValueOnce({ from: outgoingRequestsSelectFrom } as any)
        .mockReturnValueOnce({ from: incomingRequestsSelectFrom } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('onboarding');
      }
    });

    it('should return overview when user has default baby', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      // Mock upsert user with default baby set
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: false, defaultBabyId: 42 },
            ]),
          }),
        }),
      } as any);

      // Mock baby access query - user has babies
      const babyAccessSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { babyId: 42, name: 'Baby', accessLevel: 'owner', caregiverLabel: 'Parent', lastAccessedAt: new Date(), archivedAt: null },
            ]),
          }),
        }),
      });

      // Mock pending invites query
      const invitesSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // Mock update lastAccessedAt
      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babyAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: invitesSelectFrom } as any);

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('overview');

        if (result.nextStep.type === 'overview') {
          expect(result.nextStep.baby).toEqual({
            babyId: 42,
            name: 'Baby',
            accessLevel: 'owner',
            caregiverLabel: 'Parent',
          });
        }
      }
    });

    it('should return requestAccess when user has pending outgoing requests', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: false, defaultBabyId: null },
            ]),
          }),
        }),
      } as any);

      // No babies
      const babyAccessSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const invitesSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // User has outgoing access request
      const outgoingRequestsSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([{ id: 1, status: 'pending' }]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babyAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: invitesSelectFrom } as any)
        .mockReturnValueOnce({ from: outgoingRequestsSelectFrom } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('requestAccess');
      }
    });
  });

  describe('invite handling', () => {
    it('should return shared when user has pending invites', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: false, defaultBabyId: null },
            ]),
          }),
        }),
      } as any);

      // No babies
      const babyAccessSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      // User has pending invite
      const invitesSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([
              { id: 100, babyName: 'Invited Baby', inviterEmail: 'inviter@example.com' },
            ]),
          }),
        }),
      });

      // No outgoing requests
      const outgoingRequestsSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      // No incoming requests
      const incomingRequestsSelectFrom = vi.fn().mockReturnValue({
        where: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue([]),
        }),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babyAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: invitesSelectFrom } as any)
        .mockReturnValueOnce({ from: outgoingRequestsSelectFrom } as any)
        .mockReturnValueOnce({ from: incomingRequestsSelectFrom } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);

      if (result.success) {
        expect(result.nextStep.type).toBe('shared');

        if (result.nextStep.type === 'shared') {
          expect(result.nextStep.invites).toHaveLength(1);
          expect(result.nextStep.invites[0]).toEqual({
            id: 100,
            babyName: 'Invited Baby',
            inviterEmail: 'inviter@example.com',
          });
        }
      }
    });
  });

  describe('default baby selection', () => {
    it('should set most recently accessed baby as default when no default set', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      // No default baby set
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([
              { id: 1, clerkId: 'clerk_123', email: 'test@example.com', firstName: 'John', locked: false, defaultBabyId: null },
            ]),
          }),
        }),
      } as any);

      // User has one baby (sorted by lastAccessedAt)
      const babyAccessSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          where: vi.fn().mockReturnValue({
            orderBy: vi.fn().mockResolvedValue([
              { babyId: 42, name: 'Baby', accessLevel: 'owner', caregiverLabel: 'Parent', lastAccessedAt: new Date(), archivedAt: null },
            ]),
          }),
        }),
      });

      const invitesSelectFrom = vi.fn().mockReturnValue({
        innerJoin: vi.fn().mockReturnValue({
          innerJoin: vi.fn().mockReturnValue({
            where: vi.fn().mockResolvedValue([]),
          }),
        }),
      });

      const updateSet = vi.fn().mockReturnValue({
        where: vi.fn().mockResolvedValue(undefined),
      });

      vi.mocked(db.select)
        .mockReturnValueOnce({ from: babyAccessSelectFrom } as any)
        .mockReturnValueOnce({ from: invitesSelectFrom } as any);

      vi.mocked(db.update).mockReturnValue({ set: updateSet } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(true);
      // Verify db.update was called to set defaultBabyId
      expect(db.update).toHaveBeenCalled();
      expect(updateSet).toHaveBeenCalledWith({ defaultBabyId: 42 });
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      const testError = new Error('Database connection failed');
      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue(testError),
          }),
        }),
      } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Database connection failed');
      }
    });

    it('should handle non-Error exceptions', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockRejectedValue('Unknown string error'),
          }),
        }),
      } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Unknown error');
      }
    });

    it('should handle user upsert returning empty array', async () => {
      const { resolveAccountContext, auth, clerkClient, db } = await loadSubject();

      vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
      vi.mocked(clerkClient).mockResolvedValue({
        users: {
          getUser: vi.fn().mockResolvedValue({
            id: 'clerk_123',
            primaryEmailAddress: { emailAddress: 'test@example.com' },
            firstName: 'John',
            imageUrl: 'https://example.com/avatar.jpg',
          }),
        },
      } as any);

      vi.mocked(db.insert).mockReturnValue({
        values: vi.fn().mockReturnValue({
          onConflictDoUpdate: vi.fn().mockReturnValue({
            returning: vi.fn().mockResolvedValue([]),
          }),
        }),
      } as any);

      const result = await resolveAccountContext();

      expect(result.success).toBe(false);

      if (!result.success) {
        expect(result.error).toBe('Failed to create or update user');
      }
    });
  });
});
