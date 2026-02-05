'use client';

import type { UnifiedLog } from '@/lib/format-log';
import type { LocalFeedLog, LocalGrowthLog, LocalNappyLog, LocalSleepLog } from '@/lib/local-db';
import { formatDuration } from '@/lib/format-log';
import { cn } from '@/lib/utils';

export type ActivityBlockProps = {
  log: UnifiedLog;
  top: number;
  height: number;
  /** Show text label inside block (for today view) */
  showLabel: boolean;
  isSelected: boolean;
  onClick: () => void;
};

/**
 * Get CSS class for activity type
 */
function getActivityClass(log: UnifiedLog): string {
  if (log.type === 'feed') {
    return 'activity-block--feed';
  }
  if (log.type === 'sleep') {
    return 'activity-block--sleep';
  }
  if (log.type === 'nappy') {
    return 'activity-block--nappy';
  }
  if (log.type === 'solids') {
    return 'activity-block--solids';
  }
  if (log.type === 'pumping') {
    return 'activity-block--pumping';
  }
  if (log.type === 'growth') {
    return 'activity-block--growth';
  }
  return '';
}

/**
 * Get label text for activity
 */
function getActivityLabel(log: UnifiedLog): { primary: string; secondary?: string } {
  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    if (feed.method === 'bottle') {
      return {
        primary: 'Bottle',
        secondary: feed.amountMl ? `${feed.amountMl}ml` : undefined,
      };
    }
    return {
      primary: 'Breast',
      secondary: feed.durationMinutes ? formatDuration(feed.durationMinutes) : undefined,
    };
  }

  if (log.type === 'sleep') {
    const sleep = log.data as LocalSleepLog;
    return {
      primary: 'Sleep',
      secondary: sleep.durationMinutes ? formatDuration(sleep.durationMinutes) : undefined,
    };
  }

  if (log.type === 'nappy') {
    const nappy = log.data as LocalNappyLog;
    const typeLabel = nappy.type
      ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
      : 'Nappy';
    return {
      primary: typeLabel,
    };
  }

  if (log.type === 'solids') {
    return { primary: 'Solids' };
  }

  if (log.type === 'pumping') {
    return { primary: 'Pumping' };
  }

  if (log.type === 'growth') {
    const growth = log.data as LocalGrowthLog;
    const parts: string[] = [];
    if (growth.weightG != null) {
      const weightKg = (growth.weightG / 1000).toFixed(2).replace(/\.?0+$/, '');
      parts.push(`${weightKg}kg`);
    }
    if (growth.heightMm != null) {
      const heightCm = (growth.heightMm / 10).toFixed(1).replace(/\.0$/, '');
      parts.push(`${heightCm}cm`);
    }
    return {
      primary: 'Growth',
      secondary: parts.length > 0 ? parts.join(', ') : undefined,
    };
  }

  return { primary: 'Activity' };
}

/**
 * Format time as HH:MM
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Individual colored activity block
 */
export function ActivityBlock({
  log,
  top,
  height,
  showLabel,
  isSelected,
  onClick,
}: ActivityBlockProps) {
  const activityClass = getActivityClass(log);
  const label = getActivityLabel(log);
  const canShowLabel = showLabel && height >= 24; // Only show label if tall enough

  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        'activity-block',
        activityClass,
        isSelected && 'ring-1 ring-ring',
      )}
      style={{ top, height }}
      aria-label={`${label.primary}${label.secondary ? ` - ${label.secondary}` : ''} at ${formatTime(log.startedAt)}`}
    >
      {canShowLabel && (
        <div className="flex flex-col overflow-hidden px-1.5 py-0.5">
          <span className="truncate text-[10px] leading-tight font-medium">
            {label.primary}
            {label.secondary && (
              <span className="ml-1 opacity-80">{label.secondary}</span>
            )}
          </span>
          {height >= 36 && (
            <span className="truncate text-[9px] opacity-70">
              {formatTime(log.startedAt)}
            </span>
          )}
        </div>
      )}
    </button>
  );
}
