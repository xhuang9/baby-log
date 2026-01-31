---
last_verified_at: 2026-01-31T10:30:00Z
source_paths:
  - src/models/Schema.ts
  - src/lib/local-db/types/logs.ts
  - src/lib/local-db/database.ts
  - migrations/0015_rename_texture_to_consistency.sql
  - src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/components/ConsistencyButtons.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/hooks/useNappyFormState.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/hooks/useNappyFormSubmit.ts
---

# Nappy Logging Refactor: Texture → Consistency (January 2026)

## Purpose

Document the complete refactor renaming the `texture` field to `consistency` throughout the nappy logging system, including schema changes, type updates, UI components, and database migrations.

## Rationale

- **Medical accuracy**: "Consistency" is the clinically recognized term in pediatric assessment
- **Standards alignment**: New values align with Bristol Stool Scale adaptation for neonatal assessment
- **User clarity**: Terminology matches what healthcare providers use

## Changes Made

### 1. PostgreSQL Schema & Enums

**New enum created**: `nappy_consistency_enum`
```sql
CREATE TYPE "nappy_consistency_enum" AS ENUM (
  'watery', 'runny', 'mushy', 'pasty', 'formed', 'hardPellets'
);
```

**Old enum removed**: `nappy_texture_enum` (values: veryRunny, runny, mushy, mucusy, solid, littleBalls)

**Value mapping**:
| Old Value | New Value |
|-----------|-----------|
| veryRunny | watery |
| runny | runny |
| mushy | mushy |
| mucusy | pasty |
| solid | formed |
| littleBalls | hardPellets |

**Schema update** in `src/models/Schema.ts`:
```typescript
export const nappyConsistencyEnum = pgEnum('nappy_consistency_enum', [
  'watery',
  'runny',
  'mushy',
  'pasty',
  'formed',
  'hardPellets',
]);

export const nappyLogSchema = pgTable('nappy_log', {
  // ... other fields ...
  consistency: nappyConsistencyEnum('consistency'), // Replaces: texture
});
```

### 2. TypeScript Types

**File**: `src/lib/local-db/types/logs.ts`

**Changed**:
```typescript
// OLD
export type NappyTexture = 'veryRunny' | 'runny' | 'mushy' | 'mucusy' | 'solid' | 'littleBalls';
export interface LocalNappyLog {
  texture: NappyTexture | null;
}

// NEW
export type NappyConsistency = 'watery' | 'runny' | 'mushy' | 'pasty' | 'formed' | 'hardPellets';
export interface LocalNappyLog {
  consistency: NappyConsistency | null;
}
```

### 3. IndexedDB Migration

**File**: `src/lib/local-db/database.ts`

**Version 2 upgrade handler** automatically migrates local database:

```typescript
db.version(2).stores({
  nappyLogs: '[id], [babyId+startedAt], loggedByUserId',
}).upgrade(tx => {
  tx.table('nappyLogs').toCollection().modify(log => {
    if (log.texture) {
      const textureToConsistency = {
        veryRunny: 'watery',
        runny: 'runny',
        mushy: 'mushy',
        mucusy: 'pasty',
        solid: 'formed',
        littleBalls: 'hardPellets',
      };
      log.consistency = textureToConsistency[log.texture] || null;
      delete log.texture;
    }
  });
});
```

**Key points**:
- Runs automatically on app startup if device has Dexie version < 2
- Preserves all data with value mapping
- Cleans up old `texture` field after migration
- Safe to run multiple times (idempotent)

### 4. PostgreSQL Migration

**File**: `migrations/0015_rename_texture_to_consistency.sql`

**Steps**:
1. Create new enum type `nappy_consistency_enum`
2. Add new column `consistency` to nappy_log table
3. Migrate data using CASE statement with value mapping
4. Drop old `texture` column
5. Drop old `nappy_texture_enum` type

**Execution**:
- Run via `npm run db:migrate` in development
- Automatic on Neon production deploy

