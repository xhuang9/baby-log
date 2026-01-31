'use client';

import type { AddFeedModalProps } from './types';
import { ChevronLeftIcon } from 'lucide-react';
import { FormFooter } from '@/components/input-controls/FormFooter';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useTimerSave } from '@/hooks/useTimerSave';
import { useTimerStore } from '@/stores/useTimerStore';
import {
  FeedMethodToggle,
  ManualModeSection,
  ModeSwitch,
  TimerModeSection,
} from './components';
import {
  useFeedFormState,
  useFeedFormSubmit,
  useInitializeFeedForm,
} from './hooks';

export function AddFeedModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddFeedModalProps) {
  // 1. State management
  const { state, actions } = useFeedFormState();

  // 2. Timer integration
  const { isHydrated } = useTimerStore();
  const timerKey = `feed-${babyId}`;
  // Subscribe to timer state reactively so +1m/-1m updates trigger re-render
  const timerState = useTimerStore(s => s.timers[timerKey]);
  const now = Date.now();
  const timerElapsed = timerState
    ? timerState.elapsedSeconds + (timerState.lastStartTime
      ? Math.floor((now - new Date(timerState.lastStartTime).getTime()) / 1000)
      : 0)
    : 0;
  const { prepareTimerSave, completeTimerSave } = useTimerSave({
    babyId,
    logType: 'feed',
  });

  // Disable save for breast feed timer mode if timer has no time recorded
  // (duration will be rounded up to 1 minute for any time > 0)
  const isTimerModeWithNoTime = state.method === 'breast' && state.inputMode === 'timer' && timerElapsed < 1;

  // Disable save for breast feed manual mode if duration is invalid or zero
  const breastManualDurationMs = state.endTime.getTime() - state.startTime.getTime();
  const breastManualDurationMinutes = Math.round(breastManualDurationMs / (1000 * 60));
  const isManualModeInvalidDuration = state.method === 'breast'
    && state.inputMode === 'manual'
    && (breastManualDurationMinutes <= 0);

  // 3. Initialization effects
  useInitializeFeedForm({
    method: state.method,
    isTimerHydrated: isHydrated,
    setInputMode: actions.setInputMode,
    setStartTime: actions.setStartTime,
    setEndTime: actions.setEndTime,
    setHandMode: actions.setHandMode,
  });

  // 4. Submit logic
  const { handleSubmit, isSubmitting, error } = useFeedFormSubmit({
    babyId,
    method: state.method,
    inputMode: state.inputMode,
    startTime: state.startTime,
    endTime: state.endTime,
    amountMl: state.amountMl,
    endSide: state.endSide,
    prepareTimerSave,
    completeTimerSave,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 5. Open change handler
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      actions.resetForm();
    }
    onOpenChange(newOpen);
  };

  // 6. Render
  return (
    <Sheet open={open} onOpenChange={handleOpenChange}>
      <SheetContent
        side="bottom"
        className="inset-0 flex h-full w-full flex-col gap-0 rounded-none p-0"
        showCloseButton={false}
      >
        <SheetHeader className="relative mx-auto w-full max-w-[600px] flex-shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={(
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              />
            )}
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Feed
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-[600px] flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Feed Method Toggle - Breast/Bottle */}
          <FeedMethodToggle
            method={state.method}
            onMethodChange={actions.setMethod}
          />

          {/* Timer Mode - Only for breast feed */}
          {state.inputMode === 'timer' && state.method === 'breast' && (
            <TimerModeSection
              babyId={babyId}
              endSide={state.endSide}
              onEndSideChange={actions.setEndSide}
              handMode={state.handMode}
            />
          )}

          {/* Manual Mode - Form Fields */}
          {state.inputMode === 'manual' && (
            <ManualModeSection
              method={state.method}
              startTime={state.startTime}
              onStartTimeChange={actions.setStartTime}
              endTime={state.endTime}
              onEndTimeChange={actions.setEndTime}
              amountMl={state.amountMl}
              onAmountChange={actions.setAmountMl}
              endSide={state.endSide}
              onEndSideChange={actions.setEndSide}
              handMode={state.handMode}
            />
          )}

          {/* Mode Switch - Only for breast feed */}
          {state.method === 'breast' && (
            <ModeSwitch
              inputMode={state.inputMode}
              onModeChange={actions.setInputMode}
            />
          )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter
          className={`mx-auto w-full max-w-[600px] flex-shrink-0 flex-row border-t px-4 pt-4 pb-4 ${state.handMode === 'left' ? 'justify-start' : 'justify-end'}`}
        >
          <FormFooter
            onPrimary={handleSubmit}
            primaryLabel="Save"
            onSecondary={() => handleOpenChange(false)}
            secondaryLabel="Cancel"
            isLoading={isSubmitting}
            disabled={isTimerModeWithNoTime || isManualModeInvalidDuration}
            handMode={state.handMode}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
