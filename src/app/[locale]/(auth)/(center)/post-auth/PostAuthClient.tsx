'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useUserStore, type StoredUser } from '@/stores/useUserStore';

export function PostAuthClient(props: {
  user: StoredUser;
  redirectTo: string;
}) {
  const { user, redirectTo } = props;
  const router = useRouter();
  const setUser = useUserStore(state => state.setUser);

  useEffect(() => {
    setUser(user);
    sessionStorage.setItem('baby-log:user', JSON.stringify(user));
    router.replace(redirectTo);
  }, [redirectTo, router, setUser, user]);

  return (
    <div className="flex min-h-[60vh] items-center justify-center">
      <div className="text-center text-sm text-muted-foreground">
        Setting up your account...
      </div>
    </div>
  );
}
