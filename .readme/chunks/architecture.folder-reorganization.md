---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/providers/
  - src/lib/
  - src/services/
  - src/app/[locale]/(auth)/(app)/overview/_components/
  - .readme/task/architecture.folder-structure.plan.md
---

# Folder Structure Reorganization

## Purpose
Documents the folder structure reorganization that aligns with Next.js conventions, extracts infrastructure from components, and prepares for local-first architecture.

## Key Deviations from Standard

This reorganization fixes common Next.js project pain points:
- **`providers/` extracted from `components/`** - infrastructure ≠ UI
- **`libs/` renamed to `lib/`** - matches Next.js convention
- **`_components/` for page-specific code** - Next.js route colocation pattern
- **`services/` for business logic** - separates logic from actions

## Changes Implemented

### Phase 1-2: Cleanup and Extract Providers ✅

#### Removed Demo/Boilerplate Code
Deleted unused boilerplate components:
- `CounterForm.tsx`, `CurrentCount.tsx` - Demo state management
- `DemoBadge.tsx`, `DemoBanner.tsx` - Marketing components
- `Sponsors.tsx` - Unused component
- `component-example.tsx`, `example.tsx` - Example files
- `api/counter/route.ts` - Demo API route
- `CounterValidation.ts` - Demo validation schema

**Why**: Reduces clutter and clarifies what's production code vs. examples.

#### Extracted Providers to `src/providers/`

```
Before:
  components/
    providers/
      ThemeProvider.tsx
    analytics/
      PostHogProvider.tsx
      PostHogPageView.tsx

After:
  providers/
    ThemeProvider.tsx
    PostHogProvider.tsx
    PostHogPageView.tsx
    QueryProvider.tsx        (new)
```

**Rationale**:
- Providers are infrastructure, not UI components
- Clear separation: `components/` = reusable UI, `providers/` = app-level context
- Groups all providers in one discoverable location

**Import Changes**:
```typescript
// Before
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import { PostHogProvider } from '@/components/analytics/PostHogProvider';

// After
import { ThemeProvider } from '@/providers/ThemeProvider';
import { PostHogProvider } from '@/providers/PostHogProvider';
import { QueryProvider } from '@/providers/QueryProvider';
```

### Phase 3: Rename `libs/` → `lib/` ✅

```
Before:
  src/libs/
    DB.ts
    Env.ts
    I18n.ts
    Logger.ts
    Arcjet.ts

After:
  src/lib/
    db.ts
    env.ts
    i18n.ts
    logger.ts
    arcjet.ts
    local-db.ts       (new - Dexie)
    query-keys.ts     (new - TanStack Query)
```

**Changes**:
- Folder renamed: `libs/` → `lib/` (matches Next.js convention)
- Files renamed: PascalCase → lowercase (e.g., `DB.ts` → `db.ts`)
- Import updates: `@/libs/DB` → `@/lib/db`

**Why**:
- Next.js documentation uses `lib/` folder
- Lowercase filenames are more common in modern Next.js projects
- Consistent with `app/`, `components/`, `utils/` naming

### Phase 4: Page Component Colocation with `_components/` ✅

```
Before:
  components/
    overview/
      ActivityTile.tsx
      FeedTile.tsx
      AddFeedSheet.tsx

After:
  app/[locale]/(auth)/(app)/overview/
    page.tsx
    _components/
      ActivityTile.tsx
      FeedTile.tsx
      AddFeedSheet.tsx
```

**Pattern**: Page-specific components live in `_components/` folder next to their page.

**Why `_components/`**:
- Next.js ignores folders starting with `_` in routing
- Keeps related code together (page + components in same directory)
- Clear signal: these components are NOT reusable, they're page-specific

**Import Changes**:
```typescript
// Before (absolute import from components/)
import { FeedTile } from '@/components/overview/FeedTile';

// After (relative import from _components/)
import { FeedTile } from './_components/FeedTile';
```

**Benefits**:
- When working on overview page, all code is in `/overview/` folder
- No need to jump between `app/` and `components/` folders
- Easy to identify which components are page-specific vs. shared

### Phase 5: Services Layer ✅

```
src/services/
  baby-access.ts       (new)
```

**Purpose**: Extract shared business logic from server actions.

**Functions**:
- `getLocalUserByClerkId(clerkId)` - Get user from DB
- `getBabyAccess(userId, babyId)` - Get access level
- `assertUserCanAccessBaby(clerkId, babyId)` - Verify any access
- `assertUserCanEditBaby(clerkId, babyId)` - Verify editor/owner access
- `assertUserCanLogForBaby(clerkId, babyId)` - Verify log permission

**Why**:
- DRY: Server actions and future API routes share business logic
- Testable: Services are pure functions, no Next.js context required
- Preparation: When iOS API routes are added, they import from services/

**Usage Example**:
```typescript
// src/actions/feedLogActions.ts
import { assertUserCanLogForBaby } from '@/services/baby-access';

export async function createFeedLog(babyId: number, data: FeedLogInput) {
  const { userId } = await auth();
  const result = await assertUserCanLogForBaby(userId, babyId);
  if (!result.success) return result;

  // ... business logic
}
```

