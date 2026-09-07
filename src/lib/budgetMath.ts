import type { Frequency, MoneyEntry } from '@/types/budget';
import { advanceByFrequency, parseLocalDate } from '@/lib/dates';

// Average number of weeks in a month (52 weeks / 12 months).
export const WEEKS_PER_MONTH = 52 / 12;

/**
 * How many weeks each billing cycle spans. Everything in the app is compared
 * on a weekly basis, so a half-yearly insurance premium is simply that amount
 * spread across its 26 weeks — the sinking-fund rate you'd need to set aside.
 */
export const WEEKS_PER_PERIOD: Record<Frequency, number> = {
  weekly: 1,
  fortnightly: 2,
  monthly: WEEKS_PER_MONTH,
  quarterly: 13,
  biannual: 26,
  annual: 52,
};

/**
 * Cycles that arrive as a lump rather than a steady drip, where knowing the
 * due date is the difference between being ready for it and being caught out.
 * Their date field opens by default; every other cycle can still take one.
 */
export function isLumpySchedule(frequency: Frequency): boolean {
  return frequency === 'quarterly' || frequency === 'biannual' || frequency === 'annual';
}

export function toWeeklyAmount(amount: number, frequency: Frequency): number {
  // Falls back to monthly for an unrecognised value, matching how every
  // version before periodic frequencies existed read its stored data.
  return amount / (WEEKS_PER_PERIOD[frequency] ?? WEEKS_PER_MONTH);
}

export function sumWeekly(entries: MoneyEntry[]): number {
  return entries.reduce((sum, entry) => sum + toWeeklyAmount(entry.amount, entry.frequency), 0);
}

/**
 * Whether an entry is still owed. An end date that has gone by means the
 * commitment is finished, and continuing to reserve for it would understate
 * what's actually available every week from then on.
 */
export function isEntryActive(entry: MoneyEntry, today: Date): boolean {
  if (!entry.endDate) return true;
  const end = parseLocalDate(entry.endDate);
  return end === null || end.getTime() >= today.getTime();
}

/**
 * The next time this falls due, rolled forward past any occurrences already
 * behind us. Entering "first due 1 Feb, quarterly" once should keep showing a
 * date in the future years later, without anyone editing it.
 *
 * Returns null when there's no date set, or when the schedule has ended.
 */
export function nextDueOccurrence(entry: MoneyEntry, today: Date): Date | null {
  if (!entry.nextDue) return null;
  const first = parseLocalDate(entry.nextDue);
  if (first === null) return null;

  const end = entry.endDate ? parseLocalDate(entry.endDate) : null;
  let due = first;
  // Bounded rather than `while (true)`: a corrupt date far in the past must
  // not spin here. 400 cycles covers a weekly bill entered eight years ago.
  for (let i = 0; i < 400 && due.getTime() < today.getTime(); i++) {
    due = advanceByFrequency(first, entry.frequency, i + 1);
  }
  if (due.getTime() < today.getTime()) return null;
  if (end && due.getTime() > end.getTime()) return null;
  return due;
}
