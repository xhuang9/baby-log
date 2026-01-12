/**
 * UI Config Helper Functions
 *
 * Functions for managing user UI configuration in IndexedDB.
 */

import type { LocalUIConfig } from '../types/entities';
import { localDb } from '../database';

// ============================================================================
// Default Configuration
// ============================================================================

const DEFAULT_UI_CONFIG: Omit<LocalUIConfig, 'userId' | 'updatedAt'> = {
  theme: 'system',
  handMode: 'right',
  defaultLogView: 'all',
  dashboardVisibility: {
    feed: true,
    sleep: true,
    solids: false,
    bath: false,
    activities: false,
  },
};

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Get UI config for a user (creates default if not exists)
 */
export async function getUIConfig(userId: number): Promise<LocalUIConfig> {
  const existing = await localDb.uiConfig.get(userId);
  if (existing) {
    return existing;
  }

  const defaultConfig: LocalUIConfig = {
    userId,
    ...DEFAULT_UI_CONFIG,
    updatedAt: new Date(),
  };
  await localDb.uiConfig.put(defaultConfig);
  return defaultConfig;
}

/**
 * Update UI config
 */
export async function updateUIConfig(
  userId: number,
  updates: Partial<Omit<LocalUIConfig, 'userId' | 'updatedAt'>>,
): Promise<void> {
  const current = await getUIConfig(userId);
  await localDb.uiConfig.put({
    ...current,
    ...updates,
    updatedAt: new Date(),
  });
}

/**
 * Reset UI config to defaults
 */
export async function resetUIConfig(userId: number): Promise<LocalUIConfig> {
  const defaultConfig: LocalUIConfig = {
    userId,
    ...DEFAULT_UI_CONFIG,
    updatedAt: new Date(),
  };
  await localDb.uiConfig.put(defaultConfig);
  return defaultConfig;
}
