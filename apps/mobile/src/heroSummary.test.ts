import { describe, expect, it } from 'vitest';
import { buildCashflowDays, type CalendarDay } from '@money-ahead/core';
import { summariseMonth } from './heroSummary';

const from = new Date(2026, 10, 1); // Sun 1 Nov 2026
const day = (n: number) => new Date(2026, 10, 1 + n);
const iso = (n: number) => `2026-11-${String(1 + n).padStart(2, '0')}`;

/** A November, built from whatever is handed in. */
function month(over: {
  startingBalance: number;
  incomes?: Parameters<typeof buildCashflowDays>[0]['incomes'];
  expenses?: Parameters<typeof buildCashflowDays>[0]['expenses'];
  oneOffs?: Parameters<typeof buildCashflowDays>[0]['oneOffs'];
}): CalendarDay[] {
  return buildCashflowDays({
    from,
    through: day(29),
    startingBalance: over.startingBalance,
    incomes: over.incomes ?? [],
    expenses: over.expenses ?? [],
    oneOffs: over.oneOffs ?? [],
  });
}

const wage = [
  { id: 'w', name: 'Wages', amount: 2000, frequency: 'fortnightly' as const, nextDue: iso(4) },
];

describe('summariseMonth', () => {
  it('leads with where the month leaves you', () => {
    const s = summariseMonth(month({ startingBalance: 1000, incomes: wage }), 200, from);
    expect(s?.label).toContain("you'll have");
    expect(s?.short).toBe(false);
    expect(s?.amount).toBe(5000); // 1000 + two fortnightly wages
    expect(s?.tone).toBe('good');
  });

  /**
   * The reason the headline can be the good number at all. A month that ends
   * comfortably having gone under on the 3rd must never read as untroubled —
   * remove the `tone === 'bad'` branch and this is what catches it.
   */
  it('says so when a month dips under and recovers', () => {
    const s = summariseMonth(
      month({
        startingBalance: 1000,
        incomes: wage,
        oneOffs: [
          { id: 'o', name: 'Bond', amount: 1500, date: iso(2), direction: 'out' },
        ],
      }),
      200,
      from,
    );
    expect(s?.short).toBe(false); // the month still ends in the black
    expect(s?.tone).toBe('bad'); // but it is not a good month
    expect(s?.note).toContain('under');
    expect(s?.note).toContain('recovers');
    expect(s?.note).toContain('Nov 3');
  });

  it('names the day it first goes under, not the day it is lowest', () => {
    // Nothing comes in, so every day is lower than the last and the lowest day
    // is the 30th. The useful date is the first crossing.
    const s = summariseMonth(
      month({
        startingBalance: 100,
        expenses: [{ id: 'e', name: 'Rent', amount: 700, frequency: 'weekly', nextDue: iso(1) }],
      }),
      700,
      from,
    );
    expect(s?.short).toBe(true);
    expect(s?.note).toContain('Nov 2');
    expect(s?.note).not.toContain('Nov 30');
  });

  it('flips the label rather than printing a negative figure', () => {
    const s = summariseMonth(
      month({
        startingBalance: 0,
        expenses: [{ id: 'e', name: 'Rent', amount: 400, frequency: 'weekly', nextDue: iso(1) }],
      }),
      400,
      from,
    );
    expect(s?.label).toContain("you'll be short");
    expect(s?.amount).toBeGreaterThan(0);
    expect(s?.short).toBe(true);
  });

  it('does not repeat itself when the thinnest day is the last one', () => {
    const s = summariseMonth(
      month({
        startingBalance: 5000,
        expenses: [{ id: 'e', name: 'Rent', amount: 100, frequency: 'weekly', nextDue: iso(1) }],
      }),
      100,
      from,
    );
    expect(s?.note).toBe('Never lower than this on the way');
  });

  it('warns while the buffer is thin but still positive', () => {
    const s = summariseMonth(
      month({
        startingBalance: 1000,
        incomes: wage,
        oneOffs: [{ id: 'o', name: 'Car', amount: 950, date: iso(2), direction: 'out' }],
      }),
      500,
      from,
    );
    expect(s?.tone).toBe('warn');
    expect(s?.note).toContain('Thinnest');
  });

  it('always says something about the way there', () => {
    // Whatever the month, the note is never empty — that is the invariant that
    // lets the headline be the ending.
    for (const balance of [-500, 0, 50, 5000]) {
      const s = summariseMonth(month({ startingBalance: balance, incomes: wage }), 300, from);
      expect(s?.note.length).toBeGreaterThan(0);
    }
  });

  it('has nothing to say about no days', () => {
    expect(summariseMonth([], 100, from)).toBeNull();
  });
});
