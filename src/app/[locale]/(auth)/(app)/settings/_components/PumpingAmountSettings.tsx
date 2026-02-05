'use client';

import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import {
  DEFAULT_PUMPING_AMOUNT_SETTINGS,
  PumpingAmountSettingsPanel,
} from '@/components/settings/PumpingAmountSettingsPanel';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

export function PumpingAmountSettings() {
  const { settings, isLoading, updateSetting, saveSetting } = useWidgetSettings<PumpingAmountSettingsState>(
    'pumpingAmount',
    DEFAULT_PUMPING_AMOUNT_SETTINGS,
  );

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="h-6 w-32 animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
        <div className="h-10 w-full animate-pulse rounded bg-muted" />
      </div>
    );
  }

  return (
    <PumpingAmountSettingsPanel
      settings={settings}
      updateSetting={updateSetting}
      saveSetting={saveSetting}
    />
  );
}
