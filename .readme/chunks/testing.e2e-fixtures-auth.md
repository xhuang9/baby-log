---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - tests/fixtures/auth.ts
  - tests/fixtures/index.ts
---

# E2E Authentication Fixtures

## Purpose
Provides Playwright fixtures for authenticated test scenarios using Clerk test mode with mocked sessions.

## Key Deviations from Standard
- Custom Playwright fixtures extending base test
- Predefined test users for different account states
- Cookie-based authentication mocking (no real Clerk API calls)
- Supports multiple user scenarios without database seeding

## Implementation

### File: `tests/fixtures/auth.ts`

Exports:
- `TEST_USERS` - Predefined test users for different scenarios
- `test` - Extended Playwright test with auth fixtures
- `expect` - Re-exported from Playwright

### Test User Scenarios

```typescript
export const TEST_USERS = {
  newUser: {
    id: 'test-new-user',
    clerkId: 'user_test_new',
    email: 'new-user@test.example.com',
    firstName: 'New',
  },
  singleBabyUser: {
    id: 'test-single-baby',
    clerkId: 'user_test_single',
    email: 'single-baby@test.example.com',
    firstName: 'Single',
  },
  multiBabyUser: {
    id: 'test-multi-baby',
    clerkId: 'user_test_multi',
    email: 'multi-baby@test.example.com',
    firstName: 'Multi',
  },
  invitedUser: {
    id: 'test-invited',
    clerkId: 'user_test_invited',
    email: 'invited@test.example.com',
    firstName: 'Invited',
  },
  ownerUser: {
    id: 'test-owner',
    clerkId: 'user_test_owner',
    email: 'owner@test.example.com',
    firstName: 'Owner',
  },
} as const satisfies Record<string, TestUser>;
```

**Notes:**
- Each user has `id`, `clerkId`, `email`, and `firstName` fields
- Uses `as const satisfies` for type safety and const assertion
- `newUser`: No babies, triggers onboarding flow
- `singleBabyUser`: One baby, standard flow
- `multiBabyUser`: Multiple babies, selection flow
- `invitedUser`: Has pending invites
- `ownerUser`: Baby owner, full permissions

### Authentication Fixtures

#### `authenticateAs(page, user)`
Authenticates a test user by setting cookies and localStorage:
- Sets `__session` cookie with user data
- Sets `__clerk_db_jwt` cookie with test token
- Injects `clerk-user` into localStorage

**Usage:**
```typescript
import { test, expect, TEST_USERS } from '@/tests/fixtures';

test('authenticated user flow', async ({ page, authenticateAs }) => {
  await authenticateAs(page, TEST_USERS.singleBabyUser);
  await page.goto('/overview');
  // User is now authenticated
});
```

#### `clearAuth(page)`
Clears all authentication state:
- Clears cookies
- Removes localStorage and sessionStorage

**Usage:**
```typescript
test('logout flow', async ({ page, clearAuth }) => {
  await clearAuth(page);
  await page.goto('/overview');
  // Should redirect to sign-in
});
```

## Authentication Mechanism

### Clerk Test Mode
The fixtures work with Clerk's test mode:
1. Set special cookie format that Clerk recognizes in test environments
2. Inject client-side state into localStorage
3. No network calls to Clerk API
4. Fast, deterministic authentication

### Cookie Structure
```typescript
{
  name: '__session',
  value: JSON.stringify({
    userId: user.clerkId,
    email: user.email,
    firstName: user.firstName,
  }),
  domain: 'localhost',
  path: '/',
  httpOnly: true,
  secure: false,
  sameSite: 'Lax',
}
```

## Patterns

### Extending Test Users
To add a new test user scenario:

```typescript
export const TEST_USERS = {
  // ... existing users
  customScenario: {
    id: 'test-custom',
    clerkId: 'user_test_custom',
    email: 'custom@test.example.com',
    firstName: 'Custom',
  },
} as const satisfies Record<string, TestUser>;
```

### Per-Test Authentication
```typescript
test('requires specific user', async ({ page, authenticateAs }) => {
  // Start unauthenticated
  await page.goto('/');

  // Authenticate mid-test
  await authenticateAs(page, TEST_USERS.newUser);
  await page.goto('/account/bootstrap');

  // Now authenticated
});
```

### Testing Multi-User Scenarios
```typescript
test('user switching', async ({ page, authenticateAs, clearAuth }) => {
  // First user
  await authenticateAs(page, TEST_USERS.ownerUser);
  await page.goto('/overview');

  // Switch users
  await clearAuth(page);
  await authenticateAs(page, TEST_USERS.invitedUser);
  await page.goto('/overview');
});
```

## Gotchas

- **Clerk publishable key required**: Tests need `NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY` in env
- **Test mode must be enabled**: Clerk project must have test mode enabled
- **Cookie domain**: Cookies set for `localhost`, adjust for different test domains
- **No real user creation**: These are mocked users, not real Clerk accounts
- **Database linkage**: TEST_USERS use IDs that match seeded database records (see `testing.e2e-fixtures-seed.md`)

## Related
- `.readme/chunks/testing.e2e-fixtures-seed.md` - Database seeding fixtures
- `.readme/chunks/testing.e2e-page-objects.md` - Page object models
- `.readme/chunks/authentication.clerk-setup.md` - Clerk configuration
