# Documentation Session: 2026-01-29 - Bug Fixes and Pattern Documentation

## Overview

Documented critical bug fixes and new patterns from recent development work on feed/sleep/nappy logging UX improvements and Dexie query corrections.

## Work Completed

### 1. Dexie Query Pattern Fixes - New Chunk Created

**File:** `.readme/chunks/local-first.dexie-query-patterns.md`

**Documented Issues:**
- **Sort Order Bug**: `.reverse().sortBy('startedAt')` sorts by UUID string order, not chronologically
  - Root cause: Dexie's sortBy returns results in index order, then reverses array
  - Solution: Use `.toArray()` followed by manual JavaScript sort with `Date.getTime()`

- **Future Log Filtering**: Future-dated logs were blocking past logs in "latest" tiles
  - Root cause: No filtering on startedAt in overview queries
  - Solution: Add `startedAt <= now` filter to all "latest" queries

**Pattern Documented:**
- Helper function pattern (`getLatestFeedLog`, `getAllFeedLogsByBaby`, `getAllActivityLogs`)
- Hook usage pattern with `useLiveQuery`
- Component usage pattern
- Performance considerations (compound indexes still work with `.toArray()`)
- Time-dependent filtering gotchas

**Related Source Files:**
- `src/lib/local-db/helpers/feed-logs.ts`
- `src/lib/local-db/helpers/sleep-logs.ts`
- `src/lib/local-db/helpers/nappy-logs.ts`
- `src/hooks/useAllActivityLogs.ts`
- `src/hooks/useFeedLogs.ts`, `useSleepLogs.ts`, `useNappyLogs.ts`
- `src/app/[locale]/(auth)/(app)/overview/_components/OverviewContent.tsx`

### 2. Zustand Selector Reactivity Pattern - New Chunk Created

**File:** `.readme/chunks/ui-patterns.zustand-selector-reactivity.md`

**Documented Pattern:**
- Modal save button enable/disable based on timer state (≥60 seconds requirement)
- Zustand subscription pattern via `.subscribe()` with selectors
- Why function calls (`getTotalElapsed()`) don't work for reactivity

**Key Implementation:**
```typescript
useEffect(() => {
  const unsubscribe = useTimerStore.subscribe(
    state => state.totalElapsedSeconds, // Selector
    totalElapsed => setCanSave(totalElapsed >= 60) // Callback
  );

  // Check initial state
  const initial = useTimerStore.getState().totalElapsedSeconds;
  setCanSave(initial >= 60);

  return unsubscribe;
}, [options.inputMode]);
```

**Pattern Comparison:**
- Before: Save button only checked timer at submit time (stale state)
- After: Button instantly updates when user presses +1m/-1m buttons

**Related Source Files:**
- `src/stores/useTimerStore.ts`
- `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/AddFeedModal.tsx`
- `src/app/[locale]/(auth)/(app)/overview/_components/add-feed-modal/hooks/useFeedFormSubmit.ts`
- `src/app/[locale]/(auth)/(app)/overview/_components/add-sleep-modal/hooks/useSleepFormSubmit.ts`

### 3. Activity Modal Enhancement - Chunk Updated

**File:** `.readme/chunks/ui-patterns.activity-modals.md`

**Updates:**
- Updated `last_verified_at` to 2026-01-29
- Added reactive `canSave` state to `use{Activity}FormSubmit` example
- Updated orchestrator example to show reactive button enable/disable
- Added new Gotcha #6: Timer Mode Validation with Zustand subscriber pattern
- Added cross-reference to new zustand-selector-reactivity chunk

**Before/After Comparison Added:**
- Before: Save button stale when timer changes
- After: Button instantly enables/disables based on timer state

### 4. Section Index Updates

**Files Updated:**
- `.readme/sections/local-first.index.md`
  - Added reference to `local-first.dexie-query-patterns.md` in Core Architecture section
  - Updated `last_verified_at` to 2026-01-29

