---
last_verified_at: 2026-01-12T00:00:00Z
source_paths:
  - src/components/sync/OfflineBanner.tsx
  - src/hooks/useOnlineStatus.ts
---

# Offline Banner Component and Online Status Tracking

## Purpose
Documents the offline banner UI component and the online status hook that provides reactive network status updates.

## Offline Banner Component

**Location**: `src/components/sync/OfflineBanner.tsx`

A fixed-position banner that displays when the user is offline or using stale cached data.

### Props

```typescript
type OfflineBannerProps = {
  lastSyncedAt?: Date | null;  // When data was last synced
  onSync?: () => void;          // Callback to trigger manual sync
  dismissible?: boolean;        // Allow user to dismiss (default: true)
};
```

### Behavior

**Offline State**:
- Shows amber banner with cloud-off icon
- Displays "You're offline"
- Shows last sync time if available (e.g., "synced 2 hours ago")
- Dismissible via X button (if `dismissible={true}`)

**Back Online State**:
- Shows green banner with refresh icon
- Displays "Back online"
- Shows "Sync now" button (if `onSync` provided)
- Auto-dismisses after 3 seconds

**Online State**:
- Banner is hidden

### Usage Examples

**Basic offline indicator**:
```tsx
<OfflineBanner lastSyncedAt={new Date()} />
```

**With manual sync trigger**:
```tsx
<OfflineBanner
  lastSyncedAt={lastSyncedAt}
  onSync={() => {
    // Trigger manual sync
    refetch();
  }}
/>
```

**Non-dismissible** (for critical warnings):
```tsx
<OfflineBanner
  lastSyncedAt={lastSyncedAt}
  dismissible={false}
/>
```

## Online Status Hook

**Location**: `src/hooks/useOnlineStatus.ts`

Provides reactive tracking of browser's online/offline status using `useSyncExternalStore`.

### Implementation

Uses a subscription pattern to listen to `window.online` and `window.offline` events:

```typescript
export function useOnlineStatus(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
```

**Key Features**:
- SSR-safe (assumes online on server)
- Zero re-renders when not subscribed
- Properly cleans up event listeners
- Shares listener across all hook instances

### Usage

**Basic online check**:
```tsx
const isOnline = useOnlineStatus();

return (
  <div>
    {isOnline ? '✅ Online' : '⚠️ Offline'}
  </div>
);
```

**With callbacks on status change**:
```tsx
useOnlineStatusChange(
  () => console.log('Back online'),
  () => console.log('Gone offline'),
);
```

## Integration with Bootstrap Machine

The bootstrap machine uses online status to determine sync strategy:

```typescript
// In useBootstrapMachine.ts
const isOnline = typeof navigator !== 'undefined' ? navigator.onLine : true;

if (!isOnline) {
  // Check local data
  const { hasData, lastSyncedAt } = await checkLocalData();

  if (hasData && lastSyncedAt) {
    dispatch({ type: 'USE_LOCAL_DATA', lastSyncedAt });
  } else {
    dispatch({
      type: 'SYNC_ERROR',
      error: 'You need an internet connection to sign in for the first time.',
      canRetry: true,
    });
  }
  return;
}
```

## Offline Banner in Bootstrap Flow

The bootstrap page shows the offline banner when using cached data:

```tsx
case 'offline_ok':
  return (
    <BootstrapOffline
      lastSyncedAt={state.lastSyncedAt}
      onRetry={retry}
    />
  );
```

The `BootstrapOffline` state component renders:
- Informational message about using cached data
- `OfflineBanner` component
- Retry button to attempt reconnection

## Time Formatting

The banner includes a helper to format last sync time in human-readable format:

```typescript
const formatLastSync = (date: Date) => {
  const diffMins = Math.floor((now - date) / (1000 * 60));
  const diffHours = Math.floor((now - date) / (1000 * 60 * 60));
  const diffDays = Math.floor((now - date) / (1000 * 60 * 60 * 24));

  if (diffMins < 1) return 'just now';
  if (diffMins < 60) return `${diffMins} min${diffMins === 1 ? '' : 's'} ago`;
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`;
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`;
};
```

## Styling

The banner uses:
- Fixed positioning at bottom-right on desktop, full-width on mobile
- Amber background for offline, green for reconnected
- Tailwind animation classes for smooth entry
- `animate-in fade-in slide-in-from-bottom-4`

## When to Read This

- Implementing offline indicators in the UI
- Adding manual sync triggers
- Debugging online/offline event handling
- Understanding how stale data is communicated to users
- Working with network-aware UI patterns

## Related Chunks

- `.readme/chunks/account.bootstrap-unified-flow.md` - How offline state is determined
- `.readme/chunks/local-first.bootstrap-storage.md` - What "last synced" means
- `.readme/chunks/performance.pwa-configuration.md` - PWA offline support
