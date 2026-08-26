import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/StatCard';
import { FocusCard } from '@/components/FocusCard';
import { PageHeader } from '@/components/shell/PageHeader';
import { SnowballProjection } from '@/components/SnowballProjection';
import { SavingsProjection } from '@/components/SavingsProjection';
import { Button } from '@/components/ui/button';
import { formatCurrency } from '@/lib/format';
import { addWeeks, formatShortDate } from '@/lib/dates';
import { activeDebtId } from '@/lib/debtMath';
import type { Route } from '@/hooks/useHashRoute';
import type { useBudget } from '@/hooks/useBudget';
import { Plus } from 'lucide-react';

interface OverviewPageProps {
  budget: ReturnType<typeof useBudget>;
  today: Date;
  onNavigate: (route: Route) => void;
}

export function OverviewPage({ budget, today, onNavigate }: OverviewPageProps) {
  const {
    budget: data,
    weeklyIncome,
    weeklyLeftover,
    freeLeftover,
    hasDebts,
    budgetShortfall,
    goalContribution,
    debtWeeklyExtra,
    goalFundingBalance,
    snowball,
    goalProgressById,
  } = budget;

  const totalOwed = data.debts.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0);
  const activeId = activeDebtId(data.debts);
  const activeDebt = data.debts.find((debt) => debt.id === activeId);
  const topGoal = [...data.goals].sort((a, b) => a.priority - b.priority)[0];

  const debtFreeDate =
    snowball.debtFreeWeek !== null ? addWeeks(today, snowball.debtFreeWeek) : null;

  return (
    <>
      <PageHeader
        title="Overview"
        subtitle={
          hasDebts
            ? 'Your fastest route out of debt, at a glance.'
            : 'Where your money stands, and where it lands.'
        }
        actions={
          <Button size="lg" onClick={() => onNavigate(hasDebts ? 'debts' : 'goals')}>
            <Plus className="size-4" />
            {hasDebts ? 'Add debt' : 'Add goal'}
          </Button>
        }
      />

      {budgetShortfall > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You're {formatCurrency(budgetShortfall)}/wk short of your minimum payments. Until that
            closes, this plan assumes money that isn't there.
          </AlertDescription>
        </Alert>
      )}

      {/* Four figures, one of them featured. In debt the headline is the date
          you're out; otherwise it's what you're free to spend. */}
      <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {hasDebts ? (
          <>
            <StatCard
              featured
              label="Debt free on"
              value={debtFreeDate ? formatShortDate(debtFreeDate) : 'Never'}
              hint={
                snowball.debtFreeWeek !== null
                  ? `${snowball.debtFreeWeek} weeks away`
                  : 'A debt is growing faster than you pay it'
              }
              muted={!debtFreeDate}
              onClick={() => onNavigate('debts')}
            />
            <StatCard
              label="Total owed"
              value={formatCurrency(totalOwed)}
              hint={`Across ${data.debts.length} debt${data.debts.length === 1 ? '' : 's'}`}
              onClick={() => onNavigate('debts')}
            />
            <StatCard
              label="Weekly to debt"
              value={formatCurrency(debtWeeklyExtra + budget.debtMinimums)}
              hint={`${formatCurrency(budget.debtMinimums)} minimums + ${formatCurrency(debtWeeklyExtra)} extra`}
            />
            <StatCard
              label="Interest ahead"
              value={snowball.debtFreeWeek !== null ? formatCurrency(snowball.totalInterest) : '—'}
              hint={
                snowball.debtFreeWeek !== null
                  ? `${formatCurrency(snowball.totalPaid)} paid in total`
                  : 'Unknown while a debt is unpayable'
              }
              muted={snowball.debtFreeWeek === null}
            />
          </>
        ) : (
          <>
            <StatCard
              featured
              label="Free each week"
              value={formatCurrency(freeLeftover)}
              hint={
                freeLeftover === 0 && weeklyLeftover > 0
                  ? `${formatCurrency(weeklyLeftover)}/wk is committed to goals`
                  : 'After expenses and goals'
              }
              onClick={() => onNavigate('goals')}
            />
            <StatCard
              label="Cash on hand"
              value={formatCurrency(data.currentBalance)}
              hint="Available today"
              onClick={() => onNavigate('budget')}
            />
            <StatCard
              label="Weekly income"
              value={formatCurrency(weeklyIncome)}
              hint={`${formatCurrency(weeklyLeftover)}/wk left after expenses`}
              onClick={() => onNavigate('budget')}
            />
            <StatCard
              label="Active goals"
              value={String(data.goals.length)}
              hint={data.goals.length === 0 ? 'Add one to start' : 'Funded by priority'}
              onClick={() => onNavigate('goals')}
              muted={data.goals.length === 0}
            />
          </>
        )}
      </div>

      {/* Hero chart beside the single next action. Everything else lives on
          its own page rather than competing for room here. */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
        <div className="lg:col-span-2">
          {hasDebts ? (
            <SnowballProjection
              debts={data.debts}
              weeklyExtra={debtWeeklyExtra}
              currentBalance={data.currentBalance}
            />
          ) : (
            <SavingsProjection
              goals={data.goals}
              weeklyLeftover={goalContribution}
              currentBalance={goalFundingBalance}
            />
          )}
        </div>
        <FocusCard
          activeDebt={activeDebt}
          snowball={snowball}
          goals={data.goals}
          topGoal={topGoal}
          topGoalProgress={topGoal ? goalProgressById.get(topGoal.id) : undefined}
          hasDebts={hasDebts}
        />
      </div>
    </>
  );
}
