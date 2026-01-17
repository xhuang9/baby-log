---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - next.config.ts
  - src/types/next-pwa.d.ts
  - .gitignore
---

# PWA Service Worker Configuration

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Configure `next-pwa` to provide offline support with runtime caching tuned for fonts, assets, and API calls.

## Key Deviations from Standard

- **Dev opt-in**: PWA is disabled in development unless `NEXT_PUBLIC_ENABLE_PWA` is set.
- **Custom runtime caching**: Explicit caching rules for fonts, media, Next.js data, API routes, and fallbacks.

## Architecture / Implementation

### Components
- `next.config.ts` - PWA plugin setup and caching rules.
- `src/types/next-pwa.d.ts` - Type definitions for `next-pwa` options.
- `.gitignore` - Excludes generated service worker artifacts.

### Data Flow
1. `withPWA` wraps the Next.js config.
2. Runtime caching rules define caching strategy per asset type.
3. Service worker artifacts are generated under `public/` on build.

### Code Pattern
```ts
configWithPlugins = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
    && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
  fallbacks: { document: '/offline.html' },
  importScripts: ['/offline-auth-sw.js'],
})(configWithPlugins);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `dest` | `public` | Output directory for the generated service worker.
| `disable` | `NODE_ENV === 'development'` | Disables SW in dev unless `NEXT_PUBLIC_ENABLE_PWA=true`.
| `fallbacks.document` | `/offline.html` | Offline document fallback route.
| `importScripts` | `['/offline-auth-sw.js']` | Extra SW script for offline auth handling.

## Gotchas / Constraints

- **Service worker artifacts**: `/public/sw.js` and Workbox files are gitignored.
- **Runtime caching breadth**: API and `/_next/data` are cached; verify cache behavior when changing routes.

## Testing Notes

- Build and run production (`npm run build && npm start`), then verify SW registration.
- Toggle `NEXT_PUBLIC_ENABLE_PWA=true` in dev to test service worker behavior.

## Related Systems

- `.readme/chunks/performance.pwa-manifest.md` - Manifest and install metadata.
- `.readme/chunks/build.next-config-pattern.md` - Plugin composition order.
