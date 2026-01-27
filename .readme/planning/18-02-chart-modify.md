# Timeline Chart Modifications Plan

## Summary

Modifications to the Activity Timeline Chart based on UX feedback. Changes range from simple styling adjustments to a more complex overlapping blocks algorithm.

## Implementation Status

| Feature | Status |
|---------|--------|
| Month 2-line display | ✅ Implemented |
| 2-hour intervals (<900px height) | ✅ Implemented |
| 6am start/end timeline | ✅ Implemented |
| First/last label positioning | ✅ Implemented |
| Bottom panel fixed space (>=900px) | ✅ Implemented |
| Google Calendar-style overlapping | ❌ Reverted (user preference) |
| Thinner selected outline | ✅ Implemented (ring-1) |

---

## 1. Month Display - 2 Lines with 3-Letter Shorthand

**Current:** "Jan 2025" on single line
**Target:**
```
Dec
2025
```

**Files:** `DateHeader.tsx`

**Implementation:**
- Update `formatMonth()` in `ActivityTimelineChart.tsx` to return `{ month: 'Dec', year: '2025' }` object
- Modify `DateHeader.tsx` gutter to display month and year on separate lines
- Use `flex-col` layout already in place

**Complexity:** Low

---

## 2. 2-Hour Intervals on Small Screens (<600px height)

**Current:** All 24 hours labeled regardless of screen size
**Target:** On screens <600px height, show labels at 2-hour intervals (6, 8, 10, 12, etc.)

**Files:** `ActivityTimelineChart.tsx`

**Implementation:**
- Add `screenHeight` state tracked via ResizeObserver (already observing container)
- Add constant `COMPACT_HEIGHT_THRESHOLD = 600`
- In hour labels loop, conditionally render based on `screenHeight < 600 && hour % 2 !== 0`
- Grid lines remain at hourly intervals, only labels change

**Complexity:** Low

---

## 3. 6am Start/End Timeline (Instead of Midnight)

**Current:** Timeline shows 00:00 - 23:00 (midnight to 11pm)
**Target:** Timeline shows 06:00 - 06:00 (6am to next day 6am)

This is a significant change affecting multiple files.

**Files:**
- `types.ts` - Add `HOUR_OFFSET = 6` constant
- `useTimelineData.ts` - Adjust `getMinutesFromMidnight()` to `getMinutesFrom6AM()`
- `CurrentTimeIndicator.tsx` - Adjust position calculation
- `ActivityTimelineChart.tsx` - Update hour labels to show 6-5 range

**Implementation Details:**

### Hour Label Generation
```typescript
// Generate hours starting at 6am
// [6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 0, 1, 2, 3, 4, 5, 6]
function getHoursStartingAt6AM(): number[] {
  return Array.from({ length: 25 }, (_, i) => (i + 6) % 24);
}
```

### Position Calculation
```typescript
// Convert clock time to chart position
function getMinutesFrom6AM(date: Date): number {
  const totalMinutes = date.getHours() * 60 + date.getMinutes();
  // Shift by 6 hours (360 minutes)
  // Times before 6am belong to "yesterday" on the chart
  const adjusted = totalMinutes - 360;
  return adjusted < 0 ? adjusted + 1440 : adjusted;
}
```

### Date Key Assignment
Activities between midnight and 6am should be assigned to the *previous* calendar day for chart grouping purposes.

**Complexity:** Medium - requires coordinated changes across multiple files

---

## 4. First/Last Hour Label Text Not Cut Off

**Current:** Hour labels positioned at `top: -5px` which can cause "06" at top and "06" at bottom to be clipped

**Target:** Labels fully visible with proper spacing

**Files:** `ActivityTimelineChart.tsx`

**Implementation:**
- Add `pt-3 pb-3` (or similar) padding to the hour gutter container
- Adjust the total height calculation to account for this padding
- Alternatively, position first label below the line and last label above

**Approach:** Use absolute positioning with different offsets:
- First hour (top): `top: 2px` instead of `top: -5px`
- Last hour (bottom): `top: -10px` (above the line)
- Middle hours: `top: -5px` (centered on line)

**Complexity:** Low

---

## 5. Bottom Detail Panel - Fixed Space When Height ≥600px

**Current:** `SelectedActivityDetail` uses `absolute inset-x-0 bottom-0` - always overlays content

**Target:**
- On screens ≥600px height: Panel reserves space in layout flow
- On screens <600px height: Panel overlays (current behavior)

**Files:**
- `ActivityTimelineChart.tsx` - Conditional layout structure
- `SelectedActivityDetail.tsx` - Conditional positioning classes

