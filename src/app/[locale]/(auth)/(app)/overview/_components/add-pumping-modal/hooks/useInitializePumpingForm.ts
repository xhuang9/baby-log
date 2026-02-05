'use client';

import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import { useEffect } from 'react';
import { DEFAULT_PUMPING_AMOUNT_SETTINGS } from '@/components/settings/PumpingAmountSettingsPanel';
import { getUIConfig } from '@/lib/local-db/helpers/ui-config';
import { useUserStore } from '@/stores/useUserStore';

type UseInitializePumpingFormProps = {
  setHandMode: (mode: 'left' | 'right') => void;
  setLeftMl: (ml: number) => void;
  setRightMl: (ml: number) => void;
  setTotalMl: (ml: number) => void;
  setPumpingSettings: (settings: PumpingAmountSettingsState) => void;
};

export function useInitializePumpingForm({
  setHandMode,
  setLeftMl,
  setRightMl,
  setTotalMl,
  setPumpingSettings,
}: UseInitializePumpingFormProps) {
  const user = useUserStore(s => s.user);

  useEffect(() => {
    async function loadDefaults() {
      if (!user?.localId) {
        return;
      }
      try {
        const config = await getUIConfig(user.localId);
        setHandMode(config.data.handMode ?? 'right');

        // Load pumping settings
        const storedPumpingSettings = config.data.pumpingAmount;
        const pumpingSettings: PumpingAmountSettingsState = {
          defaultAmountMl: storedPumpingSettings?.defaultAmountMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.defaultAmountMl,
          maxAmountMl: storedPumpingSettings?.maxAmountMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.maxAmountMl,
          maxTotalMl: storedPumpingSettings?.maxTotalMl ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.maxTotalMl,
          increment: storedPumpingSettings?.increment ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.increment,
          dragStep: storedPumpingSettings?.dragStep ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.dragStep,
          startOnLeft: storedPumpingSettings?.startOnLeft ?? DEFAULT_PUMPING_AMOUNT_SETTINGS.startOnLeft,
        };
        setPumpingSettings(pumpingSettings);

        const defaultMl = pumpingSettings.defaultAmountMl;
        setLeftMl(defaultMl);
        setRightMl(defaultMl);
        setTotalMl(defaultMl);
      } catch (err) {
        console.error('Failed to load pumping defaults:', err);
      }
    }
    loadDefaults();
  }, [user?.localId, setHandMode, setLeftMl, setRightMl, setTotalMl, setPumpingSettings]);
}
