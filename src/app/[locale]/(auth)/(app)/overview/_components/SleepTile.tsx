'use client';

import type { LocalSleepLog } from '@/lib/local-db';
import { useState } from 'react';
import { useTimerStore } from '@/stores/useTimerStore';
import { ActivityTile } from './ActivityTile';
import { AddSleepModal } from './add-sleep-modal';

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

function getSleepStatusText(sleep: SleepLogWithCaregiver | null): string {
  if (!sleep) {
    return 'Tap to log sleep';
  }
  return `duration ${formatDuration(sleep.durationMinutes)}`;
}

export function SleepTile({ babyId, latestSleep }: SleepTileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Get timer state for this activity
  const timerKey = `sleep-${babyId}`;
  const timerState = useTimerStore(s => s.timers[timerKey]);

  // Pass timer data to ActivityTile - it handles live updates internally
  const timerElapsedBase = timerState?.elapsedSeconds ?? 0;
  const timerStartTime = timerState?.lastStartTime ?? null;

  // Calculate time ago from endedAt if available, otherwise from startedAt
  const referenceTime = latestSleep?.endedAt ?? latestSleep?.startedAt;

  return (
    <>
      <ActivityTile
        title="Sleep"
        statusText={getSleepStatusText(latestSleep)}
        timeAgo={referenceTime ? formatTimeAgo(referenceTime) : undefined}
        caregiver={latestSleep?.caregiverLabel}
        notes={latestSleep?.notes}
        activity="sleep"
        onClick={() => setSheetOpen(true)}
        timerElapsedBase={timerElapsedBase}
        timerStartTime={timerStartTime}
      />
      <AddSleepModal
        babyId={babyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
