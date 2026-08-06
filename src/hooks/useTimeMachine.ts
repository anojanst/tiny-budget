import { useMemo, useState } from 'react';
import { projectGoalsAt, totalGoalAllocationAtWeeks, type GoalAtDate } from '@/lib/budgetMath';
import {
  addMonths,
  parseLocalDate,
  startOfToday,
  toDateInputValue,
  weeksBetween,
} from '@/lib/dates';
import type { Goal } from '@/types/budget';

/**
 * The shared "what if I wait until X" horizon. Lives above both the Time
 * Machine and the Goals widget so picking a date updates them together.
 */
export function useTimeMachine(goals: Goal[], weeklyLeftover: number, currentBalance: number) {
  const today = useMemo(() => startOfToday(), []);
  const [dateValue, setDateValue] = useState(() => toDateInputValue(addMonths(startOfToday(), 3)));

  const targetDate = useMemo(() => parseLocalDate(dateValue), [dateValue]);
  // Travelling backwards has no meaning here — we have no history, only a rate.
  const weeks = targetDate ? Math.max(weeksBetween(today, targetDate), 0) : 0;
  // Starts from what you actually have today, not from zero.
  const balance = currentBalance + weeklyLeftover * weeks;

  // Of that balance, whatever the waterfall has committed to goals by then —
  // the rest (including the whole starting balance) is still free.
  const goalAllocation = useMemo(
    () => totalGoalAllocationAtWeeks(goals, weeklyLeftover, weeks),
    [goals, weeklyLeftover, weeks],
  );
  const freeBalance = balance - goalAllocation;

  const projections = useMemo(
    () => projectGoalsAt(goals, weeklyLeftover, weeks),
    [goals, weeklyLeftover, weeks],
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
    projectionById,
  };
}
