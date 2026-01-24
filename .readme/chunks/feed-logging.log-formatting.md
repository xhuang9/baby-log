---
last_verified_at: 2026-01-25T12:00:00Z
source_paths:
  - src/lib/format-log.ts
  - src/app/[locale]/(auth)/(app)/logs/_components/LogItem.tsx
---

# Log Formatting & Display

## Purpose

Utility functions in `format-log.ts` provide consistent, scannable formatting for activity logs with relative dates, human-readable durations, and structured left/right column layouts for efficient visual parsing.

## UnifiedLog Type

Central type combining feed and sleep logs into uniform interface:

```typescript
type UnifiedLog = {
  id: string;
  type: 'feed' | 'sleep';
  babyId: number;
  startedAt: Date;
  caregiverLabel: string | null;  // "Mom", "Dad", etc. or null
  data: LocalFeedLog | LocalSleepLog;  // Original log data
};
```

This allows components to work with both activity types using single interface and `.type` discriminator.

## Formatting Functions

### `formatLogSubtitle(log: UnifiedLog): string`

Returns JSON-serialized object with left and right columns for display.

#### Purpose

Provides structured data for LogItem rendering:
- Left column: Activity type + details (compact form)
- Right column: Date (relative) + time (24-hour)
- JSON format enables easy parsing by components

#### Examples

**Bottle Feed**:
```javascript
formatLogSubtitle(bottleLog)
→ '{"left":"Bottle · 155 ml","right":"today · 18:42"}'

Parsed: { left: "Bottle · 155 ml", right: "today · 18:42" }
```

**Breast Feed**:
```javascript
formatLogSubtitle(breastLog)
→ '{"left":"Breast · 20m · Right","right":"today · 18:42"}'

Parsed: { left: "Breast · 20m · Right", right: "today · 18:42" }
```

**Sleep**:
```javascript
formatLogSubtitle(sleepLog)
→ '{"left":"Sleep · 2h12m","right":"today · 18:42"}'

Parsed: { left: "Sleep · 2h12m", right: "today · 18:42" }
```

#### Implementation

```typescript
export function formatLogSubtitle(log: UnifiedLog): string {
  const time = formatTime(log.startedAt);
  const date = formatDate(log.startedAt);
  const rightPart = `${date} · ${time}`;

  if (log.type === 'feed') {
    const feed = log.data as LocalFeedLog;
    if (feed.method === 'bottle') {
      const amount = feed.amountMl ? `${feed.amountMl} ml` : 'unknown';
      const leftPart = `Bottle · ${amount}`;
      return JSON.stringify({ left: leftPart, right: rightPart });
    } else {
      const duration = formatDuration(feed.durationMinutes);
      const side = feed.endSide
        ? ` · ${feed.endSide.charAt(0).toUpperCase() + feed.endSide.slice(1)}`
        : '';
      const leftPart = `Breast · ${duration}${side}`;
      return JSON.stringify({ left: leftPart, right: rightPart });
    }
  }

  if (log.type === 'sleep') {
    const sleep = log.data as LocalSleepLog;
    const duration = formatDuration(sleep.durationMinutes);
    const leftPart = `Sleep · ${duration}`;
    return JSON.stringify({ left: leftPart, right: rightPart });
  }

  return '';
}
```

#### Design Rationale

**JSON format**:
- Enables easy parsing in components
- Separates concerns: formatting logic stays in utils, parsing in components
- Future-proof: can add more fields without changing all consumers

**Left column structure**:
- Activity type first (easy scanning)
- Details separated by "·" (visual separator)
- Compact abbreviations (m for minutes, not "min")

**Right column structure**:
- Date first (chronological context)
- Time second (specific timing)
- Relative dates vs absolute (easier to understand "today" than "Jan 25")

### `formatDate(date: Date): string`

Relative date formatting optimized for quick scanning.

#### Rules

| Condition | Output |
|-----------|--------|
| Same day as today | `"today"` |
| Same day as yesterday | `"yesterday"` |
| Older than yesterday | `"X days ago"` (e.g., `"3 days ago"`) |

