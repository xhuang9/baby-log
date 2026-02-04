---
last_verified_at: 2026-02-04T00:00:00Z
source_paths:
  - src/styles/activity-colors.css
  - src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx
  - src/app/[locale]/(auth)/(app)/log/_components/LogItem.tsx
---

# Activity Tile Card Pattern

## Purpose

Shared component class for consistent shadow and border-radius styling across all activity tiles in the app. Ensures a unified "card feeling" for activity tiles in both the overview page and log list.

## Problem Solved

Previously, shadow and border-radius were defined inconsistently or duplicated across components:
- Overview `ActivityTile` buttons had their own styling
- Log item containers (`LogItem.tsx`) had separate styling
- No shared pattern meant visual inconsistencies and style duplication

## Solution: `.activity-tile-card` Component Class

**Location:** `src/styles/activity-colors.css` (lines 44–53)

```css
@layer components {
  .activity-tile-card {
    border-radius: 3px 10px 10px 3px;
    box-shadow: 0px 2px 4px 1px rgba(0, 0, 0, 0.08);
  }

  .dark .activity-tile-card {
    box-shadow: 0px 2px 4px 1px rgba(0, 0, 0, 0.25);
  }
}
```

## Visual Design

### Border Radius
- **Top-left:** 3px (subtle, sharp corner)
- **Top-right:** 10px (rounded curve)
- **Bottom-right:** 10px (rounded curve)
- **Bottom-left:** 3px (sharp corner)

**Asymmetric Design Rationale:**
- Creates visual flow (card "leans" right)
- Soft on right side (friendly, inviting)
- Sharp on left side (anchors the card, provides definition)
- Consistent with brand aesthetic: calming yet structured

### Shadow
- **Light mode:** `0px 2px 4px 1px rgba(0, 0, 0, 0.08)` (subtle, 8% black opacity)
- **Dark mode:** `0px 2px 4px 1px rgba(0, 0, 0, 0.25)` (stronger, 25% black opacity for depth)
- **Offset:** 2px vertical, no horizontal offset
- **Blur:** 4px (soft shadow)
- **Spread:** 1px (slight expansion for softer look)

## Usage

### ActivityTile (Overview Page)

**File:** `src/app/[locale]/(auth)/(app)/overview/_components/ActivityTile.tsx`

```tsx
<button
  className="activity-tile-card activity-tile activity-tile--[activity-type]"
  // ... other props
>
  {/* content */}
</button>
```

### LogItem (Log Page)

**File:** `src/app/[locale]/(auth)/(app)/log/_components/LogItem.tsx`

```tsx
<div className="activity-tile-card">
  {/* log entry container with activity colors */}
</div>
```

## Key Implementation Details

1. **Component Layer:** Defined in `@layer components` in `activity-colors.css`
   - Ensures proper CSS cascade
   - Component styles load before utilities
   - Can be overridden if needed

2. **Dark Mode Support:** Shadow automatically adjusts for dark mode via `.dark .activity-tile-card` selector
   - Light mode: subtle shadow for clarity
   - Dark mode: stronger shadow for depth contrast against dark backgrounds

3. **Activity Type Integration:** Works with activity tile classes like `.activity-tile--feed`, `.activity-tile--solids`, etc.
   - Applies to button or div element
   - Does NOT specify colors (those come from activity-specific classes)

## Related Classes & Patterns

- `.activity-tile` — Main tile styling (border-left, padding, transitions)
- `.activity-tile--[type]` — Activity-specific accent colors
- `.activity-tile-action` — Small pill buttons inside tiles (timer, action icons)
- `.activity-block` — Timeline chart blocks (use activity colors only, not card styling)

## Gotchas

1. **Order Matters:** Always apply `.activity-tile-card` before activity-specific classes for proper color application
   ```tsx
   // Correct
   className="activity-tile-card activity-tile activity-tile--feed"

   // Less clear (still works, but reversed)
   className="activity-tile activity-tile--feed activity-tile-card"
   ```

2. **Not for All Cards:** This pattern is specific to activity tiles. Use `--card` background color and general shadow utilities for other card-like UI
   ```tsx
   // For non-activity cards, use semantic tokens
   className="rounded-lg bg-card p-4 shadow-sm"
   ```

3. **Asymmetric Border-Radius:** Be aware of the 3px/10px pattern when stacking or grouping tiles. The sharp left corner creates visual direction.

4. **Dark Mode Testing:** Always test both light and dark mode. The shadow intensity difference is significant and affects visual hierarchy.

## Testing Checklist

- [ ] ActivityTile buttons on overview page have consistent shadow and rounded corners
- [ ] LogItem containers on log page have same visual treatment
- [ ] Tested in both light and dark mode
- [ ] Dark mode shadow is noticeably stronger (provides depth)
- [ ] Left border accent color is visible (3px sharp left corner)
- [ ] Hover state doesn't visually conflict with shadow

## Related

- `.readme/sections/styling.index.md` — Full styling system
- `.readme/chunks/styling.dev-palette-page.md` — Dev palette preview
- `.readme/planning/brand-guideline.md` — Brand design rationale
