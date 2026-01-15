'use client';

import type { FeedMethod } from '@/actions/feedLogActions';
import { XIcon } from 'lucide-react';
import { useEffect, useState } from 'react';
import { createFeedLog } from '@/actions/feedLogActions';
import { BaseButton } from '@/components/base/BaseButton';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { Button } from '@/components/ui/button';
import { ButtonGroup } from '@/components/ui/button-group';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { Slider } from '@/components/ui/slider';
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
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [endSide, setEndSide] = useState<'left' | 'right'>('left');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');

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
    setDurationMinutes(15);
    setEndSide('left');
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
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
        <SheetHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b pb-4">
          <SheetClose
            render={<Button variant="ghost" size="icon-sm" className="text-muted-foreground" />}
          >
            <XIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="text-center">
            Feed
          </SheetTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setInputMode(inputMode === 'manual' ? 'timer' : 'manual')}
            className="text-primary"
          >
            {inputMode === 'manual' ? 'Timer' : 'Manual'}
          </Button>
        </SheetHeader>

        <div className="space-y-6 px-4 py-6">
          {/* Feed Method Toggle - Breast/Bottle (Feed-specific) */}
          <ButtonGroup className="w-full">
            <Button
              type="button"
              variant={method === 'bottle' ? 'default' : 'outline'}
              className="h-12 flex-1"
              onClick={() => setMethod('bottle')}
            >
              Bottle
            </Button>
            <Button
              type="button"
              variant={method === 'breast' ? 'default' : 'outline'}
              className="h-12 flex-1"
              onClick={() => setMethod('breast')}
            >
              Breast
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
              <TimeSwiper
                value={startTime}
                onChange={setStartTime}
                handMode={handMode}
                userId={user?.localId}
              />

              {/* Bottle Feed: Amount Slider */}
              {method === 'bottle' && (
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-muted-foreground">Amount</Label>
                    <span className="text-lg font-semibold">
                      {amountMl}
                      {' '}
                      ml
                    </span>
                  </div>
                  <div className="px-2">
                    <Slider
                      value={[amountMl]}
                      onValueChange={(value) => {
                        const newValue = Array.isArray(value) ? value[0] : value;
                        setAmountMl(newValue ?? 0);
                      }}
                      min={0}
                      max={350}
                      step={10}
                      className="py-4"
                    />
                    <div className="mt-1 flex justify-between text-xs text-muted-foreground">
                      <span>0</span>
                      <span>350</span>
                    </div>
                  </div>
                </div>
              )}

              {/* Breast Feed: Duration */}
              {method === 'breast' && (
                <>
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">Duration</Label>
                    <div className="flex items-center justify-center">
                      <div className="flex flex-col items-center">
                        <input
                          type="number"
                          min={1}
                          max={60}
                          value={durationMinutes}
                          onChange={e => setDurationMinutes(Math.min(60, Math.max(1, Number.parseInt(e.target.value) || 1)))}
                          className="h-16 w-20 rounded-lg border bg-background text-center text-2xl font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                        />
                        <span className="mt-1 text-xs text-muted-foreground">Min</span>
                      </div>
                    </div>
                  </div>

                  {/* End Side */}
                  <div className="space-y-3">
                    <Label className="text-muted-foreground">End On</Label>
                    <RadioGroup
                      value={endSide}
                      onValueChange={value => setEndSide(value as 'left' | 'right')}
                      className="grid grid-cols-2 gap-3"
                    >
                      <label
                        htmlFor="side-left"
                        className={`flex cursor-pointer items-center gap-3 rounded-full border px-4 py-3 transition-colors ${
                          endSide === 'left'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="left" id="side-left" />
                        <span className="font-medium">Left</span>
                      </label>
                      <label
                        htmlFor="side-right"
                        className={`flex cursor-pointer items-center gap-3 rounded-full border px-4 py-3 transition-colors ${
                          endSide === 'right'
                            ? 'border-primary bg-primary/5'
                            : 'border-border hover:bg-muted/50'
                        }`}
                      >
                        <RadioGroupItem value="right" id="side-right" />
                        <span className="font-medium">Right</span>
                      </label>
                    </RadioGroup>
                  </div>
                </>
              )}
            </>
          )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter className="flex-row gap-3 border-t px-4 pt-4">
          <BaseButton
            variant="secondary"
            onClick={() => handleOpenChange(false)}
            disabled={isSubmitting}
            className="flex-1"
          >
            Cancel
          </BaseButton>
          <BaseButton
            variant="primary"
            onClick={handleSubmit}
            loading={isSubmitting}
            className="flex-1"
          >
            Save
          </BaseButton>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
