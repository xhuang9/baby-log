# 05 Sharing UI and Caregiver Management

## Goal
Provide owner UI to create invites and manage caregiver access.

## Steps
1. Add a "Sharing" section to the baby edit page:
   - `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx` or a new subpage.
2. Fetch data from Postgres via server actions:
   - Current caregivers (from `baby_access`).
   - Pending invites (from `baby_invites`).
3. UI elements:
   - Create passkey invite (button -> shows code + copy).
   - Create email invite (form -> returns copyable link).
   - List invites with status and expiry, allow revoke.
   - List caregivers with role, allow removal and role change (optional).
   - Label `editor` as "Collaborator" in UI copy.
4. Permissions:
   - Only owners can create/revoke invites or change access.
5. After mutations:
   - Refresh data and revalidate relevant pages.
   - Sync local stores if needed.

## Defaults
- Invite access level defaults to Collaborator (DB: `editor`).
