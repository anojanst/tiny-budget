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

export function addWeeks(date: Date, weeks: number): Date {
  return new Date(date.getTime() + weeks * MS_PER_WEEK);
}

export function weeksBetween(from: Date, to: Date): number {
  return (to.getTime() - from.getTime()) / MS_PER_WEEK;
}

export function formatShortDate(date: Date): string {
  return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' });
}
