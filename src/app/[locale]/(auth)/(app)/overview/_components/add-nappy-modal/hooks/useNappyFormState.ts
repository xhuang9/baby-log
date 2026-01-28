'use client';

import type { NappyType } from '@/lib/local-db';
import { useState } from 'react';

export function useNappyFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [nappyType, setNappyType] = useState<NappyType>('wee'); // Default to 'wee'
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setNappyType('wee'); // Reset to default
    setNotes('');
    setNotesVisible(false); // Hide notes on reset
  };

  return {
    state: { startTime, nappyType, notes, notesVisible, handMode },
    actions: { setStartTime, setNappyType, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
