'use client';

import type { LocalMedicationLog, MedicationUnit } from '@/lib/local-db';
import { useEffect, useState } from 'react';
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
import { useMedicationTypes } from '@/hooks/useMedicationTypes';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { notifyToast } from '@/lib/notify';
import { deleteMedicationLog, updateMedicationLog } from '@/services/operations/medication-log';
import { useUserStore } from '@/stores/useUserStore';
import { AmountInput, MedicationPills } from '../../../overview/_components/add-medication-modal/components';

type EditMedicationModalProps = {
  medication: LocalMedicationLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditMedicationModal({
  medication,
  open,
  onOpenChange,
  onSuccess,
}: EditMedicationModalProps) {
  const [handMode, setHandMode] = useState<'left' | 'right'>('right');
  const [useMetric, setUseMetric] = useState(true);
  const [startTime, setStartTime] = useState(medication.startedAt);
  const [selectedMedicationId, setSelectedMedicationId] = useState<string | null>(medication.medicationTypeId);
  const [amount, setAmount] = useState(medication.amount);
  const [unit, setUnit] = useState<MedicationUnit>(medication.unit);
  const [notes, setNotes] = useState(medication.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!medication.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const user = useUserStore(s => s.user);
  const { medicationTypes } = useMedicationTypes();

  // Load UI config (hand mode + metric setting)
  useEffect(() => {
    async function loadConfig() {
      if (!user?.localId) return;
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');
        setUseMetric(config.data.useMetric ?? true);
      } catch {
        // keep defaults
      }
    }
    loadConfig();
  }, [user?.localId]);

  const handleSubmit = async () => {
    if (!selectedMedicationId) {
      setError('Please select a medication');
      return;
    }

    if (amount <= 0) {
      setError('Amount must be greater than 0');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      // Get display name from selected medication type
      const selectedMedication = medicationTypes.find(mt => mt.id === selectedMedicationId);
      const medicationDisplay = selectedMedication?.name ?? medication.medicationType;

      const result = await updateMedicationLog({
        id: medication.id,
        babyId: medication.babyId,
        medicationTypeId: selectedMedicationId,
        medicationType: medicationDisplay,
        amount,
        unit,
        startedAt: startTime,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Medication updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update medication log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteMedicationLog(medication.id, medication.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Medication deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete medication log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSelectMedication = (id: string) => {
    if (selectedMedicationId === id) {
      // Deselect if already selected
      setSelectedMedicationId(null);
    } else {
      setSelectedMedicationId(id);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Medication"
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
          <Label>Time</Label>
          <TimeSwiper
            value={startTime}
            onChange={setStartTime}
            handMode={handMode}
          />
        </div>

        <SectionDivider />

        {/* Medication Selection */}
        <div className="space-y-2">
          <Label>Medication</Label>
          <MedicationPills
            medicationTypes={medicationTypes}
            selectedId={selectedMedicationId}
            onSelect={handleSelectMedication}
            onDelete={() => {}} // No deletion in edit mode
            handMode={handMode}
          />
        </div>

        <SectionDivider />

        {/* Amount Input */}
        <AmountInput
          amount={amount}
          unit={unit}
          onAmountChange={setAmount}
          onUnitChange={setUnit}
          handMode={handMode}
          useMetric={useMetric}
        />

        <SectionDivider />

        {/* Notes */}
        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Any notes? (Reason for medication, observations)"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete medication log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this medication log.
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
    </>
  );
}
