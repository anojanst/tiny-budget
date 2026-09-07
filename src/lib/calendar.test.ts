import { describe, expect, it } from 'vitest';
import { buildCashflowDays } from './calendar';
import type { Income, MoneyEntry, OneOff } from '@/types/budget';

const noDebt = () => 0;
const from = new Date(2026, 0, 1); // Thu 1 Jan 2026
const day = (n: number) => new Date(2026, 0, 1 + n);

const income = (over: Partial<Income> = {}): Income => ({
  amount: 700,
  frequency: 'weekly',
  ...over,
});

describe('buildCashflowDays — paydays', () => {
  it('adds the full cycle amount on each payday, not the weekly average', () => {
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 0,
      income: income({ amount: 1400, frequency: 'fortnightly' }),
      nextPayday: day(3),
      expenses: [],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[3].incoming).toBe(1400);
    expect(days[3].balance).toBe(1400);
    // Nothing on the days between, then the next one a fortnight later.
    expect(days[10].incoming).toBe(0);
    expect(days[17].incoming).toBe(1400);
    expect(days[17].balance).toBe(2800);
  });

  it('marks no paydays without an anchor, but still earns the income', () => {
    const days = buildCashflowDays({
      from,
      through: day(30),
      startingBalance: 500,
      income: income(),
      nextPayday: null,
      expenses: [],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    // Nothing is a dated payday...
    expect(days.every((d) => !d.isPayday)).toBe(true);
    // ...but $700/wk still arrives, spread across the days. Dropping it
    // instead would make the balance fall forever while undated expenses kept
    // draining, painting a healthy budget entirely red.
    expect(days[30].balance).toBeCloseTo(500 + (700 / 7) * 31, 6);
  });

  it('does not double-count income once an anchor exists', () => {
    const args = {
      from,
      through: day(30),
      startingBalance: 500,
      income: income(),
      expenses: [],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    };
    const dated = buildCashflowDays({ ...args, nextPayday: day(3) });
    // Four weekly pays land on days 3/10/17/24; the drip must be switched off,
    // or the same money would be counted twice.
    expect(dated.filter((d) => d.isPayday)).toHaveLength(4);
    expect(dated[30].balance).toBe(500 + 700 * 4);
  });

  it('keeps a monthly payday on the same day of the month', () => {
    const days = buildCashflowDays({
      from: new Date(2026, 0, 1),
      through: new Date(2026, 3, 30),
      startingBalance: 0,
      income: income({ amount: 3000, frequency: 'monthly' }),
      nextPayday: new Date(2026, 0, 20),
      expenses: [],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    const paydays = days.filter((d) => d.incoming > 0).map((d) => d.key);
    expect(paydays).toEqual(['2026-01-20', '2026-02-20', '2026-03-20', '2026-04-20']);
  });
});

describe('buildCashflowDays — expenses', () => {
  const weeklyFood: MoneyEntry = { id: 'f', name: 'Food', amount: 70, frequency: 'weekly' };

  it('spreads an undated expense evenly across the days it covers', () => {
    const days = buildCashflowDays({
      from,
      through: day(6),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [weeklyFood],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    // $70/wk is $10/day, so a week takes exactly $70.
    expect(days[0].balance).toBeCloseTo(90);
    expect(days[6].balance).toBeCloseTo(30);
  });

  it('charges a dated bill as a lump on its day', () => {
    const bill: MoneyEntry = {
      id: 'b',
      name: 'Insurance',
      amount: 600,
      frequency: 'biannual',
      nextDue: '2026-01-05',
    };
    const days = buildCashflowDays({
      from,
      through: day(9),
      startingBalance: 1000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [bill],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[3].balance).toBeCloseTo(1000);
    expect(days[4].bills).toHaveLength(1);
    expect(days[4].bills[0].name).toBe('Insurance');
    expect(days[4].balance).toBeCloseTo(400);
  });

  it('never charges a dated bill twice — once as a lump and again as a drip', () => {
    // The bug this guards: an entry counted in both the daily spread and on
    // its due date would silently double-charge exactly the bills someone
    // took the trouble to schedule.
    const bill: MoneyEntry = {
      id: 'b',
      name: 'Rates',
      amount: 700,
      frequency: 'quarterly',
      nextDue: '2026-01-03',
    };
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 700,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [bill],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    // The single occurrence in range takes exactly its own amount, no more.
    expect(days[20].balance).toBeCloseTo(0);
  });

  it('repeats a dated bill on its own cycle', () => {
    const bill: MoneyEntry = {
      id: 'b',
      name: 'Rates',
      amount: 100,
      frequency: 'fortnightly',
      nextDue: '2026-01-02',
    };
    const days = buildCashflowDays({
      from,
      through: day(30),
      startingBalance: 1000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [bill],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    const billDays = days.filter((d) => d.bills.length > 0).map((d) => d.key);
    expect(billDays).toEqual(['2026-01-02', '2026-01-16', '2026-01-30']);
  });

  it('stops a dated bill after its end date', () => {
    const bill: MoneyEntry = {
      id: 'b',
      name: 'Fees',
      amount: 100,
      frequency: 'fortnightly',
      nextDue: '2026-01-02',
      endDate: '2026-01-20',
    };
    const days = buildCashflowDays({
      from,
      through: day(30),
      startingBalance: 1000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [bill],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    expect(days.filter((d) => d.bills.length > 0).map((d) => d.key)).toEqual([
      '2026-01-02',
      '2026-01-16',
    ]);
  });

  it('ignores an expense that already ended', () => {
    const gone: MoneyEntry = {
      id: 'g',
      name: 'Old',
      amount: 700,
      frequency: 'weekly',
      endDate: '2025-12-31',
    };
    const days = buildCashflowDays({
      from,
      through: day(6),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [gone],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[6].balance).toBeCloseTo(100);
  });
});

describe('buildCashflowDays — debt and shortfalls', () => {
  it('takes debt payments from the snowball schedule and stops when it does', () => {
    // $70 paid over the first week, nothing after — the payoff finishing
    // mid-window must stop draining the balance.
    const cumulative = (weeks: number) => Math.min(Math.max(weeks, 0), 1) * 70;
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 500,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [],
      cumulativeDebtSpend: cumulative,
    });
    // Day 6 is only six-sevenths of a week in, so $60 of the $70 has gone.
    expect(days[6].balance).toBeCloseTo(440);
    expect(days[7].balance).toBeCloseTo(430);
    expect(days[20].balance).toBeCloseTo(430);
  });

  it('flags the days a balance goes negative', () => {
    const bill: MoneyEntry = {
      id: 'b',
      name: 'Big one',
      amount: 900,
      frequency: 'annual',
      nextDue: '2026-01-03',
    };
    const days = buildCashflowDays({
      from,
      through: day(10),
      startingBalance: 500,
      income: income({ amount: 800, frequency: 'weekly' }),
      nextPayday: day(6),
      expenses: [bill],
      oneOffs: [],
      cumulativeDebtSpend: noDebt,
    });
    // Short from the bill landing on the 3rd until payday on the 7th.
    expect(days[2].short).toBe(true);
    expect(days[5].short).toBe(true);
    expect(days[6].short).toBe(false);
  });

  it('returns nothing when the window is inverted', () => {
    expect(
      buildCashflowDays({
        from: day(10),
        through: from,
        startingBalance: 0,
        income: income(),
        nextPayday: null,
        expenses: [],
        oneOffs: [],
      cumulativeDebtSpend: noDebt,
      }),
    ).toEqual([]);
  });
});

describe('buildCashflowDays — one-off payments', () => {
  const oneOff = (over: Partial<OneOff> = {}): OneOff => ({
    id: 'o1',
    name: 'Headphones',
    amount: 300,
    date: '2026-01-15',
    direction: 'out',
    ...over,
  });

  it('charges a one-off on its date and never again', () => {
    const days = buildCashflowDays({
      from,
      through: day(40),
      startingBalance: 1000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [oneOff()],
      cumulativeDebtSpend: noDebt,
    });
    // 15 Jan is offset 14.
    expect(days[13].balance).toBe(1000);
    expect(days[14].bills).toEqual([
      { id: 'o1', name: 'Headphones', amount: 300, oneOff: true },
    ]);
    expect(days[14].credits).toEqual([]);
    expect(days[14].balance).toBe(700);
    // The whole point of "one-off": a month later it has not come round again.
    expect(days[40].balance).toBe(700);
    expect(days.filter((d) => d.bills.length > 0)).toHaveLength(1);
  });

  it('ignores a one-off already in the past', () => {
    const days = buildCashflowDays({
      from,
      through: day(10),
      startingBalance: 1000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      // Money already spent is inside the starting balance; charging it again
      // would take it twice.
      oneOffs: [oneOff({ date: '2025-12-20' })],
      cumulativeDebtSpend: noDebt,
    });
    expect(days.every((d) => d.bills.length === 0)).toBe(true);
    expect(days[10].balance).toBe(1000);
  });

  it('flags the day a one-off pushes the balance negative', () => {
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [oneOff()],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[13].short).toBe(false);
    expect(days[14].short).toBe(true);
    expect(days[14].balance).toBe(-200);
  });

  it('keeps one-offs alongside a recurring bill on the same day', () => {
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 2000,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [
        { id: 'r', name: 'Rent', amount: 500, frequency: 'monthly', nextDue: '2026-01-15' },
      ],
      oneOffs: [oneOff()],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[14].bills.map((b) => b.name).sort()).toEqual(['Headphones', 'Rent']);
    expect(days[14].balance).toBe(1200);
  });
});

describe('buildCashflowDays — one-off money in', () => {
  const refund = (over: Partial<OneOff> = {}): OneOff => ({
    id: 'i1',
    name: 'Tax refund',
    amount: 1200,
    date: '2026-01-15',
    direction: 'in',
    ...over,
  });

  it('adds a windfall on its date without calling it a payday', () => {
    const days = buildCashflowDays({
      from,
      through: day(40),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [refund()],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[13].balance).toBe(100);
    expect(days[14].credits).toEqual([{ id: 'i1', name: 'Tax refund', amount: 1200 }]);
    expect(days[14].balance).toBe(1300);
    // A single windfall is not a recurring pay, and must never be counted as
    // one — otherwise the "paydays this month" figure quietly inflates.
    expect(days[14].isPayday).toBe(false);
    expect(days[14].incoming).toBe(0);
    // And it happens once.
    expect(days[40].balance).toBe(1300);
  });

  it('nets an in and an out landing on the same day', () => {
    const days = buildCashflowDays({
      from,
      through: day(20),
      startingBalance: 0,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [refund(), { id: 'o1', name: 'Headphones', amount: 300, date: '2026-01-15', direction: 'out' }],
      cumulativeDebtSpend: noDebt,
    });
    expect(days[14].credits).toHaveLength(1);
    expect(days[14].bills).toHaveLength(1);
    expect(days[14].balance).toBe(900);
  });

  it('ignores a windfall already in the past', () => {
    const days = buildCashflowDays({
      from,
      through: day(10),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      oneOffs: [refund({ date: '2025-12-20' })],
      cumulativeDebtSpend: noDebt,
    });
    expect(days.every((d) => d.credits.length === 0)).toBe(true);
    expect(days[10].balance).toBe(100);
  });

  it('lets a windfall rescue a day that would otherwise go short', () => {
    const base = {
      from,
      through: day(20),
      startingBalance: 100,
      income: income({ amount: 0 }),
      nextPayday: null,
      expenses: [],
      cumulativeDebtSpend: noDebt,
    };
    const bill: OneOff = { id: 'o1', name: 'Headphones', amount: 300, date: '2026-01-15', direction: 'out' };
    expect(buildCashflowDays({ ...base, oneOffs: [bill] })[14].short).toBe(true);
    expect(buildCashflowDays({ ...base, oneOffs: [bill, refund()] })[14].short).toBe(false);
  });
});
