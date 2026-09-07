import type { IncomeStream, MoneyEntry, OneOff } from '@/types/budget';
import { isEntryActive, toWeeklyAmount } from '@/lib/budgetMath';
import { advanceByFrequency, parseLocalDate, startOfDay, toDateInputValue } from '@/lib/dates';

/**
 * A day-by-day cash projection.
 *
 * This is the model the app is built on: money has dates. A budget that
 * balances on average can still leave you short the week a half-yearly premium
 * lands, and only a dated view shows that.
 */
export interface CalendarItem {
  id: string;
  name: string;
  amount: number;
  /** A single dated event rather than an instance of a recurring entry. */
  oneOff?: boolean;
}

export interface CalendarDay {
  /** Local date this cell represents. */
  date: Date;
  /** `yyyy-mm-dd`, for keying and lookups. */
  key: string;
  /**
   * Everything arriving that day from regular pay — dated lumps plus the
   * spread rate standing in for any stream with no payday set.
   */
  incoming: number;
  /** The dated pay streams landing that day, named. */
  paydays: CalendarItem[];
  /** True when real dated pay lands, rather than only a spread rate. */
  isPayday: boolean;
  /** One-off money arriving — a refund, a bonus, something sold. */
  credits: CalendarItem[];
  /** Bills and one-off payments going out that day. */
  bills: CalendarItem[];
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
  /** Every pay stream, each with its own cycle and its own next payday. */
  incomes: IncomeStream[];
  expenses: MoneyEntry[];
  /**
   * Planned single payments and windfalls. They carry no weekly rate anywhere
   * else in the app, so the calendar is the only place their cost shows up.
   */
  oneOffs: OneOff[];
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
  frequency: MoneyEntry['frequency'],
  from: Date,
  through: Date,
  limit = 2000,
): Date[] {
  const found: Date[] = [];
  for (let i = 0; i < limit; i++) {
    const when = i === 0 ? anchor : advanceByFrequency(anchor, frequency, i);
    if (when.getTime() > through.getTime()) break;
    if (when.getTime() >= from.getTime()) found.push(when);
  }
  return found;
}

/**
 * Splits a list of recurring entries into dated lumps and a smooth daily rate.
 *
 * An entry with a date lands on that date; everything else is spread evenly
 * across the days it covers. An entry is never counted both ways — doing so
 * would silently double-charge exactly the entries someone took the trouble
 * to date.
 *
 * Income and expenses both come through here, and must: dating the money going
 * out while leaving the money coming in undated makes the balance fall every
 * single day and paints the whole calendar red no matter how healthy the
 * budget is.
 */
function splitSchedule(entries: MoneyEntry[], start: Date, end: Date, fallbackName: string) {
  const active = entries.filter((entry) => isEntryActive(entry, start));
  const byDay = new Map<string, CalendarItem[]>();
  let dailyDrip = 0;

  for (const entry of active) {
    const anchor = entry.nextDue ? parseLocalDate(entry.nextDue) : null;
    if (!anchor) {
      dailyDrip += toWeeklyAmount(entry.amount, entry.frequency) / 7;
      continue;
    }
    const endsOn = entry.endDate ? parseLocalDate(entry.endDate) : null;
    for (const when of occurrencesWithin(anchor, entry.frequency, start, end)) {
      if (endsOn && when.getTime() > endsOn.getTime()) break;
      const key = toDateInputValue(when);
      const list = byDay.get(key) ?? [];
      list.push({ id: entry.id, name: entry.name || fallbackName, amount: entry.amount });
      byDay.set(key, list);
    }
  }

  return { byDay, dailyDrip };
}

const sum = (items: CalendarItem[]) => items.reduce((total, item) => total + item.amount, 0);

/** Builds the daily series. */
export function buildCashflowDays({
  from,
  through,
  startingBalance,
  incomes,
  expenses,
  oneOffs,
}: CashflowInput): CalendarDay[] {
  const start = startOfDay(from);
  const end = startOfDay(through);
  const totalDays = daysBetween(start, end);
  if (totalDays < 0) return [];

  const pay = splitSchedule(incomes, start, end, 'Income');
  const out = splitSchedule(expenses, start, end, 'Untitled');

  // A one-off is a single event: it lands on its day and is then done. Dates
  // already behind us are skipped — that money has already moved, and the
  // balance the projection starts from reflects it either way.
  const creditsByDay = new Map<string, CalendarItem[]>();
  for (const item of oneOffs) {
    const when = parseLocalDate(item.date);
    if (!when || when.getTime() < start.getTime() || when.getTime() > end.getTime()) continue;
    const key = toDateInputValue(when);
    const target = item.direction === 'in' ? creditsByDay : out.byDay;
    const list = target.get(key) ?? [];
    list.push({ id: item.id, name: item.name || 'One-off', amount: item.amount, oneOff: true });
    target.set(key, list);
  }

  const days: CalendarDay[] = [];
  let balance = startingBalance;

  for (let offset = 0; offset <= totalDays; offset++) {
    const date = new Date(start.getFullYear(), start.getMonth(), start.getDate() + offset);
    const key = toDateInputValue(date);

    const paydays = pay.byDay.get(key) ?? [];
    const credits = creditsByDay.get(key) ?? [];
    const bills = out.byDay.get(key) ?? [];
    const incoming = sum(paydays) + pay.dailyDrip;

    balance += incoming + sum(credits) - out.dailyDrip - sum(bills);
    days.push({
      date,
      key,
      incoming,
      paydays,
      isPayday: paydays.length > 0,
      credits,
      bills,
      balance,
      short: balance < 0,
    });
  }

  return days;
}
