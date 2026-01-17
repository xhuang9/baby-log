'use client';

import type { UIConfigData } from '@/lib/local-db/types/entities';
import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

type SettingsKey = 'timeSwiper' | 'amountSlider';

type SettingsResult<T> = {
  settings: T;
  isLoading: boolean;
  /** Update local state and save with debounce (for sliders) */
  updateSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Update local state and save immediately (for toggles/radios) */
  saveSetting: <K extends keyof T>(key: K, value: T[K]) => void;
  /** Update all settings at once and save with debounce */
  updateSettings: (newSettings: T) => void;
  /** Update all settings at once and save immediately */
  saveSettings: (newSettings: T) => void;
};

/**
 * Generic hook for managing widget settings (TimeSwiper, AmountSlider, etc.)
 *
 * Handles:
 * - Loading settings from IndexedDB on mount
 * - Debounced save for slider interactions
 * - Immediate save for toggle/radio interactions
 * - Toast notifications on save
 *
 * @param settingsKey - Key in UIConfigData ('timeSwiper' | 'amountSlider')
 * @param defaultSettings - Default values for the settings
 */
export function useWidgetSettings<T extends Record<string, unknown>>(
  settingsKey: SettingsKey,
  defaultSettings: T,
): SettingsResult<T> {
  const user = useUserStore(s => s.user);
  const userId = user?.localId;

  const [settings, setSettings] = useState<T>(defaultSettings);
  const [isLoading, setIsLoading] = useState(true);

  const settingsRef = useRef(settings);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Keep ref in sync with state
  useEffect(() => {
    settingsRef.current = settings;
  }, [settings]);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // Load initial values from IndexedDB
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!userId) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const config = await getUIConfig(userId);
        const storedSettings = config.data[settingsKey] as Partial<T> | undefined;

        if (mounted && storedSettings) {
          // Merge stored settings with defaults to ensure all keys exist
          const mergedSettings = { ...defaultSettings };
          for (const key of Object.keys(defaultSettings)) {
            const storedValue = storedSettings[key as keyof T];
            if (storedValue !== undefined) {
              mergedSettings[key as keyof T] = storedValue as T[keyof T];
            }
          }
          setSettings(mergedSettings);
        }
      } catch (error) {
        console.error(`[useWidgetSettings] Failed to load ${settingsKey} settings:`, error);
      } finally {
        if (mounted) {
          setIsLoading(false);
        }
      }
    }

    loadSettings();

    return () => {
      mounted = false;
    };
  }, [userId, settingsKey, defaultSettings]);

  // Save settings to IndexedDB
  const persistSettings = useCallback(
    async (newSettings: T) => {
      if (!userId) {
        return;
      }

      try {
        await updateUIConfig(userId, { [settingsKey]: newSettings } as Partial<UIConfigData>);
        toast.success('Settings updated');
      } catch (error) {
        console.error(`[useWidgetSettings] Failed to save ${settingsKey} settings:`, error);
        toast.error('Failed to save settings');
      }
    },
    [userId, settingsKey],
  );

  // Debounced save (for sliders)
  const debouncedSave = useCallback(
    (newSettings: T) => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      saveTimeoutRef.current = setTimeout(() => {
        persistSettings(newSettings);
      }, 300);
    },
    [persistSettings],
  );

  // Update local state and save with debounce (for sliders)
  const updateSetting = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const newSettings = { ...settingsRef.current, [key]: value };
      setSettings(newSettings);
      settingsRef.current = newSettings;
      debouncedSave(newSettings);
    },
    [debouncedSave],
  );

  // Update local state and save immediately (for toggles/radios)
  const saveSetting = useCallback(
    <K extends keyof T>(key: K, value: T[K]) => {
      const newSettings = { ...settingsRef.current, [key]: value };
      setSettings(newSettings);
      settingsRef.current = newSettings;
      persistSettings(newSettings);
    },
    [persistSettings],
  );

  // Update all settings at once and save with debounce
  const updateSettings = useCallback(
    (newSettings: T) => {
      setSettings(newSettings);
      settingsRef.current = newSettings;
      debouncedSave(newSettings);
    },
    [debouncedSave],
  );

  // Update all settings at once and save immediately
  const saveSettings = useCallback(
    (newSettings: T) => {
      setSettings(newSettings);
      settingsRef.current = newSettings;
      persistSettings(newSettings);
    },
    [persistSettings],
  );

  return {
    settings,
    isLoading,
    updateSetting,
    saveSetting,
    updateSettings,
    saveSettings,
  };
}
