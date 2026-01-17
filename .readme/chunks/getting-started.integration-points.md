---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - src/lib/env.ts
  - src/config/app.ts
  - next.config.ts
---

# Key Integration Points

> Status: active
> Last updated: 2026-01-17
> Owner: Core

## Purpose

Outline the core third-party integrations that are enforced by build-time config and environment validation.

## Key Deviations from Standard

- **Env validation at build**: `src/lib/env.ts` runs via side-effect import in `next.config.ts` to fail fast on missing keys.
- **PWA integration baked in**: `next-pwa` is always wrapped; dev builds can opt in via env flag.

## Architecture / Implementation

### Components
- `src/lib/env.ts` - Zod-backed validation for required env keys.
- `src/config/app.ts` - App metadata and Clerk localization resources.
- `next.config.ts` - Plugin composition (next-intl, PWA, bundle analyzer, Sentry).

### Data Flow
1. Next config imports `src/lib/env.ts` to validate env at build.
2. `next-intl` plugin wires locale routing.
3. PWA and Sentry are configured from environment variables.

### Code Pattern
```ts
import './src/lib/env';

if (!process.env.NEXT_PUBLIC_SENTRY_DISABLED) {
  configWithPlugins = withSentryConfig(configWithPlugins, { /* ... */ });
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `CLERK_SECRET_KEY` | `required` | Server key for Clerk authentication.
| `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` | `required` | Client key for Clerk.
| `DATABASE_URL` | `required` | Primary database connection string.
| `NEXT_PUBLIC_ENABLE_PWA` | `false` | Enables service worker in development.
| `SENTRY_ORGANIZATION` | `required` | Sentry org used by `withSentryConfig`.
| `SENTRY_PROJECT` | `required` | Sentry project used by `withSentryConfig`.

## Gotchas / Constraints

- **Env mismatch**: Missing required env keys will fail builds because `src/lib/env.ts` runs during config evaluation.
- **Sentry toggle**: `NEXT_PUBLIC_SENTRY_DISABLED` prevents Sentry plugin wrapping.

## Testing Notes

- Remove a required env var and confirm the build fails early.
- Enable `NEXT_PUBLIC_ENABLE_PWA=true` in dev and verify service worker registration.

## Related Systems

- `.readme/chunks/build.next-config-pattern.md` - Next.js plugin chain details.
- `.readme/chunks/i18n.routing-integration.md` - Locale routing configuration.
