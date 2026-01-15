/**
 * UI Config Helper Functions
 *
 * Functions for managing user UI configuration in IndexedDB.
 * Uses flexible JSON structure with per-key timestamps for LWW merge.
 */

import type { LocalUIConfig, UIConfigData } from '../types/entities';
import { localDb } from '../database';
import { DEFAULT_UI_CONFIG_DATA } from '../types/entities';

// ============================================================================
// Constants
// ============================================================================

const CURRENT_SCHEMA_VERSION = 1;

// ============================================================================
// Helper Utilities
// ============================================================================

/**
 * Get a nested value from an object using dot notation path
 */
function getNestedValue(obj: Record<string, unknown>, path: string): unknown {
  return path.split('.').reduce((acc, key) => {
    if (acc && typeof acc === 'object' && key in acc) {
      return (acc as Record<string, unknown>)[key];
    }
    return undefined;
  }, obj as unknown);
}

/**
 * Set a nested value in an object using dot notation path
 */
function setNestedValue(obj: Record<string, unknown>, path: string, value: unknown): void {
  const keys = path.split('.');
  const lastKey = keys.pop();
  if (!lastKey) {
    return;
  }

  let current = obj;
  for (const key of keys) {
    if (!(key in current) || typeof current[key] !== 'object' || current[key] === null) {
      current[key] = {};
    }
    current = current[key] as Record<string, unknown>;
  }
  current[lastKey] = value;
}

/**
 * Generate key paths for all leaf values in an object
 */
function getKeyPaths(obj: Record<string, unknown>, prefix = ''): string[] {
  const paths: string[] = [];
  for (const key of Object.keys(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    const value = obj[key];
    if (value && typeof value === 'object' && !Array.isArray(value)) {
      paths.push(...getKeyPaths(value as Record<string, unknown>, path));
    } else {
      paths.push(path);
    }
  }
  return paths;
}

// ============================================================================
// Core Helper Functions
// ============================================================================

/**
 * Get UI config for a user (creates default if not exists)
 */
export async function getUIConfig(userId: number): Promise<LocalUIConfig> {
  const existing = await localDb.uiConfig.get(userId);
  if (existing) {
    // Ensure data has all default values merged in (for new fields added later)
    return {
      ...existing,
      data: { ...DEFAULT_UI_CONFIG_DATA, ...existing.data },
    };
  }

  // Create default config
  const now = new Date();
  const timestamp = now.toISOString();

  // Generate keyUpdatedAt for all default keys
  const keyPaths = getKeyPaths(DEFAULT_UI_CONFIG_DATA);
  const keyUpdatedAt: Record<string, string> = {};
  for (const path of keyPaths) {
    keyUpdatedAt[path] = timestamp;
  }

  const defaultConfig: LocalUIConfig = {
    userId,
    data: { ...DEFAULT_UI_CONFIG_DATA },
    keyUpdatedAt,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: now,
  };

  await localDb.uiConfig.put(defaultConfig);
  return defaultConfig;
}

/**
 * Update specific keys in UI config
 * Automatically updates keyUpdatedAt for each changed key
 */
export async function updateUIConfig(
  userId: number,
  updates: Partial<UIConfigData>,
): Promise<LocalUIConfig> {
  const current = await getUIConfig(userId);
  const now = new Date();
  const timestamp = now.toISOString();

  // Merge updates into data
  const newData = { ...current.data };
  const newKeyUpdatedAt = { ...current.keyUpdatedAt };

  // Process each update and track key paths
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined) {
      if (typeof value === 'object' && value !== null && !Array.isArray(value)) {
        // For nested objects, merge and update each nested key
        const existingNested = (newData[key] ?? {}) as Record<string, unknown>;
        const mergedNested = { ...existingNested, ...value };
        newData[key] = mergedNested;

        // Update keyUpdatedAt for each nested key
        for (const nestedKey of Object.keys(value as object)) {
          newKeyUpdatedAt[`${key}.${nestedKey}`] = timestamp;
        }
      } else {
        // Simple value
        newData[key] = value;
        newKeyUpdatedAt[key] = timestamp;
      }
    }
  }

  const updated: LocalUIConfig = {
    ...current,
    data: newData,
    keyUpdatedAt: newKeyUpdatedAt,
    updatedAt: now,
  };

  await localDb.uiConfig.put(updated);
  return updated;
}

