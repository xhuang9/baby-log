---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/hooks/useWidgetSettings.ts
  - src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx
  - src/components/settings/AmountSliderSettingsPanel.tsx
  - src/components/settings/TimeSwiperSettingsPanel.tsx
conversation_context: "Updated widget settings documentation after the settings UI refactor and operations-layer changes."
---

# Widget Settings Architecture

## Purpose

Provides a reusable, type-safe pattern for managing widget-specific settings (TimeSwiper, AmountSlider, etc.) with IndexedDB persistence, debounced saves for sliders, and immediate saves for toggles. Uses a **container/presentation separation** where page-level components handle state and settings panels are pure UI.

## Key Deviations from Standard

- **Generic hook pattern**: Single `useWidgetSettings` hook handles all widget types, eliminating duplicate state management code
- **Dual save strategies**: Debounced saves (300ms) for continuous inputs (sliders), immediate saves for discrete inputs (toggles/radios)
- **Settings stored in UIConfigData**: All widget settings persist under nested keys in `uiConfig.data` (e.g., `uiConfig.data.timeSwiper`, `uiConfig.data.amountSlider`)
- **Persistence via ui-config helpers**: `useWidgetSettings` calls `updateUIConfig` directly; operations are not wired for widget settings yet.
- **Accordion UI pattern**: Settings use collapsed accordions in Settings page to reduce visual clutter
- **Container/Presentation separation**: Settings page components fetch data via `useWidgetSettings` hook, while `*SettingsPanel` components in `src/components/settings/` are pure presentation (no hooks, reusable)

## Architecture

### Core Hook: `useWidgetSettings`

**Location**: `src/hooks/useWidgetSettings.ts`

**Purpose**: Generic hook for managing widget settings with automatic IndexedDB persistence.

**Type Signature**:
```typescript
function useWidgetSettings<T extends Record<string, unknown>>(
  settingsKey: 'timeSwiper' | 'amountSlider',
  defaultSettings: T,
): {
  settings: T;
  isLoading: boolean;
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  saveSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  updateSettings: (newSettings: T) => void;
  saveSettings: (newSettings: T) => void;
}
```

**Parameters**:
- `settingsKey`: Key in UIConfigData where settings are stored
- `defaultSettings`: Default values merged with stored settings

**Return Values**:
- `settings`: Current settings state
- `isLoading`: True while loading from IndexedDB
- `updateSetting`: Update single key with debounced save (for sliders)
- `saveSetting`: Update single key with immediate save (for toggles/radios)
- `updateSettings`: Update all settings with debounced save
- `saveSettings`: Update all settings with immediate save

### Data Flow

```
Component mount
    ↓
Load userId from useUserStore
    ↓
Read from IndexedDB via getUIConfig(userId)
    ↓
Merge with defaultSettings (ensures all keys exist)
    ↓
Set local state → isLoading = false
    ↓
User interaction (slider drag or toggle click)
    ↓
updateSetting (debounced) OR saveSetting (immediate)
    ↓
Update local state immediately (optimistic)
    ↓
Save to IndexedDB via updateUIConfig(userId, { [settingsKey]: newSettings })
    ↓
Show toast notification
```

### Implementation Pattern

**Step 1: Define Settings Type**

```typescript
type AmountSliderSettingsState = {
  minAmount: number;
  defaultAmount: number;
  maxAmount: number;
  increment: number;
  dragStep: number;
  startOnLeft: boolean;
};
```

**Step 2: Define Defaults**

```typescript
const DEFAULT_SETTINGS: AmountSliderSettingsState = {
  minAmount: 0,
  defaultAmount: 120,
  maxAmount: 350,
  increment: 10,
  dragStep: 5,
  startOnLeft: false,
};
```

**Step 3: Use Hook**

```typescript
export function AmountSliderSettings() {
  const { settings, isLoading, updateSetting, saveSetting } =
    useWidgetSettings<AmountSliderSettingsState>('amountSlider', DEFAULT_SETTINGS);

  // Slider: Use updateSetting (debounced)
  <Slider
    value={[settings.minAmount]}
    onValueChange={(value) => updateSetting('minAmount', value[0])}
  />

  // Toggle: Use saveSetting (immediate)
  <Switch
    checked={settings.startOnLeft}
    onCheckedChange={checked => saveSetting('startOnLeft', checked)}
  />
}
```

## Implemented Widget Settings

### TimeSwiperSettings

**Container**: `src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx`
**Presentation**: `src/components/settings/TimeSwiperSettingsPanel.tsx`

**Storage Key**: `uiConfig.data.timeSwiper`

**Settings**:
```typescript
{
  use24Hour: boolean;          // Toggle: 12h vs 24h format
  swipeSpeed: number;          // Slider: 0.1 - 3.0x (animation speed)
  incrementMinutes: number;    // Radio: 1, 5, 15, 30, 60, 120 (button increment)
  magneticFeel: boolean;       // Toggle: snappy vs smooth animation
  showCurrentTime: boolean;    // Toggle: show time markers (now, ±1hr)
}
```

