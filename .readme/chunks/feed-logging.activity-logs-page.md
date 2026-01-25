---
last_verified_at: 2026-01-25T14:30:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/logs/page.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/LogsContent.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/LogsList.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/LogItem.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/LogsFilters.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/EmptyState.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/edit-modals/
---

# Activity Logs Page

## Purpose

Comprehensive activity logs view at `/logs` route displaying all feed and sleep activities with filtering, dual view modes, and in-place editing capabilities. Serves as a complete activity history for parents to track and modify logged activities.

## Architecture Overview

### Component Hierarchy

```
LogsPage (server)
  └── LogsContent (client orchestrator)
      ├── LogsFilters (activity type + time range + view toggle)
      ├── LogsList (grouped by date + 2-column grid)
      │   └── LogItem (individual activity tile)
      │       └── ActivityTile (reusable activity display)
      ├── EditFeedModal (edit/delete feed logs)
      └── EditSleepModal (edit/delete sleep logs)
```

## Filter State Management

### URL Persistence with `useLogsFilters`

Filters persist via query parameters, enabling bookmarkable states:

- **Activity types**: `?types=feed,sleep` (default: both)
- **Time range**: `?range=past7days` (default: `all`)
- **Example**: `/logs?types=feed&range=today` → shows only today's feed logs

### Time Range Calculation

The `useLogsFilters` hook converts time range to precise date boundaries:

| Range | Boundary | Implementation |
|-------|----------|-----------------|
| `all` | No limits | `startDate: null, endDate: null` |
| `today` | Today 00:00 to 23:59 | `new Date()` set to day boundaries |
| `yesterday` | Yesterday 00:00 to 23:59 | Day offset of -1 |
| `past7days` | Last 7 days from today | Day offset of -7 to today |
| `past30days`, `past90days` | Day offsets | -30, -90 respectively |

All end dates set to 23:59:59.999 to include full day.

## Unified Log Querying with `useAllActivityLogs`

This hook provides a single data source for feed + sleep activities:

### Query Pattern

```typescript
const { activeTypes, timeRange, startDate, endDate } = useLogsFilters();
const allLogs = useAllActivityLogs(babyId, activeTypes, startDate, endDate);
```

### Key Features

1. **Conditional queries**: Only queries feed/sleep if included in `activeTypes`
2. **Caregiver enrichment**: Joins with `babyAccess` table to include caregiver labels (who logged the activity)
3. **Unified type**: Returns `UnifiedLog[]` combining both feed and sleep as single interface
4. **Sorted DESC**: Newest logs first (`sorted by startedAt` DESC)
5. **Handles loading state**: Returns `undefined` while queries are in flight

### UnifiedLog Type

```typescript
type UnifiedLog = {
  id: string;
  type: 'feed' | 'sleep';
  babyId: number;
  startedAt: Date;
  caregiverLabel: string | null;  // Who logged it (e.g., "Mom", "Dad")
  data: LocalFeedLog | LocalSleepLog;  // Full activity data
};
```

## Log Formatting & Display

### Formatting Functions in `format-log.ts`

#### `formatLogSubtitle(log: UnifiedLog): string`

Returns JSON with left/right aligned display columns:

```javascript
// Bottle feed
{ left: "Bottle · 155 ml", right: "today · 18:42" }

// Breast feed
{ left: "Breast · 20m · Right", right: "today · 18:42" }

// Sleep
{ left: "Sleep · 2h12m", right: "today · 18:42" }
```

**Key design choices**:
- Left column: Activity type + details (compact form)
- Right column: Date (relative) + time (24-hour format)
- Breast feeds include side (left/right/both)
- Format as JSON for easy parsing in components

#### `formatDate(date: Date): string`

Relative date formatting (not calendar):

- Today → `"today"`
- Yesterday → `"yesterday"`
- Older → `"X days ago"` (e.g., `"3 days ago"`)

#### `formatDuration(minutes: number): string`

Human-readable duration:

- Under 60 min → `"45m"`
- Hours + minutes → `"1h 30m"`
- Full hours → `"2h"`

#### `groupLogsByDate(logs: UnifiedLog[]): LogGroup[]`

Groups logs by date for section headers:

```typescript
type LogGroup = {
  label: string;      // "Today", "Yesterday", "Jan 22, 2026"
  logs: UnifiedLog[];
  sortKey: number;    // For ordering (newest first)
};
```

