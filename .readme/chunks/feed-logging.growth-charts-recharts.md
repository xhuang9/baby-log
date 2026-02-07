---
last_verified_at: 2026-02-06T12:00:00Z
source_paths:
  - src/app/[locale]/(auth)/(app)/logs/_components/growth-charts/components/GrowthLineChart.tsx
  - src/app/[locale]/(auth)/(app)/logs/_components/growth-charts/
---

# Growth Charts with Recharts

## Purpose

Growth chart visualization using Recharts LineChart component displaying baby's measurements against WHO/CDC percentile curves (3rd, 15th, 50th, 85th, 97th percentiles) with proper axis tick configuration, tooltip formatting, and domain scaling.

## Key Components

### GrowthLineChart

Main chart component rendering:
- **Percentile lines**: Dotted/dashed strokes, varying opacities, muted colors
- **Baby's measurements**: Solid line with circular dots, bright accent color (`--chart-1`)
- **Interactive tooltips**: Proper month labels and unit formatting
- **Responsive grid**: Vertical and horizontal grid with border color

### Data Structure

```typescript
type GrowthChartDataPoint = {
  month: number;          // 0-24 months
  p3: number | undefined;   // 3rd percentile value
  p15: number | undefined;  // 15th percentile
  p50: number | undefined;  // 50th percentile
  p85: number | undefined;  // 85th percentile
  p97: number | undefined;  // 97th percentile
  baby: number | undefined; // Baby's actual measurement
};

type GrowthChartConfig = {
  unit: string;             // e.g., "cm", "kg"
  label: string;            // e.g., "Height", "Weight"
};
```

## Y-Axis Configuration

### Domain Calculation

Calculate based on all visible data points (percentiles + baby):
- **Min**: `Math.floor(Math.min(...allValues) * 0.95)` - 5% padding below
- **Max**: `Math.ceil(Math.max(...allValues) * 1.05)` - 5% padding above

### Tick Interval (Smart Rounding)

Target ~6 ticks for readable spacing:

1. Calculate raw interval: `range / 6`
2. Determine magnitude (power of 10): `Math.pow(10, Math.floor(Math.log10(rawInterval)))`
3. Normalize to 1-10 scale: `rawInterval / magnitude`
4. Round to nice value: 1, 2, 5, or 10
5. Final tick interval: `niceInterval * magnitude`

**Example**: Range 20-80 (span 60)
- Raw: 60/6 = 10
- Magnitude: 10
- Normalized: 1.0 → rounds to 1
- Tick interval: 1 * 10 = 10
- Result: ticks [20, 30, 40, 50, 60, 70, 80]

### Generate Ticks Array

```typescript
const yAxisTicks: number[] = [];
const startTick = Math.ceil(minY / tickInterval) * tickInterval;
for (let tick = startTick; tick <= maxY; tick += tickInterval) {
  yAxisTicks.push(tick);
}
```

Ensures first tick aligns to interval boundary.

## X-Axis Configuration

### Tick Coverage

Display all months 0-24 for granular time reference:

```typescript
ticks={Array.from({ length: 25 }, (_, i) => i)}
```

This generates `[0, 1, 2, ..., 24]`, enabling exact month labeling on tooltip and grid alignment.

## Tooltip Customization

### Label Formatter Fix

**Problem**: `labelFormatter` receives raw axis value, not data point. Hovering months 0-3 always showed "3rd months" because Recharts snaps to nearest data point by default.

**Solution**: Extract month from payload's actual data point:

```typescript
labelFormatter={(_, payload) => {
  // Access the data point's month value directly from payload
  const month = payload?.[0]?.payload?.month;
  return month !== undefined ? `${month} months` : '';
}}
```

**Key patterns**:
- `payload[0]` = first series data (always present in Recharts single-series tooltips)
- `payload[0].payload` = actual data object from chart data array
- `payload[0].payload.month` = unambiguous month value

### Value Formatter

Per-series formatting with semantic labeling:

```typescript
formatter={(value, name) => {
  const label = chartConfig[name]?.label || name;
  const isBaby = name === 'baby';
  const formattedValue = typeof value === 'number' ? value.toFixed(1) : value;

  return (
    <span className="flex items-center gap-2">
      <span className={isBaby ? 'text-chart-1 font-medium' : 'text-muted-foreground'}>
        {label}:
      </span>
      <span className="font-mono font-medium">
        {formattedValue}{config.unit}
      </span>
    </span>
  );
}}
```

- Baby's measurement: bold, accent color (`--chart-1`)
- Percentile lines: muted, regular weight
- Values: monospace font, 1 decimal place

## Styling

### CSS Variables

Chart uses CSS variables for theme consistency:

```css
/* Colors from chartConfig */
--color-p3: var(--muted-foreground)
--color-p15: var(--muted-foreground)
--color-p50: var(--primary)
--color-p85: var(--muted-foreground)
--color-p97: var(--muted-foreground)
--color-baby: var(--chart-1)

/* Grid & axes */
--border: for grid lines
```

### Line Styling

- **Percentile lines (outer p3, p97)**: Dotted `"2 4"`, opacity 0.4
- **Percentile lines (inner p15, p85)**: Dashed `"8 4"`, opacity 0.6
- **Median line (p50)**: Solid, 2px width, full opacity
- **Baby's line**: Solid, 2px width, dots at data points (r: 4), active dot r: 6

## Responsive Layout

```tsx
<ChartContainer config={chartConfig} className="aspect-[4/3] w-full">
  <LineChart data={data} margin={{ top: 12, right: 12, bottom: 12, left: 12 }}>
```

- Maintains 4:3 aspect ratio
- Full width container
- Symmetric 12px margins
- Respects container width on mobile/desktop

## Related

- `.readme/sections/feed-logging.index.md` - Activity logging architecture
- `.readme/chunks/styling.color-tokens.md` - CSS variable theming
