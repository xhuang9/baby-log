'use client';

import type { AddSolidsModalProps } from './types';
import { ChevronLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { FormFooter, NotesField, SectionDivider } from '@/components/input-controls';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetClose,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet';
import { useFoodTypes } from '@/hooks/useFoodTypes';
import { DeleteFoodDialog, FoodInput, FoodPills, ReactionButtons } from './components';
import {
  useInitializeSolidsForm,
  useSolidsFormState,
  useSolidsFormSubmit,
} from './hooks';

export function AddSolidsModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddSolidsModalProps) {
  // 1. State management
  const { state, actions } = useSolidsFormState();
  const { foodTypes, createFood, deleteFood } = useFoodTypes();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<{ id: string; name: string } | null>(null);

  // 2. Initialization effects
  useInitializeSolidsForm({
    setHandMode: actions.setHandMode,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error } = useSolidsFormSubmit({
    babyId,
    startTime: state.startTime,
    selectedFoodIds: state.selectedFoodIds,
    foodTypes,
    reaction: state.reaction,
    notes: state.notes,
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 4. Food management handlers
  const handleAddFood = async () => {
    const name = state.foodInput.trim();
    if (!name) {
      return;
    }

    const result = await createFood(name);
    if (result.success) {
      // Auto-select newly created food
      actions.setSelectedFoodIds([...state.selectedFoodIds, result.data.id]);
      // Clear input
      actions.setFoodInput('');
    }
  };

  const handleToggleFood = (id: string) => {
    if (state.selectedFoodIds.includes(id)) {
      actions.setSelectedFoodIds(state.selectedFoodIds.filter(fid => fid !== id));
    } else {
      actions.setSelectedFoodIds([...state.selectedFoodIds, id]);
    }
  };

  const handleDeleteFood = (id: string) => {
    const food = foodTypes.find(ft => ft.id === id);
    if (!food) {
      return;
    }

    setFoodToDelete({ id, name: food.name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!foodToDelete) {
      return;
    }

    await deleteFood(foodToDelete.id);

    // Remove from selection if currently selected
    if (state.selectedFoodIds.includes(foodToDelete.id)) {
      actions.setSelectedFoodIds(state.selectedFoodIds.filter(id => id !== foodToDelete.id));
    }

    setFoodToDelete(null);
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
    <>
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
              Add Solids
            </SheetTitle>
          </SheetHeader>

          <div
            className="mx-auto w-full max-w-150 flex-1 space-y-5 overflow-y-auto px-4 pt-6 pb-6"
            style={{ minHeight: 0 }}
          >
            {/* Time Picker */}
            <div className="space-y-2">
              <TimeSwiper
                value={state.startTime}
                onChange={actions.setStartTime}
                handMode={state.handMode}
              />
            </div>

            <SectionDivider />

            {/* Food Management */}
            <div className="space-y-3">
              <FoodInput
                value={state.foodInput}
                onChange={actions.setFoodInput}
                onAdd={handleAddFood}
              />
              <FoodPills
                foodTypes={foodTypes}
                selectedIds={state.selectedFoodIds}
                onToggle={handleToggleFood}
                onDelete={handleDeleteFood}
                handMode={state.handMode}
              />
            </div>

            <SectionDivider />

            {/* Reaction Selection */}
            <ReactionButtons
              value={state.reaction}
              onChange={actions.setReaction}
              handMode={state.handMode}
            />

            <SectionDivider />

            {/* Notes */}
            <NotesField
              value={state.notes}
              onChange={actions.setNotes}
              visible={state.notesVisible}
              onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
              placeholder="Any reactions? (Rash, Vomiting, Diarrhea, Gas)"
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

      {/* Delete Confirmation Dialog */}
      <DeleteFoodDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        foodName={foodToDelete?.name ?? ''}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
