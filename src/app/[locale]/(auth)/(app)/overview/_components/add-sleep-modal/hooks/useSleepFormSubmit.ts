import { useState } from 'react';
import { createSleepLog } from '@/services/operations';
import { calculateDuration } from '@/components/activity-modals';
import type { InputMode } from '@/components/activity-modals';

type TimerSaveResult = { durationMinutes: number; startTime: Date };

type UseSleepFormSubmitOptions = {
  babyId: number;
  inputMode: InputMode;
  startTime: Date;
  endTime: Date;
  prepareTimerSave: () => Promise<TimerSaveResult | null>;
  completeTimerSave: () => Promise<void>;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useSleepFormSubmit(options: UseSleepFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let durationMinutes: number;
      let sleepStartTime: Date;

      if (options.inputMode === 'timer') {
        // Use timer hook to handle pause, confirmation, and get timer data
        const timerData = await options.prepareTimerSave();

        if (!timerData) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }

        durationMinutes = timerData.durationMinutes;
        sleepStartTime = timerData.startTime;

        // Validate timer duration
        if (durationMinutes <= 0) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Manual mode: Calculate duration from start and end times
        durationMinutes = calculateDuration(options.startTime, options.endTime);
        sleepStartTime = options.startTime;

        // Validate duration
        if (durationMinutes <= 0) {
          setError('End time must be after start time');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await createSleepLog({
        babyId: options.babyId,
        startedAt: sleepStartTime,
        durationMinutes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Reset the timer after successful save (only in timer mode)
      if (options.inputMode === 'timer') {
        await options.completeTimerSave();
      }

      options.resetForm();
      options.onClose();
      options.onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
