'use client';

import type { FeedLogWithCaregiver } from '@/actions/feedLogActions';
import { useLiveQuery } from 'dexie-react-hooks';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { localDb } from '@/lib/local-db/database';
import { ActivityLogTile } from './ActivityLogTile';
import { BathTile } from './BathTile';
import { FeedTile } from './FeedTile';
import { GrowthTile } from './GrowthTile';
import { MedicationTile } from './MedicationTile';
import { NappyTile } from './NappyTile';
import { PumpingTile } from './PumpingTile';
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
    const transformedFeed: FeedLogWithCaregiver & { notes?: string | null } = {
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
      notes: latestFeed.notes,
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

  // Read latest pumping from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestPumpingData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const pumps = await localDb.pumpingLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (pumps.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    pumps.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestPump = pumps[0];
    if (!latestPump) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestPump.loggedByUserId, babyId])
      .first();

    return {
      ...latestPump,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest growth from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestGrowthData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const growths = await localDb.growthLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (growths.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    growths.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestGrowth = growths[0];
    if (!latestGrowth) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestGrowth.loggedByUserId, babyId])
      .first();

    return {
      ...latestGrowth,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest bath from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestBathData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const baths = await localDb.bathLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (baths.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    baths.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestBath = baths[0];
    if (!latestBath) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestBath.loggedByUserId, babyId])
      .first();

    return {
      ...latestBath,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest medication from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestMedicationData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const medications = await localDb.medicationLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now) // Filter out future logs
      .toArray();

    if (medications.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    medications.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestMedication = medications[0];
    if (!latestMedication) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestMedication.loggedByUserId, babyId])
      .first();

    return {
      ...latestMedication,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Read latest activity from IndexedDB with caregiver info
  // Only consider past logs (startedAt <= now) for "latest" display
  const latestActivityData = useLiveQuery(async () => {
    if (!babyId) {
      return null;
    }
    const now = new Date();
    const activities = await localDb.activityLogs
      .where('babyId')
      .equals(babyId)
      .and(log => log.startedAt <= now)
      .toArray();

    if (activities.length === 0) {
      return null;
    }

    // Sort descending by startedAt (newest first)
    activities.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime());
    const latestActivity = activities[0];
    if (!latestActivity) {
      return null;
    }

    // Get caregiver label from babyAccess
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([latestActivity.loggedByUserId, babyId])
      .first();

    return {
      ...latestActivity,
      caregiverLabel: access?.caregiverLabel ?? null,
    };
  }, [babyId]);

  // Loading state while Dexie initializes
  if (userData === undefined || latestFeedData === undefined || latestSleepData === undefined || latestNappyData === undefined || latestSolidsData === undefined || latestPumpingData === undefined || latestGrowthData === undefined || latestBathData === undefined || latestMedicationData === undefined || latestActivityData === undefined) {
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
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      <FeedTile babyId={babyId} latestFeed={latestFeedData} />
      <SleepTile babyId={babyId} latestSleep={latestSleepData} />
      <NappyTile babyId={babyId} latestNappy={latestNappyData} />
      <SolidsTile babyId={babyId} latestSolids={latestSolidsData} />
      <PumpingTile babyId={babyId} latestPumping={latestPumpingData} />
      <GrowthTile babyId={babyId} latestGrowth={latestGrowthData} />
      <BathTile babyId={babyId} latestBath={latestBathData} />
      <MedicationTile babyId={babyId} latestMedication={latestMedicationData} />
      <ActivityLogTile babyId={babyId} latestActivity={latestActivityData} />
    </div>
  );
}

function OverviewSkeleton() {
  return (
    <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
      {[...Array.from({ length: 6 })].map((_, i) => (
        <div key={i} className="h-32 animate-pulse rounded-lg bg-muted" />
      ))}
    </div>
  );
}
