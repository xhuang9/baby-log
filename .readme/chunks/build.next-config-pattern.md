---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - next.config.ts
  - src/lib/env.ts
---

# Next.js Configuration Pattern

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Compose Next.js plugins (next-intl, PWA, bundle analyzer, Sentry) with environment-driven toggles and shared base config.

## Key Deviations from Standard

- **Side-effect env validation**: `next.config.ts` imports `src/lib/env.ts` to validate required environment variables at build time.
- **Always-on PWA wrapper**: `withPWA` wraps the config and internally disables itself in dev unless `NEXT_PUBLIC_ENABLE_PWA` is set.

## Architecture / Implementation

### Components
- `next.config.ts` - Base config and plugin composition.
- `src/lib/env.ts` - Environment validation via `@t3-oss/env-nextjs`.

### Data Flow
1. Base config defines shared Next.js settings.
2. `createNextIntlPlugin` wraps config for i18n routing.
3. `withPWA` applies runtime caching and offline fallbacks.
4. Bundle analyzer and Sentry wrap the config conditionally.

### Code Pattern
```ts
let configWithPlugins = createNextIntlPlugin('./src/lib/i18n.ts')(baseConfig);
configWithPlugins = withPWA({
  dest: 'public',
  disable: process.env.NODE_ENV === 'development'
    && process.env.NEXT_PUBLIC_ENABLE_PWA !== 'true',
})(configWithPlugins);
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `NEXT_PUBLIC_ENABLE_PWA` | `false` | Enables PWA in development when set to `true`.
| `ANALYZE` | `false` | Enables bundle analyzer when set to `true`.
| `NEXT_PUBLIC_SENTRY_DISABLED` | `undefined` | When set, skips Sentry config wrapping.
| `outputFileTracingIncludes['/']` | `./migrations/**/*` | Ensures migrations are bundled for serverless output.

## Gotchas / Constraints

- **PWA caching is broad**: Runtime caching includes API routes and `_next` data; verify cache rules before changing.
- **Sentry tunnel route**: `tunnelRoute: '/monitoring'` must not conflict with middleware rewrites.

## Testing Notes

- Run `ANALYZE=true npm run build` and confirm analyzer opens.
- Toggle `NEXT_PUBLIC_ENABLE_PWA` in dev and verify service worker registration.

## Related Systems

- `.readme/chunks/performance.pwa-config.md` - PWA runtime cache details.
- `.readme/chunks/i18n.routing-integration.md` - next-intl plugin behavior.
