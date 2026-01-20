# 01 Schema and Migrations

## Goal
Extend baby_invites to support passkey and email invites securely.

## Steps
1. Update `src/models/Schema.ts`:
   - Add invite_type_enum.
   - Add columns to `baby_invites`: `inviteType`, `tokenHash`, `tokenPrefix`, `acceptedAt`, `revokedAt`, `maxUses`, `usesCount`.
   - Make `invitedEmail` nullable for passkey invites.
   - Add indexes for `tokenHash` and `(babyId, status)`.
2. Create a migration:
   - Create enum, alter table, and add indexes.
   - Backfill existing rows: `inviteType = 'email'`, `usesCount = 0`, `maxUses = 1`.
3. Decide token storage policy:
   - Passkeys stored as hash + prefix only.
   - JWT jti stored as hash; raw token never persisted.
4. Verify constraints and defaults:
   - `expiresAt` required (passkey 1 hour, email 24 hours).
   - `status` defaults to `pending`.
