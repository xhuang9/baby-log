'use client';

import type { SolidsReaction } from '@/lib/local-db';
import { useState } from 'react';

export function useSolidsFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [foodInput, setFoodInput] = useState('');
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>([]);
  const [reaction, setReaction] = useState<SolidsReaction>('liked'); // Default to 'liked'
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setStartTime(new Date());
    setFoodInput('');
    setSelectedFoodIds([]);
    setReaction('liked'); // Reset to default
    setNotes('');
    setNotesVisible(false); // Hide notes on reset
  };

  return {
    state: { startTime, foodInput, selectedFoodIds, reaction, notes, notesVisible, handMode },
    actions: { setStartTime, setFoodInput, setSelectedFoodIds, setReaction, setNotes, setNotesVisible, setHandMode, resetForm },
  };
}
