'use client';

import type { LocalGrowthLog } from '@/lib/local-db';
import { useState } from 'react';
import { ActivityTile } from './ActivityTile';
import { AddGrowthModal } from './add-growth-modal';

type GrowthTileProps = {
  babyId: number;
  latestGrowth: (LocalGrowthLog & { caregiverLabel: string | null }) | null | undefined;
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

/**
 * Format growth measurements for display
 * Display format: "70cm - 16.22kg - 35cm head"
 */
function getGrowthStatusText(
  growth: LocalGrowthLog & { caregiverLabel: string | null },
): string {
  const parts: string[] = [];

  // Height: mm → cm (e.g., 700mm → 70cm)
  if (growth.heightMm != null) {
    const heightCm = (growth.heightMm / 10).toFixed(1).replace(/\.0$/, '');
    parts.push(`${heightCm}cm`);
  }

  // Weight: g → kg (e.g., 16220g → 16.22kg)
  if (growth.weightG != null) {
    const weightKg = (growth.weightG / 1000).toFixed(2).replace(/\.?0+$/, '');
    parts.push(`${weightKg}kg`);
  }

  // Head circumference: mm → cm
  if (growth.headCircumferenceMm != null) {
    const headCm = (growth.headCircumferenceMm / 10).toFixed(1).replace(/\.0$/, '');
    parts.push(`${headCm}cm head`);
  }

  return parts.length > 0 ? parts.join(' - ') : 'Measurements recorded';
}

export function GrowthTile({ babyId, latestGrowth }: GrowthTileProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      <ActivityTile
        title="Growth"
        statusText={latestGrowth ? getGrowthStatusText(latestGrowth) : 'Tap to log measurements'}
        timeAgo={latestGrowth ? formatTimeAgo(latestGrowth.startedAt) : undefined}
        caregiver={latestGrowth?.caregiverLabel}
        activity="growth"
        onClick={() => setIsModalOpen(true)}
      />
      <AddGrowthModal
        babyId={babyId}
        open={isModalOpen}
        onOpenChange={setIsModalOpen}
      />
    </>
  );
}
