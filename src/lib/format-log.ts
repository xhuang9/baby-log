'use client';

import type { LocalFeedLog, LocalGrowthLog, LocalNappyLog, LocalPumpingLog, LocalSleepLog, LocalSolidsLog } from '@/lib/local-db';

// Re-export from activity-modals for convenience
export { formatDuration as formatDurationFromMinutes } from '@/components/activity-modals/utils';

/**
 * Format time difference from past date to now (e.g., "2h 15m ago")
 */
export function formatTimeAgo(date: Date): string {
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
 * Format minutes to readable duration (e.g., "1h 30m")
 */
export function formatDuration(durationMinutes: number | null | undefined): string {
  if (!durationMinutes || durationMinutes < 0) {
    return '0m';
  }

  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * Format date for TimeSwiper header display
 * - Today: "" (empty, no label shown)
 * - Tomorrow: "tomorrow"
 * - Yesterday: "yesterday"
 * - 2-3 days ago: "2 days ago", "3 days ago"
 * - 4+ days ago or other dates: formatted date (e.g., "Jan 24, 2025")
 */
export function formatTimeSwiperDate(date: Date, currentTime: Date): string {
  const selectedDate = new Date(date);
  selectedDate.setHours(0, 0, 0, 0);

  const today = new Date(currentTime);
  today.setHours(0, 0, 0, 0);

  const diffMs = selectedDate.getTime() - today.getTime();
  const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) {
    return '';
  } // Today
  if (diffDays === 1) {
    return 'Tomorrow';
  }
  if (diffDays === -1) {
    return 'Yesterday';
  }
  if (diffDays === -2) {
    return '2 days ago';
  }
  if (diffDays === -3) {
    return '3 days ago';
  }

  // 4+ days ago or future dates: show formatted date
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Type for unified log representation
 */
export type UnifiedLog = {
  id: string;
  type: 'feed' | 'sleep' | 'nappy' | 'solids' | 'pumping' | 'growth';
  babyId: number;
  startedAt: Date;
  caregiverLabel: string | null;
  data: LocalFeedLog | LocalSleepLog | LocalNappyLog | LocalSolidsLog | LocalPumpingLog | LocalGrowthLog;
};

/**
 * Format time as HH:MM or HH:MM AM/PM based on user preference
 * Currently uses 24-hour format (can be made dynamic based on user settings)
 */
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: false });
}

/**
 * Format date as relative dates (today, yesterday, X days ago, etc.)
 */
function formatDate(date: Date): string {
  const now = new Date();
  const logDate = new Date(date);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const logDateStart = new Date(logDate);
  logDateStart.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor(
    (todayStart.getTime() - logDateStart.getTime()) / (1000 * 60 * 60 * 24),
  );

  if (dayDiff === 0) {
    return 'today';
  }
  if (dayDiff === 1) {
    return 'yesterday';
  }
  if (dayDiff >= 2) {
    return `${dayDiff} days ago`;
  }

  return 'today';
}

/**
 * Format log subtitle for display - structured format for easy scanning
 * Returns JSON to be parsed by LogItem for proper layout with aligned columns
 * Bottle: "Bottle · 155 ml" (left)     "today · 18:42" (right)
 * Breast: "Breast · 20m · Right" (left) "today · 18:42" (right)
 * Sleep:  "Sleep · 2h12m" (left)       "today · 18:42" (right)
 */
