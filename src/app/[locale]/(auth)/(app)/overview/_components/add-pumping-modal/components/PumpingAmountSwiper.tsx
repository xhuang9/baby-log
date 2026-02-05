'use client';

import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import { useCallback, useRef, useState } from 'react';
import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import { PumpingAmountSettingsPanel } from '@/components/settings/PumpingAmountSettingsPanel';
import { Slider } from '@/components/ui/slider';

type PumpingAmountSwiperProps = {
  value: number;
  onChange: (amount: number) => void;
  handMode?: 'left' | 'right';
  /** Controls which max to use: perSide reads maxAmountMl, total reads maxTotalMl */
  settingsMode: 'perSide' | 'total';
  /** Settings passed from parent */
  settings: PumpingAmountSettingsState;
  /** Callback when settings are saved */
  onSettingsChange: (settings: PumpingAmountSettingsState) => void;
};

export function PumpingAmountSwiper({
  value,
  onChange,
  handMode = 'right',
  settingsMode,
  settings,
  onSettingsChange,
}: PumpingAmountSwiperProps) {
  // Local editing state for popover (allows changes before save)
  const [editingSettings, setEditingSettings] = useState<PumpingAmountSettingsState>(settings);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const valueRef = useRef(value);
  valueRef.current = value;

  // Sync editing state when settings prop changes
  const prevSettingsRef = useRef(settings);
  if (prevSettingsRef.current !== settings) {
    prevSettingsRef.current = settings;
    setEditingSettings(settings);
  }

  const maxAmount = settingsMode === 'perSide' ? settings.maxAmountMl : settings.maxTotalMl;
  const shouldFlipSlider = settings.startOnLeft && handMode === 'right';
  const controlsOnLeft = handMode === 'left';
  const isDirty = JSON.stringify(editingSettings) !== JSON.stringify(settings);

  const updateSetting = useCallback(<K extends keyof PumpingAmountSettingsState>(key: K, val: PumpingAmountSettingsState[K]) => {
    setEditingSettings(s => ({ ...s, [key]: val }));
  }, []);

  const saveSetting = useCallback(<K extends keyof PumpingAmountSettingsState>(key: K, val: PumpingAmountSettingsState[K]) => {
    setEditingSettings(s => ({ ...s, [key]: val }));
  }, []);

  const handleSave = useCallback(async () => {
    if (!isDirty) {
      setSettingsOpen(false);
      return;
    }
    setIsSaving(true);
    try {
      // Delegate save to parent
      onSettingsChange(editingSettings);
      setSettingsOpen(false);
    } finally {
      setIsSaving(false);
    }
  }, [editingSettings, isDirty, onSettingsChange]);

  const handleCancel = useCallback(() => {
    setEditingSettings(settings);
    setSettingsOpen(false);
  }, [settings]);

  // Hold-to-adjust: direction is 1 (increment) or -1 (decrement)
  const holdIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const handleHoldStart = useCallback((direction: 1 | -1) => {
    const step = settings.increment;
    const applyStep = () => {
      const next = valueRef.current + direction * step;
      const clamped = Math.max(0, Math.min(next, maxAmount));
      onChange(clamped);
    };
    applyStep();
    holdIntervalRef.current = setInterval(applyStep, 150);
  }, [settings.increment, maxAmount, onChange]);

  const handleHoldStop = useCallback(() => {
    if (holdIntervalRef.current) {
      clearInterval(holdIntervalRef.current);
      holdIntervalRef.current = null;
    }
  }, []);

  const settingsPopoverContent = (
    <SettingsPopoverWrapper
      title="Pumping Settings"
      onClose={() => setSettingsOpen(false)}
      onSave={handleSave}
      onCancel={handleCancel}
      isDirty={isDirty}
      isSaving={isSaving}
      handMode={handMode}
    >
      <PumpingAmountSettingsPanel
        settings={editingSettings}
        updateSetting={updateSetting}
        saveSetting={saveSetting}
        compact
      />
    </SettingsPopoverWrapper>
  );

  return (
    <div className="select-none">
      <div className="flex items-stretch gap-2">
        {controlsOnLeft && (
          <ButtonStack
            onHoldStart={handleHoldStart}
            onHoldStop={handleHoldStop}
            position="left"
            settingsContent={settingsPopoverContent}
            settingsOpen={settingsOpen}
            onSettingsOpenChange={setSettingsOpen}
          />
        )}

        <div className="flex-1">
          <div className={`mb-3 ${controlsOnLeft ? 'text-right' : 'text-left'}`}>
            <span className="text-lg font-semibold">
              {value}
              {' '}
              ml
            </span>
          </div>

          <div className="px-2">
            <div className="**:data-[slot='slider-thumb']:size-7 **:data-[slot='slider-track']:h-3">
              <Slider
                value={[value]}
                onValueChange={(val) => {
                  const newValue = Array.isArray(val) ? val[0] : val;
                  if (newValue !== undefined) {
                    onChange(newValue);
                  }
                }}
                min={0}
                max={maxAmount}
                step={settings.dragStep}
                reversed={shouldFlipSlider}
                className="py-6"
              />
            </div>
            <div className="mt-1 flex justify-between text-xs text-muted-foreground">
              {shouldFlipSlider
                ? (
                    <>
                      <span>{maxAmount}</span>
                      <span>0</span>
                    </>
                  )
                : (
                    <>
                      <span>0</span>
                      <span>{maxAmount}</span>
                    </>
                  )}
            </div>
          </div>
        </div>

        {!controlsOnLeft && (
          <ButtonStack
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
