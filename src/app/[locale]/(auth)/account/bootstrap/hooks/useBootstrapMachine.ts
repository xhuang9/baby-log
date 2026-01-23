/**
 * Bootstrap State Machine Hook
 *
 * Manages the complete post-login flow including:
 * - Session validation
 * - Server sync
 * - Offline fallback
 * - Account state resolution
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

'use client';

import type { ActiveBaby } from '@/stores/useBabyStore';
import type {
  BootstrapMachineAction,
  BootstrapMachineState,
  BootstrapResponse,
} from '@/types/bootstrap';
import { useAuth } from '@clerk/nextjs';
import { useCallback, useEffect, useReducer, useRef } from 'react';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

// ============================================================================
// Reducer
// ============================================================================

function bootstrapReducer(
  state: BootstrapMachineState,
  action: BootstrapMachineAction,
): BootstrapMachineState {
  switch (action.type) {
    case 'START_SYNC':
      return { status: 'syncing' };

    case 'SYNC_SUCCESS': {
      const { accountState } = action.response;

      switch (accountState.type) {
        case 'locked':
          return { status: 'locked' };
        case 'no_baby':
          return { status: 'no_baby' };
        case 'pending_request':
          return { status: 'pending_request', request: accountState.request };
        case 'has_invites':
          return { status: 'has_invites', invites: accountState.invites };
        case 'select_baby':
          return { status: 'select_baby', babies: accountState.babies };
        case 'ready':
          return { status: 'ready', activeBaby: accountState.activeBaby };
        default:
          return { status: 'no_baby' };
      }
    }

    case 'SYNC_ERROR':
      return {
        status: 'sync_error',
        error: action.error,
        canRetry: action.canRetry ?? true,
      };

    case 'USE_LOCAL_DATA':
      return { status: 'offline_ok', lastSyncedAt: action.lastSyncedAt };

    case 'NO_SESSION':
      return { status: 'no_session' };

    case 'RETRY':
      return { status: 'syncing' };

    case 'SELECT_BABY':
      return { status: 'ready', activeBaby: action.baby };

    case 'CREATE_BABY_SUCCESS':
    case 'ACCEPT_INVITE_SUCCESS':
      return { status: 'ready', activeBaby: action.baby };

    case 'GO_READY':
      return { status: 'ready', activeBaby: action.activeBaby };

    default:
      return state;
  }
}

// ============================================================================
// Hook
// ============================================================================

type UseBootstrapMachineOptions = {
  locale?: string;
  onReady?: (activeBaby: ActiveBaby) => void;
  onNoSession?: () => void;
};

type UseBootstrapMachineReturn = {
  state: BootstrapMachineState;
  dispatch: React.Dispatch<BootstrapMachineAction>;
  retry: () => void;
  selectBaby: (baby: ActiveBaby) => void;
  isOnline: boolean;
};

export function useBootstrapMachine(
  options: UseBootstrapMachineOptions = {},
): UseBootstrapMachineReturn {
  const { locale = 'en', onReady, onNoSession } = options;

  const [state, dispatch] = useReducer(bootstrapReducer, { status: 'init' });
  const { isLoaded, isSignedIn } = useAuth();

  const setUser = useUserStore(s => s.setUser);
  const setAllBabies = useBabyStore(s => s.setAllBabies);
  const setActiveBaby = useBabyStore(s => s.setActiveBaby);

  const hasStarted = useRef(false);
  const isOnlineRef = useRef(typeof navigator !== 'undefined' ? navigator.onLine : true);

  // Track online status
  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const handleOnline = () => {
      isOnlineRef.current = true;
    };
    const handleOffline = () => {
      isOnlineRef.current = false;
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Store bootstrap data in IndexedDB
  const storeBootstrapData = useCallback(async (response: BootstrapResponse) => {
    try {
      const {
        saveLocalUser,
        saveBabies,
        saveBabyAccess,
        saveBabyInvites,
        saveFeedLogs,
        saveSleepLogs,
        saveNappyLogs,
        updateSyncStatus,
      } = await import('@/lib/local-db');

      // Store user
      await saveLocalUser({
        id: response.user.id,
        clerkId: response.user.clerkId,
        email: response.user.email,
        firstName: response.user.firstName,
        imageUrl: response.user.imageUrl,
        defaultBabyId: response.user.defaultBabyId,
        locked: response.user.locked,
        createdAt: new Date(response.user.createdAt),
        updatedAt: new Date(response.user.updatedAt),
      });

      // Store babies
      if (response.syncData.babies.length > 0) {
        await saveBabies(response.syncData.babies.map(baby => ({
          id: baby.id,
          name: baby.name,
          birthDate: baby.birthDate ? new Date(baby.birthDate) : null,
          gender: baby.gender,
          birthWeightG: baby.birthWeightG,
          archivedAt: baby.archivedAt ? new Date(baby.archivedAt) : null,
          ownerUserId: baby.ownerUserId,
          createdAt: new Date(baby.createdAt),
          updatedAt: new Date(baby.updatedAt),
        })));
      }

      // Store baby access
      if (response.syncData.babyAccess.length > 0) {
        await saveBabyAccess(response.syncData.babyAccess.map(access => ({
          userId: access.userId,
          babyId: access.babyId,
          accessLevel: access.accessLevel,
          caregiverLabel: access.caregiverLabel,
          lastAccessedAt: access.lastAccessedAt ? new Date(access.lastAccessedAt) : null,
          createdAt: new Date(access.createdAt),
          updatedAt: new Date(access.updatedAt),
        })));
      }

      // Store baby invites (for owners to view pending invites)
      if (response.syncData.babyInvites && response.syncData.babyInvites.length > 0) {
        await saveBabyInvites(response.syncData.babyInvites.map(invite => ({
          id: invite.id,
          babyId: invite.babyId,
          inviterUserId: invite.inviterUserId,
          invitedEmail: invite.invitedEmail,
          invitedUserId: invite.invitedUserId,
          accessLevel: invite.accessLevel,
          status: invite.status,
          inviteType: invite.inviteType,
          tokenPrefix: invite.tokenPrefix,
          expiresAt: invite.expiresAt,
          acceptedAt: invite.acceptedAt,
          revokedAt: invite.revokedAt,
          maxUses: invite.maxUses,
          usesCount: invite.usesCount,
          createdAt: invite.createdAt,
          updatedAt: invite.updatedAt,
        })));
      }

      // Store feed logs
      if (response.syncData.recentFeedLogs.length > 0) {
        await saveFeedLogs(response.syncData.recentFeedLogs.map(log => ({
          id: log.id,
          babyId: log.babyId,
          loggedByUserId: log.loggedByUserId,
          method: log.method as 'breast' | 'bottle',
          startedAt: new Date(log.startedAt),
          endedAt: log.endedAt ? new Date(log.endedAt) : null,
          durationMinutes: log.durationMinutes,
          amountMl: log.amountMl,
          isEstimated: log.isEstimated,
          endSide: log.endSide as 'left' | 'right' | null,
          notes: null,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
        })));
      }

      // Store sleep logs
      if (response.syncData.recentSleepLogs.length > 0) {
        await saveSleepLogs(response.syncData.recentSleepLogs.map(log => ({
          id: log.id,
          babyId: log.babyId,
          loggedByUserId: log.loggedByUserId,
          startedAt: new Date(log.startedAt),
          endedAt: log.endedAt ? new Date(log.endedAt) : null,
          durationMinutes: log.durationMinutes,
          notes: log.notes,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
        })));
      }

      // Store nappy logs
      if (response.syncData.recentNappyLogs.length > 0) {
        await saveNappyLogs(response.syncData.recentNappyLogs.map(log => ({
          id: log.id,
          babyId: log.babyId,
          loggedByUserId: log.loggedByUserId,
          type: log.type,
          startedAt: new Date(log.startedAt),
          notes: log.notes,
          createdAt: new Date(log.createdAt),
          updatedAt: new Date(log.updatedAt),
        })));
      }

      // Update sync timestamp
      await updateSyncStatus('bootstrap', 'complete', {
        lastSyncedAt: new Date(response.syncedAt).toISOString(),
      });

      // Save auth session marker for offline access
      const { saveAuthSession } = await import('@/lib/local-db');
      await saveAuthSession(response.user.id, response.user.clerkId);
    } catch (error) {
      console.error('Failed to store bootstrap data:', error);
      // Don't throw - we can continue even if storage fails
    }
  }, []);

  // Update Zustand stores
  const updateStores = useCallback((response: BootstrapResponse) => {
    // Update user store
    setUser({
      id: response.user.clerkId,
      localId: response.user.id,
      firstName: response.user.firstName,
      email: response.user.email,
      imageUrl: response.user.imageUrl ?? '',
    });

    // Build active babies list
    const activeBabies: ActiveBaby[] = response.syncData.babies.map((baby) => {
      const access = response.syncData.babyAccess.find(a => a.babyId === baby.id);
      return {
        babyId: baby.id,
        name: baby.name,
        accessLevel: access?.accessLevel ?? 'viewer',
        caregiverLabel: access?.caregiverLabel ?? null,
      };
    });

    setAllBabies(activeBabies);

    // Set active baby if ready
    if (response.accountState.type === 'ready') {
      setActiveBaby(response.accountState.activeBaby);
    }
  }, [setUser, setAllBabies, setActiveBaby]);

  // Check local data for offline mode
  const checkLocalData = useCallback(async (): Promise<{
    hasData: boolean;
    lastSyncedAt: string | null;
  }> => {
    try {
      const { localDb } = await import('@/lib/local-db');

      const users = await localDb.users.toArray();
      if (users.length === 0) {
        return { hasData: false, lastSyncedAt: null };
      }

      // Check sync status
      const syncStatus = await localDb.syncStatus.get('bootstrap');
      const lastSyncedAt = syncStatus?.lastSyncAt?.toISOString() ?? null;

      return { hasData: true, lastSyncedAt };
    } catch {
      return { hasData: false, lastSyncedAt: null };
    }
  }, []);

  // Fetch bootstrap data from server
  const fetchBootstrap = useCallback(async (): Promise<BootstrapResponse> => {
    // Build API URL with locale prefix
    const apiPath = locale && locale !== 'en' ? `/${locale}/api/bootstrap` : '/api/bootstrap';
    const response = await fetch(apiPath, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    });

    if (!response.ok) {
      if (response.status === 401) {
        throw new Error('UNAUTHORIZED');
      }
      const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
      throw new Error(errorData.error || `HTTP ${response.status}`);
    }

    return response.json();
  }, [locale]);

  // Main bootstrap logic
  const performBootstrap = useCallback(async () => {
    if (hasStarted.current) {
      return;
    }
    hasStarted.current = true;

    // Check if user is signed in
    if (!isSignedIn) {
      dispatch({ type: 'NO_SESSION' });
      onNoSession?.();
      return;
    }

    dispatch({ type: 'START_SYNC' });

    // Check if online
    const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

    if (!isOnline) {
      // Offline - check local data
      const { hasData, lastSyncedAt } = await checkLocalData();

      if (hasData && lastSyncedAt) {
        dispatch({ type: 'USE_LOCAL_DATA', lastSyncedAt });
        // Hydrate stores from local data
        const userStore = useUserStore.getState();
        await userStore.hydrateFromIndexedDB();

        const user = useUserStore.getState().user;
        if (user) {
          const babyStore = useBabyStore.getState();
          await babyStore.hydrateFromIndexedDB(user.localId);

          const activeBaby = useBabyStore.getState().activeBaby;
          if (activeBaby) {
            dispatch({ type: 'GO_READY', activeBaby });
            onReady?.(activeBaby);
          }
        }
      } else {
        dispatch({
          type: 'SYNC_ERROR',
          error: 'You need an internet connection to sign in for the first time.',
          canRetry: true,
        });
      }
      return;
    }

    // Online - fetch from server
    try {
      const response = await fetchBootstrap();

      // Store in IndexedDB
      await storeBootstrapData(response);

      // Update Zustand stores
      updateStores(response);

      // Dispatch success
      dispatch({ type: 'SYNC_SUCCESS', response });

      // Call onReady if ready
      if (response.accountState.type === 'ready') {
        onReady?.(response.accountState.activeBaby);
      }
    } catch (error) {
      console.error('Bootstrap error:', error);

      const errorMessage = error instanceof Error ? error.message : 'Unknown error';

      if (errorMessage === 'UNAUTHORIZED') {
        dispatch({ type: 'NO_SESSION' });
        onNoSession?.();
        return;
      }

      // Check if we have local data to fall back on
      const { hasData, lastSyncedAt } = await checkLocalData();

      if (hasData && lastSyncedAt) {
        // Use stale data
        dispatch({ type: 'USE_LOCAL_DATA', lastSyncedAt });

        // Hydrate stores
        const userStore = useUserStore.getState();
        await userStore.hydrateFromIndexedDB();

        const user = useUserStore.getState().user;
        if (user) {
          const babyStore = useBabyStore.getState();
          await babyStore.hydrateFromIndexedDB(user.localId);

          const activeBaby = useBabyStore.getState().activeBaby;
          if (activeBaby) {
            dispatch({ type: 'GO_READY', activeBaby });
            onReady?.(activeBaby);
          }
        }
      } else {
        dispatch({
          type: 'SYNC_ERROR',
          error: errorMessage,
          canRetry: true,
        });
      }
    }
  }, [
    isSignedIn,
    onReady,
    onNoSession,
    checkLocalData,
    fetchBootstrap,
    storeBootstrapData,
    updateStores,
  ]);

  // Start bootstrap when auth is loaded
  useEffect(() => {
    if (isLoaded && state.status === 'init') {
      performBootstrap();
    }
  }, [isLoaded, state.status, performBootstrap]);

  // Retry function
  const retry = useCallback(() => {
    hasStarted.current = false;
    dispatch({ type: 'RETRY' });
    performBootstrap();
  }, [performBootstrap]);

  // Select baby function
  const selectBaby = useCallback(async (baby: ActiveBaby) => {
    try {
      // Update server
      const { setDefaultBaby } = await import('@/actions/baby');
      const result = await setDefaultBaby(baby.babyId);

      if (result.success) {
        setActiveBaby(baby);
        dispatch({ type: 'SELECT_BABY', baby });
        onReady?.(baby);
      }
    } catch (error) {
      console.error('Failed to select baby:', error);
    }
  }, [setActiveBaby, onReady]);

  return {
    state,
    dispatch,
    retry,
    selectBaby,
    isOnline: isOnlineRef.current,
  };
}
