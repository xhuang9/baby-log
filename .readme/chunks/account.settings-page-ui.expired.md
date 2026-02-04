---
last_verified_at: 2026-01-18T12:33:25Z
expired_reason: "ThemeSetting.tsx modified"
source_paths:
  - src/app/[locale]/(auth)/(app)/settings/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/BabiesList.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx
conversation_context: "Updated settings page UI documentation after moving settings components into _components and wiring operations."
---

# Settings Page UI

**⚠️ EXPIRED**: Awaiting refresh.

> Status: active
> Last updated: 2026-01-18
> Owner: Core

## Purpose

Provide a client-side settings hub that reads/writes local-first preferences and baby metadata without server fetches.

## Key Deviations from Standard

- **Client-only data**: The page shell is server-rendered but all data comes from IndexedDB via `useLiveQuery`, not server actions.
- **Local-first preferences**: Theme/hand updates go through operations (still backed by IndexedDB), while widget settings persist via `useWidgetSettings` → `updateUIConfig`.
- **Accordion pattern**: Widget settings (Time Picker, Amount Slider) use collapsed accordions to reduce visual clutter.

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/settings/page.tsx` - Server shell that sets metadata and passes locale.
- `src/app/[locale]/(auth)/(app)/settings/_components/SettingsContent.tsx` - Client layout, sections, Dexie queries, accordion state management.
- `src/app/[locale]/(auth)/(app)/settings/_components/BabiesList.tsx` - Child list + add child link.
- `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx` - Theme selector and DOM class toggle.
- `src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx` - Handedness selector stored in IndexedDB.
- `src/app/[locale]/(auth)/(app)/settings/_components/TimeSwiperSettings.tsx` - Time picker widget configuration (collapsed by default).
- `src/app/[locale]/(auth)/(app)/settings/_components/AmountSliderSettings.tsx` - Amount slider widget configuration (collapsed by default).

### Data Flow
1. `SettingsPage` resolves `locale` and renders `SettingsContent`.
2. `SettingsContent` uses `useLiveQuery` to read `localDb.babyAccess` + `localDb.babies`, filters archived, sorts by access level.
3. Preferences read `uiConfig` via `getUIConfig`; Theme/Hand updates go through `updateTheme`/`updateHandMode` operations with toast feedback.
4. Widget settings use `useWidgetSettings` (see `.readme/chunks/account.widget-settings-architecture.md`), which persists via `updateUIConfig`.

### Page Structure

```
Settings Page
├── Children (BabiesList - IndexedDB live query)
├── Preferences (Theme, Hand mode)
├── Input Controls (Accordion section)
│   ├── Time Picker (collapsed by default)
│   └── Amount Slider (collapsed by default)
├── About (Version)
└── Account (Profile, Sign out)
```

### Code Pattern: Baby List Query

```tsx
const babies = useLiveQuery(async () => {
  const accessList = await localDb.babyAccess.toArray();
  const babyIds = accessList.map(a => a.babyId);
  const allBabies = await localDb.babies.where('id').anyOf(babyIds).toArray();
  return allBabies.filter(b => b.archivedAt === null);
}, []);
```

### Code Pattern: Accordion State

```tsx
const [showTimePicker, setShowTimePicker] = useState(false);
const [showAmountSlider, setShowAmountSlider] = useState(false);

// Accordion button
<button
  onClick={() => setShowTimePicker(!showTimePicker)}
  className="flex w-full items-center justify-between p-4"
>
  <span>Time Picker</span>
  {showTimePicker ? <ChevronUp /> : <ChevronDown />}
</button>

// Conditional content
{showTimePicker && (
  <div className="border-t p-4">
    <TimeSwiperSettings />
  </div>
)}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `uiConfig.theme` | `system` | Theme mode applied via `document.documentElement.classList`.
| `uiConfig.handMode` | `right` | Dominant hand for layout adjustments.
| `uiConfig.timeSwiper` | `{ use24Hour: false, swipeSpeed: 0.5, incrementMinutes: 30, magneticFeel: false, showCurrentTime: true }` | Time picker widget configuration (see `.readme/chunks/account.widget-settings-architecture.md`).
| `uiConfig.amountSlider` | `{ minAmount: 0, defaultAmount: 120, maxAmount: 350, increment: 10, dragStep: 5, startOnLeft: false }` | Amount slider widget configuration (see `.readme/chunks/account.widget-settings-architecture.md`).

## Gotchas / Constraints

- **Loading state**: `SettingsContent` returns skeletons while `useLiveQuery` resolves; ensure tests seed IndexedDB.
- **Theme application**: Theme changes toggle the `dark` class directly on `document.documentElement`.
- **Accordion state**: Local component state only (not persisted). Both accordions default to collapsed on page load.
- **Widget settings isolation**: Each widget setting component manages its own loading state independently via `useWidgetSettings` hook.

## Testing Notes

- Seed `localDb.babies` and `localDb.babyAccess` to validate ordering and rendering.
- Verify `updateTheme`/`updateHandMode` operations and `updateUIConfig` writes for widget settings.
- Test accordion behavior: both collapsed by default, expand/collapse transitions.
- Test widget settings with fake timers to verify debounced saves (sliders) vs immediate saves (toggles).

## Related Systems

- `.readme/chunks/account.widget-settings-architecture.md` - Shared hook pattern for widget settings (TimeSwiperSettings, AmountSliderSettings).
- `.readme/chunks/local-first.ui-config-storage.md` - Persistence format for UI settings.
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk-provided user context used for account row.
