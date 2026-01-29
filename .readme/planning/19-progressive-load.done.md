# Progressive Loading Strategy for /logs

## Problem Statement

The `/logs` page has 3 tabs (Listing, Today, Week) that render heavily. Current issues:
- All 3 tabs render eagerly on mount (even inactive tabs)
- Multiple `useLiveQuery` hooks run simultaneously (~9 reactive queries)
- No loading states during navigation transitions
- Performance will degrade as log count increases

## Current Architecture Analysis

### What Already Exists (Correctly)

| Feature | Status | Implementation |
|---------|--------|----------------|
| Local-first data | ✅ Done | Dexie IndexedDB, `useLiveQuery` |
| Background sync | ✅ Done | Web Worker (`sync-worker.ts`) |
| Initial sync | ✅ Done | 7-day window via `/api/sync/initial` |
| Progressive historical fetch | ✅ Done | Chunked fetching in Web Worker |
| Outbox for offline mutations | ✅ Done | `outbox` table + flush on reconnect |

### Performance Issues Found

**1. Eager Tab Rendering** (`LogsContent.tsx`)
```tsx
// ALL tabs render immediately, regardless of which is active
<TabsContent value="listing">...</TabsContent>
<TabsContent value="today">...</TabsContent>
<TabsContent value="week">...</TabsContent>
```

**2. Duplicate Data Queries**
```tsx
// Line 44: Listing view - fetches feed/sleep/nappy logs
const allLogs = useAllActivityLogs(babyId, activeTypes, startDate, endDate);

// Line 47: Chart views - fetches ALL logs again (no date restriction)
const chartLogs = useAllActivityLogs(babyId, chartActiveTypes, null, null);
```

Each `useAllActivityLogs` call triggers 4 `useLiveQuery` hooks internally:
- `useFeedLogsByDateRange`
- `useSleepLogsByDateRange`
- `useNappyLogsByDateRange`
- Merge/transform query

**Result**: 9 reactive queries running on page load, many fetching overlapping data.

---

## Plan Review - What Makes Sense vs What Doesn't

### ✅ Makes Sense

1. **Loading state between navigations**
   - Sidebar/navigation needs loading indicators
   - Skeleton states for data loading

2. **Load initial 10 days first, then progressively load more**
   - Currently loads 7 days - can adjust
   - Web Worker already handles progressive historical fetch

3. **Lazy initialize tabs - only init active tab**
   - Valid optimization - prevents 9 queries on mount
   - Should reduce initial render time significantly

### ❌ Doesn't Make Sense

1. **"Service worker for progressive sync"**

   **Problem**: Service Workers are NOT designed for database operations.
   - Service Workers: intercept network requests, cache assets
   - Web Workers: background data processing, IndexedDB operations

   **Reality**: The app already uses Web Workers correctly (`sync-worker.ts`).
   The service worker (`sw.js` via next-pwa) handles caching strategies.

2. **"Load once and local keep indexeddb no read from server"**

   **Problem**: This is already the architecture!
   - `useLiveQuery` reads from IndexedDB, not server
   - Server is only contacted for sync (initial + delta)
   - All UI reads are purely local

---

## Recommended Implementation Plan

### Phase 1: Lazy Tab Rendering (High Impact)

**Goal**: Only render active tab, defer inactive tabs until selected.

**File**: `src/app/[locale]/(auth)/(app)/logs/_components/LogsContent.tsx`

**Approach**:
```tsx
// Track which tabs have been viewed
const [mountedTabs, setMountedTabs] = useState<Set<LogsViewTab>>(
  new Set(['listing']) // Only mount default tab initially
);

// When tab changes, add to mounted set
const handleTabChange = (tab: LogsViewTab) => {
  setActiveTab(tab);
  setMountedTabs(prev => new Set(prev).add(tab));
};

// Only render tab content if it's been mounted
{mountedTabs.has('listing') && (
  <TabsContent value="listing">...</TabsContent>
)}
{mountedTabs.has('today') && (
  <TabsContent value="today">...</TabsContent>
)}
{mountedTabs.has('week') && (
  <TabsContent value="week">...</TabsContent>
)}
```

**Impact**: Reduces initial queries from 9 to ~5 (only listing tab queries).

### Phase 2: Unified Data Query (Medium Impact)

**Goal**: Single data source for all tabs, filter in render.

**File**: `src/app/[locale]/(auth)/(app)/logs/_components/LogsContent.tsx`

**Approach**:
```tsx
// Single query for all logs (no date restriction)
const allLogs = useAllActivityLogs(babyId, ACTIVITY_TYPES.map(t => t.value), null, null);

// Filter for listing view
const listingLogs = useMemo(() => {
  if (!allLogs) return undefined;
  return allLogs.filter(log =>
    activeTypes.includes(log.type) &&
    (!startDate || log.startedAt >= startDate) &&
    (!endDate || log.startedAt <= endDate)
  );
}, [allLogs, activeTypes, startDate, endDate]);

// Filter for chart views
const chartLogs = useMemo(() => {
  if (!allLogs) return undefined;
  return allLogs.filter(log => chartActiveTypes.includes(log.type));
}, [allLogs, chartActiveTypes]);
```

**Impact**: Reduces queries from 8 (2x useAllActivityLogs) to 4 (1x useAllActivityLogs).

### Phase 3: Navigation Loading States

**Goal**: Immediate UI feedback during route transitions.

**Files**:
- `src/app/[locale]/(auth)/(app)/layout.tsx` or sidebar component
- `src/components/ui/sidebar.tsx`

**Approach**:
- Use Next.js loading.tsx for route-level loading
- Add `useTransition` or `usePending` from Next.js navigation
- Show spinner in sidebar when navigation pending

### Phase 4: Initial Sync Window Adjustment

**Goal**: Increase initial data window from 7 to 10 days.

**File**: `src/app/[locale]/api/sync/initial/route.ts`

**Change**:
```tsx
// Change from 7 days to 10 days
const tenDaysAgo = new Date();
tenDaysAgo.setDate(tenDaysAgo.getDate() - 10);
```

### Phase 5: Virtualized List Rendering (For Large Datasets)

**Goal**: Only render visible log items in listing view.

**File**: `src/app/[locale]/(auth)/(app)/logs/_components/LogsList.tsx`

**Approach**: Use `@tanstack/react-virtual` or `react-window` for virtualized scrolling.

---

## Files to Modify

| File | Change |
|------|--------|
| `src/app/[locale]/(auth)/(app)/logs/_components/LogsContent.tsx` | Lazy tab mounting, unified query |
| `src/app/[locale]/(auth)/(app)/logs/_components/LogsList.tsx` | Virtual scrolling (optional) |
| `src/app/[locale]/api/sync/initial/route.ts` | 10-day window |
| Sidebar component | Navigation loading indicator |

---

## Verification Plan

1. **Performance measurement**:
   - React DevTools Profiler before/after
   - Measure time-to-interactive on /logs
   - Count active useLiveQuery subscriptions

2. **Functionality testing**:
   - All 3 tabs render correctly when selected
   - Filters work as expected
   - Edit modals open correctly from all tabs
   - Historical data loads progressively

3. **Loading states**:
   - Navigation shows loading indicator
   - Empty states show while data loads

---

## Summary

Your intuition about progressive loading is correct, but the **architecture already supports local-first patterns** with Web Workers for background sync. The main wins come from:

1. **Lazy tab rendering** - Don't render what user hasn't requested
2. **Unified data query** - One IndexedDB subscription, filter in memory
3. **Virtualized lists** - For large log counts

Service Workers are not the right tool for data sync - Web Workers (already in use) are correct.
