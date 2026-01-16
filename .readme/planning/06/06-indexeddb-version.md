# Task 06: Align IndexedDB Version Numbers

**Status:** [x] Complete

## Problem

Version mismatch between Dexie (v1) and offline scripts (v4):
- `src/lib/local-db/database.ts`: Dexie uses version **1**
- `public/offline-auth-sw.js`: Uses `DB_VERSION = 4`
- `public/offline.html`: Uses `DB_VERSION = 4`

This causes `VersionError` when the SW tries to open a DB at v4 that Dexie created at v1.

## Fix

Change offline scripts to use version **1** (matching Dexie).

## Files to Edit

### 1. `public/offline-auth-sw.js`

Line 16:
```diff
- const DB_VERSION = 4;
+ const DB_VERSION = 1;
```

### 2. `public/offline.html`

Line 139:
```diff
- const DB_VERSION = 4;
+ const DB_VERSION = 1;
```

## Checklist

- [x] Edit `public/offline-auth-sw.js` line 16
- [x] Change `DB_VERSION = 4` to `DB_VERSION = 1`
- [x] Edit `public/offline.html` line 139
- [x] Change `DB_VERSION = 4` to `DB_VERSION = 1`
- [x] Verified both files use DB_VERSION = 1

## Validation

```bash
# Check both files
grep DB_VERSION public/offline-auth-sw.js public/offline.html
# Both should show: const DB_VERSION = 1;
```

## Notes

- Dexie manages schema migrations internally
- The offline scripts just read from the DB, they don't define schema
- Using version 1 lets them open whatever version Dexie created
- If Dexie schema changes later, update offline scripts to match

## Why v1 not v4?

Dexie's `database.ts` line 60 shows:
```typescript
this.version(1).stores({...})
```

Dexie is the source of truth for schema. Offline scripts must match.
