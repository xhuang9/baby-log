'use client';

import type { TimeSwiperSettingsState } from '@/components/settings';
import {
  DEFAULT_TIME_SWIPER_SETTINGS,
  TimeSwiperSettingsPanel,

} from '@/components/settings';
import { useWidgetSettings } from '@/hooks/useWidgetSettings';

export function TimeSwiperSettings() {
  const { settings, isLoading, updateSetting, saveSetting } = useWidgetSettings<TimeSwiperSettingsState>(
    'timeSwiper',
    DEFAULT_TIME_SWIPER_SETTINGS,
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
    <TimeSwiperSettingsPanel
      settings={settings}
      updateSetting={updateSetting}
      saveSetting={saveSetting}
    />
  );
}
