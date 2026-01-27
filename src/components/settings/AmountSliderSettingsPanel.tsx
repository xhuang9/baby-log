'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type AmountSliderSettingsState = {
  minAmount: number;
  defaultAmount: number;
  maxAmount: number;
  increment: number;
  dragStep: number;
  startOnLeft: boolean;
};

export const DEFAULT_AMOUNT_SLIDER_SETTINGS: AmountSliderSettingsState = {
  minAmount: 0,
  defaultAmount: 120,
  maxAmount: 350,
  increment: 10,
  dragStep: 5,
  startOnLeft: true,
};

type AmountSliderSettingsPanelProps = {
  settings: AmountSliderSettingsState;
  /** For slider interactions (debounced save) */
  updateSetting: <K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => void;
  /** For toggle/radio interactions (immediate save) */
  saveSetting: <K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => void;
  /** Compact mode for popover (no descriptions) */
  compact?: boolean;
};

export function AmountSliderSettingsPanel({
  settings,
  updateSetting,
  saveSetting,
  compact = false,
}: AmountSliderSettingsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Min Amount Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Min amount</p>
          <span className="text-sm text-muted-foreground">
            {settings.minAmount}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.minAmount]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('minAmount', newValue ?? 0);
          }}
          min={0}
          max={100}
          step={5}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>0 ml</span>
            <span>100 ml</span>
          </div>
        )}
      </div>

      {/* Default Amount Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Default amount</p>
          <span className="text-sm text-muted-foreground">
            {settings.defaultAmount}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.defaultAmount]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('defaultAmount', newValue ?? 120);
          }}
          min={50}
          max={300}
          step={10}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>50 ml</span>
            <span>300 ml</span>
          </div>
        )}
      </div>

      {/* Max Amount Slider */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Max amount</p>
          <span className="text-sm text-muted-foreground">
            {settings.maxAmount}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.maxAmount]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('maxAmount', newValue ?? 350);
          }}
          min={200}
          max={500}
          step={10}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>200 ml</span>
            <span>500 ml</span>
          </div>
        )}
      </div>

      {/* Button Increment Radio */}
      <div className="space-y-2">
        <p className="text-sm font-medium">+/- button increment</p>
        <RadioGroup
          value={settings.increment.toString()}
          onValueChange={val => saveSetting('increment', Number.parseInt(String(val)))}
          className="grid grid-cols-3 gap-2"
        >
          {[5, 10, 20].map(inc => (
            <label
              key={inc}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs transition-colors',
                settings.increment === inc
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value={inc.toString()} className="absolute opacity-0" />
              <span>
                {inc}
                {' '}
                ml
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Drag Step Radio */}
      <div className="space-y-2">
        <p className="text-sm font-medium">Slider drag step</p>
        <RadioGroup
          value={settings.dragStep.toString()}
          onValueChange={val => saveSetting('dragStep', Number.parseInt(String(val)))}
          className="grid grid-cols-3 gap-2"
        >
          {[1, 5, 10].map(step => (
            <label
              key={step}
              className={cn(
                'relative flex cursor-pointer items-center justify-center rounded-lg border px-2 py-2 text-xs transition-colors',
                settings.dragStep === step
                  ? 'border-primary bg-primary/10'
                  : 'border-border hover:bg-muted/50',
              )}
            >
              <RadioGroupItem value={step.toString()} className="absolute opacity-0" />
              <span>
                {step}
                {' '}
                ml
              </span>
            </label>
          ))}
        </RadioGroup>
      </div>

      {/* Flip Slider Direction Toggle */}
      <div className="flex items-center justify-between">
        <div className="pr-4">
          <p className="text-sm font-medium">Flip slider direction</p>
          {!compact && (
            <p className="text-xs text-muted-foreground">
              Right hand only: min on right, drag left to increase
            </p>
          )}
        </div>
        <Switch
          checked={settings.startOnLeft}
          onCheckedChange={checked => saveSetting('startOnLeft', checked)}
        />
      </div>
    </div>
  );
}
