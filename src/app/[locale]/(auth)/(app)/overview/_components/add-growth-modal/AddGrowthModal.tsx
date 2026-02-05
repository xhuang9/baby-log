'use client';

import type { AddGrowthModalProps } from './types';
import { ChevronLeftIcon } from 'lucide-react';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter, NotesField, SectionDivider } from '@/components/input-controls';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  useGrowthFormState,
  useGrowthFormSubmit,
  useInitializeGrowthForm,
} from './hooks';

export function AddGrowthModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddGrowthModalProps) {
  // 1. State management
  const { state, actions } = useGrowthFormState();

  // 2. Initialization effects
  useInitializeGrowthForm({
    setHandMode: actions.setHandMode,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error } = useGrowthFormSubmit({
    babyId,
    startTime: state.startTime,
    weightG: state.weightG,
    heightMm: state.heightMm,
    headCircumferenceMm: state.headCircumferenceMm,
    notes: state.notes,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 4. Input handlers - parse numeric values, handle units
  const handleWeightChange = (value: string) => {
    // Weight input in kg, store in grams
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      actions.setWeightG(null);
    } else {
      actions.setWeightG(Math.round(num * 1000)); // kg to g
    }
  };

  const handleHeightChange = (value: string) => {
    // Height input in cm, store in mm
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      actions.setHeightMm(null);
    } else {
      actions.setHeightMm(Math.round(num * 10)); // cm to mm
    }
  };

  const handleHeadChange = (value: string) => {
    // Head circumference input in cm, store in mm
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      actions.setHeadCircumferenceMm(null);
    } else {
      actions.setHeadCircumferenceMm(Math.round(num * 10)); // cm to mm
    }
  };

  // 5. Open change handler
  const handleOpenChange = (newOpen: boolean) => {
    if (!newOpen) {
      actions.resetForm();
    }
    onOpenChange(newOpen);
  };

  // Convert stored values to display values
  const displayWeight = state.weightG != null ? (state.weightG / 1000).toString() : '';
  const displayHeight = state.heightMm != null ? (state.heightMm / 10).toString() : '';
  const displayHead = state.headCircumferenceMm != null ? (state.headCircumferenceMm / 10).toString() : '';

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
            Add Growth
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Time Picker */}
          <div className="space-y-2">
            <Label className="text-muted-foreground">Date</Label>
            <TimeSwiper
              value={state.startTime}
              onChange={actions.setStartTime}
              handMode={state.handMode}
            />
          </div>

          <SectionDivider />

          {/* Measurements Section */}
          <div className="space-y-4">
            <Label className="text-muted-foreground">Measurements</Label>

            {/* Weight */}
            <div className="flex items-center gap-3">
              <Label className="w-24 shrink-0">Weight</Label>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.01"
                  min="0"
                  placeholder="0.00"
                  value={displayWeight}
                  onChange={e => handleWeightChange(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  kg
                </span>
              </div>
            </div>

            {/* Height */}
            <div className="flex items-center gap-3">
              <Label className="w-24 shrink-0">Height</Label>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={displayHeight}
                  onChange={e => handleHeightChange(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  cm
                </span>
              </div>
            </div>

            {/* Head Circumference */}
            <div className="flex items-center gap-3">
              <Label className="w-24 shrink-0">Head</Label>
              <div className="relative flex-1">
                <Input
                  type="number"
                  inputMode="decimal"
                  step="0.1"
                  min="0"
                  placeholder="0.0"
                  value={displayHead}
                  onChange={e => handleHeadChange(e.target.value)}
                  className="pr-10"
                />
                <span className="absolute top-1/2 right-3 -translate-y-1/2 text-sm text-muted-foreground">
                  cm
                </span>
              </div>
            </div>
          </div>

          <SectionDivider />

          {/* Notes */}
          <NotesField
            value={state.notes}
            onChange={actions.setNotes}
            visible={state.notesVisible}
            onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
            placeholder="Any additional notes about this measurement"
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
