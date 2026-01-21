---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/BabySharingContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CaregiversSection.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PendingInvitesSection.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/IncomingRequestsSection.tsx
  - src/actions/babyActions.ts
---

# Caregiver Management UI

## Purpose
Provides owner-only interface for managing baby access, including viewing caregivers, revoking access, managing invites, and handling access requests.

## Access Control

**Route:** `/settings/babies/[babyId]/share`

**Permission check:**
```typescript
// BabySharingContent.tsx
const access = await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([userData.id, numericBabyId])
  .first();

if (access.accessLevel !== 'owner') {
  return null; // Owner only
}
```

**Enforcement:** Component returns `null` if user is not owner (prevents UI render).

**Why IndexedDB check:** Fast permission check without server round-trip (server actions also validate).

## Page Structure

**Four main sections (top to bottom):**

1. **Create Invite Section** - Generate new passkey/email invites
2. **Pending Invites Section** - View and revoke unused invites
3. **Incoming Requests Section** - Approve or reject access requests
4. **Caregivers Section** - Manage existing caregiver access

**Design pattern:** Each section is self-contained component with own data queries and actions.

## 1. Create Invite Section

**Component:** `CreateInviteSection.tsx`

**Features:**
- Button to generate passkey (6-digit code)
- Button to generate email invite (hidden - not implemented)
- Modal displays generated code with copy button
- Immediate IndexedDB insert for reactive pending list

**Flow:**
```typescript
// Create passkey
const result = await createBabyInvitePasskey(babyId, 'editor');

// Store in IndexedDB immediately
await localDb.babyInvites.add({
  id: result.invite.id,
  babyId,
  code: result.invite.code,
  inviteType: 'passkey',
  accessLevel: 'editor',
  status: 'pending',
  createdAt: new Date(result.invite.createdAt),
  expiresAt: new Date(result.invite.expiresAt),
});

// Show modal with code
setShowPasskeyModal(true);
```

**Why immediate insert:** `PendingInvitesSection` uses `useLiveQuery` - will auto-update without refresh.

## 2. Pending Invites Section

**Component:** `PendingInvitesSection.tsx`

**Query:**
```typescript
const pendingInvites = useLiveQuery(async () => {
  return localDb.babyInvites
    .where('[babyId+status]')
    .equals([babyId, 'pending'])
    .toArray();
}, [babyId]);
```

**Display:**
- List of unused invites (passkey code shown, email hidden)
- Expiry countdown (e.g., "Expires in 45 minutes")
- Revoke button per invite

**Revoke action:**
```typescript
await revokeBabyInvite(inviteId);

// IndexedDB updated via sync, or manually:
await localDb.babyInvites.update(inviteId, { status: 'revoked' });
```

**Auto-hide expired:** Query filters `status: 'pending'` - expired invites marked as 'expired' by server.

## 3. Incoming Requests Section

**Component:** `IncomingRequestsSection.tsx`

**Query:**
```typescript
const incomingRequests = useLiveQuery(async () => {
  return localDb.accessRequests
    .where('[babyId+status]')
    .equals([babyId, 'pending'])
    .toArray();
}, [babyId]);
```

**Display:**
- Requester email and optional message
- Created date
- Approve and Reject buttons

**Actions:**
- Approve: `approveAccessRequest(requestId, 'editor')` → creates `baby_access` record
- Reject: `rejectAccessRequest(requestId)` → marks request as 'rejected'

**Reactive updates:** Both actions trigger `useLiveQuery` refresh (request disappears from list).

## 4. Caregivers Section

**Component:** `CaregiversSection.tsx`

**Query:**
```typescript
const caregivers = useLiveQuery(async () => {
  const accessRecords = await localDb.babyAccess
    .where('babyId')
    .equals(babyId)
    .toArray();

  // Join with users table for display names
  const withUsers = await Promise.all(
    accessRecords.map(async (access) => {
      const user = await localDb.users.get(access.userId);
      return { ...access, user };
    })
  );

  return withUsers;
}, [babyId]);
```

**Display per caregiver:**
- User name and email
- Access level badge (Owner/Editor/Viewer)
- Caregiver label (if set)
- Role change dropdown (not for owner)
- Remove access button (not for owner)

