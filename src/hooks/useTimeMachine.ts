import { useMemo, useState } from 'react';
import { projectGoalsAt, totalGoalAllocationAtWeeks, type GoalAtDate } from '@/lib/budgetMath';
import { debtSpendAtWeek, type SnowballResult } from '@/lib/debtMath';
import {
  addMonths,
  parseLocalDate,
  startOfToday,
  toDateInputValue,
  weeksBetween,
} from '@/lib/dates';
import type { Goal } from '@/types/budget';

interface TimeMachineInput {
  goals: Goal[];
  /** Total income minus expenses — the whole weekly pool. */
  weeklyLeftover: number;
  /** What goals receive per week once they start receiving anything. */
  goalWeeklyRate: number;
  /** Week goals begin being funded: the debt-free date, or 0 with no debt. */
  goalStartWeek: number | null;
  /** Cash on hand today, before the snowball's week-0 lump sum. */
  currentBalance: number;
  hasDebts: boolean;
  snowball: SnowballResult;
  /** Cash left after debts took their share — the goals' starting balance. */
  goalFundingBalance: number;
}

/**
 * The shared "what if I wait until X" horizon.
 *
 * While in debt this has to model the whole picture, not just the goals
 * stream: money paid to lenders is gone, but it stops leaving once the
 * snowball finishes, at which point the weekly leftover starts piling up as
 * free cash. Projecting only the goal contribution would report $0 forever,
 * which is wrong the moment the payoff date falls inside the horizon.
 */
export function useTimeMachine({
  goals,
  weeklyLeftover,
  goalWeeklyRate,
  goalStartWeek,
  currentBalance,
  hasDebts,
  snowball,
  goalFundingBalance,
}: TimeMachineInput) {
  const today = useMemo(() => startOfToday(), []);
  const [dateValue, setDateValue] = useState(() => toDateInputValue(addMonths(startOfToday(), 3)));

  const targetDate = useMemo(() => parseLocalDate(dateValue), [dateValue]);
  // Travelling backwards has no meaning here — we have no history, only a rate.
  const weeks = targetDate ? Math.max(weeksBetween(today, targetDate), 0) : 0;

  // Everything earned by the horizon, before anything is taken out of it.
  const inflow = currentBalance + Math.max(weeklyLeftover, 0) * weeks;

  // Cash handed to lenders by then. Plateaus at the payoff date.
  const debtSpend = hasDebts ? debtSpendAtWeek(snowball, weeks) : 0;

  // Goals only start accruing once the debts are gone, so the waterfall is
  // asked about the time elapsed *since* that date, not since today.
  const goalWeeks = goalStartWeek === null ? 0 : Math.max(weeks - goalStartWeek, 0);

  const goalAllocation = useMemo(
    () => totalGoalAllocationAtWeeks(goals, goalWeeklyRate, goalWeeks, goalFundingBalance),
    [goals, goalWeeklyRate, goalWeeks, goalFundingBalance],
  );

  const balance = inflow - debtSpend;
  const freeBalance = balance - goalAllocation;

  // When the debts clear inside the horizon, say so — it's the moment the
  // projection stops being flat, and the reason the number finally moves.
  const debtFreeWeek = hasDebts ? snowball.debtFreeWeek : null;
  const debtsClearedByHorizon = debtFreeWeek !== null && weeks >= debtFreeWeek;

  const projections = useMemo(
    () => projectGoalsAt(goals, goalWeeklyRate, goalWeeks, goalFundingBalance),
    [goals, goalWeeklyRate, goalWeeks, goalFundingBalance],
  );

  // Keyed for the Goals widget, which is what actually displays these now.
  const projectionById = useMemo(
    () => new Map<string, GoalAtDate>(projections.map((p) => [p.goalId, p])),
    [projections],
  );

  return {
    today,
    dateValue,
    setDateValue,
    targetDate,
    weeks,
    balance,
    goalAllocation,
    freeBalance,
    debtSpend,
    debtFreeWeek,
    debtsClearedByHorizon,
    hasDebts,
    projectionById,
  };
}
