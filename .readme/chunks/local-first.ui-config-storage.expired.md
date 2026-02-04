---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/lib/local-db/types/entities.ts
  - src/lib/local-db/helpers/ui-config.ts
  - src/lib/local-db/database.ts
  - src/models/Schema.ts
  - migrations/0009_whole_purifiers.sql
  - src/components/feed/TimeSwiper.tsx
  - src/components/feed/AmountSlider.tsx
  - src/components/SyncProvider.tsx
  - src/stores/useUserStore.ts
  - src/hooks/useWidgetSettings.ts
  - src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx
  - src/services/operations/ui-config.ts
conversation_context: "Updated UI config storage docs after settings component refactor and operations-layer adoption for theme/hand."
expired_reason: "entities.ts and operations/ui-config.ts modified"
---

# UI Config Storage & Sync

**⚠️ EXPIRED**: Awaiting refresh.

## Purpose
Persistent storage system for user UI preferences (theme, hand mode, default views) with local-first architecture and per-key timestamp tracking for Last-Write-Wins (LWW) merge during sync.

## Architecture

### Dual Storage Model
- **Dexie (IndexedDB)**: Immediate read model, loads instantly without network
- **Postgres (user_ui_config table)**: Canonical source of truth, syncs across devices
- **No localStorage**: All persistent settings moved from localStorage to IndexedDB for consistency

### Data Structure

```typescript
// TypeScript shape in entities.ts
export type LocalUIConfig = {
  userId: number;
  data: UIConfigData;              // Flexible JSON structure
  keyUpdatedAt: Record<string, string>; // ISO timestamps per key path
  schemaVersion: number;
  updatedAt: Date;
};

export type UIConfigData = {
  theme?: 'light' | 'dark' | 'system';
  handMode?: 'left' | 'right';
  defaultLogView?: 'all' | 'feed' | 'sleep';
  notificationsEnabled?: boolean;
  dashboardVisibility?: {
    feed?: boolean;
    sleep?: boolean;
    // ... other activities
  };
  timeSwiper?: {
    use24Hour?: boolean;
    swipeSpeed?: number;
    incrementMinutes?: number;
    magneticFeel?: boolean;
    showCurrentTime?: boolean;
  };
  amountSlider?: {
    minAmount?: number;
    defaultAmount?: number;
    maxAmount?: number;
    increment?: number;
    dragStep?: number;
    startOnLeft?: boolean;
  };
  useMetric?: boolean; // Global preference for ml vs oz
  [key: string]: unknown; // Future extensibility
};
```

### Postgres Schema

```sql
CREATE TABLE "user_ui_config" (
  "user_id" integer PRIMARY KEY NOT NULL,
  "data" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "key_updated_at" jsonb DEFAULT '{}'::jsonb NOT NULL,
  "schema_version" integer DEFAULT 1 NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
```

**Key fields:**
- `data`: Flexible JSONB for all UI preferences
- `key_updated_at`: Per-key timestamps enable granular LWW merge (e.g., `{"theme": "2026-01-15T10:30:00Z", "handMode": "2026-01-15T10:31:00Z"}`)
- `schema_version`: Enables future migration logic if config structure changes

### Dexie Table

```typescript
// In database.ts
uiConfig: '&userId, updatedAt'
```

**Note**: Uses `userId` as primary key (one config per user).

## Helper Functions

Located in `src/lib/local-db/helpers/ui-config.ts`.

### Core Operations

```typescript
// Get config (auto-creates with defaults if missing)
await getUIConfig(userId: number): Promise<LocalUIConfig>

// Update multiple keys at once
await updateUIConfig(userId: number, updates: Partial<UIConfigData>): Promise<LocalUIConfig>

// Update single nested key with dot notation
await updateUIConfigKey(userId: number, keyPath: string, value: unknown): Promise<LocalUIConfig>
// Example: updateUIConfigKey(userId, 'timeSwiper.swipeSpeed', 1.5)

// Get single value with dot notation
await getUIConfigValue<T>(userId: number, keyPath: string): Promise<T | undefined>

// Reset to defaults
await resetUIConfig(userId: number): Promise<LocalUIConfig>

// Delete (used during logout)
await deleteUIConfig(userId: number): Promise<void>
```

### Sync-Related Operations

```typescript
// Get exact stored state (without default merging)
await getRawUIConfig(userId: number): Promise<LocalUIConfig | undefined>

// Replace entire config (used when pulling from server)
await replaceUIConfig(config: LocalUIConfig): Promise<void>

// Merge remote config using per-key LWW
await mergeUIConfig(
  userId: number,
  remoteData: UIConfigData,
  remoteKeyUpdatedAt: Record<string, string>
): Promise<LocalUIConfig>
```

## Per-Key Timestamp Tracking

### Nested Key Paths

