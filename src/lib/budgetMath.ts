import type { Frequency, Income, MoneyEntry, Goal } from '@/types/budget';

// Average number of weeks in a month (52 weeks / 12 months).
export const WEEKS_PER_MONTH = 52 / 12;

export function toWeeklyAmount(amount: number, frequency: Frequency): number {
  return frequency === 'weekly' ? amount : amount / WEEKS_PER_MONTH;
}

export function sumWeekly(entries: MoneyEntry[]): number {
  return entries.reduce((sum, entry) => sum + toWeeklyAmount(entry.amount, entry.frequency), 0);
}

export function weeklyIncomeAmount(income: Income): number {
  return toWeeklyAmount(income.amount, income.frequency);
}

export function calculateWeeklyLeftover(income: Income, expenses: MoneyEntry[]): number {
  return weeklyIncomeAmount(income) - sumWeekly(expenses);
}

export type GoalStatus = 'met' | 'unreachable' | 'on-track';

export interface GoalProgress {
  goalId: string;
  remainingAmount: number;
  percentComplete: number;
  status: GoalStatus;
  weeksRemaining: number | null;
  monthsRemaining: number | null;
}

/**
 * Priority waterfall: the full weekly leftover pours into the lowest-numbered
 * priority tier that still has unmet goals, split evenly across ties. A tier
 * only starts receiving money once every goal ahead of it is fully funded.
 *
 * Modeled as constant-rate segments — each segment ends the instant a goal in
 * the active tier is fully funded, at which point its share redistributes to
 * the rest of the tier (or the next tier, if it was the last one active). At
 * most one segment per goal, so this always terminates in goals.length steps.
 */
interface WaterfallSegment {
  startWeek: number;
  endWeek: number;
  rateByGoalId: Map<string, number>;
}

interface Waterfall {
  segments: WaterfallSegment[];
  completionWeeks: Map<string, number>;
}

function simulateWaterfall(goals: Goal[], weeklyLeftover: number): Waterfall {
  const segments: WaterfallSegment[] = [];
  const completionWeeks = new Map<string, number>();
  if (weeklyLeftover <= 0) return { segments, completionWeeks };

  const remaining = new Map<string, number>();
  for (const goal of goals) {
    const need = Math.max(goal.targetAmount - goal.currentSaved, 0);
    if (need > 0) remaining.set(goal.id, need);
  }
  if (remaining.size === 0) return { segments, completionWeeks };

  const priorityOf = new Map(goals.map((goal) => [goal.id, goal.priority]));
  const pending = new Set(remaining.keys());
  let elapsed = 0;

  while (pending.size > 0) {
    const lowestPriority = Math.min(...[...pending].map((id) => priorityOf.get(id)!));
    const tier = [...pending].filter((id) => priorityOf.get(id) === lowestPriority);
    const rate = weeklyLeftover / tier.length;
    const dt = Math.min(...tier.map((id) => remaining.get(id)! / rate));

    segments.push({ startWeek: elapsed, endWeek: elapsed + dt, rateByGoalId: new Map(tier.map((id) => [id, rate])) });

    elapsed += dt;
    for (const id of tier) {
      const left = remaining.get(id)! - rate * dt;
      remaining.set(id, Math.max(left, 0));
      if (left <= 1e-9) {
        completionWeeks.set(id, elapsed);
        pending.delete(id);
      }
    }
  }
  return { segments, completionWeeks };
}

/**
 * Exact week each goal is fully funded under the priority waterfall.
 * `null` = unreachable (still needs money, but leftover isn't positive).
 */
export function computeGoalCompletionWeeks(goals: Goal[], weeklyLeftover: number): Map<string, number | null> {
  const { completionWeeks } = simulateWaterfall(goals, weeklyLeftover);
  const result = new Map<string, number | null>();
  for (const goal of goals) {
    const need = Math.max(goal.targetAmount - goal.currentSaved, 0);
    result.set(goal.id, need <= 0 ? 0 : (completionWeeks.get(goal.id) ?? null));
  }
  return result;
}

