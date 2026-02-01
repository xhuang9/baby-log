'use client';

import type { LocalNappyLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddNappyModal } from './add-nappy-modal';

type NappyTileProps = {
  babyId: number;
  latestNappy: (LocalNappyLog & { caregiverLabel: string | null }) | null | undefined;
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

function formatConsistencyLabel(consistency: string): string {
  const labels: Record<string, string> = {
    watery: 'watery',
    runny: 'runny',
    mushy: 'mushy',
    pasty: 'pasty',
    formed: 'formed',
    hardPellets: 'hard pellets',
  };
  return labels[consistency] ?? consistency;
}

function getNappyStatusText(
  nappy: LocalNappyLog & { caregiverLabel: string | null },
): string {
  const typeLabel = nappy.type
    ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
    : 'Unknown';

  const detailParts = [typeLabel];
  if (nappy.colour) {
    detailParts.push(nappy.colour.toLowerCase());
  }
  if (nappy.consistency) {
    detailParts.push(formatConsistencyLabel(nappy.consistency));
  }

  return detailParts.join(' ');
}

export function NappyTile({ babyId, latestNappy }: NappyTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Nappy"
        statusText={latestNappy ? getNappyStatusText(latestNappy) : 'Tap to log a nappy change'}
        timeAgo={latestNappy ? formatTimeAgo(latestNappy.startedAt) : undefined}
        caregiver={latestNappy?.caregiverLabel}
        activity="nappy"
        onClick={() => setIsModalOpen(true)}
      />
      <AddNappyModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
