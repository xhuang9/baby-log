---
last_verified_at: 2026-01-18T12:33:25Z
source_paths:
  - src/services/operations/index.ts
  - src/services/operations/types.ts
  - src/services/operations/ui-config.ts
  - src/services/operations/auth.ts
  - src/services/operations/baby.ts
  - src/services/operations/feed-log.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/AddFeedModal.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/_components/HandPreferenceSetting.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/[babyId]/EditBabyForm.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/new/NewBabyForm.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/BabiesManagement.tsx
  - src/components/auth/SignOutButton.tsx
conversation_context: "Documented the operations layer refactor and updated overview/settings write paths to use services/operations."
---

# Operations Layer (Service-First Mutations)

## Purpose

Centralized write operations layer that decouples UI components from direct IndexedDB and server action calls. All mutations follow a consistent pattern: write to IndexedDB immediately (local-first), update Zustand stores for UI feedback, enqueue to outbox for sync, and trigger non-blocking server sync.

## Key Deviations from Standard

- **UI writes routed through operations**: Baby/feed mutations and theme/hand updates use `@/services/operations/*`; widget settings still persist via `updateUIConfig` until migrated.
- **Client-side only**: Operations check `isClientSide()` and fail gracefully during SSR.
- **Consistent result type**: All operations return `OperationResult<T>` union (`{ success: true; data: T } | { success: false; error: string }`).
- **Auth operations centralized**: Sign-out cleanup moved from component to `signOutCleanup()` operation.
- **UI config operations are local-only**: Theme/hand/widget updates stay in IndexedDB (no outbox).

## Architecture

### File Structure

```
src/services/operations/
├── index.ts           # Main exports
├── types.ts           # OperationResult<T>, helpers, UserContext
├── baby.ts            # createBaby, updateBabyProfile, setDefaultBaby, deleteBaby
├── feed-log.ts        # createFeedLog
├── ui-config.ts       # updateTheme, updateHandMode, updateWidgetSettings
└── auth.ts            # signOutCleanup
```

### Operation Pattern

Every operation follows this signature:

```typescript
export async function operationName(
  input: OperationInput,
): Promise<OperationResult<ReturnType>> {
  // 1. Validate client-side context
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // 2. Get user context from Zustand store
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // 3. Write to IndexedDB (local-first)
    await localDb.table.put(data);

    // 4. Update Zustand stores (if needed for UI feedback)
    useStoreXYZ.getState().updateData(data);

    // 5. Enqueue to outbox (if syncs to server)
    await localDb.outbox.add(mutation);

    // 6. Trigger non-blocking sync (optional)
    void flushOutbox();

    return success(data);
  } catch (error) {
    return failure(error instanceof Error ? error.message : 'Operation failed');
  }
}
```

## Core Types

### OperationResult<T>

**File**: `src/services/operations/types.ts`

```typescript
export type OperationResult<T> =
  | { success: true; data: T }
  | { success: false; error: string };
```

**Helper Functions**:

```typescript
// Create success result
success<T>(data: T): OperationResult<T>

// Create failure result
failure<T>(error: string): OperationResult<T>

// Type guards
isSuccess<T>(result): result is { success: true; data: T }
isFailure<T>(result): result is { success: false; error: string }
```

### UserContext

```typescript
export interface UserContext {
  localId: string;        // IndexedDB user ID
  clerkUserId: string;    // Clerk user ID
  email?: string;
}
```

**Retrieved via**: `useUserStore.getState().user`

**Note**: Operations do not accept `UserContext` parameters yet; they read from `useUserStore` directly (numeric `localId`).

### Runtime Checks

```typescript
// Check if running client-side
isClientSide(): boolean

// Generate unique mutation ID for outbox
generateMutationId(): string
```

## UI Config Operations

**File**: `src/services/operations/ui-config.ts`

UI config operations are **client-side only** (no server sync, no outbox).

### updateTheme

```typescript
export async function updateTheme(
  input: { theme: ThemeMode }
): Promise<OperationResult<void>>
```

**Flow**:
1. Get `userId` from `useUserStore`
2. Call `updateUIConfig(userId, { theme: input.theme })`
3. Return `success(undefined)`

**Used by**: `ThemeSetting` component

