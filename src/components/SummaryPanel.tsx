import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Frequency, Income } from '@/types/budget';
import { Wallet } from 'lucide-react';

interface SummaryPanelProps {
  income: Income;
  onIncomeChange: (patch: Partial<Income>) => void;
  currentBalance: number;
  onCurrentBalanceChange: (amount: number) => void;
  weeklyIncome: number;
  weeklyExpenses: number;
  weeklyLeftover: number;
  /** What's actually spendable this week — 0 whenever a goal is still
   * absorbing the whole leftover, per the priority waterfall. */
  freeLeftover: number;
  hasDebts: boolean;
  debtMinimums: number;
}

export function SummaryPanel({
  income,
  onIncomeChange,
  currentBalance,
  onCurrentBalanceChange,
  weeklyIncome,
  weeklyExpenses,
  weeklyLeftover,
  freeLeftover,
  hasDebts,
  debtMinimums,
}: SummaryPanelProps) {
  const inTheRed = weeklyLeftover <= 0;
  // Distinct from overspending: every dollar is accounted for, just not
  // yours to spend yet — it's on its way to a goal instead.
  const isFullyCommitted = !inTheRed && freeLeftover === 0;

  return (
    <Card
      className={cn(
        // Card's own bg-card/40 gets dropped by tailwind-merge once we hand
        // it a competing bg-gradient-to-r, so the translucency has to be
        // reapplied on every stop here to keep this card glass-consistent.
        'h-full border-l-4 bg-gradient-to-r',
        inTheRed
          ? 'border-l-rose-500 from-rose-500/20 via-card/40 to-card/40 dark:from-rose-500/15 dark:via-card/25 dark:to-card/25 dark:border-l-rose-400'
          : 'border-l-emerald-500 from-blue-500/20 via-card/40 to-emerald-500/20 dark:from-blue-500/15 dark:via-card/25 dark:to-emerald-500/15 dark:border-l-emerald-400',
      )}
    >
      <WidgetHeading icon={Wallet} title="Right now" accent="emerald" />
      <CardContent className="flex flex-1 flex-col justify-center gap-4">
        {/* One row, not two stacked columns — Balance and Income are each
            about as tall as a stat readout, so stacking them made the input
            side much taller than the output side and left dead air under it. */}
        <div className="flex flex-wrap items-start gap-x-8 gap-y-4">
          <div className="shrink-0">
            <Label htmlFor="current-balance" className="text-xs text-muted-foreground">
              Current balance
            </Label>
            <Input
              id="current-balance"
              type="number"
              step="0.01"
              value={currentBalance}
              onChange={(e) => onCurrentBalanceChange(e.target.valueAsNumber || 0)}
              className="mt-1 w-32"
            />
          </div>

          <div className="shrink-0">
            <Label htmlFor="income-amount" className="text-xs text-muted-foreground">
              Income
            </Label>
            <div className="mt-1 flex items-center gap-2">
              <Input
                id="income-amount"
                type="number"
                min="0"
                step="0.01"
                value={income.amount}
                onChange={(e) => onIncomeChange({ amount: e.target.valueAsNumber || 0 })}
                className="w-24"
              />
              <ToggleGroup
                value={[income.frequency]}
                onValueChange={(value) => {
                  if (value[0]) onIncomeChange({ frequency: value[0] as Frequency });
                }}
                variant="outline"
                size="sm"
              >
                <ToggleGroupItem value="weekly">Weekly</ToggleGroupItem>
                <ToggleGroupItem value="monthly">Monthly</ToggleGroupItem>
              </ToggleGroup>
            </div>
            <p className="mt-1 text-xs tabular-nums text-muted-foreground">
              {formatCurrency(weeklyIncome)}/wk
            </p>
          </div>

          <Separator orientation="vertical" className="hidden self-stretch sm:block" />

          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">Expenses</p>
            <p className="mt-1 text-lg font-semibold">{formatCurrency(weeklyExpenses)}/wk</p>
          </div>

          {hasDebts && (
            <div className="shrink-0">
              <p className="text-xs text-muted-foreground">Debt minimums</p>
              <p className="mt-1 text-lg font-semibold text-rose-600 dark:text-rose-400">
                {formatCurrency(debtMinimums)}/wk
              </p>
            </div>
          )}

          {/* Hero figure — what's actually free to spend, not the raw
              income-minus-expenses pool. The waterfall sends 100% of that
              pool to whichever goal is still unfunded, so this reads $0
              until every goal is met — which is correct, not a bug. */}
          <div className="shrink-0">
            <p className="text-xs text-muted-foreground">Free each week</p>
            <p
              className={cn(
                'text-4xl font-semibold tracking-tight',
                inTheRed
                  ? 'text-destructive'
                  : isFullyCommitted
                    ? 'text-violet-600 dark:text-violet-400'
                    : 'text-emerald-600 dark:text-emerald-400',
              )}
            >
              {formatCurrency(freeLeftover)}
            </p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          {hasDebts
            ? 'Every spare dollar goes at your debts first — see Debt vs. savings to split it.'
            : 'Balance and leftover both fund unmet goals first, by priority.'}
        </p>

        {inTheRed && weeklyIncome > 0 && (
          <Alert variant="destructive">
            <AlertDescription>
              Spending more than you earn — goals won't progress until there's leftover.
            </AlertDescription>
          </Alert>
        )}

        {isFullyCommitted && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(weeklyLeftover)}/wk is fully committed to{' '}
            {hasDebts ? 'debt payoff' : 'goals'} — see{' '}
            {hasDebts ? 'Debts' : 'Goals'} for the breakdown.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