**Section header rules**:
- Today (dayDiff === 0) → label: "Today", sortKey: 0
- Yesterday (dayDiff === 1) → label: "Yesterday", sortKey: 1
- Older → format as "MMM d, yyyy", sortKey: dayDiff
- Always sorted newest first

## View Modes

### Simplified Mode (Default)

Single-line compact monospace format with 2-column grid layout:

```
Bottle · 155 ml          today · 18:42
Breast · 20m · Right     yesterday · 09:15
```

- Font: `font-mono text-sm`
- Layout: `flex justify-between` (left/right aligned)
- Grid: 2 columns on desktop, single on mobile (`md:grid-cols-2`)
- Minimal visual weight (ideal for scanning)

### Expanded Mode

Multi-line format reusing `ActivityTile` component:

```
Feed
Bottle · 155 ml

Sleep
Sleep · 2h12m
```

- Title: activity type capitalized ("Feed", "Sleep")
- Subtitle: left column from formatting (activity details)
- Same 2-column grid as simplified mode
- Higher visual weight (better for detailed review)

### View Toggle Implementation

```typescript
const [viewMode, setViewMode] = useState<ViewMode>('simplified');

// Button text changes based on mode
viewMode === 'simplified' ? "Expanded +" : "Simplified -"
```

- Persists in component state (not URL-persisted)
- Icon changes based on mode (Plus/Minus)

## Log Item Rendering

### LogItem Component

Handles both view modes through conditional rendering, with touch-based swipe-to-delete on mobile.

1. **Expanded mode**: Renders `ActivityTile` with standard layout
2. **Simplified mode**: Custom button with monospace flexbox layout + swipe gesture detection

```typescript
// Simplified: custom button with left/right alignment
<button className="flex justify-between font-mono text-sm">
  <span>{parsed.left}</span>
  <span>{parsed.right}</span>
</button>

// Expanded: ActivityTile component
<ActivityTile
  title="Feed"
  subtitle="Bottle · 155 ml"
  activity="feed"
/>
```

### Swipe-to-Delete Gesture (Mobile)

LogItem supports swipe-left-to-delete on touch devices:

**Implementation Details:**
- Tracks touch position with `touchStartX` reference
- Calculates horizontal drag distance (`diff = currentX - startX`)
- Only allows leftward swipes (negative `diff` values)
- Translates container left as user swipes: `transform: translateX(${swipeTranslate}px)`
- Reveals red "Delete" button background during swipe
- Threshold: Swiping past **100px** triggers auto-delete
- Snaps back with animation if not past threshold

**State Management:**
```typescript
const [swipeTranslate, setSwipeTranslate] = useState(0);  // Current swipe distance
const [isDeleting, setIsDeleting] = useState(false);      // Delete in progress
const touchStartX = useRef(0);                            // Starting touch X position
const DELETE_THRESHOLD = 100;                             // px to trigger delete
```

**Touch Event Flow:**
1. `handleTouchStart`: Record starting X position
2. `handleTouchMove`: Update `swipeTranslate` as user drags
3. `handleTouchEnd`: If past threshold, call `handleDelete()`, else snap back to 0

**Delete Action:**
- Calls `deleteFeedLog(log.id)` (local-first operation)
- Sets `isDeleting = true` while operation pending
- Shows error toast on failure, snaps back
- On success, item auto-removes via `useLiveQuery`
- Shows success toast "Feed deleted"

**Visual States:**
- **At rest**: `swipeTranslate = 0`, smooth transition animation
- **Swiping**: `swipeTranslate < 0` (no animation for smooth drag)
- **Deleting**: `opacity-50` fade (button disabled)
- **Delete background**: Red box with "Delete" text, visible behind translated content

### Activity Type Styling

CSS classes applied based on log type:

```typescript
const activityClassMap = {
  feed: 'activity-tile--feed',
  sleep: 'activity-tile--sleep',
  nappy: 'activity-tile--nappy',  // Future proofing
};
```

These classes provide activity-specific colors from brand guidelines.

## Date Grouping & Display

### Grouping Algorithm

All logs grouped using `groupLogsByDate()` before rendering:

1. Calculate `dayDiff` between log date and today (at 00:00)
2. Assign label and sortKey based on dayDiff
3. Group logs by label
4. Sort groups by sortKey (ascending = newer first)

