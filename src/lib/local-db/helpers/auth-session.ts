/**
 * Auth Session Helper Functions
 *
 * Functions for managing offline authentication session markers.
 * This enables users who have previously authenticated to access
 * the app offline without requiring Clerk validation.
 *
 * @see .readme/planning/offline-auth-bypass.md
 */

import type { AuthSession } from '../types/sync';
import { localDb } from '../database';

// Default offline access window: 7 days
const DEFAULT_OFFLINE_WINDOW_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * Get the current auth session
 */
export async function getAuthSession(): Promise<AuthSession | undefined> {
  return localDb.authSession.get('current');
}

/**
 * Save auth session after successful authentication
 *
 * @param userId - Local user ID from users table
 * @param clerkId - Clerk user ID for validation
 * @param offlineWindowMs - How long offline access is allowed (default: 7 days)
 */
export async function saveAuthSession(
  userId: number,
  clerkId: string,
  offlineWindowMs: number = DEFAULT_OFFLINE_WINDOW_MS,
): Promise<void> {
  const now = new Date();
  const expiresAt = new Date(now.getTime() + offlineWindowMs);

  await localDb.authSession.put({
    id: 'current',
    userId,
    clerkId,
    lastAuthAt: now,
    expiresAt,
  });
}

/**
 * Update last auth timestamp (call on each successful API request)
 * This extends the offline access window
 */
export async function refreshAuthSession(): Promise<void> {
  const session = await getAuthSession();
  if (!session) {
    return;
  }

  const now = new Date();
  const expiresAt = new Date(now.getTime() + DEFAULT_OFFLINE_WINDOW_MS);

  await localDb.authSession.put({
    ...session,
    lastAuthAt: now,
    expiresAt,
  });
}

/**
 * Clear auth session (call on sign out)
 */
export async function clearAuthSession(): Promise<void> {
  await localDb.authSession.delete('current');
}

/**
 * Check if user has a valid offline session
 *
 * A session is valid if:
 * 1. Session exists
 * 2. Session has not expired (or has no expiration)
 *
 * @returns Object with hasValidSession and optional session data
 */
export async function checkOfflineSession(): Promise<{
  hasValidSession: boolean;
  session: AuthSession | null;
  isExpired: boolean;
}> {
  const session = await getAuthSession();

  if (!session) {
    return { hasValidSession: false, session: null, isExpired: false };
  }

  // Check expiration
  if (session.expiresAt) {
    const now = new Date();
    if (now > session.expiresAt) {
      return { hasValidSession: false, session, isExpired: true };
    }
  }

  return { hasValidSession: true, session, isExpired: false };
}

/**
 * Check if offline session matches a specific Clerk user
 * Used to validate that the cached session belongs to the current Clerk user
 */
export async function validateSessionForUser(clerkId: string): Promise<boolean> {
  const { hasValidSession, session } = await checkOfflineSession();

  if (!hasValidSession || !session) {
    return false;
  }

  return session.clerkId === clerkId;
}
