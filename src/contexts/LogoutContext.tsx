'use client';

import type { ReactNode } from 'react';
import { createContext, use, useState } from 'react';
import { toast } from 'sonner';
import { LogoutConfirmationDialog } from '@/components/auth/LogoutConfirmationDialog';
import { useOnlineStatus } from '@/hooks/useOnlineStatus';
import { getPendingOutboxEntries } from '@/lib/local-db';
import { signOutCleanup } from '@/services/operations/auth';
import { flushOutbox } from '@/services/sync';

type LogoutContextValue = {
  requestLogout: () => Promise<boolean>;
};

const LogoutContext = createContext<LogoutContextValue | null>(null);

export function LogoutProvider({ children }: { children: ReactNode }) {
  const [showDialog, setShowDialog] = useState(false);
  const [pendingCount, setPendingCount] = useState(0);
  const [isSyncing, setIsSyncing] = useState(false);
  const [resolveLogout, setResolveLogout] = useState<((proceed: boolean) => void) | null>(null);
  const isOnline = useOnlineStatus();

  const requestLogout = async (): Promise<boolean> => {
    // Check for pending outbox entries
    const pending = await getPendingOutboxEntries();

    if (pending.length === 0) {
      // No pending changes, proceed directly
      await signOutCleanup();
      return true;
    }

    // Has pending changes, show dialog
    setPendingCount(pending.length);
    setShowDialog(true);

    // Return promise that resolves when user makes choice
    return new Promise((resolve) => {
      setResolveLogout(() => resolve);
    });
  };

  const handleSyncAndLogout = async () => {
    setIsSyncing(true);
    const result = await flushOutbox();
    setIsSyncing(false);

    if (result.success) {
      // Sync succeeded
      toast.success(`Synced ${result.changesApplied} changes`);
      await signOutCleanup();
      setShowDialog(false);
      resolveLogout?.(true);
    } else {
      // Sync failed
      if (result.errorType === 'access_revoked') {
        // Access revoked - data already cleared by flushOutbox
        toast.error('Access revoked - your pending changes have been cleared');
        await signOutCleanup();
        setShowDialog(false);
        resolveLogout?.(true);
      } else {
        // Network or other error - keep dialog open
        toast.error(`Sync failed: ${result.error || 'Unknown error'}. Try again or logout anyway.`);
        // Dialog stays open, user can retry or logout anyway
      }
    }
  };

  const handleLogoutAnyway = async () => {
    await signOutCleanup();
    setShowDialog(false);
    resolveLogout?.(true);
  };

  const handleCancel = () => {
    setShowDialog(false);
    resolveLogout?.(false);
  };

  return (
    <LogoutContext value={{ requestLogout }}>
      {children}
      <LogoutConfirmationDialog
        open={showDialog}
        pendingCount={pendingCount}
        isOnline={isOnline}
        isSyncing={isSyncing}
        onSyncAndLogout={handleSyncAndLogout}
        onLogoutAnyway={handleLogoutAnyway}
        onCancel={handleCancel}
      />
    </LogoutContext>
  );
}

export function useLogout() {
  const context = use(LogoutContext);
  if (!context) {
    throw new Error('useLogout must be used within LogoutProvider');
  }
  return context;
}
