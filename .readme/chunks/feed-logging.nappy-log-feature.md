---
last_verified_at: 2026-01-31T10:30:00Z
source_paths:
  - src/models/Schema.ts
  - src/lib/local-db/types/logs.ts
  - src/lib/local-db/database.ts
  - src/app/[locale]/api/sync/push/mutations/nappy-log.ts
  - src/app/[locale]/api/sync/push/serializers/nappy-log.ts
  - src/services/sync/apply/nappy-log.ts
  - src/services/initial-sync.ts
  - src/services/sync/conflict.ts
  - src/lib/local-db/nappy-logs.ts
  - src/app/[locale]/(auth)/(app)/logs/_components/NappyTile.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/
  - src/app/[locale]/(auth)/(app)/logs/_components/edit-modals/EditNappyModal.tsx
  - migrations/0015_rename_texture_to_consistency.sql
---

# Nappy Log Feature

## Purpose

Complete logging system for nappy (diaper) changes following the same patterns as feed and sleep logging. Tracks type (wee/poo/mixed/dry), optional notes, and caregiver attribution. Integrates with local-first sync and timeline display.

## Feature Overview

Nappy logs are instant events (no duration) recording when a baby's diaper was changed. Supports:

- **Quick entry**: TimeSwiper for time selection, 4 pill buttons for type
- **Optional notes**: Free-text field for additional context
- **Edit/delete**: Full modification with confirmation dialogs
- **Caregiver tracking**: Records which user logged the change
- **Offline support**: Local-first with sync
- **Timeline display**: Grouped in activity logs with other logs

## Database Schema

```typescript
export const nappyLogSchema = pgTable('nappy_log', {
  id: text('id').primaryKey(),                              // Client-generated UUID
  babyId: integer('baby_id').references(() => babiesSchema.id).notNull(),
  loggedByUserId: integer('logged_by_user_id').references(() => userSchema.id).notNull(),
  type: nappyTypeEnum('type'),                              // 'wee' | 'poo' | 'mixed' | 'dry' | 'clean' | null
  colour: nappyColourEnum('colour'),                        // colour - nullable, only for poo/mixed
  consistency: nappyConsistencyEnum('consistency'),         // consistency - nullable, only for poo/mixed
  startedAt: timestamp('started_at', { withTimezone: true }).notNull().defaultNow(),
  notes: text('notes'),                                     // Optional notes
  ...timestamps,                                            // createdAt, updatedAt
}, t => [
  index('nappy_log_baby_started_at_idx').on(t.babyId, t.startedAt),
]);

export const nappyTypeEnum = pgEnum('nappy_type_enum', [
  'wee',
  'poo',
  'mixed',
  'dry',
  'clean',
]);

export const nappyColourEnum = pgEnum('nappy_colour_enum', [
  'green',
  'yellow',
  'brown',
  'black',
  'red',
  'grey',
]);

export const nappyConsistencyEnum = pgEnum('nappy_consistency_enum', [
  'watery',
  'runny',
  'mushy',
  'pasty',
  'formed',
  'hardPellets',
]);
```

**Key decisions**:
- `id` is client-generated UUID (see `.readme/chunks/database.uuid-migration.md`)
- `type` is nullable to allow "diaper change" events without specifying type
- `colour` and `consistency` are nullable, only shown in UI for `poo` and `mixed` types
- `startedAt` defaults to current time for convenience in UI
- Index on `(baby_id, started_at)` enables efficient timeline queries

## Nappy Types & Additional Fields

### Type Field
- **wee**: Urination only (no colour/consistency fields shown)
- **poo**: Defecation only (colour and consistency fields shown)
- **mixed**: Both urination and defecation (colour and consistency fields shown)
- **dry**: Clean diaper change (no output) (no colour/consistency fields shown)
- **clean**: Alternative label for dry diaper (no colour/consistency fields shown)

### Colour Field (Poo/Mixed Only)
Used to track stool colour as health indicator:
- **green**: Green stool (may indicate infection or imbalance)
- **yellow**: Yellow stool (normal range)
- **brown**: Brown stool (healthy)
- **black**: Black/tarry stool (meconium or potentially serious)
- **red**: Red stool (may indicate blood or alarming)
- **grey**: Grey stool (pale/chalky, potential issues)

### Consistency Field (Poo/Mixed Only)
Renamed from `texture` to `consistency` (January 2026). Tracks stool consistency as digestive health indicator:

**New consistency values**:
- **watery**: Liquid, no form
- **runny**: Loose but with some structure
- **mushy**: Soft, easily broken apart
- **pasty**: Sticky, pasty texture (also labeled "Pasty / Sticky" in UI)
- **formed**: Well-formed stool
- **hardPellets**: Pellet-like, hard stool

**Migration mapping** (from old `texture` field):
| Old Value | New Value |
|-----------|-----------|
| veryRunny | watery |
| runny | runny |
| mushy | mushy |
| mucusy | pasty |
| solid | formed |
| littleBalls | hardPellets |

