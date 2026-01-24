---
last_verified_at: 2026-01-24T00:00:00Z
source_paths:
  - src/contexts/LogoutContext.tsx
  - src/components/auth/LogoutConfirmationDialog.tsx
  - src/components/auth/SignOutButton.tsx
  - src/app/[locale]/(auth)/auth-layout-content.tsx
  - src/app/[locale]/(auth)/layout.tsx
  - src/services/operations/auth.ts
---

# Logout Confirmation System

## Purpose
Prevents accidental data loss by checking for unsynced changes before logout and offering users options to sync, logout anyway, or cancel.

## Problem Solved
In a local-first architecture, users can create/edit data offline. If they logout without syncing, all pending changes in the IndexedDB outbox are **permanently lost**. This system alerts users and provides sync options.

## Architecture

### Context-based Design
Uses React Context API for centralized logout orchestration across the app:

```
LogoutProvider (auth layout)
  ├─► SignOutButton (manual logout)
  ├─► auth-layout-content (intercepts Clerk's UserButton signOut)
  └─► LogoutConfirmationDialog (UI)
```

### File Structure
1. **Context Provider**: `src/contexts/LogoutContext.tsx`
   - Manages dialog state, pending change detection, sync orchestration
   - Exports `useLogout()` hook with `requestLogout()` method

2. **Dialog Component**: `src/components/auth/LogoutConfirmationDialog.tsx`
   - AlertDialog UI with conditional messaging (online/offline)
   - Three actions: Cancel, Logout Anyway, Sync and Logout

3. **Integration Points**:
   - `SignOutButton.tsx`: Manual logout button
   - `auth-layout-content.tsx`: Intercepts Clerk's built-in UserButton signOut
   - `layout.tsx`: Wraps children with `<LogoutProvider>`

4. **Cleanup Operation**: `src/services/operations/auth.ts`
   - `signOutCleanup()`: Clears IndexedDB + Zustand + sessionStorage

## Flow Diagram

### Happy Path (No Pending Changes)
```
User clicks logout
  → requestLogout() checks outbox
  → 0 pending entries
  → signOutCleanup() runs
  → clerk.signOut() executes
  → User logged out
```

### With Pending Changes (Online)
```
User clicks logout
  → requestLogout() checks outbox
  → N pending entries found
  → Dialog shows: "You have N pending changes"
  → User chooses:
     ├─► Cancel → Dialog closes, logout aborted
     ├─► Logout Anyway → signOutCleanup() → clerk.signOut()
     └─► Sync and Logout → flushOutbox()
           ├─► Success → Toast "Synced N changes" → signOutCleanup() → clerk.signOut()
           └─► Failure → Toast error, dialog stays open (retry or logout anyway)
```

### With Pending Changes (Offline)
```
User clicks logout
  → requestLogout() checks outbox
  → N pending entries found
  → Dialog shows: "N changes can't sync while offline"
  → User chooses:
     ├─► Cancel → Dialog closes, logout aborted
     └─► Logout Anyway → signOutCleanup() → clerk.signOut()
```

## Key Functions

### `requestLogout()` (LogoutContext)
```typescript
const requestLogout = async (): Promise<boolean> => {
  const pending = await getPendingOutboxEntries();

  if (pending.length === 0) {
    // No pending changes - proceed directly
    await signOutCleanup();
    return true;
  }

  // Show dialog and wait for user choice
  setPendingCount(pending.length);
  setShowDialog(true);

  return new Promise((resolve) => {
    setResolveLogout(() => resolve);
  });
};
```

### `signOutCleanup()` (auth operations)
```typescript
export async function signOutCleanup(): Promise<OperationResult<void>> {
  // 1. Clear all IndexedDB data (11 tables)
  await clearAllLocalData();

  // 2. Clear Zustand stores (also clears sessionStorage)
  useUserStore.getState().clearUser();
  useBabyStore.getState().clearActiveBaby();

  // 3. Clear additional sessionStorage keys
  sessionStorage.removeItem('baby-log:init-step');

  return success(undefined);
}
```

## Sync Handling

### `handleSyncAndLogout()` (LogoutContext)
```typescript
const handleSyncAndLogout = async () => {
  setIsSyncing(true);
  const result = await flushOutbox();
  setIsSyncing(false);

  if (result.success) {
    toast.success(`Synced ${result.changesApplied} changes`);
    await signOutCleanup();
    resolveLogout(true);
  } else {
    if (result.errorType === 'access_revoked') {
      // Data already cleared by flushOutbox
      toast.error('Access revoked - pending changes cleared');
      await signOutCleanup();
      resolveLogout(true);
    } else {
      // Network error - keep dialog open
      toast.error(`Sync failed: ${result.error}. Try again or logout anyway.`);
    }
  }
};
```

## Intercepting Clerk's UserButton

### Problem
Clerk's `<UserButton>` component has built-in signOut that bypasses our confirmation logic.

### Solution
Wrap `clerk.signOut` in `auth-layout-content.tsx`:

```typescript
useEffect(() => {
  const originalSignOut = clerk.signOut.bind(clerk);

  clerk.signOut = (async (options?: any) => {
    const shouldProceed = await requestLogout();

    if (shouldProceed) {
      return originalSignOut(options);
    }
  }) as typeof clerk.signOut;

  return () => {
    clerk.signOut = originalSignOut;
  };
}, [clerk, requestLogout]);
```

## UX Design Decisions

### Online Mode
- **3 buttons**: Cancel, Logout Anyway, Sync and Logout (primary)
- **Messaging**: "N pending changes that haven't synced to the server yet"
- **Primary action**: Sync and Logout (encourages data safety)

### Offline Mode
- **2 buttons**: Cancel, Logout Anyway (destructive)
- **Messaging**: "N pending changes that can't sync while offline. Logging out will lose these changes permanently."
- **No sync option**: Can't sync while offline

### Emergency Logout
- **Never blocks**: "Logout Anyway" always works
- **Non-fatal errors**: Sync failures don't prevent logout
- **Security priority**: User can always logout (account security > data persistence)

## Dependencies
- **Outbox Detection**: `getPendingOutboxEntries()` from `@/lib/local-db`
- **Sync Service**: `flushOutbox()` from `@/services/sync`
- **Network Status**: `useOnlineStatus()` hook
- **UI**: shadcn/ui AlertDialog component
- **Notifications**: `sonner` toast library

## Testing Scenarios
1. **0 pending changes**: Logout immediately (no dialog)
2. **N pending changes (online)**: Show dialog, sync works
3. **N pending changes (offline)**: Show dialog, no sync option
4. **Sync failure (network)**: Dialog stays open, user can retry
5. **Sync failure (access revoked)**: Auto-logout with toast
6. **User clicks Cancel**: Logout aborted, user stays logged in
7. **Clerk UserButton logout**: Intercepted and goes through confirmation

## Related
- Outbox pattern: `.readme/chunks/local-first.outbox-pattern.md`
- Sync operations: `.readme/chunks/local-first.delta-sync-client.md`
- Access revocation: `.readme/chunks/local-first.access-revocation-handling.md`
- User switch detection: `.readme/chunks/auth.user-switch-detection.md`