/** Saved amount for every goal at `atWeek`, honoring the waterfall. */
function savedAmountsAtWeek(goals: Goal[], atWeek: number, waterfall: Waterfall): Map<string, number> {
  const saved = new Map(goals.map((goal) => [goal.id, goal.currentSaved]));
  if (atWeek <= 0) return saved;
  for (const segment of waterfall.segments) {
    if (segment.startWeek >= atWeek) break;
    const dt = Math.min(segment.endWeek, atWeek) - segment.startWeek;
    for (const [goalId, rate] of segment.rateByGoalId) {
      saved.set(goalId, (saved.get(goalId) ?? 0) + rate * dt);
    }
  }
  return saved;
}

/**
 * Progress for every goal at once — under priority, one goal's ETA depends on
 * every other goal's priority and size, so this can't be computed goal-by-goal.
 */
export function calculateGoalsProgress(goals: Goal[], weeklyLeftover: number): Map<string, GoalProgress> {
  const completions = computeGoalCompletionWeeks(goals, weeklyLeftover);
  const result = new Map<string, GoalProgress>();

  for (const goal of goals) {
    const remaining = Math.max(goal.targetAmount - goal.currentSaved, 0);
    const percentComplete =
      goal.targetAmount > 0 ? Math.min(100, (goal.currentSaved / goal.targetAmount) * 100) : 100;

    if (remaining <= 0) {
      result.set(goal.id, {
        goalId: goal.id,
        remainingAmount: 0,
        percentComplete: 100,
        status: 'met',
        weeksRemaining: 0,
        monthsRemaining: 0,
      });
      continue;
    }

    const weeksRemaining = completions.get(goal.id) ?? null;
    if (weeksRemaining === null) {
      result.set(goal.id, {
        goalId: goal.id,
        remainingAmount: remaining,
        percentComplete,
        status: 'unreachable',
        weeksRemaining: null,
        monthsRemaining: null,
      });
      continue;
    }

    result.set(goal.id, {
      goalId: goal.id,
      remainingAmount: remaining,
      percentComplete,
      status: 'on-track',
      weeksRemaining,
      monthsRemaining: weeksRemaining / WEEKS_PER_MONTH,
    });
  }

  return result;
}

// Part-to-whole reads at a glance only while the slice count stays small, so the
// tail folds into a single "Other" slice rather than spawning more hues.
const MAX_ALLOCATION_SLICES = 6;

export interface AllocationSlice {
  key: string;
  label: string;
  weeklyAmount: number;
}

/**
 * Splits weekly income into where it goes: one slice per expense category plus a
 * "Leftover" slice. Returns [] when there is no income to allocate.
 */
export function buildIncomeAllocation(
  expenses: MoneyEntry[],
  weeklyLeftover: number,
): AllocationSlice[] {
  const spent = expenses
    .map((entry) => ({
      key: entry.id,
      label: entry.name || 'Untitled',
      weeklyAmount: toWeeklyAmount(entry.amount, entry.frequency),
    }))
    .filter((slice) => slice.weeklyAmount > 0)
    .sort((a, b) => b.weeklyAmount - a.weeklyAmount);

  const hasLeftoverSlice = weeklyLeftover > 0;
  const capacity = hasLeftoverSlice ? MAX_ALLOCATION_SLICES - 1 : MAX_ALLOCATION_SLICES;

  let slices = spent;
  if (spent.length > capacity) {
    const kept = spent.slice(0, capacity - 1);
    const foldedTotal = spent.slice(capacity - 1).reduce((sum, s) => sum + s.weeklyAmount, 0);
    slices = [...kept, { key: '__other__', label: 'Other', weeklyAmount: foldedTotal }];
  }

  if (hasLeftoverSlice) {
    slices = [...slices, { key: '__leftover__', label: 'Leftover', weeklyAmount: weeklyLeftover }];
  }

  return slices;
}

// A stacked chart with too many bands blurs together; the tail folds into a
// single "Other" band rather than spawning more hues (same rule as the pie).
const MAX_GOAL_SERIES = 6;

export interface GoalSavingsPoint {
  week: number;
  [seriesId: string]: number;
}

export interface GoalSavingsSeries {
  id: string;
  name: string;
  /** null for the folded "Other" band, which mixes priorities. */
  priority: number | null;
}

/**
 * Per-goal cumulative savings at each week, honoring the priority waterfall —
 * built for a stacked-area chart where each goal is its own band, ordered and
 * stacked bottom-up by priority, so a band visibly stops growing (flattens)
 * the moment that goal is funded and the next one starts climbing.
 */
