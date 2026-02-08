'use client';

import type { LocalActivityLog } from '@/lib/local-db';
import { useState } from 'react';
import { BaseActivityModal } from '@/components/activity-modals/BaseActivityModal';
import { TimeSwiper } from '@/components/feed/TimeSwiper';
import { NotesField } from '@/components/input-controls';
import { ActivityTypeSelector } from '@/app/[locale]/(auth)/(app)/overview/_components/add-activity-log-modal/components/ActivityTypeSelector';
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
import { deleteActivityLog, updateActivityLog } from '@/services/operations/activity-log';

type EditActivityModalProps = {
  activity: LocalActivityLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditActivityModal({
  activity,
  open,
  onOpenChange,
  onSuccess,
}: EditActivityModalProps) {
  const [handMode] = useState<'left' | 'right'>('right');
  const [activityType, setActivityType] = useState(activity.activityType);
  const [startTime, setStartTime] = useState(activity.startedAt);
  const [notes, setNotes] = useState(activity.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!activity.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateActivityLog({
        id: activity.id,
        babyId: activity.babyId,
        activityType,
        startedAt: startTime,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Activity updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update activity log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteActivityLog(activity.id, activity.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Activity deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete activity log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Activity"
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
        {/* Activity Type */}
        <div className="space-y-2">
          <Label>Activity Type</Label>
          <ActivityTypeSelector value={activityType} onChange={setActivityType} />
        </div>

        {/* Time Picker */}
        <div className="space-y-2">
          <Label>Start</Label>
          <TimeSwiper
            value={startTime}
            onChange={setStartTime}
            handMode={handMode}
          />
        </div>

        {/* Notes */}
        <NotesField
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Any notes about the activity?"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete activity log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this activity log.
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
