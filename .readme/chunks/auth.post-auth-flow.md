---
last_verified_at: 2026-01-08T08:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(center)/post-auth/page.tsx (removed)
  - src/app/[locale]/(auth)/(center)/post-auth/PostAuthClient.tsx (removed)
  - src/app/[locale]/(auth)/layout.tsx
  - src/stores/useUserStore.ts
  - src/models/Schema.ts
---

# Post-Authentication Flow (Legacy)

**📚 HISTORICAL DOCUMENTATION**: This documents the legacy post-auth implementation that was replaced by the account resolution flow. The `/post-auth` route and related files have been removed. See `.readme/chunks/account.resolution-flow.md` for current implementation.

**Purpose of this document**: Provides migration context and historical reference for understanding the evolution from simple user sync to the current account/baby resolution system.

## Purpose
Custom post-authentication workflow that syncs Clerk user data to local database and initializes client-side state before redirecting to dashboard.

## Key Deviations from Standard
- Clerk fallback redirects point to `/post-auth` instead of `/dashboard`
- Server-side database upsert happens on every sign-in/sign-up
- User data stored in both sessionStorage and Zustand for client access
- Two-phase redirect: Clerk → post-auth → dashboard

## Implementation

### Phase 1: Clerk Redirect Configuration
**File:** `src/app/[locale]/(auth)/layout.tsx`

```typescript
<ClerkProvider
  signInFallbackRedirectUrl={postAuthUrl}  // /post-auth (not /dashboard)
  signUpFallbackRedirectUrl={postAuthUrl}
  // ...
>
```

After successful authentication, Clerk redirects to `/post-auth` instead of dashboard.

### Phase 2: Server-Side User Sync
**File:** `src/app/[locale]/(auth)/(center)/post-auth/page.tsx`

This server component runs once per login:

```typescript
export default async function PostAuthPage() {
  // 1. Get Clerk user ID from session
  const { userId } = await auth();

  // 2. Fetch full user from Clerk API
  const clerk = await clerkClient();
  const clerkUser = await clerk.users.getUser(userId);

  // 3. Upsert to local database
  await db
    .insert(userSchema)
    .values({
      clerkId: clerkUser.id,
      email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
      firstName: clerkUser.firstName ?? null,
    })
    .onConflictDoUpdate({
      target: userSchema.clerkId,
      set: { /* same fields */ },
    });

  // 4. Prepare trimmed payload for client
  const userPayload = {
    id: clerkUser.id,
    firstName: clerkUser.firstName ?? null,
    email: clerkUser.primaryEmailAddress?.emailAddress ?? null,
    imageUrl: clerkUser.imageUrl,
  };

  // 5. Pass to client component
  return <PostAuthClient user={userPayload} redirectTo="/dashboard" />;
}
```

**Key behaviors:**
- `export const dynamic = 'force-dynamic'` - Ensures fresh server execution per request
- Uses `onConflictDoUpdate` to handle both first-time and returning users
- Only stores minimal fields: `clerkId`, `email`, `firstName`

### Phase 3: Client-Side State Initialization
**File:** `src/app/[locale]/(auth)/(center)/post-auth/PostAuthClient.tsx`

This client component initializes browser state:

```typescript
'use client';

export function PostAuthClient({ user, redirectTo }) {
  const setUser = useUserStore(state => state.setUser);
  const router = useRouter();

  useEffect(() => {
    // 1. Write to Zustand store (global client state)
    setUser(user);

    // 2. Write to sessionStorage (persistence across page reloads)
    sessionStorage.setItem('baby-log:user', JSON.stringify(user));

    // 3. Redirect to dashboard
    router.replace(redirectTo);
  }, [redirectTo, router, setUser, user]);

  return <div>Setting up your account...</div>;
}
```

## Data Flow

### User Payload Schema
```typescript
type StoredUser = {
  id: string; // Clerk user ID
  firstName: string | null;
  email: string | null;
  imageUrl: string; // Clerk profile image URL
};
```

### Storage Locations
1. **PostgreSQL** (`user` table via DrizzleORM)
   - `clerk_id` (unique, indexed)
   - `email`
   - `first_name`

2. **sessionStorage** (key: `baby-log:user`)
   - Full `StoredUser` payload as JSON
   - Survives page reloads
   - Cleared on tab close

3. **Zustand** (`useUserStore`)
   - In-memory global state
   - Accessible via `const user = useUserStore(state => state.user)`

## Patterns

### Accessing User Data in Components
```typescript
import { useUserStore } from '@/stores/useUserStore';

function MyComponent() {
  const user = useUserStore(state => state.user);

  if (!user) return null; // Not yet loaded

  return <div>Hello, {user.firstName}!</div>;
}
```

### Restoring User on Page Reload
```typescript
'use client';

useEffect(() => {
  const stored = sessionStorage.getItem('baby-log:user');
  if (stored) {
    const user = JSON.parse(stored);
    setUser(user);
  }
}, []);
```

### Clearing User State on Sign-Out
```typescript
import { useUserStore } from '@/stores/useUserStore';

function handleSignOut() {
  const clearUser = useUserStore.getState().clearUser;
  clearUser();
  sessionStorage.removeItem('baby-log:user');
}
```

## Why This Pattern?

### Benefits
1. **Local Database Sync**: User data available for queries without Clerk API calls
2. **Client-Side Performance**: No need to fetch user data on every page load
3. **Offline Capability**: User info persists in sessionStorage
4. **Type Safety**: Single source of truth for user payload shape

### Tradeoffs
- Extra redirect adds ~200ms to auth flow
- User data can become stale if changed in Clerk dashboard (next login syncs)
- sessionStorage cleared on tab close (intentional for security)

## Gotchas / Constraints

- `/post-auth` must be in `(center)` route group for centered layout
- Server component marked `force-dynamic` to prevent caching
- User data not available in server components (use Clerk's `currentUser()` instead)
- sessionStorage only available in browser (not SSR)
- Zustand store resets on full page refresh (restored from sessionStorage)

## Related Systems
- `.readme/chunks/auth.clerk-layout-pattern.md` - Clerk provider configuration
- `.readme/chunks/database.schema-workflow.md` - Database schema definition
- `.readme/chunks/architecture.route-structure.md` - Route group organization
