'use client';

import { useState } from 'react';

export function useGrowthFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [weightG, setWeightG] = useState<number | null>(null);
  const [heightMm, setHeightMm] = useState<number | null>(null);
  const [headCircumferenceMm, setHeadCircumferenceMm] = useState<number | null>(null);
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setWeightG(null);
    setHeightMm(null);
    setHeadCircumferenceMm(null);
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: { startTime, weightG, heightMm, headCircumferenceMm, notes, notesVisible, handMode },
    actions: { setStartTime, setWeightG, setHeightMm, setHeadCircumferenceMm, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
