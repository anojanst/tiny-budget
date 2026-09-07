import type { Frequency } from '@/types/budget';

const MS_PER_WEEK = 7 * 24 * 60 * 60 * 1000;

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

/**
 * Parses a native date-input value as a LOCAL date. `new Date('2026-08-06')`
 * would read it as UTC midnight, which lands on the previous day west of GMT.
 */
export function parseLocalDate(value: string): Date | null {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
  return Number.isNaN(date.getTime()) ? null : date;
}

export function toDateInputValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function addMonths(date: Date, months: number): Date {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

export function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

/**
 * Advances a date by whole billing cycles. Month-based cycles step by months
 * rather than by weeks so a bill due on the 15th stays on the 15th instead of
 * drifting backwards through the calendar.
 */
export function advanceByFrequency(
  date: Date,
  frequency: Frequency,
  cycles: number,
): Date {
  switch (frequency) {
    case 'weekly':
      return addDays(date, 7 * cycles);
    case 'fortnightly':
      return addDays(date, 14 * cycles);
    case 'monthly':
      return addMonths(date, cycles);
    case 'quarterly':
      return addMonths(date, 3 * cycles);
    case 'biannual':
      return addMonths(date, 6 * cycles);
    case 'annual':
      return addMonths(date, 12 * cycles);
  }
}

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * MS_PER_WEEK);
}

/**
 * Counts calendar days, not elapsed milliseconds. A span crossing a daylight
 * saving boundary is an hour shorter or longer in real time, which made a
 * whole number of weeks come back as 11.994 — enough to shave a visible amount
 * off a projected balance. Both arguments are local midnights, so rounding to
 * the nearest day recovers the intended calendar distance.
 */
export function weeksBetween(from: Date, to: Date): number {
  const MS_PER_DAY = MS_PER_WEEK / 7;
  return Math.round((to.getTime() - from.getTime()) / MS_PER_DAY) / 7;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
