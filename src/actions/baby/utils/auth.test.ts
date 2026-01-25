import { beforeEach, describe, expect, it, vi } from 'vitest';

// Mocks at module level
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
}));

const loadSubject = async () => {
  const { getAuthenticatedUser } = await import('./auth');
  const { auth } = await import('@clerk/nextjs/server');
  const { getLocalUserByClerkId } = await import('@/services/baby-access');

  return {
    getAuthenticatedUser,
    auth,
    getLocalUserByClerkId,
  };
};

describe('getAuthenticatedUser', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should return error when not authenticated', async () => {
    const { getAuthenticatedUser, auth, getLocalUserByClerkId } = await loadSubject();
    vi.mocked(auth).mockResolvedValue({ userId: null } as any);

    const result = await getAuthenticatedUser();

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBe('Not authenticated');
    }

    expect(getLocalUserByClerkId).not.toHaveBeenCalled();
  });

  it('should return local user when authenticated', async () => {
    const { getAuthenticatedUser, auth, getLocalUserByClerkId } = await loadSubject();
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
    vi.mocked(getLocalUserByClerkId).mockResolvedValue({
      success: true,
      data: {
        id: 1,
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        locked: false,
        defaultBabyId: null,
      },
    });

    const result = await getAuthenticatedUser();

    expect(result.success).toBe(true);

    if (result.success) {
      expect(result.clerkId).toBe('clerk_123');
      expect(result.localUser).toEqual({
        id: 1,
        clerkId: 'clerk_123',
        email: 'test@example.com',
        firstName: 'John',
        locked: false,
        defaultBabyId: null,
      });
    }

    expect(getLocalUserByClerkId).toHaveBeenCalledWith('clerk_123');
  });

  it('should handle user not found in database', async () => {
    const { getAuthenticatedUser, auth, getLocalUserByClerkId } = await loadSubject();
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
    vi.mocked(getLocalUserByClerkId).mockResolvedValue({
      success: false,
      error: 'User not found',
    });

    const result = await getAuthenticatedUser();

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBe('User not found');
    }
  });

  it('should pass through getLocalUserByClerkId errors', async () => {
    const { getAuthenticatedUser, auth, getLocalUserByClerkId } = await loadSubject();
    vi.mocked(auth).mockResolvedValue({ userId: 'clerk_123' } as any);
    vi.mocked(getLocalUserByClerkId).mockResolvedValue({
      success: false,
      error: 'Database connection failed',
    });

    const result = await getAuthenticatedUser();

    expect(result.success).toBe(false);

    if (!result.success) {
      expect(result.error).toBe('Database connection failed');
    }
  });
});
