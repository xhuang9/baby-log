'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type SwipeResistance = 'smooth' | 'default' | 'sticky';

export type TimeSwiperSettingsState = {
  use24Hour: boolean;
  swipeSpeed: number;
  swipeResistance: SwipeResistance;
  showCurrentTime: boolean;
  markerMode?: 'all' | 'now-only';
};

export const DEFAULT_TIME_SWIPER_SETTINGS: TimeSwiperSettingsState = {
  use24Hour: false,
  swipeSpeed: 0.5,
  swipeResistance: 'default',
  showCurrentTime: false,
  markerMode: 'now-only',
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

      {/* Swipe Resistance */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Swipe resistance</p>
        <RadioGroup
          value={settings.swipeResistance}
          onValueChange={value => saveSetting('swipeResistance', value as SwipeResistance)}
          className="space-y-2"
        >
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- RadioGroupItem handles association */}
          <label
            className={cn(
              'relative flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
              settings.swipeResistance === 'smooth'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <RadioGroupItem value="smooth" className="shrink-0" />
            <div>
              <span className="text-sm">Smooth</span>
              {!compact && (
                <p className="text-xs text-muted-foreground">Less resistance, longer glide</p>
              )}
            </div>
          </label>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- RadioGroupItem handles association */}
          <label
            className={cn(
              'relative flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
              settings.swipeResistance === 'default'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <RadioGroupItem value="default" className="shrink-0" />
            <div>
              <span className="text-sm">Default</span>
              {!compact && (
                <p className="text-xs text-muted-foreground">Balanced feel</p>
              )}
            </div>
          </label>
          {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- RadioGroupItem handles association */}
          <label
            className={cn(
              'relative flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 transition-colors',
              settings.swipeResistance === 'sticky'
                ? 'border-primary bg-primary/10'
                : 'border-border hover:bg-muted/50',
            )}
          >
            <RadioGroupItem value="sticky" className="shrink-0" />
            <div>
              <span className="text-sm">Sticky</span>
              {!compact && (
                <p className="text-xs text-muted-foreground">More resistance, snappier stop</p>
              )}
            </div>
          </label>
        </RadioGroup>
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
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- RadioGroupItem handles association */}
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
            {/* eslint-disable-next-line jsx-a11y/label-has-associated-control -- RadioGroupItem handles association */}
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
    </div>
  );
}
