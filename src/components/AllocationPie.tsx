import { memo, useMemo } from 'react';
import { Cell, Pie, PieChart } from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { ChartContainer, ChartTooltip, ChartTooltipContent, type ChartConfig } from '@/components/ui/chart';
import { WidgetHeading, widgetCardClass } from '@/components/WidgetHeading';
import { buildIncomeAllocation } from '@/lib/budgetMath';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { MoneyEntry } from '@/types/budget';
import { ChartPie } from 'lucide-react';

// Fixed slot order — a slice keeps its hue as categories come and go.
const SLICE_COLORS = [
  'var(--color-chart-1)',
  'var(--color-chart-2)',
  'var(--color-chart-3)',
  'var(--color-chart-4)',
  'var(--color-chart-5)',
  'var(--color-chart-6)',
];

interface AllocationPieProps {
  expenses: MoneyEntry[];
  weeklyIncome: number;
  weeklyLeftover: number;
}

export const AllocationPie = memo(function AllocationPie({ expenses, weeklyIncome, weeklyLeftover }: AllocationPieProps) {
  const slices = useMemo(
    () => buildIncomeAllocation(expenses, weeklyLeftover),
    [expenses, weeklyLeftover],
  );

  const config = useMemo<ChartConfig>(() => {
    return Object.fromEntries(
      slices.map((slice, i) => [
        slice.key,
        { label: slice.label, color: SLICE_COLORS[i % SLICE_COLORS.length] },
      ]),
    );
  }, [slices]);

  const total = slices.reduce((sum, s) => sum + s.weeklyAmount, 0);

  return (
    <Card className={cn('h-full', widgetCardClass('blue'))}>
      <WidgetHeading icon={ChartPie} title="Where your income goes" accent="blue" />
      <CardContent className="flex min-h-0 flex-1 flex-col">
        {slices.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Add income and expenses to see the breakdown.
          </p>
        ) : (
          <div className="flex min-h-0 flex-1 flex-col items-center gap-4 sm:flex-row">
            {/* Square by aspect ratio, so the arc scales with whatever height the
                dashboard cell gives it instead of being pinned to one size. */}
            <ChartContainer
              config={config}
              className="mx-auto aspect-square h-40 w-40 shrink-0 sm:h-full sm:max-h-52 sm:w-auto"
            >
              <PieChart>
                <ChartTooltip
                  content={
                    <ChartTooltipContent
                      hideLabel
                      formatter={(value, name) => {
                        const amount = Number(value);
                        const share = total > 0 ? (amount / total) * 100 : 0;
                        return `${config[name as string]?.label ?? name}: ${formatCurrency(amount)}/wk (${share.toFixed(0)}%)`;
                      }}
                    />
                  }
                />
                <Pie
                  data={slices}
                  dataKey="weeklyAmount"
                  nameKey="key"
                  innerRadius={44}
                  outerRadius={76}
                  // 2px of surface between slices — the gap separates, not a stroke.
                  paddingAngle={2}
                  stroke="var(--card)"
                  strokeWidth={2}
                >
                  {slices.map((slice, i) => (
                    <Cell key={slice.key} fill={SLICE_COLORS[i % SLICE_COLORS.length]} />
                  ))}
                </Pie>
              </PieChart>
            </ChartContainer>

            {/* Legend doubles as the value table — three light-mode slots sit under
                3:1 on the surface, so values must be readable without the color. */}
            <ul className="w-full min-h-0 min-w-0 flex-1 space-y-1 overflow-y-auto">
              {slices.map((slice, i) => {
                const share = total > 0 ? (slice.weeklyAmount / total) * 100 : 0;
                return (
                  <li key={slice.key} className="flex items-center gap-2 text-sm">
                    <span
                      aria-hidden
                      className="size-2.5 shrink-0 rounded-full"
                      style={{ background: SLICE_COLORS[i % SLICE_COLORS.length] }}
                    />
                    <span className="min-w-0 flex-1 truncate text-foreground">{slice.label}</span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {formatCurrency(slice.weeklyAmount)}
                    </span>
                    <span className="w-9 shrink-0 text-right tabular-nums text-muted-foreground">
                      {share.toFixed(0)}%
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
        )}

        {weeklyIncome > 0 && weeklyLeftover <= 0 && (
          <p className="mt-3 shrink-0 text-sm text-destructive">
            Expenses exceed income — there's no leftover slice to show.
          </p>
        )}
      </CardContent>
    </Card>
  );
});
