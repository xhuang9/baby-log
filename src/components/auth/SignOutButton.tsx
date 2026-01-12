'use client';

import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

export function SignOutButton(props: {
  children?: React.ReactNode;
}) {
  const clearUser = useUserStore(state => state.clearUser);
  const clearActiveBaby = useBabyStore(state => state.clearActiveBaby);

  const handleSignOut = () => {
    // Clear Zustand stores (which also clear sessionStorage)
    clearUser();
    clearActiveBaby();

    // Clear any other sessionStorage keys
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:init-step');
    }
  };

  return (
    <ClerkSignOutButton>
      <button
        type="button"
        onClick={handleSignOut}
        className="text-red-500 hover:text-red-600"
      >
        {props.children || 'Sign out'}
      </button>
    </ClerkSignOutButton>
  );
}
