# E2E Test Restructure Plan

## Problem Statement

The e2e test suite has **~2,225 lines of test code**, but only **~100 lines actually execute assertions**. Four large files (1,725+ lines) are test scaffolds that don't test anything.

### Current Issues

| Issue | Impact |
|-------|--------|
| ESLint disable (`playwright/expect-expect`) hides empty tests | Tests pass but validate nothing |
| Missing `authenticateTestUser()` fixture | Blocks all authenticated flows |
| All assertions commented out with TODOs | ~200 tests are non-functional |
| No page objects or test utilities | Code duplication, hard to maintain |
| Single large files per feature | Hard to navigate, slow to run |

### Affected Files

| File | Lines | Empty Tests |
|------|-------|-------------|
| `InviteAndAccessRequest.e2e.ts` | 750 | ~40 |
| `MultiBabySelection.e2e.ts` | 535 | ~50 |
| `BabyManagement.e2e.ts` | 470 | ~35 |
| `AccountResolution.e2e.ts` | 321 | ~25 |

---

## Proposed Solution

### Phase 1: Create Test Infrastructure

**Goal:** Build the missing foundation that blocked the original tests.

#### 1.1 Authentication Fixtures (`tests/fixtures/auth.ts`)

```typescript
import { test as base } from '@playwright/test';

type AuthFixtures = {
  authenticatedPage: Page;
  testUser: { email: string; clerkId: string };
};

export const test = base.extend<AuthFixtures>({
  authenticatedPage: async ({ page }, use) => {
    // Mock Clerk session via cookies/localStorage
    await page.context().addCookies([...]);
    await use(page);
  },
  testUser: async ({}, use) => {
    await use({ email: 'test@example.com', clerkId: 'user_test123' });
  },
});
```

#### 1.2 Database Seeding (`tests/fixtures/seed.ts`)

```typescript
export async function seedTestBaby(userId: number): Promise<Baby> { ... }
export async function seedTestInvite(babyId: number, email: string): Promise<Invite> { ... }
export async function cleanupTestData(userId: number): Promise<void> { ... }
```

#### 1.3 Page Objects (`tests/pages/`)

```
tests/pages/
├── BasePage.ts           # Common navigation, waiting helpers
├── BootstrapPage.ts      # /account/bootstrap interactions
├── OverviewPage.ts       # Main dashboard
├── SettingsPage.ts       # Settings flows
└── BabyManagementPage.ts # Baby CRUD operations
```

---

### Phase 2: Restructure Test Files

**Goal:** Split large files into focused, runnable test suites.

#### New Directory Structure

```
tests/
├── e2e/
│   ├── auth/                        # Authentication flows
│   │   ├── sign-in.e2e.ts
│   │   ├── sign-out.e2e.ts
│   │   └── session-recovery.e2e.ts
│   │
│   ├── account/                     # Account management
│   │   ├── bootstrap-routing.e2e.ts    # From AccountResolution
│   │   ├── invite-acceptance.e2e.ts    # From InviteAndAccessRequest
│   │   ├── access-request.e2e.ts       # From InviteAndAccessRequest
│   │   └── access-approval.e2e.ts      # From InviteAndAccessRequest
│   │
│   ├── baby/                        # Baby management
│   │   ├── create-baby.e2e.ts          # From BabyManagement
│   │   ├── edit-baby.e2e.ts            # From BabyManagement
│   │   ├── archive-baby.e2e.ts         # From BabyManagement
│   │   └── baby-selection.e2e.ts       # From MultiBabySelection
│   │
│   ├── monitoring/                  # Keep existing working tests
│   │   ├── sanity.e2e.ts
│   │   └── visual.e2e.ts
│   │
│   └── smoke/                       # Quick validation tests
│       └── critical-paths.e2e.ts
│
├── fixtures/
│   ├── auth.ts
│   ├── seed.ts
│   └── index.ts
│
├── pages/
│   ├── BasePage.ts
│   ├── BootstrapPage.ts
│   └── ...
│
└── utils/
    ├── test-helpers.ts
    └── mock-data.ts
```

#### File Size Guidelines

- **Target:** 100-200 lines per test file
- **Max:** 300 lines (split if exceeding)
- **Rule:** One logical flow per file (e.g., "create baby" not "all baby operations")

---

### Phase 3: Convert Scaffolds to Real Tests

**Goal:** Implement the most critical tests first.

#### Priority Order

1. **P0 - Critical Paths** (implement first)
   - `bootstrap-routing.e2e.ts` - Ensures users land on correct pages
   - `baby-selection.e2e.ts` - Core app flow
   - `create-baby.e2e.ts` - Onboarding requirement

