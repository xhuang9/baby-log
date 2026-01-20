# 04 Email Invite Token Flow

## Goal
Handle JWT invite links across sign-in and bootstrap.

## Steps
1. Read `invite` query param on `/account/bootstrap`.
2. If not signed in:
   - Store token in a short-lived cookie (temporary).
   - Redirect to sign-in.
3. If signed in:
   - Call `acceptInviteByToken`.
   - Clear stored token after attempt.
4. On success:
   - Update stores and redirect to overview.
5. On failure:
   - Show a bootstrap error state (or reuse invites error UI).
6. Ensure token acceptance runs before normal invite list rendering.

## Defaults
- JWT expiry: 24 hours.
- Cookie lifetime: match JWT expiry (or shorter).
