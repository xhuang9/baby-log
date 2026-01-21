'use client';

import { useLiveQuery } from 'dexie-react-hooks';
import { localDb } from '@/lib/local-db/database';
import { CaregiversSection } from './_components/CaregiversSection';
import { CreateInviteSection } from './_components/CreateInviteSection';
import { IncomingRequestsSection } from './_components/IncomingRequestsSection';
import { PendingInvitesSection } from './_components/PendingInvitesSection';

type BabySharingContentProps = {
  babyId: string;
};

export function BabySharingContent({ babyId }: BabySharingContentProps) {
  const numericBabyId = Number.parseInt(babyId, 10);

  // Get current user from IndexedDB
  const userData = useLiveQuery(async () => {
    const user = await localDb.users.toCollection().first();
    return user ?? null;
  }, []);

  // Get baby and verify owner access
  const babyData = useLiveQuery(async () => {
    if (Number.isNaN(numericBabyId)) {
      return null;
    }

    if (!userData) {
      return undefined; // Return undefined to keep loading state, not null
    }

    const baby = await localDb.babies.get(numericBabyId);

    if (!baby) {
      return null;
    }

    if (baby.archivedAt !== null) {
      return null;
    }

    // Verify user is owner
    const access = await localDb.babyAccess
      .where('[userId+babyId]')
      .equals([userData.id, numericBabyId])
      .first();

    if (!access) {
      return null;
    }

    if (access.accessLevel !== 'owner') {
      return null;
    }

    return {
      baby,
      access,
    };
  }, [numericBabyId, userData]);

  // Loading state - show loading if either is undefined, or if userData is null
  if (userData === undefined || userData === null || babyData === undefined) {
    return (
      <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-20">
        <div className="h-10 w-80 animate-pulse rounded-lg bg-muted" />
        <div className="h-64 animate-pulse rounded-lg bg-muted" />
        <div className="h-48 animate-pulse rounded-lg bg-muted" />
      </div>
    );
  }

  // No data (will redirect)
  if (babyData === null) {
    return null;
  }

  const { baby } = babyData;

  return (
    <div className="mx-auto w-full max-w-3xl space-y-6 px-4 pb-20">
      {/* Header */}
      <div className="space-y-2">
        <h1 className="text-2xl font-bold">Sharing & Access</h1>
        <p className="text-sm text-muted-foreground">
          Manage who can access
          {' '}
          {baby.name}
          's information
        </p>
      </div>

      {/* Create Invite Section */}
      <CreateInviteSection babyId={numericBabyId} babyName={baby.name} />

      {/* Pending Invites Section */}
      <PendingInvitesSection babyId={numericBabyId} />

      {/* Incoming Requests Section */}
      <IncomingRequestsSection babyId={numericBabyId} />

      {/* Caregivers Section */}
      <CaregiversSection babyId={numericBabyId} />
    </div>
  );
}
