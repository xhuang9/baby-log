---
last_verified_at: 2026-01-08T14:30:00Z
source_paths:
  - src/actions/feedLogActions.ts
  - src/models/Schema.ts
---

# Feed Logging Server Actions

## Purpose

Type-safe server actions for creating and retrieving feed logs with built-in access control, automatic estimation, and caregiver attribution.

## Key Deviations from Standard

This is fully custom business logic with several non-standard patterns:

### 1. Dual Method Handling with Different Fields

```typescript
type CreateFeedLogData = {
  babyId: number;
  method: FeedMethod;
  startedAt: Date;
  // Bottle-specific
  amountMl?: number;
  // Breast-specific
  durationMinutes?: number;
  endSide?: EndSide;
};
```

**Pattern**: Conditional fields based on feed method, not a union type.

### 2. Automatic Amount Estimation

For breast feeds without explicit amount:

```typescript
if (data.method === 'breast' && data.durationMinutes && !amountMl) {
  amountMl = Math.round(data.durationMinutes * 1.2);
  isEstimated = true;
  estimatedSource = 'default_model';
}
```

**Model**: ~1.2ml per minute (basic estimation).
**Future**: Can be enhanced with baby age/gender factors.

### 3. Automatic `endedAt` Calculation

```typescript
// For breast feeds: calculate from duration
if (data.method === 'breast' && data.durationMinutes) {
  endedAt = new Date(data.startedAt.getTime() + data.durationMinutes * 60 * 1000);
}

// For bottle feeds: instant (endedAt = startedAt)
if (data.method === 'bottle') {
  endedAt = data.startedAt;
}
```

**Why**: Simplifies UI by auto-calculating end time.

### 4. Caregiver Label via Join

```typescript
const [access] = await db
  .select({
    accessLevel: babyAccessSchema.accessLevel,
    caregiverLabel: babyAccessSchema.caregiverLabel,
  })
  .from(babyAccessSchema)
  // ...
```

**Pattern**: Always fetch caregiver label from `baby_access` to attribute logs to the user who created them.

## Access Control Flow

1. **Authentication Check**: Verify Clerk `userId` exists
2. **User Resolution**: Map `clerkId` to local user ID
3. **Access Verification**: Check `baby_access` table for relationship
4. **Permission Check**: Reject if access level is `viewer` (only `editor`/`owner` can log)
5. **Create Log**: Insert with `loggedByUserId` for attribution

## Return Types

All actions follow result pattern:

```typescript
type Result =
  | { success: true; feedLog: FeedLogWithCaregiver }
  | { success: false; error: string };
```

**Includes**: Full feed log data with caregiver label pre-joined.

## Revalidation

```typescript
revalidatePath('/overview');
revalidatePath('/logs');
```

**Why**: Feed logs appear on both pages, need cache invalidation.

## Gotchas

- **Viewer Access**: Viewers can see logs but cannot create them
- **Archived Babies**: Feed logs for archived babies are filtered via `archivedAt IS NULL`
- **Estimated Amounts**: Marked with `isEstimated: true` and `estimatedSource` for transparency
- **Timezone**: All timestamps use `withTimezone: true` for UTC consistency

## Related

- `chunks/feed-logging.schema-design.md` - Database schema for feed logs
- `chunks/account.baby-multi-tenancy.md` - Access control patterns
