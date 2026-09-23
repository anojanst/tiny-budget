import { describe, expect, it } from 'vitest';
import { addWeeks, parseLocalDate, startOfToday, toDateInputValue, weeksBetween } from './dates';

describe('weeksBetween', () => {
  it('counts whole weeks between two local midnights', () => {
    const from = new Date(2026, 0, 1);
    const to = new Date(2026, 0, 29);
    expect(weeksBetween(from, to)).toBe(4);
  });

  it('is unaffected by a daylight saving transition in between', () => {
    // Whatever the runtime's timezone, 84 calendar days is 12 weeks. Measured
    // in raw milliseconds a DST shift makes this 11.994, which quietly shaved
    // money off every projection spanning the changeover.
    const from = startOfToday();
    const to = new Date(from);
    to.setDate(to.getDate() + 84);
    expect(weeksBetween(from, to)).toBe(12);
  });

  it('agrees with addWeeks in the other direction', () => {
    const from = new Date(2026, 5, 10);
    for (const weeks of [1, 7, 26, 52]) {
      expect(weeksBetween(from, addWeeks(from, weeks))).toBe(weeks);
    }
  });

  it('returns a negative span for a date in the past', () => {
    const from = new Date(2026, 0, 29);
    expect(weeksBetween(from, new Date(2026, 0, 1))).toBe(-4);
  });
});

describe('parseLocalDate', () => {
  it('reads a date input value as a local date, not UTC', () => {
    const date = parseLocalDate('2026-08-06')!;
    expect(date.getFullYear()).toBe(2026);
    expect(date.getMonth()).toBe(7);
    expect(date.getDate()).toBe(6);
  });

  it('rejects anything that is not a full date', () => {
    expect(parseLocalDate('2026-08')).toBeNull();
    expect(parseLocalDate('')).toBeNull();
  });

  it('round-trips through toDateInputValue', () => {
    const value = '2027-02-28';
    expect(toDateInputValue(parseLocalDate(value)!)).toBe(value);
  });
});
