'use client';

import type { UnifiedLog } from '@/lib/format-log';
import type { LocalFeedLog } from '@/lib/local-db';
import { useEffect, useState } from 'react';
import {
  FeedMethodToggle,
  ManualModeSection,
  ModeSwitch,
  TimerModeSection,
} from '@/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/components';
import { useFeedFormState } from '@/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/hooks/useFeedFormState';
import { BaseActivityModal } from '@/components/activity-modals/BaseActivityModal';
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
import { deleteFeedLog, updateFeedLog } from '@/services/operations/feed-log';

export type EditFeedModalProps = {
  log: UnifiedLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
};

/**
 * Modal for editing an existing feed log
 * Allows updating feed details or deleting the log
 */
export function EditFeedModal({ log, open, onOpenChange }: EditFeedModalProps) {
  const feed = log.data as LocalFeedLog;
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // State management
  const { state, actions } = useFeedFormState();

  // Initialize form with log data
  useEffect(() => {
    if (open) {
      actions.setMethod(feed.method);
      actions.setStartTime(feed.startedAt);
      actions.setAmountMl(feed.amountMl ?? 120);

      if (feed.method === 'breast') {
        if (feed.durationMinutes) {
          const endTime = new Date(
            feed.startedAt.getTime() + feed.durationMinutes * 60 * 1000,
          );
          actions.setEndTime(endTime);
        }
        if (feed.endSide) {
          actions.setEndSide(feed.endSide);
        }
      }
    }
  }, [open, feed, actions]);

  const handleUpdate = async () => {
    setError(null);
    setIsSubmitting(true);

    try {
      const result = await updateFeedLog({
        id: log.id,
        method: state.method,
        startedAt: state.startTime,
        amountMl: state.method === 'bottle' ? state.amountMl : null,
        durationMinutes:
          state.method === 'breast'
            ? Math.round(
                (state.endTime.getTime() - state.startTime.getTime())
                / (1000 * 60),
              )
            : null,
        endSide: state.method === 'breast' ? state.endSide : null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Feed updated');
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update feed';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteFeedLog(log.id);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Feed deleted');
      setShowDeleteConfirm(false);
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete feed';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Feed"
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
        {/* Feed Method Toggle */}
        <FeedMethodToggle
          method={state.method}
          onMethodChange={actions.setMethod}
        />

        {/* Timer Mode - Only for breast feed */}
        {state.inputMode === 'timer' && state.method === 'breast' && (
          <TimerModeSection
            babyId={log.babyId}
            endSide={state.endSide}
            onEndSideChange={actions.setEndSide}
            handMode={state.handMode}
          />
        )}

        {/* Manual Mode - Form Fields */}
        {state.inputMode === 'manual' && (
          <ManualModeSection
            method={state.method}
            startTime={state.startTime}
            onStartTimeChange={actions.setStartTime}
            endTime={state.endTime}
            onEndTimeChange={actions.setEndTime}
            amountMl={state.amountMl}
            onAmountChange={actions.setAmountMl}
            endSide={state.endSide}
            onEndSideChange={actions.setEndSide}
            handMode={state.handMode}
          />
        )}

        {/* Mode Switch - Only for breast feed */}
        {state.method === 'breast' && (
          <ModeSwitch
            inputMode={state.inputMode}
            onModeChange={actions.setInputMode}
          />
        )}
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete feed log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this feed log.
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
