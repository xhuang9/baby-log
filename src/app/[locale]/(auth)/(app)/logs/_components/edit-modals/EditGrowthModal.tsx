'use client';

import type { LocalGrowthLog } from '@/lib/local-db';
import { useState } from 'react';
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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { notifyToast } from '@/lib/notify';
import { deleteGrowthLog, updateGrowthLog } from '@/services/operations/growth-log';

type EditGrowthModalProps = {
  growth: LocalGrowthLog;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
};

export function EditGrowthModal({
  growth,
  open,
  onOpenChange,
  onSuccess,
}: EditGrowthModalProps) {
  const [handMode] = useState<'left' | 'right'>('right');
  const [startTime, setStartTime] = useState(growth.startedAt);
  const [weightG, setWeightG] = useState<number | null>(growth.weightG);
  const [heightMm, setHeightMm] = useState<number | null>(growth.heightMm);
  const [headCircumferenceMm, setHeadCircumferenceMm] = useState<number | null>(growth.headCircumferenceMm);
  const [notes, setNotes] = useState(growth.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!growth.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Input handlers - parse numeric values, handle units
  const handleWeightChange = (value: string) => {
    // Weight input in kg, store in grams
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      setWeightG(null);
    } else {
      setWeightG(Math.round(num * 1000)); // kg to g
    }
  };

  const handleHeightChange = (value: string) => {
    // Height input in cm, store in mm
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      setHeightMm(null);
    } else {
      setHeightMm(Math.round(num * 10)); // cm to mm
    }
  };

  const handleHeadChange = (value: string) => {
    // Head circumference input in cm, store in mm
    const num = Number.parseFloat(value);
    if (value === '' || Number.isNaN(num)) {
      setHeadCircumferenceMm(null);
    } else {
      setHeadCircumferenceMm(Math.round(num * 10)); // cm to mm
    }
  };

  // Convert stored values to display values
  const displayWeight = weightG != null ? (weightG / 1000).toString() : '';
  const displayHeight = heightMm != null ? (heightMm / 10).toString() : '';
  const displayHead = headCircumferenceMm != null ? (headCircumferenceMm / 10).toString() : '';

  const handleSubmit = async () => {
    // Validate that at least one measurement is provided
    if (weightG == null && heightMm == null && headCircumferenceMm == null) {
      setError('Please enter at least one measurement');
      notifyToast.error('Please enter at least one measurement');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateGrowthLog({
        id: growth.id,
        babyId: growth.babyId,
        startedAt: startTime,
        weightG,
        heightMm,
        headCircumferenceMm,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        setIsSubmitting(false);
        return;
      }

      notifyToast.success('Growth updated');
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to update growth log';
      setError(message);
      notifyToast.error(message);
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsSubmitting(true);

    try {
      const result = await deleteGrowthLog(growth.id, growth.babyId);

      if (!result.success) {
        setError(result.error);
        notifyToast.error(result.error);
        return;
      }

      notifyToast.success('Growth deleted');
      setShowDeleteConfirm(false);
      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete growth log';
      setError(message);
      notifyToast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <BaseActivityModal
        title="Edit Growth"
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
          <Label>Date</Label>
          <TimeSwiper
            value={startTime}
            onChange={setStartTime}
            handMode={handMode}
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
          value={notes}
          onChange={setNotes}
          visible={notesVisible}
          onToggleVisible={() => setNotesVisible(!notesVisible)}
          placeholder="Any additional notes about this measurement"
          handMode={handMode}
        />
      </BaseActivityModal>

      {/* Delete confirmation dialog */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete growth log?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete this growth log.
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
