---
last_verified_at: 2026-02-04T15:45:00Z
source_paths:
  - src/models/Schema.ts
  - src/lib/local-db/types/logs.ts
  - src/lib/local-db/database.ts
  - src/lib/local-db/helpers/pumping-logs.ts
  - src/services/operations/pumping-log.ts
  - src/app/[locale]/api/sync/push/mutations/pumping-log.ts
  - src/services/sync/apply/pumping-log.ts
---

# Pumping Log Feature

## Purpose

Complete pumping log implementation for tracking breast milk expression (pumping) sessions with dual amount tracking modes (left/right sides or total volume) and time range capture. Fully integrated with local-first sync pattern and caregiver attribution.

## Key Deviations from Standard

- **Dual Amount Modes**: Supports both per-side tracking (leftMl/rightMl) and total volume (totalMl) in same log entry. Total mode sets both sides to null.
- **UUID Primary Keys**: Client-generated UUIDs for idempotent create operations and immediate local persistence.
- **Time Range Capture**: Optional endedAt timestamp for session duration tracking (unlike instant events like nappy).
- **Access Control**: Logged by user attributes tracked; only editors/owners can log pumping sessions.

## Architecture

### Database Schema (Postgres)

```
pumpingLogSchema (pumping_log):
- id: UUID (primary key, client-generated)
- babyId: integer (foreign key → babies)
- loggedByUserId: integer (foreign key → user)
- startedAt: timestamp (required, with timezone)
- endedAt: timestamp (optional, with timezone)
- leftMl: integer (optional, null in Total mode)
- rightMl: integer (optional, null in Total mode)
- totalMl: integer (required, always set)
- notes: text (optional)
- createdAt/updatedAt: automatic timestamps

Index: [babyId + startedAt] for efficient range queries
```

### Local Database (IndexedDB)

```
LocalPumpingLog type matches PostgreSQL schema with Date objects:
- startedAt: Date
- endedAt: Date | null
- All other fields match server

Dexie table config:
  pumpingLogs: 'id, babyId, startedAt, [babyId+startedAt]'
```

## Implementation Details

### Amount Modes

**Left/Right Mode**:
- User provides leftMl and rightMl values separately
- totalMl = leftMl + rightMl (calculated on server or client)
- UI shows two separate amount inputs with side toggle

**Total Mode**:
- User provides single totalMl value
- leftMl and rightMl remain null
- Useful for quick single-input logging

Mode is toggled via AmountModeToggle component before saving.

### Time Handling

- **startedAt**: When pumping session began (required)
- **endedAt**: When pumping session ended (optional)
  - If provided, enables duration display
  - Used with DualTimeSwiper for start/end time selection
  - Can cross midnight: DualTimeSwiper handles validation

Duration is calculated as: `endTime - startTime` in minutes

### Operations Layer

All CRUD operations follow local-first pattern:

1. **Create**: Write to IndexedDB → Enqueue to outbox → Trigger sync
2. **Update**: Update IndexedDB → Enqueue to outbox → Trigger sync
3. **Delete**: Remove from IndexedDB → Enqueue to outbox → Trigger sync

Each operation:
- Validates user access (editors/owners only)
- Checks baby access permissions
- Generates mutation ID for idempotent sync
- Returns success/failure result

### Sync Operations

**Push Sync** (`processPumpingLogMutation`):
- Validates mutation operation (create/update/delete)
- Writes to PostgreSQL database
- Handles Last-Write-Wins conflict resolution on update
- Writes sync event for pull subscribers

**Pull Sync** (`applyPumpingLogChange`):
- Deserializes server data to LocalPumpingLog
- Saves to IndexedDB via helpers
- Ensures data consistency across devices

## Related Sections

- `.readme/sections/feed-logging.index.md` - Full feed logging system
- `.readme/sections/local-first.index.md` - Sync and operations patterns
- `.readme/sections/database.index.md` - Database schema and migrations
