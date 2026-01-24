# Notification System - Master Plan

## Overview

This document tracks the implementation of the unified notification system with two channels:
1. **User-initiated feedback** - Short Sonner toasts (top-center)
2. **System/background notifications** - Persistent log (bell icon + notifications page)

See parent document: `../16-notification.md` for full design rationale.

---

## Execution Order

```
Phase 1: Core Infrastructure
├── 01-dexie-schema.md      ← Start here
├── 02-notification-helpers.md
└── 03-notification-store.md

Phase 2: APIs
├── 04-toast-api.md
└── 05-system-notify-api.md

Phase 3: UI
├── 06-bell-icon.md
└── 07-notifications-page.md

Phase 4: Integration
└── 08-integration.md

Phase 5: Testing
└── 09-tests.md
```

---

## Sub-Plan Links

| # | File | Phase | Status | Description |
|---|------|-------|--------|-------------|
| 01 | [dexie-schema](./01-dexie-schema.md) | 1a | ⏳ Pending | Dexie table + types |
| 02 | [notification-helpers](./02-notification-helpers.md) | 1b | ⏳ Pending | IndexedDB CRUD functions |
| 03 | [notification-store](./03-notification-store.md) | 1c | ⏳ Pending | Zustand store |
| 04 | [toast-api](./04-toast-api.md) | 2a | ⏳ Pending | Toast wrapper + ToastHost |
| 05 | [system-notify-api](./05-system-notify-api.md) | 2b | ⏳ Pending | notifySystem() helper |
| 06 | [bell-icon](./06-bell-icon.md) | 3a | ⏳ Pending | NotificationBell component |
| 07 | [notifications-page](./07-notifications-page.md) | 3b | ⏳ Pending | /notifications page |
| 08 | [integration](./08-integration.md) | 4 | ⏳ Pending | Wire up existing code |
| 09 | [tests](./09-tests.md) | 5 | ⏳ Pending | Unit + E2E tests |

---

## Definition of Done

- [ ] Notifications table in Dexie with proper indexes
- [ ] Zustand store hydrated from IndexedDB
- [ ] `notifyToast.*` wrapper replaces direct Sonner calls
- [ ] `notifySystem()` logs to IndexedDB with dedupe
- [ ] Bell icon in header with unread dot
- [ ] Notifications page lists system events
- [ ] Background sync events logged (not toasted)
- [ ] Toast durations updated to 3s/5s
- [ ] Retention pruning implemented (60 days / 500 items)
- [ ] Unit + E2E tests passing

---

## Files Summary

### New Files (15)

| File | Phase |
|------|-------|
| `src/lib/local-db/types/notifications.ts` | 1a |
| `src/lib/local-db/helpers/notifications.ts` | 1b |
| `src/stores/useNotificationStore.ts` | 1c |
| `src/lib/notify/toast.ts` | 2a |
| `src/stores/useToastStore.ts` | 2a |
| `src/components/ToastHost.tsx` | 2a |
| `src/lib/notify/system.ts` | 2b |
| `src/lib/notify/index.ts` | 2b |
| `src/components/navigation/NotificationBell.tsx` | 3a |
| `src/app/[locale]/(auth)/(app)/notifications/page.tsx` | 3b |
| `src/app/[locale]/(auth)/(app)/notifications/_components/*.tsx` | 3b |
| Test files (3) | 5 |

### Modified Files (10)

| File | Phase | Change |
|------|-------|--------|
| `src/lib/local-db/database.ts` | 1a | Add notifications table |
| `src/lib/local-db/helpers/user.ts` | 1a | Add to clearAllLocalData |
| `src/components/ui/sonner.tsx` | 2a | Update durations |
| `src/app/[locale]/layout.tsx` | 2a | Add ToastHost |
| `src/components/navigation/AppHeader.tsx` | 3a | Add bell icon |
| `src/hooks/useSyncScheduler.ts` | 4 | Route to notifySystem |
| `src/hooks/useAccessRevocationDetection.ts` | 4 | Add log entry |
| `src/contexts/LogoutContext.tsx` | 4 | Keep as-is (user-initiated) |
| Various settings/form components | 4 | Use notifyToast |

---

## Verification Checklist

### Manual Testing
- [ ] Trigger sync error while offline → log entry appears, no toast
- [ ] Save settings → toast appears at 3s duration
- [ ] Bell icon shows dot when unread
- [ ] Navigate to notifications page, list renders
- [ ] Click "mark all read" → dot disappears

### Automated Tests
- [ ] `npm run test` passes
- [ ] `npm run test:e2e` passes
- [ ] `npm run lint` passes
- [ ] `npm run typecheck` passes