#### Implementation

```typescript
function formatDate(date: Date): string {
  const now = new Date();
  const logDate = new Date(date);

  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const logDateStart = new Date(logDate);
  logDateStart.setHours(0, 0, 0, 0);

  const dayDiff = Math.floor(
    (todayStart.getTime() - logDateStart.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (dayDiff === 0) return 'today';
  if (dayDiff === 1) return 'yesterday';
  if (dayDiff >= 2) return `${dayDiff} days ago`;

  return 'today';
}
```

#### Why Relative Dates?

1. **Faster scanning**: "today", "yesterday" require no calculation
2. **Mobile-friendly**: Shorter text in limited space
3. **User-centric**: Relative to when user is viewing (more intuitive)
4. **Consistency**: Matches natural language parents use ("Did we feed yesterday?")

**Note**: For section headers in `groupLogsByDate()`, dates older than 2 days use absolute format ("Jan 22, 2026") for clarity.

### `formatDuration(minutes: number | null | undefined): string`

Human-readable duration conversion from minutes.

#### Rules

| Input | Output |
|-------|--------|
| `null` or `undefined` | `"0m"` |
| Negative numbers | `"0m"` |
| 0-59 minutes | `"45m"` |
| 60+ minutes with remainder | `"1h 30m"` |
| Exact hours | `"2h"` |

#### Examples

```typescript
formatDuration(null)      → "0m"
formatDuration(45)        → "45m"
formatDuration(60)        → "1h"
formatDuration(90)        → "1h 30m"
formatDuration(132)       → "2h 12m"
```

#### Implementation

```typescript
function formatDuration(durationMinutes: number | null | undefined): string {
  if (!durationMinutes || durationMinutes < 0) {
    return '0m';
  }

  if (durationMinutes < 60) {
    return `${durationMinutes}m`;
  }

  const hours = Math.floor(durationMinutes / 60);
  const mins = durationMinutes % 60;
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}
```

#### Design Rationale

**Compound format** (`"1h 30m"` vs `"90m"`):
- More readable at a glance
- Familiar to parents (common way to express time)
- Scans better than numeric minutes

**Omit zero minutes** (`"2h"` not `"2h 0m"`):
- Cleaner display
- Reduces cognitive load
- Still unambiguous

### `formatTime(date: Date): string`

24-hour time formatting.

#### Example

```typescript
formatTime(new Date('2026-01-25T18:42:30Z'))
→ "18:42"
```

#### Implementation

```typescript
function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,  // 24-hour format
  });
}
```

**Note**: Currently hardcoded to 24-hour format. Can be made configurable based on user locale/preference in future.

### `formatTimeAgo(date: Date): string`

Time elapsed formatting (different from `formatDate` - includes hours and minutes).

#### Examples

```typescript
formatTimeAgo(1 hour ago)     → "1h ago"
formatTimeAgo(2.5 hours ago)  → "2h 30m ago"
formatTimeAgo(1 day ago)      → "1d ago"
formatTimeAgo(3.5 days ago)   → "3d 12h ago"
formatTimeAgo(30 seconds ago) → "Just now"
```

#### Implementation

```typescript
export function formatTimeAgo(date: Date): string {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / (1000 * 60));
  const diffHours = Math.floor(diffMinutes / 60);
  const diffDays = Math.floor(diffHours / 24);

  if (diffDays > 0) {
    const remainingHours = diffHours % 24;
    return remainingHours > 0
      ? `${diffDays}d ${remainingHours}h ago`
      : `${diffDays}d ago`;
  }

  if (diffHours > 0) {
    const remainingMinutes = diffMinutes % 60;
    return remainingMinutes > 0
      ? `${diffHours}h ${remainingMinutes}m ago`
      : `${diffHours}h ago`;
  }

  if (diffMinutes > 0) {
    return `${diffMinutes}m ago`;
  }

  return 'Just now';
}
```

**Note**: Currently unused in logs page (uses `formatDate` instead). Available for other contexts like real-time activity indicators.

