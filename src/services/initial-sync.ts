/**
 * Initial Sync Service
 *
 * Handles the initial data synchronization when a user logs in.
 * Fetches critical data from the server and stores it in IndexedDB.
 *
 * @see .readme/planning/01-state-management-sync.md
 */

import type {
  LocalBaby,
  LocalBabyAccess,
  LocalFeedLog,
  LocalNappyLog,
  LocalSleepLog,
  LocalUser,
  NappyType,
  UIConfigData,
} from '@/lib/local-db';
import {
  mergeUIConfig,
  saveBabies,
  saveBabyAccess,
  saveFeedLogs,
  saveLocalUser,
  saveNappyLogs,
  saveSleepLogs,
  updateSyncStatus,
} from '@/lib/local-db';

// ============================================================================
// Types
// ============================================================================

export type ServerUIConfig = {
  data: UIConfigData;
  keyUpdatedAt: Record<string, string>;
  schemaVersion: number;
  updatedAt: string;
};

export type InitialSyncData = {
  user: LocalUser;
  babies: LocalBaby[];
  babyAccess: LocalBabyAccess[];
  recentFeedLogs: LocalFeedLog[];
  recentSleepLogs: LocalSleepLog[];
  recentNappyLogs: LocalNappyLog[];
  uiConfig: ServerUIConfig | null;
};

export type InitialSyncResult = { success: true; data: InitialSyncData } | { success: false; error: string };

// ============================================================================
// Server Action Types (to be implemented)
// ============================================================================

type ServerInitialSyncResponse = {
  user: {
    id: number;
    clerkId: string;
    email: string | null;
    firstName: string | null;
    imageUrl: string | null;
    defaultBabyId: number | null;
    locked: boolean;
    createdAt: string;
    updatedAt: string;
  };
  babies: Array<{
    id: number;
    name: string;
    birthDate: string | null;
    gender: 'male' | 'female' | 'other' | 'unknown' | null;
    birthWeightG: number | null;
    archivedAt: string | null;
    ownerUserId: number;
    createdAt: string;
    updatedAt: string;
  }>;
  babyAccess: Array<{
    oduserId: number;
    babyId: number;
    accessLevel: 'owner' | 'editor' | 'viewer';
    caregiverLabel: string | null;
    lastAccessedAt: string | null;
  }>;
  recentFeedLogs: Array<{
    id: string;
    babyId: number;
    loggedByUserId: number;
    method: 'breast' | 'bottle';
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    amountMl: number | null;
    isEstimated: boolean;
    endSide: 'left' | 'right' | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  recentSleepLogs: Array<{
    id: string;
    babyId: number;
    loggedByUserId: number;
    startedAt: string;
    endedAt: string | null;
    durationMinutes: number | null;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  recentNappyLogs: Array<{
    id: string;
    babyId: number;
    loggedByUserId: number;
    type: NappyType | null;
    startedAt: string;
    notes: string | null;
    createdAt: string;
    updatedAt: string;
  }>;
  uiConfig: ServerUIConfig | null;
};

// ============================================================================
// Helper Functions
// ============================================================================

function parseDate(dateStr: string | null): Date | null {
  if (!dateStr) {
    return null;
  }
  return new Date(dateStr);
}

function transformServerData(serverData: ServerInitialSyncResponse): InitialSyncData {
  return {
    user: {
      id: serverData.user.id,
      clerkId: serverData.user.clerkId,
      email: serverData.user.email,
      firstName: serverData.user.firstName,
      imageUrl: serverData.user.imageUrl,
      defaultBabyId: serverData.user.defaultBabyId,
      locked: serverData.user.locked,
      createdAt: new Date(serverData.user.createdAt),
      updatedAt: new Date(serverData.user.updatedAt),
    },
    babies: serverData.babies.map(baby => ({
      id: baby.id,
      name: baby.name,
      birthDate: parseDate(baby.birthDate),
      gender: baby.gender,
      birthWeightG: baby.birthWeightG,
      archivedAt: parseDate(baby.archivedAt),
      ownerUserId: baby.ownerUserId,
      createdAt: new Date(baby.createdAt),
      updatedAt: new Date(baby.updatedAt),
    })),
    babyAccess: serverData.babyAccess.map(access => ({
      oduserId: access.oduserId,
      babyId: access.babyId,
      accessLevel: access.accessLevel,
      caregiverLabel: access.caregiverLabel,
      lastAccessedAt: parseDate(access.lastAccessedAt),
    })),
    recentFeedLogs: serverData.recentFeedLogs.map(log => ({
      id: log.id,
      babyId: log.babyId,
      loggedByUserId: log.loggedByUserId,
      method: log.method,
      startedAt: new Date(log.startedAt),
      endedAt: parseDate(log.endedAt),
      durationMinutes: log.durationMinutes,
      amountMl: log.amountMl,
      isEstimated: log.isEstimated,
      endSide: log.endSide,
      notes: log.notes,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    })),
    recentSleepLogs: serverData.recentSleepLogs.map(log => ({
      id: log.id,
      babyId: log.babyId,
      loggedByUserId: log.loggedByUserId,
      startedAt: new Date(log.startedAt),
      endedAt: parseDate(log.endedAt),
      durationMinutes: log.durationMinutes,
      notes: log.notes,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    })),
    recentNappyLogs: serverData.recentNappyLogs.map(log => ({
      id: log.id,
      babyId: log.babyId,
      loggedByUserId: log.loggedByUserId,
      type: log.type,
      startedAt: new Date(log.startedAt),
      notes: log.notes,
      createdAt: new Date(log.createdAt),
      updatedAt: new Date(log.updatedAt),
    })),
    uiConfig: serverData.uiConfig,
  };
}

// ============================================================================
// Main Sync Functions
// ============================================================================

/**
 * Fetch initial sync data from server
 */
export async function fetchInitialSyncData(): Promise<InitialSyncResult> {
  try {
    const response = await fetch('/api/sync/initial', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store',
    });

    if (!response.ok) {
      const error = await response.text();
      return { success: false, error: `Failed to fetch initial sync data: ${error}` };
    }

    const serverData: ServerInitialSyncResponse = await response.json();
    const data = transformServerData(serverData);

    return { success: true, data };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error during fetch',
    };
  }
}

