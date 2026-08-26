import { useDeferredValue } from 'react';
import { Button } from '@/components/ui/button';
import { SummaryPanel } from '@/components/SummaryPanel';
import { MoneyEntrySection } from '@/components/MoneyEntrySection';
import { GoalsSection } from '@/components/GoalsSection';
import { AllocationPie } from '@/components/AllocationPie';
import { SavingsProjection } from '@/components/SavingsProjection';
import { TimeMachine } from '@/components/TimeMachine';
import { DebtsSection } from '@/components/DebtsSection';
import { DebtFreeDate } from '@/components/DebtFreeDate';
import { SnowballProjection } from '@/components/SnowballProjection';
import { GoalDiversionDial } from '@/components/GoalDiversionDial';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { useBudget } from '@/hooks/useBudget';
import { useTimeMachine } from '@/hooks/useTimeMachine';
import { useOnboarding } from '@/hooks/useOnboarding';
import { formatShortDate } from '@/lib/dates';
import { PiggyBank, Receipt } from 'lucide-react';

function App() {
  const {
    budget,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    freeLeftover,
    goalProgressById,
    hasDebts,
    debtMinimums,
    budgetShortfall,
    postMinimum,
    goalContribution,
    debtWeeklyExtra,
    goalFundingBalance,
    snowball,
    setIncome,
    setCurrentBalance,
    addExpense,
    updateExpense,
    removeExpense,
    addGoal,
    updateGoal,
    removeGoal,
    addDebt,
    updateDebt,
    removeDebt,
    setWeeklyGoalContribution,
    resetBudget,
  } = useBudget();

  const onboarding = useOnboarding();

  const timeMachine = useTimeMachine(budget.goals, goalContribution, goalFundingBalance);
  const horizonLabel = timeMachine.targetDate ? formatShortDate(timeMachine.targetDate) : undefined;

  // Recharts is by far the most expensive thing on the page (~50ms of render
  // for the two charts). Deferring their inputs lets React paint the numbers
  // you're typing immediately and re-render the charts afterwards at low
  // priority, so a fast typist never waits on chart layout.
  const chartExpenses = useDeferredValue(budget.expenses);
  const chartGoals = useDeferredValue(budget.goals);
  const chartDebts = useDeferredValue(budget.debts);
  const chartWeeklyIncome = useDeferredValue(weeklyIncome);
  const chartWeeklyLeftover = useDeferredValue(weeklyLeftover);
  const chartGoalContribution = useDeferredValue(goalContribution);
  const chartDebtExtra = useDeferredValue(debtWeeklyExtra);
  const chartGoalBalance = useDeferredValue(goalFundingBalance);
  const chartCurrentBalance = useDeferredValue(budget.currentBalance);

  const handleNewBudget = () => {
    if (window.confirm('Start a new budget? This clears all current data.')) {
      resetBudget();
      onboarding.restart();
    }
  };

  if (!onboarding.completed) {
    return (
      <OnboardingWizard
        income={budget.income}
        onIncomeChange={setIncome}
        currentBalance={budget.currentBalance}
        onCurrentBalanceChange={setCurrentBalance}
        expenses={budget.expenses}
        onAddExpense={addExpense}
        onRemoveExpense={removeExpense}
        debts={budget.debts}
        onAddDebt={addDebt}
        onRemoveDebt={removeDebt}
        onDone={onboarding.complete}
      />
    );
  }

  const totalOwed = budget.debts.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0);

  return (
    /* Below xl the page scrolls normally. At xl+ the shell is pinned to the
       viewport and every widget scrolls internally, so the dashboard itself
       never scrolls. */
    <div className="mx-auto flex max-w-[1800px] flex-col p-4 lg:p-6 xl:h-dvh xl:overflow-hidden">
      <div className="mb-4 flex shrink-0 items-center justify-between">
        <h1 className="flex items-center gap-2.5 text-2xl font-semibold">
          <span
            aria-hidden
            className="flex size-9 items-center justify-center rounded-xl bg-gradient-to-br from-blue-500 to-violet-500 text-white shadow-sm"
          >
            <PiggyBank className="size-5" />
          </span>
          <span className="bg-gradient-to-r from-blue-600 to-violet-600 bg-clip-text text-transparent dark:from-blue-400 dark:to-violet-400">
            Tiny Budget
          </span>
        </h1>
        <Button variant="outline" size="sm" onClick={handleNewBudget}>
          New Budget
        </Button>
      </div>

      {/* Top row: where you stand now, beside where you'd stand later. In debt,
          "later" is the debt-free date — that's the number that matters. */}
      <div className="mb-4 grid shrink-0 grid-cols-1 items-start gap-4 lg:grid-cols-2">
        <SummaryPanel
          income={budget.income}
          onIncomeChange={setIncome}
          currentBalance={budget.currentBalance}
          onCurrentBalanceChange={setCurrentBalance}
          weeklyIncome={weeklyIncome}
          weeklyExpenses={weeklyExpenses}
          weeklyLeftover={weeklyLeftover}
          freeLeftover={freeLeftover}
          hasDebts={hasDebts}
          debtMinimums={debtMinimums}
        />
        {hasDebts ? (
          <DebtFreeDate
            snowball={snowball}
            today={timeMachine.today}
            totalOwed={totalOwed}
            budgetShortfall={budgetShortfall}
          />
        ) : (
          <TimeMachine
            today={timeMachine.today}
            dateValue={timeMachine.dateValue}
            onDateChange={timeMachine.setDateValue}
            targetDate={timeMachine.targetDate}
            weeks={timeMachine.weeks}
            balance={timeMachine.balance}
            goalAllocation={timeMachine.goalAllocation}
            freeBalance={timeMachine.freeBalance}
          />
        )}
      </div>

      {/* Two body rows at xl: inputs on the left, insights on the right, goals
          spanning both rows. min-h-0 is what lets the cells shrink and hand
          their overflow to the cards instead of to the page. */}
      <div
        className="grid min-h-0 grid-cols-1 items-start gap-4 lg:grid-cols-2
                   xl:flex-1 xl:grid-cols-3 xl:grid-rows-2 xl:items-stretch"
      >
        {/* Expenses is the long list, so it gets the full-height column. */}
        <div className="h-full min-h-0 xl:row-span-2">
          <MoneyEntrySection
            title="Expenses"
            icon={Receipt}
            accent="orange"
            emptyLabel="No expenses yet — add one below."
            entries={budget.expenses}
            weeklyTotal={weeklyExpenses}
            onAdd={addExpense}
            onUpdate={updateExpense}
            onRemove={removeExpense}
          />
        </div>

        {/* In debt, the payoff curve and the split dial replace the pie and the
            savings projection — the snowball is the story worth telling. */}
        {hasDebts ? (
          <>
            <div className="h-full min-h-0">
              <SnowballProjection
                debts={chartDebts}
                weeklyExtra={chartDebtExtra}
                currentBalance={chartCurrentBalance}
              />
            </div>
            <GoalDiversionDial
              debts={chartDebts}
              postMinimum={postMinimum}
              goalContribution={goalContribution}
              currentBalance={chartCurrentBalance}
              budgetShortfall={budgetShortfall}
              onChange={setWeeklyGoalContribution}
            />
            <div className="h-full min-h-0 xl:col-start-3 xl:row-span-2 xl:row-start-1">
              <DebtsSection
                debts={budget.debts}
                snowball={snowball}
                debtMinimums={debtMinimums}
                onAdd={addDebt}
                onUpdate={updateDebt}
                onRemove={removeDebt}
              />
            </div>
            {/* Goals stay reachable while in debt — funded only by whatever the
                dial diverts, which is $0 unless the user moves it. */}
            <div className="h-full min-h-0 xl:col-start-2 xl:row-start-2">
              <GoalsSection
                goals={budget.goals}
                goalProgressById={goalProgressById}
                projectionById={timeMachine.projectionById}
                horizonLabel={horizonLabel}
                onAdd={addGoal}
                onUpdate={updateGoal}
                onRemove={removeGoal}
              />
            </div>
          </>
        ) : (
          <>
            <AllocationPie
              expenses={chartExpenses}
              weeklyIncome={chartWeeklyIncome}
              weeklyLeftover={chartWeeklyLeftover}
            />

            <div className="h-full min-h-0">
              <SavingsProjection
                goals={chartGoals}
                weeklyLeftover={chartGoalContribution}
                currentBalance={chartGoalBalance}
              />
            </div>

            {/* Parked in the third column so the other widgets fill columns 1–2
                in reading order. */}
            <div className="h-full min-h-0 xl:col-start-3 xl:row-span-2 xl:row-start-1">
              <GoalsSection
                goals={budget.goals}
                goalProgressById={goalProgressById}
                projectionById={timeMachine.projectionById}
                horizonLabel={horizonLabel}
                onAdd={addGoal}
                onUpdate={updateGoal}
                onRemove={removeGoal}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export default App;
