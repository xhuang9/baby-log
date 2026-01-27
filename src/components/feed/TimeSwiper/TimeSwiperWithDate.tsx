'use client';

import { RotateCcw } from 'lucide-react';
import { useCallback, useMemo, useState } from 'react';

import { cn } from '@/lib/utils';

import { DatePickerTrigger } from '../DatePickerTrigger';
import { TimeSwiper } from './TimeSwiper';
import { getDayOffset } from './types';

type TimeSwiperWithDateProps = {
  /** Current selected date/time value */
  value: Date;
  /** Called when the full date/time changes */
  onChange: (date: Date) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

/**
 * TimeSwiper with integrated DatePicker using the decoupled two-state model.
 *
 * State model:
 * - baseDate: The reference date (set by DatePicker)
 * - swiperValue: The time value being manipulated by swiper
 * - displayDate: Calculated from baseDate + swiper day offset (what user sees)
 *
 * When DatePicker saves: displayDate becomes new baseDate, swiper resets
 * When user swipes: displayDate updates, baseDate stays same
 */
export function TimeSwiperWithDate({
  value,
  onChange,
  handMode = 'right',
  className,
}: TimeSwiperWithDateProps) {
  // Current time reference for "now" calculations
  const [currentTime] = useState(() => new Date());

  // baseDate: The reference date for the DatePicker
  // Initially set to the current value's date (time stripped)
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Track swiper's day offset from baseDate
  const [swiperDayOffset, setSwiperDayOffset] = useState(0);

  // Calculate if baseDate is today
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = new Date(baseDate);
    base.setHours(0, 0, 0, 0);
    return today.getTime() === base.getTime();
  }, [baseDate]);

  // Calculate displayDate: baseDate + swiperDayOffset
  const displayDate = useMemo(() => {
    const result = new Date(baseDate);
    result.setDate(result.getDate() + swiperDayOffset);
    return result;
  }, [baseDate, swiperDayOffset]);

  // Check if we're showing a different day than today
  const dayOffset = useMemo(() => {
    return getDayOffset(displayDate, currentTime);
  }, [displayDate, currentTime]);

  // Date picker range (1 year back to tomorrow)
  const minSelectableDate = useMemo(() => {
    const d = new Date(currentTime);
    d.setMonth(0);
    d.setDate(1);
    d.setFullYear(d.getFullYear() - 1);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [currentTime]);

  const maxSelectableDate = useMemo(() => {
    const d = new Date(currentTime);
    d.setDate(d.getDate() + 1);
    d.setHours(23, 59, 59, 999);
    return d;
  }, [currentTime]);

  // Handle TimeSwiper value change
  const handleSwiperChange = useCallback((newValue: Date) => {
    onChange(newValue);
  }, [onChange]);

  // Handle day offset changes from TimeSwiper
  const handleDayOffsetChange = useCallback((offset: number) => {
    setSwiperDayOffset(offset);
  }, []);

  // Handle DatePicker selection
  // When user selects a date, set it as new baseDate and reset swiper
  const handleDateSelect = useCallback((selectedDate: Date) => {
    // Use the displayed date's time combined with selected date
    const newBaseDate = new Date(selectedDate);
    newBaseDate.setHours(0, 0, 0, 0);
    setBaseDate(newBaseDate);

    // Create new value with selected date but keep current time
    const newValue = new Date(selectedDate);
    newValue.setHours(value.getHours(), value.getMinutes(), 0, 0);

    // Reset swiper offset
    setSwiperDayOffset(0);

    // Notify parent
    onChange(newValue);
  }, [value, onChange]);

  // Reset to now
  const handleResetToNow = useCallback(() => {
    const now = new Date();
    const todayBase = new Date(now);
    todayBase.setHours(0, 0, 0, 0);

    setBaseDate(todayBase);
    setSwiperDayOffset(0);
    onChange(now);
  }, [onChange]);

  return (
    <div className={cn('relative', className)}>
      {/* Date indicator and reset button - shown when not today */}
      {dayOffset !== 0 && (
        <div className="mb-2 flex items-center justify-between">
          <DatePickerTrigger
            selectedDate={displayDate}
            currentTime={currentTime}
            onDateSelect={handleDateSelect}
            minDate={minSelectableDate}
            maxDate={maxSelectableDate}
          />
          <button
            type="button"
            onClick={handleResetToNow}
            className="flex items-center gap-1 text-xs text-primary underline hover:no-underline"
          >
            <RotateCcw className="h-3 w-3" />
            Now
          </button>
        </div>
      )}

      <TimeSwiper
        value={value}
        onChange={handleSwiperChange}
        isToday={isToday}
        onDayOffsetChange={handleDayOffsetChange}
        handMode={handMode}
      />
    </div>
  );
}
