'use client';

import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { isIndexedDbValid } from '@/lib/local-db/validation';

type GuardState = 'loading' | 'valid' | 'needs_bootstrap' | 'offline_no_data';

type Props = {
  children: React.ReactNode;
  locale: string;
};

export function IndexedDbGuard({ children, locale }: Props) {
  const router = useRouter();
  const [state, setState] = useState<GuardState>('loading');

  useEffect(() => {
    async function checkDb() {
      const result = await isIndexedDbValid();

      if (result.valid) {
        setState('valid');
        return;
      }

      // Invalid - check if we can redirect to bootstrap
      if (navigator.onLine) {
        // Online - redirect to bootstrap for initial sync
        router.replace(`/${locale}/account/bootstrap`);
        return;
      }

      // Offline with no valid data - show error
      setState('offline_no_data');
    }

    checkDb();
  }, [locale, router]);

  if (state === 'loading') {
    return <IndexedDbGuardSkeleton />;
  }

  if (state === 'offline_no_data') {
    return <OfflineNoDataError />;
  }

  return <>{children}</>;
}

function IndexedDbGuardSkeleton() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent" />
    </div>
  );
}

function OfflineNoDataError() {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold">Setup Required</h1>
      <p className="max-w-md text-muted-foreground">
        You need to complete the initial setup while connected to the internet.
        Please connect and try again.
      </p>
      <button
        type="button"
        onClick={() => window.location.reload()}
        className="rounded-lg bg-primary px-6 py-3 text-primary-foreground hover:bg-primary/90"
      >
        Retry
      </button>
    </div>
  );
}
