'use client';

import type { LocalSolidsLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddSolidsModal } from './add-solids-modal';

type SolidsTileProps = {
  babyId: number;
  latestSolids: (LocalSolidsLog & { caregiverLabel: string | null }) | null | undefined;
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

function getSolidsStatusText(
  solids: LocalSolidsLog & { caregiverLabel: string | null },
): string {
  const reactionLabel = solids.reaction.charAt(0).toUpperCase() + solids.reaction.slice(1);
  return `${reactionLabel} ${solids.food}`;
}

export function SolidsTile({ babyId, latestSolids }: SolidsTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Solids"
        statusText={latestSolids ? getSolidsStatusText(latestSolids) : 'Tap to log solid food'}
        timeAgo={latestSolids ? formatTimeAgo(latestSolids.startedAt) : undefined}
        caregiver={latestSolids?.caregiverLabel}
        activity="solids"
        onClick={() => setIsModalOpen(true)}
      />
      <AddSolidsModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
