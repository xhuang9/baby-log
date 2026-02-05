'use client';

import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/lib/utils';

export type PumpingAmountSettingsState = {
  defaultAmountMl: number;
  maxAmountMl: number;
  maxTotalMl: number;
  increment: number;
  dragStep: number;
  startOnLeft: boolean;
};

export const DEFAULT_PUMPING_AMOUNT_SETTINGS: PumpingAmountSettingsState = {
  defaultAmountMl: 30,
  maxAmountMl: 60,
  maxTotalMl: 60,
  increment: 5,
  dragStep: 5,
  startOnLeft: true,
};

type PumpingAmountSettingsPanelProps = {
  settings: PumpingAmountSettingsState;
  updateSetting: <K extends keyof PumpingAmountSettingsState>(key: K, value: PumpingAmountSettingsState[K]) => void;
  saveSetting: <K extends keyof PumpingAmountSettingsState>(key: K, value: PumpingAmountSettingsState[K]) => void;
  compact?: boolean;
};

export function PumpingAmountSettingsPanel({
  settings,
  updateSetting,
  saveSetting,
  compact = false,
}: PumpingAmountSettingsPanelProps) {
  return (
    <div className="space-y-5">
      {/* Default Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Default amount</p>
          <span className="text-sm text-muted-foreground">
            {settings.defaultAmountMl}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.defaultAmountMl]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('defaultAmountMl', newValue ?? 30);
          }}
          min={5}
          max={settings.maxAmountMl}
          step={5}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>5 ml</span>
            <span>
              {settings.maxAmountMl}
              {' '}
              ml
            </span>
          </div>
        )}
      </div>

      {/* Max Per-Side Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Max per side</p>
          <span className="text-sm text-muted-foreground">
            {settings.maxAmountMl}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.maxAmountMl]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('maxAmountMl', newValue ?? 60);
          }}
          min={10}
          max={200}
          step={5}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10 ml</span>
            <span>200 ml</span>
          </div>
        )}
      </div>

      {/* Max Total Amount */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <p className="text-sm font-medium">Max total</p>
          <span className="text-sm text-muted-foreground">
            {settings.maxTotalMl}
            {' '}
            ml
          </span>
        </div>
        <Slider
          value={[settings.maxTotalMl]}
          onValueChange={(value) => {
            const newValue = Array.isArray(value) ? value[0] : value;
            updateSetting('maxTotalMl', newValue ?? 60);
          }}
          min={10}
          max={400}
          step={5}
        />
        {!compact && (
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>10 ml</span>
            <span>400 ml</span>
          </div>
        )}
      </div>

      {/* Button Increment */}
      <div className="space-y-2">
        <p className="text-sm font-medium">+/- button increment</p>
        <RadioGroup
          value={settings.increment.toString()}
          onValueChange={val => saveSetting('increment', Number.parseInt(String(val)))}
          className="grid grid-cols-3 gap-2"
        >
          {[1, 5, 10].map(inc => (
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

      {/* Drag Step */}
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

      {/* Flip Slider Direction */}
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
