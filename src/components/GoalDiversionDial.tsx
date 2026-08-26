import { memo, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Slider } from '@/components/ui/slider';
import { WidgetHeading, widgetCardClass } from '@/components/WidgetHeading';
import { diversionImpact } from '@/lib/debtMath';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Debt } from '@/types/budget';
import { Split } from 'lucide-react';

interface GoalDiversionDialProps {
  debts: Debt[];
  /** What's left each week after minimums — the whole dial range. */
  postMinimum: number;
  goalContribution: number;
  currentBalance: number;
  /** Positive when the minimums alone already exceed the weekly leftover. */
  budgetShortfall: number;
  onChange: (amount: number) => void;
}

export const GoalDiversionDial = memo(function GoalDiversionDial({
  debts,
  postMinimum,
  goalContribution,
  currentBalance,
  budgetShortfall,
  onChange,
}: GoalDiversionDialProps) {
  const impact = useMemo(
    () => diversionImpact(debts, postMinimum, goalContribution, currentBalance),
    [debts, postMinimum, goalContribution, currentBalance],
  );

  const blocked = budgetShortfall > 0 || postMinimum <= 0;
  const diverting = goalContribution > 0;
  const toDebt = Math.max(postMinimum - goalContribution, 0);

  return (
    <Card className={cn('h-full', widgetCardClass('violet'))}>
      <WidgetHeading icon={Split} title="Debt vs. savings" accent="violet" />
      <CardContent className="flex flex-1 flex-col justify-center gap-4">
        <div className="flex items-baseline justify-between gap-4">
          <div>
            <p className="text-xs text-muted-foreground">To debt</p>
            <p className="text-2xl font-semibold tabular-nums text-rose-600 dark:text-rose-400">
              {formatCurrency(toDebt)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/wk</span>
            </p>
          </div>
          <div className="text-right">
            <p className="text-xs text-muted-foreground">To goals</p>
            <p className="text-2xl font-semibold tabular-nums text-violet-600 dark:text-violet-400">
              {formatCurrency(goalContribution)}
              <span className="ml-1 text-sm font-normal text-muted-foreground">/wk</span>
            </p>
          </div>
        </div>

        <Slider
          min={0}
          max={Math.max(postMinimum, 1)}
          step={1}
          value={Math.min(goalContribution, postMinimum)}
          disabled={blocked}
          onValueChange={(value) => {
            if (typeof value === 'number') onChange(value);
          }}
          aria-label="Weekly amount diverted from debt payoff to savings goals"
        />

        {blocked ? (
          <Alert variant="destructive">
            <AlertDescription>
              {budgetShortfall > 0
                ? `You're ${formatCurrency(budgetShortfall)}/wk short of your minimum payments, so there's nothing to split yet.`
                : 'Nothing left after minimum payments — nothing to split yet.'}
            </AlertDescription>
          </Alert>
        ) : diverting ? (
          <Alert variant="destructive">
            <AlertDescription>
              {impact.weeksDelayed !== null && impact.weeksDelayed > 0 ? (
                <>
                  Saving {formatCurrency(goalContribution)}/wk pushes your debt-free date out{' '}
                  {Math.round(impact.weeksDelayed)}{' '}
                  {Math.round(impact.weeksDelayed) === 1 ? 'week' : 'weeks'} and costs{' '}
                  {formatCurrency(impact.extraInterest)} more in interest.
                </>
              ) : (
                <>
                  Saving while you owe money slows the snowball. Every dollar here is a dollar
                  not killing debt.
                </>
              )}
            </AlertDescription>
          </Alert>
        ) : (
          <p className="text-xs text-muted-foreground">
            Everything spare is going at your debt — the fastest way out. Slide right to save
            alongside, and this will show you what it costs.
          </p>
        )}
      </CardContent>
    </Card>
  );
});