### Section Header Format

```
Today (dayDiff === 0)
  - 2-column grid of logs for today
Yesterday (dayDiff === 1)
  - 2-column grid of logs for yesterday
Jan 22, 2026 (dayDiff > 1)
  - 2-column grid of logs for that date
```

## Editing & Deletion

### Edit Modal Pattern

Each activity type has dedicated edit modal (`EditFeedModal`, `EditSleepModal`):

1. Modal receives `UnifiedLog` as prop
2. Component type determines which modal renders
3. Modal loads form state from log data
4. User edits via reusable form sections (FeedMethodToggle, ManualModeSection, etc.)
5. On save: calls operations layer (`updateFeedLog()`, `updateSleepLog()`)
6. Includes delete button with confirmation dialog

### Edit/Delete Operations

Operations use the local-first pattern:

1. **Write to IndexedDB**: Updated log persisted locally
2. **Enqueue to outbox**: Mutation tracked for sync
3. **Background sync**: `flushOutbox()` sends changes to server
4. **UI auto-update**: `useLiveQuery` re-renders with new data

See `.readme/chunks/local-first.operations-layer-pattern.md` for full pattern details.

### Form Initialization

Edit modal pre-fills form with current log values:

```typescript
// Feed log
actions.setMethod(feed.method);  // 'bottle' or 'breast'
actions.setStartTime(feed.startedAt);
actions.setAmountMl(feed.amountMl ?? 120);  // Bottle amount
actions.setDurationMinutes(feed.durationMinutes);  // Breast duration
actions.setEndSide(feed.endSide);  // Breast side

// Sleep log
actions.setStartTime(sleep.startedAt);
actions.setEndTime(sleep.endedAt);
```

### Delete Confirmation

Two-stage delete process:

1. User clicks delete button
2. AlertDialog confirmation appears
3. Confirms: `deleteFeedLog(id)` executed
4. Success: Modal closes, toast shown
5. UI auto-updates via `useLiveQuery`

## Loading & Empty States

### Loading State

While logs are being fetched (`logs === undefined`):

```typescript
// Skeleton grid matching current view mode
{Array.from({ length: 3 }).map(section =>
  <div className="space-y-2">
    <Skeleton className="h-4 w-20" />  // Date header
    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
      <Skeleton className={viewMode === 'expanded' ? 'h-20' : 'h-12'} />
      {/* repeated for grid items */}
    </div>
  </div>
)}
```

Skeleton height varies by view mode:
- Simplified: `h-12` (compact monospace line)
- Expanded: `h-20` (taller ActivityTile)

### Empty State

`EmptyState` component shown when:

1. **No logs created yet** (`hasAnyLogs === false`): Encourages logging first activity
2. **No logs match filters** (`logs.length === 0`): Suggests different filter combinations

Receives `hasAnyLogs` prop to show appropriate messaging.

## Related Patterns

### ActivityTile Reusability

The `ActivityTile` component supports both expanded and simplified layouts:

- **Expanded**: Default multi-line display with title and subtitle
- **Simplified**: Compact monospace format (via LogItem custom button)
- See `.readme/chunks/ui-patterns.activity-tile.md` for complete pattern

### Filter State Synchronization

Filter state syncs to URL immediately on change:

```typescript
const setActiveTypes = useCallback(
  (types: ActivityType[]) => {
    const params = new URLSearchParams(searchParams);
    if (types.length === 0 || (both types selected)) {
      params.delete('types');  // Clean URL when using defaults
    } else {
      params.set('types', types.join(','));
    }
    router.replace(`${pathname}?${params.toString()}`);
  },
  [searchParams, router, pathname]
);
```

This enables:
- Browser back button preserves filter state
- Sharable URLs with specific filters
- Bookmarkable views

## Related Documentation

- `.readme/sections/feed-logging.index.md` - Feed logging system overview
- `.readme/chunks/local-first.operations-layer-pattern.md` - Edit/delete operations pattern
- `.readme/chunks/ui-patterns.activity-tile.md` - ActivityTile reusability patterns
- `.readme/chunks/feed-logging.server-actions.md` - Server-side feed operations
- `.readme/sections/local-first.index.md` - Local-first architecture with IndexedDB and outbox
