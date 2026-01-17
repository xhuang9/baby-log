import { localDb } from './database';

/**
 * Check if IndexedDB has valid data for offline use
 */
export async function isIndexedDbValid(): Promise<{
  valid: boolean;
  reason?: 'no_user' | 'no_session' | 'session_expired' | 'db_error';
}> {
  try {
    // Check for user record
    const user = await localDb.users.toCollection().first();
    if (!user) {
      return { valid: false, reason: 'no_user' };
    }

    // Check for auth session
    const session = await localDb.authSession.get('current');
    if (!session) {
      return { valid: false, reason: 'no_session' };
    }

    // Check session expiration
    if (session.expiresAt) {
      const expiresAt = new Date(session.expiresAt);
      if (new Date() > expiresAt) {
        return { valid: false, reason: 'session_expired' };
      }
    }

    return { valid: true };
  } catch (error) {
    console.error('[IndexedDB] Validation error:', error);
    return { valid: false, reason: 'db_error' };
  }
}

/**
 * Clear all local data (for logout or reset)
 */
export async function clearLocalDb(): Promise<void> {
  await localDb.delete();
  await localDb.open();
}
