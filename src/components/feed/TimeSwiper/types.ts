import type { TimeSwiperSettingsState } from '@/components/settings';

// Timeline constants
export const HOUR_WIDTH = 100; // pixels per hour
export const HOURS_PER_DAY = 24;
export const DAY_WIDTH = HOUR_WIDTH * HOURS_PER_DAY; // 2400px per day

// Physics constants
export const MAX_ANIMATION_DURATION = 3000; // 3 seconds max

// Boundary constants (in days)
export const PAST_DAYS_LIMIT = 7;
export const FUTURE_DAYS_LIMIT_TODAY = 1; // When base date is today
export const FUTURE_DAYS_LIMIT_PAST = 7; // When base date is in past

/**
 * Convert hours offset to pixel offset.
 * Center (0) = current selected time position.
 */
export function hoursToPixels(hours: number): number {
  return hours * HOUR_WIDTH;
}

/**
 * Convert pixel offset to hours offset.
 */
export function pixelsToHours(pixels: number): number {
  return pixels / HOUR_WIDTH;
}

/**
 * Get the time component from a date (hours + fractional minutes).
 */
export function getTimeInHours(date: Date): number {
  return date.getHours() + date.getMinutes() / 60;
}

/**
 * Create a new date with the same date but different time.
 */
export function setTimeFromHours(baseDate: Date, hours: number): Date {
  const result = new Date(baseDate);
  const wholeHours = Math.floor(hours);
  const minutes = Math.round((hours - wholeHours) * 60);
  result.setHours(wholeHours, minutes, 0, 0);
  return result;
}

/**
 * Calculate day offset between two dates (ignoring time).
 */
export function getDayOffset(date: Date, referenceDate: Date): number {
  const d1 = new Date(date);
  d1.setHours(0, 0, 0, 0);
  const d2 = new Date(referenceDate);
  d2.setHours(0, 0, 0, 0);
  return Math.round((d1.getTime() - d2.getTime()) / (1000 * 60 * 60 * 24));
}

export type TimeSwiperProps = {
  /** Current selected date/time value */
  value: Date;
  /** Called when time changes */
  onChange: (date: Date) => void;
  /** Reference date for "now" marker positioning */
  referenceNow?: Date;
  /** Whether the base date is today (affects future range) */
  isToday?: boolean;
  /** Called when day offset changes (for parent to update date indicator) */
  onDayOffsetChange?: (dayOffset: number) => void;
  /** Called when user reaches boundary */
  onBoundaryReached?: (direction: 'past' | 'future') => void;
  handMode?: 'left' | 'right';
  className?: string;
};

export type TimelineTick = {
  position: number; // pixel position relative to center (0)
  isHour: boolean;
  label: string;
  hourValue: number; // 0-23
  dayOffset: number; // 0 = today, -1 = yesterday, etc.
};

export type SettingsHookResult = {
  settings: TimeSwiperSettingsState;
  savedSettings: TimeSwiperSettingsState;
  settingsOpen: boolean;
  setSettingsOpen: (open: boolean) => void;
  isSaving: boolean;
  isDirty: boolean;
  updateSetting: <K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => void;
  saveSetting: <K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => void;
  handleSave: () => Promise<void>;
  handleCancel: () => void;
};

export type AnimationHookResult = {
  animationRef: React.MutableRefObject<number | null>;
  stopAnimation: () => void;
  startAnimation: () => void;
};

export type PositionHookResult = {
  offset: number;
  setOffset: React.Dispatch<React.SetStateAction<number>>;
  offsetRef: React.MutableRefObject<number>;
  isDragging: boolean;
  handlePointerDown: (e: React.PointerEvent) => void;
  handlePointerMove: (e: React.PointerEvent) => void;
  handlePointerUp: (e: React.PointerEvent) => void;
};
