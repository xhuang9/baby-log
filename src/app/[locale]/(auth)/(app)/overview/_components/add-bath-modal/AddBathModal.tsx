'use client';

import type { AddBathModalProps } from './types';
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
import {
  useInitializeBathForm,
  useBathFormState,
  useBathFormSubmit,
} from './hooks';

export function AddBathModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddBathModalProps) {
  // 1. State management
  const { state, actions } = useBathFormState();

  // 2. Initialization effects
  useInitializeBathForm({
    setHandMode: actions.setHandMode,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error } = useBathFormSubmit({
    babyId,
    startTime: state.startTime,
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

  // 5. Render
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
            Add Bath
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Time Picker */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Start</Label>
            <TimeSwiper
              value={state.startTime}
              onChange={actions.setStartTime}
              handMode={state.handMode}
            />
          </div>

          {/* Notes */}
          <NotesField
            value={state.notes}
            onChange={actions.setNotes}
            visible={state.notesVisible}
            onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
            placeholder="Any notes about the bath? (Temperature, duration, products used)"
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
