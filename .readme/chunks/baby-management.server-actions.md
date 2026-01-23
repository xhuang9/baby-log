---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/actions/baby/index.ts
  - src/actions/baby/crud/create.ts
  - src/actions/baby/crud/update.ts
  - src/actions/baby/invites/create-passkey.ts
  - src/actions/baby/invites/accept-by-code.ts
  - src/actions/baby/caregivers/get.ts
  - src/actions/baby/access/verify.ts
conversation_context: "Created after refactoring babyActions.ts into modular baby/ folder structure."
---

# Baby Management Server Actions

## Purpose
Documents the server actions for baby management, organized into logical modules: CRUD operations, invite management, caregiver management, and access control. These are Next.js server actions that run on the server and handle database operations, validation, and authorization.

## Folder Structure

```
src/actions/baby/
├── index.ts                     # Barrel exports
├── types.ts                     # Result types
├── utils/
│   └── auth.ts                  # getAuthenticatedUser helper
├── account/
│   └── resolve-context.ts       # resolveAccountContext
├── crud/
│   ├── create.ts                # createBaby
│   ├── update.ts                # updateBaby
│   ├── get-babies.ts            # getUserBabies
│   └── set-default.ts           # setDefaultBaby
├── invites/
│   ├── create-passkey.ts        # createPasskeyInvite
│   ├── create-email.ts          # createEmailInvite
│   ├── accept-by-code.ts        # acceptInviteByCode
│   ├── accept-by-token.ts       # acceptInviteByToken
│   ├── accept-legacy.ts         # acceptInvite (legacy)
│   ├── revoke.ts                # revokeInvite
│   └── regenerate.ts            # regenerateInvite
├── caregivers/
│   ├── get.ts                   # getCaregivers
│   └── remove.ts                # removeCaregiver
└── access/
    └── verify.ts                # verifyBabyAccess
```

## Import Pattern

All actions are re-exported from the barrel index:

```typescript
import { createBaby, getUserBabies, acceptInviteByCode } from '@/actions/baby';

// All actions return standardized result types
const result = await createBaby({ name: 'Emma', dob: '2024-01-15' });
if (result.success) {
  console.log('Baby created:', result.baby);
} else {
  console.error('Error:', result.error);
}
```

## CRUD Operations (`crud/`)

### createBaby

Creates a new baby record and owner access record.

**Function signature:**
```typescript
'use server';
async function createBaby(input: {
  name: string;
  birthDate?: string | null;
  gender?: 'male' | 'female' | 'other' | null;
  birthWeightG?: number | null;
  caregiverLabel?: string | null;
}): Promise<CreateBabyResult>
```

**Process:**
1. Authenticate user via Clerk `auth()`
2. Validate input (name required)
3. Call operations layer: `createBaby(operationInput)`
4. Insert baby record in database
5. Create owner access record
6. Return baby data with access info

**Example:**
```typescript
const result = await createBaby({
  name: 'Emma',
  birthDate: '2024-01-15',
  gender: 'female',
  birthWeightG: 3200,
  caregiverLabel: 'Mommy',
});

if (result.success) {
  // result.baby contains full baby info
  setActiveBaby(result.baby);
}
```

### updateBaby

Updates an existing baby profile.

**Function signature:**
```typescript
'use server';
async function updateBaby(
  babyId: number,
  updates: Partial<{
    name: string;
    birthDate: string | null;
    gender: 'male' | 'female' | 'other' | null;
    birthWeightG: number | null;
    caregiverLabel: string | null;
  }>
): Promise<UpdateBabyResult>
```

**Process:**
1. Authenticate user
2. Verify user has owner or editor access
3. Call operations layer: `updateBabyProfile(babyId, updates)`
4. Update baby record in database
5. Return updated baby data

**Example:**
```typescript
const result = await updateBaby(1, {
  name: 'Emma Rose',
  birthWeightG: 3250,
});
```

### getUserBabies

Fetches all babies the user has access to.

**Function signature:**
```typescript
'use server';
async function getUserBabies(): Promise<GetUserBabiesResult>
```

**Process:**
1. Authenticate user
2. Query `baby_access` table for user's accessible babies
3. Join with `babies` table to get baby details
4. Return array of babies with access level

**Example:**
```typescript
const result = await getUserBabies();
if (result.success) {
  const babies = result.babies; // Array of { babyId, name, accessLevel, ... }
}
```

### setDefaultBaby

Sets a baby as the user's default.

**Function signature:**
```typescript
'use server';
async function setDefaultBaby(babyId: number): Promise<SetDefaultBabyResult>
```

**Process:**
1. Authenticate user
2. Verify user has access to baby
3. Update user's default baby in database
4. Return success

## Invite Management (`invites/`)

### createPasskeyInvite

Generates a 6-digit passkey code for sharing baby access.

**Function signature:**
```typescript
'use server';
async function createPasskeyInvite(input: {
  babyId: number;
  accessLevel?: 'editor' | 'viewer';
}): Promise<CreatePasskeyInviteResult>
```