/**
 * Store initial sync data in IndexedDB
 */
export async function storeInitialSyncData(data: InitialSyncData): Promise<void> {
  // Update sync status to syncing
  await updateSyncStatus('user', 'syncing');
  await updateSyncStatus('babies', 'syncing');
  await updateSyncStatus('baby_access', 'syncing');
  await updateSyncStatus('feed_logs', 'syncing');
  await updateSyncStatus('sleep_logs', 'syncing');
  await updateSyncStatus('nappy_logs', 'syncing');
  await updateSyncStatus('ui_config', 'syncing');

  try {
    // Store user
    await saveLocalUser(data.user);
    await updateSyncStatus('user', 'complete');

    // Store babies
    await saveBabies(data.babies);
    await updateSyncStatus('babies', 'complete');

    // Store baby access
    await saveBabyAccess(data.babyAccess);
    await updateSyncStatus('baby_access', 'complete');

    // Store feed logs
    await saveFeedLogs(data.recentFeedLogs);
    await updateSyncStatus('feed_logs', 'complete');

    // Store sleep logs
    await saveSleepLogs(data.recentSleepLogs);
    await updateSyncStatus('sleep_logs', 'complete');

    // Store nappy logs
    await saveNappyLogs(data.recentNappyLogs);
    await updateSyncStatus('nappy_logs', 'complete');

    // Store UI config using LWW merge
    if (data.uiConfig && data.user.id) {
      await mergeUIConfig(
        data.user.id,
        data.uiConfig.data,
        data.uiConfig.keyUpdatedAt,
      );
    }
    await updateSyncStatus('ui_config', 'complete');
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    await updateSyncStatus('user', 'error', { errorMessage });
    throw error;
  }
}

/**
 * Perform initial sync (fetch + store)
 */
export async function performInitialSync(): Promise<InitialSyncResult> {
  const fetchResult = await fetchInitialSyncData();

  if (!fetchResult.success) {
    return fetchResult;
  }

  try {
    await storeInitialSyncData(fetchResult.data);
    return fetchResult;
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to store sync data',
    };
  }
}

/**
 * Check if initial sync is needed
 * Returns true if no local user data exists
 */
export async function needsInitialSync(clerkId: string): Promise<boolean> {
  const { getLocalUserByClerkId } = await import('@/lib/local-db');
  const localUser = await getLocalUserByClerkId(clerkId);
  return !localUser;
}
