'use client';

import type { NappyType } from '@/lib/local-db';
import { useState } from 'react';
import { createNappyLog } from '@/services/operations/nappy-log';

type UseNappyFormSubmitProps = {
  babyId: number;
  startTime: Date;
  nappyType: NappyType;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useNappyFormSubmit({
  babyId,
  startTime,
  nappyType,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseNappyFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createNappyLog({
        babyId,
        type: nappyType,
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
      setError(err instanceof Error ? err.message : 'Failed to save nappy log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
