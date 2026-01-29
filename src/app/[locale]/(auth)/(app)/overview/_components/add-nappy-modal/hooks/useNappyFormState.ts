'use client';

import type { NappyColour, NappyTexture, NappyType } from '@/lib/local-db';
import { useState } from 'react';

export function useNappyFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [nappyType, setNappyType] = useState<NappyType>('wee'); // Default to 'wee'
  const [colour, setColour] = useState<NappyColour | null>(null);
  const [texture, setTexture] = useState<NappyTexture | null>(null);
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setNappyType('wee'); // Reset to default
    setColour(null);
    setTexture(null);
    setNotes('');
    setNotesVisible(false); // Hide notes on reset
  };

  return {
    state: { startTime, nappyType, colour, texture, notes, notesVisible, handMode },
    actions: { setStartTime, setNappyType, setColour, setTexture, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
