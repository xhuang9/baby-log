'use client';

import type { ReactNode } from 'react';
import { PlusIcon, TimerIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { cn } from '@/lib/utils';

const activityClasses = {
  'feed': 'activity-tile--feed',
  'sleep': 'activity-tile--sleep',
  'nappy': 'activity-tile--nappy',
  'solids': 'activity-tile--solids',
  'bath': 'activity-tile--bath',
  'tummy-time': 'activity-tile--tummy-time',
  'story-time': 'activity-tile--story-time',
  'screen-time': 'activity-tile--screen-time',
  'skin-to-skin': 'activity-tile--skin-to-skin',
  'outdoor-play': 'activity-tile--outdoor-play',
  'indoor-play': 'activity-tile--indoor-play',
  'brush-teeth': 'activity-tile--brush-teeth',
} as const;

export type ActivityType = keyof typeof activityClasses;

/** Format elapsed seconds as HH:MM:SS (hide HH when < 1 hour) */
function formatTimerDisplay(seconds: number): string {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  if (hrs > 0) {
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  }
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
}

export type ActivityTileProps = {
  title: string;
  /** Main status/description text */
  statusText: string;
  /** Time ago text (e.g., "1d 4h ago") */
  timeAgo?: string;
  /** Caregiver name - will be truncated with ellipsis if too long */
  caregiver?: string | null;
  activity: ActivityType;
  disabled?: boolean;
  onClick?: () => void;
  /** Override the default action pill content (defaults to + icon) */
  actionContent?: ReactNode;
  /** Base elapsed seconds from timer (accumulated when paused) */
  timerElapsedBase?: number;
  /** ISO timestamp of when timer started (null if not running) */
  timerStartTime?: string | null;
  className?: string;
};

export function ActivityTile({
  title,
  statusText,
  timeAgo,
  caregiver,
  activity,
  disabled,
  onClick,
  actionContent,
  timerElapsedBase = 0,
  timerStartTime,
  className,
}: ActivityTileProps) {
  const isTimerRunning = Boolean(timerStartTime);
  const hasTimer = timerElapsedBase > 0 || isTimerRunning;

  // Live timer display that updates every second when running
  const [displaySeconds, setDisplaySeconds] = useState(0);

  useEffect(() => {
    const calculateElapsed = () => {
      let total = timerElapsedBase;
      if (timerStartTime) {
        const sessionElapsed = Math.floor(
          (Date.now() - new Date(timerStartTime).getTime()) / 1000,
        );
        total += sessionElapsed;
      }
      return total;
    };

    // eslint-disable-next-line react-hooks/set-state-in-effect -- Sync with external timer state
    setDisplaySeconds(calculateElapsed());

    if (isTimerRunning) {
      const interval = setInterval(() => {
        setDisplaySeconds(calculateElapsed());
      }, 1000);
      return () => clearInterval(interval);
    }
    return undefined;
  }, [timerElapsedBase, timerStartTime, isTimerRunning]);

  // Default action content is a plus icon
  const defaultActionContent = (
    <PlusIcon className="h-[22px] w-auto" strokeWidth={2} />
  );

  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={cn(
        'activity-tile activity-tile-card',
        activityClasses[activity],
        className,
      )}
    >
      {/* Left content - title and subtitle */}
      <div className="min-w-0 flex-1">
        <h3 className="activity-tile-title">{title}</h3>
        <div className="activity-tile-label">
          <span>{statusText}</span>
          {timeAgo && (
            <>
              <span className="activity-tile-separator">•</span>
              <span>{timeAgo}</span>
            </>
          )}
          {caregiver && (
            <>
              <span className="activity-tile-separator">•</span>
              <span className="activity-tile-caregiver">{caregiver}</span>
            </>
          )}
        </div>
      </div>

      {/* Right action pill - either timer or custom action or + icon */}
      <div className="activity-tile-action shrink-0 self-start">
        {hasTimer
          ? (
              <>
                <TimerIcon className="h-4 w-auto" strokeWidth={2} />
                <span className="text-sm leading-none font-medium">
                  {formatTimerDisplay(displaySeconds)}
                </span>
                {isTimerRunning && (
                  <span className="activity-tile-pulse" />
                )}
              </>
            )
          : (actionContent ?? defaultActionContent)}
      </div>
    </button>
  );
}
