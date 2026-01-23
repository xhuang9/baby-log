'use client';

import { ChevronLeftIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { FormFooter } from '@/components/input-controls/FormFooter';
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
import { ModeSwitch } from '@/components/activity-modals';
import { ManualModeSection, TimerModeSection } from './components';
import {
  useInitializeSleepForm,
  useSleepFormState,
  useSleepFormSubmit,
} from './hooks';
import type { AddSleepModalProps } from './types';

export function AddSleepModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddSleepModalProps) {
  // 1. State management
  const { state, actions } = useSleepFormState();

  // 2. Timer integration
  const { isHydrated } = useTimerStore();
  const { prepareTimerSave, completeTimerSave } = useTimerSave({
    babyId,
    logType: 'sleep',
  });

  // 3. Initialization effects
  useInitializeSleepForm({
    isTimerHydrated: isHydrated,
    setHandMode: actions.setHandMode,
  });

  // 4. Submit logic
  const { handleSubmit, isSubmitting, error } = useSleepFormSubmit({
    babyId,
    inputMode: state.inputMode,
    startTime: state.startTime,
    endTime: state.endTime,
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
        <SheetHeader className="relative mx-auto w-full max-w-150 shrink-0 flex-row items-center space-y-0 border-b px-4 pt-4 pb-4">
          <SheetClose
            render={
              <Button
                variant="ghost"
                size="icon-sm"
                className="text-muted-foreground"
              />
            }
          >
            <ChevronLeftIcon className="h-5 w-5" />
            <span className="sr-only">Close</span>
          </SheetClose>

          <SheetTitle className="absolute left-1/2 -translate-x-1/2">
            Sleep
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {state.inputMode === 'timer' && <TimerModeSection babyId={babyId} />}

          {state.inputMode === 'manual' && (
            <ManualModeSection
              startTime={state.startTime}
              onStartTimeChange={actions.setStartTime}
              endTime={state.endTime}
              onEndTimeChange={actions.setEndTime}
              handMode={state.handMode}
            />
          )}

          <ModeSwitch
            inputMode={state.inputMode}
            onModeChange={actions.setInputMode}
          />

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter
          className={`mx-auto w-full max-w-150 shrink-0 flex-row border-t px-4 pt-4 pb-4 ${state.handMode === 'left' ? 'justify-start' : 'justify-end'}`}
        >
          <FormFooter
            onPrimary={handleSubmit}
            primaryLabel="Save"
            onSecondary={() => handleOpenChange(false)}
            secondaryLabel="Cancel"
            isLoading={isSubmitting}
            handMode={state.handMode}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
