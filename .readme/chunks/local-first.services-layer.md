---
last_verified_at: 2026-01-09T00:00:00Z
source_paths:
  - src/services/baby-access.ts
  - .readme/task/architecture.folder-structure.plan.md
---

# Services Layer for Shared Business Logic

## Purpose
Documents the `src/services/` layer that extracts shared business logic from server actions. Enables code reuse across server actions, future API routes, and background jobs.

## Key Deviations from Standard

Unlike Next.js projects that duplicate business logic in actions and API routes:
- **Centralized in `src/services/`** - single source of truth for business logic
- **Shared by server actions AND future API routes** - DRY principle
- **Testable in isolation** - no Next.js context required
- **Type-safe result pattern** - `ServiceResult<T>` for explicit error handling

## Service Structure

### File Organization

```
src/services/
  baby-access.ts       # Baby access control and permission checks
  feed-log.ts          # Feed log calculations and validation (future)
  sync.ts              # Sync logic (future)
```

**Pattern**: One file per domain, exporting multiple related functions.

### Result Pattern

All service functions return `ServiceResult<T>` for explicit error handling:

```typescript
export type ServiceResult<T>
  = | { success: true; data: T }
    | { success: false; error: string };
```

**Why**:
- Explicit error handling (no throwing exceptions)
- Type-safe discriminated union
- Easy to check in calling code

## Baby Access Service

### Core Functions

```typescript
// src/services/baby-access.ts

/**
 * Get local user by Clerk ID
 */
export async function getLocalUserByClerkId(
  clerkId: string,
): Promise<ServiceResult<LocalUser>>;

/**
 * Get user's access to a specific baby
 */
export async function getBabyAccess(
  userId: number,
  babyId: number,
): Promise<ServiceResult<BabyAccess>>;

/**
 * Verify user can access a baby (any access level)
 */
export async function assertUserCanAccessBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>>;

/**
 * Verify user can edit a baby (owner or editor access)
 */
export async function assertUserCanEditBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>>;

/**
 * Verify user can add logs to a baby (owner or editor access)
 */
export async function assertUserCanLogForBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>>;
```

### Access Level Hierarchy

```
owner > editor > viewer

owner:  Can edit baby, manage access, delete baby, add logs
editor: Can edit baby, add logs (cannot manage access)
viewer: Read-only access (cannot edit or add logs)
```

## Patterns

### Server Action Usage

```typescript
// src/actions/feedLogActions.ts
'use server';

import { auth } from '@clerk/nextjs/server';
import { assertUserCanLogForBaby } from '@/services/baby-access';

export async function createFeedLog(babyId: number, data: FeedLogInput) {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Unauthorized' };

  // Use service for access check
  const accessResult = await assertUserCanLogForBaby(userId, babyId);
  if (!accessResult.success) return accessResult;

  const { user, access } = accessResult.data;

  // Business logic
  const feedLog = await db.insert(feedLogsSchema).values({
    babyId,
    loggedByUserId: user.id,
    ...data,
  });

  return { success: true, data: feedLog };
}
```

### Future API Route Usage

```typescript
// src/app/api/v1/feed/route.ts (future iOS API)
import { assertUserCanLogForBaby } from '@/services/baby-access';

export async function POST(request: Request) {
  const { babyId, ...data } = await request.json();
  const clerkId = await getClerkIdFromJWT(request); // JWT auth for iOS

  // SAME service function as server actions
  const accessResult = await assertUserCanLogForBaby(clerkId, babyId);
  if (!accessResult.success) {
    return Response.json({ error: accessResult.error }, { status: 403 });
  }

  // SAME business logic
  const feedLog = await db.insert(feedLogsSchema).values({
    babyId,
    loggedByUserId: accessResult.data.user.id,
    ...data,
  });

  return Response.json({ success: true, data: feedLog });
}
```

**Why**: Server actions and API routes share business logic via services. No duplication.

### Service Composition

```typescript
// Higher-level service calls lower-level services
export async function assertUserCanEditBaby(
  clerkId: string,
  babyId: number,
): Promise<ServiceResult<{ user: LocalUser; access: BabyAccess }>> {
  // Reuse assertUserCanAccessBaby
  const result = await assertUserCanAccessBaby(clerkId, babyId);
  if (!result.success) return result;

  const { user, access } = result.data;

  // Additional permission check
  if (access.accessLevel === 'viewer') {
    return { success: false, error: 'You do not have permission to edit this baby' };
  }

  return { success: true, data: { user, access } };
}
```

