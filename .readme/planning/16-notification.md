# Unified Notification System Design

Date: 2026-01-24

This document defines a unified notification system with two channels:

1) User-initiated feedback (short Sonner toasts, top-center).
2) System/background notifications (persistent log, bell icon + dot, separate page).

It also addresses storage choices (IndexedDB vs Neon/Postgres) for system notifications and
proposes a shared API that can be called from anywhere in the front-end.

---

## Goals
- Provide consistent, low-friction feedback for user actions (save, create, update).
- Persist non-user-initiated system events in a log (sync, merges, background changes).
- Avoid disruptive popups for background activity; surface via a bell icon + dot.
- Work offline; no dependency on network for core logging.
- Be lightweight, with retention and dedupe to avoid runaway growth.
- Leave clear integration points for future push/inbox notifications.

## Non-goals (v1)
- Real-time push notifications.
- Full cross-device/system-wide notification history.
- High-volume analytics or detailed audit trail.

---

## Notification Types

### A) User-Initiated (Toast Only)
Triggered by direct user actions (button clicks, form submissions).
Examples:
- "Feed saved"
- "Settings updated"
- "Invite revoked"
- "Failed to save"

Behavior:
- Sonner toast at top-center.
- Short copy, 1 line if possible.
- Duration ~3s for success, 4-6s for warnings/errors.
- No persistence.

### B) System/Background (Log Only)
Triggered by non-user actions (sync, background pull, remote changes, offline/online transitions).
Examples:
- Outbox flush succeeded/failed
- Remote updates applied
- Conflict resolved (LWW overwrite)
- Access revoked
- Network offline/online transitions

Behavior:
- Logged to notifications page.
- Bell icon shows primary-color dot for unread.
- Optional subtle inline indicators (status chips) but no toast.

### C) Remote/Push (Future, not in v1)
Planned for later PWA push notifications. These are server-sourced and may be delivered
via push or via a pull-based inbox sync. In v1 we only log local system events, but we
reserve room in the data model and UI to merge remote notifications in the same bell page.

---

## UX Decisions

### 1) Bell Icon + Dot
Placement:
- App header, top-right, immediately left of the gear/settings icon.
- Mobile and desktop both show it.

Indicator:
- Primary-color dot if there is at least one unread system notification.
- Optional count badge later if volume warrants (not required now).

Interaction:
- Tapping navigates to `/notifications` (localized path).

### 2) Notifications Page (System Log)
Location:
- `src/app/[locale]/(auth)/(app)/notifications/page.tsx`

Structure:
- Header: "System Notifications"
- Filters: All / Errors / Sync / Access / Other
- Actions: "Mark all read", "Clear resolved" (optional)
- List items:
  - Title (short)
  - Timestamp (relative + absolute on hover)
  - Severity pill (info / warning / error)
  - Context (baby name, entity type, source)
  - Optional "details" expander showing metadata

Empty State:
- Friendly empty card, "You're all caught up."

### 3) Sonner Toasts (User-Action Feedback)
Placement:
- Top-center.
- Max stack: 1-2 visible to keep UI unobstructed. (sonner already comes with stack option multiple sonner can stack to eachother very well. see: .readme/resource/CleanShot 2026-01-24 at 15.02.18.png)

Copy Guidelines:
- Keep to 3-6 words.
- Use consistent verbs: "Saved", "Updated", "Failed", "Synced". Allow extra word that passed from place it was called, but put a hard limit to make sure its one line at 375px wide mobile.
- Avoid technical details. Put details in system log if needed.

---

## Data Storage Strategy

### IndexedDB (Recommended for v1)
Use the existing Dexie database and add a new table for notifications.
This keeps the system offline-first and avoids server bloat.

Reasons:
- System logs are local UX data, not canonical domain data.
- Avoids high-volume writes to Neon/Postgres.
- Enables offline capture and review.

Retention:
- Keep last 60 days OR last 500 entries (configurable via constants).
- Prune on app load or when inserting new events.

### Postgres (Optional, v2+, for cross-device + push inbox)
Only needed if you want:
- Cross-device notification history.
- Audit trails for support or compliance.
- A server-side inbox to support PWA push or pull-based remote notifications.

If added later:
- Store only high-signal events (errors, conflicts).
- Use TTL or scheduled cleanup.
- Prefer compact aggregation to reduce volume.

---

## Proposed Data Model (IndexedDB)

Table: `notifications`