**Implementation:**

```tsx
// In ActivityTimelineChart.tsx
const isTallScreen = screenHeight >= 600;

// Layout changes:
// When tall: flex-col with chart body taking flex-1, detail panel as sibling
// When short: chart body relative with detail absolutely positioned inside

{isTallScreen ? (
  <div className="flex flex-col h-full">
    <div className="flex-1 min-h-0">{/* Chart body */}</div>
    {selectedLog && <SelectedActivityDetail layout="flow" ... />}
  </div>
) : (
  <div className="relative flex-1">
    {/* Chart body */}
    <SelectedActivityDetail layout="overlay" ... />
  </div>
)}
```

**Complexity:** Medium - requires layout restructuring

---

## 6. Google Calendar-Style Overlapping Blocks

**Current:** Blocks stack at full width, potentially completely hiding earlier events

**Target:** When blocks overlap in time, they share horizontal space side-by-side

### Algorithm Overview

Google Calendar uses a "column packing" algorithm:

1. **Detect Overlap Groups:** Find connected sets of overlapping events
2. **Assign Columns:** Within each group, greedily assign events to the leftmost available column
3. **Expand Width:** Allow events to expand into unused columns to their right
4. **Position:** Calculate `left` offset and `width` as percentages

### Visual Example

```
Before (current):      After (calendar-style):
┌──────────────┐       ┌──────┬───────┐
│ Sleep        │       │Sleep │ Feed  │
│              │       │      │       │
│ ┌──────────┐ │       │      ├───────┤
│ │ Feed     │ │  →    │      │       │
│ └──────────┘ │       │      │       │
│              │       │      │       │
└──────────────┘       └──────┴───────┘
```

### Implementation Plan

**New file:** `utils/calculateOverlaps.ts`

```typescript
export type PositionedBlock = TimelineBlock & {
  column: number;      // 0-indexed column within overlap group
  totalColumns: number; // Total columns in this overlap group
  // Derived for rendering:
  leftPercent: number;  // column / totalColumns * 100
  widthPercent: number; // (1 / totalColumns) * 100
};

/**
 * Determine if two blocks overlap in time
 */
function blocksOverlap(a: TimelineBlock, b: TimelineBlock): boolean {
  const aEnd = a.startMinutes + a.durationMinutes;
  const bEnd = b.startMinutes + b.durationMinutes;
  return a.startMinutes < bEnd && aEnd > b.startMinutes;
}

/**
 * Find all connected overlap groups
 */
function findOverlapGroups(blocks: TimelineBlock[]): TimelineBlock[][] {
  // Union-Find or DFS to group overlapping blocks
}

/**
 * Assign column indices within an overlap group
 * Uses greedy leftmost-available column assignment
 */
function assignColumns(group: TimelineBlock[]): PositionedBlock[] {
  // Sort by start time
  // For each block, find first column where it doesn't overlap
  // with any existing block in that column
}

/**
 * Main function: transform blocks with overlap positioning
 */
export function calculateOverlapPositions(blocks: TimelineBlock[]): PositionedBlock[] {
  const groups = findOverlapGroups(blocks);
  return groups.flatMap(assignColumns);
}
```

**Changes to other files:**

1. **`DayColumn.tsx`:** Use `calculateOverlapPositions()` on blocks before rendering
2. **`ActivityBlock.tsx`:** Accept `leftPercent` and `widthPercent` props for positioning
3. **`types.ts`:** Add `PositionedBlock` type

### Edge Cases

- **Many overlaps:** Limit columns to max 3-4, stack remaining
- **Short events:** Don't let narrow columns make blocks unreadable
- **Touch targets:** Ensure minimum tappable width (44px)

### Complexity Assessment

**Medium-High complexity** - The algorithm itself is well-documented, but integration requires:
- New utility module with tests
- Changes to block rendering
- Careful handling of edge cases
- Potential performance optimization for many blocks

---

## Implementation Order

Recommended sequence (dependencies considered):

1. **Month 2-line display** - Independent, quick win
2. **First/last label spacing** - Independent, quick win
3. **Screen height tracking** - Foundation for #2 and #5
4. **2-hour intervals on small screens** - Uses #3
5. **Bottom panel fixed space** - Uses #3
6. **6am timeline offset** - Larger change, standalone
7. **Overlap algorithm** - Most complex, last

---

## Open Questions

1. **Overlap limit:** Should we cap columns at 3-4 and stack remaining events?
2. **Touch accessibility:** What's the minimum block width for tapping on mobile?
3. **6am edge cases:** How to handle activities that span across 6am boundary?
