'use client';

import type { ActivityLogCategory, LocalActivityLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddActivityLogModal } from './add-activity-log-modal';

const ACTIVITY_TYPE_LABELS: Record<ActivityLogCategory, string> = {
  tummy_time: 'Tummy Time',
  indoor_play: 'Indoor Play',
  outdoor_play: 'Outdoor Play',
  screen_time: 'Screen Time',
  other: 'Other',
};

type ActivityLogTileProps = {
  babyId: number;
  latestActivity: (LocalActivityLog & { caregiverLabel: string | null }) | null | undefined;
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

export function ActivityLogTile({ babyId, latestActivity }: ActivityLogTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const statusText = latestActivity
    ? ACTIVITY_TYPE_LABELS[latestActivity.activityType]
    : 'Tap to log an activity';

  return (
    <>
      <ActivityTile
        title="Activity"
        statusText={statusText}
        timeAgo={latestActivity ? formatTimeAgo(latestActivity.startedAt) : undefined}
        caregiver={latestActivity?.caregiverLabel}
        activity="activity"
        onClick={() => setIsModalOpen(true)}
      />
      <AddActivityLogModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
