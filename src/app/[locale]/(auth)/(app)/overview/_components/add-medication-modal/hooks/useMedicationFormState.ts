'use client';

import type { MedicationUnit } from '@/lib/local-db';
import { useState } from 'react';

export function useMedicationFormState() {
  const [startTime, setStartTime] = useState(() => new Date());
  const [medicationInput, setMedicationInput] = useState('');
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(1);
  const [unit, setUnit] = useState<MedicationUnit>('ml');
  const [notes, setNotes] = useState('');
  const [notesVisible, setNotesVisible] = useState(false);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [useMetric, setUseMetric] = useState(true);

  const resetForm = () => {
    setStartTime(new Date());
    setMedicationInput('');
    setSelectedMedicationId(null);
    setAmount(1);
    setUnit('ml');
    setNotes('');
    setNotesVisible(false);
  };

  return {
    state: {
      startTime,
      medicationInput,
      selectedMedicationId,
      amount,
      unit,
      notes,
      notesVisible,
      handMode,
      useMetric,
    },
    actions: {
      setStartTime,
      setMedicationInput,
      setSelectedMedicationId,
      setAmount,
      setUnit,
      setNotes,
      setNotesVisible,
      setHandMode,
      setUseMetric,
      resetForm,
    },
  };
}
