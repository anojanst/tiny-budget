import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shell/PageHeader';
import { IncomeCard } from '@/components/IncomeCard';
import { MoneyEntrySection } from '@/components/MoneyEntrySection';
import { AllocationPie } from '@/components/AllocationPie';
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
    today,
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

      {/* Inputs and totals first, then the list. The breakdown chart sits
          below the list rather than beside it: paired with the list it was
          stranded in a tall column of empty space, and above it, it pushed
          half the categories off screen. */}
      <div className="space-y-4">
        <IncomeCard
          income={data.income}
          onIncomeChange={setIncome}
          currentBalance={data.currentBalance}
          onCurrentBalanceChange={setCurrentBalance}
          weeklyIncome={weeklyIncome}
          weeklyExpenses={weeklyExpenses}
          weeklyLeftover={weeklyLeftover}
          hasDebts={hasDebts}
          debtMinimums={debtMinimums}
        />

        <MoneyEntrySection
          title="Expenses"
          description="Mix weekly and monthly — everything is normalised to a weekly figure."
          emptyLabel="No expenses yet — add one below."
          entries={data.expenses}
        today={today}
          weeklyTotal={weeklyExpenses}
          onAdd={addExpense}
          onUpdate={updateExpense}
          onRemove={removeExpense}
        />

        <AllocationPie
          expenses={activeExpenses}
          weeklyIncome={weeklyIncome}
          weeklyLeftover={weeklyLeftover}
        />
      </div>
    </>
  );
}
