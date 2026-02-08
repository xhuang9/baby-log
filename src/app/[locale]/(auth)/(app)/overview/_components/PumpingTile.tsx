'use client';

import type { LocalPumpingLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddPumpingModal } from './add-pumping-modal';

type PumpingTileProps = {
  babyId: number;
  latestPumping: (LocalPumpingLog & { caregiverLabel: string | null }) | null | undefined;
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

function getPumpingStatusText(
  pumping: LocalPumpingLog & { caregiverLabel: string | null },
): string {
  if (pumping.leftMl != null && pumping.rightMl != null) {
    return `${pumping.leftMl}ml(L), ${pumping.rightMl}ml(R)`;
  }
  return `${pumping.totalMl}ml`;
}

export function PumpingTile({ babyId, latestPumping }: PumpingTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Pumping"
        statusText={latestPumping ? getPumpingStatusText(latestPumping) : 'Tap to log pumping'}
        timeAgo={latestPumping ? formatTimeAgo(latestPumping.startedAt) : undefined}
        caregiver={latestPumping?.caregiverLabel}
        notes={latestPumping?.notes}
        activity="pumping"
        onClick={() => setIsModalOpen(true)}
      />
      <AddPumpingModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
