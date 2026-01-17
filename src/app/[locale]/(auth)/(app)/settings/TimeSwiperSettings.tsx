'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import { toast } from 'sonner';
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
  showCurrentTime: boolean;
};

const DEFAULT_SETTINGS: TimeSwiperSettingsState = {
  use24Hour: false,
  swipeSpeed: 0.5,
  incrementMinutes: 30,
  magneticFeel: false,
  showCurrentTime: true,
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
            showCurrentTime: config.data.timeSwiper.showCurrentTime ?? DEFAULT_SETTINGS.showCurrentTime,
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

  // Debounced save for slider (saves after user stops dragging)
  const debouncedSave = useCallback((newSettings: TimeSwiperSettingsState) => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }
    saveTimeoutRef.current = setTimeout(() => {
      if (user?.localId) {
        updateUIConfig(user.localId, { timeSwiper: newSettings })
          .then(() => {
            toast.success('Settings updated');
          })
          .catch((error) => {
            console.error('Failed to save time swiper settings:', error);
            toast.error('Failed to save settings');
          });
      }
    }, 300);
  }, [user?.localId]);

  // Update local state and debounce save (for slider)
  const updateSliderSetting = <K extends keyof TimeSwiperSettingsState>(
    key: K,
    value: TimeSwiperSettingsState[K],
  ) => {
    const newSettings = { ...settingsRef.current, [key]: value };
    setSettings(newSettings);
    settingsRef.current = newSettings;
    debouncedSave(newSettings);
  };

  // Save to IndexedDB and show toast
  const saveSetting = <K extends keyof TimeSwiperSettingsState>(
    key: K,
    value: TimeSwiperSettingsState[K],
  ) => {
    const newSettings = { ...settingsRef.current, [key]: value };
    setSettings(newSettings);
    settingsRef.current = newSettings;

    if (user?.localId) {
      updateUIConfig(user.localId, { timeSwiper: newSettings })
        .then(() => {
          toast.success('Settings updated');
        })
        .catch((error) => {
          console.error('Failed to save time swiper settings:', error);
          toast.error('Failed to save settings');
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
          onCheckedChange={checked => saveSetting('use24Hour', checked)}
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
          onCheckedChange={checked => saveSetting('magneticFeel', checked)}
        />
      </div>

      {/* Show Time Markers Toggle */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">Show time markers</p>
          <p className="text-xs text-muted-foreground">
            Display now, -1hr, +1hr markers
          </p>
        </div>
        <Switch
          checked={settings.showCurrentTime}
          onCheckedChange={checked => saveSetting('showCurrentTime', checked)}
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
            updateSliderSetting('swipeSpeed', newValue ?? 0.5);
          }}
          min={0.1}
          max={3.0}
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
          onValueChange={val => saveSetting('incrementMinutes', Number.parseInt(String(val)))}
          className="grid grid-cols-6 gap-1"
        >
          {[1, 5, 15, 30, 60, 120].map(mins => (
            <label
              key={mins}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs transition-colors',
                settings.incrementMinutes === mins
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value={mins.toString()} className="absolute opacity-0" />
              <span>{getIncrementLabel(mins)}</span>
            </label>
          ))}
        </RadioGroup>
      </div>
    </div>
  );
}
