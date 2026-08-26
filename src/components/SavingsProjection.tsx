import { memo, useMemo } from 'react';
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
import { WidgetHeading } from '@/components/WidgetHeading';
import { buildGoalSavingsSeries, projectionHorizonWeeks } from '@/lib/budgetMath';
import { formatCurrency } from '@/lib/format';
import type { Goal } from '@/types/budget';

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
  currentBalance: number;
  /** Week saving begins — the debt-free date, or 0 when there's no debt. */
  startWeek?: number;
}

export const SavingsProjection = memo(function SavingsProjection({
  goals,
  weeklyLeftover,
  currentBalance,
  startWeek = 0,
}: SavingsProjectionProps) {
  const weeks = useMemo(
    () => projectionHorizonWeeks(goals, weeklyLeftover, currentBalance) + startWeek,
    [goals, weeklyLeftover, currentBalance, startWeek],
  );

  // One band per goal, stacked bottom-up in priority order — the bottom band
  // is whichever goal gets funded first, and it visibly flattens the moment
  // it's done, at which point the band above it starts climbing. This shows
  // the waterfall directly instead of requiring a reader to decode where a
  // shared threshold sits, which reads as a contradiction when two goals tie.
  // The current balance counts too: it's spent first, as an instant jump at
  // week 0, before the ongoing weekly rate takes over.
  const { points, series } = useMemo(
    () => buildGoalSavingsSeries(goals, weeklyLeftover, weeks, currentBalance, startWeek),
    [goals, weeklyLeftover, weeks, currentBalance, startWeek],
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
    <Card className="h-full">
      <WidgetHeading
        title="Projected savings"
        description={
          points.length === 0
            ? undefined
            : startWeek > 0
              ? `Flat until week ${startWeek}, when your debts are gone — then ${formatCurrency(weeklyLeftover)}/wk, lowest priority number first.`
              : `At ${formatCurrency(weeklyLeftover)}/wk, held steady — lowest priority number fills first.`
        }
      />
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {points.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Nothing funding goals yet — add a goal, or free up money each week.
          </p>
        ) : (
          <>
            <ChartContainer config={config} className="aspect-auto h-64 w-full">
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
});
