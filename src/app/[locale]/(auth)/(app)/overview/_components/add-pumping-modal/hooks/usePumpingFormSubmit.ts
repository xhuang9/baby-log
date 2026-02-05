'use client';

import type { PumpingAmountMode } from './usePumpingFormState';
import { useState } from 'react';
import { createPumpingLog } from '@/services/operations/pumping-log';

type UsePumpingFormSubmitProps = {
  babyId: number;
  startTime: Date;
  endTime: Date;
  mode: PumpingAmountMode;
  leftMl: number;
  rightMl: number;
  totalMl: number;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function usePumpingFormSubmit({
  babyId,
  startTime,
  endTime,
  mode,
  leftMl,
  rightMl,
  totalMl,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UsePumpingFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const isLeftRight = mode === 'leftRight';
      const computedTotal = isLeftRight ? leftMl + rightMl : totalMl;

      const result = await createPumpingLog({
        babyId,
        startedAt: startTime,
        endedAt: endTime,
        leftMl: isLeftRight ? leftMl : null,
        rightMl: isLeftRight ? rightMl : null,
        totalMl: computedTotal,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save pumping log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
