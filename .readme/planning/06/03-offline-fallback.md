# Task 03: Add Offline Fallback Page

**Status:** [ ] Not started

## Problem

No fallback configured when cache + network both fail. Users see browser's generic offline error.

## Fix

Configure `fallbacks` in PWA config to serve `offline.html`.

## File to Edit

`next.config.ts`

## Exact Change

Find the `withPWA` config block (starts around line 30). Add `fallbacks` after `skipWaiting: true,`:

```typescript
configWithPlugins = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline.html',
  },
  runtimeCaching: [
    // ... existing caching config
```

## Checklist

- [ ] Open `next.config.ts`
- [ ] Find line 34 (after `skipWaiting: true,`)
- [ ] Add fallbacks config before `runtimeCaching`

## Notes

- `offline.html` already exists in `public/`
- This is a `next-pwa` feature that works with Workbox
- The TypeScript types may complain - Task 04 fixes this
