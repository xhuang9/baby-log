# Baby Access Requests & Sharing

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Medium

---

## Overview

Implement end-to-end access sharing based on `src/models/Schema.ts`. The database
already defines `baby_access`, `baby_invites`, and `baby_access_requests`; the
missing pieces are the UI surfaces and the server actions wiring so caregivers
can request access, owners can approve, and invites can be managed.

---

## Data Model (Schema.ts)

### Access Levels

- **owner:** Full control (edit baby, manage sharing, archive)
- **editor:** Edit logs and baby details, no sharing or archive
- **viewer:** Read-only access

### `baby_access`

Junction table for user to baby access.

- **Columns:** `babyId`, `userId`, `accessLevel`, `caregiverLabel`, `lastAccessedAt`, timestamps
- **Constraints:** Composite PK on `(babyId, userId)`, index on `userId`

### `baby_invites`

Pending invite records created by owners.

- **Columns:** `babyId`, `inviterUserId`, `invitedEmail`, `invitedUserId`, `accessLevel`, `status`, `token`, `expiresAt`, timestamps
- **Statuses:** `pending`, `accepted`, `revoked`, `expired`

### `baby_access_requests`

Requests sent to a target caregiver by email.

- **Columns:** `requesterUserId`, `targetEmail`, `targetUserId`, `requestedAccessLevel`, `message`, `status`, `resolvedBabyId`, `resolvedByUserId`, `resolvedAt`, timestamps
- **Statuses:** `pending`, `approved`, `rejected`, `canceled`

---

## User Flows

### Request Access (Requester)

1. Entry points: no-baby bootstrap screen, optional settings entry for additional access.
2. Form fields: target email, requested access level, optional message.
3. Action: `createAccessRequest` stores a pending request.
4. Pending state: `BootstrapPendingRequest` displays status and allows cancel via `cancelAccessRequest`.
5. On approval: bootstrap reruns, new `baby_access` appears and user can select or auto-assign default baby.

### Approve or Reject (Owner)

1. Show incoming pending requests in a share/access settings page.
2. Owner chooses baby + access level (defaults to requested level).
3. Approve: `approveAccessRequest` creates `baby_access`, updates request `resolved*` fields.
4. Reject: `rejectAccessRequest` sets status to rejected.

### Invite Flow (Owner -> Invitee)

1. Owner creates invite: babyId, invitedEmail, accessLevel, optional caregiver label.
2. Action: create `baby_invites` row with token + expiry, status `pending`.
3. Invitee sees pending invites in bootstrap and can accept or decline.
4. Accept: existing `acceptInvite` creates `baby_access` and updates invite status.
5. Decline: update invite status to `revoked` (or extend enum if a distinct status is required).

### Access Management

- Owners can list current caregivers and update access level or revoke access (delete `baby_access` row).

---

## Implementation Tasks

### Phase 1: Server Actions

- [ ] Add invite actions: create, list pending per baby, revoke
- [ ] Add decline invite action (use `revoked` unless schema updated)
- [ ] Add access management actions (update access level, revoke access)
- [ ] Wire access request actions where needed (create, cancel, approve, reject)

### Phase 2: Requester UI

- [ ] Add "Request access" form to `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx`
- [ ] Wire `BootstrapPendingRequest` cancel to `cancelAccessRequest`
- [ ] Show outgoing request status (single pending request is fine to start)

### Phase 3: Owner UI (Sharing)

- [ ] Add a share/access management page under settings (e.g., `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share`)
- [ ] Show current caregivers (`baby_access`), pending invites, and incoming requests
- [ ] Approve/reject requests with baby + access level selection
- [ ] Revalidate bootstrap/settings pages after changes

### Phase 4: Sync + Tests

- [ ] Ensure new access is picked up by bootstrap and local store refresh
- [ ] Unit tests for invite/request actions
- [ ] E2E flow: request -> approve -> access appears in overview

---

## Success Criteria

- [ ] Users without a baby can request access and see a pending state
- [ ] Owners can approve/reject requests and manage caregivers
- [ ] Invites can be created, accepted, and declined/revoked
- [ ] Access changes are reflected on next bootstrap and in local stores
