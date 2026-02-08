import type { InputMode } from '../types';
import type { FeedMethod } from '@/lib/local-db';
import { useState } from 'react';
import { getDefaultEndTime } from '../utils';

type UseFeedFormStateOptions = {
  initialMethod?: FeedMethod;
};

export function useFeedFormState({ initialMethod = 'bottle' }: UseFeedFormStateOptions = {}) {
  const [method, setMethod] = useState<FeedMethod>(initialMethod);
  // Default input mode depends on initial method: timer for breast, manual for bottle
  const [inputMode, setInputMode] = useState<InputMode>(
    initialMethod === 'breast' ? 'timer' : 'manual',
  );
  const [startTime, setStartTime] = useState(() => new Date());
  const [amountMl, setAmountMl] = useState(120);
  const [endTime, setEndTime] = useState(() => getDefaultEndTime());
  const [endSide, setEndSide] = useState<'left' | 'right'>('left');
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);

  const resetForm = () => {
    setMethod(initialMethod);
    setInputMode(initialMethod === 'breast' ? 'timer' : 'manual');
    setStartTime(new Date());
    setAmountMl(120);
    setEndTime(getDefaultEndTime());
    setEndSide('left');
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: {
      method,
      inputMode,
      startTime,
      amountMl,
      endTime,
      endSide,
      handMode,
      notes,
      notesVisible,
    },
    actions: {
      setMethod,
      setInputMode,
      setStartTime,
      setAmountMl,
      setEndTime,
      setEndSide,
      setHandMode,
      setNotes,
      setNotesVisible,
      resetForm,
    },
  };
}
