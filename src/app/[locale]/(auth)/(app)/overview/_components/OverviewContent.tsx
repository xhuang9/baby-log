'use client';

import type { FeedLogWithCaregiver } from '@/actions/feedLogActions';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { localDb } from '@/lib/local-db/database';
import { ActivityTile } from './ActivityTile';
import { FeedTile } from './FeedTile';
import { NappyTile } from './NappyTile';
import { SleepTile } from './SleepTile';
import { SolidsTile } from './SolidsTile';

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
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestFeedData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const feeds = await localDb.feedLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (feeds.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    feeds.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestFeed = feeds[0];
    if (!latestFeed) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestFeed.loggedByUserId, babyId])
      .first();

    // Transform to FeedLogWithCaregiver type expected by FeedTile
    const transformedFeed: FeedLogWithCaregiver = {
      id: latestFeed.id, // UUID string
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

  // Read latest sleep from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestSleepData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const sleeps = await localDb.sleepLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (sleeps.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    sleeps.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestSleep = sleeps[0];
    if (!latestSleep) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestSleep.loggedByUserId, babyId])
      .first();

    return {
      ...latestSleep,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest nappy from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestNappyData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const nappies = await localDb.nappyLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (nappies.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    nappies.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestNappy = nappies[0];
    if (!latestNappy) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestNappy.loggedByUserId, babyId])
      .first();

    return {
      ...latestNappy,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest solids from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestSolidsData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const solids = await localDb.solidsLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (solids.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    solids.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestSolid = solids[0];
    if (!latestSolid) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestSolid.loggedByUserId, babyId])
      .first();

    return {
      ...latestSolid,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Loading state while Dexie initializes
  if (userData === undefined || latestFeedData === undefined || latestSleepData === undefined || latestNappyData === undefined || latestSolidsData === undefined) {
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
          type="button"
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
      <SleepTile babyId={babyId} latestSleep={latestSleepData} />
      <NappyTile babyId={babyId} latestNappy={latestNappyData} />
      <SolidsTile babyId={babyId} latestSolids={latestSolidsData} />
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
