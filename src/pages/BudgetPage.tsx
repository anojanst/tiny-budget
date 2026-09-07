import { Alert, AlertDescription } from '@/components/ui/alert';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PageHeader } from '@/components/shell/PageHeader';
import { MoneyEntrySection } from '@/components/MoneyEntrySection';
import { StatCard } from '@/components/StatCard';
import { EXPENSE_CATEGORIES, INCOME_CATEGORIES } from '@/lib/expenseCategories';
import { formatCurrency } from '@/lib/format';
import type { useBudget } from '@/hooks/useBudget';

interface BudgetPageProps {
  budget: ReturnType<typeof useBudget>;
}

export function BudgetPage({ budget }: BudgetPageProps) {
  const {
    budget: data,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    activeExpenses,
    activeIncomes,
    today,
    setCurrentBalance,
    addIncome,
    updateIncome,
    removeIncome,
    addExpense,
    updateExpense,
    removeExpense,
  } = budget;

  const inTheRed = weeklyLeftover < 0 && weeklyIncome > 0;

  return (
    <>
      <PageHeader
        title="Money in and out"
        subtitle="Everything that repeats. Give each one a date and it lands on the calendar."
      />

      {inTheRed && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            Your regular outgoings come to more than your income —{' '}
            {formatCurrency(Math.abs(weeklyLeftover))} a week more. The calendar will run down
            no matter how the dates fall.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          featured
          label="Left each week"
          value={formatCurrency(weeklyLeftover)}
          hint="Income minus everything that repeats"
          muted={weeklyLeftover === 0}
        />
        <StatCard label="Coming in" value={`${formatCurrency(weeklyIncome)}/wk`} hint="Across every stream" />
        <StatCard label="Going out" value={`${formatCurrency(weeklyExpenses)}/wk`} hint="Every recurring bill" />
      </div>

      <div className="space-y-4">
        <Card>
          <CardContent>
            <Label htmlFor="current-balance" className="text-sm font-medium">
              Cash on hand
            </Label>
            {/* The single most important number on the calendar: every balance
                it draws is this plus everything since. */}
            <p className="mt-0.5 mb-2 text-xs text-muted-foreground">
              What's in the account right now — where the calendar starts counting.
            </p>
            <Input
              id="current-balance"
              type="number"
              min="0"
              step="0.01"
              value={data.currentBalance}
              onChange={(e) => setCurrentBalance(e.target.valueAsNumber || 0)}
              className="w-40"
            />
          </CardContent>
        </Card>

        <MoneyEntrySection
          title="Income"
          description="Every pay stream, each on its own cycle. Set a payday and it appears on the calendar."
          emptyLabel="No income yet. Add a pay stream to get started."
          categories={INCOME_CATEGORIES}
          noun="income stream"
          singleColumn
          defaultFrequency="fortnightly"
          entries={data.incomes}
          today={today}
          weeklyTotal={weeklyIncome}
          onAdd={addIncome}
          onUpdate={updateIncome}
          onRemove={removeIncome}
        />

        <MoneyEntrySection
          title="Recurring payments"
          description="Rent, power, loan repayments — anything that comes back around."
          emptyLabel="No recurring payments yet."
          categories={EXPENSE_CATEGORIES}
          noun="expense"
          entries={data.expenses}
          today={today}
          weeklyTotal={weeklyExpenses}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onRemove={removeExpense}
        />
      </div>

      {activeIncomes.length === 0 && activeExpenses.length === 0 && (
        <p className="mt-4 text-center text-sm text-muted-foreground">
          Nothing entered yet — the calendar has nothing to draw.
        </p>
      )}
    </>
  );
}
