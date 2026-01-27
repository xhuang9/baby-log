'use client';

import { useCurrentTime } from './hooks/useCurrentTime';
import { HOUR_OFFSET } from './types';

export type CurrentTimeIndicatorProps = {
  /** Height per hour in pixels */
  hourHeight: number;
  /** Whether to show the indicator */
  visible?: boolean;
};

/**
 * Calculate top position for current time (offset by 6am)
 */
function getCurrentTimePosition(hourHeight: number): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  // Adjust for 6am offset
  const adjustedHours = hours - HOUR_OFFSET;
  // Wrap negative values (times before 6am) to end of day
  const wrappedHours = adjustedHours < 0 ? adjustedHours + 24 : adjustedHours;
  return wrappedHours * hourHeight;
}

/**
 * Horizontal line indicating the current time position
 * Uses primary color with a circle marker on the left
 */
export function CurrentTimeIndicator({ hourHeight, visible = true }: CurrentTimeIndicatorProps) {
  // Subscribe to time updates
  useCurrentTime();

  if (!visible) {
    return null;
  }

  const position = getCurrentTimePosition(hourHeight);

  return (
    <div
      className="pointer-events-none absolute right-0 left-0 z-20"
      style={{ top: position }}
    >
      {/* Circle marker */}
      <div
        className="absolute -top-[4px] left-0 h-2 w-2 rounded-full bg-primary md:-top-[5px] md:h-[10px] md:w-[10px]"
      />
      {/* Horizontal line */}
      <div className="h-[2px] bg-primary" />
    </div>
  );
}