## Date Grouping: `groupLogsByDate(logs: UnifiedLog[]): LogGroup[]`

Groups logs into date-based sections for display with proper sorting.

### LogGroup Type

```typescript
type LogGroup = {
  label: string;        // "Today", "Yesterday", "Jan 22, 2026"
  logs: UnifiedLog[];   // All logs from this date
  sortKey: number;      // For ordering (newer first)
};
```

### Grouping Algorithm

1. Iterate through all logs
2. For each log, calculate `dayDiff` from today
3. Assign label and sortKey based on dayDiff
4. Group logs by label into Map
5. Convert to array and sort by sortKey (ascending)

#### Label Rules

| Condition | Label | sortKey |
|-----------|-------|---------|
| Today (dayDiff === 0) | `"Today"` | 0 |
| Yesterday (dayDiff === 1) | `"Yesterday"` | 1 |
| Older (dayDiff > 1) | `"MMM d, yyyy"` | dayDiff |

#### Examples

```javascript
groupLogsByDate([
  { startedAt: new Date(), ... },      // Today
  { startedAt: yesterday, ... },       // Yesterday
  { startedAt: 3daysAgo, ... },        // Jan 22, 2026
])

→ [
  { label: "Today", logs: [...], sortKey: 0 },
  { label: "Yesterday", logs: [...], sortKey: 1 },
  { label: "Jan 22, 2026", logs: [...], sortKey: 3 },
]
```

#### Implementation

```typescript
export function groupLogsByDate(logs: UnifiedLog[]): LogGroup[] {
  const groups = new Map<string, { logs: UnifiedLog[]; sortKey: number }>();
  const now = new Date();
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  for (const log of logs) {
    const logDate = new Date(log.startedAt);
    const logDateStart = new Date(logDate);
    logDateStart.setHours(0, 0, 0, 0);

    const dayDiff = Math.floor(
      (todayStart.getTime() - logDateStart.getTime()) / (1000 * 60 * 60 * 24)
    );

    let label: string;
    let sortKey: number;

    if (dayDiff === 0) {
      label = 'Today';
      sortKey = 0;
    } else if (dayDiff === 1) {
      label = 'Yesterday';
      sortKey = 1;
    } else {
      label = logDate.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
      });
      sortKey = dayDiff;
    }

    if (!groups.has(label)) {
      groups.set(label, { logs: [], sortKey });
    }
    groups.get(label)!.logs.push(log);
  }

  return Array.from(groups.entries())
    .map(([label, { logs, sortKey }]) => ({
      label,
      logs,
      sortKey,
    }))
    .sort((a, b) => a.sortKey - b.sortKey);  // Newer first
}
```

### Design Rationale

**Relative dates for recent logs**:
- Today/Yesterday are familiar human concepts
- Reduce cognitive load vs "0 days ago" or "1 day ago"

**Absolute format for older logs**:
- "Jan 22, 2026" is unambiguous and scannable
- Provides calendar context for historical reference
- Prevents ambiguity ("10 days ago" requires mental math)

**Stable grouping**:
- Groups never break across days (good UX)
- Logs within group unsorted (they're sorted DESC in data source)

## Parsing in Components

LogItem component receives formatted subtitle and parses JSON:

```typescript
const details = formatLogSubtitle(log);

let parsed: { left: string; right: string } | null = null;
try {
  parsed = JSON.parse(details);
} catch {
  // Fallback for legacy format
  return <ActivityTile ... />;
}

if (viewMode === 'expanded') {
  // Use parsed.left for subtitle in ActivityTile
  return <ActivityTile title="Feed" subtitle={parsed.left} />;
}

// Simplified mode: custom button with left/right columns
return (
  <button className="flex justify-between font-mono">
    <span>{parsed.left}</span>
    <span>{parsed.right}</span>
  </button>
);
```

## Related Documentation

- `.readme/chunks/feed-logging.activity-logs-page.md` - Logs page component structure
- `.readme/sections/feed-logging.index.md` - Feed logging system overview