### Result Handling

```typescript
// Check success and extract data
const result = await assertUserCanAccessBaby(clerkId, babyId);

if (!result.success) {
  // TypeScript knows result.error exists
  return { success: false, error: result.error };
}

// TypeScript knows result.data exists
const { user, access } = result.data;
```

**Why**: Discriminated union eliminates need for `try/catch`.

## Service Design Principles

### 1. Database-Agnostic Interface
Services accept primitive types, not Drizzle queries:

```typescript
// ✅ Good: Accepts primitives
export async function getBabyAccess(userId: number, babyId: number);

// ❌ Bad: Couples to Drizzle
export async function getBabyAccess(query: DrizzleQuery);
```

### 2. No Framework Dependencies
Services don't import Next.js or Clerk directly:

```typescript
// ✅ Good: Accepts clerkId string
export async function assertUserCanAccessBaby(clerkId: string, babyId: number);

// ❌ Bad: Imports Clerk auth
import { auth } from '@clerk/nextjs/server';
export async function assertUserCanAccessBaby(babyId: number) {
  const { userId } = await auth(); // Couples to Next.js
}
```

**Why**: Makes services testable and reusable in non-Next.js contexts (e.g., background jobs).

### 3. Explicit Error Handling
Services return `ServiceResult<T>`, never throw:

```typescript
// ✅ Good: Returns error in result
if (!user) {
  return { success: false, error: 'User not found' };
}

// ❌ Bad: Throws exception
if (!user) {
  throw new Error('User not found');
}
```

**Why**: Explicit errors are easier to handle and type-safe.

## Testing Services

```typescript
// tests/services/baby-access.test.ts
import { describe, it, expect } from 'vitest';
import { assertUserCanAccessBaby } from '@/services/baby-access';

describe('assertUserCanAccessBaby', () => {
  it('should return error when user not found', async () => {
    const result = await assertUserCanAccessBaby('invalid-clerk-id', 1);

    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error).toBe('User not found');
    }
  });

  it('should return access when user has permission', async () => {
    // Setup: Create user and baby in test DB
    const clerkId = 'test-clerk-id';
    const babyId = 1;

    const result = await assertUserCanAccessBaby(clerkId, babyId);

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.user.clerkId).toBe(clerkId);
      expect(result.data.access.babyId).toBe(babyId);
    }
  });
});
```

**Why**: Services are pure functions (given same inputs, return same outputs). Easy to test.

## Gotchas

### Don't Call Server Actions from Services
**Wrong**:
```typescript
// ❌ Services should NOT call server actions
import { getBaby } from '@/actions/babyActions';

export async function getBabyAccess(userId: number, babyId: number) {
  const baby = await getBaby(babyId); // ❌ Circular dependency risk
}
```

**Right**:
```typescript
// ✅ Services call database directly
import { db } from '@/lib/db';

export async function getBabyAccess(userId: number, babyId: number) {
  const baby = await db.select().from(babiesSchema).where(...); // ✅ Direct DB access
}
```

### Don't Import Clerk/Next.js in Services
**Wrong**:
```typescript
// ❌ Couples service to Next.js
import { auth } from '@clerk/nextjs/server';

export async function assertUserCanAccessBaby(babyId: number) {
  const { userId } = await auth(); // ❌ Can't test without Next.js context
}
```

**Right**:
```typescript
// ✅ Accept clerkId as parameter
export async function assertUserCanAccessBaby(clerkId: string, babyId: number) {
  // ✅ Testable with any string
}
```

### Result Pattern Requires Checking
**Wrong**:
```typescript
// ❌ Assumes success without checking
const result = await getBabyAccess(userId, babyId);
const access = result.data; // TypeScript error: data may not exist
```

**Right**:
```typescript
// ✅ Check success first
const result = await getBabyAccess(userId, babyId);
if (!result.success) return result;
const access = result.data; // TypeScript knows data exists
```

## Related
- `.readme/chunks/architecture.libs-pattern.md` - Database connection pattern
- `.readme/chunks/local-first.outbox-pattern.md` - Services called by outbox flush
- `.readme/task/architecture.folder-structure.plan.md` - Services layer rationale
