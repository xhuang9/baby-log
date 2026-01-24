# Phase 4: Integration

## Goal

Wire up existing code to use the new notification APIs and route background events to system notifications.

---

## Dependencies

- All Phase 1-3 tasks must be complete

---

## Files to Modify

### 1. `src/hooks/useSyncScheduler.ts`

**Current behavior:** Shows `toast.error()` for sync failures
**New behavior:** Log to system notifications (no toast)

```typescript
// Before
import { toast } from 'sonner';

// ... in error handler
toast.error('Sync failed');

// After
import { systemNotifications } from '@/lib/notify';

// ... in error handler
systemNotifications.syncFailed(localUser.id, error.message);
// Remove the toast.error call
```

### 2. `src/hooks/useAccessRevocationDetection.ts`

**Current behavior:** Shows `toast.error()` + modal
**New behavior:** Keep toast + modal, ADD log entry

```typescript
// Before
import { toast } from 'sonner';

// ... when access revoked
toast.error('Access revoked');
// show modal

// After
import { notifyToast, systemNotifications } from '@/lib/notify';

// ... when access revoked
notifyToast.error('Access revoked'); // Keep toast (user needs immediate feedback)
systemNotifications.accessRevoked(localUser.id, baby.name, baby.id); // Add log entry
// keep modal as-is
```

### 3. `src/contexts/LogoutContext.tsx`

**Current behavior:** Shows toast on logout sync completion/failure
**New behavior:** Keep as-is (user-initiated action deserves feedback)

```typescript
// No changes needed - logout is user-initiated
// Keep existing toast.success/error calls
// Just update imports if using notifyToast wrapper

import { notifyToast } from '@/lib/notify';

// Replace toast.* with notifyToast.*
notifyToast.success('Signed out');
notifyToast.error('Failed to sign out');
```

### 4. Settings & Form Components

Replace direct `toast.*` calls with `notifyToast.*` wrapper:

**Files to update:**
- `src/hooks/useWidgetSettings.ts`
- `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/share/_components/PendingInvitesSection.tsx`
- Other settings components using toast

```typescript
// Before
import { toast } from 'sonner';
toast.success('Settings saved');

// After
import { notifyToast } from '@/lib/notify';
notifyToast.success('Settings saved');
```

### 5. Operations Layer (Optional)

If there are operations in `src/services/operations/` that use toast directly:

```typescript
// Before
import { toast } from 'sonner';

export async function saveFeed(...) {
  // ...
  toast.success('Feed saved');
}

// After
import { notifyToast } from '@/lib/notify';

export async function saveFeed(...) {
  // ...
  notifyToast.success('Feed saved');
}
```

---

## Search Commands

Find all files using toast directly:

```bash
# Find direct toast imports
grep -r "from 'sonner'" src/ --include="*.ts" --include="*.tsx" | grep -v "components/ui/sonner"

# Find toast.* calls
grep -r "toast\." src/ --include="*.ts" --include="*.tsx"
```

---

## Migration Checklist

### Background Events (Route to System Log)
- [ ] `useSyncScheduler.ts` - sync failures
- [ ] `useSyncScheduler.ts` - sync success (optional - can skip low-signal events)
- [ ] Conflict resolution handlers
- [ ] Offline/online transition handlers

### User-Initiated Events (Keep Toast, Use Wrapper)
- [ ] `LogoutContext.tsx` - logout completion
- [ ] `useAccessRevocationDetection.ts` - access revoked (toast + log)
- [ ] Settings save confirmations
- [ ] Form submission feedback
- [ ] Delete confirmations

### No Changes Needed
- [ ] Components that already don't use toast
- [ ] Pure UI components

---

## Reset Store on Logout

Update logout cleanup to reset notification store:

### `src/contexts/LogoutContext.tsx` or `src/lib/auth/cleanup.ts`

```typescript
import { useNotificationStore } from '@/stores/useNotificationStore';

async function signOutCleanup() {
  // ... existing cleanup

  // Reset notification store
  useNotificationStore.getState().reset();

  // ... rest of cleanup
}
```

---

## Verification

1. Run `npm run typecheck` - no type errors
2. Run `npm run lint` - no lint errors

### Test Background Events
3. Disconnect network, trigger sync
4. Verify NO toast appears
5. Check notification bell has dot
6. Open notifications page, verify sync failure logged

### Test User-Initiated Events
7. Save settings
8. Verify toast appears for 3s
9. Trigger access revocation
10. Verify both toast AND log entry appear

### Test Logout
11. Log out
12. Verify cleanup toast appears
13. Log back in
14. Verify notification store is empty (not persisting from previous session)

---

## Status

⏳ Pending
