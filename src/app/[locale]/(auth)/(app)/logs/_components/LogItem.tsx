'use client';

import type { ViewMode } from './LogsFilters';
import type { UnifiedLog } from '@/lib/format-log';
import { useCallback, useRef, useState } from 'react';
import { ActivityTile } from '@/app/[locale]/(auth)/(app)/overview/_components/ActivityTile';
import { formatLogSubtitle, formatLogSubtitleExpanded } from '@/lib/format-log';
import { notifyToast } from '@/lib/notify';
import { cn } from '@/lib/utils';
import { deleteFeedLog } from '@/services/operations';

export type LogItemProps = {
  log: UnifiedLog;
  onClick?: (log: UnifiedLog) => void;
  viewMode?: ViewMode;
};

/**
 * Log item tile for activity logs page
 * Displays a single activity log using ActivityTile component
 * Supports swipe-to-delete on mobile: swipe left to fully reveal and delete
 * Simplified mode: One-line compact format with left/right columns
 * Expanded mode: Multi-line format matching overview tile layout
 */
export function LogItem({ log, onClick, viewMode = 'simplified' }: LogItemProps) {
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

  const handleTouchEnd = useCallback(() => {
    // If swiped past threshold (-100px), delete the item. Otherwise, snap back.
    if (swipeTranslate < -DELETE_THRESHOLD) {
      handleDelete();
    } else {
      // Snap back with animation
      setSwipeTranslate(0);
    }
  }, [swipeTranslate]);

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

  const details = formatLogSubtitle(log);

  let parsed: { left: string; right: string } | null = null;
  try {
    parsed = JSON.parse(details);
  } catch {
    // Fallback for legacy format
    return (
      <ActivityTile
        title={log.type}
        subtitle={details}
        activity={log.type}
        onClick={() => onClick?.(log)}
        multiline={viewMode === 'expanded'}
        layout={viewMode === 'expanded' ? 'column' : 'row'}
      />
    );
  }

  if (!parsed) {
    return (
      <ActivityTile
        title={log.type}
        subtitle={details}
        activity={log.type}
        onClick={() => onClick?.(log)}
        multiline={viewMode === 'expanded'}
        layout={viewMode === 'expanded' ? 'column' : 'row'}
      />
    );
  }

  if (viewMode === 'expanded') {
    // Expanded: match overview tile format with full description
    const expandedSubtitle = formatLogSubtitleExpanded(log);
    return (
      <ActivityTile
        title={log.type.charAt(0).toUpperCase() + log.type.slice(1)}
        subtitle={expandedSubtitle}
        activity={log.type}
        onClick={() => onClick?.(log)}
      />
    );
  }

  // Simplified: compact format with left/right columns + swipe-to-delete
  const activityClassMap = {
    feed: 'activity-tile--feed',
    sleep: 'activity-tile--sleep',
    nappy: 'activity-tile--nappy',
  } as const;

  return (
    <div
      ref={containerRef}
      className="relative overflow-hidden rounded-lg"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
    >
      {/* Delete button background (revealed on swipe) */}
      <div className="absolute inset-0 flex items-center justify-end bg-red-500 px-4">
        <span className="text-sm font-semibold text-white">Delete</span>
      </div>

      {/* Swipeable content */}
      <button
        type="button"
        onClick={() => onClick?.(log)}
        disabled={isDeleting}
        className={cn(
          'activity-tile',
          activityClassMap[log.type as keyof typeof activityClassMap],
          'w-full text-left cursor-pointer flex justify-between font-mono text-sm py-2 px-3',
          swipeTranslate === 0 && 'transition-transform duration-300 ease-out',
          isDeleting && 'opacity-50',
        )}
        style={{
          transform: `translateX(${swipeTranslate}px)`,
        }}
      >
        <span>{parsed.left}</span>
        <span>{parsed.right}</span>
      </button>
    </div>
  );
}
