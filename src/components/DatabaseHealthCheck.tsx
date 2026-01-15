'use client';

/**
 * Database Health Check Component
 *
 * Verifies that IndexedDB exists for authenticated users.
 * If the database is missing, redirects to bootstrap flow to reinitialize.
 *
 * This prevents issues where users delete IndexedDB manually
 * or encounter browser storage corruption.
 */

import { useAuth } from '@clerk/nextjs';
import { useRouter } from 'next/navigation';
import { useEffect, useRef } from 'react';
import { localDb } from '@/lib/local-db/database';

export function DatabaseHealthCheck() {
  const { isLoaded, isSignedIn } = useAuth();
  const router = useRouter();
  const hasChecked = useRef(false);

  useEffect(() => {
    // Only run once per session
    if (hasChecked.current) {
      return;
    }

    // Wait for auth to load
    if (!isLoaded) {
      return;
    }

    // Only check if user is signed in
    if (!isSignedIn) {
      return;
    }

    async function checkDatabase() {
      try {
        // Try to open the database
        await localDb.open();

        // Check if database has any tables by counting a core table
        const userCount = await localDb.users.count();

        // If database exists but has no users, it might be corrupted
        if (userCount === 0) {
          console.warn('[DatabaseHealthCheck] Database exists but empty, redirecting to bootstrap');
          router.push('/account/bootstrap');
        }

        // Database is healthy, no action needed
      } catch (error) {
        // Database doesn't exist or is corrupted
        console.warn('[DatabaseHealthCheck] Database missing or corrupted, redirecting to bootstrap', error);
        router.push('/account/bootstrap');
      }
    }

    hasChecked.current = true;
    checkDatabase();
  }, [isLoaded, isSignedIn, router]);

  // This component renders nothing
  return null;
}
