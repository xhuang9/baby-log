'use client';

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

type DeleteMedicationDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicationName: string;
  onConfirm: () => void;
};

export function DeleteMedicationDialog({
  open,
  onOpenChange,
  medicationName,
  onConfirm,
}: DeleteMedicationDialogProps) {
  const handleConfirm = () => {
    onConfirm();
    onOpenChange(false);
  };

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete medication type?</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;
            {medicationName}
            &quot;?
            This will not delete any existing medication logs.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleConfirm} variant="destructive">
            Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
