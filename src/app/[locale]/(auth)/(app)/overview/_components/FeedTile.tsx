'use client';

import type { FeedLogWithCaregiver } from '@/actions/feedLogActions';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddFeedSheet } from './AddFeedSheet';

type FeedTileProps = {
  babyId: number;
  latestFeed: FeedLogWithCaregiver | null;
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

function formatFeedSubtitle(feed: FeedLogWithCaregiver | null): string {
  if (!feed) {
    return 'Tap to log a feed';
  }

  const timeAgo = formatTimeAgo(feed.startedAt);
  const caregiver = feed.caregiverLabel ? ` - by ${feed.caregiverLabel}` : '';

  if (feed.method === 'bottle') {
    return `${timeAgo} - ${feed.amountMl ?? 0}ml formula${caregiver}`;
  }

  // Breast feed
  const duration = feed.durationMinutes ? `${feed.durationMinutes}m` : '';
  const side = feed.endSide ? ` (end on ${feed.endSide})` : '';
  return `${timeAgo} - ${duration} breast feed${side}${caregiver}`;
}

export function FeedTile({ babyId, latestFeed }: FeedTileProps) {
  const [sheetOpen, setSheetOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Feed"
        subtitle={formatFeedSubtitle(latestFeed)}
        color="teal"
        onClick={() => setSheetOpen(true)}
      />
      <AddFeedSheet
        babyId={babyId}
        open={sheetOpen}
        onOpenChange={setSheetOpen}
      />
    </>
  );
}
