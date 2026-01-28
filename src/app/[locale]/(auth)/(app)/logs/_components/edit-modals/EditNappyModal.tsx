'use client';

import type { LocalNappyLog, NappyType } from '@/lib/local-db';
import { ChevronLeftIcon } from 'lucide-react';
import { useState } from 'react';
import { NappyTypeButtons } from '@/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/components/NappyTypeButtons';
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
  const [notes, setNotes] = useState(nappy.notes ?? '');
  const [notesVisible, setNotesVisible] = useState(!!nappy.notes);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async () => {
    setIsSubmitting(true);
    setError(null);

    try {
      const result = await updateNappyLog({
        id: nappy.id,
        babyId: nappy.babyId,
        type: nappyType,
        startedAt: startTime,
        notes: notes.trim() || null,
      });

      if (!result.success) {
        setError(result.error);
        setIsSubmitting(false);
        return;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update nappy log');
      setIsSubmitting(false);
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    setError(null);

    try {
      const result = await deleteNappyLog(nappy.id, nappy.babyId);

      if (!result.success) {
        setError(result.error);
        setIsDeleting(false);
        return;
      }

      onSuccess?.();
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete nappy log');
      setIsDeleting(false);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
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
            Edit Nappy
          </SheetTitle>
        </SheetHeader>

        <div
          className="mx-auto w-full max-w-150 flex-1 space-y-6 overflow-y-auto px-4 pt-6 pb-6"
          style={{ minHeight: 0 }}
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

          {/* Nappy Type Selection */}
          <NappyTypeButtons
            value={nappyType}
            onChange={setNappyType}
            handMode={handMode}
          />

          {/* Collapsible Notes Toggle */}
          <div className="flex justify-center">
            <button
              type="button"
              onClick={() => setNotesVisible(!notesVisible)}
              className="text-sm text-primary underline hover:opacity-80"
            >
              {notesVisible ? 'Hide notes' : 'Add notes'}
            </button>
          </div>

          {/* Optional Notes Input (shown when toggled) */}
          {notesVisible && (
            <div className="space-y-2">
              <Label htmlFor="edit-nappy-notes">Notes</Label>
              <Input
                id="edit-nappy-notes"
                type="text"
                placeholder="e.g., rash, normal..."
                value={notes}
                onChange={e => setNotes(e.target.value)}
              />
            </div>
          )}

          {/* Delete Section */}
          {!showDeleteConfirm
            ? (
                <Button
                  type="button"
                  variant="destructive"
                  className="w-full"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  Delete Nappy Log
                </Button>
              )
            : (
                <div className="space-y-2 rounded-lg border border-destructive p-4">
                  <p className="text-sm text-destructive">
                    Are you sure you want to delete this nappy log? This cannot be undone.
                  </p>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="destructive"
                      className="flex-1"
                      onClick={handleDelete}
                      disabled={isDeleting}
                    >
                      {isDeleting ? 'Deleting...' : 'Yes, Delete'}
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      className="flex-1"
                      onClick={() => setShowDeleteConfirm(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              )}

          {error && (
            <p className="text-center text-sm text-destructive">{error}</p>
          )}
        </div>

        <SheetFooter
          className={`mx-auto w-full max-w-150 shrink-0 flex-row border-t px-4 pt-4 pb-4 ${handMode === 'left' ? 'justify-start' : 'justify-end'}`}
        >
          <FormFooter
            onPrimary={handleSubmit}
            primaryLabel="Save"
            onSecondary={() => onOpenChange(false)}
            secondaryLabel="Cancel"
            isLoading={isSubmitting}
            handMode={handMode}
          />
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
