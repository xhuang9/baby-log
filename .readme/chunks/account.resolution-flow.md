---
last_verified_at: 2026-01-06T00:30:00Z
source_paths:
  - src/actions/babyActions.ts
  - src/app/[locale]/(auth)/account/resolve/page.tsx
  - src/app/[locale]/(auth)/account/resolve/ResolveAccountClient.tsx
  - src/app/[locale]/(auth)/layout.tsx
---

# Account Resolution Flow

## Purpose
Custom post-authentication entry point that analyzes user state and routes to appropriate next step. Replaces standard Clerk fallback redirect with intelligent decision tree.

## Key Deviations from Standard
Unlike typical Clerk integration that redirects directly to dashboard after auth, this system:
- **Mandatory resolution step**: All auth flows go through `/account/resolve`
- **Decision tree routing**: Server-side logic determines next step based on database state
- **Database synchronization**: Upserts Clerk user into local DB on every auth event
- **Client-side state initialization**: Populates Zustand stores with user and baby context

## Implementation

### Entry Point Configuration
**Location:** `src/app/[locale]/(auth)/layout.tsx`

```tsx
<ClerkProvider
  signInFallbackRedirectUrl="/account/resolve"
  signUpFallbackRedirectUrl="/account/resolve"
>
```

Both sign-in and sign-up redirect to the same resolution endpoint - the decision tree determines what happens next.

### Resolution Decision Tree
**Location:** `src/actions/babyActions.ts` → `resolveAccountContext()`

**Flow:**
```
1. Upsert user from Clerk → local DB
   ↓
2. Check: user.locked === true?
   YES → nextStep: { type: 'locked' } → /account/locked
   NO → continue
   ↓
3. Query baby_access to find all accessible babies
   ↓
4. Check: No babies AND no pending invites?
   YES → nextStep: { type: 'onboarding' } → /account/onboarding/baby
   NO → continue
   ↓
5. Check: No babies BUT pending invites exist?
   YES → nextStep: { type: 'shared', invites: [...] } → /account/shared
   NO → continue
   ↓
6. Check: user.defaultBabyId is valid and in baby_access?
   YES → nextStep: { type: 'dashboard', baby: {...} } → /dashboard
   NO → continue
   ↓
7. Auto-select default baby using priority:
   a) Most recent baby_access.lastAccessedAt
   b) First baby in access list
   ↓
8. Update user.defaultBabyId in database
   ↓
9. nextStep: { type: 'dashboard', baby: {...} } → /dashboard
```

### Default Baby Selection Rules
When `user.defaultBabyId` is NULL or invalid, the system auto-selects using this priority:

1. **Most recently accessed**: `baby_access.lastAccessedAt DESC`
2. **Fallback**: First baby in `baby_access` by ID

This prevents the user from getting stuck without a default baby.

### Client-Side Resolution
**Location:** `src/app/[locale]/(auth)/account/resolve/ResolveAccountClient.tsx`

**Features:**
- Animated loading states with status messages
- Calls `resolveAccountContext()` server action on mount
- Initializes Zustand stores with returned user/baby data
- Redirects based on `nextStep.type`

**Status Messages:**
```tsx
const statusMessages = [
  "Initiating your account...",
  "Loading your baby details...",
  "Checking shared access...",
  "Preparing your default baby...",
];
```

## Patterns

### Return Type Structure
```typescript
type ResolveAccountResult = {
  success: true;
  user: StoredUser;
  nextStep:
    | { type: 'locked' }
    | { type: 'requestAccess' }
    | { type: 'shared'; invites: Array<...> }
    | { type: 'onboarding' }
    | { type: 'select'; babies: Array<...> }
    | { type: 'dashboard'; baby: ActiveBaby };
} | {
  success: false;
  error: string;
};
```

This discriminated union allows the client to handle each state with type safety.

### Database Upsert Pattern
```typescript
const userResult = await db
  .insert(userSchema)
  .values({ clerkId, email, firstName })
  .onConflictDoUpdate({
    target: userSchema.clerkId,
    set: { email, firstName, updatedAt: new Date() },
  })
  .returning();
```

Every auth event ensures local user record is synchronized with Clerk state.

## Gotchas

### Infinite Redirect Loop Prevention
- The resolution logic MUST always return a valid `nextStep`
- If no babies and no invites → onboarding (not dashboard)
- If invalid default baby → auto-select or redirect to select-baby
- Never redirect back to `/account/resolve` from another account page

### Archived Babies
Archived babies (`archivedAt IS NOT NULL`) are excluded from all queries:
```typescript
where(
  and(
    eq(babyAccessSchema.userId, localUser.id),
    sql`${babiesSchema.archivedAt} IS NULL`
  )
)
```

This prevents deleted babies from appearing in resolution flow.

### Race Conditions
Resolution runs on **every page load** if user visits `/account/resolve` directly. The client component uses `useEffect` with empty deps to run once, but if resolution is slow, user may see stale state.

**Mitigation:** The client shows loading states and doesn't allow interaction until resolution completes.

## Related
- `.readme/chunks/account.baby-multi-tenancy.md` - Baby access control and default selection
- `.readme/chunks/auth.post-auth-flow.md` - Previous post-auth implementation (now superseded)
- `.readme/chunks/account.state-sync-pattern.md` - Zustand store initialization after resolution
