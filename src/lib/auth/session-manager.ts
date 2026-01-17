import type { AuthSession } from '@/lib/local-db/types/sync';
import { localDb } from '@/lib/local-db/database';

const SESSION_KEY = 'current' as const;
const SESSION_DURATION_DAYS = 7;

/**
 * Save or update the auth session in IndexedDB
 * Call this after successful Clerk authentication
 */
export async function saveAuthSession(params: {
  userId: number;
  clerkId: string;
}): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  const session: AuthSession = {
    id: SESSION_KEY,
    userId: params.userId,
    clerkId: params.clerkId,
    lastAuthAt: now,
    expiresAt,
  };

  await localDb.authSession.put(session);
}

/**
 * Get current auth session
 */
export async function getAuthSession(): Promise<AuthSession | undefined> {
  return localDb.authSession.get(SESSION_KEY);
}

/**
 * Clear auth session (on logout)
 */
export async function clearAuthSession(): Promise<void> {
  await localDb.authSession.delete(SESSION_KEY);
}

/**
 * Refresh session expiry (call periodically while user is active)
 */
export async function refreshAuthSession(): Promise<void> {
  const session = await getAuthSession();
  if (!session) {
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_DAYS * 24 * 60 * 60 * 1000);

  await localDb.authSession.update(SESSION_KEY, {
    expiresAt,
    lastAuthAt: now,
  });
}
