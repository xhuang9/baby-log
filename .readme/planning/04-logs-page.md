# Logs Page - Filtering & Editing

**Priority:** High
**Dependencies:** 01-state-management-sync.md
**Estimated Scope:** Medium

---

## Overview

Implement a comprehensive logs page that allows filtering by log type (feed, sleep, etc.) and enables editing existing entries using the same interface as adding new logs.

---

## Requirements

### Filtering

| Filter | Type | Default |
|--------|------|---------|
| Log type | Multi-select | All types |
| Date range | Date picker | Last 7 days |
| Baby | Dropdown | Active baby |

### Log List

- Chronological order (newest first)
- Grouped by date
- Show log type icon, time, key details
- Tap to edit

### Edit Mode

- Reuse existing "Add Feed" sheet pattern
- Pre-populate form with existing data
- Show "Delete" option
- Confirmation before delete

---

## UI Design

### Logs Page Layout

```
┌─────────────────────────────────────────┐
│  Logs                            [Filter]│
├─────────────────────────────────────────┤
│  Filter chips: [Feed ✓] [Sleep ✓] [All] │
├─────────────────────────────────────────┤
│  Today                                   │
│  ┌─────────────────────────────────────┐│
│  │ 🍼 Feed    2:30 PM   120ml bottle   ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │ 😴 Sleep   11:00 AM  2h 15m         ││
│  └─────────────────────────────────────┘│
│                                          │
│  Yesterday                               │
│  ┌─────────────────────────────────────┐│
│  │ 🍼 Feed    8:00 PM   90ml breast    ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

### Edit Sheet (reuses Add pattern)

```
┌─────────────────────────────────────────┐
│  Edit Feed                        [X]   │
├─────────────────────────────────────────┤
│  [Same form as Add Feed]                │
│                                          │
│  Time: [2:30 PM]                        │
│  Amount: [120] ml                       │
│  Method: [Bottle ▼]                     │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │          Save Changes               ││
│  └─────────────────────────────────────┘│
│  ┌─────────────────────────────────────┐│
│  │          Delete Entry               ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Logs Page Structure

- [ ] Create `src/app/[locale]/(auth)/(app)/logs/page.tsx`
- [ ] Create `logs/_components/LogsList.tsx`
- [ ] Create `logs/_components/LogItem.tsx`
- [ ] Create `logs/_components/LogFilters.tsx`
- [ ] Create `logs/_components/DateGroupHeader.tsx`

### Phase 2: Filtering Logic

- [ ] Create `useLogsFilter` hook
- [ ] Implement log type filtering
- [ ] Implement date range filtering
- [ ] Store filter preferences in URL params (shareable)
- [ ] Read logs from IndexedDB via `useLiveQuery`

### Phase 3: Edit Functionality

- [ ] Create `logs/_components/EditLogSheet.tsx`
- [ ] Refactor `AddFeedSheet` to support edit mode
- [ ] Create generic `LogFormSheet` component
- [ ] Implement pre-population of form data
- [ ] Add "Delete" button with confirmation

### Phase 4: Server Actions

- [ ] Create `updateFeedLog` action
- [ ] Create `deleteFeedLog` action
- [ ] Add to outbox for offline support
- [ ] Handle optimistic updates in IndexedDB

### Phase 5: Polish

- [ ] Add loading skeletons
- [ ] Implement infinite scroll for long lists
- [ ] Add empty state
- [ ] Add pull-to-refresh on mobile

---

## Data Flow

```
User taps log item
    │
    ▼
Open EditLogSheet (pre-populated)
    │
    ▼
User edits and saves
    │
    ├─► Online: Call server action → Update IndexedDB
    │
    └─► Offline: Add to outbox → Update IndexedDB (optimistic)
```

---

## Component Reuse Strategy

```
LogFormSheet (generic)
    │
    ├── AddFeedSheet (mode: "add")
    │
    └── EditFeedSheet (mode: "edit", initialData)

Future:
    ├── AddSleepSheet
    ├── EditSleepSheet
    └── etc.
```

---

## Success Criteria

- [ ] Filter by log type works
- [ ] Filter by date range works
- [ ] Tapping log opens edit sheet
- [ ] Edit saves changes correctly
- [ ] Delete removes entry with confirmation
- [ ] Works offline (queues mutations)
- [ ] List performs well with 1000+ entries
