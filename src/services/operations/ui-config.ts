/**
 * UI Config Operations
 *
 * Centralized operations for UI configuration updates.
 * UI config is client-side only and does not sync to server.
 * Operations:
 * 1. Write to IndexedDB immediately
 * 2. No store updates needed (components use useLiveQuery)
 * 3. No server sync (purely client-side preferences)
 */

import type { HandMode, ThemeMode } from '@/lib/local-db';
import { updateUIConfig, updateUIConfigKey } from '@/lib/local-db';
import { useUserStore } from '@/stores/useUserStore';

import {
  failure,
  isClientSide,
  success,
  type OperationResult,
} from './types';

// ============================================================================
// Input Types
// ============================================================================

export type UpdateThemeInput = {
  theme: ThemeMode;
};

export type UpdateHandModeInput = {
  handMode: HandMode;
};

export type UpdateWidgetSettingsInput = {
  widget: 'timeSwiper' | 'amountSlider';
  settings: Record<string, unknown>;
};

// ============================================================================
// UI Config Operations
// ============================================================================

/**
 * Update theme setting
 */
export async function updateTheme(
  input: UpdateThemeInput,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Update IndexedDB
    await updateUIConfig(user.localId, { theme: input.theme });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to update theme',
    );
  }
}

/**
 * Update hand mode setting
 */
export async function updateHandMode(
  input: UpdateHandModeInput,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Update IndexedDB
    await updateUIConfig(user.localId, { handMode: input.handMode });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to update hand mode',
    );
  }
}

/**
 * Update widget settings (time swiper or amount slider)
 */
export async function updateWidgetSettings(
  input: UpdateWidgetSettingsInput,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Update IndexedDB using nested key path
    await updateUIConfig(user.localId, {
      [input.widget]: input.settings,
    });

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to update widget settings',
    );
  }
}

/**
 * Generic operation to update any UI config field by key path
 * Useful for one-off config updates not covered by specific operations
 */
export async function updateUIConfigByKey(
  keyPath: string,
  value: unknown,
): Promise<OperationResult<void>> {
  if (!isClientSide()) {
    return failure('Client-only operation');
  }

  try {
    // Get user context
    const user = useUserStore.getState().user;
    if (!user?.localId) {
      return failure('Not authenticated');
    }

    // Update IndexedDB using dot notation key path
    await updateUIConfigKey(user.localId, keyPath, value);

    return success(undefined);
  } catch (error) {
    return failure(
      error instanceof Error ? error.message : 'Failed to update UI config',
    );
  }
}