**Defaults**:
```typescript
{
  use24Hour: false,
  swipeSpeed: 0.5,
  incrementMinutes: 30,
  magneticFeel: false,
  showCurrentTime: true,
}
```

**Container Component Pattern**: Same as AmountSliderSettings (uses `useWidgetSettings` hook, renders presentation panel).

### AmountSliderSettings

**Container**: `src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx`
**Presentation**: `src/components/settings/AmountSliderSettingsPanel.tsx`

**Storage Key**: `uiConfig.data.amountSlider`

**Settings**:
```typescript
{
  minAmount: number;       // Slider: 0-100ml (min range boundary)
  defaultAmount: number;   // Slider: 50-300ml (initial value on open)
  maxAmount: number;       // Slider: 200-500ml (max range boundary)
  increment: number;       // Radio: 5, 10, 20ml (+/- button increment)
  dragStep: number;        // Radio: 1, 5, 10ml (slider drag step)
  startOnLeft: boolean;    // Toggle: flip slider direction (right-hand mode)
}
```

**Defaults**:
```typescript
{
  minAmount: 0,
  defaultAmount: 120,
  maxAmount: 350,
  increment: 10,
  dragStep: 5,
  startOnLeft: false,
}
```

**Container Component Pattern**:
```typescript
export function AmountSliderSettings() {
  const { settings, isLoading, updateSetting, saveSetting } =
    useWidgetSettings<AmountSliderSettingsState>('amountSlider', DEFAULT_AMOUNT_SLIDER_SETTINGS);

  if (isLoading) {
    return <LoadingSkeleton />;
  }

  return (
    <AmountSliderSettingsPanel
      settings={settings}
      updateSetting={updateSetting}
      saveSetting={saveSetting}
    />
  );
}
```

**Presentation Panel**: Pure component, no hooks, takes settings and callbacks as props.

**UI Sections**:
1. Min/Default/Max sliders with live value display
2. Button increment radio (3 options: 5, 10, 20ml)
3. Drag step radio (3 options: 1, 5, 10ml)
4. Flip direction toggle (for right-handed users)

## Settings Page Integration

**File**: `src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx`

### Accordion Pattern

Widget settings use collapsed accordions to reduce visual clutter:

```tsx
<section className="space-y-3">
  <h2 className="text-sm font-semibold uppercase">Input Controls</h2>
  <div className="divide-y rounded-lg border bg-background">
    {/* Time Picker Accordion */}
    <div>
      <button
        onClick={() => setShowTimePicker(!showTimePicker)}
        className="flex w-full items-center justify-between p-4"
      >
        <span>Time Picker</span>
        {showTimePicker ? <ChevronUp /> : <ChevronDown />}
      </button>
      {showTimePicker && (
        <div className="border-t p-4">
          <TimeSwiperSettings />
        </div>
      )}
    </div>

    {/* Amount Slider Accordion - Same pattern */}
  </div>
</section>
```

**Key Features**:
- Both settings share one "Input Controls" section
- Default state: collapsed (reduces initial page height)
- ChevronUp/ChevronDown icons for expand/collapse
- Matches accordion pattern from `EditBabyForm`'s "Optional Settings"

### Page Structure

```
Settings Page
├── Children (BabiesList)
├── Preferences (Theme, Hand mode)
├── Input Controls (Accordions)
│   ├── Time Picker (TimeSwiperSettings)
│   └── Amount Slider (AmountSliderSettings)
├── About (Version)
└── Account (Profile, Sign out)
```

## Internal Hook Mechanics

### State Management

```typescript
const [settings, setSettings] = useState<T>(defaultSettings);
const settingsRef = useRef(settings);  // For closure-safe debounce

// Keep ref in sync
useEffect(() => {
  settingsRef.current = settings;
}, [settings]);
```

**Why useRef**: Debounced save functions close over initial state. Ref ensures they always read latest values.

### Debounce Implementation

```typescript
const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

const debouncedSave = useCallback((newSettings: T) => {
  if (saveTimeoutRef.current) {
    clearTimeout(saveTimeoutRef.current);
  }
  saveTimeoutRef.current = setTimeout(() => {
    persistSettings(newSettings);
  }, 300);
}, [persistSettings]);
```

**Cleanup**: `useEffect` cleanup clears pending timeouts on unmount.

### Loading Flow

