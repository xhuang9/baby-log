---
last_verified_at: 2026-01-08T14:30:00Z
source_paths:
  - src/actions/feedLogActions.ts
---

# Feed Amount Estimation Algorithm

## Purpose

Automatic estimation of breast feed amounts (ml) from duration (minutes) when user doesn't provide exact measurement.

## Current Implementation

**Location**: `src/actions/feedLogActions.ts` in `createFeedLog()`

```typescript
if (data.method === 'breast' && data.durationMinutes && !amountMl) {
  // Basic estimation: approximately 1-1.5ml per minute for newborns
  amountMl = Math.round(data.durationMinutes * 1.2);
  isEstimated = true;
  estimatedSource = 'default_model';
}
```

## Key Parameters

- **Rate**: 1.2 ml/minute (conservative baseline)
- **Rounding**: `Math.round()` to nearest whole ml
- **Fallback**: Only applied when `amountMl` not provided
- **Tracking**: Marked with `isEstimated: true` and `estimatedSource: 'default_model'`

## Rationale

### Why 1.2 ml/minute?

Research suggests newborns transfer approximately 1-1.5ml per minute during effective breast feeding. The 1.2 ml/minute rate is a conservative mid-point suitable for:

- **Newborns** (0-3 months): ~1-1.5 ml/min
- **Older babies** (4-12 months): ~1.5-2 ml/min (but feed faster, so total is similar)

**Trade-off**: Slightly underestimates for older babies, but avoids overestimation for newborns.

## Future Enhancements

### 1. Age-Adjusted Model

```typescript
function getEstimationRate(babyBirthDate: Date): number {
  const ageMonths = calculateAgeInMonths(babyBirthDate);

  if (ageMonths < 3) return 1.2;
  if (ageMonths < 6) return 1.4;
  if (ageMonths < 12) return 1.6;
  return 1.5; // older babies feed faster but less frequently
}
```

**Data needed**: Baby's birth date (already available in `babiesSchema`).

### 2. Gender-Adjusted Model

```typescript
function getEstimationRate(babyBirthDate: Date, gender: string): number {
  const baseRate = getAgeAdjustedRate(babyBirthDate);

  // Boys typically consume 10-15% more
  if (gender === 'male') return baseRate * 1.125;
  return baseRate;
}
```

**Data needed**: Baby's gender (already available in `babiesSchema`).

### 3. User Custom Rate

```typescript
// In userSchema:
customBreastFeedRate: integer('custom_breast_feed_rate') // ml per minute * 10

// In estimation:
const rate = localUser.customBreastFeedRate
  ? localUser.customBreastFeedRate / 10
  : getDefaultRate(baby);
```

**Use case**: Allows parents to calibrate based on weighed feeds.

**UI**: Settings page with "Breast Feed Estimation Rate" slider (1.0 - 2.5 ml/min).

### 4. Machine Learning Model

**Approach**: Train on historical data where both duration and actual amount were measured.

**Features**:
- Baby age (days)
- Baby gender
- Time of day
- Days since birth
- Previous feed interval
- Baby weight percentile (if tracked)

**Implementation**: External service or edge function (too complex for SQL).

## Estimation Source Types

Current and planned:

```typescript
type EstimationSource =
  | 'default_model'     // Current: 1.2 ml/min
  | 'age_adjusted'      // Future: Age-based rate
  | 'gender_adjusted'   // Future: Age + gender rate
  | 'user_rate'         // Future: Custom user rate
  | 'ml_model'          // Future: ML prediction
  | 'manual_guess';     // User entered estimated amount
```

**Storage**: `feed_log.estimatedSource` text field.

## Transparency Pattern

All estimated amounts are explicitly marked:

```typescript
isEstimated: boolean
estimatedSource: text
```

**UI Impact**: Could show "~120ml (estimated)" vs "120ml (measured)".

**Analytics**: Filter to measured-only feeds for accuracy analysis.

## Gotchas

- **Zero Duration**: If `durationMinutes` is 0 or null, no estimation is made
- **Manual Override**: User can provide `amountMl` even for breast feeds (e.g., after weighed feed)
- **Negative Durations**: UI prevents, but validation could be added
- **Rounding**: Always rounds to nearest ml (no decimals in UI or DB)

## Related

- `chunks/feed-logging.server-actions.md` - Where estimation is applied
- `chunks/feed-logging.schema-design.md` - Schema fields for estimation tracking