**Why the rename?**
The term "consistency" is more medically accurate and clinically recognized. The new values align better with standard neonatal assessment scales (Bristol Stool Scale adaptation).

## TypeScript Types

From `src/lib/local-db/types/logs.ts`:

```typescript
export type NappyType = 'wee' | 'poo' | 'mixed' | 'dry' | 'clean';
export type NappyColour = 'green' | 'yellow' | 'brown' | 'black' | 'red' | 'grey';
export type NappyConsistency = 'watery' | 'runny' | 'mushy' | 'pasty' | 'formed' | 'hardPellets';

export interface LocalNappyLog {
  id: string;
  babyId: number;
  loggedByUserId: number;
  type: NappyType | null;
  colour: NappyColour | null;
  consistency: NappyConsistency | null;
  startedAt: Date;
  notes: string | null;
  createdAt: Date;
  updatedAt: Date;
}
```

## IndexedDB Schema & Migration

In `src/lib/local-db/database.ts`:

**Version 2 upgrade handler** migrates `texture` → `consistency`:
```typescript
db.version(2).stores({
  nappyLogs: '[id], [babyId+startedAt], loggedByUserId',
}).upgrade(tx => {
  tx.table('nappyLogs').toCollection().modify(log => {
    // Migrate texture field to consistency with value mapping
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

In `src/lib/local-db/nappy-logs.ts`:

```typescript
db.nappyLogs.bulkPut(logRecords);
db.nappyLogs.where('babyId').equals(babyId)
  .and(log => log.startedAt >= minTime)
  .toArray();
```

Uses indexes: `[babyId, startedAt]` for efficient timeline queries.

## Mutation Handlers

### Server-Side Processing

From `src/app/[locale]/api/sync/push/mutations/nappy-log.ts`:

**Create Operation**:
```typescript
await db.insert(nappyLogSchema).values({
  id: payload.id as string,           // Client UUID
  babyId,
  loggedByUserId: userId,
  type: payload.type as NappyType,
  startedAt: new Date(payload.startedAt),
  notes: payload.notes as string | null,
});

