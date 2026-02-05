'use client';

import type { DualTimeSwiperProps } from './types';
import { useCallback } from 'react';
import { cn } from '@/lib/utils';
import { EditableDurationInput } from './components';
import { TimeSwiper } from './TimeSwiper';

export function DualTimeSwiper({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  handMode = 'right',
  className,
}: DualTimeSwiperProps) {
  // Calculate duration in minutes (always positive now due to push behavior)
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.max(0, Math.round(durationMs / (1000 * 60)));

  // Handle duration change - adjust START time, keep END fixed
  const handleDurationChange = useCallback((newMinutes: number) => {
    const newStartTime = new Date(endTime.getTime() - newMinutes * 60 * 1000);
    onStartTimeChange(newStartTime);
  }, [endTime, onStartTimeChange]);

  // When start time changes, push end time forward if needed
  const handleStartTimeChange = useCallback((newStartTime: Date) => {
    onStartTimeChange(newStartTime);

    // If start time would exceed end time, push end time forward (duration = 0)
    if (newStartTime.getTime() > endTime.getTime()) {
      onEndTimeChange(new Date(newStartTime));
    }
  }, [endTime, onStartTimeChange, onEndTimeChange]);

  // When end time changes, push start time backward if needed
  const handleEndTimeChange = useCallback((newEndTime: Date) => {
    onEndTimeChange(newEndTime);

    // If end time would go before start time, push start time backward (duration = 0)
    if (newEndTime.getTime() < startTime.getTime()) {
      onStartTimeChange(new Date(newEndTime));
    }
  }, [startTime, onStartTimeChange, onEndTimeChange]);

  return (
    <div className={cn('space-y-6', className)}>
      {/* Start Time Section */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">Start time</span>
        <TimeSwiper
          value={startTime}
          onChange={handleStartTimeChange}
          handMode={handMode}
        />
      </div>

      {/* End Time Section */}
      <div className="space-y-3">
        <span className="text-sm text-muted-foreground">End time</span>
        <TimeSwiper
          value={endTime}
          onChange={handleEndTimeChange}
          handMode={handMode}
        />
      </div>

      {/* Duration Section - pill button style with editable input */}
      <div className="flex items-center justify-center py-2">
        <div className="flex items-center gap-1 rounded-full border border-border bg-muted/30 px-5 py-2">
          <span className="text-sm text-muted-foreground">Duration:</span>
          <EditableDurationInput
            durationMinutes={durationMinutes}
            onDurationChange={handleDurationChange}
            className="text-base font-semibold"
          />
        </div>
      </div>
    </div>
  );
}