Settings are stored hierarchically but tracked with flat dot-notation paths:

```json
{
  "data": {
    "theme": "dark",
    "timeSwiper": {
      "swipeSpeed": 1.5,
      "incrementMinutes": 5
    }
  },
  "keyUpdatedAt": {
    "theme": "2026-01-15T10:30:00Z",
    "timeSwiper.swipeSpeed": "2026-01-15T10:31:00Z",
    "timeSwiper.incrementMinutes": "2026-01-15T10:32:00Z"
  }
}
```

### Why Per-Key Timestamps?

- **Granular conflict resolution**: If user changes theme on device A and handMode on device B, both changes are preserved during merge (not overwriting the entire config)
- **Partial updates**: Only send changed keys to server, not entire config
- **Future-proof**: Adding new settings doesn't affect existing timestamp tracking

## Merge Logic (LWW)

### Client-Side Merge (during sync pull)

For each key path in remote config:
```
if (!localKeyUpdatedAt[key] || remoteKeyUpdatedAt[key] > localKeyUpdatedAt[key]) {
  // Remote is newer, take remote value
  mergedData[key] = remoteData[key]
  mergedKeyUpdatedAt[key] = remoteKeyUpdatedAt[key]
} else {
  // Local is newer or equal, keep local value
}
```

### Server-Side Merge (during sync push)

Server applies the same logic when receiving partial updates from client:
```
for each key in incomingPatch:
  if incoming.keyUpdatedAt[key] > server.keyUpdatedAt[key]:
    server.data[key] = incoming.data[key]
    server.keyUpdatedAt[key] = incoming.keyUpdatedAt[key]
```

**TODO**: Server merge endpoint not yet implemented (Phase 2 of .readme/planning/05-ui-config-sync.md).

## Migration from localStorage

### TimeSwiper Settings

Previously stored in localStorage as `time-swiper-settings`. Now migrated to `uiConfig.data.timeSwiper`:

```typescript
// Old (localStorage)
const settings = localStorage.getItem('time-swiper-settings')

// New (IndexedDB via ui-config helper)
const swipeSpeed = await getUIConfigValue(userId, 'timeSwiper.swipeSpeed')
```

**Status**: Migration complete. TimeSwiper now reads from IndexedDB via `getUIConfig()` helper.

**Critical Bug Fix (2026-01-16)**: Settings weren't loading because `userId` was undefined. Root cause: user store was never hydrated from IndexedDB. Solution: Created `SyncProvider` component to handle store hydration on app initialization (see `.readme/chunks/local-first.store-hydration-pattern.md`).

## Default Values

Defined in `entities.ts`:

```typescript
export const DEFAULT_UI_CONFIG_DATA: UIConfigData = {
  theme: 'system',
  handMode: 'right',
  defaultLogView: 'all',
  notificationsEnabled: true,
  dashboardVisibility: {
    feed: true,
    sleep: true,
    solids: false,
    bath: false,
    activities: false,
  },
};
```

New fields added to schema automatically get defaults merged in by `getUIConfig()`.

## Usage Patterns

### Read on Page Load

**IMPORTANT**: Always wait for store hydration before reading userId.

```typescript
// In React component
const user = useUserStore(s => s.user);
const userId = user?.localId;
const isHydrated = useUserStore(s => s.isHydrated);

useEffect(() => {
  // Guard: Wait for store hydration
  if (!isHydrated) {
    console.log('Skipping - not hydrated yet');
    return;
  }

  if (!userId) {
    console.log('Skipping - no userId');
    return;
  }

  // Now safe to read from IndexedDB
  async function load() {
    const config = await getUIConfig(userId);
    setHandMode(config.data.handMode ?? 'right');
  }
  load();
}, [isHydrated, userId]);
```

**Common Bug**: Reading `userId` immediately without checking `isHydrated` results in `undefined` on first render, causing settings to never load.

### Update on User Action

```typescript
// Immediate local update (local-first)
const handleChange = async (newValue: HandMode) => {
  const result = await updateHandMode({ handMode: newValue });
  if (!result.success) {
    console.error(result.error);
  }
};
```

**Current usage split**:
- Theme/hand selectors call operations (`updateTheme`, `updateHandMode`).
- Widget settings (`useWidgetSettings`, `TimeSwiper`, `AmountSlider`) still call `updateUIConfig` directly.

## Sync Flow (Future)

When sync API is implemented:

1. **User changes setting** → Write to Dexie, enqueue outbox mutation
2. **Periodic sync** → Push outbox mutations to server, pull remote changes
3. **Server merge** → Apply per-key LWW merge on server
4. **Client merge** → Pull merged result, apply per-key LWW merge locally
5. **Clear outbox** → Remove synced mutation from outbox

## Integration Points

