# 10 Tests and Validation

## Steps
1. Unit tests:
   - Invite actions (create passkey/email, accept by code/token, revoke).
   - Access removal and role changes.
2. Access request tests:
   - Create, cancel, approve, reject.
3. Bootstrap integration tests:
   - No baby + passkey acceptance -> ready state.
   - Email invite link -> sign-in -> acceptance -> access created.
4. UI tests:
   - Sharing section flows (create, copy, revoke).
   - Error states for invalid/expired invites.
5. Manual QA checklist:
   - Passkey expiry (1 hour), rate limit, revoke behavior.
   - Email invite link acceptance after sign-in (24-hour JWT + cookie handoff).
