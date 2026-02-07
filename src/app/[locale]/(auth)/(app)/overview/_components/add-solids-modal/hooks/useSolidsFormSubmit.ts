'use client';

import type { SolidsReaction } from '@/lib/local-db';
import type { LocalFoodType } from '@/lib/local-db/types/food-types';
import { useState } from 'react';
import { createSolidsLog } from '@/services/operations/solids-log';

type CreateFoodResult = { success: true; data: { id: string } } | { success: false; error: string };

type UseSolidsFormSubmitProps = {
  babyId: number;
  startTime: Date;
  selectedFoodIds: string[];
  foodTypes: LocalFoodType[];
  reaction: SolidsReaction;
  notes: string;
  foodInput: string;
  createFood: (name: string) => Promise<CreateFoodResult>;
  clearFoodInput: () => void;
  addToSelectedFoods: (id: string) => void;
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
  foodInput,
  createFood,
  clearFoodInput,
  addToSelectedFoods,
  resetForm,
  onSuccess,
  onClose,
}: UseSolidsFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = selectedFoodIds.length > 0 || foodInput.trim().length > 0;

  const handleSubmit = async () => {
    // Track food IDs to use (may be updated if we auto-create from input)
    let finalFoodIds = [...selectedFoodIds];

    // If no foods selected but user has typed something, auto-create and select it
    const trimmedInput = foodInput.trim();
    if (finalFoodIds.length === 0 && trimmedInput) {
      const result = await createFood(trimmedInput);
      if (result.success) {
        finalFoodIds = [result.data.id];
        addToSelectedFoods(result.data.id);
        clearFoodInput();
      } else {
        setError(result.error);
        return;
      }
    }

    // Validate food selection
    if (finalFoodIds.length === 0) {
      setError('Please select at least one food');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build display text from selected food types
      const selectedFoods = foodTypes.filter(ft => finalFoodIds.includes(ft.id));
      const foodDisplay = selectedFoods.map(ft => ft.name).join(', ');

      const result = await createSolidsLog({
        babyId,
        foodTypeIds: finalFoodIds,
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

  return { handleSubmit, isSubmitting, error, isValid };
}
