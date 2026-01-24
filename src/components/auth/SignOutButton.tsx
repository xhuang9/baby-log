'use client';

import { useClerk } from '@clerk/nextjs';
import { useLogout } from '@/contexts/LogoutContext';

export function SignOutButton(props: { children?: React.ReactNode }) {
  const clerk = useClerk();
  const { requestLogout } = useLogout();

  const handleSignOut = async () => {
    const shouldProceed = await requestLogout();

    if (shouldProceed) {
      await clerk.signOut();
    }
  };

  return (
    <button
      type="button"
      onClick={handleSignOut}
      className="text-sm text-muted-foreground transition-colors hover:text-destructive"
    >
      {props.children || 'Sign out'}
    </button>
  );
}