### updateHandMode

```typescript
export async function updateHandMode(
  input: { handMode: HandMode }
): Promise<OperationResult<void>>
```

**Flow**: Same pattern as `updateTheme`

**Used by**: `HandPreferenceSetting` component

### updateWidgetSettings

```typescript
export async function updateWidgetSettings(
  input: {
    widget: 'timeSwiper' | 'amountSlider';
    settings: Record<string, unknown>;
  }
): Promise<OperationResult<void>>
```

**Flow**:
1. Get `userId` from `useUserStore`
2. Call `updateUIConfig(userId, { [input.widget]: input.settings })`
3. Return `success(undefined)`

**Used by**: Not wired yet; widget settings still call `updateUIConfig` inside `useWidgetSettings`.

### updateUIConfigByKey

```typescript
export async function updateUIConfigByKey(
  keyPath: string,
  value: unknown
): Promise<OperationResult<void>>
```

**Generic operation** for one-off config updates not covered by specific operations.

**Flow**: Calls `updateUIConfigKey(userId, keyPath, value)` with dot notation support.

## Auth Operations

**File**: `src/services/operations/auth.ts`

### signOutCleanup

```typescript
export async function signOutCleanup(): Promise<OperationResult<void>>
```

**Purpose**: Centralized cleanup on user sign-out.

**Operations**:
1. Clear `useUserStore` (clears sessionStorage automatically)
2. Clear `useBabyStore` (clears active baby)
3. Remove `'baby-log:init-step'` from sessionStorage
4. Call `clearAuthSession()` to invalidate offline auth marker

**Used by**: `SignOutButton` component

**Before refactor**: SignOutButton had ~25 lines of cleanup logic inline.

**After refactor**: SignOutButton calls `signOutCleanup()` in 3 lines:

```typescript
const handleSignOut = async () => {
  const result = await signOutCleanup();
  if (!result.success) {
    console.error('Failed to cleanup on sign out:', result.error);
  }
};
```

## Baby Operations

**File**: `src/services/operations/baby.ts`

```typescript
export async function createBaby(input: CreateBabyInput): Promise<OperationResult<LocalBaby>>
export async function updateBabyProfile(
  babyId: number,
  updates: UpdateBabyInput
): Promise<OperationResult<LocalBaby>>
export async function setDefaultBaby(babyId: number): Promise<OperationResult<void>>
export async function deleteBaby(babyId: number): Promise<OperationResult<void>>
```

**Pattern**:
- `createBaby`, `updateBabyProfile`, `deleteBaby`: write to IndexedDB, update `useBabyStore`, enqueue to outbox, trigger sync.
- `setDefaultBaby`: updates `babyAccess.lastAccessedAt` and `useBabyStore` only (no outbox).

## Feed Log Operations

**File**: `src/services/operations/feed-log.ts`

```typescript
export async function createFeedLog(input: CreateFeedLogInput): Promise<OperationResult<LocalFeedLog>>
```

**Pattern**: Writes to IndexedDB `feedLogs` table, enqueues mutation to outbox, triggers sync.

## Usage in Components

### Before (Direct IndexedDB)

```typescript
// ❌ Component directly calls IndexedDB
import { updateUIConfig } from '@/lib/local-db';

const handleChange = async (theme: ThemeMode) => {
  try {
    await updateUIConfig(userId, { theme });
    toast.success('Theme updated');
  } catch (error) {
    toast.error('Failed to update theme');
  }
};
```

### After (Operations Layer)

```typescript
// ✅ Component calls operation
import { updateTheme } from '@/services/operations';

const handleChange = async (theme: ThemeMode) => {
  const result = await updateTheme({ theme });
  if (result.success) {
    toast.success('Theme updated');
  } else {
    toast.error('Failed to update theme');
  }
};
```

**Benefits**:
- Consistent error handling pattern
- Fewer IndexedDB write calls in UI components (core mutations flow through operations)
- Easy to add logging, metrics, or side effects in operations
- Clear separation of concerns (UI vs data layer)

**Migrated components**:
- `AddFeedModal` (feed log create)
- `NewBabyForm` / `EditBabyForm` (baby create/update)
- `BabiesManagement` (default baby switch)
- `ThemeSetting` / `HandPreferenceSetting`
- `SignOutButton`

