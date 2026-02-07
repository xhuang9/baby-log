'use client';

import type { ActivityLogCategory } from '@/lib/local-db';
import { useState } from 'react';

export function useActivityLogFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState<Date | null>(null);
  const [showEndTime, setShowEndTime] = useState(false);
  const [activityType, setActivityType] = useState<ActivityLogCategory>('tummy_time');
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setEndTime(null);
    setShowEndTime(false);
    setActivityType('tummy_time');
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: { startTime, endTime, showEndTime, activityType, notes, notesVisible, handMode },
    actions: {
      setStartTime,
      setEndTime,
      setShowEndTime,
      setActivityType,
      setNotes,
      setNotesVisible,
      setHandMode,
      resetForm,
    },
  };
}
