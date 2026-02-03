---
last_verified_at: 2026-02-02T00:00:00Z
source_paths:
  - src/services/operations/food-types.ts
  - src/lib/local-db/types/food-types.ts
  - src/lib/local-db/helpers/food-types.ts
  - src/hooks/useFoodTypes.ts
  - src/models/Schema.ts
  - migrations/0017_parched_eternity.sql
  - src/app/[locale]/api/sync/push/mutations/food-types.ts
  - src/services/sync/apply/food-types.ts
---

# Food Types System

## Purpose

User-created food type library for solids logging. Allows parents to define custom foods (e.g., "apple puree", "sweet potato") that can be selected when logging solids. Food types are stored locally with server sync.

## Features

- **User-created library**: Each user maintains their own food type list
- **Offline-first operations**: Create/delete food types work offline with server sync
- **Duplicate prevention**: Case-insensitive duplicate checking
- **Real-time reactivity**: useFoodTypes hook with live query updates via Dexie

## Schema Definition

### Database Table (PostgreSQL native uuid)

```typescript
export const foodTypesSchema = pgTable('food_types', {
  id: uuid('id').primaryKey(),                    // Client-generated UUID
  userId: integer('user_id').references(() => userSchema.id).notNull(),
  name: text('name').notNull(),                   // Food name (e.g., "apple puree")
  ...timestamps,                                  // createdAt, updatedAt
}, t => [
  index('food_types_user_id_idx').on(t.userId),
]);
```

**Key points**:
- `id`: Client-generated UUID (native PostgreSQL uuid type from migration 0017)
- `userId`: References user to support multi-user isolation
- `name`: Text field with 100-character max (enforced in operations)
- Indexed on `userId` for efficient user-scoped queries

### IndexedDB Type

```typescript
export type LocalFoodType = {
  id: string;                  // UUID
  userId: number;              // Local user ID (Clerk user mapped to local)
  name: string;                // Food name
  createdAt: Date;             // ISO timestamp
  updatedAt: Date;             // ISO timestamp
};
```

## Operations Pattern

Food types follow the **offline-first operations pattern** (same as other activity types).

### Create Food Type

**Location**: `src/services/operations/food-types.ts`

```typescript
export async function createFoodType(
  input: CreateFoodTypeInput,
): Promise<OperationResult<LocalFoodType>>
```

**Steps**:
1. Validate name (non-empty, max 100 chars)
2. Get authenticated user context from `useUserStore`
3. Check for duplicate (case-insensitive)
4. Generate client UUID
5. Write to IndexedDB immediately (optimistic)
6. Add to outbox for server sync
7. Return success with local food type object

**Error handling**:
- Empty name: `"Food name cannot be empty"`
- Too long: `"Food name is too long (max 100 characters)"`
- Duplicate: `"'[name]' already exists"`
- Auth missing: `"Not authenticated"`

### Delete Food Type

```typescript
export async function deleteFoodType(id: string): Promise<OperationResult>
```

**Steps**:
1. Get authenticated user context
2. Verify ownership (userId matches current user)
3. Delete from IndexedDB
4. Add delete mutation to outbox
5. Server sync removes from PostgreSQL

**Permission handling**: Only owner can delete their food types.

## React Hook Integration

### useFoodTypes Hook

**Location**: `src/hooks/useFoodTypes.ts`

```typescript
export function useFoodTypes() {
  const { foodTypes, createFood, deleteFood, isLoading } = useFoodTypes();
  // foodTypes: LocalFoodType[]
  // createFood: (name: string) => Promise<OperationResult>
  // deleteFood: (id: string) => Promise<OperationResult>
  // isLoading: boolean (true while Dexie query runs)
}
```

**Features**:
- **Live reactivity**: Uses Dexie `useLiveQuery` for automatic updates
- **User-scoped**: Queries only current user's food types via `userId` index
- **Optimistic updates**: UI reflects changes immediately, server sync is async
- **Hydration**: `isLoading` is undefined until user context is available

**Usage in UI**:
```typescript
function FoodSelector({ onSelect }: Props) {
  const { foodTypes, createFood, isLoading } = useFoodTypes();

  // Show loading skeleton while hydrating
  if (isLoading) return <Skeleton />;

  return (
    <>
      {foodTypes.map(ft => (
        <Pill key={ft.id}>{ft.name}</Pill>
      ))}
      <AddFood onAdd={createFood} />
    </>
  );
}
```

## Server Sync

### Mutation Handler

**Location**: `src/app/[locale]/api/sync/push/mutations/food-types.ts`

Processes outbox mutations sent by client:
- **create**: Inserts food type to PostgreSQL with client UUID
- **delete**: Marks as deleted in PostgreSQL or removes record

### Apply Handler

**Location**: `src/services/sync/apply/food-types.ts`

Applies server changes during pull sync:
- Reads food_types from server
- Upserts to client IndexedDB (LWW conflict resolution)
- Maintains userId mapping

## Integration with Solids Logging

### FoodPills Component

Displays user's food types as selectable pills in solids modal:

```typescript
// src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/FoodPills.tsx
function FoodPills({ selectedFoodIds, onSelect, onDeselect }: Props) {
  const { foodTypes } = useFoodTypes();
  // Render pillsx for each foodType, track selected state
}
```

### DeleteFoodDialog

Confirmation dialog for deleting food types from library:

```typescript
// src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/DeleteFoodDialog.tsx
function DeleteFoodDialog({ foodId, onConfirm }: Props) {
  const { deleteFood } = useFoodTypes();
  // Confirm and call deleteFood(foodId)
}
```

### Food Input Field

Allows creating new food types on-the-fly:

```typescript
// src/app/[locale]/(auth)/(app)/overview/_components/add-solids-modal/components/FoodInput.tsx
function FoodInput({ onAdd }: Props) {
  const { createFood } = useFoodTypes();
  // Input field with debounced createFood call
}
```

## Validation Rules

**Name validation** (enforced on client, also on server):
- Cannot be empty (trimmed)
- Maximum 100 characters
- Duplicates prevented (case-insensitive)

**Uniqueness scope**: Per user (different users can have same food names)

## Schema Migration (Migration 0017)

Food types table created with native UUID primary key:

```sql
CREATE TABLE "food_types" (
  "id" uuid PRIMARY KEY NOT NULL,
  "user_id" integer NOT NULL REFERENCES "user"("id"),
  "name" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now(),
  "updated_at" timestamp with time zone DEFAULT now()
);

CREATE INDEX food_types_user_id_idx ON "food_types"("user_id");
```

## Gotchas

- **UUID generation**: Client generates UUID via `crypto.randomUUID()` (not server)
- **Offline behavior**: Create/delete work offline and sync when connection returns
- **Duplicate detection**: Case-insensitive, so "Apple" and "apple" are same
- **No soft deletes**: Deleted food types are removed from IndexedDB and PostgreSQL
- **User isolation**: Food types are user-scoped (no sharing across users)
- **Outbox replay**: Stored mutations preserve original UUID payload for idempotency
- **Mixed types in sync**: `sync_events.entity_id` is text to support both integer user IDs and UUID food type IDs

## Related

- `.readme/chunks/feed-logging.schema-design.md` - Database schema patterns
- `.readme/chunks/local-first.outbox-pattern.md` - Offline-first mutation replay
- `.readme/chunks/local-first.delta-sync-api.md` - Server sync handlers
- `.readme/chunks/database.uuid-migration.md` - UUID migration details
