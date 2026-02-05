---
last_verified_at: 2026-02-04T15:45:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/components/PumpingAmountSwiper.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/hooks/usePumpingFormState.ts
---

# Pumping Amount Swiper Component

## Purpose

Custom swiper component for pumping log amount input with visual ml/oz toggling, hand-mode support, and mode-specific settings (per-side vs. total volume).

## Architecture

### Props

```tsx
type PumpingAmountSwiperProps = {
  value: number; // Current amount in ml
  onChange: (ml: number) => void;
  handMode?: 'left' | 'right';
  settingsMode: 'total' | 'perSide';
}
```

- **settingsMode**: Determines which settings popover to show
  - `'total'`: Total ml settings
  - `'perSide'`: Per-side amount settings (applies to both left and right)
- **handMode**: Affects swiper and settings button position

### Component Features

**Visual Swiper**:
- Tactile swipe-based amount input
- Works like AmountSlider but specific to pumping
- Visible range typically 0-500ml with increment steps
- Haptic feedback on interactions (mobile)

**Settings Button**:
- Position depends on handMode:
  - Left: Button on right side (easy reach with right thumb)
  - Right: Button on left side (easy reach with left thumb)
- Opens settings popover specific to mode

**Mode-Specific Settings**

When settingsMode='perSide':
- Apply to current active side (left or right)
- Settings: min/max values, increment size
- Does not affect other side's value

When settingsMode='total':
- Settings for total volume input
- Min/max values for total amount
- Increment size for scrolling

### Hand Mode Integration

- **Swiper direction**: Reversed for left-hand mode if applicable
- **Settings button placement**: Opposite side from dominant hand
- **Layout**: Settings popover and button position respect hand preference

## State Management

Values managed by parent (AddPumpingModal):
- activeSide determines which of (leftMl, rightMl) is edited in leftRight mode
- totalMl edited directly in total mode
- onChange callback updates parent state

## Persistent Settings

Settings loaded from IndexedDB via useInitializePumpingForm:
- Loads amount from previous session
- Restores user's preferred settings (min/max/increment)
- Settings survive page refresh but reset on modal close

## Gotchas

### Mode Mismatch

If parent passes settingsMode that doesn't match current mode:
- Component may show wrong settings
- Ensure AddPumpingModal logic is: `settingsMode={state.mode === 'total' ? 'total' : 'perSide'}`

### Value Validation

- Component accepts any number (including negative)
- Parent (AddPumpingModal) responsible for validation before submit
- Submitted value must be >= 0

### Swiper Range

Default range typically 0-500ml, but may be:
- Constrained by settings
- Extendable via settings popover
- Settings preserved in UIConfig for next session

## Related Components

- `AmountSlider` - Similar pattern used for feed bottle amounts
- `PumpingModal` - Parent component managing state
- `SideToggle` - Selects which side is edited in leftRight mode

## Related Sections

- `.readme/sections/feed-logging.index.md` - Feed logging overview
- `.readme/sections/feed-logging.amount-slider.md` - Similar amount input pattern
- `.readme/sections/feed-logging.pumping-modal.md` - Parent modal component
