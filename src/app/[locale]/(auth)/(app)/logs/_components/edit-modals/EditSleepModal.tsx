'use client';

import type { UnifiedLog } from '@/lib/format-log';
import type { LocalSleepLog } from '@/lib/local-db';
import { useEffect, useState } from 'react';
import {
  ManualModeSection,
  TimerModeSection,
} from '@/app/[locale]/(auth)/(app)/overview/_components/add-sleep-modal/components';
import { useSleepFormState } from '@/app/[locale]/(auth)/(app)/overview/_components/add-sleep-modal/hooks/useSleepFormState';
import { ModeSwitch } from '@/components/activity-modals';
import { BaseActivityModal } from '@/components/activity-modals/BaseActivityModal';
import { NotesField } from '@/components/input-controls';
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
import { notifyToast } from '@/lib/notify';
import { deleteSleepLog, updateSleepLog } from '@/services/operations/sleep-log';

export type EditSleepModalProps = {
  log: UnifiedLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Modal for editing an existing sleep log
 * Allows updating sleep details or deleting the log
 */
export function EditSleepModal({ log, open, onOpenChange }: EditSleepModalProps) {
  const sleep = log.data as LocalSleepLog;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState(sleep.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!sleep.notes);

  // State management
  const { state, actions } = useSleepFormState();

  // Initialize form with log data
  useEffect(() => {
    if (open) {
      actions.setStartTime(sleep.startedAt);
      setNotes(sleep.notes ?? '');
      setNotesVisible(!!sleep.notes);

      if (sleep.durationMinutes && sleep.durationMinutes > 0) {
        const endTime = new Date(
          sleep.startedAt.getTime() + sleep.durationMinutes * 60 * 1000,
        );
        actions.setEndTime(endTime);
      }

      // Force manual mode for editing (no timer)
      actions.setInputMode('manual');
    }
  }, [open, sleep, actions]);

  const handleUpdate = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const durationMinutes
        = state.endTime && state.startTime
          ? Math.round(
              (state.endTime.getTime() - state.startTime.getTime())
              / (1000 * 60),
            )
          : null;

      const result = await updateSleepLog({
        id: log.id,
        startedAt: state.startTime,
        durationMinutes,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Sleep updated');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update sleep';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteSleepLog(log.id);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Sleep deleted');
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete sleep';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Sleep"
        open={open}
        onOpenChange={onOpenChange}
        onPrimary={handleUpdate}
        primaryLabel="Update"
        onSecondary={() => onOpenChange(false)}
        secondaryLabel="Cancel"
        onDelete={() => setShowDeleteConfirm(true)}
        isLoading={isSubmitting}
        error={error}
        handMode={state.handMode}
      >
        {/* Timer Mode Section */}
        {state.inputMode === 'timer' && (
          <TimerModeSection babyId={log.babyId} />
        )}

        {/* Manual Mode Section */}
        {state.inputMode === 'manual' && (
          <ManualModeSection
            startTime={state.startTime}
            onStartTimeChange={actions.setStartTime}
            endTime={state.endTime}
            onEndTimeChange={actions.setEndTime}
            handMode={state.handMode}
          />
        )}

        {/* Mode Switch */}
        <ModeSwitch
          inputMode={state.inputMode}
          onModeChange={actions.setInputMode}
        />

        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          handMode={state.handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete sleep log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this sleep log.
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