Fields:
- `id`: string (uuid)
- `userId`: number (local user id for scoping)
- `origin`: 'local' | 'remote' (reserved for future push/inbox)
- `category`: 'sync' | 'access' | 'system' | 'error'
- `severity`: 'info' | 'warning' | 'error'
- `title`: string
- `message`: string (short)
- `createdAt`: Date
- `readAt`: Date | null
- `babyId`: number | null
- `entityType`: string | null
- `entityId`: string | null
- `remoteId`: string | null (server notification id, future)
- `source`: 'background' | 'system' (local-only for v1)
- `dedupeKey`: string | null (used to merge repeated events)
- `count`: number (occurrence count)
- `metadata`: Record<string, unknown> | null
- `expiresAt`: Date | null

Indexes:
- `userId`
- `origin`
- `createdAt`
- `readAt`
- `category`
- `severity`
- `babyId`
- `dedupeKey`

Notes:
- `count` increments for repeated identical events.
- `dedupeKey` prevents spamming the log (ex: repeated offline errors).
- System notifications are **per user** by default, with optional `babyId` for context.
- `origin = remote` is reserved for future push/inbox items; v1 writes only `origin = local`.

---

## Shared Front-End API

### Toast API (User-initiated)
Provide a small wrapper to standardize toasts:

```
notifyToast.success('Saved');
notifyToast.error('Failed to save');
notifyToast.warning('Offline');
```

Implementation:
- Wrap `sonner` `toast` with a typed helper.
- Keep it thin and synchronous; no persistence.
- Recommended base component: `ToastHost` (listens to a store queue, renders Sonner).

Example store-driven flow:
```
enqueueToast({ variant: 'success', message: 'Saved' });
```

`ToastHost`:
- Subscribes to `useToastStore`.
- Calls `toast.success/error/warning(...)`.
- Marks the queued item as shown.

### System Notification API (Background)
Use a dedicated store + persistence helper:

```
notifySystem({
  category: 'sync',
  severity: 'warning',
  title: 'Sync failed',
  message: 'Will retry when online',
  dedupeKey: 'sync:pull:offline',
  metadata: { reason: 'offline' },
});
```

Design options:
1) **Direct helper**: `notifyToast.*` imports Sonner and shows toasts immediately.
2) **Store-driven** (preferred for "call anywhere"): `useToastStore.enqueue(...)` + `ToastHost`.

---

## State Management

### Zustand Store (Global)
Create `useNotificationStore`:
- `items: NotificationItem[]`
- `unreadCount: number`
- `add(item)`
- `markRead(id)`
- `markAllRead()`
- `clearResolved()` (optional)
- `hydrateFromIndexedDb()`

Use the store for:
- Bell dot state
- Notifications page list rendering
- Sync with IndexedDB

### Notification Host (Optional)
If you want state-driven toasts:
- `NotificationToastHost` component reads a `toastQueue` store,
  invokes `toast(...)`, then marks each as shown.
Otherwise, direct `notifyToast.*` calls are sufficient.

### Suggested Retention Config
Define a constant (single source of truth):
- `NOTIFICATION_RETENTION_DAYS = 60`
- `MAX_NOTIFICATIONS = 500`
Use this in the prune logic and add to config or constants area.

---

## Integration Points

### User-initiated flows
- Operations layer (`src/services/operations/*`)
- Form submit handlers (`NewBabyForm`, `AddFeedModal`, settings)
- Action results (`{ success, error }`) -> toast

### System/Background flows
- Sync scheduler (`src/hooks/useSyncScheduler.ts`)
- Sync worker manager (`src/services/sync-worker-manager.ts`)
- Outbox flush failures (`src/services/sync/*`)
- Access revocation (`useAccessRevocationDetection`) -> log + modal + warning toast
- Offline/online transitions (`OfflineBanner` or network listeners)

Current toasts in background contexts (e.g., sync scheduler) should be moved to
system notifications (log only), except for truly blocking errors.

---

## UI Placement Plan

### App Header
- Add a `NotificationBell` next to the gear icon in `src/components/navigation/AppHeader.tsx`.
- On click, navigate to `/notifications`.
- Dot shown when `unreadCount > 0`.

### Notifications Page
- Create a page under App Router:
  - `src/app/[locale]/(auth)/(app)/notifications/page.tsx`
  - Use existing layout and styling conventions.

---

## Dedupe + Rollup Strategy

Some events will fire repeatedly (offline, sync failures).
To prevent spam:

- Use `dedupeKey` for similar events.
- If a new event matches existing `dedupeKey` within a time window (e.g. 10 min):
  - Increment `count`.
  - Update `createdAt` to latest occurrence.
  - Keep only one row.

---

## Suggested Severity Mapping

