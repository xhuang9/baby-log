'use client';

import type { LocalFoodType } from '@/lib/local-db/types/food-types';
import type { SolidsReaction } from '@/lib/local-db';
import { useState } from 'react';
import { createSolidsLog } from '@/services/operations/solids-log';

type UseSolidsFormSubmitProps = {
  babyId: number;
  startTime: Date;
  selectedFoodIds: string[];
  foodTypes: LocalFoodType[];
  reaction: SolidsReaction;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useSolidsFormSubmit({
  babyId,
  startTime,
  selectedFoodIds,
  foodTypes,
  reaction,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseSolidsFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    // Validate food selection
    if (selectedFoodIds.length === 0) {
      setError('Please select at least one food');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build display text from selected food types
      const selectedFoods = foodTypes.filter(ft => selectedFoodIds.includes(ft.id));
      const foodDisplay = selectedFoods.map(ft => ft.name).join(', ');

      const result = await createSolidsLog({
        babyId,
        foodTypeIds: selectedFoodIds,
        foodDisplay,
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
