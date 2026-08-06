import { describe, expect, it } from 'vitest';
import {
  calculateGoalsProgress,
  calculateWeeklyLeftover,
  computeGoalCompletionWeeks,
  projectGoalsAt,
  toWeeklyAmount,
  totalGoalAllocationAtWeeks,
  WEEKS_PER_MONTH,
} from './budgetMath';
import type { Goal, Income, MoneyEntry } from '@/types/budget';

describe('toWeeklyAmount', () => {
  it('returns weekly amount unchanged', () => {
    expect(toWeeklyAmount(100, 'weekly')).toBe(100);
  });

  it('normalizes monthly amount to weekly', () => {
    expect(toWeeklyAmount(WEEKS_PER_MONTH * 100, 'monthly')).toBeCloseTo(100);
  });
});

describe('calculateWeeklyLeftover', () => {
  it('subtracts weekly-normalized expenses from income', () => {
    const income: Income = { amount: 500, frequency: 'weekly' };
    const expenses: MoneyEntry[] = [{ id: '2', name: 'Rent', amount: WEEKS_PER_MONTH * 100, frequency: 'monthly' }];
    expect(calculateWeeklyLeftover(income, expenses)).toBeCloseTo(400);
  });

  it('normalizes a monthly income to weekly', () => {
    const income: Income = { amount: WEEKS_PER_MONTH * 400, frequency: 'monthly' };
    expect(calculateWeeklyLeftover(income, [])).toBeCloseTo(400);
  });
});

describe('calculateGoalsProgress — single goal (whole leftover is its own)', () => {
  const baseGoal: Goal = { id: 'g1', name: 'Vacation', targetAmount: 1000, currentSaved: 0, priority: 1 };

  it('is on-track when leftover is positive and target not met', () => {
    const progress = calculateGoalsProgress([baseGoal], 100).get('g1')!;
    expect(progress.status).toBe('on-track');
    expect(progress.weeksRemaining).toBeCloseTo(10);
    expect(progress.monthsRemaining).toBeCloseTo(10 / WEEKS_PER_MONTH);
  });

  it('is unreachable when leftover is exactly zero', () => {
    const progress = calculateGoalsProgress([baseGoal], 0).get('g1')!;
    expect(progress.status).toBe('unreachable');
    expect(progress.weeksRemaining).toBeNull();
  });

  it('is unreachable when leftover is negative', () => {
    const progress = calculateGoalsProgress([baseGoal], -50).get('g1')!;
    expect(progress.status).toBe('unreachable');
    expect(progress.weeksRemaining).toBeNull();
  });

  it('is met when currentSaved equals target, regardless of leftover', () => {
    const goal: Goal = { ...baseGoal, currentSaved: 1000 };
    const progress = calculateGoalsProgress([goal], -50).get('g1')!;
    expect(progress.status).toBe('met');
    expect(progress.percentComplete).toBe(100);
  });

  it('is met and clamps percent when overfunded', () => {
    const goal: Goal = { ...baseGoal, currentSaved: 1500 };
    const progress = calculateGoalsProgress([goal], 100).get('g1')!;
    expect(progress.status).toBe('met');
    expect(progress.percentComplete).toBe(100);
    expect(progress.remainingAmount).toBe(0);
  });

  it('treats a zero target as already met', () => {
    const goal: Goal = { ...baseGoal, targetAmount: 0, currentSaved: 0 };
    const progress = calculateGoalsProgress([goal], 100).get('g1')!;
    expect(progress.status).toBe('met');
    expect(progress.percentComplete).toBe(100);
  });
});

