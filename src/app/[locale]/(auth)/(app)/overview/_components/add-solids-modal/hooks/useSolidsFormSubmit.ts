'use client';

import type { SolidsReaction } from '@/lib/local-db';
import { useState } from 'react';
import { createSolidsLog } from '@/services/operations/solids-log';

type UseSolidsFormSubmitProps = {
  babyId: number;
  startTime: Date;
  food: string;
  reaction: SolidsReaction;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useSolidsFormSubmit({
  babyId,
  startTime,
  food,
  reaction,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseSolidsFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate food
    if (!food.trim()) {
      setError('Please enter a food name');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createSolidsLog({
        babyId,
        food: food.trim(),
        reaction,
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
      setError(err instanceof Error ? err.message : 'Failed to save solids log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
