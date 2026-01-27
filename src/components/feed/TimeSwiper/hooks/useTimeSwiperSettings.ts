import type { SettingsHookResult } from '../types';
import type { TimeSwiperSettingsState } from '@/components/settings';
import { useCallback, useEffect, useState } from 'react';

import { DEFAULT_TIME_SWIPER_SETTINGS } from '@/components/settings';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';

/**
 * Hook to manage TimeSwiper settings with IndexedDB persistence.
 */
export function useTimeSwiperSettings(
  userId: number | undefined,
  isHydrated: boolean,
): SettingsHookResult {
  const [settings, setSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from IndexedDB (wait for store hydration)
  useEffect(() => {
    if (!isHydrated || !userId) {
      return;
    }

    let mounted = true;
    async function loadSettings() {
      try {
        const config = await getUIConfig(userId!);

        if (mounted) {
          const loadedSettings = {
            use24Hour: config.data.timeSwiper?.use24Hour ?? DEFAULT_TIME_SWIPER_SETTINGS.use24Hour,
            swipeSpeed: config.data.timeSwiper?.swipeSpeed ?? DEFAULT_TIME_SWIPER_SETTINGS.swipeSpeed,
            incrementMinutes: config.data.timeSwiper?.incrementMinutes ?? DEFAULT_TIME_SWIPER_SETTINGS.incrementMinutes,
            magneticFeel: config.data.timeSwiper?.magneticFeel ?? DEFAULT_TIME_SWIPER_SETTINGS.magneticFeel,
            showCurrentTime: config.data.timeSwiper?.showCurrentTime ?? DEFAULT_TIME_SWIPER_SETTINGS.showCurrentTime,
            markerMode: config.data.timeSwiper?.markerMode ?? DEFAULT_TIME_SWIPER_SETTINGS.markerMode,
          };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
        }
      } catch (e) {
        console.error('[TimeSwiper] Failed to load settings:', e);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [isHydrated, userId]);

  // Check if settings have changed
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Settings handlers for the panel
  const updateSetting = useCallback(<K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  const saveSetting = useCallback(<K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  // Save settings to IndexedDB (or just close if no changes)
  const handleSave = useCallback(async () => {
    // If no changes, just close
    if (!isDirty) {
      setSettingsOpen(false);
      return;
    }

    // If no userId, can't save to DB but still close
    if (!userId) {
      setSettingsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUIConfig(userId, { timeSwiper: settings });
      setSavedSettings(settings);
      setSettingsOpen(false);
    } catch (e) {
      console.error('[TimeSwiper] Failed to save settings:', e);
    } finally {
      setIsSaving(false);
    }
  }, [userId, settings, isDirty]);

  // Reset settings to saved values and close
  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
    setSettingsOpen(false);
  }, [savedSettings]);

  return {
    settings,
    savedSettings,
    settingsOpen,
    setSettingsOpen,
    isSaving,
    isDirty,
    updateSetting,
    saveSetting,
    handleSave,
    handleCancel,
  };
}
