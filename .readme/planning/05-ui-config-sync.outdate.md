# UI Config Sync & Settings Refinement

**Priority:** Medium  
**Dependencies:** 01-state-management-sync.md, 03-sync-api-endpoints.md  
**Estimated Scope:** Medium

---

## Overview

Unify UI settings storage/sync with the settings page refinement. Persist settings locally in Dexie, sync to Postgres as the canonical source, and refine the Settings UI (layout + controls) to surface those preferences.

---

## Requirements

### Data Storage & Sync

- Use one config document per user (JSON) stored in Postgres (jsonb).
- Track `keyUpdatedAt` per attribute for partial merge.
- Keep Dexie as the immediate read model for the UI.
- Updates write locally first, then enqueue a sync mutation.
- Server merges by per-key timestamp (LWW per attribute).
- Initial sync returns UI config in full (small payload).
- When login user must able to see page with their local settings first without needing to sync.

### Settings Layout

| Screen Size | Behavior |
|-------------|----------|
| Mobile (< 640px) | Full width, stacked |
| Tablet (640-1024px) | Centered, max-width 600px |
| Desktop (> 1024px) | Centered, max-width 600px |

### Settings Fields

| Setting | Type | Options |
|---------|------|---------|
| Hand mode | Toggle | Left / Right |
| Theme | Toggle | Light / Dark / System |
| Default log view | Dropdown | Feed / Sleep / All |
| Notifications | Toggle | On / Off |

### Login Conflict Handling

- If local and remote differ, prompt:
  - Keep local (overwrite server)
  - Use server (overwrite local)
  - Auto merge (newest attribute wins per key)
- Default action should be explicit (no silent overwrite).

### Logout Cleanup

- On explicit sign out, clear IndexedDB tables and localStorage keys used by settings.
- Ensure offline session marker is cleared.

---

## Hand Mode Feature

### Purpose

Optimize UI for one-handed mobile use. When set to "Left", primary action buttons move to the left side of the screen.

### Affected Components

| Component | Left Mode | Right Mode (default) |
|-----------|-----------|---------------------|
| Add button (FAB) | Bottom-left | Bottom-right |
| Sheet close button | Top-left | Top-right |
| Primary actions | Left-aligned | Right-aligned |
| Timer controls | Left side | Right side |

### CSS Utilities for Hand Mode

```css
/* Add to globals.css or Tailwind config */

/* Left-handed mode utilities */
.hand-left .fab { @apply left-4 right-auto; }
.hand-left .sheet-close { @apply left-4 right-auto; }
.hand-left .primary-action { @apply justify-start; }

.hand-right .fab { @apply right-4 left-auto; }
.hand-right .sheet-close { @apply right-4 left-auto; }
.hand-right .primary-action { @apply justify-end; }
```

---

## Data Model

### Postgres (new table or column)

Option A: Dedicated table

```sql
CREATE TABLE user_ui_config (
  user_id INTEGER PRIMARY KEY REFERENCES "user"(id),
  data JSONB NOT NULL,
  key_updated_at JSONB NOT NULL,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  schema_version INTEGER NOT NULL DEFAULT 1
);
```

Option B: `user.ui_config` column (jsonb) + `user.ui_config_meta` column (jsonb).

### Client Shape (Dexie)

```ts
export type LocalUIConfig = {
  userId: number;
  data: Record<string, unknown>;
  keyUpdatedAt: Record<string, string>; // ISO timestamps by key path
  updatedAt: Date;
  schemaVersion: number;
};
```

### Example Payload

```json
{
  "data": {
    "theme": "dark",
    "handMode": "left",
    "defaultLogView": "all",
    "notificationsEnabled": true,
    "timeSwiper": {
      "swipeSpeed": 1.4,
      "incrementMinutes": 5
    }
  },
  "keyUpdatedAt": {
    "theme": "2026-01-14T02:10:00.000Z",
    "handMode": "2026-01-14T02:12:00.000Z",
    "defaultLogView": "2026-01-14T02:13:00.000Z",
    "notificationsEnabled": "2026-01-14T02:14:00.000Z",
    "timeSwiper.swipeSpeed": "2026-01-14T02:15:00.000Z",
    "timeSwiper.incrementMinutes": "2026-01-14T02:16:00.000Z"
  },
  "updatedAt": "2026-01-14T02:16:00.000Z",
  "schemaVersion": 1
}
```

---

## Merge Strategy (Server Canonical)

