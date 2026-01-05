# Account and Baby Initialization Plan

## Goals
- Resolve Clerk user to local user and choose a default baby before /dashboard.
- Support first-time signup, returning users, multi-baby users, shared baby users.
- Keep onboarding short, with optional details in collapsed sections.
- Use safe storage patterns for a PWA (no PII in cookies/localStorage).

## Data Model Changes (Proposed)

### user
- add `defaultBabyId` (FK -> babies.id, on delete set null)
- add `handPreference` enum: `left | right | both | unknown` (default `unknown`)
- keep `colorTheme` (already exists)

### babies
- make `birthDate` nullable (currently not null)
- add `gender` enum: `male | female | other | unknown`
- add `birthWeightG` integer, nullable (store birth weight here, not in baby measurements)

### baby_access
- add `caregiverLabel` text, nullable (for "name in system": Mom, Dad, Other)
- add `lastAccessedAt` timestamp, nullable (helps default selection)

### baby_invites (new)
- id (serial PK)
- babyId (FK), inviterUserId (FK)
- invitedEmail (text), invitedUserId (FK, nullable until accepted)
- accessLevel (enum), status enum `pending | accepted | revoked | expired`
- token (text, unique), expiresAt (timestamp)
- createdAt / updatedAt

Notes:
- Store `handPreference` on `user` in the database.
- Always create the owner `baby_access` row with `accessLevel = owner`.

## Flow Overview (Decision Tree)

```
Clerk auth
  -> /account/resolve (sync user + resolve baby context)
      -> if locked => /account/locked
      -> if pending invites and no babies => /account/shared
      -> if no babies => /account/onboarding/baby
      -> if default baby valid => /dashboard
      -> if exactly one baby => set default => /dashboard
      -> if multiple babies => /account/select-baby
```

## Scenario Handling
- First-time signup: no babies, no invites -> onboarding page -> create baby -> set default -> dashboard.
- Returning user: has default baby -> go straight to dashboard.
- Multiple babies: redirect to select page, then set default.
- Shared baby only: no owned babies, has invite -> shared page -> accept invite -> set default.
- Wrong account login: sessionStorage cleared on sign-out; default baby comes from DB.
- Lost access to previous default: default invalid -> clear and choose lastAccessed or ask user to select.
- No valid baby after resolve: redirect to onboarding and show a short error banner about missing access.

## Onboarding UI (First-Time)
- Required: baby name field with a default value (e.g. "Baby" or "My Baby").
- Collapsed section: baby details (birth date, gender, birth weight).
- Collapsed section: preferences (hand preference, theme, name in system).
- Prefill caregiver label from the most recent `baby_access.caregiverLabel` for this user; fallback to "Parent".
- If user came from a shared invite, skip baby creation and go to shared page.

## Routing Plan

Entry page (Clerk fallback):
- `/account/resolve`: upsert user + resolve baby context, decide next step, update status text.

Account flow pages:
- `/account/onboarding/baby`: create baby + optional details/preferences.
- `/account/shared`: list and accept shared baby invites.
- `/account/select-baby`: choose default baby when multiple.

Settings-managed pages (parent is `/settings`):
- `/settings/babies`: list babies, current default, and actions.
- `/settings/babies/new`: add a baby later.
- `/settings/babies/share`: share a baby to another user.
- `/settings/babies/select`: change default baby.

## Validation (Server-Side)

1. Auth guard: Clerk userId required.
2. User upsert: create or update by clerkId.
3. Locked user: redirect to /account/locked if user.locked.
4. Baby access lookup: join baby_access + babies, include accessLevel.
5. Default baby validity: if default not in access list, clear it.
6. Access enforcement: if requested babyId is not in access list, show not permitted and clear active baby.
7. Onboarding:
   - name required (default allowed)
   - birthDate must be valid, not in future
   - birthWeightG positive integer
8. Invite accept:
   - token valid and not expired
   - prevent duplicate baby_access rows

## Default Baby Selection Rules
Order of precedence:
1. user.defaultBabyId (if valid)
2. most recent baby_access.lastAccessedAt
3. first baby in access list

## Feed Log Loading
- Always scope feed logs by user.defaultBabyId on the server.
- If no default, redirect to /account/resolve or /account/select-baby.
- Client can cache `activeBabyId` in sessionStorage for quick UI rendering.

## Status Messaging (Examples)
- `/account/resolve`: "Initiating your account..." -> "Loading your baby details..." -> "Checking shared access..." -> "Preparing your default baby..."
- `/account/onboarding/baby`: "Creating your baby..." -> "Saving preferences..."
- `/account/shared`: "Reviewing shared babies..."
- `/account/select-baby`: "Switching to selected baby..."

## Storage Strategy (PWA)

Cookies:
- Clerk auth cookies (httpOnly).
- Optional `theme` cookie for SSR to avoid flash.
- Avoid baby IDs or PII in cookies.

sessionStorage:
- `baby-log:user` (include local userId + clerkId)
- `baby-log:active-baby` (babyId, accessLevel, caregiverLabel)
- `baby-log:init-step` (status UI only)

localStorage:
- Do not use localStorage for baby selection or preferences.

Database:
- User preferences, default baby, access control, baby profile, feed logs.

Service worker cache:
- Keep static asset caching.
- For user-specific API routes, set `Cache-Control: no-store` or use NetworkOnly to avoid caching sensitive data.

## Offline Strategy (PWA)
- Cache baby profile + recent feed logs in IndexedDB (last 7-14 days).
- Show offline banner and read-only mode when network is unavailable.
- Queue new feed logs locally and sync when back online.
- If no cache exists, show empty state with retry.