### Settings Page
- `src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx`: Hand mode selector (uses `updateHandMode`)
- `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx`: Theme selector (uses `updateTheme`)
- `src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx`: Layout with all settings

### Dev Palette Page
- `src/app/[locale]/dev/page.tsx`: Development-only page for previewing activity color palette and tiles
- Hidden in production (`process.env.NODE_ENV !== 'development'`)
- Shows all activity types with their CSS variable colors

### Bootstrap API
- `src/app/[locale]/api/bootstrap/route.ts`: Will include UI config in response (planned)

### Logout Cleanup
- `deleteUIConfig(userId)` must be called during sign-out to clear local config

## Gotchas

1. **Always use helpers**: Never access `localDb.uiConfig` directly. Use helper functions for correct timestamp management.

2. **Dot notation for nested keys**: Use `updateUIConfigKey(userId, 'timeSwiper.swipeSpeed', 1.5)` not `updateUIConfig(userId, { timeSwiper: { swipeSpeed: 1.5 } })` when updating a single nested field (avoids overwriting sibling fields).

3. **Default merging**: `getUIConfig()` always merges defaults. Use `getRawUIConfig()` for exact stored state.

4. **One config per user**: No per-baby settings. All settings are user-level.

5. **Server sync not yet implemented**: Currently local-only. Outbox pattern and API endpoints are TODO.

6. **Wait for store hydration**: Always check `isHydrated` flag before reading `userId` from store. Without this guard, `userId` will be `undefined` and settings won't load. See `.readme/chunks/local-first.store-hydration-pattern.md` for details.

## Extending UI Config with New Settings

### Step-by-Step Guide

When adding a new UI preference that needs to be stored and synced:

**Step 1: Update TypeScript Type**

Add the new setting to `UIConfigData` in `src/lib/local-db/types/entities.ts`:

```typescript
export type UIConfigData = {
  theme?: ThemeMode;
  handMode?: HandMode;
  useMetric?: boolean;
  // ... existing fields

  // Add your new setting group
  newFeature?: {
    enabled?: boolean;
    customValue?: number;
  };
};
```

**Step 2: Update Default Values (Optional)**

If the setting should have a default value, add it to `DEFAULT_UI_CONFIG_DATA`:

```typescript
export const DEFAULT_UI_CONFIG_DATA: UIConfigData = {
  theme: 'system',
  // ... existing defaults

  newFeature: {
    enabled: true,
    customValue: 10,
  },
};
```

**Step 3: Load Settings in Component**

```typescript
useEffect(() => {
  if (!isHydrated || !userId) return;

  async function loadSettings() {
    const config = await getUIConfig(userId);
    const value = config.data.newFeature?.enabled ?? true;
    setMyState(value);
  }
  loadSettings();
}, [isHydrated, userId]);
```

**Step 4: Save Settings on Change**

```typescript
const handleChange = async (newValue: boolean) => {
  await updateUIConfig(userId, {
    newFeature: { enabled: newValue }
  });
  // TODO: Enqueue outbox mutation for server sync (Phase 2)
};
```

**That's it!** No database migration needed - JSONB fields automatically accommodate new keys.

### Examples in Codebase

- **timeSwiper**: Time picker settings (use24Hour, swipeSpeed, incrementMinutes, magneticFeel, showCurrentTime) - managed by `TimeSwiperSettings` component using `useWidgetSettings` hook
- **amountSlider**: Bottle amount slider settings (minAmount, defaultAmount, maxAmount, increment, dragStep, startOnLeft) - managed by `AmountSliderSettings` component using `useWidgetSettings` hook
- **useMetric**: Global unit preference (ml vs oz) - shared by AmountSlider and future measurement components
- **handMode**: Global hand preference (left/right) - affects layout of TimeSwiper, AmountSlider, and AddFeedModal footer

**Widget Settings Architecture**: All widget settings now use the shared `useWidgetSettings` hook pattern. See `.readme/chunks/account.widget-settings-architecture.md` for implementation details.

### Global vs Scoped Settings

- **Global settings** (top-level): `theme`, `handMode`, `useMetric` - affect multiple features
- **Scoped settings** (nested): `timeSwiper.swipeSpeed`, `amountSlider.increment` - feature-specific

Choose global for settings that impact the entire app, scoped for feature-specific configuration.

## Related

- `.readme/chunks/account.widget-settings-architecture.md` - Shared hook pattern for widget settings (NEW - implements useWidgetSettings for TimeSwiper/AmountSlider)
- `.readme/chunks/local-first.store-hydration-pattern.md` - Store hydration flow (required for UI config to work)
- `.readme/chunks/local-first.outbox-pattern.md` - For future server sync
- `.readme/planning/05-ui-config-sync.md` - Implementation plan with phases
- `.readme/chunks/account.bootstrap-unified-flow.md` - Bootstrap API for initial config sync
