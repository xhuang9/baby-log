import type { FeedMethod } from '@/lib/local-db';
import { useState } from 'react';
import { createFeedLog } from '@/services/operations';
import { notifyToast } from '@/lib/notify';
import type { InputMode } from '../types';
import { calculateDuration } from '../utils';

type TimerSaveResult = {
  durationMinutes: number;
  startTime: Date;
};

type UseFeedFormSubmitOptions = {
  babyId: number;
  method: FeedMethod;
  inputMode: InputMode;
  startTime: Date;
  endTime: Date;
  amountMl: number;
  endSide: 'left' | 'right';
  prepareTimerSave: () => Promise<TimerSaveResult | null>;
  completeTimerSave: () => Promise<void>;
  resetForm: () => void;
  onSuccess?: () => void;
  onClose: () => void;
};

export function useFeedFormSubmit({
  babyId,
  method,
  inputMode,
  startTime,
  endTime,
  amountMl,
  endSide,
  prepareTimerSave,
  completeTimerSave,
  resetForm,
  onSuccess,
  onClose,
}: UseFeedFormSubmitOptions) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let durationMinutes: number;
      let feedStartTime: Date;

      if (inputMode === 'timer') {
        // Use timer hook to handle pause, confirmation, and get timer data
        const timerData = await prepareTimerSave();

        if (!timerData) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }

        durationMinutes = timerData.durationMinutes;
        feedStartTime = timerData.startTime;

        // Validate timer duration
        if (method === 'breast' && durationMinutes <= 0) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Manual mode: Calculate duration from start and end times
        durationMinutes = calculateDuration(startTime, endTime);
        feedStartTime = startTime;

        // Validate duration
        if (method === 'breast' && durationMinutes <= 0) {
          const errorMsg = 'End time must be after start time';
          setError(errorMsg);
          notifyToast.error(errorMsg);
          setIsSubmitting(false);
          return;
        }
      }

      const result = await createFeedLog({
        babyId,
        method,
        startedAt: feedStartTime,
        ...(method === 'bottle' ? { amountMl } : { durationMinutes, endSide }),
      });

      if (!result.success) {
        const errorMsg = result.error || 'Failed to save feed';
        setError(errorMsg);
        notifyToast.error(errorMsg);
        return;
      }

      // Reset the timer after successful save (only in timer mode)
      if (inputMode === 'timer') {
        await completeTimerSave();
      }

      resetForm();
      notifyToast.success('Feed logged successfully');
      onClose();
      onSuccess?.();
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Failed to save';
      setError(errorMsg);
      notifyToast.error(errorMsg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return { handleSubmit, isSubmitting, error };
}
