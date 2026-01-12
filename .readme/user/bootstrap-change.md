# Bootstrap Migration: Legacy Account Pages Cleanup

## Summary

The unified `/account/bootstrap` page now handles all post-auth account resolution. All legacy account pages have been deleted.

---

## Deleted Pages

| Page | Path | Replacement |
|------|------|-------------|
| Resolve | `/account/resolve` | `useBootstrapMachine` state machine |
| Locked | `/account/locked` | `BootstrapLocked.tsx` state |
| Onboarding Baby | `/account/onboarding/baby` | `BootstrapNoBaby.tsx` state |
| Select Baby | `/account/select-baby` | `BootstrapSelectBaby.tsx` state |
| Shared | `/account/shared` | `BootstrapInvites.tsx` state |
| Request Access | `/account/request-access` | `BootstrapPendingRequest.tsx` state |

---

## Files Deleted

```
src/app/[locale]/(auth)/account/resolve/
  - page.tsx
  - ResolveAccountClient.tsx

src/app/[locale]/(auth)/account/locked/
  - page.tsx

src/app/[locale]/(auth)/account/onboarding/
  - baby/page.tsx
  - baby/OnboardingBabyForm.tsx

src/app/[locale]/(auth)/account/select-baby/
  - page.tsx
  - SelectBabyForm.tsx

src/app/[locale]/(auth)/account/shared/
  - page.tsx
  - SharedBabyInvites.tsx
  - AccessRequestApprovalDialog.tsx

src/app/[locale]/(auth)/account/request-access/
  - page.tsx
  - RequestAccessForm.tsx
```

---

## Files Modified

### Server Actions

| File | Change |
|------|--------|
| `src/actions/accessRequestActions.ts` | Updated `revalidatePath` calls from legacy paths to `/account/bootstrap` |
| `src/actions/babyActions.ts` | Updated `revalidatePath('/account/select-baby')` to `/account/bootstrap` |

### Components

| File | Change |
|------|--------|
| `src/app/[locale]/(auth)/account/bootstrap/states/BootstrapNoBaby.tsx` | Removed link to deleted `/account/request-access` page |

---

## Bootstrap State Mapping

| Account State | Bootstrap Status | UI Component |
|---------------|-----------------|--------------|
| User is locked | `locked` | `BootstrapLocked.tsx` |
| No babies | `no_baby` | `BootstrapNoBaby.tsx` |
| Multiple babies, no default | `select_baby` | `BootstrapSelectBaby.tsx` |
| Has pending invites | `has_invites` | `BootstrapInvites.tsx` |
| Has pending access request | `pending_request` | `BootstrapPendingRequest.tsx` |
| Ready to use app | `ready` | Redirects to `/overview` |

---

## E2E Tests

The following test files reference the deleted pages and will need updates:

| Test File | Status |
|-----------|--------|
| `tests/e2e/AccountResolution.e2e.ts` | Needs update |
| `tests/e2e/BabyManagement.e2e.ts` | Needs update |
| `tests/e2e/MultiBabySelection.e2e.ts` | Needs update |
| `tests/e2e/InviteAndAccessRequest.e2e.ts` | Needs update |

These tests should be updated to use `/account/bootstrap` and test the state machine transitions instead of individual pages.

---

## Migration Date

2026-01-12