/**
 * Update a single key in UI config using dot notation
 * e.g., updateUIConfigKey(userId, 'timeSwiper.swipeSpeed', 1.5)
 */
export async function updateUIConfigKey(
  userId: number,
  keyPath: string,
  value: unknown,
): Promise<LocalUIConfig> {
  const current = await getUIConfig(userId);
  const now = new Date();
  const timestamp = now.toISOString();

  const newData = { ...current.data } as Record<string, unknown>;
  setNestedValue(newData, keyPath, value);

  const newKeyUpdatedAt = { ...current.keyUpdatedAt, [keyPath]: timestamp };

  const updated: LocalUIConfig = {
    ...current,
    data: newData as UIConfigData,
    keyUpdatedAt: newKeyUpdatedAt,
    updatedAt: now,
  };

  await localDb.uiConfig.put(updated);
  return updated;
}

/**
 * Get a specific value from UI config using dot notation
 */
export async function getUIConfigValue<T = unknown>(
  userId: number,
  keyPath: string,
): Promise<T | undefined> {
  const config = await getUIConfig(userId);
  return getNestedValue(config.data as Record<string, unknown>, keyPath) as T | undefined;
}

/**
 * Reset UI config to defaults
 */
export async function resetUIConfig(userId: number): Promise<LocalUIConfig> {
  const now = new Date();
  const timestamp = now.toISOString();

  // Generate keyUpdatedAt for all default keys
  const keyPaths = getKeyPaths(DEFAULT_UI_CONFIG_DATA);
  const keyUpdatedAt: Record<string, string> = {};
  for (const path of keyPaths) {
    keyUpdatedAt[path] = timestamp;
  }

  const defaultConfig: LocalUIConfig = {
    userId,
    data: { ...DEFAULT_UI_CONFIG_DATA },
    keyUpdatedAt,
    schemaVersion: CURRENT_SCHEMA_VERSION,
    updatedAt: now,
  };

  await localDb.uiConfig.put(defaultConfig);
  return defaultConfig;
}

/**
 * Delete UI config for a user (used during logout cleanup)
 */
export async function deleteUIConfig(userId: number): Promise<void> {
  await localDb.uiConfig.delete(userId);
}

// ============================================================================
// Sync-Related Helpers
// ============================================================================

/**
 * Get the raw UI config without merging defaults
 * Used for sync operations where we need the exact stored state
 */
export async function getRawUIConfig(userId: number): Promise<LocalUIConfig | undefined> {
  return localDb.uiConfig.get(userId);
}

/**
 * Replace UI config entirely (used when receiving from server)
 */
export async function replaceUIConfig(config: LocalUIConfig): Promise<void> {
  await localDb.uiConfig.put(config);
}

/**
 * Merge remote UI config with local using per-key LWW
 * Returns the merged config
 */
export async function mergeUIConfig(
  userId: number,
  remoteData: UIConfigData,
  remoteKeyUpdatedAt: Record<string, string>,
): Promise<LocalUIConfig> {
  const local = await getUIConfig(userId);
  const now = new Date();

  const mergedData = { ...local.data } as Record<string, unknown>;
  const mergedKeyUpdatedAt = { ...local.keyUpdatedAt };

  // For each key in remote, check if it's newer
  for (const [keyPath, remoteTimestamp] of Object.entries(remoteKeyUpdatedAt)) {
    const localTimestamp = local.keyUpdatedAt[keyPath];

    if (!localTimestamp || remoteTimestamp > localTimestamp) {
      // Remote is newer, take remote value
      const remoteValue = getNestedValue(remoteData as Record<string, unknown>, keyPath);
      setNestedValue(mergedData, keyPath, remoteValue);
      mergedKeyUpdatedAt[keyPath] = remoteTimestamp;
    }
    // If local is newer or equal, keep local value (already in mergedData)
  }

  const merged: LocalUIConfig = {
    ...local,
    data: mergedData as UIConfigData,
    keyUpdatedAt: mergedKeyUpdatedAt,
    updatedAt: now,
  };

  await localDb.uiConfig.put(merged);
  return merged;
}
