'use client';

import type { ActivityLogCategory } from '@/lib/local-db';
import { useState } from 'react';
import { createActivityLog } from '@/services/operations/activity-log';

type UseActivityLogFormSubmitProps = {
  babyId: number;
  startTime: Date;
  endTime: Date | null;
  activityType: ActivityLogCategory;
  notes: string;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useActivityLogFormSubmit({
  babyId,
  startTime,
  endTime,
  activityType,
  notes,
  resetForm,
  onSuccess,
  onClose,
}: UseActivityLogFormSubmitProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await createActivityLog({
        babyId,
        activityType,
        startedAt: startTime,
        endedAt: endTime,
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
      setError(err instanceof Error ? err.message : 'Failed to save activity log');
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
