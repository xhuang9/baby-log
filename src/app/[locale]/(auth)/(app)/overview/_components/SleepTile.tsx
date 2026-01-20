'use client';

import type { LocalSleepLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddSleepModal } from './AddSleepModal';

type SleepLogWithCaregiver = LocalSleepLog & {
  caregiverLabel: string | null;
};

type SleepTileProps = {
  babyId: number;
  latestSleep: SleepLogWithCaregiver | null;
};

function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0 ? `${diffDays}d ${remainingHours}h ago` : `${diffDays}d ago`;
  }

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0 ? `${diffHours}h ${remainingMinutes}m ago` : `${diffHours}h ago`;
  }

  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }

  return 'Just now';
}

function formatDuration(durationMinutes: number | null): string {
  if (!durationMinutes) {
    return '0m';
  }

  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function formatSleepSubtitle(sleep: SleepLogWithCaregiver | null): string {
  if (!sleep) {
    return 'Tap to log sleep';
  }

  // Calculate time ago from endedAt if available, otherwise from startedAt
  const referenceTime = sleep.endedAt ?? sleep.startedAt;
  const timeAgo = formatTimeAgo(referenceTime);
  const duration = formatDuration(sleep.durationMinutes);
  const caregiver = sleep.caregiverLabel ? ` - by ${sleep.caregiverLabel}` : '';

  return `${timeAgo} - duration ${duration}${caregiver}`;
}

export function SleepTile({ babyId, latestSleep }: SleepTileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Sleep"
        subtitle={formatSleepSubtitle(latestSleep)}
        activity="sleep"
        onClick={() => setSheetOpen(true)}
      />
      <AddSleepModal
        babyId={babyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