**Process:**
1. Authenticate user
2. Verify user has owner access to baby
3. Generate 6-digit numeric code (crypto-random)
4. Hash code with bcrypt for database storage
5. Create invite record with 1-hour expiry
6. Return plain code (only time it's visible) and invite ID

**Example:**
```typescript
const result = await createPasskeyInvite({
  babyId: 1,
  accessLevel: 'editor',
});

if (result.success) {
  // result.code is the 6-digit code to share
  // result.expiresAt is when it expires
  console.log(`Share code: ${result.code}`);
}
```

### acceptInviteByCode

Accept an invite using a 6-digit passkey code.

**Function signature:**
```typescript
'use server';
async function acceptInviteByCode(input: {
  code: string;
}): Promise<AcceptInviteByCodeResult>
```

**Process:**
1. Authenticate user
2. Find pending invite with matching code hash (bcrypt compare)
3. Verify invite not expired
4. Verify user doesn't already have access
5. Create baby access record
6. Mark invite as accepted
7. Call operations layer to sync baby to IndexedDB
8. Return baby data

**Example:**
```typescript
const result = await acceptInviteByCode({ code: '123456' });
if (result.success) {
  setActiveBaby(result.baby);
  router.push('/overview');
}
```

### revokeInvite

Revoke a pending invite.

**Function signature:**
```typescript
'use server';
async function revokeInvite(input: {
  inviteId: number;
}): Promise<RevokeInviteResult>
```

**Process:**
1. Authenticate user
2. Verify user is the inviter or baby owner
3. Update invite status to 'revoked'
4. Return success

### regenerateInvite

Generate a new code/link for an existing invite.

**Function signature:**
```typescript
'use server';
async function regenerateInvite(input: {
  inviteId: number;
}): Promise<RegenerateInviteResult>
```

**Process:**
1. Authenticate user
2. Verify user owns the invite
3. Generate new code (passkey) or token (email)
4. Update invite record with new hash and expiry
5. Return new code/link

## Caregiver Management (`caregivers/`)

### getCaregivers

List all caregivers for a baby.

**Function signature:**
```typescript
'use server';
async function getCaregivers(babyId: number): Promise<GetCaregiversResult>
```

**Process:**
1. Authenticate user
2. Verify user has access to baby
3. Query baby_access table for all users with access
4. Join with users table to get caregiver details
5. Return array of caregivers with access levels

**Example:**
```typescript
const result = await getCaregivers(1);
if (result.success) {
  for (const caregiver of result.caregivers) {
    console.log(`${caregiver.email} - ${caregiver.accessLevel}`);
  }
}
```

### removeCaregiver

Remove a caregiver's access to a baby.

**Function signature:**
```typescript
'use server';
async function removeCaregiver(input: {
  babyId: number;
  userId: number;
}): Promise<RemoveCaregiverResult>
```

**Process:**
1. Authenticate user
2. Verify user is baby owner
3. Verify target user is not the owner
4. Delete baby_access record
5. Return success

## Access Control (`access/`)

### verifyBabyAccess

Verify if a user has access to a baby (used for access revocation detection).

**Function signature:**
```typescript
'use server';
async function verifyBabyAccess(babyId: number): Promise<VerifyBabyAccessResult>
```

**Process:**
1. Authenticate user
2. Check if baby exists
3. Check if user has baby_access record
4. Return { hasAccess: boolean, reason: string }

**Example:**
```typescript
const result = await verifyBabyAccess(1);
if (!result.hasAccess) {
  // Access revoked - clear local data
  await clearRevokedBabyData(1, user.localId);
}
```

## Authentication Helper (`utils/auth.ts`)

All actions use a shared authentication helper:

```typescript
async function getAuthenticatedUser() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Not authenticated');
  }

  const user = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.clerkId, userId))
    .limit(1);

  if (!user[0]) {
    throw new Error('User not found');
  }

  return user[0];
}
```

## Result Types

All actions return standardized result types:

```typescript
type CreateBabyResult =
  | { success: true; baby: Baby }
  | { success: false; error: string };

type AcceptInviteByCodeResult =
  | { success: true; baby: Baby }
  | { success: false; error: string };

type GetCaregiversResult =
  | { success: true; caregivers: Caregiver[] }
  | { success: false; error: string };
```

## Error Handling Pattern

All actions follow the same error handling pattern:

```typescript
'use server';
export async function actionName(input) {
  try {
    // 1. Authenticate
    const user = await getAuthenticatedUser();

    // 2. Validate input
    if (!input.required) {
      return { success: false, error: 'Field required' };
    }

    // 3. Check access/permissions
    const hasAccess = await checkAccess(user.id, input.babyId);
    if (!hasAccess) {
      return { success: false, error: 'Access denied' };
    }

    // 4. Perform operation
    const result = await performOperation();

    // 5. Return success
    return { success: true, data: result };
  } catch (error) {
    console.error('Action failed:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
```

## Integration with Operations Layer

Server actions often call the operations layer for client-side sync:

```typescript
'use server';
export async function createBaby(input) {
  const user = await getAuthenticatedUser();

  // Create in database
  const baby = await db.insert(babiesTable).values({...}).returning();

  // Call operations layer to sync to client
  const opResult = await createBaby({
    name: baby.name,
    birthDate: baby.birthDate,
  });

  return { success: true, baby };
}
```

This ensures IndexedDB stays in sync with the server.

## Related

- `.readme/chunks/local-first.operations-layer-pattern.md` - Client-side operations
- `.readme/chunks/baby-sharing.invite-system.md` - Invite system details
- `.readme/chunks/baby-management.caregivers.md` - Caregiver management
