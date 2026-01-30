'use client';

import type { AmountSliderSettingsState } from '@/components/settings';
import { useCallback, useEffect, useState } from 'react';
import { DEFAULT_AMOUNT_SLIDER_SETTINGS } from '@/components/settings';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

export function useAmountSliderSettings() {
  const user = useUserStore(s => s.user);
  const userId = user?.localId;
  const isHydrated = useUserStore(s => s.isHydrated);

  const [settings, setSettings] = useState<AmountSliderSettingsState>(DEFAULT_AMOUNT_SLIDER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AmountSliderSettingsState>(DEFAULT_AMOUNT_SLIDER_SETTINGS);
  const [useMetric, setUseMetric] = useState(true);
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
          const loadedSettings: AmountSliderSettingsState = {
            minAmount: config.data.amountSlider?.minAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.minAmount,
            defaultAmount: config.data.amountSlider?.defaultAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.defaultAmount,
            maxAmount: config.data.amountSlider?.maxAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.maxAmount,
            increment: config.data.amountSlider?.increment ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.increment,
            dragStep: config.data.amountSlider?.dragStep ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.dragStep,
            startOnLeft: config.data.amountSlider?.startOnLeft ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.startOnLeft,
          };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
          setUseMetric(config.data.useMetric ?? true);
        }
      } catch (e) {
        console.error('[AmountSlider] Failed to load settings:', e);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [isHydrated, userId]);

  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  const updateSetting = useCallback(<K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  const saveSetting = useCallback(<K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
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
      await updateUIConfig(userId, { amountSlider: settings });
      setSavedSettings(settings);
      setSettingsOpen(false);
    } catch (e) {
      console.error('[AmountSlider] Failed to save settings:', e);
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
    useMetric,
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
