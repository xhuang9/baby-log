# Offline Mode Diagnosis (2026-01-15)

## Executive Summary
- The PWA service worker is disabled in development, so `npm run dev` (or `pnpm dev`) cannot work offline.
- The custom offline auth service worker exists but is not imported into the generated `sw.js`.
- IndexedDB version numbers are inconsistent between the app and the offline scripts.
- The PWA manifest `start_url` points to a route that does not exist.
- Key dashboard pages still read from server DB instead of IndexedDB, so offline data is not guaranteed to render.

---

## Findings (What Blocks Offline Right Now)

### 1) PWA disabled in dev
**Where:** `next.config.ts`  
**Detail:** `disable: process.env.NODE_ENV === 'development'`  
**Impact:** No service worker on `npm run dev`, so nothing is cached or served offline.

### 2) Offline auth SW not integrated
**Where:** `next.config.ts`, `public/offline-auth-sw.js`  
**Detail:** The offline auth script says it must be imported by the main SW, but `workboxOptions.importScripts` is not configured. The generated `public/sw.js` has `importScripts()` with no args.  
**Impact:** Protected routes still rely on network or cached HTML without the auth bypass logic.

### 3) IndexedDB version mismatch
**Where:** `src/lib/local-db/database.ts`, `public/offline-auth-sw.js`, `public/offline.html`  
**Detail:** Dexie uses DB version **1** while the offline scripts open IndexedDB at version **4**.  
**Impact:** Offline session lookups can fail, and integrating the SW could upgrade the DB to v4, breaking Dexie (VersionError).

### 4) Manifest `start_url` invalid
**Where:** `public/manifest.json`  
**Detail:** `start_url` is `/dashboard`, but no route exists.  
**Impact:** PWA installs can open to a 404 or redirect chain, which also reduces cache usefulness offline.

### 5) Server-rendered dashboard data
**Where:** `src/app/[locale]/(auth)/(app)/overview/page.tsx`  
**Detail:** Page queries Postgres via Drizzle (`db`) and uses `auth()` server-side.  
**Impact:** Offline loads cannot fetch fresh data from IndexedDB; at best you get cached HTML from a previous online render. This diverges from the offline-first plan in `02-offline-first-architecture.md`.

---

## Recommended Fixes (Priority Order)

### A) Enable PWA for offline testing
**Goal:** Actually register a SW during testing.  
**Options:**
1. **Production mode:** `pnpm build && pnpm start` (recommended for accurate behavior)
2. **Dev flag:** Add an env toggle and change config:
   - In `next.config.ts`:
     - `disable: process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true'`
   - Then run with `NEXT_PUBLIC_ENABLE_PWA=true pnpm dev`

### B) Import the offline auth SW
**Goal:** Activate the auth bypass for offline navigation.  
**Change:** Add Workbox import in `next.config.ts`:
```ts
workboxOptions: {
  importScripts: ['/offline-auth-sw.js'],
}
```
**Note:** Update typings in `src/types/next-pwa.d.ts` to include `workboxOptions` so TS doesn’t reject the config.

### C) Align IndexedDB version numbers
**Goal:** Prevent Dexie + SW conflicts.  
**Options:**
- Quick fix: Change `DB_VERSION` in `public/offline-auth-sw.js` and `public/offline.html` to **1**.
- Long-term: Bump Dexie schema to version **4** with migrations if that is the intended version.

### D) Add offline fallback behavior
**Goal:** Provide a stable offline page when cache + network fail.  
**Change:** Add `fallbacks` in PWA config:
```ts
fallbacks: {
  document: '/offline.html',
}
```
This is supported by `next-pwa` but currently not configured.

### E) Fix manifest start URL
**Goal:** Ensure PWA opens to a real route.  
**Change:** Update `public/manifest.json` to a valid route (e.g. `/` or `/overview`, locale-aware if needed).

### F) Shift dashboard data to IndexedDB (structural)
**Goal:** Ensure offline data is rendered from Dexie.  
**Recommendation:** Convert server-heavy pages (e.g. overview) to client components that read from stores/Dexie, using SSR only for shell. This matches the plan in `02-offline-first-architecture.md`.

---

## Optional Architecture: Local-Only UI + Auth-Gated Sync
If you want the dashboard to work even when signed out, a viable approach is:
- Allow app routes to render without Clerk.
- Read all data from IndexedDB on the client.
- Require Clerk only for `/api/*` sync endpoints.

This is secure as long as server routes always call `auth()` and validate ownership.  
See `.readme/planning/offline-mode-with-clerk-qa.md` and `.readme/planning/no-auth-offline.md` for details.

---

## Minimal Validation Checklist
1. Run `pnpm build && pnpm start`
2. Open DevTools → Application → Service Workers (confirm SW registered)
3. Visit `/overview` and `/logs` while online (warm caches)
4. Toggle DevTools → Network → Offline
5. Reload `/overview`
6. Expect: page loads from cache + OfflineBanner appears

---

## Open Questions
- Do you want offline testing to work in dev mode, or only in prod builds?
- Should client-side auth be allowed to bypass Clerk (using `authSession`) if Clerk cannot initialize offline?
