# Unit Test Plan: `src/actions/baby/`

## Overview

This document tracks the unit test implementation status for all server actions in the `src/actions/baby/` folder.

**Testing Framework:** Vitest
**Pattern:** Module-level mocks with dynamic imports via `loadSubject()`

---

## Progress Tracker

| File | Test File | Status | Priority |
|------|-----------|--------|----------|
| crud/create.ts | create.test.ts | ✅ Complete | - |
| crud/update.ts | update.test.ts | 🔲 Shell only | High |
| crud/get-babies.ts | - | 🔲 Not started | High |
| crud/set-default.ts | - | 🔲 Not started | Medium |
| access/verify.ts | - | 🔲 Not started | High |
| account/resolve-context.ts | - | 🔲 Not started | High |
| caregivers/get.ts | - | 🔲 Not started | Medium |
| caregivers/remove.ts | - | 🔲 Not started | Medium |
| invites/create-passkey.ts | create-passkey.test.ts | 🔲 Shell only | High |
| invites/create-email.ts | - | 🔲 Not started | High |
| invites/accept-by-code.ts | accept-by-code.test.ts | 🔲 Shell only | High |
| invites/accept-by-token.ts | - | 🔲 Not started | High |
| invites/accept-legacy.ts | - | 🔲 Not started | Low |
| invites/regenerate.ts | - | 🔲 Not started | Medium |
| invites/revoke.ts | - | 🔲 Not started | Medium |
| utils/auth.ts | - | 🔲 Not started | Low |

**Legend:** ✅ Complete | 🔲 Not started / Shell only

---

## Common Test Setup

All tests follow this pattern:

```typescript
import { beforeEach, describe, expect, it, vi } from 'vitest';

// Module-level mocks
vi.mock('@clerk/nextjs/server', () => ({
  auth: vi.fn(),
}));

vi.mock('@/lib/db', () => ({
  db: {
    insert: vi.fn(),
    update: vi.fn(),
    delete: vi.fn(),
    select: vi.fn(),
    query: {},
  },
}));

vi.mock('@/services/baby-access', () => ({
  getLocalUserByClerkId: vi.fn(),
  assertUserCanAccessBaby: vi.fn(),
  assertUserCanEditBaby: vi.fn(),
}));

vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Dynamic import helper
const loadSubject = async () => {
  const { functionName } = await import('./file');
  const { auth } = await import('@clerk/nextjs/server');
  const { db } = await import('@/lib/db');
  // ... other imports
  return { functionName, auth, db, ... };
};

describe('functionName', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  // Tests here
});
```

---

## Test Shells by File

### 1. `crud/update.ts` - `updateBaby`

**File:** `src/actions/baby/crud/update.test.ts`

```typescript
describe('updateBaby', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
      // Expected: { success: false, error: 'Not authenticated' }
    });
  });

  describe('authorization', () => {
    it('should fail when user cannot edit baby', async () => {
      // Test: assertUserCanEditBaby throws/returns error
      // Expected: { success: false, error: 'Permission denied' or similar }
    });
  });

  describe('baby profile updates', () => {
    it('should update baby name only', async () => {
      // Test: Provide only name in data
      // Verify: db.update called with babiesSchema, only name in set()
      // Verify: writeSyncEvent called with correct payload
    });

    it('should update baby with all profile fields', async () => {
      // Test: Provide name, birthDate, gender, birthWeightG
      // Verify: All fields passed to db.update
    });

    it('should handle null values for optional fields', async () => {
      // Test: birthDate: null, gender: null
      // Verify: null values properly passed through
    });
  });

  describe('caregiver label updates', () => {
    it('should update caregiver label without baby fields', async () => {
      // Test: Provide only caregiverLabel in data
      // Verify: babyAccessSchema updated, babiesSchema NOT updated
    });

    it('should update both baby profile and caregiver label', async () => {
      // Test: Provide name AND caregiverLabel
      // Verify: Both schemas updated
    });
  });

  describe('sync events', () => {
    it('should write sync event after baby profile update', async () => {
      // Test: Update baby name
      // Verify: writeSyncEvent called with op: 'update', correct payload
    });

    it('should NOT write sync event for caregiver-only updates', async () => {
      // Test: Update only caregiverLabel
      // Verify: writeSyncEvent NOT called (caregiver label is user-specific)
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate overview path after update', async () => {
      // Verify: revalidatePath('/overview') called
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db.update throws error
      // Expected: { success: false, error: error.message }
    });
  });
});
```

