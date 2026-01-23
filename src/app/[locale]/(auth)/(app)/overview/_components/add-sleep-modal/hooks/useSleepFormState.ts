import { useState } from 'react';
import type { InputMode } from '@/components/activity-modals';
import type { SleepFormState } from '../types';

type SleepFormActions = {
  setInputMode: (mode: InputMode) => void;
  setStartTime: (time: Date) => void;
  setEndTime: (time: Date) => void;
  setHandMode: (mode: 'left' | 'right') => void;
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

  const resetForm = () => {
    setInputMode('timer');
    setStartTime(new Date());
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60);
    setEndTime(end);
  };

  const state: SleepFormState = {
    inputMode,
    startTime,
    endTime,
    handMode,
  };

  const actions: SleepFormActions = {
    setInputMode,
    setStartTime,
    setEndTime,
    setHandMode,
    resetForm,
  };

  return { state, actions };
}
