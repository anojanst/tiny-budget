import type { Debt } from '@/types/budget';

/**
 * The debt snowball (Ramsey): order debts smallest balance first, pay every
 * minimum, and throw every spare dollar at the single smallest one. When it
 * closes, its minimum joins the attack on the next — the payment "snowballs".
 *
 * Interest is not modelled. A real minimum payment already covers its own
 * interest, so treating each balance as a fixed amount to pay down is both
 * close enough and far easier to trust than a projection built on an APR the
 * user had to guess. It also means a balance can only ever fall, so there's no
 * negative-amortization case to defend against.
 *
 * Still simulated week by week rather than solved in closed form: the payment
 * rolling from one debt to the next changes the rate at each closure, and a
 * loop makes that obvious where algebra would hide it.
 */

/** Long enough to expose a hopeless plan, short enough to always terminate. */
const MAX_WEEKS = 3000;
const EPSILON = 1e-6;

export type DebtStatus = 'paid' | 'on-track' | 'unreachable';

export interface DebtOutcome {
  debtId: string;
  status: DebtStatus;
  /** null when unreachable. */
  payoffWeek: number | null;
  startingBalance: number;
}

export interface SnowballResult {
  /** Payoff order: smallest starting balance first. */
  order: Debt[];
  outcomeById: Map<string, DebtOutcome>;
  /** null if anything is unreachable. */
  debtFreeWeek: number | null;
  totalPaid: number;
  /** Cash left over after the lump sum cleared every debt — spills to goals. */
  lumpSumRemainder: number;
  /** Per-week remaining balance by debt id, index 0 = today (after the lump sum). */
  balanceHistory: Map<string, number[]>;
  /**
   * Cumulative cash actually handed to lenders by week, index 0 = the week-0
   * lump sum. Payments stop when the debts do, so this plateaus rather than
   * growing forever — which is what lets a projection show money becoming free
   * again once the snowball finishes.
   */
  paidHistory: number[];
}

/** Cumulative cash paid to debts by `weeks`, interpolated between whole weeks. */
export function debtSpendAtWeek(result: SnowballResult, weeks: number): number {
  const history = result.paidHistory;
  if (history.length === 0) return 0;
  if (weeks <= 0) return history[0];
  const last = history.length - 1;
  if (weeks >= last) return history[last];
  const whole = Math.floor(weeks);
  const fraction = weeks - whole;
  return history[whole] + (history[whole + 1] - history[whole]) * fraction;
}

/**
 * Payoff order, fixed once from starting balances. The point is a quick first
 * win — the smallest debt disappearing soonest — not optimal interest.
 *
 * Note the asymmetry with goals: tied goals *split* the funding evenly, tied
 * debts do not. The first-listed of an equal pair takes the whole attack and
 * the other waits. Sorting is stable, so input order breaks ties.
 */
export function snowballOrder(debts: Debt[]): Debt[] {
  return debts
    .map((debt, index) => ({ debt, index }))
    .sort((a, b) => a.debt.balance - b.debt.balance || a.index - b.index)
    .map(({ debt }) => debt);
}

/** Pours `amount` into debts in payoff order, one at a time. Returns what's left. */
function cascade(amount: number, order: Debt[], remaining: Map<string, number>): number {
  let left = amount;
  for (const debt of order) {
    if (left <= EPSILON) break;
    const owed = remaining.get(debt.id) ?? 0;
    if (owed <= EPSILON) continue;
    const give = Math.min(left, owed);
    remaining.set(debt.id, owed - give);
    left -= give;
  }
  return left;
}