### Server Merge (per key)

For each key path in incoming patch:

```
if incoming.updatedAt > server.keyUpdatedAt[key] then
  server.data[key] = incoming.value
  server.keyUpdatedAt[key] = incoming.updatedAt
```

Update `updated_at` to `max(updated_at, latestKeyUpdatedAt)`.

### Client Merge (auto mode)

- Compare local `data` vs remote `data` per key path.
- If both differ, select the value with the newer `keyUpdatedAt`.
- If neither side has `keyUpdatedAt` for a key, fall back to `updatedAt`.

---

## Login Conflict UX

### Detection

- Fetch remote UI config during initial sync.
- If local exists and any key differs:
  - Build a diff list for display.
  - Determine if keys changed on both sides (conflict candidates).

### Prompt Actions

- **Keep local**: push local snapshot to server (force overwrite).
- **Use server**: replace local Dexie config with server snapshot.
- **Auto merge**: apply merge rules locally, then push merged result.

---

## UI Design

### Settings Page Layout

```
┌─────────────────────────────────────────┐
│  Settings                               │
├─────────────────────────────────────────┤
│                                          │
│  Account                                 │
│  ┌─────────────────────────────────────┐│
│  │ Profile                          →  ││
│  ├─────────────────────────────────────┤│
│  │ Sign out                            ││
│  └─────────────────────────────────────┘│
│                                          │
│  Babies                                  │
│  ┌─────────────────────────────────────┐│
│  │ Manage babies                    →  ││
│  └─────────────────────────────────────┘│
│                                          │
│  Preferences                             │
│  ┌─────────────────────────────────────┐│
│  │ Theme                    [System ▼] ││
│  ├─────────────────────────────────────┤│
│  │ Hand mode                [Right ▼]  ││
│  ├─────────────────────────────────────┤│
│  │ Default view             [Feed ▼]   ││
│  └─────────────────────────────────────┘│
│                                          │
│  About                                   │
│  ┌─────────────────────────────────────┐│
│  │ Version                      1.0.0  ││
│  └─────────────────────────────────────┘│
│                                          │
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Schema + Types

- [ ] Add Postgres storage (table or user column).
- [ ] Add Drizzle schema + migration.
- [ ] Extend `LocalUIConfig` to include `data` and `keyUpdatedAt`.
- [ ] Update Dexie schema version and helpers.

### Phase 2: API + Sync

- [ ] Add `GET /api/user/ui-config` (or include in bootstrap).
- [ ] Add `POST /api/user/ui-config` for patch merge.
- [ ] Add outbox entity type `ui_config` and push handler.
- [ ] Update initial sync response to include UI config snapshot.

### Phase 3: Merge Logic + Conflict UX

- [ ] Build key-path diff + merge utilities.
- [ ] Implement conflict prompt on login.
- [ ] Store user choice for that session.

### Phase 4: Settings Layout Refinement

- [ ] Add container with `max-w-xl mx-auto` to settings page.
- [ ] Ensure consistent padding on mobile.
- [ ] Add section headers (Account, Babies, Preferences, About).
- [ ] Style setting items consistently.

### Phase 5: Settings Controls + Behavior

- [ ] Create or update UI config store backed by Dexie.
- [ ] Add hand mode selector to settings.
- [ ] Add theme selector with "System" option.
- [ ] Add default view selector and notifications toggle.
- [ ] Migrate TimeSwiper localStorage to `uiConfig.data.timeSwiper`.
- [ ] Update FAB, sheet close, primary actions, and timer controls for hand mode.
- [ ] Add version info display and "Clear local data" option (debug).
- [ ] Ensure updates enqueue outbox mutations.

### Phase 6: Logout Cleanup

- [ ] Wire `clearAllLocalData()` into sign out flow.
- [ ] Clear localStorage keys for settings.

### Phase 7: Tests

- [ ] Unit test merge helper (per-key LWW).
- [ ] API route tests for merge behavior and auth.
- [ ] Apply e2e test for settings page, make sure the configuration shows up and can be clicked.

---

## Success Criteria

- [ ] Settings page has consistent max-width on desktop.
- [ ] Sections are clearly grouped.
- [ ] Hand mode toggle moves actions correctly.
- [ ] UI settings persist across sessions and devices.
- [ ] Offline edits sync correctly after reconnect.
- [ ] Login prompts appear when configs differ and apply chosen action.
- [ ] Explicit sign out removes local config and cached settings.
