---
last_verified_at: 2026-01-20T00:00:00Z
source_paths:
  - src/stores/useTimerStore.ts
  - src/lib/local-db/types/entities.ts
  - src/lib/local-db/helpers/ui-config.ts
---

# Timer State Persistence

## Purpose

Persistent timer state for activity tracking (feed, sleep, nappy) that survives page refreshes, tab closes, and app restarts. Timers are stored in IndexedDB via the UIConfig system.

## Architecture

### Storage Strategy

Timers are stored in **UIConfig.data.timers** (not as separate entities):

```typescript
type TimerState = {
  elapsedSeconds: number;        // Accumulated time when paused
  lastStartTime: string | null;  // ISO timestamp when started (null = paused)
  babyId: number;
  logType: 'feed' | 'sleep' | 'nappy';
};

type UIConfigData = {
  timers?: Record<string, TimerState>; // key: "feed-123", "sleep-456"
  // ... other UI config
};
```

**Key Pattern**: Timer key format is `${logType}-${babyId}` (e.g., `"feed-123"`).

### Why UIConfig, Not Separate Table?

- **User-scoped**: Timers are per-user preferences, not shared data
- **Fast hydration**: Single IndexedDB read loads all UI state including timers
- **Sync-friendly**: UIConfig has per-key LWW timestamps for conflict resolution
- **Minimal storage**: Only stores active timers (no history)

## State Management

**Location**: `src/stores/useTimerStore.ts`

### Zustand Store Structure

```typescript
type TimerStore = {
  timers: Record<string, TimerState>;  // In-memory cache
  isHydrated: boolean;                 // Hydration complete flag

  // Actions
  hydrate: (userId: number) => Promise<void>;
  getTimer: (key: string) => TimerState | undefined;
  getTotalElapsed: (key: string) => number;
  getActualStartTime: (key: string) => Date | null;
  startTimer: (key: string, babyId: number, logType) => Promise<void>;
  pauseTimer: (key: string) => Promise<void>;
  resetTimer: (key: string) => Promise<void>;
  adjustTimer: (key: string, seconds: number) => Promise<void>;
};
```

### Timer Calculation Logic

**Key Insight**: `elapsedSeconds` is the accumulated time when paused. When running, actual elapsed time is:

```typescript
getTotalElapsed: (key: string) => {
  const timer = get().timers[key];
  if (!timer) return 0;

  let totalElapsed = timer.elapsedSeconds;
  if (timer.lastStartTime) {
    // Timer is running, add current session time
    const lastStart = new Date(timer.lastStartTime).getTime();
    const now = Date.now();
    const sessionElapsed = Math.floor((now - lastStart) / 1000);
    totalElapsed += sessionElapsed;
  }
  return totalElapsed;
}
```

**Paused state**: `lastStartTime === null`
**Running state**: `lastStartTime` is ISO timestamp string

### Actual Start Time Reconstruction

```typescript
getActualStartTime: (key: string) => {
  const totalElapsed = get().getTotalElapsed(key);
  if (totalElapsed === 0) return null;

  // Work backwards from now
  return new Date(Date.now() - (totalElapsed * 1000));
}
```

**Use case**: When saving a feed log with timer, you need the original start time (not when you pressed "start" most recently, but accounting for all accumulated time).

## Persistence Flow

### 1. Hydration (On App Load)

```typescript
// Called by SyncProvider after user is loaded
const userId = useUserStore.getState().user?.localId;
await hydrateTimer(userId);

// Implementation:
hydrate: async (userId: number) => {
  const config = await getUIConfig(userId);
  const timers = (config.data.timers as Record<string, TimerState>) ?? {};
  set({ timers, isHydrated: true });
}
```

### 2. All Mutations Write to IndexedDB

**Pattern**: Every timer action updates Zustand AND IndexedDB:

```typescript
startTimer: async (key, babyId, logType) => {
  const newTimer: TimerState = {
    elapsedSeconds: currentTimer?.elapsedSeconds ?? 0,
    lastStartTime: new Date().toISOString(),
    babyId,
    logType,
  };

  const newTimers = { ...get().timers, [key]: newTimer };
  set({ timers: newTimers });

  // Persist to IndexedDB
  const userId = useUserStore.getState().user?.localId;
  if (userId) {
    await updateUIConfig(userId, { timers: newTimers });
  }
}
```

**Same pattern for**: `pauseTimer()`, `resetTimer()`, `adjustTimer()`.

### 3. Reset Deletes Timer from Record

```typescript
resetTimer: async (key: string) => {
  const { [key]: _, ...remainingTimers } = get().timers;
  set({ timers: remainingTimers });

  // Persist deletion
  await updateUIConfig(userId, { timers: remainingTimers });
}
```

**Effect**: Timer key is removed from the record (not set to zero).

## Integration with UIConfig Sync

**Critical**: UIConfig syncs to server, so timers sync across devices.

**Per-key LWW timestamps**: UIConfig has `keyUpdatedAt: Record<string, string>` for conflict resolution.

**Example**:
- Device A starts timer: `keyUpdatedAt['timers.feed-123'] = '2026-01-20T10:00:00Z'`
- Device B resets timer: `keyUpdatedAt['timers.feed-123'] = '2026-01-20T10:05:00Z'`
- Server merge: Device B wins (later timestamp)

**Gotcha**: If you pause on Device A and start on Device B simultaneously, Device B's state wins. This is acceptable for single-user baby tracking.

## Hydration Timing

**Wait-for-hydration pattern** in components:

```typescript
const isTimerHydrated = useTimerStore(s => s.isHydrated);

useEffect(() => {
  if (user?.localId && !isTimerHydrated) {
    hydrateTimer(user.localId);
  }
}, [user?.localId, isTimerHydrated, hydrateTimer]);

if (!isTimerHydrated) {
  return <LoadingSpinner />;
}
```

**Why**: Prevents race condition where component reads `timers: {}` before IndexedDB hydration completes.

## Timer Key Scoping

**Pattern**: `${logType}-${babyId}`

**Why per-baby timers**:
- Multiple babies can have independent timers
- Switching babies doesn't lose timer state
- Each baby's feed/sleep/nappy timers are separate

**Example**:
- Baby 1 (id=10): `feed-10`, `sleep-10`, `nappy-10`
- Baby 2 (id=20): `feed-20`, `sleep-20`, `nappy-20`

**Total possible timers**: `3 log types × N babies` (only stored if active).

## Cleanup Strategy

**Current**: Timers persist indefinitely until manually reset.

**Future consideration**: Auto-cleanup timers older than 48 hours (edge case: parent forgets to stop timer).

## Gotchas

- **No timer history**: Only current state is stored (not a log of all timer sessions)
- **Cross-device conflicts**: LWW means last write wins (acceptable trade-off)
- **Manual time zone handling**: All timestamps are ISO 8601 UTC
- **Store reads**: Subscribe to `timers` object, not individual timer (Zustand shallow equality)

## Related

- `chunks/local-first.ui-config-storage.md` - UIConfig storage system
- `chunks/local-first.store-hydration-pattern.md` - Hydration flow
- `chunks/feed-logging.timer-widget.md` - Timer UI component
- `chunks/feed-logging.timer-integration.md` - Integration with feed modal
