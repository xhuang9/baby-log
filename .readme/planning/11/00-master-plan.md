# Baby Sharing Master Plan (Invites + Access Requests)

This is the single entry point for baby sharing work. Sub-plans in this folder
provide the detailed execution steps.

## Product Decisions (Confirmed)
- Default invite access level: **Collaborator** (maps to `editor` in DB).
- Passkey format: **6-digit numeric**, **1 hour** expiry, single-use.
- Email invite: **JWT link**, **24 hours** expiry.
- Invite token persistence: **temporary cookie** across sign-in.

## Scope
- Access requests (request -> approve/reject).
- Invites (passkey + email) with Postgres-backed acceptance.
- Caregiver access management (revoke, optional role change).
- Bootstrap entry points for invite acceptance.

## Access Levels (DB)
- owner: full control (edit baby, manage sharing, archive).
- editor: edit logs + baby details (UI label: Collaborator).
- viewer: read-only.

## Baseline (Already in Code)
- `baby_invites` table with `token` + `expiresAt`.
- Bootstrap checks pending invites by email.
- `acceptInvite(inviteId)` exists (needs to be expanded).
- Bootstrap invite list UI exists.

## User Flows
1. Owner creates invite on baby settings (passkey or email).
2. Invitee joins:
   - Passkey on bootstrap when no baby.
   - Email link -> sign-in -> bootstrap accepts token.
3. Owner manages caregivers and revokes invites/access.
4. Access requests:
   - Requester submits from bootstrap (no baby) and sees pending state.
   - Owner approves/rejects in sharing UI; requester gains access on next bootstrap.

## Execution Order (by file)
1. 01-schema-and-migrations.md
2. 02-invite-generation-and-acceptance.md
3. 03-bootstrap-join-code.md
4. 04-email-invite-token-flow.md
5. 05-sharing-ui-and-caregiver-management.md
6. 06-access-requests-ui-and-approval.md
7. 07-tests-and-validation.md
8. 90-review-scope.md
9. 99-docs-architect-tasks.md

## Definition of Done
- Owners can create passkey + email invites (default Collaborator access).
- Invitees can accept passkey during bootstrap and email link after sign-in.
- Owners can revoke invites and remove caregiver access.
- Access requests work end-to-end with approve/reject + cancel.
- Bootstrap/local stores reflect new access on next sync.
