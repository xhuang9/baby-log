'use client';

import type { ActiveBaby } from '@/stores/useBabyStore';
import type { StoredUser } from '@/stores/useUserStore';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

const STATUS_MESSAGES = [
  'Initiating your account...',
  'Loading your baby details...',
  'Checking shared access...',
  'Preparing your default baby...',
];

export function ResolveAccountClient(props: {
  user: StoredUser;
  baby: ActiveBaby | null;
  redirectPath: string;
  stateData?: unknown;
}) {
  const { user, baby, redirectPath } = props;
  const router = useRouter();
  const setUser = useUserStore(state => state.setUser);
  const setActiveBaby = useBabyStore(state => state.setActiveBaby);
  const [statusIndex, setStatusIndex] = useState(0);

  useEffect(() => {
    // Cycle through status messages
    const interval = setInterval(() => {
      setStatusIndex((prev) => {
        if (prev < STATUS_MESSAGES.length - 1) {
          return prev + 1;
        }
        return prev;
      });
    }, 400);

    // Set user in store
    setUser(user);

    // Set baby in store if available
    if (baby) {
      setActiveBaby(baby);
    }

    // Redirect after a short delay to show status
    const timeout = setTimeout(() => {
      router.replace(redirectPath);
    }, 1600);

    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [redirectPath, router, setUser, setActiveBaby, user, baby]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="space-y-4 text-center">
        <div className="text-sm text-muted-foreground">
          {STATUS_MESSAGES[statusIndex]}
        </div>
        <div className="flex items-center justify-center gap-1">
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.3s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary [animation-delay:-0.15s]" />
          <div className="h-2 w-2 animate-bounce rounded-full bg-primary" />
        </div>
      </div>
    </div>
  );
}