**Role change:**
```typescript
await updateBabyAccessLevel(babyId, userId, newAccessLevel);

// IndexedDB updated via sync or manually:
await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([userId, babyId])
  .modify({ accessLevel: newAccessLevel });
```

**Remove access:**
```typescript
await removeBabyAccess(babyId, userId);

// IndexedDB cleanup:
await localDb.babyAccess
  .where('[userId+babyId]')
  .equals([userId, babyId])
  .delete();
```

**Protection:** Owner cannot change own role or remove own access (UI disabled + server validation).

## Real-Time Sync Pattern

**Settings ↔ Bootstrap sync:**

Both settings page and bootstrap use same IndexedDB queries:
- Settings: Owner manages invites/access
- Bootstrap: Invitee accepts invites/sees pending requests

**Example:**
1. Owner creates invite in settings → stored in IndexedDB
2. Invitee refreshes bootstrap → sees new invite (same table, different query)
3. Invitee accepts → `baby_access` created
4. Owner refreshes settings → sees new caregiver (reactive query)

**No polling required:** `useLiveQuery` detects IndexedDB changes from any source (sync, local actions, etc.).

## Compound Index Usage

**Baby access by user:**
```typescript
localDb.babyAccess
  .where('[userId+babyId]')
  .equals([userId, babyId])
```

**Baby access by baby (all caregivers):**
```typescript
localDb.babyAccess
  .where('babyId')
  .equals(babyId)
```

**Pending invites:**
```typescript
localDb.babyInvites
  .where('[babyId+status]')
  .equals([babyId, 'pending'])
```

**Pending requests:**
```typescript
localDb.accessRequests
  .where('[babyId+status]')
  .equals([babyId, 'pending'])
```

**Why compound indexes:** Much faster than filtering results (especially with many babies/requests).

## Error Handling

**Inline errors (no toasts):**
```typescript
const [error, setError] = useState<string | null>(null);

// Display above content
{error && (
  <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">
    {error}
  </div>
)}
```

**Why no toasts:** Settings page is permanent (not transient) - errors should stay visible.

## Server Action Validation

All actions validate permissions server-side:

**Example (revoke invite):**
```typescript
// Server validates:
// 1. User is authenticated
// 2. Invite exists
// 3. User is owner of invite's baby
// 4. Invite not already revoked/accepted

if (invite.baby.ownerUserId !== user.localId) {
  throw new Error('Only the owner can revoke invites');
}
```

**Client validation is UX only** - never trust client checks for security.

## Loading States

**Progressive loading:**
```typescript
if (userData === undefined || babyData === undefined) {
  return <SkeletonUI />; // Still loading
}

if (babyData === null) {
  return null; // No access (will redirect)
}

// Render content
```

**Skeleton pattern:** Animated placeholders for header, sections (better UX than spinner).

## Related Server Actions

**Invite management:**
- `createBabyInvitePasskey(babyId, accessLevel)`
- `revokeBabyInvite(inviteId)`

**Access requests:**
- `approveAccessRequest(requestId, accessLevel)`
- `rejectAccessRequest(requestId)`

**Caregiver management:**
- `updateBabyAccessLevel(babyId, userId, accessLevel)`
- `removeBabyAccess(babyId, userId)`

All in `src/actions/babyActions.ts`.

## Gotchas

1. **Owner cannot self-manage:** Prevent owner from changing own role or removing own access (creates orphaned baby).

2. **IndexedDB manual updates optional:** Server actions trigger sync pull, but immediate updates improve UX (no wait for sync).

3. **Compound index order matters:** `[userId+babyId]` is different from `[babyId+userId]` - use exact order from schema.

4. **Join pattern for caregivers:** Must query `users` table separately to get display names (no SQL-style joins in IndexedDB).

5. **Revoked invite still in DB:** Status changes to 'revoked', not deleted (audit trail) - query must filter `status: 'pending'`.

## Related Files

**Page:**
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/page.tsx` - Route entry
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/BabySharingContent.tsx` - Main container

**Components:**
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CreateInviteSection.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PendingInvitesSection.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/IncomingRequestsSection.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/CaregiversSection.tsx`

**Actions:**
- `src/actions/babyActions.ts` - All sharing-related server actions