2. **P1 - Core Features** (implement second)
   - `invite-acceptance.e2e.ts`
   - `edit-baby.e2e.ts`
   - `access-request.e2e.ts`

3. **P2 - Edge Cases** (implement last)
   - Error handling scenarios
   - Accessibility tests
   - Responsive design tests

#### Conversion Strategy

For each scaffold test:

1. **Remove ESLint disable** - Re-enable `playwright/expect-expect`
2. **Delete empty tests** - Remove commented-out tests entirely
3. **Keep as spec comments** - Convert TODOs to `test.skip()` or spec file
4. **Implement one flow at a time** - Don't try to fill all at once

---

### Phase 4: Remove Empty Tests

**Goal:** Clean up the codebase.

#### Option A: Delete and Re-implement (Recommended)
- Delete the 4 large scaffold files entirely
- Create new files following the structure above
- Implement tests as fixtures become ready

#### Option B: Convert to Spec Files
- Rename `.e2e.ts` to `.spec.md` or `.todo.ts`
- Keep as documentation of intended test coverage
- Implement in new properly-structured files

#### Option C: Mark as Skipped
- Convert all empty tests to `test.skip('reason', ...)`
- Keeps test titles visible in reports
- Clutters test output

**Recommendation:** Option A - Clean break is easier to maintain.

---

## Implementation Steps

### Step 1: Create Fixtures (Day 1)
```
[ ] Create tests/fixtures/auth.ts with Clerk mocking
[ ] Create tests/fixtures/seed.ts with database helpers
[ ] Create tests/fixtures/index.ts to export all
[ ] Update playwright.config.ts to use custom fixtures
```

### Step 2: Create Page Objects (Day 1-2)
```
[ ] Create tests/pages/BasePage.ts
[ ] Create tests/pages/BootstrapPage.ts
[ ] Create tests/pages/SettingsPage.ts
[ ] Create tests/pages/BabyManagementPage.ts
```

### Step 3: Create Directory Structure (Day 2)
```
[ ] Create tests/e2e/auth/
[ ] Create tests/e2e/account/
[ ] Create tests/e2e/baby/
[ ] Create tests/e2e/monitoring/
[ ] Move existing working tests to monitoring/
```

### Step 4: Implement P0 Tests (Day 2-3)
```
[ ] Implement bootstrap-routing.e2e.ts
[ ] Implement baby-selection.e2e.ts
[ ] Implement create-baby.e2e.ts
```

### Step 5: Clean Up Scaffolds (Day 3)
```
[ ] Delete InviteAndAccessRequest.e2e.ts
[ ] Delete MultiBabySelection.e2e.ts
[ ] Delete BabyManagement.e2e.ts
[ ] Delete AccountResolution.e2e.ts
[ ] Remove ESLint disable from all remaining files
```

### Step 6: Implement P1 Tests (Day 4+)
```
[ ] Implement invite-acceptance.e2e.ts
[ ] Implement edit-baby.e2e.ts
[ ] Implement access-request.e2e.ts
```

---

## Verification

After restructuring, verify:

1. **No empty tests:**
   ```bash
   npm run lint  # Should pass without playwright/expect-expect disables
   ```

2. **Tests actually run:**
   ```bash
   npm run test:e2e -- --reporter=list
   # Should show actual pass/fail, not just "passed" with no assertions
   ```

3. **Reasonable file sizes:**
   ```bash
   wc -l tests/e2e/**/*.ts  # No file > 300 lines
   ```

4. **CI passes:**
   ```bash
   # Verify GitHub Actions workflow completes successfully
   ```

---

## Files to Modify

### Delete
- `tests/e2e/InviteAndAccessRequest.e2e.ts`
- `tests/e2e/MultiBabySelection.e2e.ts`
- `tests/e2e/BabyManagement.e2e.ts`
- `tests/e2e/AccountResolution.e2e.ts`

### Create
- `tests/fixtures/auth.ts`
- `tests/fixtures/seed.ts`
- `tests/fixtures/index.ts`
- `tests/pages/BasePage.ts`
- `tests/pages/BootstrapPage.ts`
- `tests/pages/SettingsPage.ts`
- `tests/e2e/account/bootstrap-routing.e2e.ts`
- `tests/e2e/baby/create-baby.e2e.ts`
- `tests/e2e/baby/baby-selection.e2e.ts`

### Move
- `tests/e2e/Sanity.check.e2e.ts` → `tests/e2e/monitoring/sanity.e2e.ts`
- `tests/e2e/Visual.e2e.ts` → `tests/e2e/monitoring/visual.e2e.ts`
- `tests/e2e/Counter.e2e.ts` → `tests/e2e/smoke/counter.e2e.ts`

### Modify
- `playwright.config.ts` - Update test directory patterns
