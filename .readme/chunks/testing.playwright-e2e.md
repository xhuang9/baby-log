---
last_verified_at: 2026-01-17T09:12:39Z
source_paths:
  - playwright.config.ts
  - tests/
  - package.json
---

# Playwright E2E Testing

> Status: active
> Last updated: 2026-01-17
> Owner: QA

## Purpose

Run Playwright E2E tests against a local Next.js server backed by an in-memory PGlite database.

## Key Deviations from Standard

- **PGlite in-memory DB**: `db-server:memory` runs migrations before tests.
- **Chromium-only locally**: Firefox runs only in CI.

## Architecture / Implementation

### Components
- `playwright.config.ts` - Test runner configuration and webServer lifecycle.
- `tests/` - E2E + spec tests.
- `package.json` - `test:e2e` script and helper commands.

### Data Flow
1. `npm run test:e2e` starts the web server (`db-server:memory` + Next.js).
2. Playwright runs tests under `tests/` using `baseURL`.
3. Server shuts down after the run.

### Code Pattern
```ts
webServer: {
  command: process.env.CI
    ? 'npx run-p db-server:memory start'
    : 'npx run-p db-server:memory dev:next',
  url: baseURL,
  env: { NEXT_PUBLIC_SENTRY_DISABLED: 'true' },
}
```

## Configuration

| Setting | Default | Description |
|---------|---------|-------------|
| `testMatch` | `*.@(spec|e2e).*` | Matches spec + e2e files in `tests/`.
| `timeout` | `60s` | Per-test timeout (DB startup is slower).
| `projects` | `chromium` | Firefox added only when `CI` is set.
| `baseURL` | `http://localhost:${PORT}` | Base URL for all tests.

## Gotchas / Constraints

- **Sentry disabled**: `NEXT_PUBLIC_SENTRY_DISABLED` is forced in webServer env.
- **Reuse server locally**: `reuseExistingServer` is `true` outside CI.

## Testing Notes

- Run `npm run test:e2e` for local execution.
- Set `PORT` to change the base URL used by Playwright.

## Related Systems

- `.readme/chunks/testing.e2e-test-organization.md` - Test directory layout.
- `.readme/chunks/database.pglite-local.md` - In-memory DB setup.
