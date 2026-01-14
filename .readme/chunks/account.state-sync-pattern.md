---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - src/stores/useUserStore.ts
  - src/stores/useBabyStore.ts
  - src/components/auth/SignOutButton.tsx
  - src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts
---

# SessionStorage State Sync Pattern

## Purpose
Zustand stores that automatically synchronize with sessionStorage for PWA-safe, session-scoped client state management. Provides persistence across page refreshes without violating PWA best practices.

## Key Deviations from Standard
Unlike typical Zustand or React state patterns, this implementation:
- **Automatic sessionStorage sync**: Every state update writes to sessionStorage
- **No localStorage**: Deliberately avoids localStorage to prevent cross-session data leakage
- **No cookies for client state**: PII is never stored in cookies (only Clerk auth cookies)
- **Manual cleanup on sign-out**: Custom SignOutButton explicitly clears stores
- **Session-scoped**: State disappears when browser tab closes (sessionStorage behavior)

This is critical for PWA compliance and prevents "wrong account login" issues where previous user's data persists.

## Implementation

### User Store
**Location:** `src/stores/useUserStore.ts`

```typescript
export type StoredUser = {
  id: string;           // Clerk user ID
  localId: number;      // Local database user.id
  firstName: string | null;
  email: string | null;
  imageUrl: string;
};

type UserStore = {
  user: StoredUser | null;
  setUser: (user: StoredUser) => void;
  clearUser: () => void;
};

export const useUserStore = create<UserStore>(set => ({
  user: null,
  setUser: (user) => {
    set({ user });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:user', JSON.stringify(user));
    }
  },
  clearUser: () => {
    set({ user: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:user');
    }
  },
}));
```

**Key Fields:**
- `localId`: Local database primary key (needed for queries)
- `id`: Clerk ID (used for Clerk API calls)
- Stores minimal PII - no birthdate, phone, etc.

### Baby Store
**Location:** `src/stores/useBabyStore.ts`

```typescript
export type ActiveBaby = {
  babyId: number;
  name: string;
  accessLevel: 'owner' | 'editor' | 'viewer';
  caregiverLabel: string | null;
};

type BabyStore = {
  activeBaby: ActiveBaby | null;
  setActiveBaby: (baby: ActiveBaby) => void;
  clearActiveBaby: () => void;
};

export const useBabyStore = create<BabyStore>(set => ({
  activeBaby: null,
  setActiveBaby: (baby) => {
    set({ activeBaby: baby });
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('baby-log:active-baby', JSON.stringify(baby));
    }
  },
  clearActiveBaby: () => {
    set({ activeBaby: null });
    if (typeof window !== 'undefined') {
      sessionStorage.removeItem('baby-log:active-baby');
    }
  },
}));
```

**Key Fields:**
- `babyId`: Database primary key for queries
- `accessLevel`: Cached from `baby_access` for UI permissions
- `caregiverLabel`: Display label for current user's role

## Patterns

### Initializing State After Bootstrap
**Location:** `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts`

After bootstrap API returns, the state machine initializes stores:
```typescript
// In useBootstrapMachine.ts
const { user, accountState } = bootstrapResponse;

// Initialize user store
useUserStore.getState().setUser(user);

// Initialize baby store if ready state
if (accountState.state === 'ready' && accountState.activeBaby) {
  useBabyStore.getState().setActiveBaby(accountState.activeBaby);
}
```

This ensures stores are populated before redirecting to overview.

### Reading State in Components
**Client Components:**
```typescript
import { useUserStore } from '@/stores/useUserStore';
import { useBabyStore } from '@/stores/useBabyStore';

export function MyComponent() {
  const user = useUserStore(state => state.user);
  const activeBaby = useBabyStore(state => state.activeBaby);

  if (!user || !activeBaby) {
    return <div>Loading...</div>;
  }

  return <div>Tracking {activeBaby.name} as {activeBaby.caregiverLabel}</div>;
}
```

**Server Components:**
Cannot directly read Zustand stores (server-side). Instead:
1. Query database using Clerk `auth().userId`
2. Pass data as props to client components
3. Client components can compare DB data with store data

### Clearing State on Sign-Out
**Location:** `src/components/auth/SignOutButton.tsx`

```typescript
import { SignOutButton as ClerkSignOutButton } from '@clerk/nextjs';
import { useBabyStore } from '@/stores/useBabyStore';
import { useUserStore } from '@/stores/useUserStore';

export function SignOutButton() {
  const clearUser = useUserStore(state => state.clearUser);
  const clearActiveBaby = useBabyStore(state => state.clearActiveBaby);

  return (
    <ClerkSignOutButton>
      <button
        onClick={() => {
          clearUser();
          clearActiveBaby();
          sessionStorage.removeItem('baby-log:init-step');
        }}
      >
        Sign Out
      </button>
    </ClerkSignOutButton>
  );
}
```

**Critical:** This prevents previous user's data from appearing to new user on shared device.

### SessionStorage Keys
All keys use `baby-log:` prefix for namespacing:
- `baby-log:user` - User store state
- `baby-log:active-baby` - Baby store state
- `baby-log:init-step` - UI-only state (optional, for loading screens)

## Gotchas

### SSR Hydration Mismatch
Zustand state is client-only. During SSR:
- Initial render: `user = null`, `activeBaby = null`
- After hydration: State loaded from sessionStorage
- This causes hydration mismatch warnings if you render different content

**Solution:** Use `mounted` state or null checks:
```typescript
const [mounted, setMounted] = useState(false);
useEffect(() => setMounted(true), []);

if (!mounted) return <Skeleton />;
```

### SessionStorage Not Available in Server Components
Never try to read sessionStorage in server components:
```typescript
// ❌ WRONG: Will crash during SSR
export default function ServerComponent() {
  const data = sessionStorage.getItem('baby-log:user'); // ReferenceError
}
```

**Solution:** Only read sessionStorage in client components or useEffect.

### Store State vs Database State
Stores are a **cache**, database is the **source of truth**:
- Store may be stale if database updated in another tab/device
- Resolution flow re-syncs on every page load
- Never write to database based on store state - always re-query first

### SignOutButton Must Be Custom
Clerk's default `<SignOutButton>` does NOT clear sessionStorage:
```typescript
// ❌ WRONG: Leaves stale data in sessionStorage
import { SignOutButton } from '@clerk/nextjs';
<SignOutButton />
```

Always use custom `SignOutButton` from `@/components/auth/SignOutButton`.

### Offline Behavior
When offline (PWA mode):
- sessionStorage still works (local to device)
- But cannot sync with database
- User sees last cached state until reconnection

**Future:** Implement IndexedDB + sync queue for offline support (not yet implemented).

## Related
- `.readme/chunks/account.bootstrap-unified-flow.md` - How stores are initialized during bootstrap
- `.readme/chunks/local-first.bootstrap-storage.md` - Bootstrap data storage in IndexedDB
- `.readme/chunks/performance.pwa-config.md` - PWA best practices and storage constraints
