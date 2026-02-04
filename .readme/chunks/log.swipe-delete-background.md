---
last_verified_at: 2026-02-04T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/log/_components/LogItem.tsx
---

# Swipe-to-Delete Background Containment

## Purpose

On mobile, log items support swipe-to-delete gesture. When swiped left, a red "Delete" background is revealed. This chunk documents a critical fix to prevent the red background from peeking outside the card's rounded corners.

## Problem

Initially, the delete background used absolute positioning with `inset-0`:

```tsx
// BEFORE (problematic)
<div className="inset-0 bg-destructive">
  Delete
</div>
```

This caused the red background to fill the entire container, including corners. Combined with the log item's `activity-tile-card` styling (which has asymmetric border-radius: `3px 10px 10px 3px`), the red background would peek out at the rounded corners, creating a visual glitch.

## Solution

Changed the background positioning to contain within the border-radius:

```tsx
// AFTER (fixed)
<div className="top-0 bottom-0 left-0 right-1 bg-destructive">
  Delete
</div>
```

**Key change:** `inset-0` → `top-0 bottom-0 left-0 right-1`

## How It Works

### CSS Positioning Values

| Property | Old | New | Effect |
|----------|-----|-----|--------|
| `top` | 0 (inset-0) | 0 | Top edge at container top (no change) |
| `bottom` | 0 (inset-0) | 0 | Bottom edge at container bottom (no change) |
| `left` | 0 (inset-0) | 0 | Left edge at container left (no change) |
| **right** | **0 (inset-0)** | **1 (right-1)** | **Right edge 4px inward (critical!)** |

### The Critical Fix: `right-1`

- **`right-0`** (old): Red background extends to the rightmost edge of the container (causes peeking)
- **`right-1`** (new): Red background stops 4px from the right edge
- **Why 4px?** Matches the minimum border-radius on the right side (10px curve, but 4px inset is conservative and safe)

### Interaction with Border-Radius

**Log item card styling (from `activity-tile-card`):**
```css
border-radius: 3px 10px 10px 3px;
```

The right side has `10px` border-radius. By inset the red background by `4px` from the right, it stays well inside the curved corners:

```
┌──────────────────────────────────┐
│ Card with 10px right border-radius│
│ ┌─────────────────────────────┐  │
│ │ Red delete background       │  │ (inset 4px from right)
│ │ (top-0 bottom-0 left-0      │  │
│ │  right-1)                   │  │
│ └─────────────────────────────┘  │
│                                  │
└──────────────────────────────────┘
```

## Component Context

**File:** `src/app/[locale]/(auth)/(app)/log/_components/LogItem.tsx`

### Full Swipe-to-Delete Structure

```tsx
<div className="activity-tile-card relative">
  {/* Swiped content (revealed when dragged left) */}
  <div className="absolute top-0 bottom-0 left-0 right-1 bg-destructive">
    <div className="flex items-center justify-center h-full">
      <Trash2 className="text-white" size={20} />
    </div>
  </div>

  {/* Main log item content (slides over the red background) */}
  <div className="relative bg-card">
    {/* Activity icon, timestamp, details, etc. */}
  </div>
</div>
```

### Gesture Handling

When user swipes left on the item:
1. Outer container stays at `activity-tile-card` (provides the card styling)
2. Gesture handler calculates swipe distance
3. Inner content div translates left, revealing the red delete background underneath
4. Delete button or confirm action fires when swipe reaches threshold

## Visual Testing

### Light Mode
- Red background should not be visible at card edges
- Should stop ~4px before the rounded right corners
- Delete icon is centered in the revealed space

### Dark Mode
- Red background adjusts to darker shade (destructive semantic color)
- Same containment rules apply
- Icon remains visible and centered

## Accessibility Considerations

1. **Touch Target:** Delete action area is the entire card height (not reduced by the 4px inset)
2. **Visual Clarity:** Red background should be clearly visible when swiped (not hidden)
3. **Keyboard:** For keyboard users, a separate "Delete" button or menu option should exist (not relying on swipe gesture)
4. **Confirmation:** Swipe delete should ideally require confirmation or use undo pattern, as it's easy to trigger by accident

## Gotchas

1. **`right-1` is Exact:** The value `right-1` (4px) is critical. Changing it without understanding the border-radius interaction can cause visual glitches:
   - `right-0` → Red peeks at corners (broken)
   - `right-2` → 8px inset, may look too narrow
   - `right-1` → Sweet spot for 10px border-radius

2. **Container Must Be Relative:** The outer `.activity-tile-card` div must have `position: relative` for the child's `absolute` positioning to work correctly:
   ```tsx
   <div className="activity-tile-card relative">  // ← critical
     <div className="absolute ... right-1">...</div>
   </div>
   ```

3. **Not a General Solution:** This fix is specific to the LogItem's asymmetric border-radius. Other cards with different border-radius values may need different inset values.

4. **Dark Mode Color:** Ensure the red background uses the semantic `bg-destructive` class, not a hardcoded red. The theme automatically adjusts the shade for dark mode:
   ```tsx
   <div className="bg-destructive">  // ← correct
     {/* or */}
     <div className="bg-red-500">   // ← wrong (doesn't adapt to dark mode)
   </div>
   ```

## Testing Checklist

- [ ] Swipe left on a log item (mobile or touch device)
- [ ] Red delete background appears
- [ ] Red background does NOT peek at the curved right corners
- [ ] Red background is visible and accessible for delete action
- [ ] Tested in both light and dark mode
- [ ] Delete icon is properly centered in the revealed space
- [ ] Other cards with different styling don't use this exact `right-1` value (verify containment)

## Related

- `.readme/chunks/styling.activity-tile-card.md` — Activity tile card styling with asymmetric border-radius
- `.readme/sections/styling.index.md` — Styling system and semantic colors
- `.readme/sections/feed-logging.index.md` — Log page and item interaction patterns
