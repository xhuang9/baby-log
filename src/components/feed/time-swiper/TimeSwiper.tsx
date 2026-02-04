'use client';

import type { TickMark, TimeSwiperProps } from './types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import { TimeSwiperSettingsPanel } from '@/components/settings';
import { cn } from '@/lib/utils';
import { DatePickerTrigger, EditableTimeDisplay, TimelineTrack } from './components';
import { HOUR_WIDTH, SWIPER_HEIGHT } from './constants';
import { usePressAndHold, useTimeSwiperAnimation, useTimeSwiperSettings, useTimeSwiperState } from './hooks';

export function TimeSwiper({ value, onChange, handMode = 'right', className }: TimeSwiperProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);

  // Settings
  const {
    settings,
    settingsOpen,
    setSettingsOpen,
    isSaving,
    isDirty,
    updateSetting,
    handleSave,
    handleCancel,
  } = useTimeSwiperSettings();

  // Animation and pointer handling
  const {
    offset,
    dayOffset,
    atBoundary,
    fixedBaseDate,
    dateToOffset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    adjustTimeByMinutes,
    setDayOffset,
    dayOffsetRef,
  } = useTimeSwiperAnimation({
    value,
    onChange,
    swipeResistance: settings.swipeResistance,
    swipeSpeed: settings.swipeSpeed,
  });

  // Date state management
  const {
    currentTime,
    displayDate,
    minSelectableDate,
    maxSelectableDate,
    showDateRow,
    handleDateSelect: baseHandleDateSelect,
    handleResetToNow,
  } = useTimeSwiperState({
    value,
    onChange,
    dayOffset,
    setDayOffset: (offset) => {
      dayOffsetRef.current = offset;
      setDayOffset(offset);
    },
    fixedBaseDate,
  });

  // Press-and-hold for +/- buttons
  const handleHoldAdjust = useCallback((minutes: number) => {
    adjustTimeByMinutes(minutes);
  }, [adjustTimeByMinutes]);

  const { startHold, stopHold, cleanup } = usePressAndHold({
    onAdjust: handleHoldAdjust,
  });

  // Cleanup press-and-hold on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);

  // Track container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const updateWidth = () => {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
      if (container.clientWidth > 0) setContainerWidth(container.clientWidth);
    };
    updateWidth();

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Generate tick marks (memoized to avoid recalculation on every render)
  const ticks = useMemo(() => {
    const formatHourLabel = (hour: number): string => {
      const h = hour % 24;
      if (settings.use24Hour) {
        return h.toString().padStart(2, '0');
      }
      const ampm = h >= 12 ? 'pm' : 'am';
      return `${h % 12 || 12}${ampm}`;
    };

    const result: TickMark[] = [];
    for (let hour = 0; hour < 24; hour++) {
      result.push({ position: hour * HOUR_WIDTH, isHour: true, label: formatHourLabel(hour) });
      result.push({ position: hour * HOUR_WIDTH + HOUR_WIDTH / 2, isHour: false, label: null });
    }
    return result;
  }, [settings.use24Hour]);

  const centerX = containerWidth / 2;
  const buttonsOnLeft = handMode === 'left';
  const nowOffset = dateToOffset(currentTime);

  const settingsPopoverContent = (
    <SettingsPopoverWrapper
      title="Time Picker Settings"
      onClose={() => setSettingsOpen(false)}
      onSave={handleSave}
      onCancel={handleCancel}
      isDirty={isDirty}
      isSaving={isSaving}
      handMode={handMode}
    >
      <TimeSwiperSettingsPanel
        settings={settings}
        updateSetting={updateSetting}
        saveSetting={updateSetting}
        compact
      />
    </SettingsPopoverWrapper>
  );

  return (
    <div className={cn('select-none', className)}>
      <div className="flex items-stretch gap-2">
        {buttonsOnLeft && (
          <ButtonStack
            onHoldAdjust={handleHoldAdjust}
            onHoldStart={startHold}
            onHoldStop={stopHold}
            position="left"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}

        <div className="relative flex-1 overflow-visible pb-3">
          <div
            ref={containerRef}
            className={cn(
              'relative overflow-hidden rounded-2xl border border-border/30 bg-muted/20 transition-all duration-300',
              atBoundary && 'animate-pulse border-destructive/50',
            )}
            style={{ height: SWIPER_HEIGHT }}
          >
            {/* Date row - only when not today */}
            {showDateRow && (
              <div
                className="absolute inset-x-0 top-2 z-20 flex items-center justify-between px-3"
                data-testid="date-row"
              >
                <DatePickerTrigger
                  selectedDate={displayDate}
                  currentTime={currentTime}
                  onDateSelect={baseHandleDateSelect}
                  minDate={minSelectableDate}
                  maxDate={maxSelectableDate}
                />
                <button
                  type="button"
                  onClick={handleResetToNow}
                  className="text-xs text-primary underline hover:no-underline"
                >
                  Back to now
                </button>
              </div>
            )}

            {/* Boundary indicator */}
            {atBoundary && (
              <div className="pointer-events-none absolute inset-x-0 top-2 z-10 text-center">
                <span className="text-[10px] font-medium text-destructive/70">
                  {atBoundary === 'past' ? 'Past limit reached' : 'Future limit reached'}
                </span>
              </div>
            )}

            {/* Editable Time Display */}
            <div
              className={cn(
                'absolute inset-x-0 z-10 flex flex-col items-center transition-all duration-200',
                showDateRow ? 'top-7' : 'top-4',
              )}
            >
              <EditableTimeDisplay
                value={value}
                onChange={onChange}
                use24Hour={settings.use24Hour}
                dimmed={displayDate > currentTime}
              />
              {displayDate > currentTime && (
                <div className="mt-1 text-xs font-medium text-primary">
                  In future
                </div>
              )}
            </div>

            {/* Timeline Track */}
            <TimelineTrack
              offset={offset}
              centerX={centerX}
              ticks={ticks}
              showCurrentTimeMarkers={settings.showCurrentTime && dayOffset === 0}
              nowOffset={nowOffset}
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
            />
          </div>

          {/* Center Indicator Triangle */}
          <div
            className="pointer-events-none absolute left-1/2 z-20 text-primary filter-[drop-shadow(0_2px_3px_rgba(0,0,0,0.3))_drop-shadow(0_1px_2px_rgba(0,0,0,0.2))] dark:filter-[drop-shadow(0_2px_3px_rgba(255,255,255,0.4))_drop-shadow(0_1px_2px_rgba(255,255,255,0.3))]"
            style={{ bottom: 8, transform: 'translateX(-50%)' }}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="currentColor">
              <path d="M7 0L14 14H0L7 0Z" />
            </svg>
          </div>
        </div>

        {!buttonsOnLeft && (
          <ButtonStack
            onHoldAdjust={handleHoldAdjust}
            onHoldStart={startHold}
            onHoldStop={stopHold}
            position="right"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}
      </div>
    </div>
  );
}
