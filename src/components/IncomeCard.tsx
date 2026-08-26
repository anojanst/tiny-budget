import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ToggleGroup, ToggleGroupItem } from '@/components/ui/toggle-group';
import { WidgetHeading } from '@/components/WidgetHeading';
import { formatCurrency } from '@/lib/format';
import type { Frequency, Income } from '@/types/budget';

interface IncomeCardProps {
  income: Income;
  onIncomeChange: (patch: Partial<Income>) => void;
  currentBalance: number;
  onCurrentBalanceChange: (amount: number) => void;
  weeklyIncome: number;
  hasDebts: boolean;
}

/**
 * The two figures everything else is derived from. They live together on the
 * Budget page rather than the dashboard, because they're set once and revisited
 * rarely — the dashboard shows what they produce, not the inputs themselves.
 */
export function IncomeCard({
  income,
  onIncomeChange,
  currentBalance,
  onCurrentBalanceChange,
  weeklyIncome,
  hasDebts,
}: IncomeCardProps) {
  return (
    <Card>
      <WidgetHeading title="Income & cash" description="What comes in, and what you have today." />
      <CardContent className="flex flex-wrap gap-x-10 gap-y-5">
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
          <p className="mt-1.5 text-xs tabular-nums text-muted-foreground">
            {formatCurrency(weeklyIncome)}/wk
          </p>
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
          <p className="mt-1.5 text-xs text-muted-foreground">
            {hasDebts ? 'Goes at your debts first' : 'Funds your goals'}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
