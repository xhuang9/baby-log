# No-Auth Offline Mode (Local-Only Access)

## Goal
Allow users to open the app and interact with data already stored in IndexedDB without logging in. Sync with the server should only happen when the user is online and authenticated.

## TL;DR
This is doable, but it requires changing routing/auth assumptions and moving key pages to client-side data reads (Dexie). The core idea is: public app shell + local data hydration + auth-gated sync.

---

## Why This Fights Clerk Today
Current behavior assumes auth before app:
- App routes are treated as protected (Clerk middleware + server components calling `auth()`).
- Key pages still read from Postgres on the server (e.g. `overview`), so offline local data is ignored.
- `SyncProvider` refuses to run without Clerk session, blocking even local hydration.

To allow no-auth offline, the app shell must be accessible without Clerk, and data must be read from IndexedDB on the client.

---

## Current Bootstrap Behavior (as implemented)
- `useBootstrapMachine` waits for Clerk, then checks `isSignedIn`.
- If `!isSignedIn`, it dispatches `NO_SESSION` and `BootstrapPage` redirects to `/sign-in`.
- Only after `isSignedIn` does it consider offline/local data.
- Online path always calls `/api/bootstrap` and writes Dexie + Zustand stores (big sync).

This means: signed-out users never reach local-only offline fallback today.

---

## Recommended Architecture (Local-Only App Shell + Auth-Gated Sync)

### Principles
1. App shell is public (no auth required to render UI).
2. Local data reads are always allowed (IndexedDB is the source while offline).
3. Server access is always authenticated (API routes + server actions stay Clerk-protected).
4. Sync is opt-in (only runs when user explicitly connects and auth is present).

### Flow
1. App loads (public shell).
2. Client hydrates from IndexedDB.
3. If local data exists -> render immediately (offline or online).
4. If no local data -> show "Connect to sync" prompt.
5. If user signs in and is online -> run bootstrap + sync.

### Page Load Decision Tree (matches your intent)
- On any app page:
  - If IndexedDB has local data -> render page.
  - If not -> redirect to `/account/bootstrap` (or local-only onboarding).
- After render:
  - If `isSignedIn` and online -> run background sync.
  - If signed out -> stay local-only, no server calls.

---

## Required Changes

### 1) Routing and Middleware
Goal: Make app routes accessible without auth.

Options:
- Option A (recommended): Move app routes out of `(auth)` group into a public group.
- Option B: Keep route paths but remove them from Clerk protection in middleware.

If `src/proxy.ts` is wired as middleware, adjust it to protect only:
- `/api/*`
- `/sign-in`, `/sign-up`
- any truly server-only pages

### 2) Client-First Data Rendering
Goal: Stop server pages from reading Postgres.

Example target:
- `src/app/[locale]/(auth)/(app)/overview/page.tsx`
  - Today: server component + `auth()` + Drizzle queries.
  - Needed: client component that reads from Dexie/stores.

This is essential for offline local reads to actually render.

### 3) Bootstrap Logic Update (for no-auth offline)
Goal: Use local IndexedDB when signed out and avoid auto-redirect to sign-in.

Proposed behavior for bootstrap entry:
- If local data exists -> hydrate stores and allow app, even when signed out.
- If no local data:
  - If signed in + online -> run `/api/bootstrap` sync.
  - Else -> show "Connect to sync" (no redirect).

Concrete hook changes:
- In `useBootstrapMachine`, move the local-data check before the `!isSignedIn` early return.
- Only dispatch `NO_SESSION` when there is no local data and no online auth available.

### 4) Local Data Guard on App Pages
Goal: Ensure all app pages can bootstrap from Dexie without server access.

Add a lightweight guard (client-only) that:
- Checks IndexedDB for a local user.
- If found -> render page.
- If missing -> redirect to `/account/bootstrap` (or a local-only onboarding page).

### 5) SyncProvider Refactor
Goal: Allow app to hydrate local data without Clerk.

Suggested behavior:
- Always hydrate from IndexedDB.
- If no local data and not signed in -> show "Connect to sync".
- If signed in + online -> run initial sync or background sync.

This likely becomes two layers:
- `LocalHydrationProvider` (always runs)
- `AuthSyncProvider` (runs only when signed in)

### 6) UI and Clerk Components
Goal: App renders without Clerk.

Changes:
- `AppHeader` uses `UserButton` from Clerk. Make it conditional or provide an offline variant.
- Any Clerk-dependent components should be lazy-loaded or hidden when not signed in.

### 7) Sync and API Guardrails
Goal: Prevent sync when not authenticated.

Changes:
- Sync service should require both `navigator.onLine` and `isSignedIn`.
- Outbox mutations should be queued locally but not pushed until auth exists.
- Server actions already check `auth()` and will fail safely, but client should avoid calling them when signed out.

### 8) Offline Service Worker (Optional)
Goal: Provide offline shell and static asset caching.

If app routes are public, the offline-auth SW can be simplified or removed. A basic Workbox fallback is enough:
- cache the app shell
- serve `/offline.html` for document fallback

---

## Security Note: Client Auth State Is Not Trustworthy
- `useAuth().isSignedIn` is a UI hint only; it can be spoofed in the client.
- Real security must live in API routes and server actions:
  - Always call `auth()` or `auth().protect()` server-side.
  - Never trust a client-sent `userId` or `clerkId`.
  - Treat 401/403 as source-of-truth for sync gating.
- If malicious scripts can run, they can also call your APIs with the real session cookie.
  - Mitigation is XSS prevention (CSP, no unsafe HTML), not client checks.

---

## Edge Cases to Decide

### Multi-user devices
If multiple users have cached data on the same device, the app needs a selection step (pick a local profile) before showing data.

### Sign out behavior
If you want local-only mode, sign-out should not wipe IndexedDB by default. Consider a "Keep data on this device" toggle.

### Online but not signed in
Decide if the app stays in local-only mode by default even when online, or if it auto-prompts for login.

---

## Incremental Implementation Plan

1) Make app shell public
- Move `(auth)/(app)` routes to a public group or remove auth protection for those routes.

2) Refactor data rendering
- Convert server pages (overview, settings, logs) to client components.
- Load from Dexie + stores, not Drizzle.

3) Update bootstrap logic
- Allow local-only hydration before auth redirect.
- Show "Connect to sync" when no local data and signed out.

4) Split SyncProvider
- Always hydrate local data.
- Only run sync when signed in.

5) Add local-only UI
- Offline banner shows "Local-only mode".
- Add "Connect to sync" CTA when online but signed out.

6) Harden sync gating
- Enforce auth checks in sync client code before calling `/api/sync/*`.

---

## Risks and Trade-offs

- Data on device is readable without auth. This is acceptable only if you treat device security as the boundary.
- You lose server-side personalization in SSR. Expect more client-only rendering.
- More complexity in UI states (local-only vs synced).

---

## Testing Checklist

1. Log in online, sync data, then sign out.
2. Reload while offline -> app should render from IndexedDB.
3. Reload while online but signed out -> app stays local-only, no sync requests.
4. Sign in -> sync resumes and merges outbox.
5. Confirm server actions and `/api/*` remain protected.
