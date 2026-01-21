---
last_verified_at: 2026-01-22T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/
  - src/components/baby-access/
  - src/hooks/useAccessRevocationDetection.ts
  - src/lib/local-db/helpers/access-revoked.ts
  - src/actions/babyActions.ts
---

# Baby Sharing System Overview

## Purpose
This section documents the complete baby sharing system, including invite generation (passkey and email), access requests, caregiver management, access revocation detection, and data consistency patterns across IndexedDB and Postgres.

## Scope
The baby sharing system provides secure, multi-path access control for baby information:

1. **Invite generation** with two methods: 6-digit passkey (1-hour expiry) and email links (24-hour JWT)
2. **Access requests** allowing users to request access from existing caregivers
3. **Caregiver management** with role-based access control (owner/editor/viewer)
4. **Access revocation detection** with automatic local data cleanup
5. **Real-time sync** between settings UI and bootstrap flow using reactive IndexedDB queries

Key architectural decisions:
- **Dual-path acceptance:** Passkey codes for quick joining, email links for formal invitations
- **Immediate IndexedDB updates:** Newly created invites stored locally before server confirmation
- **Outbox monitoring:** Failed mutations with "Access denied" trigger server verification
- **Bootstrap integration:** Reusable components work in both settings and bootstrap contexts
- **Automatic cleanup:** Revoked access triggers immediate deletion of local baby data

## Chunks

### `baby-sharing.invite-system.md`
**Content:** Invite generation and acceptance flow with passkey codes and email links

**Key patterns:**
- 6-digit numeric passkey (1-hour expiry, single-use)
- Email JWT link (24-hour expiry)
- Immediate IndexedDB storage of new invites
- Server action returns invite data for reactive UI
- Bootstrap redirect after acceptance for full sync
- Reusable components (JoinWithCodeSection, RequestAccessSection)

**Read when:**
- Implementing or modifying invite generation
- Working with passkey or email invite acceptance
- Understanding invite expiry and validation
- Debugging invite acceptance flow
- Adding new invite types or methods

---

### `baby-sharing.access-revocation.md`
**Content:** Access revocation detection mechanism with automatic data cleanup

**Key patterns:**
- Outbox monitoring for "Access denied" errors
- Server verification via `verifyBabyAccess` action
- Automatic local data cleanup on revocation
- Store updates (remove from allBabies, clear activeBaby)
- Modal notification with bootstrap redirect
- Ref-based deduplication prevents multiple checks

**Read when:**
- Implementing access control features
- Working with access revocation or removal
- Understanding outbox error handling
- Debugging sync failures related to access
- Adding access-related validation

---

### `baby-sharing.caregiver-management.md`
**Content:** Caregiver management UI with role changes and access removal

**Key patterns:**
- Owner-only access to sharing page
- Real-time caregiver list via useLiveQuery
- Inline role change (owner cannot be changed)
- Access removal with confirmation
- Pending invites and incoming requests sections
- Compound index queries: `[userId+babyId]`, `[babyId+status]`

**Read when:**
- Building or modifying caregiver management UI
- Working with `/settings/babies/[babyId]/share` route
- Understanding role-based permissions
- Implementing access removal features
- Debugging caregiver display or updates

---

### `baby-sharing.reusable-components.md`
**Content:** Shared invite acceptance and access request components

**Key patterns:**
- JoinWithCodeSection: collapsible 6-digit OTP input
- RequestAccessSection: email-based access request form
- Both use `redirectPath` and optional `onSuccess` callback
- Used in both settings and bootstrap contexts
- Bootstrap redirects ensure full data sync after joining
- Optimistic UI updates with error handling

**Read when:**
- Adding invite acceptance to new pages
- Implementing access request functionality
- Understanding component reusability patterns
- Working with bootstrap integration
- Debugging invite acceptance UI

---

### `baby-sharing.data-consistency.md`
**Content:** IndexedDB sync patterns for sharing-related data

**Key patterns:**
- Immediate local insert of new invites for reactive UI
- Server actions return full invite objects
- useLiveQuery for real-time updates without polling
- Compound indexes for efficient baby access queries
- Transaction-based cleanup on revocation
- Bootstrap API synchronizes access state

**Read when:**
- Working with baby_invites or access_requests tables
- Understanding IndexedDB sharing data flow
- Implementing new sharing features
- Debugging sync or consistency issues
- Optimizing sharing-related queries

---

## Related Sections
- `.readme/sections/account-management.index.md` - Bootstrap flow and invite acceptance entry points
- `.readme/sections/baby-management.index.md` - Baby editing and access control
- `.readme/sections/local-first.index.md` - IndexedDB patterns and sync architecture
- `.readme/sections/database.index.md` - Schema for baby_invites and access_requests tables
