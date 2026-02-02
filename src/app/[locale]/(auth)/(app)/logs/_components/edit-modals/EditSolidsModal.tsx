'use client';

import type { LocalSolidsLog, SolidsReaction } from '@/lib/local-db';
import { useEffect, useState } from 'react';
import { DeleteFoodDialog, FoodInput, FoodPills, ReactionButtons } from '@/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components';
import { BaseActivityModal } from '@/components/activity-modals/BaseActivityModal';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { NotesField, SectionDivider } from '@/components/input-controls';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { useFoodTypes } from '@/hooks/useFoodTypes';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { notifyToast } from '@/lib/notify';
import { deleteSolidsLog, updateSolidsLog } from '@/services/operations/solids-log';
import { useUserStore } from '@/stores/useUserStore';

type EditSolidsModalProps = {
  solids: LocalSolidsLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditSolidsModal({
  solids,
  open,
  onOpenChange,
  onSuccess,
}: EditSolidsModalProps) {
  const user = useUserStore(s => s.user);
  const { foodTypes, createFood, deleteFood } = useFoodTypes();

  // Form state
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [startTime, setStartTime] = useState(solids.startedAt);
  const [foodInput, setFoodInput] = useState('');
  const [selectedFoodIds, setSelectedFoodIds] = useState<string[]>(solids.foodTypeIds ?? []);
  const [reaction, setReaction] = useState<SolidsReaction>(solids.reaction);
  const [notes, setNotes] = useState(solids.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!solids.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Food deletion dialog state
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [foodToDelete, setFoodToDelete] = useState<{ id: string; name: string } | null>(null);

  // Load hand mode preference
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

  // Update state when solids log changes
  useEffect(() => {
    setStartTime(solids.startedAt);
    setSelectedFoodIds(solids.foodTypeIds ?? []);
    setReaction(solids.reaction);
    setNotes(solids.notes ?? '');
    setNotesVisible(!!solids.notes);
    setError(null);
  }, [solids.id, solids.startedAt, solids.foodTypeIds, solids.reaction, solids.notes]);

  // Food management handlers
  const handleAddFood = async () => {
    const name = foodInput.trim();
    if (!name) {
      return;
    }

    const result = await createFood(name);
    if (result.success) {
      // Auto-select newly created food
      setSelectedFoodIds([...selectedFoodIds, result.data.id]);
      // Clear input
      setFoodInput('');
    }
  };

  const handleToggleFood = (id: string) => {
    if (selectedFoodIds.includes(id)) {
      setSelectedFoodIds(selectedFoodIds.filter(fid => fid !== id));
    } else {
      setSelectedFoodIds([...selectedFoodIds, id]);
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

  const handleConfirmDeleteFood = async () => {
    if (!foodToDelete) {
      return;
    }

    await deleteFood(foodToDelete.id);

    // Remove from selection if currently selected
    if (selectedFoodIds.includes(foodToDelete.id)) {
      setSelectedFoodIds(selectedFoodIds.filter(id => id !== foodToDelete.id));
    }

    setFoodToDelete(null);
  };

  const handleSubmit = async () => {
    // Validate food selection
    if (selectedFoodIds.length === 0) {
      setError('Please select at least one food');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Build display text from selected food types
      const selectedFoods = foodTypes.filter(ft => selectedFoodIds.includes(ft.id));
      const foodDisplay = selectedFoods.map(ft => ft.name).join(', ');

      const result = await updateSolidsLog({
        id: solids.id,
        babyId: solids.babyId,
        foodTypeIds: selectedFoodIds,
        foodDisplay,
        reaction,
        startedAt: startTime,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Solids log updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update solids log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteSolidsLog(solids.id, solids.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Solids log deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete solids log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Solids"
        open={open}
        onOpenChange={onOpenChange}
        onPrimary={handleSubmit}
        primaryLabel="Update"
        onSecondary={() => onOpenChange(false)}
        secondaryLabel="Cancel"
        onDelete={() => setShowDeleteConfirm(true)}
        isLoading={isSubmitting}
        error={error}
        handMode={handMode}
      >
        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Start</Label>
          <TimeSwiper
            value={startTime}
            onChange={setStartTime}
            handMode={handMode}
          />
        </div>

        <SectionDivider />

        {/* Food Management */}
        <div className="space-y-3">
          <FoodInput
            value={foodInput}
            onChange={setFoodInput}
            onAdd={handleAddFood}
          />
          <FoodPills
            foodTypes={foodTypes}
            selectedIds={selectedFoodIds}
            onToggle={handleToggleFood}
            onDelete={handleDeleteFood}
            handMode={handMode}
          />
        </div>

        <SectionDivider />

        {/* Reaction Selection */}
        <ReactionButtons
          value={reaction}
          onChange={setReaction}
          handMode={handMode}
        />

        <SectionDivider />

        {/* Notes */}
        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Any reactions? (Rash, Vomiting, Diarrhea, Gas)"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete log confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete solids log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this solids log.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isSubmitting}
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete food confirmation dialog */}
      <DeleteFoodDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        foodName={foodToDelete?.name ?? ''}
        onConfirm={handleConfirmDeleteFood}
      />
    </>
  );
}
