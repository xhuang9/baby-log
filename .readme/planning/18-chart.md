# Activity Timeline Chart Component

## Overview

A React component using HTML/CSS divs to display baby activity logs in a timeline format. Used in both **Today** and **Week** views on the Logs page.

**Reference Screenshot:** `.readme/resource/Screenshot 2026-01-26 at 12.53.43 AM.png`

---

## Architecture

### Component Structure

```
src/app/[locale]/(auth)/(app)/logs/_components/
├── LogsContent.tsx                 # Orchestrator (already exists)
├── LogsFilters.tsx                 # Activity filter pills (already exists, reuse)
├── timeline-chart/
│   ├── index.ts                    # Public exports
│   ├── types.ts                    # Shared types
│   ├── ActivityTimelineChart.tsx   # Main chart component
│   ├── TimelineGrid.tsx            # Y-axis hours + grid lines
│   ├── CurrentTimeIndicator.tsx    # "Now" line (primary color)
│   ├── DayColumn.tsx               # Single day column with activity blocks
│   ├── ActivityBlock.tsx           # Individual colored activity block
│   ├── DateHeader.tsx              # X-axis date headers (Week view only)
│   ├── SelectedActivityDetail.tsx  # Bottom panel showing selected log details
│   └── hooks/
│       ├── useTimelineData.ts      # Transform logs to timeline format
│       ├── useCurrentTime.ts       # Current time position (updates every minute)
│       └── useDateNavigation.ts    # Week view date navigation + progressive loading
```

### Data Flow

```
UnifiedLog[]
  → useTimelineData() transforms to TimelineBlock[]
  → ActivityTimelineChart renders grid + blocks
  → Click/tap → setSelectedLog → SelectedActivityDetail shows info
```

---

## Component Specifications

### 1. ActivityTimelineChart (Main Component)

**Props:**
```typescript
type ActivityTimelineChartProps = {
  logs: UnifiedLog[] | undefined;
  mode: 'today' | 'week';
  onSelectLog?: (log: UnifiedLog | null) => void;
  selectedLog?: UnifiedLog | null;
};
```

**Layout:**
- Fixed height container with `overflow-y: auto` for vertical scrolling
- Y-axis: 24 hours (configurable starting hour, default 6am at top)
- Each hour = fixed pixel height (e.g., 60px = 1440px total for 24h)

### 2. TimelineGrid

**Renders:**
- Left gutter with hour labels (6, 7, 8... 5)
- Horizontal grid lines at each hour
- Dashed lines at 30-minute marks (optional)
- **Current time indicator line** (primary color, prominent)

**Current Time Indicator:**
```typescript
// Calculates position and updates every minute
function getCurrentTimePosition(): number {
  const now = new Date();
  const hours = now.getHours() + now.getMinutes() / 60;
  return hours * HOUR_HEIGHT;
}
```

**Styling:**
```css
.timeline-hour-label {
  /* Hour numbers on left */
  width: 40px;
  text-align: right;
  font-size: 12px;
  color: var(--muted-foreground);
}

.timeline-grid-line {
  border-top: 1px solid var(--border);
}

.timeline-now-indicator {
  position: absolute;
  left: 0;
  right: 0;
  height: 2px;
  background-color: var(--primary);
  z-index: 10;
}

.timeline-now-indicator::before {
  content: '';
  position: absolute;
  left: 0;
  top: -4px;
  width: 10px;
  height: 10px;
  border-radius: 50%;
  background-color: var(--primary);
}
```

### 3. DayColumn

**Props:**
```typescript
type DayColumnProps = {
  date: Date;
  blocks: TimelineBlock[];
  showLabels: boolean;  // true for Today view
  onBlockClick: (log: UnifiedLog) => void;
  selectedLogId?: string;
};
```

**Layout:**
- Full height (matches grid)
- Blocks positioned absolutely based on `startedAt` time
- Block height based on `durationMinutes`

**Position Calculation:**
```typescript
const HOUR_HEIGHT = 60; // pixels per hour

function getBlockPosition(startedAt: Date, durationMinutes: number) {
  const hours = startedAt.getHours() + startedAt.getMinutes() / 60;
  const top = hours * HOUR_HEIGHT;
  const height = (durationMinutes / 60) * HOUR_HEIGHT;
  return { top, height: Math.max(height, 8) }; // min 8px for visibility
}
```

