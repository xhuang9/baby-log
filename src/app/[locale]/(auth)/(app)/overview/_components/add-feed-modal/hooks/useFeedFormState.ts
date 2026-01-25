import type { InputMode } from '../types';
import type { FeedMethod } from '@/lib/local-db';
import { useState } from 'react';
import { getDefaultEndTime } from '../utils';

export function useFeedFormState() {
  const [method, setMethod] = useState<FeedMethod>('bottle');
  const [inputMode, setInputMode] = useState<InputMode>('manual'); // Bottle default is manual
  const [startTime, setStartTime] = useState(() => new Date());
  const [amountMl, setAmountMl] = useState(120);
  const [endTime, setEndTime] = useState(() => getDefaultEndTime());
  const [endSide, setEndSide] = useState<'left' | 'right'>('left');
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  const resetForm = () => {
    setMethod('bottle');
    setInputMode('manual'); // Bottle default is manual
    setStartTime(new Date());
    setAmountMl(120);
    setEndTime(getDefaultEndTime());
    setEndSide('left');
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
    },
    actions: {
      setMethod,
      setInputMode,
      setStartTime,
      setAmountMl,
      setEndTime,
      setEndSide,
      setHandMode,
      resetForm,
    },
  };
}
