# Offline Mode Fix - Master Plan

## Overview

This plan transitions from server-first to true offline-first architecture. Dashboard pages become public client shells that read from IndexedDB, with Clerk protecting only API routes.

**Architecture doc:** `09-architecture-offline-first-refactor.md`

## Session Strategy

Each task file is self-contained. Read only the specific task file for that session.

## Phase 1: Quick Config Fixes (COMPLETE)

| Task | Status | Description |
|------|--------|-------------|
| `01-manifest-start-url.md` | ✅ Done | Fix manifest start_url |
| `02-pwa-env-toggle.md` | ✅ Done | Add env toggle for dev PWA |
| `03-offline-fallback.md` | ✅ Done | Configure fallback page |
| `04-pwa-types.md` | ✅ Done | Add missing TypeScript types |
| `05-import-sw.md` | ✅ Done | Import offline auth SW |
| `06-indexeddb-version.md` | ✅ Done | Align DB version to 1 |
| `07-overview-indexeddb.md` | ✅ Done | Convert overview to IndexedDB |

## Phase 2: Offline-First Refactor (NEW)

**Recommended order:**

### Session 1: Infrastructure
| Task | Description | Files |
|------|-------------|-------|
| `10-middleware-unprotect-dashboard.md` | Remove Clerk from dashboard routes | `src/proxy.ts` |
| `11-indexeddb-guard-component.md` | Guard component for DB validation | New components |
| `14-auth-session-persistence.md` | Persist auth to IndexedDB | New service + hook |

### Session 2: Sync System
| Task | Description | Files |
|------|-------------|-------|
| `12-outbox-processor.md` | Process mutation queue | New service |
| `13-sync-scheduler.md` | Background sync scheduler | New service + provider |

### Session 3+: Page Conversions
| Task | Description | Files |
|------|-------------|-------|
| `15-convert-remaining-pages.md` | Convert logs, settings, etc. | Multiple pages |

### Optional (After Testing)
| Task | Description | Priority |
|------|-------------|----------|
| `08-rsc-offline-handling.md` | Handle RSC offline (safety net) | LOW |

## Execution Instructions

When user says "do task X":

1. Read ONLY `.readme/planning/06/0X-taskname.md`
2. Follow the exact steps in that file
3. Mark checklist items as done
4. Run validation if specified

## Architecture Summary

```
BEFORE (Server-First):
Clerk Middleware → Page (Server) → Postgres → Render

AFTER (Offline-First):
Page (Client) → IndexedDB → Render
      ↓
[Background] → API (Clerk) → Postgres
```

## Key Files Reference

**Config:**
- `src/proxy.ts` - Middleware (Task 10)
- `next.config.ts` - PWA config

**New Infrastructure:**
- `src/lib/local-db/validation.ts` - DB validation (Task 11)
- `src/components/guards/IndexedDbGuard.tsx` - Guard component (Task 11)
- `src/lib/auth/session-manager.ts` - Auth persistence (Task 14)
- `src/lib/sync/outbox-processor.ts` - Outbox processing (Task 12)
- `src/lib/sync/sync-scheduler.ts` - Background sync (Task 13)

**Pages to Convert:**
- `src/app/[locale]/(auth)/(app)/logs/page.tsx`
- `src/app/[locale]/(auth)/(app)/insights/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx`

## Final Validation

After all tasks:

```bash
pnpm build && pnpm start
```

Test scenario:
1. Sign in → visit pages → populate caches
2. Go offline (DevTools → Network → Offline)
3. Click navigation links → should work
4. Create/edit data → should queue locally
5. Go online → data should sync