### Phase 6: Local-First Foundation ✅

Created infrastructure for offline-first PWA:

```
src/lib/
  local-db.ts          (new - Dexie schema)
  query-keys.ts        (new - TanStack Query keys)

src/providers/
  QueryProvider.tsx    (new - TanStack Query setup)
```

**New Dependencies**:
- `dexie` - IndexedDB wrapper
- `dexie-react-hooks` - React integration
- `@tanstack/react-query` - Network scheduler

**See Also**:
- `.readme/sections/local-first.index.md` - Full local-first architecture docs

## Final Structure

```
src/
  app/[locale]/
    (auth)/(app)/
      overview/
        page.tsx
        _components/          # Page-specific components
          ActivityTile.tsx
          FeedTile.tsx
          AddFeedSheet.tsx
      settings/
        page.tsx
        _components/          # Settings-specific components

  components/
    ui/                       # shadcn/ui primitives (shared)
    navigation/               # App navigation (shared)

  providers/                  # App-level providers (NEW location)
    ThemeProvider.tsx
    PostHogProvider.tsx
    QueryProvider.tsx

  lib/                        # Renamed from libs/
    db.ts                     # Renamed from DB.ts
    env.ts                    # Renamed from Env.ts
    i18n.ts                   # Renamed from I18n.ts
    local-db.ts               # NEW - Dexie
    query-keys.ts             # NEW - Query keys

  services/                   # NEW - Business logic
    baby-access.ts

  actions/                    # Server actions (flat)
  models/                     # Drizzle schema
  stores/                     # Zustand stores
  validations/                # Zod schemas
  utils/                      # Utilities
  templates/                  # Shell layouts
  styles/                     # Global styles
```

## Patterns

### When to Use `_components/` vs. `components/`

**Use `_components/` (page-specific)**:
- Component is only used by one page
- Component has page-specific business logic
- Component imports from page-level stores/hooks
- Example: `AddFeedSheet.tsx` for overview page

**Use `components/` (shared)**:
- Component is used by multiple pages
- Component is generic/reusable
- Component has no page-specific logic
- Example: `Button.tsx`, `Card.tsx`, `AppHeader.tsx`

### Import Path Patterns

```typescript
// Shared UI components (absolute import)
import { Button } from '@/components/ui/button';
import { AppHeader } from '@/components/navigation/AppHeader';

// Page-specific components (relative import)
import { FeedTile } from './_components/FeedTile';

// Providers (absolute import)
import { QueryProvider } from '@/providers/QueryProvider';

// Services (absolute import)
import { assertUserCanAccessBaby } from '@/services/baby-access';

// Lib configs (absolute import)
import { db } from '@/lib/db';
import { localDb } from '@/lib/local-db';
```

**Why Mixed**:
- Absolute for infrastructure/shared code (stable paths)
- Relative for page-specific code (clear locality)

## Gotchas

### `_components/` Only Works in `app/` Directory
**Wrong**:
```
src/components/_shared/  # ❌ Won't be ignored by Next.js (not in app/)
```

**Right**:
```
src/app/[locale]/(auth)/(app)/overview/_components/  # ✅ Ignored by router
```

### Don't Mix Page-Specific and Shared Components
**Wrong**:
```typescript
// ❌ FeedTile importing from components/ suggests it's reusable
// But it's actually page-specific
src/components/overview/FeedTile.tsx
```

**Right**:
```typescript
// ✅ Clear signal: _components/ means page-specific
src/app/[locale]/(auth)/(app)/overview/_components/FeedTile.tsx
```

### Services Should Not Import Actions
**Wrong**:
```typescript
// ❌ Circular dependency risk
// src/services/baby-access.ts
import { getBaby } from '@/actions/babyActions';
```

**Right**:
```typescript
// ✅ Services call database directly, actions call services
// src/services/baby-access.ts
import { db } from '@/lib/db';
```

## Migration Notes

### Breaking Changes from Reorganization

1. **All imports from `@/libs/` must change to `@/lib/`**
2. **All imports from `@/components/providers/` or `@/components/analytics/` must change to `@/providers/`**
3. **Page-specific components moved to `_components/` folders**

### Validation Checklist

After reorganization, verify:
- ✅ `pnpm run check:types` passes
- ✅ `pnpm run lint` passes
- ✅ `pnpm run test` passes
- ✅ `pnpm run build` succeeds
- ✅ App runs: `pnpm run dev`
- ✅ No broken imports in components
- ✅ `pnpm run check:deps` shows no unused files

## Related
- `.readme/chunks/architecture.libs-pattern.md` - Library configuration pattern (updated for `lib/`)
- `.readme/chunks/local-first.services-layer.md` - Services layer details
- `.readme/sections/local-first.index.md` - Local-first foundation
- `.readme/task/architecture.folder-structure.plan.md` - Full reorganization plan
