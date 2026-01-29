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

function formatNappySubtitle(
  nappy: LocalNappyLog & { caregiverLabel: string | null },
): string {
  const timeAgo = formatTimeAgo(nappy.startedAt);
  const typeLabel = nappy.type
    ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
    : 'Unknown';

  // Format colour and texture if present
  let details = typeLabel;
  if (nappy.colour || nappy.texture) {
    const colourLabel = nappy.colour
      ? nappy.colour === 'black'
        ? 'Black'
        : nappy.colour.charAt(0).toUpperCase() + nappy.colour.slice(1)
      : null;
    const textureLabel = nappy.texture
      ? nappy.texture === 'veryRunny'
        ? 'Very Runny'
        : nappy.texture === 'littleBalls'
          ? 'Little Balls'
          : nappy.texture.charAt(0).toUpperCase() + nappy.texture.slice(1)
      : null;

    const additionalDetails = [colourLabel, textureLabel].filter(Boolean).join(' ');
    if (additionalDetails) {
      details = `${typeLabel}    ${additionalDetails}`;  // 4 spaces for visual separation
    }
  }

  const caregiver = nappy.caregiverLabel ? ` - by ${nappy.caregiverLabel}` : '';

  return `${timeAgo} - ${details}${caregiver}`;
}

export function NappyTile({ babyId, latestNappy }: NappyTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Format subtitle from latest nappy
  const subtitle = latestNappy
    ? formatNappySubtitle(latestNappy)
    : 'Tap to log a nappy change';

  return (
    <>
      <ActivityTile
        title="Nappy"
        subtitle={subtitle}
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
