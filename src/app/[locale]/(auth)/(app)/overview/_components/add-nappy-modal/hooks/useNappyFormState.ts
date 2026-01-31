'use client';

import type { NappyColour, NappyConsistency, NappyType } from '@/lib/local-db';
import { useState } from 'react';

export function useNappyFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [nappyType, setNappyType] = useState<NappyType>('wee'); // Default to 'wee'
  const [colour, setColour] = useState<NappyColour | null>(null);
  const [consistency, setConsistency] = useState<NappyConsistency | null>(null);
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setNappyType('wee'); // Reset to default
    setColour(null);
    setConsistency(null);
    setNotes('');
    setNotesVisible(false); // Hide notes on reset
  };

  return {
    state: { startTime, nappyType, colour, consistency, notes, notesVisible, handMode },
    actions: { setStartTime, setNappyType, setColour, setConsistency, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
