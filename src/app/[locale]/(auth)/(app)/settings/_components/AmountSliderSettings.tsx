'use client';

import type { AmountSliderSettingsState } from '@/components/settings';
import {
  AmountSliderSettingsPanel,

  DEFAULT_AMOUNT_SLIDER_SETTINGS,
} from '@/components/settings';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

export function AmountSliderSettings() {
  const { settings, isLoading, updateSetting, saveSetting } = useWidgetSettings<AmountSliderSettingsState>(
    'amountSlider',
    DEFAULT_AMOUNT_SLIDER_SETTINGS,
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
    <AmountSliderSettingsPanel
      settings={settings}
      updateSetting={updateSetting}
      saveSetting={saveSetting}
    />
  );
}
