# LLM Implementation Guide: Account + Baby Init

Goal: implement the auth-to-baby resolution flow described in `.readme-human/account-baby-init-plan.md`.

Scope outline:
1) Update `src/models/Schema.ts` with the proposed fields and `baby_invites` table. Generate and apply migrations with `pnpm run db:generate` and `pnpm run db:migrate`.
2) Update Clerk fallback redirect to `/account/resolve` and move the user upsert + sessionStorage init into `/account/resolve` (remove `/post-auth`).
3) Add account flow routes:
   - `/account/resolve` (server or hybrid): resolve baby context, redirect to next step.
   - `/account/onboarding/baby`: create baby + optional details/preferences.
   - `/account/shared`: list/accept invites, set default baby.
   - `/account/select-baby`: choose default baby when multiple.
   - `/account/locked` (simple page).
4) Add settings-managed routes under `/settings`:
   - `/settings/babies`: list babies and current default.
   - `/settings/babies/new`: add a baby.
   - `/settings/babies/share`: share a baby to another user.
   - `/settings/babies/select`: change default baby.
5) Add server actions or `/api` handlers for:
   - resolve account context
   - create baby + create owner `baby_access`
   - accept invite + create `baby_access`
   - set default baby + update `lastAccessedAt`
   - prefill caregiver label from most recent `baby_access.caregiverLabel`, fallback to "Parent"
6) Add a `useBabyStore` (Zustand) and sessionStorage helpers for `baby-log:active-baby`.
7) Update dashboard data loaders to scope feed logs by `user.defaultBabyId` and redirect if missing.
8) Update `/settings` with entry points and buttons (add baby, share baby, manage default).
9) Clear sessionStorage keys on sign-out and wipe baby data caches in IndexedDB.
10) Add tests for first-time signup, returning user, multi-baby selection, shared invite, wrong account flow.

Notes:
- Keep user-specific API responses `no-store` to avoid service worker caching.
- Store preferences in the database (`handPreference`, `colorTheme`).
- Do not use localStorage for baby selection; default comes from `user.defaultBabyId`.
- Use `@/` import alias and existing App Router layout patterns.
