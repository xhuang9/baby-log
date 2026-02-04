'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { formatTimeSwiperDate } from '@/lib/format-log';

type UseTimeSwiperStateProps = {
  value: Date;
  onChange: (date: Date) => void;
  dayOffset: number;
  setDayOffset: (offset: number) => void;
  fixedBaseDate: Date;
};

export function useTimeSwiperState({ value, onChange, dayOffset, setDayOffset, fixedBaseDate }: UseTimeSwiperStateProps) {
  const [currentTime, setCurrentTime] = useState(new Date());

  // Update current time every 2 minutes
  useEffect(() => {
    const interval = setInterval(() => setCurrentTime(new Date()), 120000);
    return () => clearInterval(interval);
  }, []);

  const isToday = dayOffset === 0;

  // Calculate display date: fixedBaseDate + dayOffset + time
  const displayDate = useMemo(() => {
    const result = new Date(fixedBaseDate);
    result.setDate(result.getDate() + dayOffset);
    result.setHours(value.getHours(), value.getMinutes(), 0, 0);
    return result;
  }, [fixedBaseDate, dayOffset, value]);

  // Date picker range (1 year back to tomorrow)
  const minSelectableDate = useMemo(() => {
    const d = new Date(currentTime);
    d.setFullYear(d.getFullYear() - 1);
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
    const m = new Date(selectedDate);
    m.setHours(0, 0, 0, 0);
    const d = Math.round((m.getTime() - fixedBaseDate.getTime()) / 86_400_000);
    setDayOffset(d);
    const v = new Date(selectedDate);
    v.setHours(value.getHours(), value.getMinutes(), 0, 0);
    onChange(v);
  }, [value, onChange, setDayOffset, fixedBaseDate]);

  const handleResetToNow = useCallback(() => {
    const now = new Date();
    setCurrentTime(now);
    setDayOffset(0);
    onChange(now);
  }, [onChange, setDayOffset]);

  return {
    currentTime,
    isToday,
    displayDate,
    minSelectableDate,
    maxSelectableDate,
    showDateRow,
    handleDateSelect,
    handleResetToNow,
  };
}
