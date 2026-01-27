'use client';

import type { TimelineTick, TimeSwiperProps } from './types';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import { TimeSwiperSettingsPanel } from '@/components/settings';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

import { CenterIndicator, TimeDisplay, TimelineTrack } from './components';
import {
  useTimelineAnimation,
  useTimelinePosition,
  useTimeSwiperSettings,
} from './hooks';
import {
  getTimeInHours,
  HOUR_WIDTH,
  hoursToPixels,
} from './types';

// Calculate height to match 3 stacked buttons (3 * 40px + 2 * 4px gap = 128px)
const SWIPER_HEIGHT = 128;

export function TimeSwiper({
  value,
  onChange,
  referenceNow,
  isToday = true,
  onDayOffsetChange,
  onBoundaryReached,
  handMode = 'right',
  className,
}: TimeSwiperProps) {
  const user = useUserStore(s => s.user);
  const userId = user?.localId;
  const isHydrated = useUserStore(s => s.isHydrated);

  const containerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [currentTime, setCurrentTime] = useState(() => referenceNow ?? new Date());

  // Settings
  const {
    settings,
    settingsOpen,
    setSettingsOpen,
    isSaving,
    isDirty,
    updateSetting,
    saveSetting,
    handleSave,
    handleCancel,
  } = useTimeSwiperSettings(userId, isHydrated);

  // Refs for stable callbacks in hooks
  const magneticFeelRef = useRef(settings.magneticFeel);
  useEffect(() => {
    magneticFeelRef.current = settings.magneticFeel;
  }, [settings.magneticFeel]);

  // Position hook (first call to get clampOffset, offsetToDate for animation)
  const positionResult = useTimelinePosition({
    value,
    swipeSpeed: settings.swipeSpeed,
    magneticFeel: settings.magneticFeel,
    isToday,
    onChange,
    onDayOffsetChange,
    onBoundaryReached,
    // eslint-disable-next-line ts/no-use-before-define -- Circular dependency intentional
    stopAnimation: () => animationResult.stopAnimation(),
    // eslint-disable-next-line ts/no-use-before-define -- Circular dependency intentional
    startAnimation: v => animationResult.startAnimation(v),
    animationRef: { current: null } as React.MutableRefObject<number | null>,
  });

  // Animation hook
  const animationResult = useTimelineAnimation({
    offsetRef: positionResult.offsetRef,
    velocityRef: positionResult.velocityRef,
    onChangeRef: positionResult.onChangeRef,
    magneticFeelRef,
    setOffset: positionResult.setOffset,
    clampOffset: positionResult.clampOffset,
    offsetToDate: positionResult.offsetToDate,
    reportDayOffsetIfChanged: positionResult.reportDayOffsetIfChanged,
    lastSentValueRef: positionResult.lastSentValueRef,
  });

  // Re-wire position with actual animation refs
  const {
    offset,
    handlePointerDown,
    handlePointerMove,
    handlePointerUp,
    minOffset,
    maxOffset,
  } = useTimelinePosition({
    value,
    swipeSpeed: settings.swipeSpeed,
    magneticFeel: settings.magneticFeel,
    isToday,
    onChange,
    onDayOffsetChange,
    onBoundaryReached,
    stopAnimation: animationResult.stopAnimation,
    startAnimation: animationResult.startAnimation,
    animationRef: animationResult.animationRef,
  });

  // Update reference time periodically (for "Now" marker)
  useEffect(() => {
    if (referenceNow) {
      // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect, react-hooks/set-state-in-effect
      setCurrentTime(referenceNow);
      return; // No cleanup needed when using external reference
    }
    const interval = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(interval);
  }, [referenceNow]);

  // Track container width
  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    // eslint-disable-next-line react-hooks-extra/no-direct-set-state-in-use-effect
    const updateWidth = () => setContainerWidth(container.clientWidth);
    updateWidth(); // Initial sync, then ResizeObserver handles updates

    const resizeObserver = new ResizeObserver(updateWidth);
    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Actions
  const adjustTime = useCallback((direction: 1 | -1) => {
    animationResult.stopAnimation();
    const newDate = new Date(value);
    newDate.setMinutes(newDate.getMinutes() + (settings.incrementMinutes * direction));
    onChange(newDate);
  }, [animationResult, onChange, value, settings.incrementMinutes]);

  // Format time display
  const formatTime = (date: Date): string => {
    const hours = date.getHours();
    const minutes = date.getMinutes();
    if (settings.use24Hour) {
      return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
    }
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    return `${displayHours}:${minutes.toString().padStart(2, '0')} ${ampm}`;
  };

  // Format hour label
  const formatHourLabel = useCallback((hour: number): string => {
    if (settings.use24Hour) {
      return hour.toString().padStart(2, '0');
    }
    const ampm = hour >= 12 ? 'pm' : 'am';
    return `${hour % 12 || 12}${ampm}`;
  }, [settings.use24Hour]);

  // Calculate displayed time from offset
  const displayedDate = useMemo(() => {
    const baseTimeHours = getTimeInHours(value);
    const hoursOffset = offset / HOUR_WIDTH;
    let newTimeHours = baseTimeHours + hoursOffset;

    const dayOffset = Math.floor(newTimeHours / 24);
    newTimeHours = newTimeHours - dayOffset * 24;
    if (newTimeHours < 0) {
      newTimeHours += 24;
    }

    const result = new Date(value);
    result.setDate(result.getDate() - dayOffset);
    result.setHours(Math.floor(newTimeHours), Math.round((newTimeHours % 1) * 60), 0, 0);
    return result;
  }, [value, offset]);

  // Viewport-based tick generation for bounded range
  const ticks = useMemo(() => {
    const buffer = 24 * HOUR_WIDTH; // 24 hours buffer
    const minVisible = offset - containerWidth / 2 - buffer;
    const maxVisible = offset + containerWidth / 2 + buffer;

    // Clamp to actual boundaries
    const effectiveMin = Math.max(minOffset - buffer, minVisible);
    const effectiveMax = Math.min(maxOffset + buffer, maxVisible);

    const tickList: TimelineTick[] = [];

    // Start from a round hour near the minimum visible
    const startHoursOffset = Math.floor(effectiveMin / HOUR_WIDTH);
    const endHoursOffset = Math.ceil(effectiveMax / HOUR_WIDTH);

    // Get the base time from value
    const baseTimeHours = getTimeInHours(value);

    for (let h = startHoursOffset; h <= endHoursOffset; h++) {
      const position = h * HOUR_WIDTH;

      // Calculate what hour and day this represents
      const totalHours = baseTimeHours + h;
      const dayOffset = Math.floor(totalHours / 24);
      let hourOfDay = totalHours - dayOffset * 24;
      if (hourOfDay < 0) {
        hourOfDay += 24;
      }
      const roundedHour = Math.floor(hourOfDay);

      // Hour tick (on the hour)
      if (Math.abs(hourOfDay - roundedHour) < 0.01) {
        tickList.push({
          position,
          isHour: true,
          label: formatHourLabel(roundedHour),
          hourValue: roundedHour,
          dayOffset: -dayOffset,
        });
      }

      // Half-hour tick
      const halfHourPosition = position + HOUR_WIDTH / 2;
      if (halfHourPosition <= effectiveMax) {
        tickList.push({
          position: halfHourPosition,
          isHour: false,
          label: '',
          hourValue: roundedHour,
          dayOffset: -dayOffset,
        });
      }
    }

    return tickList;
  }, [offset, containerWidth, formatHourLabel, value, minOffset, maxOffset]);

  const centerX = containerWidth / 2;
  const buttonsOnLeft = handMode === 'left';

  // Calculate "now" offset relative to current value position
  const nowOffset = useMemo(() => {
    const nowTimeHours = getTimeInHours(currentTime);
    const valueTimeHours = getTimeInHours(value);

    // Also need to account for day difference between now and value
    const nowDate = new Date(currentTime);
    nowDate.setHours(0, 0, 0, 0);
    const valueDate = new Date(value);
    valueDate.setHours(0, 0, 0, 0);
    const dayDiff = (nowDate.getTime() - valueDate.getTime()) / (1000 * 60 * 60 * 24);

    const hoursDiff = nowTimeHours - valueTimeHours + dayDiff * 24;
    return hoursToPixels(hoursDiff);
  }, [currentTime, value]);

  // Settings popover content
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
        saveSetting={saveSetting}
        compact
      />
    </SettingsPopoverWrapper>
  );

  return (
    <div className={cn('select-none', className)}>
      <div className="flex items-stretch gap-2">
        {buttonsOnLeft && (
          <ButtonStack
            onIncrement={() => adjustTime(1)}
            onDecrement={() => adjustTime(-1)}
            position="left"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}

        <div className="relative flex-1 overflow-visible pb-3">
          <div
            ref={containerRef}
            className="relative overflow-hidden rounded-2xl border border-border/30 bg-muted/20"
            style={{ height: SWIPER_HEIGHT }}
          >
            <TimeDisplay formattedTime={formatTime(displayedDate)} />

            <div
              className="absolute inset-0 touch-none"
              onPointerDown={handlePointerDown}
              onPointerMove={handlePointerMove}
              onPointerUp={handlePointerUp}
              onPointerCancel={handlePointerUp}
              style={{ cursor: 'grab' }}
            >
              <TimelineTrack
                ticks={ticks}
                centerX={centerX}
                offset={offset}
                nowOffset={nowOffset}
                showCurrentTime={settings.showCurrentTime}
                markerMode={settings.markerMode}
              />
            </div>
          </div>

          <CenterIndicator />
        </div>

        {!buttonsOnLeft && (
          <ButtonStack
            onIncrement={() => adjustTime(1)}
            onDecrement={() => adjustTime(-1)}
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
