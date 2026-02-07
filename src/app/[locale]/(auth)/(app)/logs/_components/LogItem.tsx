'use client';

import type { ActivityType } from '@/app/[locale]/(auth)/(app)/overview/_components/ActivityTile';
import type { UnifiedLog } from '@/lib/format-log';
import { useCallback, useRef, useState } from 'react';
import { ActivityTile } from '@/app/[locale]/(auth)/(app)/overview/_components/ActivityTile';
import { formatLogSubtitle } from '@/lib/format-log';
import { notifyToast } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { deleteFeedLog } from '@/services/operations';

const activityClasses = {
  'feed': 'activity-tile--feed',
  'sleep': 'activity-tile--sleep',
  'nappy': 'activity-tile--nappy',
  'solids': 'activity-tile--solids',
  'pumping': 'activity-tile--pumping',
  'growth': 'activity-tile--growth',
  'bath': 'activity-tile--bath',
  'medication': 'activity-tile--medication',
  'tummy-time': 'activity-tile--tummy-time',
  'story-time': 'activity-tile--story-time',
  'screen-time': 'activity-tile--screen-time',
  'skin-to-skin': 'activity-tile--skin-to-skin',
  'outdoor-play': 'activity-tile--outdoor-play',
  'indoor-play': 'activity-tile--indoor-play',
  'brush-teeth': 'activity-tile--brush-teeth',
} as const;

export type LogItemProps = {
  log: UnifiedLog;
  onClick?: (log: UnifiedLog) => void;
};

/**
 * Log item tile for activity logs page
 * Displays a single activity log in compact one-line format
 * Supports swipe-to-delete on mobile: swipe left to fully reveal and delete
 * Features left border with activity color and bold activity type
 */
export function LogItem({ log, onClick }: LogItemProps) {
  const [swipeTranslate, setSwipeTranslate] = useState(0);
  const [isDeleting, setIsDeleting] = useState(false);
  const touchStartX = useRef(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const DELETE_THRESHOLD = 100; // px - distance to swipe to trigger delete

  const handleTouchStart = (e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]!.clientX;
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    const touchCurrentX = e.touches[0]!.clientX;
    const diff = touchCurrentX - touchStartX.current;

    // Only allow swiping left (negative values) with no hard limit
    if (diff < 0) {
      setSwipeTranslate(diff);
    } else if (diff > 0 && swipeTranslate < 0) {
      // Swiping back to the right
      setSwipeTranslate(Math.min(diff, 0));
    }
  };

  const handleDelete = useCallback(async () => {
    setIsDeleting(true);

    try {
      const result = await deleteFeedLog(log.id);

      if (!result.success) {
        const errorMsg = result.error || 'Failed to delete feed';
        notifyToast.error(errorMsg);
        setIsDeleting(false);
        setSwipeTranslate(0);
        return;
      }

      notifyToast.success('Feed deleted');
      // On success, the item will be removed via useLiveQuery automatically
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to delete feed';
      notifyToast.error(errorMsg);
      setIsDeleting(false);
      setSwipeTranslate(0);
    }
  }, [log.id]);

  const handleTouchEnd = useCallback(() => {
    // If swiped past threshold (-100px), delete the item. Otherwise, snap back.
    if (swipeTranslate < -DELETE_THRESHOLD) {
      handleDelete();
    } else {
      // Snap back with animation
      setSwipeTranslate(0);
    }
  }, [swipeTranslate, handleDelete]);

  const details = formatLogSubtitle(log);

  let parsed: { left: string; right: string } | null = null;
  try {
    parsed = JSON.parse(details);
  } catch {
    // Fallback for legacy format
    return (
      <ActivityTile
        title={log.type}
        statusText={details}
        activity={log.type as ActivityType}
        onClick={() => onClick?.(log)}
      />
    );
  }

  if (!parsed) {
    return (
      <ActivityTile
        title={log.type}
        statusText={details}
        activity={log.type as ActivityType}
        onClick={() => onClick?.(log)}
      />
    );
  }

  const activityClass = activityClasses[log.type as keyof typeof activityClasses] || '';

  // Extract subtype from parsed.left (first word before the dot)
  // e.g., "Bottle · 120 ml" → subType: "Bottle", subDescription: "120 ml"
  // e.g., "Breast · 38m · Left" → subType: "Breast", subDescription: "38m · Left"
  const parts = parsed.left.split(' · ');
  const subType = parts[0]; // e.g., "Bottle", "Breast", "Sleep"
  const subDescription = parts.slice(1).join(' · '); // remaining parts

  // Format caregiver label - max 10 characters with ellipsis
  const displayCaregiver = log.caregiverLabel
    ? log.caregiverLabel.length > 10
      ? `${log.caregiverLabel.substring(0, 10)}...`
      : log.caregiverLabel
    : null;

  // On sm+ screens, prepend caregiver to right side if available
  const rightContent = displayCaregiver
    ? `${displayCaregiver} · ${parsed.right}`
    : parsed.right;

  return (
    <div
      ref={containerRef}
      className="activity-tile-card relative overflow-hidden"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button background (revealed on swipe) */}
      <div className="absolute top-0 bottom-0 left-0 right-1 flex items-center justify-end bg-destructive px-4">
        <span className="text-sm font-semibold text-white">Delete</span>
      </div>

      {/* Swipeable content */}
      <button
        type="button"
        onClick={() => onClick?.(log)}
        disabled={isDeleting}
        className={cn(
          'activity-tile w-full text-left cursor-pointer flex items-center gap-3 px-3 py-2 text-sm',
          activityClass,
          swipeTranslate === 0 && 'transition-transform duration-300 ease-out',
          isDeleting && 'opacity-50',
        )}
        style={{
          transform: `translateX(${swipeTranslate}px)`,
        }}
      >
        {/* Activity subtype - highlighted in activity color with activity-tile-title styling */}
        <span className={cn('shrink-0 activity-tile-title text-base', activityClass)}>
          {subType}
        </span>

        {/* Details - middle content */}
        <span className="min-w-0 flex-1 truncate">{subDescription}</span>

        {/* Right side - time info (with caregiver on sm+ screens) */}
        <span className="hidden shrink-0 text-right sm:inline">{rightContent}</span>
        <span className="shrink-0 text-right sm:hidden">{parsed.right}</span>
      </button>
    </div>
  );
}
