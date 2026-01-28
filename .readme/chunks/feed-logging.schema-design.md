---
last_verified_at: 2026-01-08T14:30:00Z
source_paths:
  - src/models/Schema.ts
  - migrations/0005_real_masked_marvel.sql
---

# Feed Log Database Schema

## Purpose

Database schema for tracking baby feeds with support for multiple feed methods, automatic estimation, and user attribution.

## Schema Definition

```typescript
export const feedLogSchema = pgTable('feed_log', {
  id: serial('id').primaryKey(),
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  loggedByUserId: integer('logged_by_user_id').references(() => userSchema.id).notNull(),
  method: text('method').notNull(), // 'breast' | 'bottle'
  startedAt: timestamp('started_at', { withTimezone: true }).notNull(),
  endedAt: timestamp('ended_at', { withTimezone: true }), // nullable for ongoing feeds
  durationMinutes: integer('duration_minutes'), // for breast feed
  amountMl: integer('amount_ml'), // in milliliters
  isEstimated: boolean('is_estimated').notNull().default(false),
  estimatedSource: text('estimated_source'), // 'user_rate|default_model|manual_guess'
  endSide: text('end_side'), // 'left' | 'right' for breast feed
  ...timestamps, // createdAt, updatedAt
}, t => [
  index('feed_log_baby_started_at_idx').on(t.babyId, t.startedAt),
]);
```

## Key Deviations from Standard

### 1. Method Field as Text (Not Enum)

**Choice**: Used `text` instead of `pgEnum` for method.
**Why**: Allows easier extension (e.g., adding "mixed" or "tube" feed types without migration).
**Trade-off**: Application enforces type safety via TypeScript.

### 2. Optional `endedAt` for Ongoing Feeds

**Pattern**: Nullable `endedAt` allows recording feeds still in progress.
**Use Case**: Future feature for "Start Feed" timer.
**Current**: Always populated (instant for bottle, calculated for breast).

### 3. Dual Amount Fields

- **`durationMinutes`**: Primary metric for breast feeds
- **`amountMl`**: Primary metric for bottle feeds, estimated for breast

**Why**: Keeps both data points for analytics even when one is estimated.

### 4. Estimation Metadata

```typescript
isEstimated: boolean
estimatedSource: text // 'default_model' | 'user_rate' | 'manual_guess'
```

**Purpose**: Track which amounts are measured vs. estimated for accuracy filtering.
**Future**: Allows user to set their own estimation rate or use ML model.

### 5. User Attribution via Foreign Key

```typescript
loggedByUserId: integer('logged_by_user_id').references(() => userSchema.id).notNull()
```

**Pattern**: Every feed log tracks who created it.
**Usage**: Joined with `baby_access.caregiverLabel` to show "by Mom", "by Dad", etc.

## Index Strategy

```typescript
index('feed_log_baby_started_at_idx').on(t.babyId, t.startedAt)
```

**Purpose**: Optimize queries for:
- Latest feed for a baby (`ORDER BY startedAt DESC LIMIT 1`)
- Feed history timeline (`WHERE babyId = ? ORDER BY startedAt`)

**Note**: Composite index on `(babyId, startedAt)` covers both use cases.

## Migration Pattern

Recent migration `0005_real_masked_marvel.sql` added:

```sql
ALTER TABLE "feed_log" ADD COLUMN "logged_by_user_id" integer NOT NULL;
ALTER TABLE "feed_log" ADD COLUMN "duration_minutes" integer;
ALTER TABLE "feed_log" ADD CONSTRAINT "feed_log_logged_by_user_id_user_id_fk"
  FOREIGN KEY ("logged_by_user_id") REFERENCES "public"."user"("id")
  ON DELETE no action ON UPDATE no action;
```

**Context**: Initially feed logs didn't track user attribution or breast feed duration.

## Gotchas

- **No Soft Deletes**: Feed logs are permanent (no `archivedAt` or `deletedAt`)
- **No Edit History**: Updates to feed logs don't track changes (could add `editedAt`/`editedByUserId` later)
- **Timezone Aware**: All timestamps use `withTimezone: true` for UTC storage
- **Nullable Fields**: Many fields are nullable to support partial data entry

## Related

- `chunks/feed-logging.server-actions.md` - Logic for creating/querying feed logs
- `chunks/database.schema-workflow.md` - General migration workflow
