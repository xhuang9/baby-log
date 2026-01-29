/**
 * Bootstrap Types
 *
 * Shared types for the bootstrap API and client-side state machine.
 *
 * @see .readme/planning/02-offline-first-architecture.md
 */

import type { ActiveBaby } from '@/stores/useBabyStore';

// ============================================================================
// Bootstrap User
// ============================================================================

export type BootstrapUser = {
  id: number;
  clerkId: string;
  email: string | null;
  firstName: string | null;
  imageUrl: string | null;
  locked: boolean;
  defaultBabyId: number | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Bootstrap Entities
// ============================================================================

export type BootstrapBaby = {
  id: number;
  name: string;
  birthDate: string | null;
  gender: 'male' | 'female' | 'other' | 'unknown' | null;
  birthWeightG: number | null;
  archivedAt: string | null;
  ownerUserId: number;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapBabyAccess = {
  userId: number;
  babyId: number;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapInvite = {
  id: number;
  babyId: number;
  babyName: string;
  inviterEmail: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  expiresAt: string;
};

export type BootstrapBabyInvite = {
  id: number;
  babyId: number;
  inviterUserId: number;
  invitedEmail: string | null;
  invitedUserId: number | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  status: 'pending' | 'accepted' | 'revoked' | 'expired';
  inviteType: 'passkey' | 'email';
  tokenPrefix: string | null;
  expiresAt: string;
  acceptedAt: string | null;
  revokedAt: string | null;
  maxUses: number;
  usesCount: number;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapPendingRequest = {
  id: number;
  targetEmail: string;
  status: 'pending';
  message: string | null;
  createdAt: string;
};

// ============================================================================
// Log Types
// ============================================================================

export type BootstrapFeedLog = {
  id: string;
  babyId: number;
  loggedByUserId: number;
  method: string;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  amountMl: number | null;
  isEstimated: boolean;
  endSide: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapSleepLog = {
  id: string;
  babyId: number;
  loggedByUserId: number;
  startedAt: string;
  endedAt: string | null;
  durationMinutes: number | null;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

export type BootstrapNappyLog = {
  id: string;
  babyId: number;
  loggedByUserId: number;
  type: 'wee' | 'poo' | 'mixed' | 'dry' | 'clean' | null;
  colour: 'green' | 'yellow' | 'brown' | 'black' | 'red' | 'grey' | null;
  texture: 'veryRunny' | 'runny' | 'mushy' | 'mucusy' | 'solid' | 'littleBalls' | null;
  startedAt: string;
  notes: string | null;
  createdAt: string;
  updatedAt: string;
};

// ============================================================================
// Account State
// ============================================================================

export type AccountState
  = | { type: 'locked' }
    | { type: 'no_baby' }
    | { type: 'pending_request'; request: BootstrapPendingRequest }
    | { type: 'has_invites'; invites: BootstrapInvite[] }
    | { type: 'select_baby'; babies: ActiveBaby[] }
    | { type: 'ready'; activeBaby: ActiveBaby };

// ============================================================================
// Sync Data
// ============================================================================

export type BootstrapSyncData = {
  babies: BootstrapBaby[];
  babyAccess: BootstrapBabyAccess[];
  babyInvites?: BootstrapBabyInvite[];
  recentFeedLogs: BootstrapFeedLog[];
  recentSleepLogs: BootstrapSleepLog[];
  recentNappyLogs: BootstrapNappyLog[];
  uiConfig: null; // UI config is stored locally only for now
};

// ============================================================================
// API Response
// ============================================================================

export type BootstrapResponse = {
  user: BootstrapUser;
  accountState: AccountState;
  syncData: BootstrapSyncData;
  syncedAt: string;
};

export type BootstrapError = {
  error: string;
};

// ============================================================================
// State Machine States
// ============================================================================

export type BootstrapMachineState
  = | { status: 'init' }
    | { status: 'syncing' }
    | { status: 'offline_ok'; lastSyncedAt: string }
    | { status: 'no_session' }
    | { status: 'sync_error'; error: string; canRetry: boolean }
    | { status: 'validating' }
    | { status: 'locked' }
    | { status: 'no_baby' }
    | { status: 'pending_request'; request: BootstrapPendingRequest }
    | { status: 'has_invites'; invites: BootstrapInvite[] }
    | { status: 'select_baby'; babies: ActiveBaby[] }
    | { status: 'ready'; activeBaby: ActiveBaby };

export type BootstrapMachineAction
  = | { type: 'START_SYNC' }
    | { type: 'SYNC_SUCCESS'; response: BootstrapResponse }
    | { type: 'SYNC_ERROR'; error: string; canRetry?: boolean }
    | { type: 'USE_LOCAL_DATA'; lastSyncedAt: string }
    | { type: 'NO_SESSION' }
    | { type: 'RETRY' }
    | { type: 'SELECT_BABY'; baby: ActiveBaby }
    | { type: 'CREATE_BABY_SUCCESS'; baby: ActiveBaby }
    | { type: 'ACCEPT_INVITE_SUCCESS'; baby: ActiveBaby }
    | { type: 'GO_READY'; activeBaby: ActiveBaby };
