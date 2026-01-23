/**
 * Baby Actions
 *
 * Server actions for baby management, invites, and caregiver operations.
 */

// Access
export { verifyBabyAccess } from './access/verify';

// Account
export { resolveAccountContext } from './account/resolve-context';

// Caregivers
export { getCaregivers } from './caregivers/get';
export { removeCaregiver } from './caregivers/remove';
// CRUD
export { createBaby } from './crud/create';
export { getUserBabies } from './crud/get-babies';

export { setDefaultBaby } from './crud/set-default';
export { updateBaby } from './crud/update';
// Invites
export { acceptInviteByCode } from './invites/accept-by-code';
export { acceptInviteByToken } from './invites/accept-by-token';
export { acceptInvite } from './invites/accept-legacy';
export { createEmailInvite } from './invites/create-email';
export { createPasskeyInvite } from './invites/create-passkey';

export { regenerateInvite } from './invites/regenerate';
export { revokeInvite } from './invites/revoke';

// Types
export type {
  AcceptInviteByCodeResult,
  AcceptInviteByTokenResult,
  AcceptInviteResult,
  Caregiver,
  CreateBabyResult,
  CreateEmailInviteResult,
  CreatePasskeyInviteResult,
  GetCaregiversResult,
  GetUserBabiesResult,
  RegenerateInviteResult,
  RemoveCaregiverResult,
  ResolveAccountResult,
  RevokeInviteResult,
  SetDefaultBabyResult,
  UpdateBabyResult,
  VerifyBabyAccessResult,
} from './types';
