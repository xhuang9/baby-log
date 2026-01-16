# Session Execution Guide

## Quick Start

Tell Claude: "Execute task 10" (or whichever task number).

## Phase 1: Config Fixes (COMPLETE ✅)

Tasks 01-07 are done.

## Phase 2: Offline-First Refactor

### Recommended Session Grouping

**Session A: Infrastructure (Tasks 10, 11, 14)**
```
Execute tasks 10, 11, and 14
```
- Removes Clerk from dashboard routes
- Creates IndexedDB guard component
- Sets up auth session persistence

**Session B: Sync System (Tasks 12, 13)**
```
Execute tasks 12 and 13
```
- Creates outbox processor
- Creates background sync scheduler

**Session C+: Page Conversions (Task 15)**
```
Execute task 15
```
- Converts remaining pages to client components
- May need multiple sessions depending on scope

**Optional: Task 08 (if needed after testing)**
```
Execute task 08
```
- Only needed if RSC errors occur during offline navigation

## Task Reference

| # | Name | What It Does |
|---|------|--------------|
| 08 | RSC handling | Safety net for offline navigation (LOW priority) |
| 09 | Architecture doc | Reference document (no changes) |
| 10 | Middleware | Remove Clerk from dashboard routes |
| 11 | Guard component | Check IndexedDB before rendering pages |
| 12 | Outbox processor | Process mutation queue |
| 13 | Sync scheduler | Background sync service |
| 14 | Auth session | Persist Clerk auth to IndexedDB |
| 15 | Page conversions | Convert remaining pages to IndexedDB |

## Dependencies

```
Task 10 (middleware) ←┐
Task 11 (guard)      ←┼─ Can be done together
Task 14 (auth)       ←┘

Task 12 (outbox)     ←┐
Task 13 (scheduler)  ←┴─ Depends on 12

Task 15 (pages)      ←── Depends on 10, 11

Task 08 (RSC)        ←── Optional, after testing
```

## Verifying Completion

After Phase 2:

```bash
pnpm build && pnpm start
```

1. Sign in and visit all pages (populate IndexedDB)
2. Go offline (DevTools → Network → Offline)
3. Reload `/en/overview` → should load from IndexedDB
4. Click nav links → should navigate (full page reload)
5. Create a feed log → should save locally
6. Go online → should sync automatically
