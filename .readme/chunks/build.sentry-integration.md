---
last_verified_at: 2026-01-17T11:12:21Z
source_paths:
  - next.config.ts
  - src/instrumentation.ts
  - src/instrumentation-client.ts
  - README.md
  - playwright.config.ts
---

# Sentry Integration (TODO)

## Status
Scaffolding exists, but production setup still needs environment configuration and validation. There are no `sentry.*.config.ts` files; this app uses Next.js instrumentation entrypoints instead.

## Purpose
Capture errors, traces, and replays across client, server, and edge runtimes.

## Current Implementation

### Next.js Build Integration
- `next.config.ts` wraps config with `withSentryConfig` unless `NEXT_PUBLIC_SENTRY_DISABLED` is set.
- Source map upload expects `SENTRY_ORGANIZATION`, `SENTRY_PROJECT`, and `SENTRY_AUTH_TOKEN`.
- `tunnelRoute` is `/monitoring`.

### Runtime Initialization
- `src/instrumentation.ts` initializes Sentry for Node and Edge.
- `src/instrumentation-client.ts` initializes Sentry for the browser with replay, console logging, and tracing integrations.
- Both entrypoints are guarded by `NEXT_PUBLIC_SENTRY_DISABLED`.

### Exposed Hooks
- `onRequestError` uses `Sentry.captureRequestError`.
- `onRouterTransitionStart` uses `Sentry.captureRouterTransitionStart`.

### Test Mode
- Playwright sets `NEXT_PUBLIC_SENTRY_DISABLED: 'true'` to avoid test noise.

## Required Environment Variables

| Variable | Purpose |
|---------|---------|
| `NEXT_PUBLIC_SENTRY_DSN` | Project DSN |
| `SENTRY_ORGANIZATION` | Org slug for source map upload |
| `SENTRY_PROJECT` | Project slug for source map upload |
| `SENTRY_AUTH_TOKEN` | Auth token for CI/hosting uploads |
| `NEXT_PUBLIC_SENTRY_DISABLED` | Skip Sentry in dev/test |

## TODO (Missing Pieces)

- Create a Sentry project and populate required env variables for production.
- Verify `/monitoring` tunnel route does not conflict with middleware or hosting.
- Decide production sampling rates (currently `tracesSampleRate: 1` and replay sampling enabled).

## Usage Patterns

### Exception Catching
Use `Sentry.captureException(error)` for expected error capture points.

### Tracing
Use `Sentry.startSpan` for meaningful user actions or API calls.

```javascript
Sentry.startSpan(
  {
    op: 'ui.click',
    name: 'Feed Log Submit',
  },
  () => {
    submitFeed();
  },
);
```

### Logs
Use `const { logger } = Sentry` to emit structured logs.

```javascript
logger.info('Updated profile', { profileId: 345 });
logger.warn('Rate limit reached', { endpoint: '/api/results' });
```
