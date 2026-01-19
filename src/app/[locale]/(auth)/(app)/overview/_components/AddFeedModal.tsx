'use client';

import type { FeedMethod } from '@/lib/local-db';
import { ChevronLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BaseButton } from '@/components/base/BaseButton';
import { AmountSlider } from '@/components/feed/AmountSlider';
import { TimerWidget } from '@/components/feed/TimerWidget';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter } from '@/components/input-controls/FormFooter';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
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
import { createFeedLog } from '@/services/operations';
import { useTimerStore } from '@/stores/useTimerStore';
import { useUserStore } from '@/stores/useUserStore';

type AddFeedModalProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

type InputMode = 'timer' | 'manual';

export function AddFeedModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddFeedModalProps) {
  const user = useUserStore(s => s.user);
  const [inputMode, setInputMode] = useState<InputMode>('timer');
  const [method, setMethod] = useState<FeedMethod>('bottle');
  const [startTime, setStartTime] = useState(() => new Date());
  const [amountMl, setAmountMl] = useState(120);
  const [endTime, setEndTime] = useState(() => {
    const end = new Date();
    end.setMinutes(end.getMinutes() + 15);
    return end;
  });
  const [endSide, setEndSide] = useState<'left' | 'right'>('left');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

  // Timer store - subscribe to all timers and extract the one we need
  const timerKey = `feed-${babyId}`;
  const timers = useTimerStore(state => state.timers);
  const timerState = timers[timerKey];

  const {
    getTotalElapsed,
    getActualStartTime,
    hydrate: hydrateTimer,
    isHydrated: isTimerHydrated,
  } = useTimerStore();

  // Hydrate timer store when user is available
  useEffect(() => {
    if (user?.localId && !isTimerHydrated) {
      hydrateTimer(user.localId);
    }
  }, [user?.localId, isTimerHydrated, hydrateTimer]);

  // When method changes to breast feeding, set start time to 20 minutes ago
  useEffect(() => {
    if (method === 'breast') {
      const twentyMinutesAgo = new Date();
      twentyMinutesAgo.setMinutes(twentyMinutesAgo.getMinutes() - 20);
      setStartTime(twentyMinutesAgo);

      // Set end time to now (5 minutes after the 20 minutes ago start)
      const now = new Date();
      setEndTime(now);
    } else {
      // Bottle feeding: reset to now
      setStartTime(new Date());
    }
  }, [method]);

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
    setMethod('bottle');
    setStartTime(new Date());
    setAmountMl(120);
    const end = new Date();
    end.setMinutes(end.getMinutes() + 15);
    setEndTime(end);
    setEndSide('left');
    setError(null);
  };

  const formatTimerDisplay = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      let durationMinutes: number;
      let feedStartTime: Date;

      if (inputMode === 'timer') {
        // Use timer state
        const totalElapsedSeconds = getTotalElapsed(timerKey);
        const actualStartTime = getActualStartTime(timerKey);

        if (!actualStartTime || totalElapsedSeconds === 0) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }

        durationMinutes = Math.round(totalElapsedSeconds / 60);
        feedStartTime = actualStartTime;

        // Validate timer duration
        if (method === 'breast' && durationMinutes <= 0) {
          setError('Please start the timer before saving');
          setIsSubmitting(false);
          return;
        }
      } else {
        // Manual mode: Calculate duration from start and end times
        const durationMs = endTime.getTime() - startTime.getTime();
        durationMinutes = Math.round(durationMs / (1000 * 60));
        feedStartTime = startTime;

        // Validate duration
        if (method === 'breast' && durationMinutes <= 0) {
          setError('End time must be after start time');
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
        setError(result.error);
        return;
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
        <SheetHeader className="relative mx-auto w-full max-w-[600px] flex-shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Feed
          </SheetTitle>
        </SheetHeader>

        <div className="mx-auto w-full max-w-[600px] flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6" style={{ minHeight: 0 }}>
          {/* Feed Method Toggle - Breast/Bottle (Feed-specific) */}
          <ButtonGroup className="w-full">
            <Button
              type="button"
              variant={method === 'bottle' ? 'default' : 'outline'}
              className="h-12 flex-1"
              onClick={() => setMethod('bottle')}
            >
              Bottle Feeding
            </Button>
            <Button
              type="button"
              variant={method === 'breast' ? 'default' : 'outline'}
              className="h-12 flex-1"
              onClick={() => setMethod('breast')}
            >
              Breast Feeding
            </Button>
          </ButtonGroup>

          {/* Timer Mode */}
          {inputMode === 'timer' && (
            <div className="space-y-6">
              {/* Timer Widget */}
              <TimerWidget babyId={babyId} logType="feed" />

              {/* Additional fields based on feed method */}
              {method === 'bottle' && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Amount</Label>
                  <AmountSlider
                    value={amountMl}
                    onChange={setAmountMl}
                    handMode={handMode}
                  />
                </div>
              )}

              {method === 'breast' && (
                <div className={`${handMode === 'left' ? 'space-y-3' : 'flex items-center justify-between'}`}>
                  <Label className="text-muted-foreground">End on</Label>
                  <div className={`flex gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
                    <BaseButton
                      variant={endSide === 'left' ? 'primary' : 'secondary'}
                      onClick={() => setEndSide('left')}
                    >
                      Left
                    </BaseButton>
                    <BaseButton
                      variant={endSide === 'right' ? 'primary' : 'secondary'}
                      onClick={() => setEndSide('right')}
                    >
                      Right
                    </BaseButton>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Manual Mode - Form Fields */}
          {inputMode === 'manual' && (
            <>
              {/* Time Swiper */}
              <div className="space-y-3">
                <Label className="text-muted-foreground">Start time</Label>
                <TimeSwiper
                  value={startTime}
                  onChange={setStartTime}
                  handMode={handMode}
                />
              </div>

              {/* Bottle Feed: Amount Slider */}
              {method === 'bottle' && (
                <div className="space-y-3">
                  <Label className="text-muted-foreground">Amount</Label>
                  <AmountSlider
                    value={amountMl}
                    onChange={setAmountMl}
                    handMode={handMode}
                  />
                </div>
              )}

              {/* Breast Feed: End Time */}
              {method === 'breast' && (
                <>
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

                  {/* End Side */}
                  <div className={`${handMode === 'left' ? 'space-y-3' : 'flex items-center justify-between'}`}>
                    <Label className="text-muted-foreground">End on</Label>
                    <div className={`flex gap-3 ${handMode === 'left' ? '' : 'ml-auto'}`}>
                      <BaseButton
                        variant={endSide === 'left' ? 'primary' : 'secondary'}
                        onClick={() => setEndSide('left')}
                      >
                        Left
                      </BaseButton>
                      <BaseButton
                        variant={endSide === 'right' ? 'primary' : 'secondary'}
                        onClick={() => setEndSide('right')}
                      >
                        Right
                      </BaseButton>
                    </div>
                  </div>
                </>
              )}
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

        <SheetFooter className={`mx-auto w-full max-w-[600px] flex-shrink-0 flex-row border-t px-4 pt-4 pb-4 ${handMode === 'left' ? 'justify-start' : 'justify-end'}`}>
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
