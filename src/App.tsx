import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { MobileNav } from '@/components/shell/MobileNav';
import { TimeMachine } from '@/components/TimeMachine';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { OverviewPage } from '@/pages/OverviewPage';
import { DebtsPage } from '@/pages/DebtsPage';
import { BudgetPage } from '@/pages/BudgetPage';
import { GoalsPage } from '@/pages/GoalsPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useBudget } from '@/hooks/useBudget';
import { useTimeMachine } from '@/hooks/useTimeMachine';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';

function App() {
  const budget = useBudget();
  const onboarding = useOnboarding();
  const theme = useTheme();
  const { route, navigate } = useHashRoute();

  const timeMachine = useTimeMachine({
    goals: budget.budget.goals,
    weeklyLeftover: budget.weeklyLeftover,
    goalWeeklyRate: budget.goalWeeklyRate,
    goalStartWeek: budget.goalStartWeek,
    currentBalance: budget.budget.currentBalance,
    hasDebts: budget.hasDebts,
    snowball: budget.snowball,
    goalFundingBalance: budget.goalFundingBalance,
  });

  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleNewBudget = () => {
    budget.resetBudget();
    onboarding.restart();
    navigate('overview');
  };

  if (!onboarding.completed) {
    return (
      <OnboardingWizard
        income={budget.budget.income}
        onIncomeChange={budget.setIncome}
        currentBalance={budget.budget.currentBalance}
        onCurrentBalanceChange={budget.setCurrentBalance}
        expenses={budget.budget.expenses}
        onAddExpense={budget.addExpense}
        onRemoveExpense={budget.removeExpense}
        debts={budget.budget.debts}
        onAddDebt={budget.addDebt}
        onRemoveDebt={budget.removeDebt}
        onDone={onboarding.complete}
      />
    );
  }

  const timeMachinePanel = (
    <TimeMachine
      today={timeMachine.today}
      dateValue={timeMachine.dateValue}
      onDateChange={timeMachine.setDateValue}
      targetDate={timeMachine.targetDate}
      weeks={timeMachine.weeks}
      freeBalance={timeMachine.freeBalance}
      debtSpend={timeMachine.debtSpend}
      hasDebts={timeMachine.hasDebts}
      debtFreeWeek={timeMachine.debtFreeWeek}
      debtsClearedByHorizon={timeMachine.debtsClearedByHorizon}
    />
  );

  return (
    /* The sidebar is pinned and the content column is the only thing that
       scrolls, so no widget ever has to scroll inside itself. */
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar
          route={route}
          onNavigate={navigate}
          debtCount={budget.budget.debts.length}
          goalCount={budget.budget.goals.length}
          footer={timeMachinePanel}
        />
      </div>

      <ConfirmDialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Start a new budget?"
        description="This clears your income, expenses, debts, and goals from this browser. It can't be undone."
        confirmLabel="Clear everything"
        destructive
        onConfirm={handleNewBudget}
      />

      <MobileNav route={route} onNavigate={navigate} />

      {/* pb-24 clears the mobile tab bar; it collapses back at lg. */}
      <main className="min-w-0 flex-1 px-5 pt-6 pb-24 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px]">
          {route === 'overview' && (
            <OverviewPage budget={budget} timeMachine={timeMachine} onNavigate={navigate} />
          )}
          {route === 'debts' && <DebtsPage budget={budget} today={timeMachine.today} />}
          {route === 'budget' && <BudgetPage budget={budget} />}
          {route === 'goals' && <GoalsPage budget={budget} timeMachine={timeMachine} />}
          {route === 'settings' && (
            <SettingsPage
              onNewBudget={() => setConfirmingReset(true)}
              onRerunSetup={onboarding.restart}
              themeId={theme.themeId}
              onThemeChange={theme.setThemeId}
              exportJson={budget.exportJson}
              importJson={budget.importJson}
            />
          )}

          {/* The sidebar is hidden below lg, so the same panel trails the
              content there rather than disappearing on small screens. */}
          <div className="mt-4 lg:hidden">{timeMachinePanel}</div>
        </div>
      </main>
    </div>
  );
}

export default App;
