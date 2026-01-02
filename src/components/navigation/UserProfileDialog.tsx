'use client';

import { UserProfile } from '@clerk/nextjs';
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogTrigger,
} from '@/components/ui/alert-dialog';

type UserProfileDialogProps = {
  trigger?: React.ReactNode;
};

export const UserProfileDialog = ({ trigger }: UserProfileDialogProps) => {
  return (
    <AlertDialog>
      {trigger && (
        <AlertDialogTrigger
          render={() => trigger}
        />
      )}
      <AlertDialogContent className="max-h-[90vh] max-w-4xl overflow-y-auto p-0">
        <UserProfile />
      </AlertDialogContent>
    </AlertDialog>
  );
};
