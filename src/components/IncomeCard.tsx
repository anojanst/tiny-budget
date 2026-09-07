import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Separator } from '@/components/ui/separator';
import { FrequencySelect } from '@/components/ui/frequency-select';
import { formatCurrency } from '@/lib/format';
import { cn } from '@/lib/utils';
import type { Frequency, Income } from '@/types/budget';

interface IncomeCardProps {
  income: Income;
  onIncomeChange: (patch: Partial<Income>) => void;
  currentBalance: number;
  onCurrentBalanceChange: (amount: number) => void;
  weeklyIncome: number;
  weeklyExpenses: number;
  weeklyLeftover: number;
  hasDebts: boolean;
  debtMinimums: number;
}

/**
 * Inputs and the figures they produce, in one strip. They were separate cards,
 * which read fine but cost two rows of vertical space before the expense list
 * even started — and the list is the reason anyone opens this page.
 */
export function IncomeCard({
  income,
  onIncomeChange,
  currentBalance,
  onCurrentBalanceChange,
  weeklyIncome,
  weeklyExpenses,
  weeklyLeftover,
  hasDebts,
  debtMinimums,
}: IncomeCardProps) {
  const inTheRed = weeklyLeftover <= 0;

  return (
    <Card>
      <CardContent className="flex flex-wrap items-end gap-x-8 gap-y-5">
        <div>
          <Label htmlFor="income-amount" className="text-xs text-muted-foreground">
            Take-home income
          </Label>
          <div className="mt-1.5 flex items-center gap-2">
            <Input
              id="income-amount"
              type="number"
              min="0"
              step="0.01"
              value={income.amount}
              onChange={(e) => onIncomeChange({ amount: e.target.valueAsNumber || 0 })}
              className="w-28"
            />
            <FrequencySelect
              value={income.frequency}
              onValueChange={(frequency: Frequency) => onIncomeChange({ frequency })}
              aria-label="How often you are paid"
              className="w-24"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="current-balance" className="text-xs text-muted-foreground">
            Cash on hand
          </Label>
          <Input
            id="current-balance"
            type="number"
            min="0"
            step="0.01"
            value={currentBalance}
            onChange={(e) => onCurrentBalanceChange(e.target.valueAsNumber || 0)}
            className="mt-1.5 w-32"
          />
        </div>

        <Separator orientation="vertical" className="hidden h-12 self-end sm:block" />

        <div>
          <p className="text-xs text-muted-foreground">Income</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(weeklyIncome)}
            <span className="text-sm font-normal text-muted-foreground">/wk</span>
          </p>
        </div>

        <div>
          <p className="text-xs text-muted-foreground">Expenses</p>
          <p className="mt-1 text-lg font-semibold tabular-nums">
            {formatCurrency(weeklyExpenses)}
            <span className="text-sm font-normal text-muted-foreground">/wk</span>
          </p>
        </div>

        {/* The figure the whole page exists to move. */}
        <div>
          <p className="text-xs text-muted-foreground">Left each week</p>
          <p
            className={cn(
              'mt-1 text-2xl font-semibold tracking-tight tabular-nums',
              inTheRed ? 'text-destructive' : 'text-primary',
            )}
          >
            {formatCurrency(weeklyLeftover)}
          </p>
        </div>

        {hasDebts && debtMinimums > 0 && (
          <p className="text-xs text-muted-foreground">
            {formatCurrency(debtMinimums)}/wk of this is
            <br />
            committed to debt minimums
          </p>
        )}
      </CardContent>
    </Card>
  );
}
