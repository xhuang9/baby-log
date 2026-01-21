# Docs-Architect Update Tasks (Invites)

Run `/docs-architect` after implementing this plan to refresh the following docs.
These are expected to become outdated with passkey + JWT invite changes.

## Update Targets (.readme/chunks)
- `.readme/chunks/account.baby-sharing.md`
  - Update invite types (passkey + email), token hashing, new acceptance flows.
- `.readme/chunks/account.bootstrap-unified-flow.md`
  - Add cookie-backed token acceptance before normal invite listing.
- `.readme/chunks/testing.e2e-fixtures-seed.md`
  - Adjust seed data for new invite columns (inviteType, tokenHash, expiry).
- `.readme/chunks/testing.e2e-fixtures-auth.md`
  - Update invite-related fixtures if schema or flows change.
