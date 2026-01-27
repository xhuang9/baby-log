import type { TimelineTick } from '../types';
import { cn } from '@/lib/utils';

import { TimeIndicators } from './TimeIndicators';

type MarkerMode = 'now-only' | 'all' | undefined;

type TimelineTrackProps = {
  ticks: TimelineTick[];
  centerX: number;
  offset: number;
  nowOffset: number;
  showCurrentTime: boolean;
  markerMode: MarkerMode;
};

/**
 * Renders the timeline track with tick marks and hour labels.
 * Uses screen-relative positioning - ticks are positioned relative to viewport center.
 */
export function TimelineTrack({
  ticks,
  centerX,
  offset,
  nowOffset,
  showCurrentTime,
  markerMode,
}: TimelineTrackProps) {
  return (
    <div
      className="absolute inset-x-0 bottom-0"
      style={{ height: 55 }}
    >
      {ticks.map((tick) => {
        // Screen-relative positioning: tick position relative to viewport center
        const screenX = centerX + (tick.position - offset);
        return (
          <div
            key={tick.position}
            className="absolute bottom-0 flex flex-col items-center"
            style={{ left: screenX, transform: 'translateX(-50%)' }}
          >
            {/* Tick mark - aligned to bottom */}
            <div
              className={cn(
                'w-px',
                tick.isHour
                  ? 'h-4 bg-muted-foreground/60'
                  : 'h-2.5 bg-muted-foreground/40',
              )}
            />
            {/* Hour label - above tick */}
            {tick.label && (
              <span
                className="absolute text-xs font-medium text-muted-foreground/80"
                style={{ bottom: 18 }}
              >
                {tick.label}
              </span>
            )}
          </div>
        );
      })}

      {/* Time indicators (now, +/-1hr, +/-2hr) */}
      <TimeIndicators
        nowOffset={nowOffset}
        centerX={centerX}
        offset={offset}
        showCurrentTime={showCurrentTime}
        markerMode={markerMode}
      />
    </div>
  );
}
