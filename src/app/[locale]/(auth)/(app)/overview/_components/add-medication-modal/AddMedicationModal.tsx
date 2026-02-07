'use client';

import type { AddMedicationModalProps } from './types';
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
import { useMedicationTypes } from '@/hooks/useMedicationTypes';
import { AmountInput, DeleteMedicationDialog, MedicationInput, MedicationPills } from './components';
import {
  useInitializeMedicationForm,
  useMedicationFormState,
  useMedicationFormSubmit,
} from './hooks';

export function AddMedicationModal({
  babyId,
  open,
  onOpenChange,
  onSuccess,
}: AddMedicationModalProps) {
  // 1. State management
  const { state, actions } = useMedicationFormState();
  const { medicationTypes, createMedication, deleteMedication } = useMedicationTypes();
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [medicationToDelete, setMedicationToDelete] = useState<{ id: string; name: string } | null>(null);

  // 2. Initialization effects
  useInitializeMedicationForm({
    setHandMode: actions.setHandMode,
    setUseMetric: actions.setUseMetric,
  });

  // 3. Submit logic
  const { handleSubmit, isSubmitting, error, isValid } = useMedicationFormSubmit({
    babyId,
    startTime: state.startTime,
    selectedMedicationId: state.selectedMedicationId,
    medicationTypes,
    amount: state.amount,
    unit: state.unit,
    notes: state.notes,
    medicationInput: state.medicationInput,
    createMedication,
    clearMedicationInput: () => actions.setMedicationInput(''),
    setSelectedMedication: (id: string) => actions.setSelectedMedicationId(id),
    resetForm: actions.resetForm,
    onSuccess,
    onClose: () => onOpenChange(false),
  });

  // 4. Medication management handlers
  const handleAddMedication = async () => {
    const name = state.medicationInput.trim();
    if (!name) {
      return;
    }

    const result = await createMedication(name);
    if (result.success) {
      // Auto-select newly created medication
      actions.setSelectedMedicationId(result.data.id);
      // Clear input
      actions.setMedicationInput('');
    }
  };

  const handleSelectMedication = (id: string) => {
    if (state.selectedMedicationId === id) {
      // Deselect if already selected
      actions.setSelectedMedicationId(null);
    } else {
      actions.setSelectedMedicationId(id);
    }
  };

  const handleDeleteMedication = (id: string) => {
    const medication = medicationTypes.find(mt => mt.id === id);
    if (!medication) {
      return;
    }

    setMedicationToDelete({ id, name: medication.name });
    setDeleteDialogOpen(true);
  };

  const handleConfirmDelete = async () => {
    if (!medicationToDelete) {
      return;
    }

    await deleteMedication(medicationToDelete.id);

    // Clear selection if currently selected
    if (state.selectedMedicationId === medicationToDelete.id) {
      actions.setSelectedMedicationId(null);
    }

    setMedicationToDelete(null);
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
              Add Medication
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

            {/* Medication Management */}
            <div className="space-y-3">
              <MedicationInput
                value={state.medicationInput}
                onChange={actions.setMedicationInput}
                onAdd={handleAddMedication}
                handMode={state.handMode}
              />
              <MedicationPills
                medicationTypes={medicationTypes}
                selectedId={state.selectedMedicationId}
                onSelect={handleSelectMedication}
                onDelete={handleDeleteMedication}
                handMode={state.handMode}
              />
            </div>

            <SectionDivider />

            {/* Amount Input */}
            <AmountInput
              amount={state.amount}
              unit={state.unit}
              onAmountChange={actions.setAmount}
              onUnitChange={actions.setUnit}
              handMode={state.handMode}
              useMetric={state.useMetric}
            />

            <SectionDivider />

            {/* Notes */}
            <NotesField
              value={state.notes}
              onChange={actions.setNotes}
              visible={state.notesVisible}
              onToggleVisible={() => actions.setNotesVisible(!state.notesVisible)}
              placeholder="Any notes? (Reason for medication, observations)"
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
              disabled={!isValid}
              handMode={state.handMode}
            />
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete Confirmation Dialog */}
      <DeleteMedicationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        medicationName={medicationToDelete?.name ?? ''}
        onConfirm={handleConfirmDelete}
      />
    </>
  );
}
