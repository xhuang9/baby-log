'use client';

import type { DualTimeSwiperProps, TimeTab } from './types';
import { useCallback, useState } from 'react';
import { cn } from '@/lib/utils';
import { EditableDurationInput, TimeTabSelector } from './components';
import { TimeSwiper } from './TimeSwiper';

export function DualTimeSwiper({
  startTime,
  onStartTimeChange,
  endTime,
  onEndTimeChange,
  handMode = 'right',
  className,
}: DualTimeSwiperProps) {
  const [activeTab, setActiveTab] = useState<TimeTab>('start');

  // Calculate duration in minutes
  const durationMs = endTime.getTime() - startTime.getTime();
  const durationMinutes = Math.round(durationMs / (1000 * 60));
  const isInvalidDuration = durationMinutes < 0;

  // Handle duration change - adjust START time, keep END fixed
  const handleDurationChange = useCallback((newMinutes: number) => {
    const newStartTime = new Date(endTime.getTime() - newMinutes * 60 * 1000);
    onStartTimeChange(newStartTime);
  }, [endTime, onStartTimeChange]);

  // Swap start and end times
  const handleSwapTimes = useCallback(() => {
    const tempStart = new Date(startTime);
    onStartTimeChange(endTime);
    onEndTimeChange(tempStart);
  }, [startTime, endTime, onStartTimeChange, onEndTimeChange]);

  return (
    <div className={cn('space-y-3', className)}>
      <TimeTabSelector
        activeTab={activeTab}
        onTabChange={setActiveTab}
        handMode={handMode}
      />

      <div style={{ display: activeTab === 'start' ? undefined : 'none' }}>
        <TimeSwiper
          value={startTime}
          onChange={onStartTimeChange}
          handMode={handMode}
        />
      </div>
      <div style={{ display: activeTab === 'end' ? undefined : 'none' }}>
        <TimeSwiper
          value={endTime}
          onChange={onEndTimeChange}
          handMode={handMode}
        />
      </div>

      {/* Duration section - fixed height container to prevent layout shifts */}
      <div className="min-h-[100px]">
        {/* Duration row - always visible */}
        <div className="flex items-center justify-center gap-2">
          <span className="text-base font-medium text-muted-foreground">Duration</span>
          <EditableDurationInput
            durationMinutes={isInvalidDuration ? 0 : durationMinutes}
            onDurationChange={handleDurationChange}
            showDash={isInvalidDuration}
          />
        </div>

        {/* Error messages - only when invalid */}
        {isInvalidDuration && (
          <div className="mt-3 flex justify-center">
            <div className="flex flex-col items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center">
              <p className="text-sm font-medium text-destructive">
                End time can&apos;t be earlier than start time.
              </p>
              <p className="text-xs text-muted-foreground">
                If this crossed midnight, adjust the times so End is after Start.
              </p>
              <button
                type="button"
                onClick={handleSwapTimes}
                className="mt-1 rounded-md bg-background px-3 py-1.5 text-sm font-medium transition-colors hover:bg-muted"
              >
                Swap times
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
