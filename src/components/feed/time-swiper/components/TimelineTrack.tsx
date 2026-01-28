'use client';

import type { TickMark } from '../types';
import { cn } from '@/lib/utils';
import { TOTAL_WIDTH } from '../constants';
import { CurrentTimeMarkers } from './CurrentTimeMarkers';

type TimelineTrackProps = {
  offset: number;
  centerX: number;
  ticks: TickMark[];
  showCurrentTimeMarkers: boolean;
  nowOffset: number;
  onPointerDown: (e: React.PointerEvent) => void;
  onPointerMove: (e: React.PointerEvent) => void;
  onPointerUp: (e: React.PointerEvent) => void;
};

export function TimelineTrack({
  offset,
  centerX,
  ticks,
  showCurrentTimeMarkers,
  nowOffset,
  onPointerDown,
  onPointerMove,
  onPointerUp,
}: TimelineTrackProps) {
  return (
    <div
      className="absolute inset-0 touch-none"
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      style={{ cursor: 'grab' }}
    >
      <div
        className="absolute bottom-0 flex"
        style={{
          height: 55,
          transform: `translateX(${centerX - offset - TOTAL_WIDTH}px)`,
        }}
      >
        {[0, 1, 2].map(copy => (
          <div key={copy} className="relative" style={{ width: TOTAL_WIDTH, height: 55 }}>
            {ticks.map((tick, i) => (
              <div
                key={i}
                className="absolute bottom-0 flex flex-col items-center"
                style={{ left: tick.position, transform: 'translateX(-50%)' }}
              >
                <div
                  className={cn(
                    'w-px',
                    tick.isHour ? 'h-4 bg-muted-foreground/60' : 'h-2.5 bg-muted-foreground/40',
                  )}
                />
                {tick.label && (
                  <span
                    className="absolute text-xs font-medium text-muted-foreground/80"
                    style={{ bottom: 18 }}
                  >
                    {tick.label}
                  </span>
                )}
              </div>
            ))}

            {showCurrentTimeMarkers && copy === 1 && <CurrentTimeMarkers nowOffset={nowOffset} />}
          </div>
        ))}
      </div>
    </div>
  );
}
