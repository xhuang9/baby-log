import { HOUR_WIDTH } from '../types';

type MarkerMode = 'now-only' | 'all' | undefined;

type TimeIndicatorsProps = {
  nowOffset: number;
  centerX: number;
  offset: number;
  showCurrentTime: boolean;
  markerMode: MarkerMode;
};

/**
 * Renders the NOW and +/- hour markers on the timeline.
 * Uses screen-relative positioning based on centerX and current offset.
 */
export function TimeIndicators({
  nowOffset,
  centerX,
  offset,
  showCurrentTime,
  markerMode,
}: TimeIndicatorsProps) {
  if (!showCurrentTime) {
    return null;
  }

  // Calculate screen position for "now" marker
  const nowScreenX = centerX + (nowOffset - offset);

  return (
    <>
      {/* Conditionally render -2hr and -1hr markers */}
      {(markerMode === 'all' || !markerMode) && (
        <>
          {/* -2hr marker */}
          <div
            className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
            style={{ left: nowScreenX - (HOUR_WIDTH * 2), transform: 'translateX(-50%)' }}
          >
            <div className="absolute text-[10px] font-bold tracking-wider text-muted-foreground" style={{ bottom: 44 }}>
              -2hr
            </div>
            <div className="absolute h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ bottom: 38 }} />
            <div className="h-9 w-px bg-muted-foreground" />
          </div>

          {/* -1hr marker */}
          <div
            className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
            style={{ left: nowScreenX - HOUR_WIDTH, transform: 'translateX(-50%)' }}
          >
            <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
              -1hr
            </div>
            <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
            <div className="h-9 w-px bg-primary" />
          </div>
        </>
      )}

      {/* NOW marker - always show when showCurrentTime is true */}
      <div
        className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-60"
        style={{ left: nowScreenX, transform: 'translateX(-50%)' }}
      >
        <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
          now
        </div>
        <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
        <div className="h-9 w-px bg-primary" />
      </div>

      {/* Conditionally render +1hr and +2hr markers */}
      {(markerMode === 'all' || !markerMode) && (
        <>
          {/* +1hr marker */}
          <div
            className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
            style={{ left: nowScreenX + HOUR_WIDTH, transform: 'translateX(-50%)' }}
          >
            <div className="absolute text-[10px] font-bold tracking-wider text-primary" style={{ bottom: 44 }}>
              +1hr
            </div>
            <div className="absolute h-1.5 w-1.5 rounded-full bg-primary" style={{ bottom: 38 }} />
            <div className="h-9 w-px bg-primary" />
          </div>

          {/* +2hr marker */}
          <div
            className="pointer-events-none absolute bottom-0 flex flex-col items-center opacity-30"
            style={{ left: nowScreenX + (HOUR_WIDTH * 2), transform: 'translateX(-50%)' }}
          >
            <div className="absolute text-[10px] font-bold tracking-wider text-muted-foreground" style={{ bottom: 44 }}>
              +2hr
            </div>
            <div className="absolute h-1.5 w-1.5 rounded-full bg-muted-foreground" style={{ bottom: 38 }} />
            <div className="h-9 w-px bg-muted-foreground" />
          </div>
        </>
      )}
    </>
  );
}
