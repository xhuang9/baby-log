# Task 10: Update Middleware to Unprotect Dashboard Routes

**Status:** ❌ REVERTED - Architecture Changed

## Goal (Historical)

Remove dashboard page routes from Clerk protection while keeping API routes protected.

## What Changed

This approach was **REVERTED**. As of 2026-01-18, all app routes now require Clerk middleware authentication.

See `src/proxy.ts` - all dashboard routes are back in the `isProtectedRoute` matcher:
- `/overview(.*)`
- `/logs(.*)`
- `/insights(.*)`
- `/settings(.*)`
- `/account(.*)`

The project shifted from "offline-first with auth bypass" to "local-first with required auth".

## File to Edit

`src/proxy.ts`

## Change

Update `isProtectedRoute` matcher (lines 11-26):

```typescript
const isProtectedRoute = createRouteMatcher([
  // Dashboard pages - REMOVED (now public)
  // '/overview(.*)',
  // '/:locale/overview(.*)',
  // '/settings(.*)',
  // '/:locale/settings(.*)',
  // '/logs(.*)',
  // '/:locale/logs(.*)',
  // '/insights(.*)',
  // '/:locale/insights(.*)',

  // Bootstrap flow - KEEP (requires auth to get initial data)
  '/account(.*)',
  '/:locale/account(.*)',

  // API routes - KEEP (data access requires auth)
  '/api/bootstrap(.*)',
  '/:locale/api/bootstrap(.*)',
  '/api/sync(.*)',
  '/:locale/api/sync(.*)',
  '/api/user(.*)',
  '/:locale/api/user(.*)',
]);
```

## Checklist

- [ ] Open `src/proxy.ts`
- [ ] Comment out or remove dashboard routes from `isProtectedRoute`
- [ ] Keep API routes and `/account` protected
- [ ] Verify `/api/sync/*` routes are still listed

## Why This Was Reverted

The original offline-first approach had complications:
1. Server actions on pages require `auth()` from Clerk
2. Simplified security model - consistent auth boundary
3. Service worker can still cache pages for performance
4. IndexedDB remains for data caching, just not auth bypass

## Validation

```bash
# After change, these should NOT redirect to sign-in:
curl -I http://localhost:3000/en/overview  # Should return 200

# These should still redirect to sign-in:
curl -I http://localhost:3000/en/account/bootstrap  # Should redirect
curl -I http://localhost:3000/api/sync/pull  # Should return 401
```

## Notes

- This task should be done AFTER Task 11 (IndexedDbGuard) is ready
- Or pages will show empty/broken UI for unauthenticated users
- Consider doing Tasks 10-11 together in one session
