# Task 05: Import Offline Auth Service Worker

**Status:** [x] Complete

## Problem

`public/offline-auth-sw.js` exists but is not imported into the generated service worker. The file header says it "must be imported by the main SW" but `workboxOptions.importScripts` is not configured.

## Fix

Add `workboxOptions` to PWA config to import the offline auth script.

## File to Edit

`next.config.ts`

## Exact Change

In the `withPWA` config block, add `workboxOptions` after `fallbacks`:

```typescript
configWithPlugins = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development' && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
  register: true,
  skipWaiting: true,
  fallbacks: {
    document: '/offline.html',
  },
  workboxOptions: {
    importScripts: ['/offline-auth-sw.js'],
  },
  runtimeCaching: [
    // ... existing caching config
```

## Checklist

- [x] Open `next.config.ts`
- [x] Find the `fallbacks` block (added in Task 03)
- [x] Add `importScripts` configuration (flattened, not nested in workboxOptions)
- [x] Install babel-loader dependencies for PWA build
- [x] Update type definitions to include `importScripts` at top level
- [x] Build and verify importScripts in generated sw.js

## Validation

After building:
```bash
pnpm build
# Check generated SW includes import
grep importScripts public/sw.js
# Should show: importScripts('/offline-auth-sw.js')
```

## Notes

- Requires Task 04 (types) to be done first to avoid TS errors
- The offline-auth-sw.js handles protected route navigation when offline
- It reads auth session from IndexedDB to determine if user can access cached pages

## Implementation Notes

- `importScripts` must be at the top level of the PWA config, not nested under `workboxOptions`
- Required installing `babel-loader`, `@babel/core`, and `@babel/preset-env` as dev dependencies
- Used `@ts-expect-error` comment to suppress TypeScript error since the property exists at runtime
- Verified in generated `public/sw.js`: `importScripts("fallback-yNqnUWlCRmqEF8Rl6_X4P.js","/offline-auth-sw.js")`
