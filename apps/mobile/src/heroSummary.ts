import {
  formatCurrency,
  formatDayMonth,
  weeksBetween,
  type CalendarDay,
} from '@money-ahead/core';

export interface HeroSummary {
  /** Sits above the figure: "By Nov 30 you'll have". */
  label: string;
  /** The figure itself, already absolute — `short` carries the sign. */
  amount: number;
  /** True when the month *ends* below zero. */
  short: boolean;
  /** The line under the figure. Never empty, and never only good news. */
  note: string;
  tone: 'good' | 'warn' | 'bad';
}

/**
 * What the hero card says about a month.
 *
 * The headline is where the month *leaves* you, because that is the question
 * the app exists to answer and the one a budget cannot. But leading with the
 * ending has a failure mode: a month can end comfortably having gone under on
 * the 3rd, and a card that reported only the ending would read as fine right
 * up until a payment bounced.
 *
 * So the note is not a warning that appears when things go wrong — it is
 * always there, and it always describes the worst point on the way. That
 * invariant is what makes leading with the good number safe, and it is pinned
 * by tests rather than left to whoever edits this next.
 */
export function summariseMonth(
  days: CalendarDay[],
  weeklyOutgoings: number,
  today: Date,
): HeroSummary | null {
  if (days.length === 0) return null;

  const monthEnd = days[days.length - 1];
  const low = days.reduce((min, d) => (d.balance < min.balance ? d : min), days[0]);
  // Not the same day as the lowest, and the more useful of the two: once you
  // are under you stay under until something arrives, so the lowest point is
  // usually just the end of the month, while the day it first crosses is the
  // one you can still do something about.
  const firstShort = days.find((d) => d.short) ?? null;

  const endsShort = monthEnd.balance < 0;
  const tone: HeroSummary['tone'] =
    low.balance < 0 ? 'bad' : low.balance < weeklyOutgoings ? 'warn' : 'good';

  let note: string;
  if (tone === 'bad' && firstShort) {
    const daysAway = Math.max(Math.round(weeksBetween(today, firstShort.date) * 7), 0);
    const when = daysAway === 0 ? 'today' : daysAway === 1 ? 'tomorrow' : `in ${daysAway} days`;
    note = endsShort
      ? `Goes under on ${formatDayMonth(firstShort.date)}, ${when}`
      : `Dips ${formatCurrency(-low.balance)} under on ${formatDayMonth(
          firstShort.date,
        )} before it recovers`;
  } else if (low.key === monthEnd.key) {
    note = 'Never lower than this on the way';
  } else {
    note = `Thinnest on ${formatDayMonth(low.date)} — ${formatCurrency(low.balance)} left`;
  }

  return {
    label: `By ${formatDayMonth(monthEnd.date)} you'll ${endsShort ? 'be short' : 'have'}`,
    amount: Math.abs(monthEnd.balance),
    short: endsShort,
    note,
    tone,
  };
}
