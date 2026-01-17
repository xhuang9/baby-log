'use client';

import type { FeedLogWithCaregiver } from '@/actions/feedLogActions';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { localDb } from '@/lib/local-db/database';
import { ActivityTile } from './ActivityTile';
import { FeedTile } from './FeedTile';

type OverviewContentProps = {
  locale: string;
};

export function OverviewContent({ locale }: OverviewContentProps) {
  const router = useRouter();

  // Get current user and their default baby from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  const babyId = userData?.defaultBabyId ?? null;

  // Redirect if no local data (needs bootstrap)
  useEffect(() => {
    // Wait for query to complete (undefined = loading)
    if (userData === undefined) {
      return;
    }

    // No user in IndexedDB = needs bootstrap
    if (userData === null || userData.defaultBabyId === null) {
      // Check if online - if so redirect to bootstrap, if not show error
      if (navigator.onLine) {
        router.push(`/${locale}/account/bootstrap`);
      }
    }
  }, [userData, locale, router]);

  // Read latest feed from IndexedDB with caregiver info
  const latestFeedData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const feeds = await localDb.feedLogs
      .where('babyId')
      .equals(babyId)
      .reverse()
      .sortBy('startedAt');

    if (feeds.length === 0 || !feeds[0]) {
      return null;
    }

    const latestFeed = feeds[0];

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[oduserId+babyId]')
      .equals([latestFeed.loggedByUserId, babyId])
      .first();

    // Transform to FeedLogWithCaregiver type expected by FeedTile
    // Note: LocalFeedLog has id as string (UUID), but FeedLogWithCaregiver expects number
    // We'll use a hash of the UUID for the numeric id (only for display purposes)
    const numericId = Number.parseInt(latestFeed.id.slice(0, 8), 16);

    const transformedFeed: FeedLogWithCaregiver = {
      id: numericId,
      babyId: latestFeed.babyId,
      method: latestFeed.method,
      startedAt: latestFeed.startedAt,
      endedAt: latestFeed.endedAt,
      durationMinutes: latestFeed.durationMinutes,
      amountMl: latestFeed.amountMl,
      isEstimated: latestFeed.isEstimated,
      endSide: latestFeed.endSide,
      caregiverLabel: access?.caregiverLabel ?? null,
      createdAt: latestFeed.createdAt,
    };

    return transformedFeed;
  }, [babyId]);

  // Loading state while Dexie initializes
  if (userData === undefined || latestFeedData === undefined) {
    return <OverviewSkeleton />;
  }

  // No local data and offline - show error
  if ((userData === null || babyId === null) && !navigator.onLine) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
        <div className="text-4xl">📡</div>
        <h2 className="text-lg font-semibold">Setup Required</h2>
        <p className="text-sm text-muted-foreground">
          You need to be online to set up your account for the first time.
        </p>
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground"
        >
          Try Again
        </button>
      </div>
    );
  }

  // Still loading or redirecting
  if (babyId === null) {
    return <OverviewSkeleton />;
  }

  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      <FeedTile babyId={babyId} latestFeed={latestFeedData} />
      <ActivityTile title="Sleep" subtitle="Coming soon" activity="sleep" disabled />
      <ActivityTile title="Nappy" subtitle="Coming soon" activity="nappy" disabled />
      <ActivityTile title="Solids" subtitle="Coming soon" activity="solids" disabled />
      <ActivityTile title="Bath" subtitle="Coming soon" activity="bath" disabled />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
      {[...Array.from({ length: 5 })].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
