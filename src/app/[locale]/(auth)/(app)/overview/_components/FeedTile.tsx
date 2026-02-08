'use client';

import type { FeedLogWithCaregiver } from '@/actions/feedLogActions';
import { useState } from 'react';
import { useTimerStore } from '@/stores/useTimerStore';
import { ActivityTile } from './ActivityTile';
import { AddFeedModal } from './add-feed-modal';

type FeedTileProps = {
  babyId: number;
  latestFeed: (FeedLogWithCaregiver & { notes?: string | null }) | null;
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

function getFeedStatusText(feed: FeedLogWithCaregiver | null): string {
  if (!feed) {
    return 'Tap to log a feed';
  }
  if (feed.method === 'bottle') {
    return `${feed.amountMl ?? 0}ml formula`;
  }
  // Breast feed
  return feed.durationMinutes ? `${feed.durationMinutes}m breast feed` : 'breast feed';
}

export function FeedTile({ babyId, latestFeed }: FeedTileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  // Get timer state for this activity
  const timerKey = `feed-${babyId}`;
  const timerState = useTimerStore(s => s.timers[timerKey]);

  // Pass timer data to ActivityTile - it handles live updates internally
  const timerElapsedBase = timerState?.elapsedSeconds ?? 0;
  const timerStartTime = timerState?.lastStartTime ?? null;
  const isTimerRunning = Boolean(timerStartTime);
  const hasActiveTimer = timerElapsedBase > 0 || isTimerRunning;

  return (
    <>
      <ActivityTile
        title="Feed"
        statusText={getFeedStatusText(latestFeed)}
        timeAgo={latestFeed ? formatTimeAgo(latestFeed.startedAt) : undefined}
        caregiver={latestFeed?.caregiverLabel}
        notes={latestFeed?.notes}
        activity="feed"
        onClick={() => setSheetOpen(true)}
        timerElapsedBase={timerElapsedBase}
        timerStartTime={timerStartTime}
      />
      <AddFeedModal
        babyId={babyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialMethod={hasActiveTimer ? 'breast' : undefined}
      />
    </>
  );
}
