'use client';

import type { FeedMethod } from '@/actions/feedLogActions';
import { useState } from 'react';
import { createFeedLog } from '@/actions/feedLogActions';
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
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';

type AddFeedSheetProps = {
  babyId: number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function AddFeedSheet({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddFeedSheetProps) {
  const [method, setMethod] = useState<FeedMethod>('bottle');
  const [hour, setHour] = useState(() => new Date().getHours());
  const [minute, setMinute] = useState(() => new Date().getMinutes());
  const [amountMl, setAmountMl] = useState(120);
  const [durationMinutes, setDurationMinutes] = useState(15);
  const [endSide, setEndSide] = useState<'left' | 'right'>('left');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    const now = new Date();
    setMethod('bottle');
    setHour(now.getHours());
    setMinute(now.getMinutes());
    setAmountMl(120);
    setDurationMinutes(15);
    setEndSide('left');
    setError(null);
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const now = new Date();
      const startedAt = new Date(
        now.getFullYear(),
        now.getMonth(),
        now.getDate(),
        hour,
        minute,
      );

      const result = await createFeedLog({
        babyId,
        method,
        startedAt,
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
      <SheetContent side="bottom" className="h-auto max-h-[90vh] rounded-t-xl" showCloseButton={false}>
        <SheetHeader className="flex-row items-center justify-between gap-4 space-y-0 border-b pb-4">
          <SheetClose
            render={<Button variant="ghost" size="sm" className="text-muted-foreground" />}
          >
            Cancel
          </SheetClose>

          <SheetTitle className="text-center">
            Add
            {' '}
            {method === 'bottle' ? 'Bottle' : 'Breast'}
            {' '}
            Feed
          </SheetTitle>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setMethod(method === 'bottle' ? 'breast' : 'bottle')}
            className="text-primary"
          >
            {method === 'bottle' ? 'Breast' : 'Bottle'}
          </Button>
        </SheetHeader>

        <div className="space-y-6 py-6">
          {/* Time Picker */}
          <div className="space-y-3">
            <Label className="text-muted-foreground">Start Time</Label>
            <div className="flex items-center justify-center gap-4">
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min={0}
                  max={23}
                  value={hour}
                  onChange={e => setHour(Math.min(23, Math.max(0, Number.parseInt(e.target.value) || 0)))}
                  className="h-16 w-20 rounded-lg border bg-background text-center text-2xl font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="mt-1 text-xs text-muted-foreground">Hour</span>
              </div>
              <span className="text-2xl font-semibold">:</span>
              <div className="flex flex-col items-center">
                <input
                  type="number"
                  min={0}
                  max={59}
                  value={minute}
                  onChange={e => setMinute(Math.min(59, Math.max(0, Number.parseInt(e.target.value) || 0)))}
                  className="h-16 w-20 rounded-lg border bg-background text-center text-2xl font-semibold focus:ring-2 focus:ring-primary focus:outline-none"
                />
                <span className="mt-1 text-xs text-muted-foreground">Min</span>
              </div>
            </div>
          </div>

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
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    type="button"
                    variant={endSide === 'left' ? 'default' : 'outline'}
                    className={cn(
                      'h-12',
                      endSide === 'left' && 'ring-2 ring-primary ring-offset-2',
                    )}
                    onClick={() => setEndSide('left')}
                  >
                    Left
                  </Button>
                  <Button
                    type="button"
                    variant={endSide === 'right' ? 'default' : 'outline'}
                    className={cn(
                      'h-12',
                      endSide === 'right' && 'ring-2 ring-primary ring-offset-2',
                    )}
                    onClick={() => setEndSide('right')}
                  >
                    Right
                  </Button>
                </div>
              </div>
            </>
          )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter className="border-t pt-4">
          <Button
            onClick={handleSubmit}
            disabled={isSubmitting}
            className="w-full"
            size="lg"
          >
            {isSubmitting ? 'Saving...' : 'Save'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
