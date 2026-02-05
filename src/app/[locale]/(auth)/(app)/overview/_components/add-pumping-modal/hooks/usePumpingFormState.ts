'use client';

import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import { useState } from 'react';
import { DEFAULT_PUMPING_AMOUNT_SETTINGS } from '@/components/settings/PumpingAmountSettingsPanel';

export type PumpingAmountMode = 'leftRight' | 'total';

export function usePumpingFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => new Date());
  const [mode, setMode] = useState<PumpingAmountMode>('leftRight');
  const [leftMl, setLeftMl] = useState(30);
  const [rightMl, setRightMl] = useState(30);
  const [totalMl, setTotalMl] = useState(30);
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [pumpingSettings, setPumpingSettings] = useState<PumpingAmountSettingsState>(DEFAULT_PUMPING_AMOUNT_SETTINGS);

  const resetForm = () => {
    setStartTime(new Date());
    setEndTime(new Date());
    setMode('leftRight');
    setLeftMl(pumpingSettings.defaultAmountMl);
    setRightMl(pumpingSettings.defaultAmountMl);
    setTotalMl(pumpingSettings.defaultAmountMl);
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: {
      startTime,
      endTime,
      mode,
      leftMl,
      rightMl,
      totalMl,
      notes,
      notesVisible,
      handMode,
      pumpingSettings,
    },
    actions: {
      setStartTime,
      setEndTime,
      setMode,
      setLeftMl,
      setRightMl,
      setTotalMl,
      setNotes,
      setNotesVisible,
      setHandMode,
      setPumpingSettings,
      resetForm,
    },
  };
}
