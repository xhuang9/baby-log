# Auth Folder Component Unification Plan

**Status: COMPLETED** (2026-01-18)

---

## Summary of Changes

This refactoring unified the component architecture in the `(auth)` folder by:
1. Extracting shared settings panel components
2. Creating a reusable ButtonStack component
3. Reorganizing the settings page with `_components` convention
4. Eliminating code duplication between widget popovers and settings page

---

## New File Structure

```
src/app/[locale]/(auth)/(app)/
├── overview/
│   └── _components/
│       ├── ActivityTile.tsx
│       ├── FeedTile.tsx
│       ├── OverviewContent.tsx
│       └── AddFeedModal.tsx
└── settings/
    ├── page.tsx
    ├── _components/                    # NEW: Follows convention
    │   ├── SettingsContent.tsx
    │   ├── TimeSwiperSettings.tsx      # Now uses shared panel
    │   ├── AmountSliderSettings.tsx    # Now uses shared panel
    │   ├── ThemeSetting.tsx
    │   ├── HandPreferenceSetting.tsx
    │   └── BabiesList.tsx
    └── babies/
        └── ...

src/components/settings/               # NEW: Shared settings panels
├── TimeSwiperSettingsPanel.tsx
├── AmountSliderSettingsPanel.tsx
└── index.ts

src/components/input-controls/         # NEW: Shared input controls
├── ButtonStack.tsx
├── SettingsPopoverWrapper.tsx
└── index.ts

src/components/feed/
├── TimeSwiper.tsx                     # REFACTORED: Uses shared components
└── AmountSlider.tsx                   # REFACTORED: Uses shared components
```

---

## Implementation Tasks - COMPLETED

### Phase 1: Foundation (Settings Panels + ButtonStack)

- [x] **1.1** Create `src/components/settings/TimeSwiperSettingsPanel.tsx`
- [x] **1.2** Create `src/components/settings/AmountSliderSettingsPanel.tsx`
- [x] **1.3** Create `src/components/input-controls/ButtonStack.tsx`
- [x] **1.4** Create `src/components/input-controls/SettingsPopoverWrapper.tsx`

### Phase 2: Widget Refactoring

- [x] **2.1** Refactor `TimeSwiper.tsx` to use shared components
- [x] **2.2** Refactor `AmountSlider.tsx` to use shared components

### Phase 3: Settings Page Reorganization

- [x] **3.1** Create `settings/_components/` folder and move components
- [x] **3.2** Update `TimeSwiperSettings.tsx` to use panel
- [x] **3.3** Update `AmountSliderSettings.tsx` to use panel
- [ ] **3.4** Migrate `ThemeSetting.tsx` to useWidgetSettings (SKIPPED - not needed)
- [ ] **3.5** Migrate `HandPreferenceSetting.tsx` to useWidgetSettings (SKIPPED - not needed)

### Phase 4: Cleanup & Documentation

- [x] **4.1** TypeScript type checking passes
- [x] **4.2** ESLint errors fixed
- [x] **4.3** Component exports created in index.ts files

---

## Code Reduction Results

| Component | Before | After | Reduction |
|-----------|--------|-------|-----------|
| TimeSwiper.tsx | 762 lines | 624 lines | -138 lines |
| AmountSlider.tsx | 451 lines | 265 lines | -186 lines |
| TimeSwiperSettings.tsx | 143 lines | 33 lines | -110 lines |
| AmountSliderSettings.tsx | 196 lines | 33 lines | -163 lines |

**Total reduction: ~597 lines** through component reuse.

---

## New Shared Components

### ButtonStack
Reusable button group with Settings gear + Plus/Minus buttons.

```tsx
<ButtonStack
  onIncrement={() => adjustTime(1)}
  onDecrement={() => adjustTime(-1)}
  position="right"
  settingsContent={<SettingsPanel />}
  settingsOpen={settingsOpen}
  onSettingsOpenChange={setSettingsOpen}
/>
```

### TimeSwiperSettingsPanel / AmountSliderSettingsPanel
Pure settings form components that accept settings props:

```tsx
<TimeSwiperSettingsPanel
  settings={settings}
  updateSetting={updateSetting}
  saveSetting={saveSetting}
  compact  // Optional: hides descriptions for popover mode
/>
```

### SettingsPopoverWrapper
Wraps settings panels with title, close button, and save/cancel:

```tsx
<SettingsPopoverWrapper
  title="Time Picker Settings"
  onClose={handleClose}
  onSave={handleSave}
  onCancel={handleCancel}
  isDirty={isDirty}
  isSaving={isSaving}
>
  <TimeSwiperSettingsPanel {...props} />
</SettingsPopoverWrapper>
```

---

## Notes

### Why ThemeSetting/HandPreferenceSetting Were Not Migrated

These components use simple single-value settings (`theme`, `handMode`) that are stored as top-level properties in `UIConfigData`. The `useWidgetSettings` hook is designed for complex nested settings objects like `timeSwiper` and `amountSlider`. Migrating these simple settings would require extending the hook with no significant benefit.

### Testing Recommendations

- Test TimeSwiper in AddFeedModal after refactor
- Test AmountSlider in AddFeedModal after refactor
- Test settings page accordions work correctly
- Verify settings persist across page navigation
- Test popover behavior (dirty state, cancel reverts changes)