| Scenario | Category | Severity | Channel |
| --- | --- | --- | --- |
| User saved feed | system | info | toast |
| User error on save | system | error | toast |
| Background sync complete | sync | info | log |
| Background sync failed | sync | warning | log |
| Access revoked | access | error | log + modal + toast |
| Offline detected | system | warning | log (banner already covers UI) |
| Merge conflict resolved | sync | warning | log |

---

## Storage Decision Answer (IndexedDB vs Neon)

Recommendation (now):
- Use IndexedDB only.
- Add retention + dedupe to keep size small.
- This keeps the data local and avoids Postgres growth.

Consider Postgres later if:
- You need cross-device notification history.
- You want auditability for support.

If Postgres is added:
- Store only high-signal error/conflict events.
- Use TTL cleanup.
- Avoid logging every sync success.

---

## Postgres Sizing Estimate (Given Current Assumptions)

Assumptions:
- 10–50 system notifications per user per day
- 10k users
- 60-day retention
- Approx 1–2 KB per row (including index overhead)

Per user:
- 10/day → 600 rows → ~0.6–1.2 MB
- 50/day → 3000 rows → ~3–6 MB

Total (10k users):
- Low: ~6–12 GB
- High: ~30–60 GB

Notes:
- Actual size depends on message length, metadata size, and indexes.
- Storage cost = GB‑month + compute + PITR (if enabled).
- Daily S3 backups can cover long‑term rollback; notifications themselves are usually
  low‑value for long‑term backups and can be excluded from deep history if needed.

Cost formula (fill in with current Neon plan rate):
- Estimated storage cost ≈ `total_GB * $/GB-month`
- Total bill also includes compute hours + PITR change-data (if enabled)

---

## Write Batching (If Postgres Is Added Later)

Not needed for v1 (local‑only). If/when server storage is introduced:
- Buffer notifications locally and send in batches (e.g., every 2–5 minutes or on idle).
- Use a single bulk insert per batch to reduce CPU/WAL churn.
- Cap batch size to avoid large payloads (e.g., 200–500 items).
- Use dedupe keys server‑side to collapse repeats.


## Account Switch & Logout Behavior

Current behavior:
- `signOutCleanup()` clears **all** IndexedDB tables.
- This means notifications are wiped on logout.

Recommended v1:
- Keep notifications local-only and accept clearing on logout.
- This aligns with privacy + current local-first cleanup.
 - If a server inbox is added later, local data can be wiped safely and rehydrated on login.

If you need persistence across logins:
1) **Per-user local storage**: include `userId` on notifications and change logout cleanup
   to delete only the current user’s rows (not all data).
   - Risk: leaves previous account data on shared devices.
2) **Server-backed history**: store high-signal notifications in Postgres and hydrate on login.
   - Higher complexity, but clear cross-device history.

---

## Future Push Notifications (Reserved Design Space)

Not required for v1, but plan for compatibility:

UI:
- Bell icon remains the single entry point.
- Notifications page can become a tabbed view:
  - "System" (local log)
  - "Remote/Push" (server inbox)

Data Sources:
- Local log stays in IndexedDB (source of truth for background events).
- Remote notifications live on server (separate table) and sync down on a schedule.
  This keeps "delivery" (push/inbox) separate from "local system log" events.

Sync Strategy (future):
- Pull-based inbox sync every N seconds/minutes (configurable).
- Merge remote items into local IndexedDB with `origin = remote` + `remoteId`.
- Optional push delivery can still be used to wake the client, but history is pulled.

This keeps today’s architecture intact while leaving a clear path for push.

---

## Phased Implementation Plan

### Phase 1 - Core Infrastructure (v1)
1. Add `notifications` table to Dexie schema.
   - Update `clearAllLocalData()` to include notifications for logout cleanup.
2. Create `useNotificationStore` + IndexedDB helpers.
3. Implement `notifySystem` helper with persistence + dedupe.
4. Add `NotificationBell` to `AppHeader`.
5. Add `/notifications` page with list + mark read.

### Phase 2 - Wiring (v1)
6. Route existing background toasts to system notifications.
7. Add `notifyToast` wrapper for user-initiated flows.
8. Use consistent copy across forms/operations.

### Phase 3 - Enhancements (later)
9. Add filters, grouping, bulk actions.
10. Add optional server-side storage for critical events only.
11. Add export/log share for support (optional).

---

## Resolved Decisions
- System notifications are **per user**, with optional `babyId` for context and filters.
- Access revocation shows: modal + warning toast + logged notification.
- No "Retry sync" action for now.
- Retention default: **60 days** (configurable constant).

---

## Open Questions
- Should notifications be grouped by baby in the UI (tabs) or filtered only?
- Do we want an export/share button for support in the future?
