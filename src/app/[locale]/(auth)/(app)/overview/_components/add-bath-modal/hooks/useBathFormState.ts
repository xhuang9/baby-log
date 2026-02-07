'use client';

import { useState } from 'react';

export function useBathFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: { startTime, notes, notesVisible, handMode },
    actions: { setStartTime, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