### 4. ActivityBlock

**Props:**
```typescript
type ActivityBlockProps = {
  log: UnifiedLog;
  top: number;
  height: number;
  showLabel: boolean;
  isSelected: boolean;
  onClick: () => void;
};
```

**Styling:**
- Uses existing activity color CSS variables
- `activity-block--feed`, `activity-block--sleep` classes
- Selected state: ring/border highlight

**Today View (showLabel=true):**
```
┌─────────────────┐
│ Bottle · 120ml  │
│ 14:30           │
└─────────────────┘
```

**Week View (showLabel=false):**
```
┌───┐
│   │  (just colored block)
└───┘
```

### 5. DateHeader (Week View Only)

**Layout:**
```
┌─────┬─────┬─────┬─────┬─────┬─────┬─────┐
│ Fri │ Sat │ Sun │ Mon │ Tue │ Wed │ Thu │
│  24 │  25 │  26 │  27 │  28 │  29 │  30 │
└─────┴─────┴─────┴─────┴─────┴─────┴─────┘
```

- Sticky position at top
- Current day highlighted

### 6. SelectedActivityDetail

**Props:**
```typescript
type SelectedActivityDetailProps = {
  log: UnifiedLog | null;
  onClose: () => void;
  onEdit: (log: UnifiedLog) => void;
};
```

**Layout:**
- Fixed at bottom of chart container
- Shows: icon, title, duration, time range
- Click/tap to edit (opens existing edit modal)

**Example:**
```
🌙 Sleep · 1h 19m
   11:01 - 12:20                    [→]
```

---

## View-Specific Behavior

### Common Features (Both Views)

- **Activity Type Filter Pills:** Same as Listing view (All, Feed, Sleep)
  - Reuse `LogsFilters` component or extract filter pills to shared component
  - Filters apply to both chart blocks and any selected detail
  - Pills positioned above the chart

### Today View

- **X-axis:** Single day column (no date header)
- **Width:** Full width
- **Labels:** Show text inside activity blocks
- **Data:** Filter logs to today only
- **Filter pills:** Activity type filters above chart
- **Current time line:** Prominent primary-colored line

### Week View

