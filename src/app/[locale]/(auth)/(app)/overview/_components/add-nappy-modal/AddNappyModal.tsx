'use client';

import type { AddNappyModalProps } from './types';
import { ChevronLeftIcon } from 'lucide-react';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter } from '@/components/input-controls/FormFooter';
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
import { ColourButtons, NappyTypeButtons, TextureButtons } from './components';
import {
  useInitializeNappyForm,
  useNappyFormState,
  useNappyFormSubmit,
} from './hooks';

export function AddNappyModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddNappyModalProps) {
  // 1. State management
  const { state, actions } = useNappyFormState();

  // 2. Initialization effects
  useInitializeNappyForm({
    setHandMode: actions.setHandMode,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error } = useNappyFormSubmit({
    babyId,
    startTime: state.startTime,
    nappyType: state.nappyType,
    colour: state.colour,
    texture: state.texture,
    notes: state.notes,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 4. Handle nappy type change - clear colour/texture when switching to Wee or Clean
  const handleNappyTypeChange = (newType: typeof state.nappyType) => {
    actions.setNappyType(newType);
    // Clear colour and texture if switching to Wee or Clean
    if (newType === 'wee' || newType === 'clean') {
      actions.setColour(null);
      actions.setTexture(null);
    }
  };

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
            Add Nappy
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-8 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
        >
          {/* Time Picker */}
          <div className="space-y-2">
            <Label>Start</Label>
            <TimeSwiper
              value={state.startTime}
              onChange={actions.setStartTime}
              handMode={state.handMode}
            />
          </div>

          {/* Nappy Type Selection */}
          <NappyTypeButtons
            value={state.nappyType}
            onChange={handleNappyTypeChange}
            handMode={state.handMode}
          />

          {/* Colour Selection - Only show for Poo and Mixed */}
          {(state.nappyType === 'poo' || state.nappyType === 'mixed') && (
            <ColourButtons
              value={state.colour}
              onChange={actions.setColour}
              handMode={state.handMode}
            />
          )}

          {/* Texture Selection - Only show for Poo and Mixed */}
          {(state.nappyType === 'poo' || state.nappyType === 'mixed') && (
            <TextureButtons
              value={state.texture}
              onChange={actions.setTexture}
              handMode={state.handMode}
            />
          )}

          {/* Collapsible Notes Toggle */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => actions.setNotesVisible(!state.notesVisible)}
              className="text-sm text-primary underline hover:opacity-80"
            >
              {state.notesVisible ? 'Hide notes' : 'Add notes'}
            </button>
          </div>

          {/* Optional Notes Input (shown when toggled) */}
          {state.notesVisible && (
            <div className="space-y-2">
              <Label htmlFor="nappy-notes">Notes</Label>
              <Input
                id="nappy-notes"
                type="text"
                placeholder="e.g., rash, normal..."
                value={state.notes}
                onChange={e => actions.setNotes(e.target.value)}
              />
            </div>
          )}

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
