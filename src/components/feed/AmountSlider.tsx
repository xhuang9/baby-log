'use client';

import { MinusIcon, PlusIcon, Settings2Icon, XIcon } from 'lucide-react';
import { useCallback, useEffect, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

type AmountSliderProps = {
  value: number; // Always in ml
  onChange: (amountMl: number) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

type AmountSliderSettings = {
  minAmount: number;
  defaultAmount: number;
  maxAmount: number;
  increment: number; // +/- button increment: 5, 10, or 20
  dragStep: number; // Minimum drag step: 1, 5, or 10
  startOnLeft: boolean; // Reverse slider direction (only for right-hand mode): true = min on right, drag left to increase
};

const DEFAULT_SETTINGS: AmountSliderSettings = {
  minAmount: 0,
  defaultAmount: 120,
  maxAmount: 350,
  increment: 10,
  dragStep: 5, // Default 5ml per drag step
  startOnLeft: false, // Normal direction by default: min left, max right
};

// Conversion factor: 1 oz = 29.5735 ml
const ML_PER_OZ = 29.5735;

export function AmountSlider({
  value,
  onChange,
  handMode = 'right',
  className,
}: AmountSliderProps) {
  const user = useUserStore(s => s.user);
  const userId = user?.localId;
  const isHydrated = useUserStore(s => s.isHydrated);

  const [settings, setSettings] = useState<AmountSliderSettings>(DEFAULT_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AmountSliderSettings>(DEFAULT_SETTINGS);
  const [useMetric, setUseMetric] = useState(true); // Global unit preference
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Load settings from IndexedDB
  useEffect(() => {
    if (!isHydrated) {
      return;
    }

    if (!userId) {
      return;
    }

    let mounted = true;
    async function loadSettings() {
      try {
        const config = await getUIConfig(userId!);

        if (mounted) {
          const loadedSettings = {
            minAmount: config.data.amountSlider?.minAmount ?? DEFAULT_SETTINGS.minAmount,
            defaultAmount: config.data.amountSlider?.defaultAmount ?? DEFAULT_SETTINGS.defaultAmount,
            maxAmount: config.data.amountSlider?.maxAmount ?? DEFAULT_SETTINGS.maxAmount,
            increment: config.data.amountSlider?.increment ?? DEFAULT_SETTINGS.increment,
            dragStep: config.data.amountSlider?.dragStep ?? DEFAULT_SETTINGS.dragStep,
            startOnLeft: config.data.amountSlider?.startOnLeft ?? DEFAULT_SETTINGS.startOnLeft,
          };
          setSettings(loadedSettings);
          setSavedSettings(loadedSettings);
          setUseMetric(config.data.useMetric ?? true);
        }
      } catch (e) {
        console.error('[AmountSlider] Failed to load settings:', e);
      }
    }
    loadSettings();
    return () => {
      mounted = false;
    };
  }, [isHydrated, userId]);

  // Check if settings have changed
  const isDirty = JSON.stringify(settings) !== JSON.stringify(savedSettings);

  // Save settings
  const handleSave = useCallback(async () => {
    if (!isDirty) {
      setSettingsOpen(false);
      return;
    }

    if (!userId) {
      setSettingsOpen(false);
      return;
    }

    setIsSaving(true);
    try {
      await updateUIConfig(userId, { amountSlider: settings });
      setSavedSettings(settings);
      setSettingsOpen(false);
    } catch (e) {
      console.error('[AmountSlider] Failed to save settings:', e);
    } finally {
      setIsSaving(false);
    }
  }, [userId, settings, isDirty]);

  // Reset settings to saved values and close
  const handleCancel = useCallback(() => {
    setSettings(savedSettings);
    setSettingsOpen(false);
  }, [savedSettings]);

  // Convert ml to display unit
  const mlToDisplay = (ml: number): number => {
    if (!useMetric) {
      return ml / ML_PER_OZ;
    }
    return ml;
  };

  // Convert display unit to ml
  const displayToMl = (displayValue: number): number => {
    if (!useMetric) {
      return displayValue * ML_PER_OZ;
    }
    return displayValue;
  };

  // +/- adjustment
  const adjustAmount = useCallback((direction: 1 | -1) => {
    const displayValue = mlToDisplay(value);
    const newDisplayValue = displayValue + (settings.increment * direction);
    const newMl = displayToMl(newDisplayValue);

    // Clamp to min/max
    const clampedMl = Math.max(settings.minAmount, Math.min(settings.maxAmount, newMl));
    onChange(Math.round(clampedMl));
  }, [value, settings, useMetric, onChange, mlToDisplay, displayToMl]);

  // Format display value
  const formatAmount = (): string => {
    const displayValue = mlToDisplay(value);
    return !useMetric
      ? `${displayValue.toFixed(1)} oz`
      : `${Math.round(displayValue)} ml`;
  };

  // Controls always follow hand mode
  const controlsOnLeft = handMode === 'left';

  // Progress bar should flip only for right-handed users when toggle is on
  const shouldFlipSlider = settings.startOnLeft && handMode === 'right';

  // Control buttons stack JSX
  const controlButtons = (
    <div className="flex flex-col gap-1">
      <Popover open={settingsOpen} onOpenChange={setSettingsOpen}>
        <PopoverTrigger
          render={(
            <Button
              variant="outline"
              size="icon"
              className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
            >
              <Settings2Icon className="h-4 w-4" />
            </Button>
          )}
        />
        <PopoverContent className="w-80 p-5" side={controlsOnLeft ? 'right' : 'left'}>
          <div className="space-y-5">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-foreground">Amount Settings</h4>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-foreground"
                onClick={() => setSettingsOpen(false)}
              >
                <XIcon className="h-4 w-4" />
              </Button>
            </div>

            {/* Min Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Min amount</Label>
                <span className="text-xs text-muted-foreground/70">
                  {settings.minAmount}
                  {' '}
                  ml
                </span>
              </div>
              <Slider
                value={[settings.minAmount]}
                onValueChange={(value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  setSettings(s => ({ ...s, minAmount: newValue ?? 0 }));
                }}
                min={0}
                max={100}
                step={5}
              />
            </div>

            {/* Default Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Default amount</Label>
                <span className="text-xs text-muted-foreground/70">
                  {settings.defaultAmount}
                  {' '}
                  ml
                </span>
              </div>
              <Slider
                value={[settings.defaultAmount]}
                onValueChange={(value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  setSettings(s => ({ ...s, defaultAmount: newValue ?? 120 }));
                }}
                min={50}
                max={300}
                step={10}
              />
            </div>

            {/* Max Amount */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-sm text-muted-foreground">Max amount</Label>
                <span className="text-xs text-muted-foreground/70">
                  {settings.maxAmount}
                  {' '}
                  ml
                </span>
              </div>
              <Slider
                value={[settings.maxAmount]}
                onValueChange={(value) => {
                  const newValue = Array.isArray(value) ? value[0] : value;
                  setSettings(s => ({ ...s, maxAmount: newValue ?? 350 }));
                }}
                min={200}
                max={500}
                step={10}
              />
            </div>

            {/* Increment Options */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">+/- button increment</Label>
              <RadioGroup
                value={settings.increment.toString()}
                onValueChange={val =>
                  setSettings(s => ({ ...s, increment: Number.parseInt(String(val)) }))}
                className="grid grid-cols-3 gap-2"
              >
                {[5, 10, 20].map(inc => (
                  <label
                    key={inc}
                    className={cn(
                      'flex cursor-pointer items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition-colors',
                      settings.increment === inc
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <RadioGroupItem value={inc.toString()} className="sr-only" />
                    {inc}
                    {' '}
                    ml
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Drag Step Options */}
            <div className="space-y-2">
              <Label className="text-sm text-muted-foreground">Slider drag step</Label>
              <RadioGroup
                value={settings.dragStep.toString()}
                onValueChange={val =>
                  setSettings(s => ({ ...s, dragStep: Number.parseInt(String(val)) }))}
                className="grid grid-cols-3 gap-2"
              >
                {[1, 5, 10].map(step => (
                  <label
                    key={step}
                    className={cn(
                      'flex cursor-pointer items-center justify-center rounded-lg border px-2 py-1.5 text-xs transition-colors',
                      settings.dragStep === step
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:bg-muted/50',
                    )}
                  >
                    <RadioGroupItem value={step.toString()} className="sr-only" />
                    {step}
                    {' '}
                    ml
                  </label>
                ))}
              </RadioGroup>
            </div>

            {/* Slider Direction Toggle */}
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="startOnLeft" className="text-sm text-muted-foreground">
                  Flip slider direction
                </Label>
                <p className="text-xs text-muted-foreground/70">
                  Right hand only: min on right, drag left to increase
                </p>
              </div>
              <Switch
                id="startOnLeft"
                checked={settings.startOnLeft}
                onCheckedChange={checked =>
                  setSettings(s => ({ ...s, startOnLeft: checked }))}
              />
            </div>

            {/* Save/Cancel Buttons */}
            <div className="flex gap-2 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleCancel}
                disabled={isSaving}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                size="sm"
                onClick={handleSave}
                disabled={isSaving}
                className="flex-1"
              >
                {isSaving ? 'Saving...' : 'Save'}
              </Button>
            </div>
          </div>
        </PopoverContent>
      </Popover>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
        onClick={() => adjustAmount(1)}
      >
        <PlusIcon className="h-4 w-4" />
      </Button>
      <Button
        variant="outline"
        size="icon"
        className="h-10 w-10 rounded-xl border-border/50 bg-muted/30 text-foreground hover:bg-muted/50"
        onClick={() => adjustAmount(-1)}
      >
        <MinusIcon className="h-4 w-4" />
      </Button>
    </div>
  );

  return (
    <div className={cn('select-none', className)}>
      <div className="flex items-stretch gap-2">
        {/* Control buttons - Left side */}
        {controlsOnLeft && controlButtons}

        {/* Slider container */}
        <div className="flex-1">
          {/* Amount display */}
          <div className={`mb-3 ${controlsOnLeft ? 'text-right' : 'text-left'}`}>
            <span className="text-lg font-semibold">
              {formatAmount()}
            </span>
          </div>

          {/* Slider - thicker track and bigger thumb */}
          <div className="px-2">
            <div className="[&_[data-slot='slider-thumb']]:size-7 [&_[data-slot='slider-track']]:h-3">
              <Slider
                value={[value]}
                onValueChange={(val) => {
                  const newValue = Array.isArray(val) ? val[0] : val;
                  if (newValue !== undefined) {
                    onChange(newValue);
                  }
                }}
                min={settings.minAmount}
                max={settings.maxAmount}
                step={settings.dragStep}
                reversed={shouldFlipSlider}
                className="py-6"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              {shouldFlipSlider
                ? (
                    <>
                      <span>
                        {mlToDisplay(settings.maxAmount).toFixed(useMetric ? 0 : 1)}
                      </span>
                      <span>
                        {mlToDisplay(settings.minAmount).toFixed(useMetric ? 0 : 1)}
                      </span>
                    </>
                  )
                : (
                    <>
                      <span>
                        {mlToDisplay(settings.minAmount).toFixed(useMetric ? 0 : 1)}
                      </span>
                      <span>
                        {mlToDisplay(settings.maxAmount).toFixed(useMetric ? 0 : 1)}
                      </span>
                    </>
                  )}
            </div>
          </div>
        </div>

        {/* Control buttons - Right side */}
        {!controlsOnLeft && controlButtons}
      </div>
    </div>
  );
}