---

### 2. `crud/get-babies.ts` - `getUserBabies`

**File:** `src/actions/baby/crud/get-babies.test.ts`

```typescript
describe('getUserBabies', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
      // Expected: { success: false, error: 'Not authenticated' }
    });

    it('should fail when user not found in database', async () => {
      // Test: getLocalUserByClerkId returns not found
      // Expected: { success: false, error: 'User not found' }
    });
  });

  describe('fetching babies', () => {
    it('should return empty array when user has no babies', async () => {
      // Test: db query returns empty array
      // Expected: { success: true, babies: [] }
    });

    it('should return babies user has access to', async () => {
      // Test: db query returns multiple babies
      // Verify: Correct structure with babyId, name, accessLevel, caregiverLabel
    });

    it('should exclude archived babies', async () => {
      // Test: Some babies have archivedAt set
      // Verify: Archived babies not in result (SQL filter: archivedAt IS NULL)
    });

    it('should sort by lastAccessedAt descending', async () => {
      // Test: Multiple babies with different access times
      // Verify: Most recently accessed baby first
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db query throws error
      // Expected: { success: false, error: error.message }
    });
  });
});
```

---

### 3. `crud/set-default.ts` - `setDefaultBaby`

**File:** `src/actions/baby/crud/set-default.test.ts`

```typescript
describe('setDefaultBaby', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('authorization', () => {
    it('should fail when user cannot access baby', async () => {
      // Test: assertUserCanAccessBaby throws
    });
  });

  describe('setting default baby', () => {
    it('should update user defaultBabyId', async () => {
      // Verify: db.update(userSchema).set({ defaultBabyId: babyId })
    });

    it('should update lastAccessedAt on babyAccess', async () => {
      // Verify: db.update(babyAccessSchema) with new lastAccessedAt
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate multiple paths', async () => {
      // Verify: revalidatePath called for /overview and other paths
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db.update throws
    });
  });
});
```

---

### 4. `access/verify.ts` - `verifyBabyAccess`

**File:** `src/actions/baby/access/verify.test.ts`

```typescript
describe('verifyBabyAccess', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });

    it('should fail when user not found', async () => {
      // Test: getLocalUserByClerkId returns error
    });
  });

  describe('access verification', () => {
    it('should return owner access level', async () => {
      // Test: User is owner of baby
      // Expected: { success: true, accessLevel: 'owner' }
    });

    it('should return editor access level', async () => {
      // Test: User has editor access
      // Expected: { success: true, accessLevel: 'editor' }
    });

    it('should return viewer access level', async () => {
      // Test: User has viewer access
      // Expected: { success: true, accessLevel: 'viewer' }
    });

    it('should fail when user has no access', async () => {
      // Test: No babyAccess record exists
      // Expected: { success: false, error: 'Access denied' or similar }
    });

    it('should fail for archived babies', async () => {
      // Test: Baby has archivedAt set
      // Expected: Access denied
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db query throws
    });
  });
});
```

---

### 5. `account/resolve-context.ts` - `resolveAccountContext`

**File:** `src/actions/baby/account/resolve-context.test.ts`

```typescript
describe('resolveAccountContext', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('user states', () => {
    it('should return "locked" when user account is locked', async () => {
      // Test: user.locked = true
      // Expected: { nextStep: 'locked' }
    });

    it('should return "onboarding" for new user with no babies', async () => {
      // Test: No babies, no invites, no access requests
      // Expected: { nextStep: 'onboarding' }
    });

    it('should return "overview" when user has default baby', async () => {
      // Test: user.defaultBabyId is set and baby exists
      // Expected: { nextStep: 'overview', baby: {...} }
    });

    it('should return "select" when user has babies but no default', async () => {
      // Test: User has baby access but no defaultBabyId
      // Expected: { nextStep: 'select' }
    });
  });

  describe('invite handling', () => {
    it('should return pending invites for the user', async () => {
      // Test: User has pending invites by email
      // Verify: invites array populated with correct structure
    });

    it('should handle shared invites (passkey type)', async () => {
      // Test: Passkey invites exist
      // Verify: Included in invites array
    });
  });

  describe('access requests', () => {
    it('should return "requestAccess" when user has pending requests', async () => {
      // Test: User has access requests in pending state
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db query throws
    });
  });
});
```

---

### 6. `caregivers/get.ts` - `getCaregivers`

