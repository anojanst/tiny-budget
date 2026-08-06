import { useMemo } from 'react';
import { Area, AreaChart, CartesianGrid, XAxis, YAxis } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';
import { WidgetHeading, widgetCardClass } from '@/components/WidgetHeading';
import { buildGoalSavingsSeries, projectionHorizonWeeks } from '@/lib/budgetMath';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Goal } from '@/types/budget';
import { TrendingUp } from 'lucide-react';

// Fixed slot order — a goal's band keeps its hue as other goals are added or removed.
const SERIES_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

interface SavingsProjectionProps {
  goals: Goal[];
  weeklyLeftover: number;
}

export function SavingsProjection({ goals, weeklyLeftover }: SavingsProjectionProps) {
  const weeks = useMemo(
    () => projectionHorizonWeeks(goals, weeklyLeftover),
    [goals, weeklyLeftover],
  );

  // One band per goal, stacked bottom-up in priority order — the bottom band
  // is whichever goal gets funded first, and it visibly flattens the moment
  // it's done, at which point the band above it starts climbing. This shows
  // the waterfall directly instead of requiring a reader to decode where a
  // shared threshold sits, which reads as a contradiction when two goals tie.
  const { points, series } = useMemo(
    () => buildGoalSavingsSeries(goals, weeklyLeftover, weeks),
    [goals, weeklyLeftover, weeks],
  );

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((s, i) => [
          s.id,
          {
            label: s.priority !== null ? `#${s.priority} ${s.name}` : s.name,
            color: SERIES_COLORS[i % SERIES_COLORS.length],
          },
        ]),
      ),
    [series],
  );

  return (
    <Card className={cn('h-full', widgetCardClass('emerald'))}>
      <WidgetHeading icon={TrendingUp} title="Projected savings" accent="emerald" />
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No weekly leftover to save — the projection appears once income clears expenses.
          </p>
        ) : (
          <>
            <p className="mb-3 shrink-0 text-sm text-muted-foreground">
              At {formatCurrency(weeklyLeftover)}/wk, held steady — lowest priority number fills first.
            </p>
            <ChartContainer config={config} className="aspect-auto min-h-40 w-full flex-1">
              <AreaChart data={points} margin={{ top: 8, right: 12, bottom: 4, left: 4 }}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="week"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(week) => `${week}w`}
                />
                <YAxis
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  width={56}
                  tickFormatter={(value: number) =>
                    value >= 1000 ? `$${(value / 1000).toFixed(1)}k` : `$${value}`
                  }
                />
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      labelFormatter={(week) => `Week ${week}`}
                      formatter={(value) => formatCurrency(Number(value))}
                    />
                  }
                />
                {series.map((s, i) => (
                  <Area
                    key={s.id}
                    dataKey={s.id}
                    type="monotone"
                    stackId="goals"
                    // A surface-color stroke is the seam between bands, not a
                    // decorative border — same mechanism as the pie's slice gap.
                    stroke="var(--card)"
                    strokeWidth={2}
                    fill={SERIES_COLORS[i % SERIES_COLORS.length]}
                    fillOpacity={0.85}
                  />
                ))}
                {series.length > 1 && <ChartLegend content={<ChartLegendContent />} />}
              </AreaChart>
            </ChartContainer>
          </>
        )}
      </CardContent>
    </Card>
  );
}
