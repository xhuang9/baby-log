'use client';

import { cn } from '@/lib/utils';
import { HOUR_WIDTH } from '../constants';

type CurrentTimeMarkersProps = {
  nowOffset: number;
};

export function CurrentTimeMarkers({ nowOffset }: CurrentTimeMarkersProps) {
  return (
    <>
      {[-2, -1, 0, 1, 2].map((hourDelta) => {
        const markerOffset = nowOffset + hourDelta * HOUR_WIDTH;
        const isNow = hourDelta === 0;
        const isPrimary = Math.abs(hourDelta) <= 1;
        const label = isNow ? 'now' : `${hourDelta > 0 ? '+' : ''}${hourDelta}h`;

        return (
          <div
            key={hourDelta}
            className={cn(
              'pointer-events-none absolute bottom-0 flex flex-col items-center',
              isNow ? 'opacity-60' : 'opacity-30',
            )}
            style={{ left: markerOffset, transform: 'translateX(-50%)' }}
          >
            <div
              className={cn(
                'absolute text-[10px] font-bold tracking-wider',
                isPrimary ? 'text-primary' : 'text-muted-foreground',
              )}
              style={{ bottom: 44 }}
            >
              {label}
            </div>
            <div
              className={cn(
                'absolute h-1.5 w-1.5 rounded-full',
                isPrimary ? 'bg-primary' : 'bg-muted-foreground',
              )}
              style={{ bottom: 38 }}
            />
            <div className={cn('h-9 w-px', isPrimary ? 'bg-primary' : 'bg-muted-foreground')} />
          </div>
        );
      })}
    </>
  );
}
