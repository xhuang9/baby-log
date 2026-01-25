'use client';

import type { ReactNode } from 'react';
import { useClerk } from '@clerk/nextjs';
import { useEffect } from 'react';
import { useLogout } from '@/contexts/LogoutContext';

export function AuthLayoutContent({ children }: { children: ReactNode }) {
  const clerk = useClerk();
  const { requestLogout } = useLogout();

  useEffect(() => {
    const originalSignOut = clerk.signOut.bind(clerk);

    // Wrap Clerk's signOut to check pending changes first
    clerk.signOut = (async (options?: any) => {
      console.log('[AuthLayout] Intercepting signOut - checking pending changes');

      const shouldProceed = await requestLogout();

      if (shouldProceed) {
        return originalSignOut(options);
      }
      // If false, user cancelled or dialog is shown
    }) as typeof clerk.signOut;

    return () => {
      clerk.signOut = originalSignOut;
    };
  }, [clerk, requestLogout]);

  return <>{children}</>;
}
