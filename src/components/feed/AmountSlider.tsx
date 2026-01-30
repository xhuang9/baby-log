'use client';

import { ButtonStack } from '@/components/input-controls/ButtonStack';
import { SettingsPopoverWrapper } from '@/components/input-controls/SettingsPopoverWrapper';
import { AmountSliderSettingsPanel } from '@/components/settings';
import { Slider } from '@/components/ui/slider';
import { cn } from '@/lib/utils';
import {
  useAmountConversion,
  useAmountHoldAdjust,
  useAmountSliderSettings,
} from './amount-slider/hooks';

type AmountSliderProps = {
  value: number; // Always in ml
  onChange: (amountMl: number) => void;
  handMode?: 'left' | 'right';
  className?: string;
};

export function AmountSlider({
  value,
  onChange,
  handMode = 'right',
  className,
}: AmountSliderProps) {
  const {
    settings,
    useMetric,
    settingsOpen,
    setSettingsOpen,
    isSaving,
    isDirty,
    updateSetting,
    saveSetting,
    handleSave,
    handleCancel,
  } = useAmountSliderSettings();

  const { mlToDisplay, displayToMl, formatAmount } = useAmountConversion({ useMetric });

  const { handleHoldStart, handleHoldStop } = useAmountHoldAdjust({
    value,
    settings,
    mlToDisplay,
    displayToMl,
    onChange,
  });

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
              {formatAmount(value)}
            </span>
          </div>

          {/* Slider - thicker track and bigger thumb */}
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
