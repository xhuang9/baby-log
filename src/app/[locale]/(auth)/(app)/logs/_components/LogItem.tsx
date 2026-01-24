'use client';

import { ActivityTile } from '@/app/[locale]/(auth)/(app)/overview/_components/ActivityTile';
import { cn } from '@/lib/utils';
import { formatLogSubtitle, formatLogSubtitleExpanded } from '@/lib/format-log';
import type { UnifiedLog } from '@/lib/format-log';
import type { ViewMode } from './LogsFilters';

export interface LogItemProps {
  log: UnifiedLog;
  onClick?: (log: UnifiedLog) => void;
  viewMode?: ViewMode;
}

/**
 * Log item tile for activity logs page
 * Displays a single activity log using ActivityTile component
 * Simplified mode: One-line compact format with left/right columns
 * Expanded mode: Multi-line format matching overview tile layout
 */
export function LogItem({ log, onClick, viewMode = 'simplified' }: LogItemProps) {
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

  // Simplified: compact format with left/right columns
  const activityClassMap = {
    feed: 'activity-tile--feed',
    sleep: 'activity-tile--sleep',
    nappy: 'activity-tile--nappy',
  } as const;

  return (
    <button
      type="button"
      onClick={() => onClick?.(log)}
      className={cn(
        'activity-tile',
        activityClassMap[log.type as keyof typeof activityClassMap],
        'w-full text-left cursor-pointer flex justify-between font-mono text-sm py-2 px-3'
      )}
    >
      <span>{parsed.left}</span>
      <span>{parsed.right}</span>
    </button>
  );
}
