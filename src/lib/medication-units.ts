/**
 * Medication Unit Conversion Utilities
 *
 * Standard conversions:
 * - 1 tsp = 5 ml = 20 drops
 * - 1 ml = 4 drops
 */

import type { MedicationUnit } from '@/lib/local-db';

// Liquid units that can be converted between each other
const LIQUID_UNITS = ['ml', 'drops', 'tsp', 'tbsp'] as const;

// Conversion factors to ml (base unit) - only for liquid units
const TO_ML: Partial<Record<MedicationUnit, number>> = {
  ml: 1,
  drops: 0.25, // 1 drop = 0.25 ml (4 drops = 1 ml)
  tsp: 5, // 1 tsp = 5 ml
  tbsp: 15, // 1 tbsp = 15 ml (kept for backwards compat)
};

// Conversion factors from ml - only for liquid units
const FROM_ML: Partial<Record<MedicationUnit, number>> = {
  ml: 1,
  drops: 4, // 1 ml = 4 drops
  tsp: 0.2, // 1 ml = 0.2 tsp
  tbsp: 1 / 15, // 1 ml = 1/15 tbsp (kept for backwards compat)
};

/**
 * Check if a unit is a liquid unit (can be converted)
 */
export function isLiquidUnit(unit: MedicationUnit): boolean {
  return (LIQUID_UNITS as readonly string[]).includes(unit);
}

/**
 * Convert an amount from one unit to another
 * Only converts between liquid units; returns original amount for solid units
 */
export function convertMedicationUnit(
  amount: number,
  fromUnit: MedicationUnit,
  toUnit: MedicationUnit,
): number {
  if (fromUnit === toUnit) {
    return amount;
  }

  // Only convert if both are liquid units
  if (!isLiquidUnit(fromUnit) || !isLiquidUnit(toUnit)) {
    return amount;
  }

  // Convert to ml first, then to target unit
  const toMlFactor = TO_ML[fromUnit];
  const fromMlFactor = FROM_ML[toUnit];

  if (toMlFactor === undefined || fromMlFactor === undefined) {
    return amount;
  }

  const inMl = amount * toMlFactor;
  return inMl * fromMlFactor;
}

/**
 * Convert amount when switching units in the UI
 * - Liquid → Liquid: Auto-convert value
 * - Liquid ↔ Solid: Keep numeric value as-is
 */
export function convertOnUnitSwitch(
  amount: number,
  fromUnit: MedicationUnit,
  toUnit: MedicationUnit,
): number {
  if (fromUnit === toUnit) {
    return amount;
  }

  const fromLiquid = isLiquidUnit(fromUnit);
  const toLiquid = isLiquidUnit(toUnit);

  // Only convert if both are liquid units
  if (fromLiquid && toLiquid) {
    const converted = convertMedicationUnit(amount, fromUnit, toUnit);
    return roundForUnit(converted, toUnit);
  }

  // Keep value as-is when switching between liquid and solid
  return amount;
}

/**
 * Round amount according to unit rules:
 * - drops: nearest integer
 * - ml, tsp, tbsp: max 2 decimal places
 * - solid units: max 2 decimal places
 */
export function roundForUnit(amount: number, unit: MedicationUnit): number {
  if (unit === 'drops') {
    return Math.round(amount);
  }
  // Round to 2 decimal places, remove trailing zeros
  return Math.round(amount * 100) / 100;
}

/**
 * Format amount with unit for display
 * e.g., "2.5 ml", "10 drops", "0.5 tsp"
 */
export function formatMedicationAmount(amount: number, unit: MedicationUnit): string {
  const rounded = roundForUnit(amount, unit);
  // Format to remove unnecessary trailing zeros
  const formatted = unit === 'drops' ? String(rounded) : rounded.toFixed(2).replace(/\.?0+$/, '');
  return `${formatted} ${unit}`;
}

/**
 * Get conversion display text showing equivalent amounts
 * e.g., "2.5 ml = 10 drops = 0.5 tsp"
 */
export function getConversionDisplay(amount: number, unit: MedicationUnit): string {
  // Only show conversion for liquid units
  if (!isLiquidUnit(unit)) {
    return '';
  }

  const ml = convertMedicationUnit(amount, unit, 'ml');
  const drops = convertMedicationUnit(amount, unit, 'drops');
  const tsp = convertMedicationUnit(amount, unit, 'tsp');

  const parts: string[] = [];

  if (unit !== 'tsp') {
    parts.push(`${tsp.toFixed(2).replace(/\.?0+$/, '')} tsp`);
  }
  if (unit !== 'ml') {
    parts.push(`${ml.toFixed(2).replace(/\.?0+$/, '')} ml`);
  }
  if (unit !== 'drops') {
    parts.push(`${Math.round(drops)} drops`);
  }

  return parts.join(' = ');
}

/**
 * Get helper text for the amount input based on selected unit
 */
export function getHelperText(unit: MedicationUnit): { primary: string; secondary?: string } {
  if (isLiquidUnit(unit)) {
    return {
      primary: '1 tsp = 5 ml = 20 drops',
      secondary: 'tsp = teaspoon, ml = milliliter',
    };
  }

  return {
    primary: 'Use the exact amount shown on the medicine/supplement label.',
  };
}

/**
 * Unit labels for display in UI
 */
export const MEDICATION_UNIT_LABELS: Record<MedicationUnit, string> = {
  ml: 'ml',
  drops: 'drops',
  tsp: 'tsp',
  tbsp: 'tbsp',
  tablet: 'tablet',
  capsule: 'capsule',
  sachet: 'sachet',
};

/**
 * All available medication units (excludes tbsp from UI)
 */
export const MEDICATION_UNITS: MedicationUnit[] = ['drops', 'ml', 'tsp', 'tablet', 'capsule', 'sachet'];

/**
 * Grouped units for the Amount UI selector
 */
export const LIQUID_MEDICATION_UNITS: MedicationUnit[] = ['drops', 'ml', 'tsp'];
export const NON_LIQUID_MEDICATION_UNITS: MedicationUnit[] = ['tablet', 'capsule', 'sachet'];

/**
 * Get the step value for +/- buttons based on unit
 */
export function getStepForUnit(unit: MedicationUnit): number {
  // Integer steps for drops and solid units
  if (unit === 'drops' || !isLiquidUnit(unit)) {
    return 1;
  }
  // 0.5 steps for liquid units (ml, tsp, tbsp)
  return 0.5;
}

/**
 * Get minimum allowed value for a unit
 */
export function getMinForUnit(unit: MedicationUnit): number {
  return getStepForUnit(unit);
}