- **X-axis:** 7 day columns with date headers
- **Width:** Each column = `(100% - gutter) / 7`
- **Labels:** No text inside blocks (too narrow)
- **Scrolling:** Horizontal scroll container for more dates
- **Progressive Loading:** Pre-load 30 days, fetch more on scroll
- **Filter pills:** Activity type filters above chart
- **Current time line:** Prominent primary-colored line (on today's column)

---

## Progressive Loading (Week View)

### Hook: useDateNavigation

```typescript
type UseDateNavigationResult = {
  visibleDates: Date[];        // Currently rendered dates (7 shown at a time)
  allLoadedDates: Date[];      // All dates with data loaded
  scrollToDate: (date: Date) => void;
  canLoadMore: boolean;
};
```

### Strategy

1. **Initial load:** Today + 6 days back (7 visible) + pre-fetch 30 days back
2. **Pre-loading:** When user starts scrolling, load 30 days of data in the background
3. **Scroll behavior:** Smooth horizontal scroll through loaded dates
4. **On-demand:** If user scrolls beyond loaded range, fetch more data
5. Fetch logs for date range via `useAllActivityLogs` with dynamic dates

### Data Fetching

```typescript
// Initial: fetch today - 30 days to today
const initialStartDate = subDays(today, 30);
const initialEndDate = today;

// Pre-load on first scroll interaction
useEffect(() => {
  if (hasScrolled && !hasPreloaded) {
    // Fetch 30 more days in background
    preloadDates(subDays(initialStartDate, 30), initialStartDate);
  }
}, [hasScrolled]);
```

---

## Types

```typescript
// src/app/[locale]/(auth)/(app)/logs/_components/timeline-chart/types.ts

export type TimelineBlock = {
  log: UnifiedLog;
  date: string;           // YYYY-MM-DD for grouping
  startMinutes: number;   // Minutes from midnight (0-1439)
  durationMinutes: number;
  top: number;            // Calculated px position
  height: number;         // Calculated px height
};

export type TimelineDay = {
  date: Date;
  dateKey: string;        // YYYY-MM-DD
  blocks: TimelineBlock[];
};
```

---

## Styling

### New CSS Classes (add to activity-colors.css)

```css
.activity-block {
  position: absolute;
  left: 2px;
  right: 2px;
  border-radius: 4px;
  cursor: pointer;
  transition: opacity 0.15s;
  overflow: hidden;
}

.activity-block:hover {
  opacity: 0.9;
}

.activity-block--selected {
  ring: 2px;
  ring-color: var(--ring);
}

.activity-block--feed {
  background-color: var(--color-activity-feed-background);
  color: var(--color-activity-feed-foreground);
}

.activity-block--sleep {
  background-color: var(--color-activity-sleep-background);
  color: var(--color-activity-sleep-foreground);
}
```

---

## Implementation Order

### Phase 1: Core Chart Structure
1. [ ] Create `timeline-chart/types.ts` with type definitions
2. [ ] Create `useTimelineData.ts` hook to transform logs
3. [ ] Create `TimelineGrid.tsx` with hour labels and lines
4. [ ] Create `useCurrentTime.ts` hook for current time position
5. [ ] Create `CurrentTimeIndicator.tsx` (primary color line)
6. [ ] Create `ActivityBlock.tsx` with activity colors
7. [ ] Create `DayColumn.tsx` to position blocks

### Phase 2: Today View
8. [ ] Create `ActivityTimelineChart.tsx` with today mode
9. [ ] Create `SelectedActivityDetail.tsx` bottom panel
10. [ ] Integrate into `LogsContent.tsx` Today tab with activity filter pills
11. [ ] Add activity block labels for today view

### Phase 3: Week View
12. [ ] Create `DateHeader.tsx` for date columns
13. [ ] Add week mode to `ActivityTimelineChart.tsx`
14. [ ] Create `useDateNavigation.ts` for date management (30-day pre-load)
15. [ ] Implement horizontal scroll container
16. [ ] Add progressive loading (pre-fetch 30 days on scroll)
17. [ ] Add activity filter pills to week view

### Phase 4: Polish
18. [ ] Add loading skeletons
19. [ ] Handle empty states
20. [ ] Test touch interactions on mobile
21. [ ] Verify dark mode colors
22. [ ] Test current time indicator updates correctly

---

## Files to Modify

| File | Changes |
|------|---------|
| `logs/_components/LogsContent.tsx` | Replace placeholder with chart component |
| `styles/activity-colors.css` | Add `.activity-block--*` classes |

## Files to Create

| File | Purpose |
|------|---------|
| `timeline-chart/index.ts` | Public exports |
| `timeline-chart/types.ts` | Type definitions |
| `timeline-chart/ActivityTimelineChart.tsx` | Main component |
| `timeline-chart/TimelineGrid.tsx` | Y-axis + grid |
| `timeline-chart/CurrentTimeIndicator.tsx` | "Now" line with primary color |
| `timeline-chart/DayColumn.tsx` | Day column |
| `timeline-chart/ActivityBlock.tsx` | Activity block |
| `timeline-chart/DateHeader.tsx` | Week view header |
| `timeline-chart/SelectedActivityDetail.tsx` | Bottom detail panel |
| `timeline-chart/hooks/useTimelineData.ts` | Data transformation |
| `timeline-chart/hooks/useCurrentTime.ts` | Current time position (updates every minute) |
| `timeline-chart/hooks/useDateNavigation.ts` | Week view navigation + 30-day pre-load |

---

## Verification

1. **Today View:**
   - Shows single day column with hour grid
   - Activity filter pills (All, Feed, Sleep) work correctly
   - Activity blocks positioned correctly by time
   - Labels visible inside blocks
   - **Current time line (primary color) visible and accurate**
   - Click block → shows detail at bottom
   - Click detail → opens edit modal

2. **Week View:**
   - Shows 7 day columns with date headers
   - Activity filter pills (All, Feed, Sleep) work correctly
   - Horizontal scroll works smoothly
   - **Pre-loads 30 days of data when user starts scrolling**
   - Click block → shows detail at bottom
   - Current day visually highlighted
   - **Current time line visible on today's column**

3. **Cross-cutting:**
   - Both views work in light and dark mode
   - Touch interactions work on mobile
   - Empty state when no logs
   - Loading state while fetching
   - **Current time indicator updates every minute**
