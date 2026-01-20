'use client';

import { PauseIcon, PlayIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { useHoldAction } from '@/hooks/useHoldAction';
import { useTimerStore } from '@/stores/useTimerStore';

type TimerWidgetProps = {
  babyId: number;
  logType: 'feed' | 'sleep' | 'nappy';
  className?: string;
};

/**
 * Timer Widget Component
 *
 * Displays and manages a timer for tracking activities.
 * Timer state persists in IndexedDB and Zustand.
 */
export function TimerWidget({
  babyId,
  logType,
  className,
}: TimerWidgetProps) {
  const timerKey = `${logType}-${babyId}`;

  // Subscribe to all timers and extract the one we need
  // This ensures we get updates whenever the timers object changes
  const timers = useTimerStore(state => state.timers);
  const timerState = timers[timerKey];

  const {
    startTimer,
    pauseTimer,
    resetTimer,
    adjustTimer,
  } = useTimerStore();

  // Store elapsed time in state to avoid calling Date.now() during render
  const [elapsedSeconds, setElapsedSeconds] = useState(0);

  // Update elapsed time periodically while timer is running
  useEffect(() => {
    // Calculate elapsed time (this runs in effect, not during render)
    const calculateElapsed = (): number => {
      if (!timerState) {
        return 0;
      }

      if (!timerState.lastStartTime) {
        // Timer is paused, use accumulated elapsed time
        return timerState.elapsedSeconds;
      }

      // Timer is running, add current session time
      const lastStart = new Date(timerState.lastStartTime).getTime();
      const now = Date.now();
      const sessionElapsed = Math.floor((now - lastStart) / 1000);
      return timerState.elapsedSeconds + sessionElapsed;
    };

    // Update elapsed time
    setElapsedSeconds(calculateElapsed());

    // Set up interval only if timer is running
    if (!timerState?.lastStartTime) {
      return;
    }

    const interval = setInterval(() => {
      setElapsedSeconds(calculateElapsed());
    }, 100);
    return () => clearInterval(interval);
  }, [timerState]);

  const handleStartPause = async () => {
    if (timerState?.lastStartTime) {
      // Timer is running, pause it
      await pauseTimer(timerKey);
    } else {
      // Timer is paused or not started, start/resume it
      await startTimer(timerKey, babyId, logType);
    }
  };

  const handleReset = async () => {
    if (elapsedSeconds > 0) {
      // Simple confirmation for timer reset - window.confirm is appropriate here
      // eslint-disable-next-line no-alert
      const confirmed = window.confirm('Are you sure you want to reset the timer?');
      if (!confirmed) {
        return;
      }
    }
    await resetTimer(timerKey);
  };

  const handleAdjust = async (seconds: number) => {
    await adjustTimer(timerKey, seconds);
  };

  // Hold action handlers for +10s and -10s buttons
  const holdAdd10 = useHoldAction({
    onAction: () => handleAdjust(10),
    intervalMs: 100,
  });

  const holdSubtract10 = useHoldAction({
    onAction: () => handleAdjust(-10),
    intervalMs: 100,
  });

  const formatTimerDisplay = (seconds: number): { hours: string; minutes: string; seconds: string } => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return {
      hours: hrs.toString().padStart(2, '0'),
      minutes: mins.toString().padStart(2, '0'),
      seconds: secs.toString().padStart(2, '0'),
    };
  };

  const time = formatTimerDisplay(elapsedSeconds);

  return (
    <div className={className}>
      <div className="space-y-6">
        <div className="flex flex-1 flex-col items-center justify-center space-y-8 py-10">
          <div className="flex flex-col items-center space-y-6">
            {/* Timer Display - Above the button */}
            <div className="flex items-center space-x-4 text-center">
              <div className="flex flex-col items-center">
                <p className="text-5xl font-light tracking-wider text-foreground" style={{ width: '62.5px' }}>
                  {time.hours}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">hour</span>
              </div>
              <span className="text-4xl font-light text-foreground">:</span>
              <div className="flex flex-col items-center">
                <p className="text-5xl font-light tracking-wider text-foreground" style={{ width: '62.5px' }}>
                  {time.minutes}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">minute</span>
              </div>
              <span className="text-4xl font-light text-foreground">:</span>
              <div className="flex flex-col items-center">
                <p className="text-5xl font-light tracking-wider text-foreground" style={{ width: '62.5px' }}>
                  {time.seconds}
                </p>
                <span className="mt-1 text-xs text-muted-foreground">second</span>
              </div>
            </div>

            {/* Start/Pause Button */}
            <button
              type="button"
              onClick={handleStartPause}
              className="flex h-32 w-32 items-center justify-center rounded-full bg-primary transition-all hover:opacity-90 hover:shadow-lg active:scale-95"
            >
              {timerState?.lastStartTime
                ? (
                    <PauseIcon className="h-10 w-10 fill-primary-foreground text-primary-foreground" />
                  )
                : (
                    <PlayIcon className="h-10 w-10 fill-primary-foreground text-primary-foreground" />
                  )}
            </button>

            {/* Timer Controls */}
            <div className="flex flex-wrap items-center justify-center gap-3">
              <button
                type="button"
                onClick={handleReset}
                className="text-sm text-muted-foreground underline hover:text-foreground"
              >
                Reset
              </button>
              <button
                type="button"
                {...holdAdd10}
                className="rounded-md bg-muted px-3 py-1 text-sm text-foreground hover:bg-muted/80 active:bg-muted/60"
              >
                +10s
              </button>
              <button
                type="button"
                {...holdSubtract10}
                className="rounded-md bg-muted px-3 py-1 text-sm text-foreground hover:bg-muted/80 active:bg-muted/60"
              >
                -10s
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
