---
last_verified_at: 2026-01-06T00:30:00Z
source_paths:
  - src/models/Schema.ts
  - src/actions/babyActions.ts
  - src/app/[locale]/(auth)/account/shared/page.tsx
  - src/app/[locale]/(auth)/account/shared/SharedBabyInvites.tsx
---

# Baby Sharing and Invite System

## Purpose
Token-based baby sharing system that allows baby owners to invite other users (by email) to access their baby's data with specific permission levels.

## Key Deviations from Standard
Unlike typical sharing systems, this implementation:
- **Email-based invites**: Invites sent to email, NOT to existing user IDs
- **Token expiration**: Invites expire after a set time (default: 7 days)
- **Pre-auth invites**: Can invite email addresses that don't have accounts yet
- **Invite acceptance flow**: Dedicated `/account/shared` route for reviewing pending invites
- **Access request system**: Separate flow for requesting access without invite token

This allows flexible sharing even when the recipient hasn't created an account yet.

## Implementation

### Database Schema
**Location:** `src/models/Schema.ts`

```typescript
export const babyInvitesSchema = pgTable('baby_invites', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').notNull().references(() => babiesSchema.id),
  inviterUserId: integer('inviter_user_id').notNull().references(() => userSchema.id),
  invitedEmail: text('invited_email').notNull(),
  invitedUserId: integer('invited_user_id').references(() => userSchema.id),
  accessLevel: accessLevelEnum('access_level').notNull().default('viewer'),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);
```

**Key Fields:**
- `invitedEmail`: Target email (may not match any user yet)
- `invitedUserId`: Filled when recipient creates account and accepts
- `token`: Unique UUID for invite URL (e.g., `/invite/abc123`)
- `expiresAt`: Hard expiration - invites cannot be accepted after this time
- `status`: Lifecycle tracking (pending → accepted/revoked/expired)

### Accepting Invites
**Location:** `src/actions/babyActions.ts` → `acceptInvite()`

**Flow:**
```typescript
1. Verify user is authenticated
2. Query invite by ID
3. Check: invite.status === 'pending'
4. Check: invite.expiresAt > now()
5. Check: invite.invitedEmail matches user's email
6. Check: User doesn't already have baby_access (prevent duplicates)
7. Create baby_access row with invited access level
8. Update invite status to 'accepted'
9. Update invite.invitedUserId to current user.id
10. If user has no defaultBabyId, set this baby as default
11. Revalidate dashboard and shared pages
12. Return success + baby details
```

**Validation:**
```typescript
// Invite must be pending
if (invite.status !== 'pending') {
  return { success: false, error: 'Invite already processed' };
}

// Invite must not be expired
if (invite.expiresAt < new Date()) {
  return { success: false, error: 'Invite has expired' };
}

// Email must match current user
if (invite.invitedEmail !== user.email) {
  return { success: false, error: 'Invite not for this email' };
}
```

### Shared Invites Page
**Location:** `src/app/[locale]/(auth)/account/shared/page.tsx`

**Purpose:** Display pending invites for user's email after first sign-up

**Query:**
```typescript
const invites = await db
  .select({
    id: babyInvitesSchema.id,
    babyName: babiesSchema.name,
    inviterEmail: inviterUser.email,
    inviterName: inviterUser.firstName,
    accessLevel: babyInvitesSchema.accessLevel,
    expiresAt: babyInvitesSchema.expiresAt,
  })
  .from(babyInvitesSchema)
  .innerJoin(babiesSchema, eq(babyInvitesSchema.babyId, babiesSchema.id))
  .innerJoin(userSchema, eq(babyInvitesSchema.inviterUserId, userSchema.id))
  .where(and(
    eq(babyInvitesSchema.invitedEmail, user.email),
    eq(babyInvitesSchema.status, 'pending'),
    sql`${babyInvitesSchema.expiresAt} > now()`
  ));
```

**UI Features:**
- Shows baby name, inviter name, access level, expiration time
- "Accept" button calls `acceptInvite()` server action
- "Skip for now" button redirects to onboarding (user can accept later)
- Visual confirmation when invite accepted

