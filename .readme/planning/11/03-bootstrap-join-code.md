# 03 Bootstrap Join Code

## Goal
Allow users with no baby to join using a caregiver code during bootstrap.

## Steps
1. Update `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx`:
   - Add a subtle "Use a caregiver code" link below the submit button.
   - Expand to show a passkey input + submit button.
   - Keep the section collapsed by default.
2. Wire the form to `acceptInviteByCode`.
3. On success:
   - Update active baby in the store (or rerun bootstrap).
   - Redirect to overview.
4. On error:
   - Show inline error without blocking the create-baby flow.

## Defaults
- Passkey format: 6 digits.
- Passkey expiry: 1 hour (server-enforced).
