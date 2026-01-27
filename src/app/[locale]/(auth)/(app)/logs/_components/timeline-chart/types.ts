import type { UnifiedLog } from '@/lib/format-log';

/** Starting hour for timeline (6am = 6) */
export const HOUR_OFFSET = 6;

/** Pixels per hour - desktop */
export const HOUR_HEIGHT = 60;

/** Pixels per hour - mobile (smaller to fit more on screen) */
export const HOUR_HEIGHT_MOBILE = 40;

/** Total height for 24 hours */
export const TOTAL_HEIGHT = HOUR_HEIGHT * 24;
export const TOTAL_HEIGHT_MOBILE = HOUR_HEIGHT_MOBILE * 24;

/** Minimum block height for visibility */
export const MIN_BLOCK_HEIGHT = 8;

/** Width of the hour label gutter */
export const GUTTER_WIDTH = 44;
export const GUTTER_WIDTH_MOBILE = 36;

/** A positioned activity block for rendering */
export type TimelineBlock = {
  log: UnifiedLog;
  /** YYYY-MM-DD for grouping by day */
  dateKey: string;
  /** Minutes from midnight (0-1439) */
  startMinutes: number;
  /** Duration in minutes */
  durationMinutes: number;
  /** Calculated top position in pixels */
  top: number;
  /** Calculated height in pixels (min 8px) */
  height: number;
};

/** A day with its activity blocks */
export type TimelineDay = {
  date: Date;
  /** YYYY-MM-DD */
  dateKey: string;
  blocks: TimelineBlock[];
};

/** Chart display mode */
export type TimelineMode = 'today' | 'week';
