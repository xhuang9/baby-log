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

import { useParams, useRouter } from 'next/navigation';
import { useEffect } from 'react';
import { useBootstrapMachine } from './hooks/useBootstrapMachine';
import { getI18nPath } from '@/utils/Helpers';
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
  const locale = (params?.locale as string) ?? 'en';

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
        {renderState()}
      </div>
    </div>
  );
}
