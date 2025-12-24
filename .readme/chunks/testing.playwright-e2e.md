# Playwright E2E Testing

## Purpose
End-to-end testing with real browser automation using in-memory database for isolation.

## Key Deviations from Standard
- Uses in-memory PGlite database (not shared database)
- Parallel execution with `run-p` (database + dev server)
- Tests run against local dev server, not production build
- Chromium only in dev, Chromium + Firefox in CI
- Sentry disabled during tests

## Test File Patterns

### Location: `tests/` directory
- `*.spec.ts` - Integration tests
- `*.e2e.ts` - End-to-end tests
- `*.check.e2e.ts` - Checkly monitoring tests (run in production)

### Example E2E Test
```typescript
// tests/home.e2e.ts
import { expect, test } from '@playwright/test';

test.describe('Homepage', () => {
  test('should display welcome message', async ({ page }) => {
    await page.goto('/');
    await expect(page.getByText('Welcome')).toBeVisible();
  });
});
```

## Test Execution

### Command: `npm run test:e2e`
Runs: `playwright test`

### What Happens:
1. Playwright config starts `webServer`:
   ```bash
   npx run-p db-server:memory dev:next
   ```
2. In-memory database starts
3. Migrations apply automatically
4. Next.js dev server starts
5. Tests run against `http://localhost:3000`
6. Servers shut down after tests

## Playwright Configuration

### File: `playwright.config.ts`
```typescript
export default defineConfig({
  testDir: './tests',
  testMatch: '*.@(spec|e2e).?(c|m)[jt]s?(x)',
  timeout: 60 * 1000, // 60s (PGlite connections slower)

  webServer: {
    command: process.env.CI
      ? 'npx run-p db-server:memory start'      // CI: production build
      : 'npx run-p db-server:memory dev:next',  // Dev: dev server
    url: 'http://localhost:3000',
    timeout: 2 * 60 * 1000,
    reuseExistingServer: !process.env.CI,
    env: {
      NEXT_PUBLIC_SENTRY_DISABLED: 'true', // Disable Sentry in tests
    },
  },

  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    ...(process.env.CI ? [
      { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    ] : []),
  ],
});
```

## Database Isolation

### In-Memory Database Per Test Run
- Each test run gets fresh database
- No data pollution between runs
- Fast (no network I/O)
- Auto-destroyed after tests

### Custom Headers for Isolation
Use `x-e2e-random-id` header for per-test data isolation:

```typescript
// tests/counter.e2e.ts
test('increments counter', async ({ page, context }) => {
  const randomId = Math.floor(Math.random() * 1000000);

  await context.route('**/api/counter', async (route) => {
    await route.continue({
      headers: {
        ...route.request().headers(),
        'x-e2e-random-id': String(randomId),
      },
    });
  });

  await page.goto('/counter');
  // Each test has isolated counter row in database
});
```

API route reads header:
```typescript
const id = Number((await headers()).get('x-e2e-random-id')) || 0;
```

## Important Patterns

### Page Navigation
```typescript
await page.goto('/');
await page.goto('/about');
await page.goto('/fr/about'); // Locale-specific
```

### User Interactions
```typescript
await page.getByRole('button', { name: /submit/i }).click();
await page.getByLabel('Email').fill('user@example.com');
await page.getByPlaceholder('Password').type('secret123');
```

### Assertions
```typescript
await expect(page.getByText('Success')).toBeVisible();
await expect(page).toHaveURL('/dashboard');
await expect(page).toHaveTitle(/Dashboard/);
```

### Authentication Testing
```typescript
test('requires authentication', async ({ page }) => {
  await page.goto('/dashboard');
  // Should redirect to sign-in
  await expect(page).toHaveURL(/sign-in/);
});
```

### Locale Testing
```typescript
test('displays French content', async ({ page }) => {
  await page.goto('/fr/about');
  await expect(page.getByText('À propos')).toBeVisible();
});
```

## CI vs Local Differences

### Local Development
- Chromium only
- Reuses existing server if running
- Video recording on failure only
- Trace on failure only

### CI Environment
- Chromium + Firefox
- Always starts fresh server
- Video recording on failure
- Trace always enabled
- Uses production build (`npm start`)

## Gotchas / Constraints

- Tests slower than unit tests (real browser + database)
- 60-second timeout (database connections take time)
- Must wait for database + server before tests start
- In-memory database resets between runs (no state persistence)
- Parallel tests share same database (use `x-e2e-random-id` for isolation)
- Sentry disabled to avoid test noise in error tracking

## Related Systems
- `.readme/chunks/database.pglite-local.md` - In-memory database
- `.readme/chunks/testing.checkly-monitoring.md` - Production monitoring tests
- `.readme/chunks/testing.vitest-dual-mode.md` - Unit/UI testing
