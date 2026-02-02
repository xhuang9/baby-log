'use client';

import type { SwipeResistance, TimeSwiperSettingsState } from '@/components/settings';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_TIME_SWIPER_SETTINGS } from '@/components/settings';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

/**
 * Migrate legacy magneticFeel boolean to swipeResistance
 */
function migrateSwipeResistance(
  swipeResistance: SwipeResistance | undefined,
  magneticFeel: boolean | undefined,
): SwipeResistance {
  // If new swipeResistance is set, use it
  if (swipeResistance) {
    return swipeResistance;
  }
  // Migrate from old magneticFeel boolean
  if (magneticFeel !== undefined) {
    return magneticFeel ? 'sticky' : 'default';
  }
  // Default
  return DEFAULT_TIME_SWIPER_SETTINGS.swipeResistance;
}

export function useTimeSwiperSettings() {
  const user = useUserStore(s => s.user);
  const userId = user?.localId;
  const isHydrated = useUserStore(s => s.isHydrated);

  const [settings, setSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<TimeSwiperSettingsState>(DEFAULT_TIME_SWIPER_SETTINGS);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from IndexedDB
  useEffect(() => {
    if (!isHydrated || !userId) {
      return;
    }

    let mounted = true;
    async function loadSettings() {
      try {
        const config = await getUIConfig(userId!);
        if (mounted) {
          const loadedSettings: TimeSwiperSettingsState = {
            use24Hour: config.data.timeSwiper?.use24Hour ?? DEFAULT_TIME_SWIPER_SETTINGS.use24Hour,
            swipeSpeed: config.data.timeSwiper?.swipeSpeed ?? DEFAULT_TIME_SWIPER_SETTINGS.swipeSpeed,
            swipeResistance: migrateSwipeResistance(
              config.data.timeSwiper?.swipeResistance,
              config.data.timeSwiper?.magneticFeel,
            ),
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

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = useCallback(<K extends keyof TimeSwiperSettingsState>(key: K, val: TimeSwiperSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: val }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!isDirty) {
      setSettingsOpen(false);
      return;
    }
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

  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
    setSettingsOpen(false);
  }, [savedSettings]);

  return {
    settings,
    settingsOpen,
    setSettingsOpen,
    isSaving,
    isDirty,
    updateSetting,
    handleSave,
    handleCancel,
  };
}