**File:** `src/actions/baby/caregivers/get.test.ts`

```typescript
describe('getCaregivers', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });

    it('should fail when user not found', async () => {
      // Test: getLocalUserByClerkId returns error
    });
  });

  describe('fetching caregivers', () => {
    it('should return empty array when no caregivers', async () => {
      // Test: No babyAccess records for baby
      // Expected: { success: true, caregivers: [] }
    });

    it('should return all caregivers with access to baby', async () => {
      // Test: Multiple caregivers with different access levels
      // Verify: Each has userId, email, accessLevel, caregiverLabel, isCurrentUser
    });

    it('should mark current user correctly', async () => {
      // Test: Current user is in caregiver list
      // Verify: isCurrentUser: true for current user only
    });

    it('should include email from user record', async () => {
      // Test: Caregivers have email addresses
      // Verify: email field populated from userSchema join
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db query throws
    });
  });
});
```

---

### 7. `caregivers/remove.ts` - `removeCaregiver`

**File:** `src/actions/baby/caregivers/remove.test.ts`

```typescript
describe('removeCaregiver', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      // Test: Current user has editor/viewer access, not owner
      // Expected: { success: false, error: 'Only owner can remove' }
    });
  });

  describe('validation', () => {
    it('should fail with invalid input', async () => {
      // Test: Invalid babyId or userId (Zod validation)
    });

    it('should fail when trying to remove self', async () => {
      // Test: userId matches current user
      // Expected: { success: false, error: 'Cannot remove yourself' }
    });

    it('should fail when trying to remove owner', async () => {
      // Test: Target user is the owner
      // Expected: { success: false, error: 'Cannot remove owner' }
    });

    it('should fail when caregiver not found', async () => {
      // Test: No babyAccess record for userId
      // Expected: { success: false, error: 'Caregiver not found' }
    });
  });

  describe('removing caregiver', () => {
    it('should delete babyAccess record', async () => {
      // Verify: db.delete(babyAccessSchema).where(...) called
    });

    it('should clear defaultBabyId if it matches removed baby', async () => {
      // Test: Removed user had this baby as default
      // Verify: db.update(userSchema).set({ defaultBabyId: null })
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate caregivers path', async () => {
      // Verify: revalidatePath called
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db.delete throws
    });
  });
});
```

---

### 8. `invites/create-passkey.ts` - `createPasskeyInvite`

**File:** `src/actions/baby/invites/create-passkey.test.ts`

```typescript
vi.mock('@/lib/invites/invite-helpers', () => ({
  generatePasskey: vi.fn(),
  generateTokenPrefix: vi.fn(),
  getPasskeyExpiryDate: vi.fn(),
  hashToken: vi.fn(),
}));

describe('createPasskeyInvite', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });

    it('should fail when user not found', async () => {
      // Test: getLocalUserByClerkId returns error
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner of baby', async () => {
      // Test: User has non-owner access level
      // Expected: { success: false, error: 'Only owner can create invites' }
    });
  });

  describe('validation', () => {
    it('should fail with invalid babyId', async () => {
      // Test: Invalid babyId (Zod validation)
    });

    it('should use default access level when not provided', async () => {
      // Verify: accessLevel defaults to 'viewer' or similar
    });

    it('should use default expiry when not provided', async () => {
      // Verify: expiresInHours defaults correctly
    });
  });

  describe('invite creation', () => {
    it('should create invite with hashed passkey', async () => {
      // Test: generatePasskey returns '123456'
      // Verify: hashToken called with passkey
      // Verify: db.insert called with hashed value, NOT plain passkey
    });

    it('should return plain passkey code only once', async () => {
      // Verify: Response contains { code: '123456' } for user to share
    });

    it('should set correct expiry date', async () => {
      // Verify: getPasskeyExpiryDate called with expiresInHours
      // Verify: expiresAt set in database record
    });

    it('should set invite type as passkey', async () => {
      // Verify: inviteType: 'passkey' in database record
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate invites path', async () => {
      // Verify: revalidatePath called
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db.insert throws
    });
  });
});
```

---

### 9. `invites/create-email.ts` - `createEmailInvite`

**File:** `src/actions/baby/invites/create-email.test.ts`

