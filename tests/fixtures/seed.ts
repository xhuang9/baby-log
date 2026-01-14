/**
 * Database Seeding Fixtures for E2E Tests
 *
 * Provides helpers to seed test data via API or direct database access.
 * Uses the in-memory PGlite database configured in playwright.config.ts.
 */

import type { Page } from '@playwright/test';

// Types matching the app's schema
export type TestBaby = {
  id: number;
  name: string;
  birthDate: string | null;
  gender: 'male' | 'female' | null;
  ownerUserId: number;
};

export type TestBabyAccess = {
  oduserId: number;
  babyId: number;
  accessLevel: 'owner' | 'caregiver' | 'viewer';
  caregiverLabel: string | null;
};

export type TestInvite = {
  id: number;
  babyId: number;
  inviteeEmail: string;
  accessLevel: 'caregiver' | 'viewer';
  status: 'pending' | 'accepted' | 'rejected';
};

/**
 * Seed a test baby via the test API endpoint
 *
 * Note: This requires a test-only API route to be available.
 * In production, this route should be disabled.
 */
export async function seedTestBaby(
  page: Page,
  data: Partial<TestBaby> & { name: string },
): Promise<TestBaby> {
  const response = await page.request.post('/api/test/seed/baby', {
    data: {
      name: data.name,
      birthDate: data.birthDate ?? null,
      gender: data.gender ?? null,
    },
    headers: {
      'x-test-seed': 'true',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed baby: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Seed baby access for a user
 */
export async function seedBabyAccess(
  page: Page,
  data: {
    oduserId: number;
    babyId: number;
    accessLevel: 'owner' | 'caregiver' | 'viewer';
    caregiverLabel?: string;
  },
): Promise<TestBabyAccess> {
  const response = await page.request.post('/api/test/seed/baby-access', {
    data,
    headers: {
      'x-test-seed': 'true',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed baby access: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Seed a test invite
 */
export async function seedTestInvite(
  page: Page,
  data: {
    babyId: number;
    inviteeEmail: string;
    accessLevel: 'caregiver' | 'viewer';
  },
): Promise<TestInvite> {
  const response = await page.request.post('/api/test/seed/invite', {
    data,
    headers: {
      'x-test-seed': 'true',
    },
  });

  if (!response.ok()) {
    throw new Error(`Failed to seed invite: ${await response.text()}`);
  }

  return response.json();
}

/**
 * Clean up all test data for a specific test run
 *
 * Uses a test ID to isolate data between parallel test runs.
 */
export async function cleanupTestData(
  page: Page,
  testId: string,
): Promise<void> {
  const response = await page.request.delete('/api/test/cleanup', {
    data: { testId },
    headers: {
      'x-test-seed': 'true',
    },
  });

  if (!response.ok()) {
    console.warn(`Failed to cleanup test data: ${await response.text()}`);
  }
}

/**
 * Generate a unique test ID for data isolation
 */
export function generateTestId(): string {
  return `test-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}
