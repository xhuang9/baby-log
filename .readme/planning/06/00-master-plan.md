# Offline-First Performance Plan

## Priority Shift (Updated)

**Primary Goal:** Performance (instant page transitions)
**Secondary Goal:** Offline capability (deferred)

| Priority | Description | Status |
|----------|-------------|--------|
| 1 | Instant page navigation (no server blocking) | ✅ Done |
| 2 | All data from IndexedDB (client-side reads) | ✅ Done |
| 3 | Server actions only on user interaction | ✅ Done |
| 4 | Clerk stays, doesn't block render | ✅ Current |
| 5 | Full offline support | 🔜 Deferred |

## Current Architecture

```
Page Load:
  Server → Render shell (instant, SSG) → Client hydration → IndexedDB read → UI update

User Action:
  Click/Submit → Server action (async) → Update IndexedDB → UI update
```

## Completed Work

### Phase 1: Config Fixes
- ✅ Manifest start_url
- ✅ PWA env toggle
- ✅ Offline fallback config
- ✅ PWA types
- ✅ Import offline auth SW
- ✅ IndexedDB version alignment

### Phase 1.5: Performance Fixes (Server Blocking Removed)

| Component | Before | After |
|-----------|--------|-------|
| `src/proxy.ts` | Ran Clerk for all dashboard routes | Skips Clerk for dashboard |
| `overview/page.tsx` | `await auth()` + DB query | Shell only |
| `settings/page.tsx` | `await auth()` + DB query | Shell only |
| `settings/babies/page.tsx` | `await auth()` + DB query | Shell only |
| `settings/babies/[babyId]/page.tsx` | `await auth()` + DB query | Shell only |
| `AppSidebar.tsx` | `getUserBabies()` server action | `useLiveQuery` from IndexedDB |
| `SettingsContent.tsx` | Received babies as props | `useLiveQuery` from IndexedDB |
| `BabiesManagement.tsx` | Received babies as props | `useLiveQuery` from IndexedDB |
| `OverviewContent.tsx` | Received babyId from server | Reads from IndexedDB |

### Current Page Architecture

All dashboard pages are now **instant-loading shells**:

```typescript
// Pattern for all dashboard pages
export default async function Page(props) {
  const { locale } = await props.params;  // Only this await (required by Next.js)

  return (
    <>
      <PageTitleSetter title="..." />
      <ClientComponent locale={locale} />  // Reads from IndexedDB
    </>
  );
}
```

## Remaining Work (Deferred)

### For Full Offline Support (Future)

| Task | Description | Priority |
|------|-------------|----------|
| Clerk offline fallback | Replace Clerk components with local fallback when offline | Low |
| RSC offline handling | Intercept RSC requests when offline | Low |
| Sync conflict resolution | Handle merge conflicts when syncing | Low |

### Clerk Components Still Active

These use Clerk client hooks but don't block render:

| Component | Usage | Impact |
|-----------|-------|--------|
| `SettingsContent.tsx` | `useUser()`, `<UserAvatar />` | Shows user info when online |
| `AppHeader.tsx` | `<UserButton />` | Shows user button when online |
| `SyncProvider.tsx` | `useAuth()` | Controls background sync |

**Note:** These are fine for performance - they render progressively after hydration.

## Verification Checklist

Run after changes:

```bash
pnpm build && pnpm start
```

Test:
1. Navigate between pages - should be instant
2. Check Network tab - no blocking requests on navigation
3. Data loads from IndexedDB (check Application → IndexedDB)
4. Server actions only fire on user interaction

## Files Reference

**Pages (all instant-loading shells):**
- `src/app/[locale]/(auth)/(app)/overview/page.tsx`
- `src/app/[locale]/(auth)/(app)/logs/page.tsx`
- `src/app/[locale]/(auth)/(app)/insights/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/page.tsx`
- `src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/page.tsx`

**Client components (IndexedDB reads):**
- `OverviewContent.tsx` - reads feedLogs, user
- `SettingsContent.tsx` - reads babies, babyAccess
- `BabiesManagement.tsx` - reads babies, babyAccess, user
- `EditBabyContent.tsx` - reads baby by ID
- `AppSidebar.tsx` - reads babies for switcher
