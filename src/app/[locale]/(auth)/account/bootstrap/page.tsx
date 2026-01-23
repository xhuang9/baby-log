'use client';

/**
 * Bootstrap Page
 *
 * Unified post-login page that handles all account states:
 * - Syncing data from server
 * - Handling offline mode
 * - Account locked
 * - No baby (onboarding)
 * - Pending access request
 * - Pending invites
 * - Baby selection
 * - Ready state (redirect to overview)
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

import Cookies from 'js-cookie';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { acceptInviteByToken } from '@/actions/baby';
import { useBabyStore } from '@/stores/useBabyStore';
import { getI18nPath } from '@/utils/Helpers';
import { useBootstrapMachine } from './hooks/useBootstrapMachine';
import { BootstrapInit } from './states/BootstrapInit';
import { BootstrapInvites } from './states/BootstrapInvites';
import { BootstrapLocked } from './states/BootstrapLocked';
import { BootstrapNoBaby } from './states/BootstrapNoBaby';
import { BootstrapOffline } from './states/BootstrapOffline';
import { BootstrapPendingRequest } from './states/BootstrapPendingRequest';
import { BootstrapSelectBaby } from './states/BootstrapSelectBaby';
import { BootstrapSyncError } from './states/BootstrapSyncError';
import { BootstrapSyncing } from './states/BootstrapSyncing';

export default function BootstrapPage() {
  const router = useRouter();
  const params = useParams();
  const searchParams = useSearchParams();
  const locale = (params?.locale as string) ?? 'en';
  const { setActiveBaby } = useBabyStore();

  const [inviteError, setInviteError] = useState<string | null>(null);
  const [processingInvite, setProcessingInvite] = useState(false);

  const { state, retry, selectBaby } = useBootstrapMachine({
    locale,
    onReady: () => {
      router.replace(getI18nPath('/overview', locale));
    },
    onNoSession: () => {
      router.replace(getI18nPath('/sign-in', locale));
    },
  });

  // Handle ready state redirect
  useEffect(() => {
    if (state.status === 'ready') {
      router.replace(getI18nPath('/overview', locale));
    }
  }, [state.status, router, locale]);

  // Handle no session redirect
  useEffect(() => {
    if (state.status === 'no_session') {
      router.replace(getI18nPath('/sign-in', locale));
    }
  }, [state.status, router, locale]);

  // Handle invite token from URL or cookie
  useEffect(() => {
    // Only process once when component mounts
    if (processingInvite) {
      return;
    }

    // Get token from URL or cookie
    const urlToken = searchParams.get('invite');
    const cookieToken = Cookies.get('pending_invite');
    const token = urlToken || cookieToken;

    if (!token) {
      return;
    }

    // If no session yet, store token in cookie and wait for auth
    if (state.status === 'init' || state.status === 'no_session') {
      // Store in cookie for 24 hours
      Cookies.set('pending_invite', token, {
        expires: 1, // 1 day
        secure: true,
        sameSite: 'Lax',
      });
      return;
    }

    // If authenticated (any status other than init/no_session), process the invite
    setProcessingInvite(true);

    acceptInviteByToken({ token })
      .then((result) => {
        // Clear cookie after attempt
        Cookies.remove('pending_invite');

        if (result.success) {
          // Update store with new baby
          setActiveBaby(result.baby);
          // Trigger machine retry to refresh state
          retry();
        } else {
          setInviteError(result.error);
        }
      })
      .catch((err) => {
        Cookies.remove('pending_invite');
        setInviteError(err instanceof Error ? err.message : 'Failed to accept invite');
      })
      .finally(() => {
        setProcessingInvite(false);
      });
  }, [state.status, searchParams, processingInvite, retry, setActiveBaby]);

  // Render state-specific UI
  const renderState = () => {
    switch (state.status) {
      case 'init':
        return <BootstrapInit />;

      case 'syncing':
        return <BootstrapSyncing />;

      case 'offline_ok':
        return (
          <BootstrapOffline
            lastSyncedAt={state.lastSyncedAt}
            onRetry={retry}
          />
        );

      case 'sync_error':
        return (
          <BootstrapSyncError
            error={state.error}
            canRetry={state.canRetry}
            onRetry={retry}
          />
        );

      case 'locked':
        return <BootstrapLocked />;

      case 'no_baby':
        return (
          <BootstrapNoBaby
            redirectPath={getI18nPath('/overview', locale)}
          />
        );

      case 'pending_request':
        return (
          <BootstrapPendingRequest
            request={state.request}
            onRetry={retry}
          />
        );

      case 'has_invites':
        return (
          <BootstrapInvites
            invites={state.invites}
            redirectPath={getI18nPath('/overview', locale)}
          />
        );

      case 'select_baby':
        return (
          <BootstrapSelectBaby
            babies={state.babies}
            onSelect={selectBaby}
          />
        );

      case 'ready':
      case 'no_session':
        // These states redirect, show loading
        return <BootstrapInit />;

      default:
        return <BootstrapInit />;
    }
  };

  return (
    <div className="flex min-h-[60vh] items-center justify-center p-4">
      <div className="w-full max-w-2xl">
        {inviteError && (
          <div className="mb-4 rounded-md bg-destructive/10 p-3 text-sm text-destructive">
            <p className="font-medium">Invite Error</p>
            <p>{inviteError}</p>
          </div>
        )}
        {renderState()}
      </div>
    </div>
  );
}
