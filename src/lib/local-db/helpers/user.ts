/**
 * User Helper Functions
 *
 * Functions for managing local user data in IndexedDB.
 */

import type { LocalUser } from '../types/entities';
import { localDb } from '../database';

/**
 * Get local user by ID
 */
export async function getLocalUser(userId: number): Promise<LocalUser | undefined> {
  return localDb.users.get(userId);
}

/**
 * Get local user by Clerk ID
 */
export async function getLocalUserByClerkId(clerkId: string): Promise<LocalUser | undefined> {
  return localDb.users.where('clerkId').equals(clerkId).first();
}

/**
 * Save or update local user
 */
export async function saveLocalUser(user: LocalUser): Promise<void> {
  await localDb.users.put(user);
}

/**
 * Clear all user data (for logout)
 */
export async function clearAllLocalData(): Promise<void> {
  await localDb.transaction('rw', [
    localDb.users,
    localDb.babies,
    localDb.babyAccess,
    localDb.feedLogs,
    localDb.sleepLogs,
    localDb.nappyLogs,
    localDb.uiConfig,
    localDb.syncMeta,
    localDb.syncStatus,
    localDb.outbox,
    localDb.authSession,
  ], async () => {
    await localDb.users.clear();
    await localDb.babies.clear();
    await localDb.babyAccess.clear();
    await localDb.feedLogs.clear();
    await localDb.sleepLogs.clear();
    await localDb.nappyLogs.clear();
    await localDb.uiConfig.clear();
    await localDb.syncMeta.clear();
    await localDb.syncStatus.clear();
    await localDb.outbox.clear();
    await localDb.authSession.clear();
  });
}