export function simulateSnowball(
  debts: Debt[],
  weeklyExtra: number,
  currentBalance = 0,
): SnowballResult {
  const order = snowballOrder(debts);
  const outcomeById = new Map<string, DebtOutcome>();
  const balanceHistory = new Map<string, number[]>();
  const remaining = new Map<string, number>();

  for (const debt of order) {
    remaining.set(debt.id, Math.max(debt.balance, 0));
  }

  // Debts already at zero never enter the simulation.
  for (const debt of order) {
    if ((remaining.get(debt.id) ?? 0) <= EPSILON) {
      outcomeById.set(debt.id, {
        debtId: debt.id,
        status: 'paid',
        payoffWeek: 0,
        startingBalance: Math.max(debt.balance, 0),
      });
    }
  }

  // The balance is money already in hand, so it lands immediately.
  const lumpSum = Math.max(currentBalance, 0);
  const lumpSumRemainder = cascade(lumpSum, order, remaining);
  const paidHistory: number[] = [lumpSum - lumpSumRemainder];
  for (const debt of order) {
    if (!outcomeById.has(debt.id) && (remaining.get(debt.id) ?? 0) <= EPSILON) {
      outcomeById.set(debt.id, {
        debtId: debt.id,
        status: 'paid',
        payoffWeek: 0,
        startingBalance: Math.max(debt.balance, 0),
      });
    }
    balanceHistory.set(debt.id, [remaining.get(debt.id) ?? 0]);
  }

  // Constant for the whole run: as debts close, their minimums stop being spent
  // and fall through to the attack instead. That rollover *is* the snowball.
  const totalWeeklyBudget =
    order.reduce((sum, debt) => sum + Math.max(debt.minimumPayment, 0), 0) + Math.max(weeklyExtra, 0);

  const isOpen = (debt: Debt) => (remaining.get(debt.id) ?? 0) > EPSILON;

  let week = 0;
  while (order.some(isOpen) && week < MAX_WEEKS) {
    week++;

    let minimumsPaid = 0;
    for (const debt of order) {
      if (!isOpen(debt)) continue;
      const pay = Math.min(Math.max(debt.minimumPayment, 0), remaining.get(debt.id)!);
      remaining.set(debt.id, remaining.get(debt.id)! - pay);
      minimumsPaid += pay;
    }

    const attackBudget = Math.max(totalWeeklyBudget - minimumsPaid, 0);
    const attackUnspent = cascade(attackBudget, order, remaining);
    // Only cash that actually reached a lender counts; a final-week surplus
    // stays in the user's pocket and must not be reported as debt spending.
    paidHistory.push(
      paidHistory[paidHistory.length - 1] + minimumsPaid + (attackBudget - attackUnspent),
    );

    for (const debt of order) {
      if (!outcomeById.has(debt.id) && (remaining.get(debt.id) ?? 0) <= EPSILON) {
        outcomeById.set(debt.id, {
          debtId: debt.id,
          status: 'paid',
          payoffWeek: week,
          startingBalance: Math.max(debt.balance, 0),
        });
      }
      balanceHistory.get(debt.id)!.push(remaining.get(debt.id) ?? 0);
    }
  }

  // Anything still open hit the cap, which without interest can only mean
  // there was no money reaching it at all.
  for (const debt of order) {
    if (!outcomeById.has(debt.id)) {
      outcomeById.set(debt.id, {
        debtId: debt.id,
        status: 'unreachable',
        payoffWeek: null,
        startingBalance: Math.max(debt.balance, 0),
      });
    }
  }

  const anyUnreachable = [...outcomeById.values()].some((o) => o.status === 'unreachable');
  const principal = order.reduce((sum, debt) => sum + Math.max(debt.balance, 0), 0);

  return {
    order,
    outcomeById,
    debtFreeWeek: anyUnreachable || order.length === 0 ? (order.length === 0 ? 0 : null) : week,
    totalPaid: principal,
    lumpSumRemainder,
    balanceHistory,
    paidHistory,
  };
}

/**
 * Progress for a debt as it stands *today* — distinct from its simulated
 * outcome, which is where it lands in the future.
 */
export function debtPercentPaid(debt: Debt, startingBalance: number): number {
  if (startingBalance <= 0) return 100;
  return Math.min(100, Math.max(0, ((startingBalance - debt.balance) / startingBalance) * 100));
}