**Data integrity**:
- NULL values preserved as-is
- All existing values mapped correctly
- No data loss

### 5. UI Components Update

**ConsistencyButtons Component** (`src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/components/ConsistencyButtons.tsx`):

**Layout** (hand-mode aware):
```typescript
const CONSISTENCIES_ROW_1: { value: NappyConsistency; label: string }[] = [
  { value: 'watery', label: 'Watery' },
  { value: 'runny', label: 'Runny' },
  { value: 'mushy', label: 'Mushy' },
];

const CONSISTENCIES_ROW_2: { value: NappyConsistency; label: string }[] = [
  { value: 'pasty', label: 'Pasty / Sticky' },
  { value: 'formed', label: 'Formed' },
  { value: 'hardPellets', label: 'Hard pellets' },
];
```

**Behavior**:
- Toggle selection (click to select, click again to deselect)
- All 6 buttons organized in 2 rows for mobile ergonomics
- Hand-mode layout support (left/right handed)
- "Pasty / Sticky" label provides clarity (pasty alone is ambiguous)

**Replaced**: Old `TextureButtons` component

### 6. Form State & Submission

**Files**:
- `src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/hooks/useNappyFormState.ts`
- `src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/hooks/useNappyFormSubmit.ts`

**Changes**:
- State hook: `texture` → `consistency`
- Submit types: `CreateNappyLogInput` and `UpdateNappyLogInput` use `consistency` field
- No operation layer changes needed (operations use updated types)

### 7. Sync Layer

**Files affected**:
- `src/app/[locale]/api/sync/push/mutations/nappy-log.ts` - Insert/update/delete handlers
- `src/app/[locale]/api/sync/push/serializers/nappy-log.ts` - Serialization
- `src/services/sync/apply/nappy-log.ts` - Apply mutations from server
- `src/services/initial-sync.ts` - Bootstrap sync handling
- `src/services/sync/conflict.ts` - Conflict resolution

**No changes required** - sync layer already uses deserialized TypeScript types, automatically picks up updated schema.

### 8. Bootstrap & Account Management

**Files**:
- `src/types/bootstrap.ts` - `BootstrapNappyLog` type
- `src/app/[locale]/api/bootstrap/route.ts` - Data mapping
- `src/app/[locale]/(auth)/account/bootstrap/hooks/useBootstrapMachine.ts` - Data initialization

**Changes**:
- Bootstrap types updated to include `colour` and `consistency` fields
- Data mapping updated to serialize all fields correctly
- Account creation/selection now syncs new fields

## Migration Checklist

### For Developers Working on Nappy Features

- [ ] Using `NappyConsistency` type (not old `NappyTexture`)
- [ ] ConsistencyButtons component for UI (not old TextureButtons)
- [ ] Creating nappy logs with `consistency` field (not `texture`)
- [ ] DatabaseQuery reflects latest schema (field name updated)

### For Database Changes

- [ ] Migration 0015 applied to all environments
- [ ] Staging/production Neon instances ran migration
- [ ] IndexedDB upgrade runs on first app load (automatic)
- [ ] No rollback needed unless schema revert required (not recommended)

### For Testing

- [ ] Add nappy log with poo type + consistency = watery → verify saved correctly
- [ ] Edit existing nappy log → change consistency → verify update works
- [ ] Delete with consistency logged → verify sync works
- [ ] Check old nappy logs (created before refactor) → should have null consistency on initial display, then auto-update after sync

## Notes for Future Changes

- If adding new consistency values: update enum in Schema.ts, ConsistencyButtons constants, and UI labels
- If renaming consistency values: create new migration with CASE statement mapping
- Consistency is only shown in UI for `poo` and `mixed` types - other types always have null consistency

## Related Chunks

- `.readme/chunks/feed-logging.nappy-log-feature.md` - Complete nappy logging documentation
- `.readme/chunks/database.uuid-migration.md` - Client-generated UUID pattern
- `.readme/chunks/local-first.operations-layer-pattern.md` - Operations layer for mutations
