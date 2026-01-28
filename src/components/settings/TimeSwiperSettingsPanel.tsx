'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type TimeSwiperSettingsState = {
  use24Hour: boolean;
  swipeSpeed: number;
  incrementMinutes: number;
  magneticFeel: boolean;
  showCurrentTime: boolean;
  markerMode?: 'all' | 'now-only';
};

export const DEFAULT_TIME_SWIPER_SETTINGS: TimeSwiperSettingsState = {
  use24Hour: false,
  swipeSpeed: 0.5,
  incrementMinutes: 1,
  magneticFeel: true,
  showCurrentTime: false,
  markerMode: 'now-only',
};

const getIncrementLabel = (mins: number): string => {
  if (mins < 60) {
    return `${mins}m`;
  }
  return `${mins / 60}h`;
};

type TimeSwiperSettingsPanelProps = {
  settings: TimeSwiperSettingsState;
  /** For slider interactions (debounced save) */
  updateSetting: <K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => void;
  /** For toggle/radio interactions (immediate save) */
  saveSetting: <K extends keyof TimeSwiperSettingsState>(key: K, value: TimeSwiperSettingsState[K]) => void;
  /** Compact mode for popover (no descriptions) */
  compact?: boolean;
};

export function TimeSwiperSettingsPanel({
  settings,
  updateSetting,
  saveSetting,
  compact = false,
}: TimeSwiperSettingsPanelProps) {
  return (
    <div className="space-y-5">
      {/* 24 Hour Toggle */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">24-hour format</p>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Use 24-hour time display
            </p>
          )}
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
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Snappier swipe animation
            </p>
          )}
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
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Display now, -1hr, +1hr markers
            </p>
          )}
        </div>
        <Switch
          checked={settings.showCurrentTime}
          onCheckedChange={checked => saveSetting('showCurrentTime', checked)}
        />
      </div>

      {/* Marker Mode (only visible when showCurrentTime is true) */}
      {settings.showCurrentTime && (
        <div className="space-y-2">
          <p className="text-sm font-medium">Marker display</p>
          <RadioGroup
            value={settings.markerMode || 'all'}
            onValueChange={value => saveSetting('markerMode', value as 'all' | 'now-only')}
            className="space-y-2"
          >
            <label
              className={cn(
                'relative flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                (settings.markerMode || 'all') === 'all'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value="all" className="shrink-0" />
              <span className="text-sm">All markers (Now, ±1hr, ±2hr)</span>
            </label>
            <label
              className={cn(
                'relative flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
                settings.markerMode === 'now-only'
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value="now-only" className="shrink-0" />
              <span className="text-sm">Now marker only</span>
            </label>
          </RadioGroup>
        </div>
      )}

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
            updateSetting('swipeSpeed', newValue ?? 0.5);
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
