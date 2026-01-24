---
last_verified_at: 2026-01-24T00:00:00Z
source_paths:
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
  - src/lib/local-db/helpers/session-validation.ts
  - src/lib/local-db/index.ts
---

# User Switch Detection & Data Isolation

## Purpose
Prevents user data conflicts when different users log in on the same device by validating cached session against current Clerk user and clearing stale data on user switch.

## Problem Solved
In a local-first architecture with IndexedDB caching, if User A logs out and User B logs in on the same device, User B could potentially see User A's cached data. This is a **critical security issue** that violates user data isolation.

## Implementation

### Location
`src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` (lines 373-396)

### Flow
1. **Before Bootstrap**: Check if cached session exists in IndexedDB
2. **Validate User**: Compare cached `clerkId` with current `useUser().id` from Clerk
3. **User Switch Detected**: If mismatch found
   - Log the detection and new user ID
   - Call `clearAllLocalData()` to wipe all IndexedDB tables (11 tables)
   - Clear sessionStorage keys for Zustand stores:
     - `baby-log:user`
     - `baby-log:active-baby`
     - `baby-log:all-babies`
     - `baby-log:init-step`
4. **Continue Bootstrap**: Proceed with normal bootstrap flow

### Key Functions

```typescript
// From @/lib/local-db
import { validateSessionForUser, clearAllLocalData } from '@/lib/local-db';

// Usage in useBootstrapMachine
if (clerkUser?.id) {
  const valid = await validateSessionForUser(clerkUser.id);

  if (!valid) {
    // User switch detected
    await clearAllLocalData();
    sessionStorage.removeItem('baby-log:user');
    sessionStorage.removeItem('baby-log:active-baby');
    sessionStorage.removeItem('baby-log:all-babies');
    sessionStorage.removeItem('baby-log:init-step');
  }
}
```

### Session Storage Table
`authSessions` table in IndexedDB stores:
- `userId` (numeric ID)
- `clerkId` (Clerk user ID)
- `lastValidatedAt` (timestamp)

## Error Handling
- **Non-fatal**: Validation errors don't block bootstrap
- **Logging**: All switches are logged to console for debugging
- **Graceful Fallback**: If validation fails, bootstrap continues (security vs availability tradeoff)

## Testing Implications
Test scenarios:
1. **Same user re-login**: Session valid, no data cleared
2. **Different user login**: Session invalid, all data cleared
3. **Offline re-login**: Validation skipped (can't verify without network)
4. **First-time login**: No cached session, validation skipped

## Security Guarantees
- **User A logs out, User B logs in**: User B gets fresh data (User A's data cleared)
- **User A stays logged in, refreshes page**: User A keeps cached data (same session)
- **No network on login**: Falls back to server bootstrap (offline first-time login requires network)

## Related
- Bootstrap flow: `.readme/chunks/account.bootstrap-unified-flow.md`
- Local data storage: `.readme/chunks/local-first.dexie-schema.md`
- Logout cleanup: `.readme/chunks/auth.logout-confirmation-system.md`