```typescript
useEffect(() => {
  let mounted = true;

  async function loadSettings() {
    if (!userId) {
      if (mounted) setIsLoading(false);
      return;
    }

    try {
      const config = await getUIConfig(userId);
      const storedSettings = config.data[settingsKey] as Partial<T> | undefined;

      if (mounted && storedSettings) {
        // Merge stored settings with defaults
        const mergedSettings = { ...defaultSettings };
        for (const key of Object.keys(defaultSettings)) {
          const storedValue = storedSettings[key as keyof T];
          if (storedValue !== undefined) {
            mergedSettings[key as keyof T] = storedValue as T[keyof T];
          }
        }
        setSettings(mergedSettings);
      }
    } finally {
      if (mounted) setIsLoading(false);
    }
  }

  loadSettings();
  return () => { mounted = false; };
}, [userId, settingsKey, defaultSettings]);
```

**Key points**:
- Mounted flag prevents state updates after unmount
- Default merging ensures all keys exist (even if not stored)
- Falls back to defaults if `userId` missing

## Refactor Benefits

### Code Reduction

Container components are thin wrappers that delegate state/persistence to `useWidgetSettings`, while presentation panels keep UI markup isolated.

### Eliminated Duplication

**Removed per-widget**:
- `useState` for each setting
- `useEffect` for loading from IndexedDB
- Debounce timeout management
- Save/persist functions
- Loading state logic
- Toast notifications

**Now centralized in hook**:
- Generic type-safe state management
- Single loading implementation
- Unified save strategies (debounced vs immediate)
- Error handling and toasts

### Type Safety

Generic type parameter `<T>` ensures:
- `settings` object matches component's type
- `updateSetting`/`saveSetting` key autocomplete
- Value types match setting keys
- Compile-time validation of settings shape

### Extensibility

Adding a new widget requires:
1. Add key to `UIConfigData` type (in `entities.ts`)
2. Create settings type and defaults
3. Use hook with new key: `useWidgetSettings('newWidget', defaults)`
4. Build UI with returned values

No need to reimplement state management, loading, or persistence.

## Testing Considerations

### Unit Testing Settings Components

**Seed IndexedDB**:
```typescript
await localDb.uiConfig.put({
  userId: testUserId,
  data: {
    amountSlider: { minAmount: 50, defaultAmount: 150, /* ... */ },
  },
  keyUpdatedAt: {},
  schemaVersion: 1,
  updatedAt: new Date(),
});
```

**Verify debounced saves**:
- Use fake timers (`jest.useFakeTimers()`)
- Trigger slider change
- Advance timers by 300ms
- Assert `updateUIConfig` called

**Verify immediate saves**:
- Trigger toggle change
- Assert `updateUIConfig` called synchronously (no timer)

### Integration Testing Settings Page

**Test accordion behavior**:
- Assert both accordions collapsed by default
- Click "Time Picker" → assert expanded, content visible
- Click again → assert collapsed

**Test settings persistence**:
- Change setting → reload page → assert value persisted
- Clear IndexedDB → reload → assert defaults applied

## Gotchas

1. **userId dependency**: If `useUserStore` has no user yet, the hook skips loading and `isLoading` becomes false. Components should handle defaults until the store hydrates.

2. **Default merging**: Hook merges stored settings with defaults. Adding new fields to defaults automatically makes them available even for users with older stored configs.

3. **Debounce cleanup**: Component unmounting clears pending debounced saves. Rapid mount/unmount may lose unsaved changes (acceptable for settings UI).

4. **Radio value coercion**: Radio groups return string values. Must parse to number: `Number.parseInt(String(val))`.

5. **Slider value arrays**: Slider components return `[number]` arrays. Must extract: `value[0]`.

## Component Hierarchy

```
Settings Page
├── SettingsContent (container)
    ├── Children Section
    │   └── BabiesList
    ├── Preferences Section
    │   ├── ThemeSetting (uses updateTheme operation)
    │   └── HandPreferenceSetting (uses updateHandMode operation)
    ├── Input Controls Section (Accordions)
    │   ├── Time Picker Accordion
    │   │   └── TimeSwiperSettings (container)
    │   │       └── TimeSwiperSettingsPanel (presentation)
    │   └── Amount Slider Accordion
    │       └── AmountSliderSettings (container)
    │           └── AmountSliderSettingsPanel (presentation)
    ├── About Section
    └── Account Section
```

**Key Pattern**:
- Settings page components (`_components/`) are containers (use hooks, manage state)
- Presentation panels (`src/components/settings/`) are pure UI (no hooks, take props)
- State management components use `useWidgetSettings` hook internally
- Theme/hand settings use operations; widget settings persist via `useWidgetSettings` → `updateUIConfig`.

## Related Systems

- `.readme/chunks/local-first.operations-layer.md` - Operations layer used by ThemeSetting and HandPreferenceSetting
- `.readme/chunks/local-first.ui-config-storage.md` - UIConfig persistence layer and sync architecture
- `.readme/chunks/local-first.store-hydration-pattern.md` - User store hydration (required for userId)
- `.readme/chunks/account.settings-page-ui.md` - Overall settings page layout
- `.readme/chunks/feed-logging.ui-components.md` - Widget components that read these settings
