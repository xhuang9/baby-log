'use client';

import { useEffect, useState } from 'react';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

type TimeSwiperSettingsState = {
  use24Hour: boolean;
  swipeSpeed: number;
  incrementMinutes: number;
  magneticFeel: boolean;
};

const DEFAULT_SETTINGS: TimeSwiperSettingsState = {
  use24Hour: false,
  swipeSpeed: 1.0,
  incrementMinutes: 60,
  magneticFeel: false,
};

const getIncrementLabel = (mins: number): string => {
  if (mins < 60) {
    return `${mins}m`;
  }
  return `${mins / 60}h`;
};

export function TimeSwiperSettings() {
  const user = useUserStore(s => s.user);
  const [settings, setSettings] = useState<TimeSwiperSettingsState>(DEFAULT_SETTINGS);
  const [isLoading, setIsLoading] = useState(true);

  // Load initial values from IndexedDB
  useEffect(() => {
    let mounted = true;

    async function loadSettings() {
      if (!user?.localId) {
        if (mounted) {
          setIsLoading(false);
        }
        return;
      }

      try {
        const config = await getUIConfig(user.localId);
        if (mounted && config.data.timeSwiper) {
          setSettings({
            use24Hour: config.data.timeSwiper.use24Hour ?? DEFAULT_SETTINGS.use24Hour,
            swipeSpeed: config.data.timeSwiper.swipeSpeed ?? DEFAULT_SETTINGS.swipeSpeed,
            incrementMinutes: config.data.timeSwiper.incrementMinutes ?? DEFAULT_SETTINGS.incrementMinutes,
            magneticFeel: config.data.timeSwiper.magneticFeel ?? DEFAULT_SETTINGS.magneticFeel,
          });
        }
      } catch (error) {
        console.error('Failed to load time swiper settings:', error);
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
  }, [user?.localId]);

  const updateSetting = <K extends keyof TimeSwiperSettingsState>(
    key: K,
    value: TimeSwiperSettingsState[K],
  ) => {
    const newSettings = { ...settings, [key]: value };
    setSettings(newSettings);

    if (user?.localId) {
      updateUIConfig(user.localId, { timeSwiper: newSettings }).catch((error) => {
        console.error('Failed to save time swiper settings:', error);
      });
    }
  };

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
    <div className="space-y-5">
      {/* 24 Hour Toggle */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">24-hour format</p>
          <p className="text-xs text-muted-foreground">
            Use 24-hour time display
          </p>
        </div>
        <Switch
          checked={settings.use24Hour}
          onCheckedChange={checked => updateSetting('use24Hour', checked)}
        />
      </div>

      {/* Magnetic Feel Toggle */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">Magnetic feel</p>
          <p className="text-xs text-muted-foreground">
            Snappier swipe animation
          </p>
        </div>
        <Switch
          checked={settings.magneticFeel}
          onCheckedChange={checked => updateSetting('magneticFeel', checked)}
        />
      </div>

      {/* Swipe Speed */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Swipe speed</p>
          <span className="text-sm text-muted-foreground">
            {settings.swipeSpeed.toFixed(1)}
            x
          </span>
        </div>
        <Slider
          value={[settings.swipeSpeed]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('swipeSpeed', newValue ?? 1);
          }}
          min={0.5}
          max={2}
          step={0.1}
        />
        <div className="flex justify-between text-xs text-muted-foreground">
          <span>Slower</span>
          <span>Faster</span>
        </div>
      </div>

      {/* Increment Options */}
      <div className="space-y-2">
        <p className="text-sm font-medium">+/- button increment</p>
        <RadioGroup
          value={settings.incrementMinutes.toString()}
          onValueChange={val => updateSetting('incrementMinutes', Number.parseInt(String(val)))}
          className="grid grid-cols-5 gap-1"
        >
          {[15, 30, 60, 120, 180].map(mins => (
            <label
              key={mins}
              className={cn(
                'flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs transition-colors',
                settings.incrementMinutes === mins
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value={mins.toString()} className="sr-only" />
              {getIncrementLabel(mins)}
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
