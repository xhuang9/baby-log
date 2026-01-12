---
last_verified_at: 2026-01-06T00:30:00Z
source_paths:
  - src/models/Schema.ts
  - src/actions/babyActions.ts
  - src/app/[locale]/(auth)/(app)/dashboard/page.tsx
  - src/app/[locale]/(auth)/(app)/settings/babies/page.tsx
---

# Baby Multi-Tenancy Pattern

## Purpose
Multi-baby tracking system with access control, default baby selection, and shared access management. Allows users to track multiple babies (own or shared) with role-based permissions.

## Key Deviations from Standard
This is NOT a standard user-to-data relationship. Instead:
- **Many-to-many relationship**: Users can access multiple babies, babies can be shared with multiple users
- **Default baby concept**: User has ONE active baby at a time (`user.defaultBabyId`)
- **Role-based access**: owner | editor | viewer permissions per baby
- **Database as source of truth**: Baby selection stored in DB, NOT localStorage/cookies
- **sessionStorage for client state**: Temporary cache for current session only

## Implementation

### Database Schema
**Location:** `src/models/Schema.ts`

**Core Tables:**
```typescript
// users table
user.defaultBabyId → babies.id  // FK to current active baby

// babies table
baby.ownerUserId → user.id      // FK to original creator
baby.archivedAt                 // Soft delete timestamp

// baby_access (junction table)
{
  userId: FK → user.id
  babyId: FK → babies.id
  accessLevel: 'owner' | 'editor' | 'viewer'
  caregiverLabel: string | null  // "Mom", "Dad", "Grandma", etc.
  lastAccessedAt: timestamp | null
}
```

**Key Constraints:**
- `baby_access` has unique constraint on `(userId, babyId)` - prevents duplicate access
- `user.defaultBabyId` is nullable - new users have no default until first baby created/accepted
- `babies.archivedAt` is nullable - only set when baby is soft-deleted

### Access Level Definitions
**Location:** `src/models/Schema.ts`

```typescript
export const accessLevelEnum = pgEnum('access_level', ['owner', 'editor', 'viewer']);
```

**Permissions:**
- **owner**: Full control - edit baby, manage sharing, archive baby
- **editor**: Can add/edit logs, cannot manage sharing or archive
- **viewer**: Read-only access to logs and baby details

### Default Baby Selection Logic
**Location:** `src/actions/babyActions.ts` → `resolveAccountContext()`

**When user has no valid defaultBabyId:**
```typescript
// Priority 1: Most recently accessed baby
const sortedByAccess = babyAccess
  .filter(b => b.lastAccessedAt !== null)
  .sort((a, b) => b.lastAccessedAt! > a.lastAccessedAt! ? 1 : -1);

const defaultBaby = sortedByAccess[0] ?? babyAccess[0];

// Update user.defaultBabyId in database
await db.update(userSchema)
  .set({ defaultBabyId: defaultBaby.babyId })
  .where(eq(userSchema.id, localUser.id));
```

**When user explicitly changes default:**
```typescript
// src/actions/babyActions.ts → setDefaultBaby()
await db.update(userSchema)
  .set({ defaultBabyId: babyId })
  .where(eq(userSchema.id, userId));

await db.update(babyAccessSchema)
  .set({ lastAccessedAt: new Date() })
  .where(and(
    eq(babyAccessSchema.userId, userId),
    eq(babyAccessSchema.babyId, babyId)
  ));
```

Both `defaultBabyId` and `lastAccessedAt` are updated to maintain consistency.

## Patterns

### Querying Baby-Scoped Data
**Pattern:** Always join through `baby_access` to verify user has permission

```typescript
// CORRECT: Verify access via join
const logs = await db
  .select({ /* fields */ })
  .from(feedLogSchema)
  .innerJoin(babyAccessSchema, eq(feedLogSchema.babyId, babyAccessSchema.babyId))
  .where(and(
    eq(babyAccessSchema.userId, localUserId),
    eq(feedLogSchema.babyId, user.defaultBabyId)
  ));
```

**WRONG: Direct query without access check:**
```typescript
// ❌ SECURITY RISK: No verification user has access to this baby
const logs = await db
  .select()
  .from(feedLogSchema)
  .where(eq(feedLogSchema.babyId, user.defaultBabyId));
```

### Creating New Baby
**Location:** `src/actions/babyActions.ts` → `createBaby()`

**Steps:**
1. Insert baby record with `ownerUserId`
2. Create `baby_access` row with `accessLevel: 'owner'`
3. Set as user's `defaultBabyId`
4. Update `lastAccessedAt` to current timestamp

```typescript
const [baby] = await db.insert(babiesSchema)
  .values({ name, ownerUserId: localUserId, /* ... */ })
  .returning();

await db.insert(babyAccessSchema).values({
  babyId: baby.id,
  userId: localUserId,
  accessLevel: 'owner',
  caregiverLabel,
  lastAccessedAt: new Date(),
});

await db.update(userSchema)
  .set({ defaultBabyId: baby.id })
  .where(eq(userSchema.id, localUserId));
```

### Switching Default Baby
**Location:** `/settings/babies/BabiesManagement.tsx`

**User Flow:**
1. User views list of all accessible babies
2. Current default is highlighted
3. Click "Switch" button on another baby
4. Calls `setDefaultBaby(babyId)` server action
5. Page revalidates, new default is highlighted

### Archived Babies Exclusion
**Pattern:** Always filter out archived babies in queries

```typescript
where(
  and(
    eq(babyAccessSchema.userId, localUser.id),
    sql`${babiesSchema.archivedAt} IS NULL`  // Exclude archived
  )
)
```

## Gotchas

### Race Condition: Default Baby Updates
If user rapidly switches babies across multiple tabs:
- Each tab may have different `defaultBabyId` cached
- Last write wins in database
- sessionStorage in each tab becomes stale

**Mitigation:** Resolution flow runs on every page load, re-syncs state from DB.

### Dashboard Without Default Baby
Dashboard MUST check for valid `defaultBabyId` before rendering:

```typescript
// src/app/[locale]/(auth)/(app)/dashboard/page.tsx
if (!user?.defaultBabyId) {
  redirect('/account/resolve');
}
```

Never assume `user.defaultBabyId` exists - new users have NULL until first baby created.

### Access Revocation
When a user's access is revoked:
- `baby_access` row is deleted (not soft-deleted)
- If that was user's `defaultBabyId`, it becomes invalid
- Resolution flow will auto-select another baby or redirect to onboarding

No explicit handling needed - the resolution flow naturally handles this.

### Caregiver Label Persistence
When creating multiple babies, prefill `caregiverLabel` from previous baby:

```typescript
// Get last used caregiver label
const lastBaby = await db.select({ caregiverLabel: babyAccessSchema.caregiverLabel })
  .from(babyAccessSchema)
  .where(eq(babyAccessSchema.userId, localUserId))
  .orderBy(desc(babyAccessSchema.lastAccessedAt))
  .limit(1);

const defaultLabel = lastBaby[0]?.caregiverLabel ?? 'Parent';
```

Improves UX when adding second/third baby - user likely has same role.

## Related
- `.readme/chunks/account.resolution-flow.md` - How default baby is selected during resolution
- `.readme/chunks/account.baby-sharing.md` - How babies are shared between users
- `.readme/chunks/database.schema-workflow.md` - Schema design for multi-tenancy tables
