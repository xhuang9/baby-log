'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';
import { signOutCleanup } from '@/services/operations';

export function SignOutButton(props: {
  children?: React.ReactNode;
}) {
  const handleSignOut = async () => {
    // Use centralized cleanup operation
    const result = await signOutCleanup();
    if (!result.success) {
      console.error('Failed to cleanup on sign out:', result.error);
    }
  };

  return (
    <ClerkSignOutButton>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-sm text-muted-foreground transition-colors hover:text-destructive"
      >
        {props.children || 'Sign out'}
      </button>
    </ClerkSignOutButton>
  );
}
