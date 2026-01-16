# Task 02: Add PWA Environment Toggle

**Status:** [ ] Not started

## Problem

PWA is disabled in development (`disable: process.env.NODE_ENV === 'development'`), so service worker never registers during dev testing.

## Fix

Add env toggle to allow enabling PWA in dev mode when needed.

## File to Edit

`next.config.ts`

## Exact Change

Find line 32:
```typescript
disable: process.env.NODE_ENV === 'development',
```

Replace with:
```typescript
disable: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
```

## Checklist

- [ ] Edit `next.config.ts` line 32
- [ ] Add the env toggle condition

## Usage

After this change:
- Normal dev: `pnpm dev` (PWA disabled as before)
- Test PWA in dev: `NEXT_PUBLIC_ENABLE_PWA=true pnpm dev`
- Production: `pnpm build && pnpm start` (PWA always enabled)

## Notes

- `NEXT_PUBLIC_` prefix makes the var available client-side
- No .env file change needed - pass via command line when testing