### Resolution Flow Integration
**Location:** `src/actions/babyActions.ts` → `resolveAccountContext()`

When user has no babies but has pending invites:
```typescript
if (babyAccess.length === 0) {
  const invites = await db.select(/* ... */)
    .where(and(
      eq(babyInvitesSchema.invitedEmail, localUser.email),
      eq(babyInvitesSchema.status, 'pending'),
      sql`${babyInvitesSchema.expiresAt} > now()`
    ));

  if (invites.length > 0) {
    return {
      success: true,
      user,
      nextStep: { type: 'shared', invites },
    };
  }
}
```

This ensures new users see their invites before being forced to create a baby.

## Patterns

### Creating Invites (Not Yet Implemented)
**Future Route:** `/settings/babies/share`

**Expected Flow:**
```typescript
// Server action: createInvite()
1. Verify user has 'owner' access to baby
2. Generate unique token (UUID)
3. Set expiration date (now + 7 days)
4. Insert into baby_invites table
5. Optional: Send email notification with invite link
6. Return invite token for sharing
```

**Invite URL Format:**
```
https://app.example.com/invite/{token}
```

### Revoking Invites (Not Yet Implemented)
**Future Feature:**
```typescript
// Server action: revokeInvite()
1. Verify user is inviter or baby owner
2. Update invite status to 'revoked'
3. Revalidate shared pages
```

### Access Requests (Not Yet Implemented)
**Future Feature:** Allow users to request access without invite token

**Flow:**
1. User navigates to `/request-access?babyId=123`
2. Creates `baby_access_requests` entry (status: pending)
3. Baby owner receives notification
4. Owner approves/denies via `/settings/babies/requests`
5. If approved, create `baby_access` row + notify requester

**Schema Table (Already Exists):**
```typescript
export const babyAccessRequestsSchema = pgTable('baby_access_requests', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').notNull().references(() => babiesSchema.id),
  requesterUserId: integer('requester_user_id').notNull().references(() => userSchema.id),
  status: sql`TEXT NOT NULL DEFAULT 'pending'`,
  requestMessage: text('request_message'),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedByUserId: integer('resolved_by_user_id').references(() => userSchema.id),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
});
```

## Gotchas

### Expired Invites in Database
Invites are NOT automatically deleted when they expire:
- `status` remains 'pending' even after `expiresAt`
- Queries MUST filter: `WHERE expiresAt > now() AND status = 'pending'`
- Prevents database from growing indefinitely with old invites

**Future:** Add cleanup job to mark old invites as 'expired'.

### Email Case Sensitivity
Email comparison should be case-insensitive:
```typescript
// ❌ WRONG: Case-sensitive match
invite.invitedEmail === user.email

// ✅ CORRECT: Case-insensitive match
invite.invitedEmail.toLowerCase() === user.email.toLowerCase()
```

Current implementation uses exact match - may need adjustment.

### Duplicate Access Prevention
`acceptInvite()` checks for existing `baby_access` before creating:
```typescript
const existingAccess = await db.select()
  .from(babyAccessSchema)
  .where(and(
    eq(babyAccessSchema.userId, localUser.id),
    eq(babyAccessSchema.babyId, invite.babyId)
  ))
  .limit(1);

if (existingAccess.length > 0) {
  return { success: false, error: 'You already have access to this baby' };
}
```

Without this check, unique constraint would throw error.

### Invite Acceptance Race Condition
If same invite accepted by multiple users simultaneously:
- First transaction succeeds, updates status to 'accepted'
- Second transaction fails `status === 'pending'` check
- Second user sees "Invite already processed" error

This is correct behavior - invites are single-use.

### Invites for Existing Users
If invited email already has an account:
- They don't receive invite until next sign-in (when resolution runs)
- No email notification sent (not implemented yet)
- Inviter has no way to know if invite was seen

**Future:** Implement email notifications for invite delivery.

## Related
- `.readme/chunks/account.resolution-flow.md` - How pending invites trigger shared flow
- `.readme/chunks/account.baby-multi-tenancy.md` - Access levels and baby_access table
- `.readme/chunks/database.schema-workflow.md` - baby_invites table schema
