'use client';

import { useCallback, useState } from 'react';

type UseDurationInputOptions = {
  durationMinutes: number;
  onDurationChange: (minutes: number) => void;
  minMinutes?: number;
  maxMinutes?: number;
};

export function useDurationInput({
  durationMinutes,
  onDurationChange,
  minMinutes = 1,
  maxMinutes = 24 * 60, // 24 hours max
}: UseDurationInputOptions) {
  const [isEditing, setIsEditing] = useState(false);
  const [hoursInput, setHoursInput] = useState('');
  const [minutesInput, setMinutesInput] = useState('');

  const startEditing = useCallback(() => {
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    setHoursInput(hours > 0 ? hours.toString() : '');
    setMinutesInput(minutes.toString());
    setIsEditing(true);
  }, [durationMinutes]);

  const parseAndApply = useCallback(() => {
    const hours = hoursInput ? Number.parseInt(hoursInput, 10) : 0;
    const minutes = minutesInput ? Number.parseInt(minutesInput, 10) : 0;

    if (Number.isNaN(hours) || Number.isNaN(minutes)) {
      setIsEditing(false);
      return;
    }

    const totalMinutes = hours * 60 + minutes;
    const clampedMinutes = Math.max(minMinutes, Math.min(maxMinutes, totalMinutes));

    onDurationChange(clampedMinutes);
    setIsEditing(false);
  }, [hoursInput, minutesInput, onDurationChange, minMinutes, maxMinutes]);

  const cancelEditing = useCallback(() => {
    setIsEditing(false);
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      parseAndApply();
    } else if (e.key === 'Escape') {
      cancelEditing();
    }
  }, [parseAndApply, cancelEditing]);

  return {
    isEditing,
    hoursInput,
    minutesInput,
    setHoursInput,
    setMinutesInput,
    startEditing,
    parseAndApply,
    cancelEditing,
    handleKeyDown,
  };
}
