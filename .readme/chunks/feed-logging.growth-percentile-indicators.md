---
last_verified_at: 2026-02-07T18:00:00Z
source_paths:
  - src/lib/growth-calculations.ts
  - src/lib/percentile-calculations.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/hooks/useBabyData.ts
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/components/PercentileIndicator.tsx
  - src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/AddGrowthModal.tsx
---

# Growth Percentile Indicators

## Purpose

Real-time WHO percentile bracket display in the AddGrowthModal component. Users see percentile labels (e.g., ">97%", "50-85%") appear in primary color next to measurement inputs as they enter weight, height, and head circumference values.

## Key Features

- **Real-Time Calculation**: Percentiles calculate as user types, providing instant feedback
- **WHO-Compliant Brackets**: Six percentile ranges (< 3%, 3-15%, 15-50%, 50-85%, 85-97%, >97%)
- **Layout Stability**: Fixed-width containers (w-14) reserve space for indicators, preventing input field shifting
- **Gender Validation**: Only displays percentiles for babies with binary gender (male/female) - WHO data requirement
- **Age-Based Filtering**: Returns null for ages outside 0-24 months range (WHO data limit)
- **Primary Color Styling**: Uses teal color (#00BBA7 light, #68bea8 dark) for non-alarming display
- **Accessibility**: aria-label on percentile indicator for screen readers

## Implementation Details

### Utility Functions

#### `calculateAgeInMonths(birthDate, measurementDate)`

Located in `src/lib/growth-calculations.ts`

Converts birth date and measurement date to decimal months for precise WHO percentile lookups.

```typescript
calculateAgeInMonths(new Date('2023-01-01'), new Date('2023-03-15'))
// Returns: ~2.45 months (decimal precision)
```

**Formula**: `(measurementDate - birthDate) / 30.4375 days`

Uses 30.4375 as average days per month (365.25 / 12) for accuracy across leap years.

#### `calculatePercentile(params)`

Located in `src/lib/percentile-calculations.ts`

Maps measurement values against WHO growth curve data to determine percentile bracket.

**Parameters**:
- `value`: Measurement in display units (kg for weight, cm for height/head)
- `metric`: 'weight' | 'length' | 'head'
- `gender`: 'male' | 'female' | 'other' | 'unknown' | null
- `ageInMonths`: Decimal age in months

**Returns**: String bracket (e.g., ">97%") or null if calculation unavailable

**Edge Cases**:
- Returns null if gender is not 'male' or 'female' (WHO requires binary classification)
- Returns null if age outside 0-24 months (WHO data boundary)
- Returns null if value is missing, null, undefined, or <= 0

**Chart Key Mapping**:
- Weight: `cht-wfa-boys-p-0-2` (male) / `cht-wfa-girls-p-0-2` (female)
- Height/Length: `cht-lfa-boys-p-0-2` (male) / `cht-lfa-girls-p-0-2` (female)
- Head Circumference: `cht_hcfa_boys_p_0_2` (male) / `cht_hcfa_girls_p_0_2` (female)

### React Hook: `useBabyData(babyId)`

Located in `src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/hooks/useBabyData.ts`

Fetches baby and user data from IndexedDB for percentile calculations using dexie-react-hooks.

```typescript
const { baby, userCreatedAt, isLoading } = useBabyData(babyId);
```

**Returns**:
- `baby`: Baby document (null if not found or still loading)
- `userCreatedAt`: User registration date from local database (null if unavailable)
- `isLoading`: True only while baby data is loading (not while user data loads)

**Data Fetching Pattern**:
- `baby`: Reactive query via `useLiveQuery()` - updates on IndexedDB changes
- `userCreatedAt`: Reactive query via `useLiveQuery()` - fallback for birth date calculation if baby.dateOfBirth unavailable
- Returns null for userCreatedAt during initial load to prevent premature null rendering

### Component: `PercentileIndicator`

Located in `src/app/[locale]/(auth)/(app)/overview/_components/add-growth-modal/components/PercentileIndicator.tsx`

Simple presentational component displaying percentile label in primary color.

```typescript
<PercentileIndicator percentileLabel=">97%" />
// Renders: <span className="text-primary">>97%</span>
```

**Props**:
- `percentileLabel`: String bracket (e.g., ">97%", "50-85%")

**Styling**:
- `text-primary`: Teal color (#00BBA7 / #68bea8 dark mode)
- `text-sm font-medium`: Small, bold label
- `role="status"`: Announces updates to screen readers
- `aria-label`: Full percentile description

## Integration with AddGrowthModal

### Percentile Calculation Flow

Three `useMemo` hooks calculate percentiles for weight, height, and head circumference:

```typescript
const weightPercentile = useMemo(() => {
  if (!baby || !state.weightG || isBabyLoading) {
    return null;
  }

  const birthInfo = getBirthDateForCalculation(baby, userCreatedAt);
  if (!birthInfo) {
    return null;
  }

  const ageInMonths = calculateAgeInMonths(birthInfo.birthDate, state.startTime);

  return calculatePercentile({
    value: state.weightG / 1000, // g to kg
    metric: 'weight',
    gender: baby.gender,
    ageInMonths,
  });
}, [baby, state.weightG, state.startTime, userCreatedAt, isBabyLoading]);
```

**Dependencies**:
- `baby`: Baby document (changes trigger recalculation)
- `state.weightG`: User-entered weight in grams
- `state.startTime`: Measurement datetime (affects age calculation)
- `userCreatedAt`: Fallback for birth date
- `isBabyLoading`: Prevents display during IndexedDB load

### Layout

Fixed-width containers reserve space for indicators to prevent layout shift:

```typescript
{/* Weight Input */}
<div className="flex items-center gap-3">
  <Label className="w-24">Weight</Label>
  <div className="relative flex-1">
    <Input type="number" ... />
    <span className="absolute right-3">kg</span>
  </div>
  <div className="w-14 text-right">
    {weightPercentile && <PercentileIndicator percentileLabel={weightPercentile} />}
  </div>
</div>
```

**Key Points**:
- `w-14` (56px) fixed container reserves space for indicator text
- `text-right` aligns label within container
- Conditional render: only shows when percentile is not null
- `gap-3` adds consistent spacing between label, input, and indicator

### Unit Conversions

User inputs displayed in standard units, internal storage in smaller units for precision:

- **Weight**: Input in kg, stored in grams (state.weightG)
  - Display: `state.weightG / 1000`
  - Store: `Math.round(num * 1000)`
  - Pass to percentile calculation: kg (g / 1000)

- **Height**: Input in cm, stored in millimeters (state.heightMm)
  - Display: `state.heightMm / 10`
  - Store: `Math.round(num * 10)`
  - Pass to percentile calculation: cm (mm / 10)

- **Head Circumference**: Input in cm, stored in millimeters (state.headCircumferenceMm)
  - Display: `state.headCircumferenceMm / 10`
  - Store: `Math.round(num * 10)`
  - Pass to percentile calculation: cm (mm / 10)

## Patterns & Conventions

### Age Calculation
- Uses `getBirthDateForCalculation()` utility from growth charts module
- Fallback chain: `baby.dateOfBirth` → `userCreatedAt` (account creation date)
- Returns null if neither available

### WHO Data Integration
- Uses existing WHO percentile curves from `src/lib/growth-chart-data.ts`
- Data covers 0-24 months range only
- Curves separated by gender (male/female) and metric (weight, height, head)
- Data sourced from `getWHOPercentileData(chartKey)` - returns array of data points with percentile values for each month

### Error Handling
- Null-safe calculations: returns null at every validation point
- No error messages shown to user - indicator simply doesn't display
- Form submission not blocked by missing percentiles

## Gotchas

- **Gender is Required**: Won't calculate percentiles if baby.gender is null, 'other', or 'unknown'. Only 'male' and 'female' have WHO data.
- **Age Rounding**: WHO data is per-month, so ageInMonths is rounded to nearest integer. Babies born mid-month show rounding effects.
- **Measurement Date Changes**: Changing the measurement date (via TimeSwiper) recalculates age and all percentiles in real-time.
- **Loading State**: isLoading flag refers only to baby data, not userCreatedAt. Percentiles won't display until baby data loads.
- **Performance**: Three separate useMemo hooks (one per metric). If performance becomes issue, could merge into single calculation, but current approach is clearer.

## Related

- `.readme/sections/feed-logging.index.md` - Feed logging system overview
- `.readme/chunks/feed-logging.growth-charts-recharts.md` - Growth chart visualization (uses same WHO data)
- `.readme/chunks/account-management.index.md` - Baby data model and attributes
