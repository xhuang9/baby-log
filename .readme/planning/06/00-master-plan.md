# Offline Mode Fix - Master Plan

## Overview

This plan addresses 6 issues preventing offline mode from working. Tasks are ordered by dependency and grouped into phases to minimize token usage per session.

**Source diagnosis:** `.readme/planning/06-offline-mode-diagnosis.md`

## Session Strategy

Each task file is self-contained. Read only the specific task file for that session - do NOT read this master plan or other task files unless explicitly needed.

## Phase 1: Quick Config Fixes (1-2 sessions)

All Phase 1 tasks modify config files only. No business logic changes.

| Task | File | Description | Depends On |
|------|------|-------------|------------|
| `01-manifest-start-url.md` | `public/manifest.json` | Fix invalid `/dashboard` to `/en/overview` | None |
| `02-pwa-env-toggle.md` | `next.config.ts` | Add env toggle for dev PWA | None |
| `03-offline-fallback.md` | `next.config.ts` | Configure fallback page | Task 02 |
| `04-pwa-types.md` | `src/types/next-pwa.d.ts` | Add missing type definitions | None |
| `05-import-sw.md` | `next.config.ts` | Import offline auth service worker | Task 04 |
| `06-indexeddb-version.md` | 3 files | Align DB version to 1 | None |

**Recommended session grouping:**
- Session A: Tasks 01-03 (quick edits, test build)
- Session B: Tasks 04-06 (SW integration, test offline)

## Phase 2: Structural Changes (separate sessions)

These tasks modify React components and data flow.

| Task | File | Description | Depends On |
|------|------|-------------|------------|
| `07-overview-indexeddb.md` | overview page + components | Convert to client-side IndexedDB reads | Phase 1 |

## Execution Instructions for Claude

When user says "do task X":

1. Read ONLY `.readme/planning/06/0X-taskname.md`
2. Follow the exact steps in that file
3. Mark the task complete in the file's checklist
4. Run the validation command if specified
5. Do NOT read other task files or the master plan

## Validation Checklist

After all Phase 1 tasks:
```bash
pnpm build && pnpm start
# Open DevTools → Application → Service Workers
# Confirm SW registered
# Visit /en/overview while online
# Toggle offline in DevTools
# Reload - expect cached page + OfflineBanner
```

## Files Reference

Key files that get modified:
- `next.config.ts` - PWA configuration
- `public/manifest.json` - PWA manifest
- `public/offline-auth-sw.js` - Offline auth service worker
- `public/offline.html` - Offline fallback page
- `src/types/next-pwa.d.ts` - TypeScript definitions
- `src/lib/local-db/database.ts` - Dexie DB schema
- `src/app/[locale]/(auth)/(app)/overview/page.tsx` - Overview page
