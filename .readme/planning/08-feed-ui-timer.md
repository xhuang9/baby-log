# Feed UI - Timer Mode

**Priority:** High
**Dependencies:** None
**Estimated Scope:** Medium

---

## Overview

Change the feed UI to default to a timer-based interface. Users can start a timer when feeding begins and stop when done. Manual mode remains available for logging past feeds.

---

## Requirements

### Two Input Modes

| Mode | Use Case | Default |
|------|----------|---------|
| Timer | Real-time tracking | Yes |
| Manual | Logging past feeds | No |

### Timer Mode Features

- Start/pause/stop controls
- Elapsed time display (mm:ss)
- Side switching for breast feeding (Left/Right)
- Auto-save on stop
- Persist timer state if app closes

### Manual Mode Features

- Start time picker
- Duration input OR end time picker
- Amount input (for bottle)
- Same fields as current implementation

---

## UI Design

### Timer Mode (Default)

```
┌─────────────────────────────────────────┐
│  Log Feed                         [X]   │
├─────────────────────────────────────────┤
│                                          │
│  Method: [Breast] [Bottle]              │
│                                          │
│           ┌─────────────┐               │
│           │   05:23     │               │
│           │   elapsed   │               │
│           └─────────────┘               │
│                                          │
│  Side: [Left ●] [Right ○]               │
│                                          │
│     ┌───────┐         ┌───────┐         │
│     │ Pause │         │ Stop  │         │
│     └───────┘         └───────┘         │
│                                          │
│  [Switch to manual entry]               │
└─────────────────────────────────────────┘
```

### Manual Mode

```
┌─────────────────────────────────────────┐
│  Log Feed                         [X]   │
├─────────────────────────────────────────┤
│                                          │
│  Method: [Breast] [Bottle]              │
│                                          │
│  Start time:    [2:30 PM      ]         │
│  Duration:      [15] minutes            │
│                                          │
│  Amount:        [120] ml                │
│  Side:          [Left ▼]                │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │            Save Feed                ││
│  └─────────────────────────────────────┘│
│                                          │
│  [Switch to timer mode]                 │
└─────────────────────────────────────────┘
```

---

## Timer State Management

### Zustand Store

```typescript
// src/stores/useFeedTimerStore.ts

type FeedTimerState = {
  isRunning: boolean;
  isPaused: boolean;
  startedAt: Date | null;
  pausedAt: Date | null;
  totalPausedMs: number;
  method: 'breast' | 'bottle';
  currentSide: 'left' | 'right' | null;
  sideHistory: Array<{ side: 'left' | 'right'; startedAt: Date }>;
};

type FeedTimerActions = {
  start: (method: 'breast' | 'bottle') => void;
  pause: () => void;
  resume: () => void;
  stop: () => FeedLogData;
  switchSide: (side: 'left' | 'right') => void;
  reset: () => void;
};
```

### Persistence

- Store timer state in IndexedDB
- Restore on app open
- Show "Resume feed?" prompt if active timer found

---

## Implementation Tasks

### Phase 1: Timer Store

- [ ] Create `src/stores/useFeedTimerStore.ts`
- [ ] Implement start, pause, resume, stop actions
- [ ] Implement side switching with history
- [ ] Persist to IndexedDB

### Phase 2: Timer UI Components

- [ ] Create `overview/_components/FeedTimerSheet.tsx`
- [ ] Create `overview/_components/TimerDisplay.tsx`
- [ ] Create `overview/_components/TimerControls.tsx`
- [ ] Create `overview/_components/SideSelector.tsx`

### Phase 3: Manual Mode (Refactor)

- [ ] Extract current form to `FeedManualSheet.tsx`
- [ ] Add mode toggle to sheet
- [ ] Share common fields between modes

### Phase 4: Timer Persistence

- [ ] Save timer state to IndexedDB on changes
- [ ] Restore timer state on app open
- [ ] Show resume prompt if timer was active
- [ ] Handle abandoned timers (> 4 hours old)

### Phase 5: Polish

- [ ] Add haptic feedback on start/stop
- [ ] Add sound option for timer events
- [ ] Handle background/foreground transitions
- [ ] Test on iOS Safari and Android Chrome

---

## Timer Calculation Logic

```typescript
function getElapsedTime(state: FeedTimerState): number {
  if (!state.startedAt) return 0;

  const now = state.isPaused && state.pausedAt
    ? state.pausedAt
    : new Date();

  return now.getTime() - state.startedAt.getTime() - state.totalPausedMs;
}

function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
}
```

---

## Side Switching for Breast Feeding

```typescript
// Track which side and when
const sideHistory = [
  { side: 'left', startedAt: new Date('2024-01-10T14:00:00') },
  { side: 'right', startedAt: new Date('2024-01-10T14:08:00') },
];

// On stop, calculate:
// - Total duration: stop time - start time - paused time
// - End side: last item in sideHistory
// - Optional: time per side for insights
```

---

## Success Criteria

- [ ] Timer starts and displays elapsed time
- [ ] Pause/resume works correctly
- [ ] Side switching tracks history
- [ ] Stop creates feed log with correct data
- [ ] Timer persists if app closes
- [ ] Manual mode still available
- [ ] Amount estimation works for breast feeds
