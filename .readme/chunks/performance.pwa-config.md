---
last_verified_at: 2026-01-04T12:00:00Z
source_paths:
  - next.config.ts
  - src/types/next-pwa.d.ts
  - .gitignore
---

# PWA Service Worker Configuration

## Purpose
Implements Progressive Web App functionality using next-pwa with multi-tier caching strategies for offline support and performance optimization.

## Key Deviations from Standard
- **Production-Only**: PWA is explicitly disabled in development (`disable: !isProduction`)
- **Custom Caching Rules**: Five distinct caching strategies based on resource type
- **Long-Term Font Caching**: Google Fonts cached for 365 days with CacheFirst
- **API Fallback**: NetworkFirst with 10s timeout before falling back to cache

## Implementation

### next.config.ts Integration
```typescript
import withPWA from '@ducanh2912/next-pwa';

const isProduction = process.env.NODE_ENV === 'production';

const config = withPWA({
  dest: 'public',
  disable: !isProduction,
  runtimeCaching: [/* strategies */]
})(nextConfig);
```

### Caching Strategies

#### 1. Google Fonts (CacheFirst - 365 days)
**Pattern**: `https://fonts.googleapis.com`, `https://fonts.gstatic.com`
**Rationale**: Fonts rarely change, prioritize cache speed
**Cache Name**: `google-fonts`
**Max Entries**: 20

#### 2. Static Assets (StaleWhileRevalidate - 7-24 hours)
**Pattern**: `/\.(png|jpg|jpeg|svg|gif|webp|ico|woff|woff2|ttf|eot)$/`
**Rationale**: Show cached version immediately, update in background
**Cache Name**: `static-assets`
**Max Entries**: 60

#### 3. App Shell (StaleWhileRevalidate - 24 hours)
**Pattern**: `/\.(js|css)$/`
**Rationale**: Instant load from cache, background update for new versions
**Cache Name**: `app-shell`
**Max Entries**: 50

#### 4. Next.js Data (StaleWhileRevalidate - 24 hours)
**Pattern**: `/_next/data/`
**Rationale**: Instant navigation with background refresh
**Cache Name**: `next-data`
**Max Entries**: 50

#### 5. API Routes (NetworkFirst - 24 hours)
**Pattern**: `/^https?:\/\/.*\/api\//`
**Rationale**: Prioritize fresh data, fallback to cache after 10s timeout
**Cache Name**: `api-cache`
**Network Timeout**: 10000ms
**Max Entries**: 50

#### 6. Pages (NetworkFirst - 24 hours)
**Pattern**: `/^https?:\/\/.*/`
**Rationale**: Fresh content preferred, cache as offline fallback
**Cache Name**: `pages`
**Network Timeout**: 10000ms
**Max Entries**: 50

## Generated Files
On production build, next-pwa generates:
- `public/sw.js` - Service worker
- `public/workbox-*.js` - Workbox runtime files
- `public/sw.js.map` - Source map (gitignored)

## Patterns

### TypeScript Definitions
```typescript
// src/types/next-pwa.d.ts
declare module '@ducanh2912/next-pwa' {
  export default function withPWA(config: {
    dest: string;
    disable?: boolean;
    runtimeCaching?: Array<{/* */}>;
  }): (nextConfig: any) => any;
}
```

### Gitignore Entries
```
# PWA
/public/sw.js
/public/sw.js.map
/public/workbox-*.js
/public/workbox-*.js.map
```

## Gotchas
- **Dev Disabled**: Service worker does NOT run in `npm run dev` - must use `npm run build && npm start` to test PWA
- **Hard Refresh**: During testing, use Chrome DevTools → Application → Clear Storage to force cache refresh
- **HTTPS Required**: PWA only works on localhost or HTTPS domains (not HTTP in production)
- **Update Delay**: Users on cached version may not see updates until background refresh completes

## Testing PWA
```bash
# 1. Build production bundle
npm run build

# 2. Start production server
npm start

# 3. Open Chrome DevTools → Application
# 4. Verify Service Worker registered
# 5. Check "Offline" and reload to test caching
```

## Related
- `.readme/chunks/performance.pwa-manifest.md` - PWA manifest and installation config
- `.readme/chunks/build.next-config-pattern.md` - Next.js config plugin composition
