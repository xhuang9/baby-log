# Offline Mode Diagnosis (2026-01-15)

> **Status:** Performance fixes complete. Full offline support deferred.

## Executive Summary

**Original Issues (All Resolved for Performance):**
- ~~PWA service worker disabled in development~~ → Fixed with env toggle
- ~~Offline auth SW not integrated~~ → Fixed, imported in SW
- ~~IndexedDB version mismatch~~ → Fixed, aligned to v1
- ~~Manifest start_url invalid~~ → Fixed
- ~~Dashboard pages queried server~~ → Fixed, all read from IndexedDB

**Current Priority:** Instant page navigation (performance)
**Deferred:** Full offline support (Clerk fallback, RSC handling)

---

## What Was Fixed

### Phase 1: Config Fixes ✅
1. PWA env toggle added
2. Offline auth SW imported
3. IndexedDB versions aligned
4. Manifest start_url fixed
5. Offline fallback configured

### Phase 1.5: Performance Fixes ✅
1. Middleware skips Clerk for dashboard routes
2. All dashboard pages converted to instant-loading shells
3. All data reads from IndexedDB (client-side)
4. Server actions only fire on user interaction
5. AppSidebar reads from IndexedDB

---

## Current Architecture

```
Page Navigation:
  Click → Instant shell render → Hydrate → IndexedDB read → UI update
  (No server blocking)

User Actions:
  Click/Submit → Server action → Sync → IndexedDB → UI reactively updates
```

### Pages Status

| Page | Server Blocking | Data Source |
|------|-----------------|-------------|
| `/overview` | None | IndexedDB |
| `/logs` | None | IndexedDB |
| `/insights` | None | IndexedDB |
| `/settings` | None | IndexedDB |
| `/settings/babies` | None | IndexedDB |
| `/settings/babies/[id]` | None | IndexedDB |

---

## What's Deferred (Future Work)

### For Full Offline Support

| Issue | Impact | Priority |
|-------|--------|----------|
| Clerk components need network | User avatar/button won't show offline | Low |
| RSC requests on navigation | May fail offline | Low |
| No outbox processor | Mutations won't queue offline | Low |

### Why Deferred

1. **Performance is priority** - App works great online with instant navigation
2. **Clerk dependency** - Would require significant restructuring
3. **Complexity** - Full offline needs conflict resolution, sync queue

---

## Validation

```bash
pnpm build && pnpm start
```

Test:
1. Navigate between pages → Should be instant
2. Check Network tab → No blocking requests on navigation
3. Check IndexedDB → Data loads from local DB
4. Click actions → Server calls only on interaction

---

## Files Changed

**Middleware:**
- `src/proxy.ts` - Skips Clerk for dashboard routes

**Pages (all instant shells):**
- `overview/page.tsx`
- `settings/page.tsx`
- `settings/babies/page.tsx`
- `settings/babies/[babyId]/page.tsx`
- `logs/page.tsx`
- `insights/page.tsx`

**Components (IndexedDB reads):**
- `OverviewContent.tsx`
- `SettingsContent.tsx`
- `BabiesManagement.tsx`
- `EditBabyContent.tsx`
- `AppSidebar.tsx`

---

## Related Docs

- `.readme/planning/06/00-master-plan.md` - Full plan details
- `.readme/planning/06/SESSION-GUIDE.md` - Quick reference