## Component Examples

### ThemeSetting Component

**File**: `src/app/[locale]/(auth)/(app)/settings/_components/ThemeSetting.tsx`

**Uses**: `updateTheme` operation

**Pattern**:
1. Load initial value from IndexedDB via `getUIConfig` in an effect
2. Update local state immediately on change
3. Call `updateTheme({ theme: value })` in `startTransition`
4. Show toast based on result

### SignOutButton Component

**File**: `src/components/auth/SignOutButton.tsx`

**Uses**: `signOutCleanup` operation

**Pattern**:
```typescript
const handleSignOut = async () => {
  const result = await signOutCleanup();
  if (!result.success) {
    console.error('Failed to cleanup on sign out:', result.error);
  }
};

return (
  <ClerkSignOutButton>
    <button type="button" onClick={handleSignOut}>
      Sign out
    </button>
  </ClerkSignOutButton>
);
```

## Testing Considerations

### Unit Testing Operations

**Mock dependencies**:
- `useUserStore.getState()` → return mock user
- `localDb.*` → use in-memory Dexie instance
- `flushOutbox()` → mock to prevent network calls

**Test cases**:
1. Success path: verify IndexedDB write, store update, return value
2. No user: verify `failure('Not authenticated')`
3. SSR context: verify `failure('Client-only operation')`
4. IndexedDB error: verify `failure(error.message)`

### Integration Testing with Components

**Pattern**:
```typescript
// Seed user in Zustand store
useUserStore.setState({ user: mockUser });

// Render component
render(<ThemeSetting />);

// Interact with UI
await user.click(screen.getByRole('combobox'));
await user.click(screen.getByText('Dark'));

// Assert operation called
expect(updateTheme).toHaveBeenCalledWith({ theme: 'dark' });

// Assert IndexedDB updated
const config = await getUIConfig(mockUser.localId);
expect(config.data.theme).toBe('dark');
```

## Migration Strategy

### Phase 1: UI Config (Partial)

- ✅ Created `ui-config.ts` operations
- ✅ Migrated `ThemeSetting` component
- ✅ Migrated `HandPreferenceSetting` component
- ⏳ `useWidgetSettings` still calls `updateUIConfig` directly

### Phase 2: Auth (Completed)

- ✅ Created `auth.ts` operations
- ✅ Migrated `SignOutButton` component

### Phase 3: Baby & Feed Logs (Completed for Overview/Settings)

- ✅ Created `baby.ts` and `feed-log.ts` operations
- ✅ Migrated baby edit/create forms (settings pages)
- ✅ Migrated feed logging flow in `AddFeedModal`

### Phase 4: Cleanup

- Remove direct `localDb` imports from components
- Add ESLint rule to prevent future direct IndexedDB access
- Update test utilities to use operations

## Gotchas

1. **SSR safety**: Always check `isClientSide()` first. Operations fail gracefully during SSR but won't execute.

2. **User context timing**: Operations require a user in `useUserStore`. If the store is not hydrated, they return `Not authenticated`.

3. **Temporary baby IDs**: `createBaby` uses a `Date.now()` ID locally and enqueues it to outbox; server assigns a real ID later. There is no automatic ID reconciliation yet.

4. **Local-only default baby**: `setDefaultBaby` updates `babyAccess.lastAccessedAt` and store state but does not enqueue an outbox mutation.

5. **Widget settings still bypass operations**: `TimeSwiper`, `AmountSlider`, and `useWidgetSettings` write via `updateUIConfig` directly for now.

6. **Outbox vs no outbox**: UI config operations don't use outbox (client-only). Baby/feed operations do (sync to server).

## Related Systems

- `.readme/chunks/local-first.ui-config-storage.md` - UIConfig persistence layer (called by ui-config operations)
- `.readme/chunks/local-first.outbox-pattern.md` - Outbox enqueue pattern (used by baby/feed operations)
- `.readme/chunks/local-first.store-hydration-pattern.md` - Zustand store hydration (required for user context)
- `.readme/chunks/account.widget-settings-architecture.md` - Widget settings hook (uses `updateUIConfig`)
- `.readme/planning/12-operations-layer.md` - Original planning document for operations layer
