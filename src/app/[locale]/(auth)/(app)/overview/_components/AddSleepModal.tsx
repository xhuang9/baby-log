'use client';

import { ChevronLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { TimerWidget } from '@/components/feed/TimerWidget';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter } from '@/components/input-controls/FormFooter';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { createSleepLog } from '@/services/operations';
import { useTimerSave } from '@/hooks/useTimerSave';
import { useTimerStore } from '@/stores/useTimerStore';
import { useUserStore } from '@/stores/useUserStore';

type AddSleepModalProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type InputMode = 'timer' | 'manual';

export function AddSleepModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddSleepModalProps) {
  const user = useUserStore(s => s.user);
  const [inputMode, setInputMode] = useState<InputMode>('timer');
  const [startTime, setStartTime] = useState(() => new Date());
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60); // Default 1 hour sleep
    return end;
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  // Timer hook for save flow
  const {
    prepareTimerSave,
    completeTimerSave,
  } = useTimerSave({ babyId, logType: 'sleep' });

  // Still need hydration from store
  const {
    hydrate: hydrateTimer,
    isHydrated: isTimerHydrated,
  } = useTimerStore();

  // Hydrate timer store when user is available
  useEffect(() => {
    if (user?.localId && !isTimerHydrated) {
      hydrateTimer(user.localId);
    }
  }, [user?.localId, isTimerHydrated, hydrateTimer]);

  // Load hand preference from IndexedDB
  useEffect(() => {
    async function loadHandMode() {
      if (!user?.localId) {
        return;
      }
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');
      } catch (err) {
        console.error('Failed to load hand mode:', err);
      }
    }
    loadHandMode();
  }, [user?.localId]);

  const resetForm = () => {
    setInputMode('timer');
    setStartTime(new Date());
    const end = new Date();
    end.setMinutes(end.getMinutes() + 60);
    setEndTime(end);
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let durationMinutes: number;
      let sleepStartTime: Date;

      if (inputMode === 'timer') {
        // Use timer hook to handle pause, confirmation, and get timer data
        const timerData = await prepareTimerSave();

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
        const durationMs = endTime.getTime() - startTime.getTime();
        durationMinutes = Math.round(durationMs / (1000 * 60));
        sleepStartTime = startTime;

        // Validate duration
        if (durationMinutes <= 0) {
          setError('End time must be after start time');
          setIsSubmitting(false);
          return;
        }
      }

      const result = await createSleepLog({
        babyId,
        startedAt: sleepStartTime,
        durationMinutes,
      });

      if (!result.success) {
        setError(result.error);
        return;
      }

      // Reset the timer after successful save (only in timer mode)
      if (inputMode === 'timer') {
        await completeTimerSave();
      }

      resetForm();
      onOpenChange(false);
      onSuccess?.();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      resetForm();
    }
    onOpenChange(newOpen);
  };

  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent side="bottom" className="inset-0 flex h-full w-full flex-col gap-0 rounded-none p-0" showCloseButton={false}>
        <SheetHeader className="relative mx-auto w-full max-w-150 shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Sleep
          </SheetTitle>
        </SheetHeader>

        <div className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6" style={{ minHeight: 0 }}>
          {/* Timer Mode */}
          {inputMode === 'timer' && (
            <div className="space-y-6">
              <TimerWidget babyId={babyId} logType="sleep" />
            </div>
          )}

          {/* Manual Mode - Form Fields */}
          {inputMode === 'manual' && (
            <>
              <div className="space-y-3">
                <Label className="text-muted-foreground">Start time</Label>
                <TimeSwiper
                  value={startTime}
                  onChange={setStartTime}
                  handMode={handMode}
                />
              </div>

              <div className="space-y-3">
                <Label className="text-muted-foreground">End time</Label>
                <TimeSwiper
                  value={endTime}
                  onChange={setEndTime}
                  handMode={handMode}
                />
              </div>

              {/* Calculated Duration */}
              <div className="flex items-center justify-center py-2">
                <div className="rounded-lg bg-muted/50 px-4 py-2">
                  <span className="text-sm text-muted-foreground">Duration: </span>
                  <span className="text-lg font-semibold">
                    {(() => {
                      const durationMs = endTime.getTime() - startTime.getTime();
                      const durationMinutes = Math.round(durationMs / (1000 * 60));
                      if (durationMinutes < 0) {
                        return '0 min';
                      }
                      if (durationMinutes < 60) {
                        return `${durationMinutes} min`;
                      }
                      const hours = Math.floor(durationMinutes / 60);
                      const mins = durationMinutes % 60;
                      return `${hours}h ${mins}m`;
                    })()}
                  </span>
                </div>
              </div>
            </>
          )}

          {/* Mode Switch */}
          <div className="flex justify-center pt-4">
            <button
              type="button"
              onClick={() => setInputMode(inputMode === 'manual' ? 'timer' : 'manual')}
              className="text-sm text-primary underline hover:opacity-80"
            >
              {inputMode === 'manual' ? 'Use a timer' : 'Manual entry'}
            </button>
          </div>

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter className={`mx-auto w-full max-w-150 shrink-0 flex-row border-t px-4 pt-4 pb-4 ${handMode === 'left' ? 'justify-start' : 'justify-end'}`}>
          <FormFooter
            onPrimary={handleSubmit}
            primaryLabel="Save"
            onSecondary={() => handleOpenChange(false)}
            secondaryLabel="Cancel"
            isLoading={isSubmitting}
            handMode={handMode}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