await writeSyncEvent({
  babyId,
  entityType: 'nappy_log',
  entityId: inserted!.id,
  op: 'create',
  payload: serializeNappyLog(inserted!),
});
```

**Update Operation**:
- LWW conflict detection via `serverUpdatedAt > clientUpdatedAt`
- Server data returned on conflict for client resolution
- Sync event recorded for pull-based sync

**Delete Operation**:
- Soft-delete pattern (physical removal, sync event recorded)
- Idempotent (deleting non-existent record returns success)

## Serialization

Nappy logs serialized to JSON for sync_events payload:

```typescript
{
  id: "550e8400-e29b-41d4-a716-446655440000",
  type: "poo",
  colour: "brown",
  consistency: "formed",
  startedAt: "2026-01-28T14:32:00Z",
  notes: "Healthy output",
  loggedByUserId: 5,
  babyId: 3,
  createdAt: "2026-01-28T14:32:00Z",
  updatedAt: "2026-01-28T14:32:00Z"
}
```

**Serializer location**: `src/app/[locale]/api/sync/push/serializers/nappy-log.ts`

All three fields (`type`, `colour`, `consistency`) are included even when null for consistency with sync protocol.

## UI Components

### AddNappyModal (Add Mode)

Full-screen bottom sheet modal located at `src/app/[locale]/(auth)/(app)/overview/_components/add-nappy-modal/AddNappyModal.tsx`:

**Fields**:
1. **TimeSwiper** - Time selection with label "Start" (time selection with -7 to +1 day constraint)
2. **NappyTypeButtons** - 5 pill buttons: Wee, Poo, Mixed, Dry, Clean (toggle behavior: click to select, click again to deselect)
3. **ColourButtons** (conditional) - Only shown for `poo` and `mixed` types. 6 options: Green, Yellow, Brown, Black, Red, Grey (toggle-selectable)
4. **ConsistencyButtons** (conditional) - Only shown for `poo` and `mixed` types. 6 options in 2 rows:
   - Row 1: Watery, Runny, Mushy
   - Row 2: Pasty / Sticky, Formed, Hard pellets (toggle-selectable)
5. **NotesField** - Optional textarea with placeholder: "Anything unusual? (Mucus, Blood, Black/tarry, Pale/white, Straining)"
6. **FormFooter** - Save / Cancel buttons

**Key interactions**:
- Hand-mode ergonomics (all controls accessible one-handed, buttons wrap and justify for left/right hand)
- Submit clears form and closes sheet on success
- Type change clears colour/consistency if switching to Wee or Clean
- All fields except type and notes are optional

**Component structure** (modular):
- `AddNappyModal.tsx` - Orchestrator
- `components/NappyTypeButtons.tsx` - Type selection
- `components/ColourButtons.tsx` - Colour selection (6 options)
- `components/ConsistencyButtons.tsx` - Consistency selection (6 options)
- `hooks/useNappyFormState.ts` - State management
- `hooks/useNappyFormSubmit.ts` - Submit logic and operations
- `hooks/useInitializeNappyForm.ts` - Hand-mode detection

### EditNappyModal (Edit/Delete Mode)

Full-screen modal at `src/app/[locale]/(auth)/(app)/logs/_components/edit-modals/EditNappyModal.tsx`:

**Fields** (pre-filled from existing log):
- TimeSwiper (same as Add)
- NappyTypeButtons
- ColourButtons (conditional, same rules)
- ConsistencyButtons (conditional, same rules)
- NotesField
- Delete button with confirmation dialog

**Key differences from Add**:
- All fields pre-populated with current log data
- Delete action with confirmation
- Submission updates existing record

### NappyTile (Timeline Display)

Timeline tile for logs page displaying:
- Icon representing type (wee → droplet, poo → custom, mixed → both, dry/clean → dash)
- Time display ("2h 15m ago")
- Colour indicator (small colored dot if colour logged, only for poo/mixed)
- Consistency label if logged (only for poo/mixed) - formatted with `formatConsistencyLabel()` function
- Optional notes preview
- Edit/delete via long-press or swipe gesture

**Consistency label formatting**:
```typescript
const formatConsistencyLabel = (consistency: NappyConsistency): string => {
  const labels: Record<NappyConsistency, string> = {
    watery: 'Watery',
    runny: 'Runny',
    mushy: 'Mushy',
    pasty: 'Pasty / Sticky',
    formed: 'Formed',
    hardPellets: 'Hard pellets',
  };
  return labels[consistency] || consistency;
};
```

## Timeline Display Default

Nappy logs are instant events (no duration). Timeline display defaults to **15-minute span** (vs. 1-hour for sleep, 2-hour for feed):

**Why 15 minutes?**
- Diaper changes are typically 5-10 minute events
- Need visibility of context before/after (5 minutes each)
- Prevents excessive zoom to see single point events

**Implementation**:
- Set in logs page timeline query:
  ```typescript
  const timelineStart = baseTime.minus({ minutes: 7.5 });
  const timelineEnd = baseTime.plus({ minutes: 7.5 });
  ```

## Server Actions

No dedicated server action (uses sync mutations instead). All operations go through:
- Local IndexedDB write
- Outbox enqueue (mutation record)
- Background sync to `/api/sync/push`

This follows the operations layer pattern documented in `.readme/chunks/local-first.operations-layer-pattern.md`.

## Activity Filtering

Nappy logs filterable in logs page by type:

```typescript
const filteredLogs = logs.filter(log => {
  if (activeType && log.type !== activeType) return false;
  return true;
});
```

Filter controls in logs page UI: buttons for Wee / Poo / Mixed / Dry / All.

## Sync Integration

Full delta sync support:

- **Entity type**: `'nappy_log'` in sync_events
- **Operations**: create, update, delete
- **Conflicts**: LWW via `updatedAt` timestamp
- **Idempotency**: Entity ID + operation ID ensures replays are safe
- **Caregiver sync**: Changes visible to all caregivers with access within seconds

## Gotchas & Important Notes

- **Type nullability**: `type` column is nullable; UI always provides value, but API accepts null
- **Colour/consistency nullability**: Both fields are nullable and only shown in UI for `poo`/`mixed` types. Wee/dry/clean logs will never have these fields populated
- **Field clearing on type change**: Switching type from poo/mixed to wee/clean automatically clears colour and consistency in AddNappyModal. This is intentional UX design - non-poo types shouldn't have stool descriptors
- **Notes length**: No server-side validation on notes length; client should cap input (recommend 500 char max)
- **Consistency migration**: Old `texture` field values are mapped to `consistency` via IndexedDB upgrade and PostgreSQL migration. Both handled automatically
- **Instant event timeline**: Default 15-minute span is hardcoded; changing requires UI config
- **Caregiver attribution**: `loggedByUserId` is immutable after creation; edit doesn't change who logged it
- **Time constraints**: TimeSwiper constrains time to -7 days to +1 day (shared constraint with feed/sleep)
- **Toggle behavior**: All button groups (type, colour, consistency) use toggle behavior - clicking again deselects. This means type is technically nullable in UI even though schema enforces it at sync time
- **Colour tokens**: Colour options (green/yellow/brown/etc.) are hardcoded in component; if adding new colours, update both CONSISTENCIES_ROW_1/2 constants and colour enum in schema

## Related

- `.readme/chunks/ui-patterns.activity-modals.md` - Modal architecture and patterns
- `.readme/chunks/feed-logging.timeswiper-date-range.md` - TimeSwiper constraints
- `.readme/chunks/local-first.operations-layer-pattern.md` - Operations layer for mutations
- `.readme/chunks/feed-logging.activity-logs-page.md` - Logs page integration
- `.readme/chunks/database.uuid-migration.md` - UUID primary keys