```typescript
vi.mock('@/lib/invites/invite-helpers', () => ({
  createEmailInviteJWT: vi.fn(),
  getEmailInviteExpiryDate: vi.fn(),
  hashToken: vi.fn(),
}));

describe('createEmailInvite', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      // Test: User has non-owner access
    });
  });

  describe('validation', () => {
    it('should fail with invalid email format', async () => {
      // Test: invitedEmail is not a valid email
    });

    it('should fail when inviting existing caregiver', async () => {
      // Test: Email already has access to baby
      // Expected: { success: false, error: 'Already a caregiver' }
    });
  });

  describe('invite creation', () => {
    it('should create placeholder then update with JWT', async () => {
      // Verify: db.insert called first
      // Verify: createEmailInviteJWT called with inviteId
      // Verify: db.update called with hashed JWT
    });

    it('should return invite URL with token', async () => {
      // Verify: Response contains URL with JWT token
    });

    it('should set invitedEmail on record', async () => {
      // Verify: invitedEmail stored for validation on accept
    });
  });

  describe('error handling', () => {
    it('should handle database errors gracefully', async () => {
      // Test: db operations throw
    });
  });
});
```

---

### 10. `invites/accept-by-code.ts` - `acceptInviteByCode`

**File:** `src/actions/baby/invites/accept-by-code.test.ts`

```typescript
vi.mock('@/lib/invites/invite-helpers', () => ({
  hashToken: vi.fn(),
}));

vi.mock('@/lib/db/helpers/sync-events', () => ({
  getLatestSyncCursor: vi.fn(),
}));

describe('acceptInviteByCode', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('validation', () => {
    it('should fail with invalid code format', async () => {
      // Test: Code is not 6 digits
    });
  });

  describe('invite lookup', () => {
    it('should fail with generic error for non-existent code', async () => {
      // Test: No invite matches hashed code
      // Expected: Generic error (security - don't reveal if code exists)
    });

    it('should fail for expired invite', async () => {
      // Test: Invite expiresAt is in past
      // Expected: { success: false, error: 'Invite expired or invalid' }
    });

    it('should fail for already accepted invite', async () => {
      // Test: Invite status is not 'pending'
    });
  });

  describe('accepting invite', () => {
    it('should create babyAccess record for user', async () => {
      // Verify: db.insert(babyAccessSchema) with correct accessLevel
    });

    it('should update invite status to accepted', async () => {
      // Verify: db.update(babyInvitesSchema).set({ status: 'accepted', acceptedByUserId })
    });

    it('should set default baby for user', async () => {
      // Verify: db.update(userSchema).set({ defaultBabyId })
    });

    it('should use transaction for atomicity', async () => {
      // Verify: db.transaction used
    });

    it('should set sync cursor for new caregiver', async () => {
      // Verify: getLatestSyncCursor called
      // Verify: syncCursor set on babyAccess record
    });
  });

  describe('error handling', () => {
    it('should rollback transaction on error', async () => {
      // Test: Error during transaction
      // Verify: No partial state
    });
  });
});
```

---

### 11. `invites/accept-by-token.ts` - `acceptInviteByToken`

**File:** `src/actions/baby/invites/accept-by-token.test.ts`

```typescript
vi.mock('@/lib/invites/invite-helpers', () => ({
  verifyEmailInviteJWT: vi.fn(),
  hashToken: vi.fn(),
}));

describe('acceptInviteByToken', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('JWT validation', () => {
    it('should fail with invalid JWT', async () => {
      // Test: verifyEmailInviteJWT throws
      // Expected: Generic error message
    });

    it('should fail with expired JWT', async () => {
      // Test: JWT expiry in past
    });
  });

  describe('email verification', () => {
    it('should fail when user email does not match invite', async () => {
      // Test: JWT contains email different from current user
      // Expected: { success: false, error: 'Email mismatch' }
    });

    it('should succeed when emails match', async () => {
      // Test: User email matches invitedEmail
    });
  });

  describe('accepting invite', () => {
    it('should create babyAccess record', async () => {
      // Similar to accept-by-code
    });

    it('should update invite status', async () => {
      // Similar to accept-by-code
    });

    it('should use transaction', async () => {
      // Verify atomicity
    });
  });
});
```

---

### 12. `invites/revoke.ts` - `revokeInvite`

**File:** `src/actions/baby/invites/revoke.test.ts`

