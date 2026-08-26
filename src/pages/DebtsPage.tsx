import { Alert, AlertDescription } from '@/components/ui/alert';
import { StatCard } from '@/components/StatCard';
import { PageHeader } from '@/components/shell/PageHeader';
import { DebtsSection } from '@/components/DebtsSection';
import { SnowballProjection } from '@/components/SnowballProjection';
import { formatCurrency } from '@/lib/format';
import { addWeeks, formatShortDate } from '@/lib/dates';
import type { useBudget } from '@/hooks/useBudget';

interface DebtsPageProps {
  budget: ReturnType<typeof useBudget>;
  today: Date;
}

export function DebtsPage({ budget, today }: DebtsPageProps) {
  const {
    budget: data,
    hasDebts,
    debtMinimums,
    debtWeeklyExtra,
    budgetShortfall,
    snowball,
    addDebt,
    updateDebt,
    removeDebt,
  } = budget;

  const totalOwed = data.debts.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0);
  const debtFreeDate =
    snowball.debtFreeWeek !== null ? addWeeks(today, snowball.debtFreeWeek) : null;

  return (
    <>
      <PageHeader
        title="Debts"
        subtitle="The snowball: smallest balance first, every spare dollar at the top one."
      />

      {budgetShortfall > 0 && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            You're {formatCurrency(budgetShortfall)}/wk short of your minimum payments. Cut
            expenses or raise income — until then these dates assume money that isn't there.
          </AlertDescription>
        </Alert>
      )}

      {hasDebts && (
        <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
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
          />
          <StatCard
            label="Total owed"
            value={formatCurrency(totalOwed)}
            hint={`${formatCurrency(debtMinimums)}/wk in minimums`}
          />
          <StatCard
            label="Paying weekly"
            value={formatCurrency(debtMinimums + debtWeeklyExtra)}
            hint={`${formatCurrency(debtWeeklyExtra)} above minimums`}
          />
        </div>
      )}

      <div className="space-y-4">
        <DebtsSection
          debts={data.debts}
          snowball={snowball}
          debtMinimums={debtMinimums}
          onAdd={addDebt}
          onUpdate={updateDebt}
          onRemove={removeDebt}
        />
        {hasDebts && (
          <SnowballProjection
            debts={data.debts}
            weeklyExtra={debtWeeklyExtra}
            currentBalance={data.currentBalance}
          />
        )}
      </div>
    </>
  );
}
