'use client';

import type { AddActivityLogModalProps } from './types';
import { ChevronLeftIcon } from 'lucide-react';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter, NotesField } from '@/components/input-controls';
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
import { Switch } from '@/components/ui/switch';
import { ActivityTypeSelector } from './components';
import {
  useActivityLogFormState,
  useActivityLogFormSubmit,
  useInitializeActivityLogForm,
} from './hooks';

export function AddActivityLogModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddActivityLogModalProps) {
  // 1. State management
  const { state, actions } = useActivityLogFormState();

  // 2. Initialization effects
  useInitializeActivityLogForm({
    setHandMode: actions.setHandMode,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error } = useActivityLogFormSubmit({
    babyId,
    startTime: state.startTime,
    endTime: state.showEndTime ? state.endTime : null,
    activityType: state.activityType,
    notes: state.notes,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 4. Open change handler
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      actions.resetForm();
    }
    onOpenChange(newOpen);
  };

  // 5. End time toggle handler
  const handleEndTimeToggle = (checked: boolean) => {
    actions.setShowEndTime(checked);
    if (checked && !state.endTime) {
      actions.setEndTime(new Date());
    }
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
            Add Activity
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Activity Type Selector */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Activity Type</Label>
            <ActivityTypeSelector
              value={state.activityType}
              onChange={actions.setActivityType}
            />
          </div>

          {/* Start Time Picker */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Start Time</Label>
            <TimeSwiper
              value={state.startTime}
              onChange={actions.setStartTime}
              handMode={state.handMode}
            />
          </div>

          {/* End Time (optional with toggle) */}
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Label className="text-muted-foreground">End Time</Label>
              <Switch
                checked={state.showEndTime}
                onCheckedChange={handleEndTimeToggle}
              />
            </div>
            {state.showEndTime && state.endTime && (
              <TimeSwiper
                value={state.endTime}
                onChange={actions.setEndTime}
                handMode={state.handMode}
              />
            )}
          </div>

          {/* Notes */}
          <NotesField
            value={state.notes}
            onChange={actions.setNotes}
            visible={state.notesVisible}
            onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
            placeholder="Any notes about the activity?"
            handMode={state.handMode}
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
