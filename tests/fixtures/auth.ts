/**
 * Authentication Fixtures for E2E Tests
 *
 * Provides Playwright fixtures for authenticated test scenarios.
 * Uses Clerk's test mode with mocked sessions.
 *
 * @see https://clerk.com/docs/testing/playwright
 */

import type { Page } from '@playwright/test';
import { test as base } from '@playwright/test';

// Test user types
export type TestUser = {
  id: string;
  clerkId: string;
  email: string;
  firstName: string;
};

// Pre-defined test users for different scenarios
export const TEST_USERS = {
  // User with no babies (new user flow)
  newUser: {
    id: 'test-new-user',
    clerkId: 'user_test_new',
    email: 'new-user@test.example.com',
    firstName: 'New',
  },
  // User with one baby (standard flow)
  singleBabyUser: {
    id: 'test-single-baby',
    clerkId: 'user_test_single',
    email: 'single-baby@test.example.com',
    firstName: 'Single',
  },
  // User with multiple babies (selection flow)
  multiBabyUser: {
    id: 'test-multi-baby',
    clerkId: 'user_test_multi',
    email: 'multi-baby@test.example.com',
    firstName: 'Multi',
  },
  // User with pending invites
  invitedUser: {
    id: 'test-invited',
    clerkId: 'user_test_invited',
    email: 'invited@test.example.com',
    firstName: 'Invited',
  },
  // Baby owner (can manage, invite, etc.)
  ownerUser: {
    id: 'test-owner',
    clerkId: 'user_test_owner',
    email: 'owner@test.example.com',
    firstName: 'Owner',
  },
} as const satisfies Record<string, TestUser>;

// Fixture types
type AuthFixtures = {
  /**
   * Authenticate as a specific test user
   * Usage: await authenticateAs(page, TEST_USERS.singleBabyUser)
   */
  authenticateAs: (page: Page, user: TestUser) => Promise<void>;

  /**
   * Clear authentication state
   */
  clearAuth: (page: Page) => Promise<void>;
};

/**
 * Extended test with authentication fixtures
 */
export const test = base.extend<AuthFixtures>({
  authenticateAs: async (_, use) => {
    const authenticate = async (page: Page, user: TestUser) => {
      // Set Clerk test session cookie
      // In test mode, Clerk accepts a special cookie format
      await page.context().addCookies([
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
        },
        {
          name: '__clerk_db_jwt',
          value: `test_${user.clerkId}`,
          domain: 'localhost',
          path: '/',
          httpOnly: true,
          secure: false,
          sameSite: 'Lax',
        },
      ]);

      // Set localStorage for client-side Clerk state
      await page.addInitScript((userData) => {
        localStorage.setItem('clerk-user', JSON.stringify(userData));
      }, user);
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(authenticate);
  },

  clearAuth: async (_, use) => {
    const clear = async (page: Page) => {
      await page.context().clearCookies();
      await page.evaluate(() => {
        localStorage.removeItem('clerk-user');
        sessionStorage.clear();
      });
    };

    // eslint-disable-next-line react-hooks/rules-of-hooks
    await use(clear);
  },
});

export { expect } from '@playwright/test';
