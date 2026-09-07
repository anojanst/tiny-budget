import type { Income, MoneyEntry } from '@/types/budget';
import { isEntryActive, toWeeklyAmount } from '@/lib/budgetMath';
import { advanceByFrequency, parseLocalDate, startOfDay, toDateInputValue } from '@/lib/dates';

/**
 * A day-by-day cash projection, as opposed to the weekly rates the rest of the
 * app reasons in.
 *
 * The two answer different questions and are both true: the weekly figure is
 * what you should *set aside*, this is when money actually *moves*. A budget
 * that balances on average can still leave you short the week a half-yearly
 * premium lands, and only a dated view shows that.
 */
export interface CalendarBill {
  id: string;
  name: string;
  amount: number;
}

export interface CalendarDay {
  /** Local date this cell represents. */
  date: Date;
  /** `yyyy-mm-dd`, for keying and lookups. */
  key: string;
  /** Money in that day. Zero except on paydays. */
  incoming: number;
  /** Dated bills falling due that day. */
  bills: CalendarBill[];
  /** Projected cash on hand at the end of the day. */
  balance: number;
  /** True when the balance goes negative — the thing worth spotting early. */
  short: boolean;
}

interface CashflowInput {
  /** First day to project from — normally today. */
  from: Date;
  /** Last day to project through, inclusive. */
  through: Date;
  startingBalance: number;
  income: Income;
  /** Anchor for the pay cycle. Without one there are no paydays to mark. */
  nextPayday: Date | null;
  expenses: MoneyEntry[];
  /**
   * Cumulative cash paid to debts by a given number of weeks from `from`.
   * Passed in rather than recomputed so the calendar and the payoff page can
   * never disagree about what the snowball costs.
   */
  cumulativeDebtSpend: (weeks: number) => number;
}

const MS_PER_DAY = 24 * 60 * 60 * 1000;

function daysBetween(from: Date, to: Date): number {
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY);
}

/**
 * Every occurrence of a recurring date that falls within a window, rolled
 * forward from its anchor. Bounded so a far-past anchor can't spin.
 */
function occurrencesWithin(
  anchor: Date,
  entry: Pick<MoneyEntry, 'frequency'>,
  from: Date,
  through: Date,
  limit = 2000,
): Date[] {
  const found: Date[] = [];
  for (let i = 0; i < limit; i++) {
    const when = i === 0 ? anchor : advanceByFrequency(anchor, entry.frequency, i);
    if (when.getTime() > through.getTime()) break;
    if (when.getTime() >= from.getTime()) found.push(when);
  }
  return found;
}

/**
 * Builds the daily series.
 *
 * Expenses split two ways on purpose. A bill with a due date is charged on
 * that date as a lump; everything else is spread evenly across the days it
 * covers. An entry is never counted both ways — doing so would silently
 * double-charge exactly the bills the user took the trouble to date.
 */
export function buildCashflowDays({
  from,
  through,
  startingBalance,
  income,
  nextPayday,
  expenses,
  cumulativeDebtSpend,
}: CashflowInput): CalendarDay[] {
  const start = startOfDay(from);
  const end = startOfDay(through);
  const totalDays = daysBetween(start, end);
  if (totalDays < 0) return [];

  const active = expenses.filter((entry) => isEntryActive(entry, start));
  const dated = active.filter((entry) => !!entry.nextDue && parseLocalDate(entry.nextDue));
  const undated = active.filter((entry) => !dated.includes(entry));

  // Everything without a date becomes a smooth daily cost.
  const dailyDrip = undated.reduce(
    (sum, entry) => sum + toWeeklyAmount(entry.amount, entry.frequency) / 7,
    0,
  );

  const billsByDay = new Map<string, CalendarBill[]>();
  for (const entry of dated) {
    const anchor = parseLocalDate(entry.nextDue!)!;
    const endsOn = entry.endDate ? parseLocalDate(entry.endDate) : null;
    for (const when of occurrencesWithin(anchor, entry, start, end)) {
      if (endsOn && when.getTime() > endsOn.getTime()) break;
      const key = toDateInputValue(when);
      const list = billsByDay.get(key) ?? [];
      list.push({ id: entry.id, name: entry.name || 'Untitled', amount: entry.amount });
      billsByDay.set(key, list);
    }
  }

  const paydayKeys = new Set(
    nextPayday
      ? occurrencesWithin(startOfDay(nextPayday), { frequency: income.frequency }, start, end).map(
          toDateInputValue,
        )
      : [],
  );

  const days: CalendarDay[] = [];
  let balance = startingBalance;
  let debtPaidSoFar = 0;

  for (let offset = 0; offset <= totalDays; offset++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const key = toDateInputValue(date);

    // Debt comes from the snowball's own schedule, taken as the increment
    // since yesterday so a payoff that finishes mid-window simply stops.
    const debtToDate = cumulativeDebtSpend(offset / 7);
    const debtToday = Math.max(debtToDate - debtPaidSoFar, 0);
    debtPaidSoFar = debtToDate;

    const bills = billsByDay.get(key) ?? [];
    const billTotal = bills.reduce((sum, bill) => sum + bill.amount, 0);
    const incoming = paydayKeys.has(key) ? income.amount : 0;

    balance += incoming - dailyDrip - debtToday - billTotal;
    days.push({ date, key, incoming, bills, balance, short: balance < 0 });
  }

  return days;
}
