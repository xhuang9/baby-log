import type { SleepFormState } from '../types';
import type { InputMode } from '@/components/activity-modals';
import { useState } from 'react';

type SleepFormActions = {
  setInputMode: (mode: InputMode) => void;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  setHandMode: (mode: 'left' | 'right') => void;
  setNotes: (notes: string) => void;
  setNotesVisible: (visible: boolean) => void;
  resetForm: () => void;
};

export function useSleepFormState() {
  const [inputMode, setInputMode] = useState<InputMode>('timer');
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60); // Default 1 hour sleep
    return end;
  });
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);

  const resetForm = () => {
    setInputMode('timer');
    setStartTime(new Date());
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60);
    setEndTime(end);
    setNotes('');
    setNotesVisible(false);
  };

  const state: SleepFormState = {
    inputMode,
    startTime,
    endTime,
    handMode,
    notes,
    notesVisible,
  };

  const actions: SleepFormActions = {
    setInputMode,
    setStartTime,
    setEndTime,
    setHandMode,
    setNotes,
    setNotesVisible,
    resetForm,
  };

  return { state, actions };
}
