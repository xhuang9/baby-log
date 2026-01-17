'use client';

import { useUser } from '@clerk/nextjs';
import { useEffect } from 'react';
import { clearAuthSession, saveAuthSession } from '@/lib/auth/session-manager';
import { localDb } from '@/lib/local-db/database';

/**
 * Sync Clerk auth state to IndexedDB
 * Add to root layout or auth provider
 */
export function useAuthSessionSync() {
  const { user, isSignedIn, isLoaded } = useUser();

  useEffect(() => {
    if (!isLoaded) {
      return;
    }

    async function syncSession() {
      if (isSignedIn && user) {
        // Get local user ID from IndexedDB
        const localUser = await localDb.users
          .where('clerkId')
          .equals(user.id)
          .first();

        if (localUser) {
          await saveAuthSession({
            userId: localUser.id,
            clerkId: user.id,
          });
        }
      } else {
        // Not signed in - clear session
        await clearAuthSession();
      }
    }

    syncSession();
  }, [isLoaded, isSignedIn, user]);
}
