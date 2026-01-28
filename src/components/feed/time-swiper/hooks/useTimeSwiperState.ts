'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTimeSwiperDate } from '@/lib/format-log';

type UseTimeSwiperStateProps = {
  value: Date;
  onChange: (date: Date) => void;
  dayOffset: number;
  setDayOffset: (offset: number) => void;
};

export function useTimeSwiperState({ value, onChange, dayOffset, setDayOffset }: UseTimeSwiperStateProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [baseDate, setBaseDate] = useState(() => {
    const d = new Date(value);
    d.setHours(0, 0, 0, 0);
    return d;
  });

  // Update current time every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 120000);
    return () => clearInterval(interval);
  }, []);

  // Calculate if base date is today
  const isToday = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const base = new Date(baseDate);
    base.setHours(0, 0, 0, 0);
    return today.getTime() === base.getTime();
  }, [baseDate]);

  // Calculate display date: baseDate + dayOffset
  const displayDate = useMemo(() => {
    const result = new Date(baseDate);
    result.setDate(result.getDate() + dayOffset);
    result.setHours(value.getHours(), value.getMinutes(), 0, 0);
    return result;
  }, [baseDate, dayOffset, value]);

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

  // Check if we should show the date row (only when NOT today)
  const dateLabel = useMemo(() => formatTimeSwiperDate(displayDate, currentTime), [displayDate, currentTime]);
  const showDateRow = dateLabel !== '';

  // Date picker handlers
  const handleDateSelect = useCallback((selectedDate: Date) => {
    const newBaseDate = new Date(selectedDate);
    newBaseDate.setHours(0, 0, 0, 0);
    setBaseDate(newBaseDate);

    const newValue = new Date(selectedDate);
    newValue.setHours(value.getHours(), value.getMinutes(), 0, 0);
    setDayOffset(0);
    onChange(newValue);
  }, [value, onChange, setDayOffset]);

  const handleResetToNow = useCallback(() => {
    const now = new Date();
    const todayBase = new Date(now);
    todayBase.setHours(0, 0, 0, 0);

    setBaseDate(todayBase);
    setDayOffset(0);
    onChange(now);
  }, [onChange, setDayOffset]);

  // Back to today - only changes date, keeps current time
  const handleBackToToday = useCallback(() => {
    const todayBase = new Date();
    todayBase.setHours(0, 0, 0, 0);

    setBaseDate(todayBase);
    setDayOffset(0);

    // Keep current selected time, just change the date to today
    const newValue = new Date(todayBase);
    newValue.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(newValue);
  }, [value, onChange, setDayOffset]);

  return {
    currentTime,
    isToday,
    displayDate,
    minSelectableDate,
    maxSelectableDate,
    showDateRow,
    handleDateSelect,
    handleResetToNow,
    handleBackToToday,
  };
}
