'use client';

import type { AmountSliderSettingsState } from '@/components/settings';
import { useCallback, useEffect, useRef, useState } from 'react';
import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import {
  AmountSliderSettingsPanel,

  DEFAULT_AMOUNT_SLIDER_SETTINGS,
} from '@/components/settings';
import { Slider } from '@/components/ui/slider';
import { getUIConfig, updateUIConfig } from '@/lib/local-db/helpers/ui-config';
import { cn } from '@/lib/utils';
import { useUserStore } from '@/stores/useUserStore';

// Acceleration tiers for press-and-hold (amount-specific)
const AMOUNT_SPEED_TIERS: readonly { threshold: number; multiplier: number; repeatMs: number }[] = [
  { threshold: 0, multiplier: 1, repeatMs: 200 }, // 0.0s – 0.6s: 1x increment
  { threshold: 600, multiplier: 2, repeatMs: 150 }, // 0.6s – 1.5s: 2x increment
  { threshold: 1500, multiplier: 5, repeatMs: 120 }, // 1.5s – 3.0s: 5x increment
  { threshold: 3000, multiplier: 10, repeatMs: 100 }, // 3.0s+: 10x increment
] as const;

function getAmountTier(index: number): { threshold: number; multiplier: number; repeatMs: number } {
  const tier = AMOUNT_SPEED_TIERS[index];
  if (tier) {
    return tier;
  }
  // Fallback to first tier (always defined)
  return { threshold: 0, multiplier: 1, repeatMs: 200 };
}

type AmountSliderProps = {
  value: number; // Always in ml
  onChange: (amountMl: number) => void;
  handMode?: 'left' | 'right';
  className?: string;
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

  const [settings, setSettings] = useState<AmountSliderSettingsState>(DEFAULT_AMOUNT_SLIDER_SETTINGS);
  const [savedSettings, setSavedSettings] = useState<AmountSliderSettingsState>(DEFAULT_AMOUNT_SLIDER_SETTINGS);
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
            minAmount: config.data.amountSlider?.minAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.minAmount,
            defaultAmount: config.data.amountSlider?.defaultAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.defaultAmount,
            maxAmount: config.data.amountSlider?.maxAmount ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.maxAmount,
            increment: config.data.amountSlider?.increment ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.increment,
            dragStep: config.data.amountSlider?.dragStep ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.dragStep,
            startOnLeft: config.data.amountSlider?.startOnLeft ?? DEFAULT_AMOUNT_SLIDER_SETTINGS.startOnLeft,
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

  // Settings handlers for the panel
  const updateSetting = useCallback(<K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

  const saveSetting = useCallback(<K extends keyof AmountSliderSettingsState>(key: K, value: AmountSliderSettingsState[K]) => {
    setSettings(s => ({ ...s, [key]: value }));
  }, []);

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
  const mlToDisplay = useCallback((ml: number): number => {
    if (!useMetric) {
      return ml / ML_PER_OZ;
    }
    return ml;
  }, [useMetric]);

  // Convert display unit to ml
  const displayToMl = useCallback((displayValue: number): number => {
    if (!useMetric) {
      return displayValue * ML_PER_OZ;
    }
    return displayValue;
  }, [useMetric]);

  // Press-and-hold refs
  const holdStartRef = useRef(0);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const currentTierRef = useRef(0);

  const getCurrentAmountTier = useCallback((elapsed: number): number => {
    for (let i = AMOUNT_SPEED_TIERS.length - 1; i >= 0; i--) {
      const tier = AMOUNT_SPEED_TIERS[i];
      if (tier && elapsed >= tier.threshold) {
        return i;
      }
    }
    return 0;
  }, []);

  // +/- adjustment with multiplier support
  const adjustAmount = useCallback((direction: 1 | -1, multiplier: number = 1) => {
    const displayValue = mlToDisplay(value);
    const newDisplayValue = displayValue + (settings.increment * multiplier * direction);
    const newMl = displayToMl(newDisplayValue);

    // Clamp to min/max
    const clampedMl = Math.max(settings.minAmount, Math.min(settings.maxAmount, newMl));
    onChange(Math.round(clampedMl));
  }, [value, settings, mlToDisplay, displayToMl, onChange]);

  // Press-and-hold tick function
  const tickAmount = useCallback((direction: 1 | -1) => {
    const elapsed = performance.now() - holdStartRef.current;
    const newTier = getCurrentAmountTier(elapsed);

    // Update tier and reschedule if tier changed
    if (newTier !== currentTierRef.current) {
      currentTierRef.current = newTier;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
        intervalRef.current = setInterval(() => tickAmount(direction), getAmountTier(newTier).repeatMs);
      }
    }

    const multiplier = getAmountTier(currentTierRef.current).multiplier;
    adjustAmount(direction, multiplier);
  }, [adjustAmount, getCurrentAmountTier]);

  const handleHoldStart = useCallback((direction: 1 | -1) => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    holdStartRef.current = performance.now();
    currentTierRef.current = 0;

    // Immediate first tick
    adjustAmount(direction, 1);

    // Start interval
    intervalRef.current = setInterval(() => tickAmount(direction), getAmountTier(0).repeatMs);
  }, [adjustAmount, tickAmount]);

  const handleHoldStop = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

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

  // Settings popover content
  const settingsPopoverContent = (
    <SettingsPopoverWrapper
      title="Amount Settings"
      onClose={() => setSettingsOpen(false)}
      onSave={handleSave}
      onCancel={handleCancel}
      isDirty={isDirty}
      isSaving={isSaving}
      handMode={handMode}
    >
      <AmountSliderSettingsPanel
        settings={settings}
        updateSetting={updateSetting}
        saveSetting={saveSetting}
        compact
      />
    </SettingsPopoverWrapper>
  );

  return (
    <div className={cn('select-none', className)}>
      <div className="flex items-stretch gap-2">
        {/* Control buttons - Left side */}
        {controlsOnLeft && (
          <ButtonStack
            onHoldAdjust={() => {}}
            onHoldStart={handleHoldStart}
            onHoldStop={handleHoldStop}
            position="left"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}

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
        {!controlsOnLeft && (
          <ButtonStack
            onHoldAdjust={() => {}}
            onHoldStart={handleHoldStart}
            onHoldStop={handleHoldStop}
            position="right"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}
      </div>
    </div>
  );
}
