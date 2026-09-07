import { useState } from 'react';
import { Sidebar } from '@/components/shell/Sidebar';
import { MobileNav } from '@/components/shell/MobileNav';
import { BudgetSwitcher } from '@/components/shell/BudgetSwitcher';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { OnboardingWizard } from '@/components/OnboardingWizard';
import { BudgetPage } from '@/pages/BudgetPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { useBudget } from '@/hooks/useBudget';
import { useOnboarding } from '@/hooks/useOnboarding';
import { useTheme } from '@/hooks/useTheme';
import { useHashRoute } from '@/hooks/useHashRoute';

function App() {
  const budget = useBudget();
  const onboarding = useOnboarding();
  const theme = useTheme();
  const { route, navigate } = useHashRoute();

  const [confirmingReset, setConfirmingReset] = useState(false);

  const handleNewBudget = () => {
    budget.resetBudget();
    onboarding.restart();
    navigate('calendar');
  };

  // A brand-new budget is empty, so it goes straight into setup rather than
  // dropping you on a calendar of nothing.
  const handleCreateBudget = () => {
    budget.createBudget(`Budget ${budget.budgets.length + 1}`);
    onboarding.restart();
    navigate('calendar');
  };

  if (!onboarding.completed) {
    return (
      <OnboardingWizard
        incomes={budget.budget.incomes}
        onAddIncome={budget.addIncome}
        onUpdateIncome={budget.updateIncome}
        onRemoveIncome={budget.removeIncome}
        currentBalance={budget.budget.currentBalance}
        onCurrentBalanceChange={budget.setCurrentBalance}
        expenses={budget.budget.expenses}
        onAddExpense={budget.addExpense}
        onRemoveExpense={budget.removeExpense}
        today={budget.today}
        onDone={onboarding.complete}
      />
    );
  }

  return (
    /* The sidebar is pinned and the content column is the only thing that
       scrolls, so no widget ever has to scroll inside itself. */
    <div className="flex min-h-dvh">
      <div className="sticky top-0 hidden h-dvh lg:block">
        <Sidebar
          route={route}
          onNavigate={navigate}
          entryCount={budget.budget.incomes.length + budget.budget.expenses.length}
          switcher={
            <BudgetSwitcher
              budgets={budget.budgets}
              activeId={budget.activeBudgetId}
              onSwitch={budget.switchBudget}
              onCreate={handleCreateBudget}
            />
          }
        />
      </div>

      <ConfirmDialog
        open={confirmingReset}
        onOpenChange={setConfirmingReset}
        title="Start a new budget?"
        description="This clears your income, payments and one-offs from this browser. It can't be undone."
        confirmLabel="Clear everything"
        destructive
        onConfirm={handleNewBudget}
      />

      <MobileNav route={route} onNavigate={navigate} />

      {/* pb-24 clears the mobile tab bar; it collapses back at lg. */}
      <main className="min-w-0 flex-1 px-5 pt-6 pb-24 lg:px-8 lg:py-8">
        <div className="mx-auto max-w-[1400px]">
          {route === 'calendar' && <CalendarPage budget={budget} onNavigate={navigate} />}
          {route === 'budget' && <BudgetPage budget={budget} />}
          {route === 'settings' && (
            <SettingsPage
              onNewBudget={() => setConfirmingReset(true)}
              onRerunSetup={onboarding.restart}
              themeId={theme.themeId}
              onThemeChange={theme.setThemeId}
              exportJson={budget.exportJson}
              importJson={budget.importJson}
              budgets={budget.budgets}
              activeBudgetId={budget.activeBudgetId}
              onSwitchBudget={budget.switchBudget}
              onCreateBudget={handleCreateBudget}
              onRenameBudget={budget.renameBudget}
              onDeleteBudget={budget.deleteBudget}
            />
          )}
        </div>
      </main>
    </div>
  );
}

export default App;
