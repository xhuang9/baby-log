'use client';

import { useState } from 'react';
import { createBathLog } from '@/services/operations/bath-log';

type UseBathFormSubmitProps = {
  babyId: number;
  startTime: Date;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useBathFormSubmit({
  babyId,
  startTime,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseBathFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createBathLog({
        babyId,
        startedAt: startTime,
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
      setError(err instanceof Error ? err.message : 'Failed to save bath log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
