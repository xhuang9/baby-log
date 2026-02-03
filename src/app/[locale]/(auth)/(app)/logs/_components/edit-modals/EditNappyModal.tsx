'use client';

import type { LocalNappyLog, NappyColour, NappyConsistency, NappyType } from '@/lib/local-db';
import { useState } from 'react';
import { ColourButtons, ConsistencyButtons, NappyTypeButtons } from '@/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/components';
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
import { notifyToast } from '@/lib/notify';
import { deleteNappyLog, updateNappyLog } from '@/services/operations/nappy-log';

type EditNappyModalProps = {
  nappy: LocalNappyLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditNappyModal({
  nappy,
  open,
  onOpenChange,
  onSuccess,
}: EditNappyModalProps) {
  const [handMode] = useState<'left' | 'right'>('right');
  const [startTime, setStartTime] = useState(nappy.startedAt);
  const [nappyType, setNappyType] = useState<NappyType>(nappy.type ?? 'wee');
  const [colour, setColour] = useState<NappyColour | null>(nappy.colour);
  const [consistency, setConsistency] = useState<NappyConsistency | null>(nappy.consistency);
  const [notes, setNotes] = useState(nappy.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!nappy.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Handle nappy type change - clear colour/consistency when switching to Wee or Clean
  const handleNappyTypeChange = (newType: NappyType) => {
    setNappyType(newType);
    if (newType === 'wee' || newType === 'clean') {
      setColour(null);
      setConsistency(null);
    }
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateNappyLog({
        id: nappy.id,
        babyId: nappy.babyId,
        type: nappyType,
        colour,
        consistency,
        startedAt: startTime,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Nappy updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update nappy log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteNappyLog(nappy.id, nappy.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Nappy deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete nappy log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Nappy"
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

        {/* Nappy Type Selection */}
        <NappyTypeButtons
          value={nappyType}
          onChange={handleNappyTypeChange}
          handMode={handMode}
        />

        {/* Colour Selection - Only show for Poo and Mixed */}
        {(nappyType === 'poo' || nappyType === 'mixed') && (
          <>
            <SectionDivider />
            <ColourButtons
              value={colour}
              onChange={setColour}
              handMode={handMode}
            />
          </>
        )}

        {/* Consistency Selection - Only show for Poo and Mixed */}
        {(nappyType === 'poo' || nappyType === 'mixed') && (
          <>
            <SectionDivider />
            <ConsistencyButtons
              value={consistency}
              onChange={setConsistency}
              handMode={handMode}
            />
          </>
        )}

        <SectionDivider />

        {/* Notes */}
        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Anything unusual? (Mucus, Blood, Black/tarry, Pale/white, Straining)"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete nappy log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this nappy log.
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
