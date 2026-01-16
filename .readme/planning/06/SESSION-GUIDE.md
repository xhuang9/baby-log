# Session Execution Guide

## Quick Start

Tell Claude: "Execute task 01" (or whichever task number).

Claude will:
1. Read only that task file
2. Make the specified changes
3. Run validation if specified

## Recommended Session Flow

### Session A (Config Fixes)

```
Execute tasks 01, 02, 03
```

These are quick edits to `manifest.json` and `next.config.ts`.

### Session B (SW Integration)

```
Execute tasks 04, 05, 06
```

These complete the service worker setup.

### Session C (Validation)

```
pnpm build && pnpm start
# Test offline mode manually
```

### Session D (Structural - if needed)

```
Execute task 07
```

This converts the overview page to IndexedDB reads.

## Commands for Each Task

| Task | One-liner |
|------|-----------|
| 01 | "Fix the manifest start_url to /en/overview" |
| 02 | "Add PWA env toggle in next.config.ts" |
| 03 | "Add offline fallback config" |
| 04 | "Update next-pwa TypeScript types" |
| 05 | "Import offline-auth-sw.js in PWA config" |
| 06 | "Change DB_VERSION to 1 in offline scripts" |
| 07 | "Convert overview page to IndexedDB reads" |

## Batch Execution

To run multiple tasks:

```
Read and execute tasks 01 through 06
```

Claude will process them sequentially.

## Verifying Completion

After all Phase 1 tasks:

```bash
pnpm build && pnpm start
```

Then in browser:
1. Open DevTools → Application → Service Workers
2. Confirm SW is registered
3. Visit /en/overview while online
4. Toggle Network → Offline
5. Reload - expect page to load from cache
