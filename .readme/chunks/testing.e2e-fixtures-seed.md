---
last_verified_at: 2026-01-14T00:00:00Z
source_paths:
  - tests/fixtures/seed.ts
  - tests/fixtures/index.ts
---

# E2E Database Seeding Fixtures

## Purpose
Provides helpers to seed test data into the in-memory database via API routes or direct database access.

## Key Deviations from Standard
- Uses test-only API endpoints for seeding (not production routes)
- Requires special `x-test-seed: true` header for security
- Supports isolated test data via unique test IDs
- Works with in-memory PGlite database

## Implementation

### File: `tests/fixtures/seed.ts`

Exports:
- `seedTestBaby(page, data)` - Create a baby record
- `seedBabyAccess(page, data)` - Grant user access to a baby
- `seedTestInvite(page, data)` - Create a pending invite
- `cleanupTestData(page, testId)` - Delete test data
- `generateTestId()` - Generate unique test ID

## Seeding Functions

### `seedTestBaby(page, data)`
Creates a baby record via `/api/test/seed/baby` endpoint.

**Parameters:**
```typescript
{
  name: string;              // Required
  birthDate?: string | null; // ISO date string, optional
  gender?: 'male' | 'female' | null;
}
```

**Returns:** `TestBaby` object with generated `id`

**Usage:**
```typescript
import { seedTestBaby } from '@/tests/fixtures';

const baby = await seedTestBaby(page, {
  name: 'Test Baby',
  birthDate: '2024-01-15',
  gender: 'female',
});

console.log(baby.id); // Use in other seeding calls
```

### `seedBabyAccess(page, data)`
Grants a user access to a baby.

**Parameters:**
```typescript
{
  oduserId: number;          // User's ODUS ID (not Clerk ID)
  babyId: number;            // Baby's database ID
  accessLevel: 'owner' | 'caregiver' | 'viewer';
  caregiverLabel?: string;   // Optional label for caregivers
}
```

**Usage:**
```typescript
import { seedBabyAccess } from '@/tests/fixtures';

await seedBabyAccess(page, {
  oduserId: 1,
  babyId: baby.id,
  accessLevel: 'caregiver',
  caregiverLabel: 'Grandma',
});
```

### `seedTestInvite(page, data)`
Creates a pending invite for a baby.

**Parameters:**
```typescript
{
  babyId: number;
  inviteeEmail: string;
  accessLevel: 'caregiver' | 'viewer';
}
```

**Usage:**
```typescript
import { seedTestInvite } from '@/tests/fixtures';

await seedTestInvite(page, {
  babyId: baby.id,
  inviteeEmail: 'invited@test.example.com',
  accessLevel: 'caregiver',
});
```

### `cleanupTestData(page, testId)`
Deletes all data associated with a test ID.

**Usage:**
```typescript
import { cleanupTestData, generateTestId } from '@/tests/fixtures';

test('isolated test', async ({ page }) => {
  const testId = generateTestId();

  // Seed data tagged with testId
  // ...

  // Cleanup after test
  await cleanupTestData(page, testId);
});
```

## Test API Endpoints

### Security Pattern
All seeding endpoints require the `x-test-seed: true` header:

```typescript
const response = await page.request.post('/api/test/seed/baby', {
  data: { name: 'Test Baby' },
  headers: {
    'x-test-seed': 'true', // Required
  },
});
```

**API routes must validate this header:**
```typescript
// app/api/test/seed/baby/route.ts
export async function POST(request: Request) {
  if (request.headers.get('x-test-seed') !== 'true') {
    return new Response('Forbidden', { status: 403 });
  }
  // ... seeding logic
}
```

### Expected Endpoints

These endpoints must be implemented for seeding to work:

- `POST /api/test/seed/baby` - Create baby
- `POST /api/test/seed/baby-access` - Grant access
- `POST /api/test/seed/invite` - Create invite
- `DELETE /api/test/cleanup` - Delete test data by testId

**Note:** These endpoints should be disabled in production (check `NODE_ENV`).

## Patterns

### Full Test Setup with Authentication and Seeding

```typescript
import { test, expect, TEST_USERS } from '@/tests/fixtures';
import { seedTestBaby, seedBabyAccess } from '@/tests/fixtures';

test('user with one baby', async ({ page, authenticateAs }) => {
  // 1. Seed database
  const baby = await seedTestBaby(page, {
    name: 'Test Baby',
    birthDate: '2024-01-15',
  });

  await seedBabyAccess(page, {
    oduserId: 1, // Matches TEST_USERS.singleBabyUser.id
    babyId: baby.id,
    accessLevel: 'owner',
  });

  // 2. Authenticate
  await authenticateAs(page, TEST_USERS.singleBabyUser);

  // 3. Test
  await page.goto('/overview');
  await expect(page.getByText('Test Baby')).toBeVisible();
});
```

### Test Isolation with Test IDs

```typescript
import { generateTestId, cleanupTestData } from '@/tests/fixtures';

test('isolated data', async ({ page }) => {
  const testId = generateTestId(); // 'test-1705234567890-abc123'

  try {
    // Seed data with testId in metadata
    const baby = await seedTestBaby(page, {
      name: `Baby ${testId}`,
    });

    // ... test logic

  } finally {
    // Always cleanup
    await cleanupTestData(page, testId);
  }
});
```

### Reusable Test Data Setup

```typescript
// tests/helpers/setup-user-with-baby.ts
export async function setupUserWithBaby(page: Page, user: TestUser) {
  const baby = await seedTestBaby(page, {
    name: `${user.firstName}'s Baby`,
    birthDate: '2024-01-15',
  });

  await seedBabyAccess(page, {
    oduserId: parseInt(user.id.replace('test-', '')),
    babyId: baby.id,
    accessLevel: 'owner',
  });

  return { baby };
}

// In test
test('scenario', async ({ page, authenticateAs }) => {
  const { baby } = await setupUserWithBaby(page, TEST_USERS.singleBabyUser);
  await authenticateAs(page, TEST_USERS.singleBabyUser);
  // ...
});
```

## Gotchas

- **Test API routes not implemented yet**: The seeding functions reference API routes that need to be created
- **User ID mapping**: Must map Clerk user IDs to ODUS user IDs correctly
- **Production safety**: Test API routes MUST check `NODE_ENV !== 'production'`
- **Cleanup failures**: Cleanup errors are logged but don't fail tests (graceful degradation)
- **In-memory database**: All data is lost when test run ends, cleanup is optional but good practice
- **Parallel tests**: Use test IDs or per-test randomization for isolation

## Related
- `.readme/chunks/testing.e2e-fixtures-auth.md` - Authentication fixtures
- `.readme/chunks/testing.playwright-e2e.md` - E2E testing overview
- `.readme/chunks/database.pglite-local.md` - In-memory database