- `.readme/sections/feed-logging.index.md`
  - Added "State Management & Reactivity" subsection with `ui-patterns.zustand-selector-reactivity.md`
  - Added "Query Patterns" subsection with `local-first.dexie-query-patterns.md`
  - Updated `last_verified_at` to 2026-01-29

## Key Patterns Established

### Pattern 1: Dexie Query Helpers

All activity log queries follow this pattern:

```typescript
// helpers/feed-logs.ts
export async function getLatestFeedLog(babyId: number): Promise<LocalFeedLog | undefined> {
  const now = new Date();
  const logs = await localDb.feedLogs
    .where('babyId')
    .equals(babyId)
    .filter(log => log.startedAt <= now) // Exclude future
    .toArray();

  logs.sort((a, b) => b.startedAt.getTime() - a.startedAt.getTime()); // Correct sort
  return logs[0];
}
```

### Pattern 2: Modal Form Validation with Store Reactivity

All activity modals with timer validation follow this pattern:

```typescript
useEffect(() => {
  if (options.inputMode !== 'timer') {
    setCanSave(true);
    return;
  }

  // Subscribe to store changes
  const unsubscribe = useTimerStore.subscribe(
    state => state.totalElapsedSeconds,
    elapsed => setCanSave(elapsed >= 60)
  );

  // Check initial
  setCanSave(useTimerStore.getState().totalElapsedSeconds >= 60);

  return unsubscribe;
}, [options.inputMode]);
```

## Files Changed by Type

### New Chunks Created
- `.readme/chunks/local-first.dexie-query-patterns.md`
- `.readme/chunks/ui-patterns.zustand-selector-reactivity.md`

### Chunks Updated
- `.readme/chunks/ui-patterns.activity-modals.md` (verification date, examples, gotchas)

### Sections Updated
- `.readme/sections/local-first.index.md` (added new chunk reference, verification date)
- `.readme/sections/feed-logging.index.md` (added new chunk references, verification date)

## Documentation Quality Metrics

### Dexie Query Patterns Chunk
- Token count: ~1200
- Code examples: 7 (helper functions, hook usage, component usage)
- Gotchas covered: 4
- Related systems: 3

### Zustand Selector Reactivity Chunk
- Token count: ~1400
- Code examples: 8 (store definition, hook implementation, component usage)
- Before/after comparison: Yes
- Gotchas covered: 3
- Pattern section: Comprehensive with dependency stability

## Verification Checklist

- [x] All chunks have YAML front matter with `last_verified_at` and `source_paths`
- [x] Sections updated with chunk references
- [x] Cross-references between chunks added
- [x] Code examples are correct and match source patterns
- [x] Gotchas documented for common pitfalls
- [x] Before/after comparisons included
- [x] Token count reasonable for RAG-style chunks (~1000-1500 tokens)
- [x] No code patterns duplicated unnecessarily
- [x] Related systems documented at bottom of chunks

## Related Issues Fixed in Source Code

### Bug Fixes
1. **Breast Feed Log Not Updating on Overview**
   - Fix: Added `startedAt <= now` filter to latest log queries
   - Files: OverviewContent.tsx, useLatest* hooks, helpers

2. **Dexie Query Sort Order Bug**
   - Fix: Changed from `.reverse().sortBy()` to `.toArray()` + manual sort
   - Files: All log helpers and hooks

3. **Timer Validation Enhancement**
   - Fix: Save button now reactive to timer state changes
   - Files: AddFeedModal.tsx, useFeedFormSubmit.ts, useSleepFormSubmit.ts

## Cross-References

The new chunks are referenced in:
- Local-First section (Dexie patterns)
- Feed-Logging section (both Dexie patterns and state reactivity)

Future updates should reference these chunks when:
- Implementing new query helpers
- Adding timer validation to new modals
- Debugging sort order issues
- Working with Zustand store reactivity
