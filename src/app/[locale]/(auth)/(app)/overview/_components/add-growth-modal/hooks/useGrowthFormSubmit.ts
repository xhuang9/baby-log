'use client';

import { useState } from 'react';
import { createGrowthLog } from '@/services/operations/growth-log';

type UseGrowthFormSubmitProps = {
  babyId: number;
  startTime: Date;
  weightG: number | null;
  heightMm: number | null;
  headCircumferenceMm: number | null;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useGrowthFormSubmit({
  babyId,
  startTime,
  weightG,
  heightMm,
  headCircumferenceMm,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseGrowthFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate that at least one measurement is provided
    if (weightG == null && heightMm == null && headCircumferenceMm == null) {
      setError('Please enter at least one measurement');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createGrowthLog({
        babyId,
        startedAt: startTime,
        weightG,
        heightMm,
        headCircumferenceMm,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      // Success
      resetForm();
      onSuccess?.();
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save growth log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
