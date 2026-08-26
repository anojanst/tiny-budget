import { Alert, AlertDescription } from '@/components/ui/alert';
import { PageHeader } from '@/components/shell/PageHeader';
import { GoalsSection } from '@/components/GoalsSection';
import { SavingsProjection } from '@/components/SavingsProjection';
import { formatCurrency, formatWeeksRemaining } from '@/lib/format';
import { addWeeks, formatShortDate } from '@/lib/dates';
import type { useBudget } from '@/hooks/useBudget';
import type { useTimeMachine } from '@/hooks/useTimeMachine';

interface GoalsPageProps {
  budget: ReturnType<typeof useBudget>;
  timeMachine: ReturnType<typeof useTimeMachine>;
}

export function GoalsPage({ budget, timeMachine }: GoalsPageProps) {
  const {
    budget: data,
    hasDebts,
    goalStartWeek,
    goalWeeklyRate,
    goalFundingBalance,
    goalProgressById,
    addGoal,
    updateGoal,
    removeGoal,
  } = budget;

  const horizonLabel = timeMachine.targetDate ? formatShortDate(timeMachine.targetDate) : undefined;
  const startsWaiting = hasDebts && goalStartWeek !== null && goalStartWeek > 0;

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle="Focused saving — what your money goes to once the debt is gone."
      />

      {/* The single most important thing to understand on this page: saving
          hasn't started yet, and that's the plan working, not a fault. */}
      {startsWaiting && (
        <Alert className="mb-4">
          <AlertDescription>
            Your debts come first, in full. Saving starts in{' '}
            {formatWeeksRemaining(goalStartWeek)} — around{' '}
            {formatShortDate(addWeeks(timeMachine.today, goalStartWeek))} — when the last debt
            is paid off. From then, {formatCurrency(goalWeeklyRate)}/wk goes at these goals.
          </AlertDescription>
        </Alert>
      )}

      {hasDebts && goalStartWeek === null && (
        <Alert variant="destructive" className="mb-4">
          <AlertDescription>
            There's no route out of debt yet, so nothing will reach these goals. Fix that on the
            Debts page first.
          </AlertDescription>
        </Alert>
      )}

      <div className="space-y-4">
        <GoalsSection
          goals={data.goals}
          goalProgressById={goalProgressById}
          projectionById={timeMachine.projectionById}
          horizonLabel={horizonLabel}
          hasDebts={hasDebts}
          goalStartWeek={goalStartWeek}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onRemove={removeGoal}
        />

        {/* The horizon these projections are measured against is picked on the
            Overview page — one control, shared, rather than the same card
            repeated on two screens. */}
        <SavingsProjection
          goals={data.goals}
          weeklyLeftover={goalWeeklyRate}
          currentBalance={goalFundingBalance}
          startWeek={goalStartWeek ?? 0}
        />
      </div>
    </>
  );
}
