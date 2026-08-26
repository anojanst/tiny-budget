import { describe, expect, it } from 'vitest';
import {
  buildGoalSavingsSeries,
  calculateGoalsProgress,
  calculateWeeklyLeftover,
  computeGoalCompletionWeeks,
  currentFreeLeftover,
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

describe('buildGoalSavingsSeries — delayed start', () => {
  const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 1000, currentSaved: 0, priority: 1 }];

  it('holds flat until the start week, then climbs', () => {
    // Saving begins at week 5, so weeks 0-5 must show no progress at all.
    const { points } = buildGoalSavingsSeries(goals, 100, 12, 0, 5);
    expect(points[0].a).toBeCloseTo(0);
    expect(points[5].a).toBeCloseTo(0);
    expect(points[6].a).toBeCloseTo(100);
    expect(points[10].a).toBeCloseTo(500);
  });

  it('is the undelayed series shifted forward, not a different curve', () => {
    const delayed = buildGoalSavingsSeries(goals, 100, 12, 0, 4).points;
    const immediate = buildGoalSavingsSeries(goals, 100, 12, 0, 0).points;
    for (let week = 0; week + 4 <= 12; week++) {
      expect(delayed[week + 4].a).toBeCloseTo(immediate[week].a);
    }
  });

  it('behaves exactly as before when nothing is delaying it', () => {
    const withZero = buildGoalSavingsSeries(goals, 100, 8, 0, 0).points;
    const withDefault = buildGoalSavingsSeries(goals, 100, 8, 0).points;
    expect(withZero).toEqual(withDefault);
  });
});

describe('currentFreeLeftover', () => {
  it('is zero when any goal is still unmet, however small', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 1000000, currentSaved: 999999.99, priority: 1 }];
    expect(currentFreeLeftover(goals, 470.23)).toBe(0);
  });

  it('is the full leftover once every goal is met', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 100, currentSaved: 100, priority: 1 }];
    expect(currentFreeLeftover(goals, 470.23)).toBe(470.23);
  });

  it('is the full leftover when there are no goals at all', () => {
    expect(currentFreeLeftover([], 470.23)).toBe(470.23);
  });

  it('passes a negative leftover through unchanged regardless of goals', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 100, currentSaved: 0, priority: 1 }];
    expect(currentFreeLeftover(goals, -50)).toBe(-50);
  });

  it('is zero if even one goal among several is unmet', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 100, currentSaved: 100, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 100, currentSaved: 50, priority: 2 },
    ];
    expect(currentFreeLeftover(goals, 470.23)).toBe(0);
  });
});

describe('currentBalance as an instant lump sum in the waterfall', () => {
  it('funds a single goal immediately (completion week 0) when the balance alone covers it', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 500, currentSaved: 0, priority: 1 }];
    const completions = computeGoalCompletionWeeks(goals, 0, 5000);
    expect(completions.get('a')).toBe(0);
  });

  it('splits the lump sum evenly across tied goals, same as the weekly rate does', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 2000, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 1000, currentSaved: 0, priority: 1 },
    ];
    // $2000 balance, no ongoing leftover: $1000 each. B (needs 1000) finishes
    // instantly; A is left needing 1000 more with no rate to fund it further.
    const completions = computeGoalCompletionWeeks(goals, 0, 2000);
    expect(completions.get('b')).toBe(0);
    expect(completions.get('a')).toBeNull();
  });

  it('leaves a lower-priority goal untouched if the balance is fully absorbed by a higher tier', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 500, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 500, currentSaved: 0, priority: 2 },
    ];
    const progress = calculateGoalsProgress(goals, 0, 500);
    // 'met' reflects actual currentSaved, not a hypothetical instant funding —
    // the balance covers A's need, so its ETA is immediate (0 weeks), but its
    // currentSaved hasn't literally changed, so it's still 'on-track' not 'met'.
    expect(progress.get('a')!.status).toBe('on-track');
    expect(progress.get('a')!.weeksRemaining).toBe(0);
    expect(progress.get('b')!.status).toBe('unreachable');
  });

  it('combines with the ongoing rate: balance funds instantly, then the rate continues on what is left', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 1000, currentSaved: 0, priority: 1 }];
    // $500 balance covers half instantly; $50/wk covers the rest in 10 weeks.
    const completions = computeGoalCompletionWeeks(goals, 50, 500);
    expect(completions.get('a')).toBeCloseTo(10);
  });

  it('reconciles totalGoalAllocationAtWeeks with a balance that fully funds every goal', () => {
    const goals: Goal[] = [
      { id: 'a', name: 'A', targetAmount: 2000, currentSaved: 0, priority: 1 },
      { id: 'b', name: 'B', targetAmount: 1000, currentSaved: 0, priority: 2 },
    ];
    const currentBalance = 5000;
    const weeklyLeftover = 470.23;
    const weeks = 52; // 1 year — plenty of time for everything to finish
    const allocation = totalGoalAllocationAtWeeks(goals, weeklyLeftover, weeks, currentBalance);
    const balance = currentBalance + weeklyLeftover * weeks;
    const free = balance - allocation;
    // Both goals need 3000 combined; the rest of the accrued money is free.
    expect(allocation).toBeCloseTo(3000, 2);
    expect(free).toBeCloseTo(balance - 3000, 2);
    expect(free).toBeGreaterThan(0);
  });

  it('projectGoalsAt reflects goals already met instantly via the balance alone', () => {
    const goals: Goal[] = [{ id: 'a', name: 'A', targetAmount: 500, currentSaved: 0, priority: 1 }];
    const [a] = projectGoalsAt(goals, 0, 4, 5000);
    expect(a.reached).toBe(true);
    expect(a.projectedPercent).toBeCloseTo(100);
  });
});