export function buildGoalSavingsSeries(
  goals: Goal[],
  weeklyLeftover: number,
  weeks: number,
): { points: GoalSavingsPoint[]; series: GoalSavingsSeries[] } {
  if (weeklyLeftover <= 0 || weeks <= 0 || goals.length === 0) {
    return { points: [], series: [] };
  }

  const sorted = [...goals].sort((a, b) => a.priority - b.priority);
  const overflow = sorted.length > MAX_GOAL_SERIES;
  const kept = overflow ? sorted.slice(0, MAX_GOAL_SERIES - 1) : sorted;
  const folded = overflow ? sorted.slice(MAX_GOAL_SERIES - 1) : [];

  const waterfall = simulateWaterfall(goals, weeklyLeftover);
  const points: GoalSavingsPoint[] = [];
  for (let week = 0; week <= weeks; week++) {
    const saved = savedAmountsAtWeek(goals, week, waterfall);
    const point: GoalSavingsPoint = { week };
    for (const goal of kept) point[goal.id] = saved.get(goal.id) ?? goal.currentSaved;
    if (folded.length > 0) {
      point.__other__ = folded.reduce((sum, g) => sum + (saved.get(g.id) ?? g.currentSaved), 0);
    }
    points.push(point);
  }

  const series: GoalSavingsSeries[] = kept.map((g) => ({
    id: g.id,
    name: g.name || 'Untitled goal',
    priority: g.priority,
  }));
  if (folded.length > 0) series.push({ id: '__other__', name: 'Other', priority: null });

  return { points, series };
}

export interface GoalAtDate {
  goalId: string;
  name: string;
  priority: number;
  currentPercent: number;
  projectedPercent: number;
  reached: boolean;
}

/**
 * Where each goal stands after `weeks` of the current leftover, honoring the
 * priority waterfall — a lower-priority goal doesn't move until every goal
 * ahead of it is fully funded. Returned in priority order (ties keep their
 * original order), matching every other goal list in the app.
 */
export function projectGoalsAt(goals: Goal[], weeklyLeftover: number, weeks: number): GoalAtDate[] {
  const waterfall = simulateWaterfall(goals, Math.max(weeklyLeftover, 0));
  const savedAtHorizon = savedAmountsAtWeek(goals, Math.max(weeks, 0), waterfall);
  const percent = (saved: number, target: number) =>
    target > 0 ? Math.min(100, Math.max(0, (saved / target) * 100)) : 100;

  return [...goals]
    .sort((a, b) => a.priority - b.priority)
    .map((goal) => {
      const projectedPercent = percent(savedAtHorizon.get(goal.id) ?? goal.currentSaved, goal.targetAmount);
      return {
        goalId: goal.id,
        name: goal.name || 'Untitled goal',
        priority: goal.priority,
        currentPercent: percent(goal.currentSaved, goal.targetAmount),
        projectedPercent,
        reached: projectedPercent >= 100,
      };
    });
}

/**
 * How much of the money accumulated by `weeks` is earmarked for goals under
 * the waterfall, vs. free. The two always reconcile with the total balance:
 * `currentBalance + weeklyLeftover*weeks = freeAmount + goalAllocation` —
 * the starting balance is never itself fed into goals, only new leftover is.
 */
export function totalGoalAllocationAtWeeks(goals: Goal[], weeklyLeftover: number, weeks: number): number {
  const waterfall = simulateWaterfall(goals, Math.max(weeklyLeftover, 0));
  const saved = savedAmountsAtWeek(goals, Math.max(weeks, 0), waterfall);
  return goals.reduce((sum, goal) => sum + Math.max((saved.get(goal.id) ?? goal.currentSaved) - goal.currentSaved, 0), 0);
}

/** Weeks to plot: far enough to clear the slowest goal, clamped to a sane window. */
export function projectionHorizonWeeks(goals: Goal[], weeklyLeftover: number): number {
  const DEFAULT_WEEKS = 26;
  const MAX_WEEKS = 104;
  if (weeklyLeftover <= 0) return 0;

  const completions = computeGoalCompletionWeeks(goals, weeklyLeftover);
  const furthest = Math.max(0, ...[...completions.values()].filter((w): w is number => w !== null));

  if (furthest <= 0) return DEFAULT_WEEKS;
  return Math.min(MAX_WEEKS, Math.max(4, Math.ceil(furthest * 1.1)));
}
