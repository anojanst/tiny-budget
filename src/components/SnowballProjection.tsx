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
import { buildDebtPayoffSeries } from '@/lib/debtMath';
import { formatCurrency } from '@/lib/format';
import type { Debt } from '@/types/budget';

// Fixed slot order — a debt's band keeps its hue as others are paid off.
const SERIES_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

interface SnowballProjectionProps {
  debts: Debt[];
  weeklyExtra: number;
  currentBalance: number;
}

export const SnowballProjection = memo(function SnowballProjection({
  debts,
  weeklyExtra,
  currentBalance,
}: SnowballProjectionProps) {
  // Mirror image of the savings chart: bands drain instead of climb. The
  // bottom band is the debt being attacked, so it hits zero first and vanishes,
  // at which point the one above it starts falling faster — the snowball,
  // visible as a change in slope.
  const { points, series } = useMemo(
    () => buildDebtPayoffSeries(debts, weeklyExtra, currentBalance),
    [debts, weeklyExtra, currentBalance],
  );

  const config = useMemo<ChartConfig>(
    () =>
      Object.fromEntries(
        series.map((s, i) => [s.id, { label: s.name, color: SERIES_COLORS[i % SERIES_COLORS.length] }]),
      ),
    [series],
  );

  return (
    <Card className="h-full">
      <WidgetHeading
        title="Payoff projection"
        description={
          points.length === 0
            ? undefined
            : `${formatCurrency(weeklyExtra)}/wk on top of minimums — each band drops out as that debt is cleared.`
        }
      />
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {points.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Add a debt and a payment to see the payoff curve.
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
                    stackId="debts"
                    // Surface-color stroke is the seam between bands, not a border.
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
