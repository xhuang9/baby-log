'use client';

import type { MedicationUnit } from '@/lib/local-db';
import type { LocalMedicationType } from '@/lib/local-db/types/medication-types';
import { useState } from 'react';
import { createMedicationLog } from '@/services/operations/medication-log';

type CreateMedicationResult = { success: true; data: { id: string } } | { success: false; error: string };

type UseMedicationFormSubmitProps = {
  babyId: number;
  startTime: Date;
  selectedMedicationId: string | null;
  medicationTypes: LocalMedicationType[];
  amount: number;
  unit: MedicationUnit;
  notes: string;
  medicationInput: string;
  createMedication: (name: string) => Promise<CreateMedicationResult>;
  clearMedicationInput: () => void;
  setSelectedMedication: (id: string) => void;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useMedicationFormSubmit({
  babyId,
  startTime,
  selectedMedicationId,
  medicationTypes,
  amount,
  unit,
  notes,
  medicationInput,
  createMedication,
  clearMedicationInput,
  setSelectedMedication,
  resetForm,
  onSuccess,
  onClose,
}: UseMedicationFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isValid = (selectedMedicationId != null || medicationInput.trim().length > 0) && amount > 0;

  const handleSubmit = async () => {
    // Track medication ID to use (may be updated if we auto-create from input)
    let finalMedicationId = selectedMedicationId;

    // If no medication selected but user has typed something, auto-create and select it
    const trimmedInput = medicationInput.trim();
    if (!finalMedicationId && trimmedInput) {
      const result = await createMedication(trimmedInput);
      if (result.success) {
        finalMedicationId = result.data.id;
        setSelectedMedication(result.data.id);
        clearMedicationInput();
      } else {
        setError(result.error);
        return;
      }
    }

    // Validate medication selection
    if (!finalMedicationId) {
      setError('Please select a medication');
      return;
    }

    // Validate amount
    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get display name from selected medication type
      const selectedMedication = medicationTypes.find(mt => mt.id === finalMedicationId);
      const medicationDisplay = selectedMedication?.name ?? trimmedInput;

      const result = await createMedicationLog({
        babyId,
        medicationTypeId: finalMedicationId,
        medicationType: medicationDisplay,
        amount,
        unit,
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
      setError(err instanceof Error ? err.message : 'Failed to save medication log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error, isValid };
}
