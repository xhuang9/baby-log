# 02 Invite Generation and Acceptance

## Goal
Create server actions for invite lifecycle with Postgres-backed acceptance.

## Steps
1. Add invite helpers (new module):
   - Passkey generation (6-digit numeric).
   - Token hashing (sha256 or similar).
   - JWT signing for email invites.
2. Create server actions (new file or extend `src/actions/babyActions.ts`):
   - `createPasskeyInvite(babyId, accessLevel = 'editor', expiresIn = 1h)`.
   - `createEmailInvite(babyId, invitedEmail, accessLevel = 'editor', expiresIn = 24h)`.
   - `acceptInviteByCode(code)`.
   - `acceptInviteByToken(jwt)`.
   - `revokeInvite(inviteId)`.
3. Validation rules:
   - Only owners can create/revoke invites.
   - Invite must be `pending`, not expired, and within `maxUses`.
   - Email invites require logged-in email match.
   - Guard against duplicate access.
4. Use a DB transaction for acceptance:
   - Re-check invite status/expiry.
   - Insert `baby_access`.
   - Update invite `status`, `acceptedAt`, `invitedUserId`, `usesCount`.
5. Return values:
   - Passkey creation returns raw code once + metadata.
   - Email creation returns link (JWT) for copy or send.
6. Error handling:
   - Generic errors for invalid/expired codes.
   - Specific error for already having access.
