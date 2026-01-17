---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx
  - src/components/feed/AmountSlider.tsx
  - src/components/feed/TimeSwiper.tsx
  - src/styles/activity-colors.css
  - src/styles/activity-typography.css
---

# Feed Logging UI Components

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Provide the reusable feed logging UI stack used on the Overview page, including tiles, full-screen sheet, and advanced sliders.

## Key Deviations from Standard

- **ActivityType-driven styling**: `ActivityTile` maps activity keys to CSS classes that pull color tokens from `activity-colors.css`.
- **Local-first preferences**: `AddFeedModal` reads `handMode` and slider settings from IndexedDB (`uiConfig`).

## Architecture / Implementation

### Components
- `src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx` - Wraps `ActivityTile` and opens `AddFeedModal`.
- `src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx` - Full-screen sheet for feed logging.
- `src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx` - Base tile with activity styling.
- `src/components/feed/AmountSlider.tsx` - Amount input with settings popover.
- `src/components/feed/TimeSwiper.tsx` - Time picker with momentum + settings.
- `src/styles/activity-colors.css` - Activity color tokens and tile classes.
- `src/styles/activity-typography.css` - Typography for tile titles/labels.

### Data Flow
1. `FeedTile` renders `ActivityTile` and toggles the sheet.
2. `AddFeedModal` collects manual or timer input and calls `createFeedLog`.
3. `AmountSlider` and `TimeSwiper` load settings from `uiConfig` and persist updates via `updateUIConfig`.

### Code Pattern
```tsx
<SheetContent side="bottom" className="inset-0 h-full w-full rounded-none" showCloseButton={false}>
  <SheetHeader className="relative flex-row items-center space-y-0 border-b pb-4">
    <SheetClose render={<Button variant="ghost" size="icon-sm" />}>
      <ChevronLeftIcon className="h-5 w-5" />
    </SheetClose>
  </SheetHeader>
</SheetContent>
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `uiConfig.handMode` | `right` | Controls left/right alignment of footer actions and controls.
| `uiConfig.amountSlider.increment` | `10` | +/- step size for bottle amount buttons.
| `uiConfig.amountSlider.dragStep` | `5` | Slider step size when dragging.
| `uiConfig.timeSwiper.incrementMinutes` | `30` | +/- time increment button step.
| `uiConfig.timeSwiper.use24Hour` | `false` | 24-hour display toggle for time markers.

## Gotchas / Constraints

- **Duration validation**: Breast feeds require `endTime` after `startTime` or submission fails.
- **Settings hydration**: Sliders wait for `useUserStore` hydration before loading IndexedDB settings.

## Testing Notes

- Open `AddFeedModal`, switch between manual/timer, and submit a bottle feed.
- Toggle hand mode in settings and confirm footer alignment flips.

## Related Systems

- `.readme/chunks/feed-logging.amount-slider.md` - Amount slider defaults.
- `.readme/chunks/local-first.ui-config-storage.md` - UI config persistence.
