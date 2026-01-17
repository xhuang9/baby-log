---
last_verified_at: 2026-01-17T11:12:21Z
source_paths:
  - src/models/Schema.ts
  - src/actions/babyActions.ts
  - src/actions/accessRequestActions.ts
  - src/app/[locale]/api/bootstrap/route.ts
  - src/app/[locale]/(auth)/account/bootstrap/page.tsx
  - src/app/[locale]/(auth)/account/bootstrap/states/BootstrapInvites.tsx
  - src/app/[locale]/(auth)/account/bootstrap/states/BootstrapPendingRequest.tsx
  - src/types/bootstrap.ts
---

# Baby Sharing and Access Requests

## Purpose
Email-based sharing system that lets baby owners invite caregivers and lets caregivers request access when no invite exists. The bootstrap flow surfaces pending invites or requests before onboarding.

## Key Deviations from Standard
Unlike typical sharing systems, this implementation:
- **Email-based invites**: Invites sent to email, NOT to existing user IDs
- **Token storage**: Invites store a token, but current acceptance uses invite IDs from bootstrap
- **Pre-auth invites**: Can invite email addresses that don't have accounts yet
- **Bootstrap gating**: Post-login flow shows pending invites or requests before onboarding
- **Request-first flow**: Access requests are tied to target email, not to a specific baby

This allows flexible sharing even when the recipient hasn't created an account yet.

## Implementation

### Database Schema
**Location:** `src/models/Schema.ts`

```typescript
export const babyInvitesSchema = pgTable('baby_invites', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  inviterUserId: integer('inviter_user_id').references(() => userSchema.id).notNull(),
  invitedEmail: text('invited_email').notNull(),
  invitedUserId: integer('invited_user_id').references(() => userSchema.id),
  accessLevel: accessLevelEnum('access_level').notNull().default('viewer'),
  status: inviteStatusEnum('status').notNull().default('pending'),
  token: text('token').notNull().unique(),
  expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const inviteStatusEnum = pgEnum('invite_status', [
  'pending',
  'accepted',
  'revoked',
  'expired',
]);

export const babyAccessRequestsSchema = pgTable('baby_access_requests', {
  id: serial('id').primaryKey(),
  requesterUserId: integer('requester_user_id').references(() => userSchema.id).notNull(),
  targetEmail: text('target_email').notNull(),
  targetUserId: integer('target_user_id').references(() => userSchema.id),
  requestedAccessLevel: accessLevelEnum('requested_access_level').notNull().default('viewer'),
  message: text('message'),
  status: accessRequestStatusEnum('status').notNull().default('pending'),
  resolvedBabyId: integer('resolved_baby_id').references(() => babiesSchema.id),
  resolvedByUserId: integer('resolved_by_user_id').references(() => userSchema.id),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true }),
});

export const accessRequestStatusEnum = pgEnum('access_request_status_enum', [
  'pending',
  'approved',
  'rejected',
  'canceled',
]);
```

**Key Fields:**
- `invitedEmail`: Target email (may not match any user yet)
- `invitedUserId`: Filled when recipient creates account and accepts
- `token`: Reserved for deep-link invite URLs (not wired yet)
- `expiresAt`: Hard expiration - invites cannot be accepted after this time
- `status`: Lifecycle tracking (pending → accepted/revoked/expired)
- `targetEmail`: Request recipient (normalized lower-case)
- `resolvedBabyId`: Baby chosen by owner when approving a request
- `status`: `pending` → `approved`/`rejected`/`canceled`

### Accepting Invites
**Location:** `src/actions/babyActions.ts` → `acceptInvite()`

**Flow:**
```typescript
1. Verify user is authenticated
2. Query invite by ID
3. Check: invite.status === 'pending'
4. Check: invite.expiresAt > now()
5. Check: User doesn't already have baby_access (prevent duplicates)
6. Create baby_access row with invited access level
7. Update invite status to 'accepted' + invitedUserId
8. If user has no defaultBabyId, set this baby as default
9. Revalidate overview
10. Return success + baby details
```

**Note:** Email matching is enforced by the bootstrap invite query. `acceptInvite()` itself does not re-check invitedEmail.

### Bootstrap Flow Integration
**Location:** `src/app/[locale]/api/bootstrap/route.ts`

**Behavior:**
- If user has **no baby access** and has an **outgoing request**, return `accountState.type = pending_request`.
- If user has **no baby access** and has **incoming requests or invites**, return `accountState.type = has_invites` with invite list.

**Client UI:**
- `BootstrapInvites` shows invite cards with accept action.
- `BootstrapPendingRequest` shows request status and a cancel button (still TODO).

## Patterns

### Access Request Actions (Implemented)
**Location:** `src/actions/accessRequestActions.ts`

- `createAccessRequest` (requester)
- `listOutgoingRequests` (requester)
- `listIncomingRequests` (owner)
- `cancelAccessRequest` (requester)
- `approveAccessRequest` (owner; creates `baby_access`)
- `rejectAccessRequest` (owner)

Approvals require owner access to the selected baby and create `baby_access` rows.

### Invite Creation (Not Yet Implemented)
Expected server action: `createInvite()`

**Expected Flow:**
```typescript
// Server action: createInvite()
1. Verify user has 'owner' access to baby
2. Generate unique token (UUID)
3. Set expiration date (now + N days)
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

## Gotchas

### Expired Invites in Database
Invites are NOT automatically deleted when they expire:
- `status` remains 'pending' even after `expiresAt`
- Queries MUST filter: `WHERE expiresAt > now() AND status = 'pending'`
- Prevents database from growing indefinitely with old invites

**Future:** Add cleanup job to mark old invites as 'expired'.

### Invite Ownership Validation
`acceptInvite()` does not verify invitedEmail. It assumes the invite list was filtered by email in bootstrap.

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

### Pending Requests Without UI
Incoming requests only affect `accountState.type`, but invite data is the only payload. Owner-facing approvals still need a settings UI.

## Related
- `.readme/chunks/account.bootstrap-unified-flow.md` - Bootstrap account state machine
- `.readme/chunks/account.baby-multi-tenancy.md` - Access levels and baby_access table
- `.readme/planning/11-baby-access-requests.md` - Implementation plan for full sharing UI
