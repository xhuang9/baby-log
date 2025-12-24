# Playwright E2E testing (this repo)

## Current setup
- Tests live in `tests/` and match `*.spec.ts` and `*.e2e.ts`.
- `playwright.config.ts` starts:
  - in-memory PGlite (`db-server:memory`)
  - Next.js server (`dev:next` locally, `start` on CI)
- Sentry is disabled during E2E via `NEXT_PUBLIC_SENTRY_DISABLED=true`.

## Key files
- Playwright config: `playwright.config.ts`
  ```ts
  export default defineConfig({
    testDir: './tests',
    testMatch: '*.@(spec|e2e).?(c|m)[jt]s?(x)',
    webServer: {
      command: process.env.CI
        ? 'npx run-p db-server:memory start'
        : 'npx run-p db-server:memory dev:next',
      env: { NEXT_PUBLIC_SENTRY_DISABLED: 'true' },
    },
  });
  ```
- E2E tests: `tests/e2e/*.e2e.ts`
- Integration tests: `tests/integration/*.spec.ts`
- Example API uses `x-e2e-random-id`: `src/app/[locale]/api/counter/route.ts`
  ```ts
  const id = Number((await headers()).get('x-e2e-random-id')) || 0;
  ```

## How to use
- Run E2E: `npm run test:e2e`
- For isolated test data per run, add the `x-e2e-random-id` header when calling API routes.
  ```ts
  import { test } from '@playwright/test';

  test('isolated counter', async ({ context, page }) => {
    const randomId = `${Date.now()}`;
    await context.route('**/api/counter', async (route) => {
      await route.continue({
        headers: { ...route.request().headers(), 'x-e2e-random-id': randomId },
      });
    });

    await page.goto('/counter');
  });
  ```

## Resources
- https://playwright.dev/docs/test-intro
- https://playwright.dev/docs/test-webserver
