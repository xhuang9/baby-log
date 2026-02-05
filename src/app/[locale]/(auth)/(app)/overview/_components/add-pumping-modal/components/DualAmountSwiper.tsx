'use client';

import type { PumpingAmountSettingsState } from '@/components/settings/PumpingAmountSettingsPanel';
import type { PumpingAmountMode } from '../hooks/usePumpingFormState';
import { PillTabs, PillTabsList, PillTabsTrigger } from '@/components/custom-ui';
import { cn } from '@/lib/utils';
import { PumpingAmountSwiper } from './PumpingAmountSwiper';
import { TotalDisplay } from './TotalDisplay';

type DualAmountSwiperProps = {
  mode: PumpingAmountMode;
  onModeChange: (mode: PumpingAmountMode) => void;
  leftMl: number;
  onLeftMlChange: (value: number) => void;
  rightMl: number;
  onRightMlChange: (value: number) => void;
  totalMl: number;
  onTotalMlChange: (value: number) => void;
  handMode?: 'left' | 'right';
  className?: string;
  /** Settings passed from parent */
  settings: PumpingAmountSettingsState;
  /** Callback when settings are saved */
  onSettingsChange: (settings: PumpingAmountSettingsState) => void;
};

export function DualAmountSwiper({
  mode,
  onModeChange,
  leftMl,
  onLeftMlChange,
  rightMl,
  onRightMlChange,
  totalMl,
  onTotalMlChange,
  handMode = 'right',
  className,
  settings,
  onSettingsChange,
}: DualAmountSwiperProps) {
  const isRightHanded = handMode === 'right';

  return (
    <div className={cn('space-y-4', className)}>
      {/* Header row: Amount label + mode tabs */}
      <div
        className={cn(
          'flex items-center',
          isRightHanded ? 'justify-between' : 'justify-start',
        )}
      >
        {isRightHanded && (
          <span className="text-sm text-muted-foreground">Amount</span>
        )}
        <PillTabs
          value={mode}
          onValueChange={val => onModeChange(val as PumpingAmountMode)}
        >
          <PillTabsList size="sm">
            <PillTabsTrigger value="leftRight" size="sm">
              Left / Right
            </PillTabsTrigger>
            <PillTabsTrigger value="total" size="sm">
              Total
            </PillTabsTrigger>
          </PillTabsList>
        </PillTabs>
      </div>

      {/* Conditional content based on mode */}
      {mode === 'total'
        ? (
            <PumpingAmountSwiper
              value={totalMl}
              onChange={onTotalMlChange}
              handMode={handMode}
              settingsMode="total"
              settings={settings}
              onSettingsChange={onSettingsChange}
            />
          )
        : (
            <div className="space-y-4">
              {/* Left slider with label */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Left
                </span>
                <PumpingAmountSwiper
                  value={leftMl}
                  onChange={onLeftMlChange}
                  handMode={handMode}
                  settingsMode="perSide"
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                />
              </div>

              {/* Right slider with label */}
              <div className="space-y-2">
                <span className="text-sm font-medium text-muted-foreground">
                  Right
                </span>
                <PumpingAmountSwiper
                  value={rightMl}
                  onChange={onRightMlChange}
                  handMode={handMode}
                  settingsMode="perSide"
                  settings={settings}
                  onSettingsChange={onSettingsChange}
                />
              </div>

              {/* Total display */}
              <TotalDisplay leftMl={leftMl} rightMl={rightMl} />
            </div>
          )}
    </div>
  );
}
