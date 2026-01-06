# Conversation Summary (Token Saver)

Goal: design + implement Clerk auth → account resolve → baby selection/onboarding/sharing, with PWA-safe storage and settings management.

Decisions:
- Replace `/post-auth` with `/account/resolve` (Clerk fallback).
- Default baby stored in DB (`user.defaultBabyId`); no localStorage for selection.
- sessionStorage only: `baby-log:user`, `baby-log:active-baby`; clear on sign-out.
- Schema: `user.handPreference`, `user.defaultBabyId`; `babies.birthDate` nullable + `gender` + `birthWeightG`; `baby_access.caregiverLabel` + `lastAccessedAt`; `baby_invites`.
- Onboarding: default baby name (“My Baby”), collapsed baby details + preferences; caregiver label default “Parent” (prefill from last baby if available).
- Sharing: invite-based accept flow; separate access-request guide for in-app approval.
- Settings: `/settings/babies` management + add baby; share baby UI planned.
- PWA: user APIs `no-store`; offline plan = IndexedDB cache + queue.

Implementation present in git:
- New routes: `/account/resolve`, `/account/onboarding/baby`, `/account/shared`, `/account/select-baby`, `/account/locked`.
- New server actions: `src/actions/babyActions.ts` (resolve/create/accept/set-default).
- New store: `src/stores/useBabyStore.ts`; `useUserStore` now includes `localId` and syncs sessionStorage.
- Schema + migration `0003_thin_patch.sql`.
- Settings baby management `/settings/babies`, add baby form; custom `SignOutButton` clears stores.
- Dashboard now requires `defaultBabyId`.
- `/post-auth` deleted; auth layout redirects to `/account/resolve`.

Risks / gaps to verify:
- Dashboard query does not filter `baby_access.userId` (access leak risk).
- `acceptInvite()` does not verify invite belongs to current user.
- `resolveAccountContext()` always picks most recent baby; `/account/select-baby` may be unreachable unless user manually navigates.
- Onboarding lacks request-access link + hand/theme preferences UI.
- No `/settings/babies/share` UI yet; no access-request flow implemented.
- Offline caching/queue not implemented.
