# Insights Dashboard with Charts

**Priority:** Medium
**Dependencies:** 01-state-management-sync.md, 08-additional-data-models.md
**Estimated Scope:** Medium

---

## Overview

Implement an insights page with charts and statistics using shadcn/ui chart components. Provide parents with meaningful visualizations of their baby's patterns.

---

## Chart Types (shadcn/ui)

shadcn/ui uses Recharts under the hood. Available chart types:

| Chart Type | Use Case |
|------------|----------|
| Area Chart | Feed amounts over time |
| Bar Chart | Daily totals comparison |
| Line Chart | Trends over weeks |
| Pie/Donut | Distribution (breast vs bottle) |

---

## Insights to Display

### Feed Insights

| Metric | Visualization |
|--------|---------------|
| Daily total intake (ml) | Bar chart (7 days) |
| Feed frequency | Line chart (trend) |
| Breast vs bottle ratio | Donut chart |
| Average feed duration | Stat card |
| Feed times pattern | Heat map (hour of day) |

### Sleep Insights (when implemented)

| Metric | Visualization |
|--------|---------------|
| Total sleep per day | Bar chart |
| Longest sleep stretch | Stat card |
| Day vs night sleep | Stacked bar |
| Sleep pattern | Timeline view |

### Growth Insights (future)

| Metric | Visualization |
|--------|---------------|
| Weight over time | Line chart |
| Percentile tracking | Area chart with bands |

---

## UI Design

### Insights Page Layout

```
┌─────────────────────────────────────────┐
│  Insights                    [7d ▼]     │
├─────────────────────────────────────────┤
│  ┌─────────────────────────────────────┐│
│  │  Daily Intake                       ││
│  │  ▁▃▅▇▅▆▄                           ││
│  │  M T W T F S S                      ││
│  └─────────────────────────────────────┘│
│                                          │
│  ┌─────────┐  ┌─────────┐              │
│  │ Avg/day │  │ Total   │              │
│  │ 850ml   │  │ 42 feeds│              │
│  └─────────┘  └─────────┘              │
│                                          │
│  ┌─────────────────────────────────────┐│
│  │  Feed Method           ┌───┐        ││
│  │                        │   │ 60%    ││
│  │  Bottle ████████       │   │ Breast ││
│  │  Breast ████████████   └───┘        ││
│  └─────────────────────────────────────┘│
└─────────────────────────────────────────┘
```

---

## Implementation Tasks

### Phase 1: Setup Charts

- [ ] Install shadcn/ui chart component: `npx shadcn@latest add chart`
- [ ] Create `src/app/[locale]/(auth)/(app)/insights/page.tsx`
- [ ] Create `insights/_components/` folder

### Phase 2: Data Aggregation

- [ ] Create `src/services/insights-calculator.ts`
- [ ] Implement `calculateDailyTotals(logs, dateRange)`
- [ ] Implement `calculateFeedDistribution(logs)`
- [ ] Implement `calculateAverages(logs)`
- [ ] Read from IndexedDB for offline support

### Phase 3: Chart Components

- [ ] Create `insights/_components/DailyIntakeChart.tsx`
- [ ] Create `insights/_components/FeedMethodChart.tsx`
- [ ] Create `insights/_components/StatCard.tsx`
- [ ] Create `insights/_components/DateRangeSelector.tsx`

### Phase 4: Interactivity

- [ ] Add date range picker (7d, 14d, 30d, custom)
- [ ] Add tap-to-drill-down on chart points
- [ ] Show tooltip on hover/tap
- [ ] Link to filtered logs view

### Phase 5: Performance

- [ ] Memoize calculations
- [ ] Use `useMemo` for chart data
- [ ] Implement lazy loading for charts below fold
- [ ] Cache aggregated data

---

## Data Calculation Examples

```typescript
// src/services/insights-calculator.ts

export function calculateDailyTotals(
  logs: LocalFeedLog[],
  days: number
): DailyTotal[] {
  const now = new Date();
  const result: DailyTotal[] = [];

  for (let i = days - 1; i >= 0; i--) {
    const date = subDays(now, i);
    const dayLogs = logs.filter(l =>
      isSameDay(new Date(l.startedAt), date)
    );

    result.push({
      date: format(date, 'yyyy-MM-dd'),
      label: format(date, 'EEE'),
      totalMl: dayLogs.reduce((sum, l) => sum + (l.amountMl ?? 0), 0),
      feedCount: dayLogs.length,
    });
  }

  return result;
}

export function calculateFeedDistribution(
  logs: LocalFeedLog[]
): FeedDistribution {
  const breast = logs.filter(l => l.method === 'breast').length;
  const bottle = logs.filter(l => l.method === 'bottle').length;
  const total = breast + bottle;

  return {
    breast: { count: breast, percentage: (breast / total) * 100 },
    bottle: { count: bottle, percentage: (bottle / total) * 100 },
  };
}
```

---

## Chart Configuration

```typescript
// Example: Daily Intake Bar Chart
import { Bar, BarChart, XAxis, YAxis } from 'recharts';
import { ChartContainer, ChartTooltip } from '@/components/ui/chart';

const chartConfig = {
  totalMl: {
    label: 'Intake (ml)',
    color: 'hsl(var(--chart-1))',
  },
};

<ChartContainer config={chartConfig}>
  <BarChart data={dailyTotals}>
    <XAxis dataKey="label" />
    <YAxis />
    <ChartTooltip />
    <Bar dataKey="totalMl" fill="var(--color-totalMl)" />
  </BarChart>
</ChartContainer>
```

---

## Success Criteria

- [ ] Charts render correctly on mobile and desktop
- [ ] Date range selector works
- [ ] Data loads from IndexedDB (works offline)
- [ ] Charts are responsive
- [ ] Performance is smooth with large datasets
- [ ] Accessible (keyboard navigation, screen reader)
