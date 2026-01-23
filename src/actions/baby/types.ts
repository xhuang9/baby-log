/**
 * Baby Actions Types
 *
 * Shared result types for baby server actions.
 */

import type { ActiveBaby } from '@/stores/useBabyStore';
import type { StoredUser } from '@/stores/useUserStore';

/**
 * Result type for resolving account context
 */
export type ResolveAccountResult = {
  success: true;
  user: StoredUser;
  nextStep:
    | { type: 'locked' }
    | { type: 'requestAccess' }
    | { type: 'shared'; invites: Array<{ id: number; babyName: string; inviterEmail: string }> }
    | { type: 'onboarding' }
    | { type: 'select'; babies: Array<ActiveBaby> }
    | { type: 'overview'; baby: ActiveBaby };
} | {
  success: false;
  error: string;
};

/**
 * Result type for creating a baby
 */
export type CreateBabyResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

/**
 * Result type for accepting an invite (legacy)
 */
export type AcceptInviteResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

/**
 * Result type for updating a baby
 */
export type UpdateBabyResult
  = | { success: true }
    | { success: false; error: string };

/**
 * Result type for getting user babies
 */
export type GetUserBabiesResult
  = | { success: true; babies: ActiveBaby[] }
    | { success: false; error: string };

/**
 * Result type for setting default baby
 */
export type SetDefaultBabyResult
  = | { success: true; baby: ActiveBaby }
    | { success: false; error: string };

/**
 * Result type for creating a passkey invite
 */
export type CreatePasskeyInviteResult
  = | { success: true; code: string; expiresAt: Date; inviteId: number }
    | { success: false; error: string };

/**
 * Result type for creating an email invite
 */
export type CreateEmailInviteResult
  = | { success: true; inviteLink: string; expiresAt: Date; inviteId: number }
    | { success: false; error: string };

/**
 * Result type for accepting invite by code
 */
export type AcceptInviteByCodeResult
  = | { success: true; baby: ActiveBaby; initialSyncCursor: number }
    | { success: false; error: string };

/**
 * Result type for accepting invite by token
 */
export type AcceptInviteByTokenResult
  = | { success: true; baby: ActiveBaby; initialSyncCursor: number }
    | { success: false; error: string };

/**
 * Result type for revoking an invite
 */
export type RevokeInviteResult
  = | { success: true }
    | { success: false; error: string };

/**
 * Result type for regenerating an invite
 */
export type RegenerateInviteResult
  = | { success: true; inviteType: 'passkey'; code: string; expiresAt: Date; inviteId: number }
    | { success: true; inviteType: 'email'; inviteLink: string; expiresAt: Date; inviteId: number }
    | { success: false; error: string };

/**
 * Result type for removing a caregiver
 */
export type RemoveCaregiverResult
  = | { success: true }
    | { success: false; error: string };

/**
 * Caregiver info for display
 */
export type Caregiver = {
  userId: number;
  email: string | null;
  firstName: string | null;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
  lastAccessedAt: string | null;
  isCurrentUser: boolean;
};

/**
 * Result type for getting caregivers
 */
export type GetCaregiversResult
  = | { success: true; caregivers: Caregiver[] }
    | { success: false; error: string };

/**
 * Result type for verifying baby access
 */
export type VerifyBabyAccessResult
  = | { success: true; hasAccess: true; accessLevel: 'owner' | 'editor' | 'viewer' }
    | { success: true; hasAccess: false; reason: 'no_access' | 'baby_not_found' }
    | { success: false; error: string };
