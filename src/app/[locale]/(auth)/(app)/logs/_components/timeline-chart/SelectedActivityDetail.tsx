'use client';

import type { UnifiedLog } from '@/lib/format-log';
import type { LocalFeedLog, LocalGrowthLog, LocalNappyLog, LocalSleepLog, LocalSolidsLog } from '@/lib/local-db';
import { Apple, Baby, ChevronRight, Moon, MousePointerClick, Ruler } from 'lucide-react';
import { formatDuration } from '@/lib/format-log';
import { cn } from '@/lib/utils';

export type SelectedActivityDetailProps = {
  log: UnifiedLog | null;
  onEdit: (log: UnifiedLog) => void;
};

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
 * Get icon for activity type
 */
function ActivityIcon({ type }: { type: 'feed' | 'sleep' | 'nappy' | 'solids' | 'pumping' | 'growth' }) {
  if (type === 'sleep') {
    return <Moon className="h-5 w-5" />;
  }
  if (type === 'nappy') {
    return <Baby className="h-5 w-5" />;
  }
  if (type === 'solids') {
    return <Apple className="h-5 w-5" />;
  }
  if (type === 'growth') {
    return <Ruler className="h-5 w-5" />;
  }
  return <Baby className="h-5 w-5" />;
}

/**
 * Get activity title with details
 */
function getActivityTitle(log: UnifiedLog): string {
  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    if (feed.method === 'bottle') {
      const amount = feed.amountMl ? `${feed.amountMl}ml` : '';
      return `Bottle${amount ? ` ${amount}` : ''}`;
    }
    const side = feed.endSide ? ` (${feed.endSide})` : '';
    return `Breast${side}`;
  }

  if (log.type === 'nappy') {
    const nappy = log.data as LocalNappyLog;
    const typeLabel = nappy.type
      ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
      : 'Nappy';
    return typeLabel;
  }

  if (log.type === 'solids') {
    const solids = log.data as LocalSolidsLog;
    const reactionLabel = solids.reaction.charAt(0).toUpperCase() + solids.reaction.slice(1);
    return `${reactionLabel} ${solids.food}`;
  }

  if (log.type === 'growth') {
    const growth = log.data as LocalGrowthLog;
    const parts: string[] = [];
    if (growth.heightMm != null) {
      const heightCm = (growth.heightMm / 10).toFixed(1).replace(/\.0$/, '');
      parts.push(`${heightCm}cm`);
    }
    if (growth.weightG != null) {
      const weightKg = (growth.weightG / 1000).toFixed(2).replace(/\.?0+$/, '');
      parts.push(`${weightKg}kg`);
    }
    if (growth.headCircumferenceMm != null) {
      const headCm = (growth.headCircumferenceMm / 10).toFixed(1).replace(/\.0$/, '');
      parts.push(`${headCm}cm head`);
    }
    return parts.length > 0 ? parts.join(' - ') : 'Growth';
  }

  return 'Sleep';
}

/**
 * Get duration text
 */
function getDurationText(log: UnifiedLog): string {
  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    return feed.durationMinutes ? formatDuration(feed.durationMinutes) : '';
  }

  if (log.type === 'sleep') {
    const sleep = log.data as LocalSleepLog;
    return sleep.durationMinutes ? formatDuration(sleep.durationMinutes) : '';
  }

  if (log.type === 'nappy') {
    return ''; // Nappy logs don't have duration
  }

  if (log.type === 'growth') {
    return ''; // Growth logs don't have duration
  }

  return '';
}

/**
 * Get time range text
 */
function getTimeRange(log: UnifiedLog): string {
  const start = formatTime(log.startedAt);

  // Nappy and growth logs don't have end time
  if (log.type === 'nappy' || log.type === 'growth') {
    return start;
  }

  const data = log.data as LocalFeedLog | LocalSleepLog;

  if (data.endedAt) {
    const end = formatTime(data.endedAt);
    return `${start} - ${end}`;
  }

  return `${start} - ongoing`;
}

/**
 * Bottom panel showing selected log details with edit action
 * Always visible - shows placeholder text when no item is selected
 */
export function SelectedActivityDetail({
  log,
  onEdit,
}: SelectedActivityDetailProps) {
  const title = log ? getActivityTitle(log) : '';
  const duration = log ? getDurationText(log) : '';
  const timeRange = log ? getTimeRange(log) : '';

  return (
    <div
      className={cn(
        'shrink-0 border-t border-border bg-card px-4 py-3',
        'flex items-center gap-3',
      )}
    >
      {/* eslint-disable-next-line style/multiline-ternary */}
      {log ? (
        <>
          {/* Activity icon */}
          <div
            className={cn(
              'flex h-10 w-10 shrink-0 items-center justify-center rounded-full',
            )}
            style={{
              backgroundColor: `color-mix(in oklab, var(--color-activity-${log.type}-background) 20%, transparent)`,
              color: `var(--color-activity-${log.type}-background)`,
            }}
          >
            <ActivityIcon type={log.type} />
          </div>

          {/* Details */}
          <div className="min-w-0 flex-1">
            <p className="truncate font-medium text-foreground">
              {title}
              {duration && (
                <span className="ml-2 text-muted-foreground">{duration}</span>
              )}
            </p>
            <p className="text-sm text-muted-foreground">{timeRange}</p>
          </div>

          {/* Edit button */}
          <button
            type="button"
            onClick={() => onEdit(log)}
            className="rounded-full p-2 text-muted-foreground hover:bg-muted hover:text-foreground"
            aria-label="Edit activity"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </>
      ) : (
        // Default state when no item selected
        <>
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <MousePointerClick className="h-5 w-5" />
          </div>
          <p className="text-sm text-muted-foreground">
            Tap an activity to see details
          </p>
        </>
      )}
    </div>
  );
}
