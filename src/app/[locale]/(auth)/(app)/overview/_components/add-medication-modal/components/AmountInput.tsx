'use client';

import type { MedicationUnit } from '@/lib/local-db';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  convertOnUnitSwitch,
  getHelperText,
  getMinForUnit,
  getStepForUnit,
  MEDICATION_UNITS,
} from '@/lib/medication-units';
import { cn } from '@/lib/utils';

type AmountInputProps = {
  amount: number;
  unit: MedicationUnit;
  onAmountChange: (amount: number) => void;
  onUnitChange: (unit: MedicationUnit) => void;
  handMode?: 'left' | 'right';
  error?: string;
};

export function AmountInput({
  amount,
  unit,
  onAmountChange,
  onUnitChange,
  handMode = 'right',
  error,
}: AmountInputProps) {
  const step = getStepForUnit(unit);
  const minValue = getMinForUnit(unit);

  const handleDecrement = () => {
    const newAmount = Math.max(minValue, amount - step);
    onAmountChange(newAmount);
  };

  const handleIncrement = () => {
    onAmountChange(amount + step);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = Number.parseFloat(e.target.value);
    if (!Number.isNaN(value) && value >= 0) {
      onAmountChange(value);
    }
  };

  const handleUnitChange = (newUnit: MedicationUnit) => {
    if (newUnit === unit) {
      return;
    }

    // Convert amount when switching between units
    const convertedAmount = convertOnUnitSwitch(amount, unit, newUnit);
    onAmountChange(convertedAmount);
    onUnitChange(newUnit);
  };

  // Get helper text based on unit type
  const helperText = getHelperText(unit);

  // Show validation error if amount is invalid
  const showError = error || (amount <= 0 ? 'Please enter a valid dose amount.' : null);

  return (
    <div className="space-y-3">
      <Label>Amount</Label>

      {/* Amount control with +/- buttons */}
      <div
        className={cn(
          'flex items-center gap-3',
          handMode === 'left' ? 'flex-row' : 'flex-row-reverse',
        )}
      >
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleDecrement}
            disabled={amount <= minValue}
          >
            <Minus className="h-4 w-4" />
          </Button>

          <Input
            type="number"
            value={amount}
            onChange={handleInputChange}
            min={0}
            step={step}
            className={cn('w-20 text-center text-base', showError && 'border-destructive')}
          />

          <Button
            type="button"
            variant="outline"
            size="icon"
            onClick={handleIncrement}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Unit selector */}
        <div className="flex flex-wrap gap-1">
          {MEDICATION_UNITS.map(u => (
            <Button
              key={u}
              type="button"
              variant={unit === u ? 'default' : 'outline'}
              size="sm"
              onClick={() => handleUnitChange(u)}
              className="min-w-[50px]"
            >
              {u}
            </Button>
          ))}
        </div>
      </div>

      {/* Validation error */}
      {showError && (
        <p className="text-xs text-destructive">{showError}</p>
      )}

      {/* Helper text */}
      <div className="space-y-0.5 text-xs text-muted-foreground">
        <p>{helperText.primary}</p>
        {helperText.secondary && (
          <p className="text-muted-foreground/70">{helperText.secondary}</p>
        )}
      </div>
    </div>
  );
}