```typescript
describe('revokeInvite', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      // Test: User does not own the baby associated with invite
    });
  });

  describe('validation', () => {
    it('should fail when invite not found', async () => {
      // Test: No invite with given ID
    });

    it('should fail when invite is not pending', async () => {
      // Test: Invite status is 'accepted' or 'revoked'
      // Expected: { success: false, error: 'Can only revoke pending invites' }
    });
  });

  describe('revoking invite', () => {
    it('should update invite status to revoked', async () => {
      // Verify: db.update(babyInvitesSchema).set({ status: 'revoked' })
    });
  });

  describe('cache revalidation', () => {
    it('should revalidate invites path', async () => {
      // Verify: revalidatePath called
    });
  });
});
```

---

### 13. `invites/regenerate.ts` - `regenerateInvite`

**File:** `src/actions/baby/invites/regenerate.test.ts`

```typescript
describe('regenerateInvite', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('authorization', () => {
    it('should fail when user is not owner', async () => {
      // Test: User does not own the baby
    });
  });

  describe('validation', () => {
    it('should fail when invite not found', async () => {
      // Test: No invite with given ID
    });
  });

  describe('regenerating passkey invite', () => {
    it('should revoke old invite and create new passkey', async () => {
      // Test: Original invite was passkey type
      // Verify: Old invite set to 'revoked'
      // Verify: New passkey invite created
      // Verify: Returns new code
    });
  });

  describe('regenerating email invite', () => {
    it('should revoke old invite and create new email invite', async () => {
      // Test: Original invite was email type
      // Verify: Old invite revoked
      // Verify: New email invite created with same invitedEmail
      // Verify: Returns new token/URL
    });
  });

  describe('atomicity', () => {
    it('should use transaction for regeneration', async () => {
      // Verify: db.transaction used
    });
  });
});
```

---

### 14. `invites/accept-legacy.ts` - `acceptInvite`

**File:** `src/actions/baby/invites/accept-legacy.test.ts`

```typescript
describe('acceptInvite (legacy)', () => {
  describe('authentication', () => {
    it('should fail when not authenticated', async () => {
      // Test: auth() returns null userId
    });
  });

  describe('invite lookup', () => {
    it('should fail when invite not found', async () => {
      // Test: No invite with given ID
    });

    it('should fail for expired invite', async () => {
      // Test: Invite expiresAt in past
    });

    it('should fail for non-pending invite', async () => {
      // Test: Invite already accepted/revoked
    });
  });

  describe('accepting invite', () => {
    it('should create babyAccess and update invite', async () => {
      // Basic happy path
    });
  });

  // Note: Legacy endpoint, lower test priority
});
```

---

### 15. `utils/auth.ts` - `getAuthenticatedUser`

**File:** `src/actions/baby/utils/auth.test.ts`

```typescript
describe('getAuthenticatedUser', () => {
  it('should return null when not authenticated', async () => {
    // Test: auth() returns null userId
    // Expected: null or error result
  });

  it('should return local user when authenticated', async () => {
    // Test: auth() returns userId, getLocalUserByClerkId succeeds
    // Expected: User object
  });

  it('should handle user not found in database', async () => {
    // Test: Clerk auth succeeds but no local user
    // Expected: Appropriate error/null
  });
});
```

---

## Implementation Order (Recommended)

### Phase 1: Core CRUD Operations
1. `crud/update.ts` - Already has shell
2. `crud/get-babies.ts` - Simple query
3. `crud/set-default.ts` - Simple mutation

### Phase 2: Access & Account
4. `access/verify.ts` - Critical for authorization
5. `account/resolve-context.ts` - Complex but important

### Phase 3: Caregiver Management
6. `caregivers/get.ts`
7. `caregivers/remove.ts`

### Phase 4: Invite System
8. `invites/create-passkey.ts` - Has shell
9. `invites/create-email.ts`
10. `invites/accept-by-code.ts` - Has shell
11. `invites/accept-by-token.ts`
12. `invites/revoke.ts`
13. `invites/regenerate.ts`
14. `invites/accept-legacy.ts` - Low priority

### Phase 5: Utilities
15. `utils/auth.ts` - Simple helper

---

## Notes

- **Run tests:** `npm run test -- src/actions/baby/`
- **Run single file:** `npm run test -- src/actions/baby/crud/update.test.ts`
- **Watch mode:** `npm run test -- --watch`

### Common Gotchas
1. Drizzle mock chains: `db.insert().values().returning()` - each method needs mock
2. Transaction mocks: Need to mock `db.transaction` callback execution
3. Clerk auth: Always mock both `auth()` and `getLocalUserByClerkId`
4. Date comparisons: Use `expect.any(Date)` for timestamps
