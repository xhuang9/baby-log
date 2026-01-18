'use client';

import type { FeedMethod } from '@/lib/local-db';
import { ArrowLeftRightIcon, ChevronLeftIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { BaseButton } from '@/components/base/BaseButton';
import { createFeedLog } from '@/services/operations';
import { AmountSlider } from '@/components/feed/AmountSlider';
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
  const [inputMode, setInputMode] = useState<InputMode>('manual');
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
    setInputMode('manual');
    setMethod('bottle');
    setStartTime(new Date());
    setAmountMl(120);
    const end = new Date();
    end.setMinutes(end.getMinutes() + 15);
    setEndTime(end);
    setEndSide('left');
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      // Calculate duration in minutes from start and end times
      const durationMs = endTime.getTime() - startTime.getTime();
      const durationMinutes = Math.round(durationMs / (1000 * 60));

      // Validate duration
      if (method === 'breast' && durationMinutes <= 0) {
        setError('End time must be after start time');
        setIsSubmitting(false);
        return;
      }

      const result = await createFeedLog({
        babyId,
        method,
        startedAt: startTime,
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
      <SheetContent side="bottom" className="inset-0 h-full w-full rounded-none" showCloseButton={false}>
        <SheetHeader className="relative mx-auto w-full max-w-[600px] flex-row items-center space-y-0 border-b px-4 pb-4">
          <SheetClose
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Feed
          </SheetTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInputMode(inputMode === 'manual' ? 'timer' : 'manual')}
            className="ml-auto text-primary"
          >
            <ArrowLeftRightIcon className="h-4 w-4" />
            {inputMode === 'manual' ? 'Timer' : 'Manual'}
          </Button>
        </SheetHeader>

        <div className="mx-auto w-full max-w-[600px] space-y-6 px-4 py-6">
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

          {/* Timer Mode - Placeholder */}
          {inputMode === 'timer' && (
            <div className="flex flex-1 items-center justify-center py-12">
              <p className="text-muted-foreground">Timer widget coming soon</p>
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

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter className={`mx-auto w-full max-w-[600px] border-t px-4 pt-4 ${handMode === 'left' ? 'justify-start' : 'justify-end'}`}>
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
