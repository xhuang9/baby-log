import { AlertTriangle } from 'lucide-react';
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
import { Button } from '@/components/ui/button';

type LogoutConfirmationDialogProps = {
  open: boolean;
  pendingCount: number;
  isOnline: boolean;
  isSyncing: boolean;
  onSyncAndLogout: () => Promise<void>;
  onLogoutAnyway: () => Promise<void>;
  onCancel: () => void;
};

export function LogoutConfirmationDialog({
  open,
  pendingCount,
  isOnline,
  isSyncing,
  onSyncAndLogout,
  onLogoutAnyway,
  onCancel,
}: LogoutConfirmationDialogProps) {
  return (
    <AlertDialog open={open} onOpenChange={open => !open && onCancel()}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <div className="bg-warning/10 mx-auto flex h-12 w-12 items-center justify-center rounded-full">
            <AlertTriangle className="text-warning h-6 w-6" />
          </div>
          <AlertDialogTitle>You have unsaved changes</AlertDialogTitle>
          <AlertDialogDescription>
            {isOnline
              ? (
                  <>
                    You have
                    {' '}
                    <strong>{pendingCount}</strong>
                    {' '}
                    pending
                    {' '}
                    {pendingCount === 1 ? 'change' : 'changes'}
                    {' '}
                    that
                    {' '}
                    {isSyncing ? 'are syncing' : 'haven\'t synced'}
                    {' '}
                    to the server yet.
                  </>
                )
              : (
                  <>
                    You have
                    {' '}
                    <strong>{pendingCount}</strong>
                    {' '}
                    pending
                    {' '}
                    {pendingCount === 1 ? 'change' : 'changes'}
                    {' '}
                    that can't sync while offline.
                    Logging out will lose these changes permanently.
                  </>
                )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        <AlertDialogFooter>
          {isOnline
            ? (
                <>
                  <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                  <Button
                    variant="outline"
                    onClick={onLogoutAnyway}
                    disabled={isSyncing}
                  >
                    Logout Anyway
                  </Button>
                  <AlertDialogAction onClick={onSyncAndLogout} disabled={isSyncing}>
                    {isSyncing ? 'Syncing...' : 'Sync and Logout'}
                  </AlertDialogAction>
                </>
              )
            : (
                <>
                  <AlertDialogCancel onClick={onCancel}>Cancel</AlertDialogCancel>
                  <AlertDialogAction onClick={onLogoutAnyway}>
                    Logout Anyway
                  </AlertDialogAction>
                </>
              )}
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