describe('priority waterfall', () => {
  it('splits the leftover evenly between goals that share a priority', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 500, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 500, currentSaved: 0, priority: 1 },
    ];
    // $50/wk split evenly is $25/wk each -> 20 weeks apiece.
    const completions = computeGoalCompletionWeeks(goals, 50);
    expect(completions.get('a')).toBeCloseTo(20);
    expect(completions.get('b')).toBeCloseTo(20);
  });

  it('funds the lower-numbered priority first, then rolls over to the next', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 100, currentSaved: 0, priority: 2 },
    ];
    // $50/wk: A alone gets it all, done in 2 weeks. B gets nothing until then,
    // then the full $50/wk, done 2 more weeks later.
    const completions = computeGoalCompletionWeeks(goals, 50);
    expect(completions.get('a')).toBeCloseTo(2);
    expect(completions.get('b')).toBeCloseTo(4);
  });

  it('redistributes a tied goal\'s share once it finishes, to the rest of the tier', () => {
    const goals: Goal[] = [
      { id: 'small', name: 'Small', targetAmount: 100, currentSaved: 0, priority: 1 },
      { id: 'big', name: 'Big', targetAmount: 500, currentSaved: 0, priority: 1 },
    ];
    // $100/wk split evenly ($50 each): small finishes at week 2 (2*50=100).
    // From week 2 on, big gets the full $100/wk. It has 500-100=400 left,
    // needing 4 more weeks -> done at week 6.
    const completions = computeGoalCompletionWeeks(goals, 100);
    expect(completions.get('small')).toBeCloseTo(2);
    expect(completions.get('big')).toBeCloseTo(6);
  });

  it('leaves every unmet goal unreachable when leftover is not positive', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 100, currentSaved: 50, priority: 2 },
    ];
    const completions = computeGoalCompletionWeeks(goals, -20);
    expect(completions.get('a')).toBeNull();
    expect(completions.get('b')).toBeNull();
  });

  it('reports an already-met goal as complete at week 0 even with no leftover', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 100, currentSaved: 100, priority: 1 }];
    expect(computeGoalCompletionWeeks(goals, -20).get('a')).toBe(0);
  });

  it('reflects priority order in calculateGoalsProgress, not independent shares', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 100, currentSaved: 0, priority: 2 },
    ];
    const progress = calculateGoalsProgress(goals, 50);
    expect(progress.get('a')!.weeksRemaining).toBeCloseTo(2);
    expect(progress.get('b')!.weeksRemaining).toBeCloseTo(4);
    expect(progress.get('a')!.status).toBe('on-track');
    expect(progress.get('b')!.status).toBe('on-track');
  });
});

describe('projectGoalsAt with priority', () => {
  it('only advances the higher-priority goal within the funding window', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 100, currentSaved: 0, priority: 2 },
    ];
    // $50/wk for 2 weeks: A absorbs all of it (reaches 100%), B hasn't started.
    const [a, b] = projectGoalsAt(goals, 50, 2);
    expect(a.projectedPercent).toBeCloseTo(100);
    expect(a.reached).toBe(true);
    expect(b.projectedPercent).toBeCloseTo(0);
    expect(b.reached).toBe(false);
  });

  it('returns goals sorted by priority', () => {
    const goals: Goal[] = [
      { id: 'low', name: 'Low', targetAmount: 100, currentSaved: 0, priority: 5 },
      { id: 'high', name: 'High', targetAmount: 100, currentSaved: 0, priority: 1 },
    ];
    const result = projectGoalsAt(goals, 50, 1);
    expect(result.map((g) => g.goalId)).toEqual(['high', 'low']);
  });
});

describe('totalGoalAllocationAtWeeks', () => {
  it('reconciles with the accumulated leftover: starting balance is never itself allocated', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 10000, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 10000, currentSaved: 0, priority: 2 },
    ];
    const currentBalance = 5000;
    const weeklyLeftover = 470.23;
    const weeks = 4.4286;

    const allocation = totalGoalAllocationAtWeeks(goals, weeklyLeftover, weeks);
    const balance = currentBalance + weeklyLeftover * weeks;
    const free = balance - allocation;

    // Neither goal is anywhere near fully funded yet, so every dollar of new
    // leftover is still being absorbed by the waterfall — free == currentBalance.
    expect(allocation).toBeCloseTo(weeklyLeftover * weeks, 2);
    expect(free).toBeCloseTo(currentBalance, 2);
  });

  it('lets free money exceed the starting balance once all goals are funded', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 }];
    // $50/wk for 4 weeks = $200 accrued, but the goal only needed $100.
    const allocation = totalGoalAllocationAtWeeks(goals, 50, 4);
    expect(allocation).toBeCloseTo(100);
  });

  it('allocates nothing when leftover is not positive', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 }];
    expect(totalGoalAllocationAtWeeks(goals, -20, 4)).toBe(0);
  });
});
