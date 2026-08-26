import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/shell/PageHeader';
import { IncomeCard } from '@/components/IncomeCard';
import { MoneyEntrySection } from '@/components/MoneyEntrySection';
import { AllocationPie } from '@/components/AllocationPie';
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
    hasDebts,
    debtMinimums,
    setIncome,
    setCurrentBalance,
    addExpense,
    updateExpense,
    removeExpense,
  } = budget;

  const inTheRed = weeklyLeftover <= 0 && weeklyIncome > 0;

  return (
    <>
      <PageHeader
        title="Budget"
        subtitle="What comes in, what goes out, and what's left to work with."
      />

      {inTheRed && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You're spending more than you earn. Nothing can go at debts or goals until this
            turns positive.
          </AlertDescription>
        </Alert>
      )}

      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          featured
          label="Left each week"
          value={formatCurrency(weeklyLeftover)}
          hint={
            hasDebts
              ? `${formatCurrency(debtMinimums)}/wk of this is committed to minimums`
              : 'Income minus expenses'
          }
        />
        <StatCard
          label="Weekly income"
          value={formatCurrency(weeklyIncome)}
          hint="Take-home, after tax"
        />
        <StatCard
          label="Weekly expenses"
          value={formatCurrency(weeklyExpenses)}
          hint={`Across ${data.expenses.length} categor${data.expenses.length === 1 ? 'y' : 'ies'}`}
        />
      </div>

      <div className="space-y-4">
        <IncomeCard
          income={data.income}
          onIncomeChange={setIncome}
          currentBalance={data.currentBalance}
          onCurrentBalanceChange={setCurrentBalance}
          weeklyIncome={weeklyIncome}
          hasDebts={hasDebts}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <MoneyEntrySection
            title="Expenses"
            description="Mix weekly and monthly — everything is normalised to a weekly figure."
            emptyLabel="No expenses yet — add one below."
            entries={data.expenses}
            weeklyTotal={weeklyExpenses}
            onAdd={addExpense}
            onUpdate={updateExpense}
            onRemove={removeExpense}
          />
          <AllocationPie
            expenses={data.expenses}
            weeklyIncome={weeklyIncome}
            weeklyLeftover={weeklyLeftover}
          />
        </div>
      </div>
    </>
  );
}
