import { describe, expect, it } from 'vitest';
import {
  isEntryActive,
  nextDueOccurrence,
  sumWeekly,
  toWeeklyAmount,
  WEEKS_PER_MONTH,
} from './budgetMath';
import type { Frequency, MoneyEntry } from '@/types/budget';
import { toDateInputValue } from './dates';

const entry = (over: Partial<MoneyEntry> = {}): MoneyEntry => ({
  id: 'e',
  name: 'Thing',
  amount: 0,
  frequency: 'weekly',
  ...over,
});

describe('toWeeklyAmount', () => {
  it('returns weekly amount unchanged', () => {
    expect(toWeeklyAmount(100, 'weekly')).toBe(100);
  });

  it('normalizes monthly amount to weekly', () => {
    expect(toWeeklyAmount(WEEKS_PER_MONTH * 100, 'monthly')).toBeCloseTo(100);
  });
});

describe('toWeeklyAmount — periodic cycles', () => {
  it('spreads each cycle across its own number of weeks', () => {
    expect(toWeeklyAmount(100, 'weekly')).toBe(100);
    expect(toWeeklyAmount(100, 'fortnightly')).toBe(50);
    expect(toWeeklyAmount(1300, 'quarterly')).toBe(100);
    expect(toWeeklyAmount(2600, 'biannual')).toBe(100);
    expect(toWeeklyAmount(5200, 'annual')).toBe(100);
  });

  it('turns a half-yearly premium into the rate you must set aside', () => {
    // The example the whole feature exists for: $600 every six months is
    // $23.08 a week, reserved before anything reaches debts or goals.
    expect(toWeeklyAmount(600, 'biannual')).toBeCloseTo(23.08, 2);
  });

  it('falls back to monthly for a value it does not recognise', () => {
    expect(toWeeklyAmount(WEEKS_PER_MONTH * 100, 'nonsense' as Frequency)).toBeCloseTo(100);
  });
});

describe('isEntryActive', () => {
  const base = { id: 'e1', name: 'Fees', amount: 100, frequency: 'quarterly' as const };
  const today = new Date(2026, 5, 15);

  it('counts an entry with no end date', () => {
    expect(isEntryActive(base, today)).toBe(true);
  });

  it('counts an entry whose end date is still ahead', () => {
    expect(isEntryActive({ ...base, endDate: '2027-01-01' }, today)).toBe(true);
  });

  it('still counts it on the end date itself', () => {
    expect(isEntryActive({ ...base, endDate: '2026-06-15' }, today)).toBe(true);
  });

  it('drops an entry whose end date has passed', () => {
    // A finished commitment must stop being reserved, or it understates what
    // is actually free every week from then on.
    expect(isEntryActive({ ...base, endDate: '2026-06-14' }, today)).toBe(false);
  });

  it('keeps counting when the end date is unparseable rather than silently dropping money', () => {
    expect(isEntryActive({ ...base, endDate: 'not-a-date' }, today)).toBe(true);
  });
});

describe('nextDueOccurrence', () => {
  const today = new Date(2026, 5, 15); // 15 Jun 2026

  it('returns null when no date is set', () => {
    expect(nextDueOccurrence({ id: 'e', name: 'X', amount: 1, frequency: 'annual' }, today)).toBeNull();
  });

  it('keeps a future date as it is', () => {
    const due = nextDueOccurrence(
      { id: 'e', name: 'X', amount: 1, frequency: 'annual', nextDue: '2026-11-15' },
      today,
    );
    expect(toDateInputValue(due!)).toBe('2026-11-15');
  });

  it('rolls a past date forward to the next occurrence', () => {
    // Entered once as "first due 1 Feb, quarterly" — years later it should
    // still show a date in the future without anyone editing it.
    const due = nextDueOccurrence(
      { id: 'e', name: 'X', amount: 1, frequency: 'quarterly', nextDue: '2025-02-01' },
      today,
    );
    expect(toDateInputValue(due!)).toBe('2026-08-01');
  });

  it('holds the day of the month across a yearly roll', () => {
    const due = nextDueOccurrence(
      { id: 'e', name: 'X', amount: 1, frequency: 'annual', nextDue: '2020-03-09' },
      today,
    );
    expect(toDateInputValue(due!)).toBe('2027-03-09');
  });

  it('returns null once the schedule has ended', () => {
    const due = nextDueOccurrence(
      { id: 'e', name: 'X', amount: 1, frequency: 'annual', nextDue: '2025-01-01', endDate: '2026-01-05' },
      today,
    );
    expect(due).toBeNull();
  });

  it('terminates on a date far enough in the past to exhaust the cycle cap', () => {
    const due = nextDueOccurrence(
      { id: 'e', name: 'X', amount: 1, frequency: 'weekly', nextDue: '1990-01-01' },
      today,
    );
    expect(due).toBeNull();
  });
});

describe('sumWeekly', () => {
  it('normalises every cycle onto one weekly basis before adding', () => {
    // The same $2,600 a year, expressed four ways, must weigh the same.
    expect(
      sumWeekly([
        entry({ amount: 50, frequency: 'weekly' }),
        entry({ amount: 100, frequency: 'fortnightly' }),
        entry({ amount: 650, frequency: 'quarterly' }),
        entry({ amount: 2600, frequency: 'annual' }),
      ]),
    ).toBeCloseTo(200, 10);
  });

  it('is zero for an empty list rather than NaN', () => {
    expect(sumWeekly([])).toBe(0);
  });
});
