---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PasskeyCodeModal.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/EmailInviteLinkModal.tsx
  - src/components/baby-access/JoinWithCodeSection.tsx
  - src/actions/babyActions.ts
---

# Baby Invite System

## Purpose
Provides two complementary methods for inviting caregivers: quick 6-digit passkey codes and formal email links with JWT tokens.

## Invite Types

### 1. Passkey Invites
- **Format:** 6-digit numeric code (e.g., `123456`)
- **Expiry:** 1 hour
- **Usage:** Single-use (consumed on acceptance)
- **Use case:** Quick sharing between caregivers in person
- **Storage:** `baby_invites` table with `inviteType: 'passkey'`

### 2. Email Invites
- **Format:** JWT link sent via email
- **Expiry:** 24 hours
- **Usage:** Single-use
- **Use case:** Formal invitation to remote caregivers
- **Storage:** `baby_invites` table with `inviteType: 'email'`
- **Status:** Currently hidden in UI (infrastructure ready, email sending not implemented)

## Key Implementation Patterns

### Invite Generation (Server Action)

```typescript
// src/actions/babyActions.ts
createBabyInvitePasskey(babyId, accessLevel)
```

**Flow:**
1. Validate user is owner of baby
2. Generate 6-digit code (loop until unique)
3. Insert into Postgres `baby_invites` table
4. **Return full invite object** (includes `id`, `code`, `createdAt`, `expiresAt`)
5. Component immediately stores in IndexedDB for reactive UI

**Why return the object:** Enables immediate UI feedback without waiting for next sync pull.

### Invite Storage Pattern

**Immediate IndexedDB Insert:**
```typescript
// After server action success
const invite = await createBabyInvitePasskey(babyId, 'editor');
if (invite.success) {
  await localDb.babyInvites.add({
    id: invite.invite.id,
    babyId: numericBabyId,
    code: invite.invite.code,
    inviteType: 'passkey',
    accessLevel: 'editor',
    status: 'pending',
    createdAt: new Date(invite.invite.createdAt),
    expiresAt: new Date(invite.invite.expiresAt),
  });
}
```

**Why immediate insert:** Enables reactive `useLiveQuery` UI updates without server round-trip.

### Invite Acceptance (Bootstrap or Settings)

**Component:** `JoinWithCodeSection.tsx`

**Flow:**
1. User enters 6-digit code in OTP input
2. Client validates length (6 digits)
3. Calls `acceptInviteByCode({ code })` server action
4. Server validates:
   - Code exists and not expired
   - Code not already used
   - User not already caregiver
5. Creates `baby_access` record
6. Marks invite as `status: 'accepted'`
7. Returns baby object
8. Client updates `useBabyStore` with new baby
9. **Redirects to bootstrap** (not back to previous page)

**Critical pattern:** Always redirect to `/account/bootstrap` after acceptance to trigger full data sync.

### Reusable Component Props

```typescript
type JoinWithCodeSectionProps = {
  redirectPath: string;        // Where to go after success
  onSuccess?: () => void;       // Optional callback before redirect
};
```

**Usage contexts:**
- Bootstrap (no baby): `redirectPath="/account/bootstrap"`
- Settings: `redirectPath="/settings/babies"`

## Compound Indexes

**Baby invites query:**
```typescript
localDb.babyInvites
  .where('[babyId+status]')
  .equals([babyId, 'pending'])
  .toArray();
```

**Why compound index:** Efficiently filter invites by baby AND status without full table scan.

## Error Handling

**Common errors:**
- "Invalid or expired code" - Code doesn't exist or past expiry
- "Invite already used" - Status is 'accepted' or 'revoked'
- "You already have access" - User already in `baby_access` for this baby
- "Baby not found" - Baby archived or deleted

**Display pattern:** Inline error above form, not toast notification (prevents interruption).

## Security Considerations

- Codes are numeric only (easier for mobile input)
- 1-hour expiry prevents long-term code sharing
- Single-use prevents replay attacks
- Owner-only creation (enforced in server action)
- Server validates all constraints (client validation is UX only)

## Related Files

**Server actions:**
- `src/actions/babyActions.ts` - `createBabyInvitePasskey`, `acceptInviteByCode`

**Components:**
- `src/components/baby-access/JoinWithCodeSection.tsx` - Reusable code acceptance
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx` - Owner invite creation UI
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PasskeyCodeModal.tsx` - Display generated code

**Database:**
- IndexedDB: `localDb.babyInvites` table
- Postgres: `baby_invites` table (see database schema)

## Gotchas

1. **Don't forget bootstrap redirect:** After accepting invite, MUST redirect to bootstrap (not back to join form) to sync all baby data.

2. **Immediate IndexedDB insert required:** If you don't insert immediately after server action, reactive UI won't update until next sync pull (poor UX).

3. **Compound index queries:** Always use `[babyId+status]` for pending invites, not separate filters (much faster).

4. **Email invites hidden:** UI exists but email sending not implemented - don't expose email invite button until email service added.
