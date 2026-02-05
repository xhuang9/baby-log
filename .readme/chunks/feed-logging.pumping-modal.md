---
last_verified_at: 2026-02-04T15:45:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/overview/_components/add-pumping-modal/
  - src/app/[locale]/(auth)/(app)/overview/_components/PumpingTile.tsx
  - src/components/feed/time-swiper/DualTimeSwiper.tsx
---

# Pumping Modal Implementation

## Purpose

Full-screen bottom sheet modal for logging pumping sessions with time range selection, dual amount modes, and caregiver attribution. Orchestrates DualTimeSwiper, AmountModeToggle, PumpingAmountSwiper, and side toggle components.

## Architecture

### Modal Structure

```
AddPumpingModal (orchestrator)
├── DualTimeSwiper (time range picker)
├── AmountModeToggle (mode selector: left/right or total)
├── SideToggle (visible only in leftRight mode)
├── PumpingAmountSwiper (amount input)
├── Notes field (optional)
└── Form footer (Save/Cancel buttons)
```

### State Management

Uses modular hook pattern:

- **`usePumpingFormState()`**: Local form state (all fields + actions)
  - Manages startTime, endTime, mode, activeSide, leftMl, rightMl, totalMl, notes, notesVisible
  - Provides action creators for updating each field
  - Provides resetForm action for cleanup

- **`useInitializePumpingForm()`**: Load persisted settings on mount
  - Loads handMode from UIConfig
  - Loads leftMl/rightMl/totalMl defaults from IndexedDB storage
  - Called once on modal open

- **`usePumpingFormSubmit()`**: Submit logic and error handling
  - Calls createPumpingLog or updatePumpingLog operations
  - Handles form validation
  - Returns isSubmitting state and error message

### Form Logic

**Amount Mode Toggle**:
- Button group: "Left + Right" vs "Total"
- Switching modes clears the other fields
- Determines which amount inputs are shown

**Side Toggle** (Left/Right mode only):
- Switches between left/right input
- Shows other side's value as read-only info text
- activeSide state tracks which side user is entering

**Amount Input**:
- Uses PumpingAmountSwiper for visual input
- Different settings based on mode:
  - `settingsMode="perSide"`: Settings for individual side amounts
  - `settingsMode="total"`: Settings for total amount

### Time Handling

- **DualTimeSwiper** manages start/end time selection
- Constraint: -7 days to +1 day from today
- Detects invalid duration (end before start)
  - Shows error message
  - Offers "Swap times" button for midnight-crossing fixes
- Duration displayed inline, editable via duration input

### Hand Mode Integration

- **Loaded from UIConfig** on form open via useInitializePumpingForm
- Applied to all child components:
  - DualTimeSwiper: affects timeline swiping direction
  - PumpingAmountSwiper: affects swiper and settings position
  - NotesField: affects text input layout
  - FormFooter: affects button alignment (start for left, end for right)

### Notes Field

- Optional field, visibility toggled via action
- Shows only when notesVisible=true
- Hand-mode aware layout

## Component Integration

### PumpingTile (Overview Page)

```tsx
export function PumpingTile({
  babyId,
  latestPumping
}: PumpingTileProps) {
  // Shows latest pumping in activity tile format
  // Click opens AddPumpingModal
  // Displays status text: "Xml(L), Yml(R)" or "Zml" depending on mode
}
```

- Used on overview page alongside other activity tiles
- Reuses ActivityTile component for consistent styling
- Formats amount display based on logged mode
- Shows time-ago and caregiver attribution

## Gotchas

### Mode Switching

When switching between modes:
- Switching to left/right clears totalMl
- Switching to total clears leftMl/rightMl
- Must recalculate on submit: ensure totalMl is accurate

### Midnight-Crossing Sessions

TimeSwiper doesn't restrict midnight crossing, but DualTimeSwiper validates:
- If startTime > endTime (invalid duration), shows error
- User can either:
  - Adjust times manually
  - Use "Swap times" button to flip them
- Sessions that naturally cross midnight work fine (e.g., start 11pm, end 1am next day)

### Persisted Defaults

useInitializePumpingForm loads past session defaults:
- Only loaded once on first open
- If user changes mode/amounts, defaults are not reloaded on subsequent opens
- Settings fully reset when modal closes via resetForm

### Empty Notes

- Notes field always accepted (can be empty/null)
- Stored in database as text or null
- Displayed in logs but not required

## Related Components

- `DualTimeSwiper` - Time range picker with midnight-crossing support
- `PumpingAmountSwiper` - Custom amount input with settings
- `AmountModeToggle` - Mode selection buttons
- `SideToggle` - Left/right side selector
- `ActivityTile` - Reusable tile component for overview
- `NotesField` - Optional notes input with visibility toggle

## Related Sections

- `.readme/sections/feed-logging.index.md` - Feed logging overview
- `.readme/sections/feed-logging.pumping-log-feature.md` - Database and operations
- `.readme/sections/feed-logging.dual-time-swiper.md` - Time picker implementation
- `.readme/sections/feed-logging.amount-slider.md` - Amount input pattern (similar to pumping)
- `.readme/sections/ui-patterns.activity-modals.md` - Modal architecture patterns