/**
 * The debt receiving the attack right now — first in payoff order that still
 * has a balance today. Reads current balances, not simulated ones, which all
 * end at zero.
 */
export function activeDebtId(debts: Debt[]): string | null {
  return snowballOrder(debts).find((debt) => debt.balance > EPSILON)?.id ?? null;
}

// A stacked chart with too many bands blurs together; the tail folds into a
// single "Other" band rather than spawning more hues (same rule as budgetMath).
const MAX_DEBT_SERIES = 6;

export interface DebtPayoffPoint {
  week: number;
  [seriesId: string]: number;
}

export interface DebtPayoffSeries {
  id: string;
  name: string;
  /** null for the folded "Other" band, which mixes debts. */
  payoffWeek: number | null;
}

/**
 * Remaining balance per debt at each week, for a stacked-area chart that drains
 * to zero — bands vanish one at a time, bottom-up, as each debt is cleared.
 */
export function buildDebtPayoffSeries(
  debts: Debt[],
  weeklyExtra: number,
  currentBalance = 0,
): { points: DebtPayoffPoint[]; series: DebtPayoffSeries[]; weeks: number } {
  if (debts.length === 0) return { points: [], series: [], weeks: 0 };

  const result = simulateSnowball(debts, weeklyExtra, currentBalance);
  const historyLength = Math.max(
    ...[...result.balanceHistory.values()].map((history) => history.length),
  );
  // An unreachable debt runs to the cap; plotting 57 years of a flat band is
  // noise, so the chart stops at a window that still shows the shape.
  const weeks = Math.min(historyLength - 1, 260);
  if (weeks <= 0) return { points: [], series: [], weeks: 0 };

  const overflow = result.order.length > MAX_DEBT_SERIES;
  const kept = overflow ? result.order.slice(0, MAX_DEBT_SERIES - 1) : result.order;
  const folded = overflow ? result.order.slice(MAX_DEBT_SERIES - 1) : [];

  const at = (debtId: string, week: number) => result.balanceHistory.get(debtId)?.[week] ?? 0;

  const points: DebtPayoffPoint[] = [];
  for (let week = 0; week <= weeks; week++) {
    const point: DebtPayoffPoint = { week };
    for (const debt of kept) point[debt.id] = at(debt.id, week);
    if (folded.length > 0) {
      point.__other__ = folded.reduce((sum, debt) => sum + at(debt.id, week), 0);
    }
    points.push(point);
  }

  const series: DebtPayoffSeries[] = kept.map((debt) => ({
    id: debt.id,
    name: debt.name || 'Untitled debt',
    payoffWeek: result.outcomeById.get(debt.id)?.payoffWeek ?? null,
  }));
  if (folded.length > 0) series.push({ id: '__other__', name: 'Other', payoffWeek: null });

  return { points, series, weeks };
}

export interface DiversionImpact {
  /** Extra weeks until debt-free caused by the diversion. null if incomparable. */
  weeksDelayed: number | null;
  debtFreeWeekWithout: number | null;
  debtFreeWeekWith: number | null;
}

/**
 * What funding goals costs while in debt: the same snowball run twice, once
 * with every spare dollar on the debt and once with the diversion applied.
 */
export function diversionImpact(
  debts: Debt[],
  postMinimum: number,
  goalContribution: number,
  currentBalance = 0,
): DiversionImpact {
  const without = simulateSnowball(debts, postMinimum, currentBalance);
  const with_ = simulateSnowball(debts, Math.max(postMinimum - goalContribution, 0), currentBalance);

  const weeksDelayed =
    without.debtFreeWeek !== null && with_.debtFreeWeek !== null
      ? with_.debtFreeWeek - without.debtFreeWeek
      : null;

  return {
    weeksDelayed,
    debtFreeWeekWithout: without.debtFreeWeek,
    debtFreeWeekWith: with_.debtFreeWeek,
  };
}