export function formatLogSubtitle(log: UnifiedLog): string {
  const time = formatTime(log.startedAt);
  const date = formatDate(log.startedAt);
  const rightPart = `${date} · ${time}`;

  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    if (feed.method === 'bottle') {
      const amount = feed.amountMl ? `${feed.amountMl} ml` : 'unknown';
      const leftPart = `Bottle · ${amount}`;
      return JSON.stringify({ left: leftPart, right: rightPart });
    } else {
      const duration = formatDuration(feed.durationMinutes);
      const side = feed.endSide ? ` · ${feed.endSide.charAt(0).toUpperCase() + feed.endSide.slice(1)}` : '';
      const leftPart = `Breast · ${duration}${side}`;
      return JSON.stringify({ left: leftPart, right: rightPart });
    }
  }

  if (log.type === 'sleep') {
    const sleep = log.data as LocalSleepLog;
    const duration = formatDuration(sleep.durationMinutes);
    const leftPart = `Sleep · ${duration}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
  }

  if (log.type === 'nappy') {
    const nappy = log.data as LocalNappyLog;
    const typeLabel = nappy.type
      ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
      : 'Unknown';
    const leftPart = `Nappy · ${typeLabel}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
  }

  if (log.type === 'solids') {
    const solids = log.data as LocalSolidsLog;
    const reactionLabel = solids.reaction.charAt(0).toUpperCase() + solids.reaction.slice(1);
    const leftPart = `Solids · ${reactionLabel} ${solids.food}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
  }

  if (log.type === 'pumping') {
    const pumping = log.data as LocalPumpingLog;
    const amountLabel = pumping.leftMl != null && pumping.rightMl != null
      ? `${pumping.leftMl}ml(L), ${pumping.rightMl}ml(R)`
      : `${pumping.totalMl}ml`;
    const leftPart = `Pumping · ${amountLabel}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
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
    const leftPart = `Growth · ${parts.join(' - ') || 'Measured'}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
  }

  return '';
}

/**
 * Format log for expanded view (overview tile style)
 * Matches overview page format: "1d 2h 33m ago - 30m breast feed (end on right) - by father"
 */
export function formatLogSubtitleExpanded(log: UnifiedLog): string {
  const timeAgo = formatTimeAgo(log.startedAt);
  const caregiver = ` - by ${log.caregiverLabel || 'Parent'}`;

  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    if (feed.method === 'bottle') {
      const amount = feed.amountMl ? `${feed.amountMl}ml formula` : 'formula';
      return `${timeAgo} - ${amount}${caregiver}`;
    } else {
      const duration = formatDuration(feed.durationMinutes);
      const side = feed.endSide ? ` (end on ${feed.endSide})` : '';
      return `${timeAgo} - ${duration} breast feed${side}${caregiver}`;
    }
  }

  if (log.type === 'sleep') {
    const sleep = log.data as LocalSleepLog;
    const duration = formatDuration(sleep.durationMinutes);
    return `${timeAgo} - duration ${duration}${caregiver}`;
  }

  if (log.type === 'nappy') {
    const nappy = log.data as LocalNappyLog;
    const typeLabel = nappy.type
      ? nappy.type.charAt(0).toUpperCase() + nappy.type.slice(1)
      : 'Unknown';
    return `${timeAgo} - ${typeLabel}${caregiver}`;
  }

  if (log.type === 'solids') {
    const solids = log.data as LocalSolidsLog;
    const reactionLabel = solids.reaction.charAt(0).toUpperCase() + solids.reaction.slice(1);
    return `${timeAgo} - ${reactionLabel} ${solids.food}${caregiver}`;
  }

  if (log.type === 'pumping') {
    const pumping = log.data as LocalPumpingLog;
    const amountLabel = pumping.leftMl != null && pumping.rightMl != null
      ? `${pumping.leftMl}ml(L), ${pumping.rightMl}ml(R)`
      : `${pumping.totalMl}ml`;
    return `${timeAgo} - ${amountLabel}${caregiver}`;
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
    return `${timeAgo} - ${parts.join(' - ') || 'Measured'}${caregiver}`;
  }

  return timeAgo;
}

/**
 * Group logs by date (Today, Yesterday, specific dates)
 */
export type LogGroup = {
  label: string;
  logs: UnifiedLog[];
  sortKey: number; // For sorting groups (newer first)
};

export function groupLogsByDate(logs: UnifiedLog[]): LogGroup[] {
  const groups = new Map<string, { logs: UnifiedLog[]; sortKey: number }>();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const log of logs) {
    const logDate = new Date(log.startedAt);
    const logDateStart = new Date(logDate);
    logDateStart.setHours(0, 0, 0, 0);

    let label: string;
    let sortKey: number;

    const dayDiff = Math.floor(
      (todayStart.getTime() - logDateStart.getTime()) / (1000 * 60 * 60 * 24),
    );

    if (dayDiff === 0) {
      label = 'Today';
      sortKey = 0;
    } else if (dayDiff === 1) {
      label = 'Yesterday';
      sortKey = 1;
    } else {
      // Format as "Mon, Jan 24, 2025"
      label = logDate.toLocaleDateString('en-US', {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      sortKey = dayDiff;
    }

    if (!groups.has(label)) {
      groups.set(label, { logs: [], sortKey });
    }
    groups.get(label)!.logs.push(log);
  }

  return Array.from(groups.entries())
    .map(([label, { logs, sortKey }]) => ({
      label,
      logs,
      sortKey,
    }))
    .sort((a, b) => a.sortKey - b.sortKey);
}
