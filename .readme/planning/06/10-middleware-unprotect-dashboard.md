# Task 10: Update Middleware to Unprotect Dashboard Routes

**Status:** ✅ Complete (done in performance fix session)

## Goal

Remove dashboard page routes from Clerk protection while keeping API routes protected.

## What Was Done

Middleware now completely skips Clerk for dashboard routes (`/overview`, `/settings`, `/logs`, `/insights`).
Only API routes and auth pages go through Clerk.

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

## Why This Is Safe

1. Dashboard pages will only show data from IndexedDB
2. IndexedDB can only be populated through authenticated API calls
3. No server-side data fetching in page components
4. API routes remain fully protected

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
