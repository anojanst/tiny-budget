import { PageHeader } from '@/components/shell/PageHeader';
import { GoalsSection } from '@/components/GoalsSection';
import { GoalDiversionDial } from '@/components/GoalDiversionDial';
import { SavingsProjection } from '@/components/SavingsProjection';
import { TimeMachine } from '@/components/TimeMachine';
import { formatShortDate } from '@/lib/dates';
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
    postMinimum,
    goalContribution,
    goalFundingBalance,
    budgetShortfall,
    goalProgressById,
    setWeeklyGoalContribution,
    addGoal,
    updateGoal,
    removeGoal,
  } = budget;

  const horizonLabel = timeMachine.targetDate ? formatShortDate(timeMachine.targetDate) : undefined;

  return (
    <>
      <PageHeader
        title="Goals"
        subtitle={
          hasDebts
            ? "What you're saving for once the debt is gone — and what saving now costs."
            : 'What you’re putting money aside for, funded by priority.'
        }
      />

      <div className="space-y-4">
        {/* While in debt, the split dial comes first: it's the decision that
            governs whether anything below it gets funded at all. */}
        {hasDebts && (
          <GoalDiversionDial
            debts={data.debts}
            postMinimum={postMinimum}
            goalContribution={goalContribution}
            currentBalance={data.currentBalance}
            budgetShortfall={budgetShortfall}
            onChange={setWeeklyGoalContribution}
          />
        )}

        <GoalsSection
          goals={data.goals}
          goalProgressById={goalProgressById}
          projectionById={timeMachine.projectionById}
          horizonLabel={horizonLabel}
          hasDebts={hasDebts}
          goalContribution={goalContribution}
          onAdd={addGoal}
          onUpdate={updateGoal}
          onRemove={removeGoal}
        />

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <SavingsProjection
            goals={data.goals}
            weeklyLeftover={goalContribution}
            currentBalance={goalFundingBalance}
          />
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
        </div>
      </div>
    </>
  );
}
