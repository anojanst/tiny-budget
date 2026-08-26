import { describe, expect, it } from 'vitest';
import {
  activeDebtId,
  buildDebtPayoffSeries,
  diversionImpact,
  simulateSnowball,
  snowballOrder,
} from './debtMath';
import type { Debt } from '@/types/budget';

const debt = (over: Partial<Debt> & { id: string; balance: number }): Debt => ({
  name: over.id,
  minimumPayment: 0,
  apr: 0,
  lenderType: 'institutional',
  ...over,
});

describe('snowballOrder', () => {
  it('orders by starting balance ascending, smallest first', () => {
    const debts = [debt({ id: 'big', balance: 5000 }), debt({ id: 'small', balance: 300 })];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['small', 'big']);
  });

  it('ignores APR — a high-rate debt does not jump the queue', () => {
    const debts = [
      debt({ id: 'cheap', balance: 100, apr: 0 }),
      debt({ id: 'expensive', balance: 900, apr: 0.29 }),
    ];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['cheap', 'expensive']);
  });

  it('breaks ties by input order rather than splitting between them', () => {
    const debts = [debt({ id: 'first', balance: 500 }), debt({ id: 'second', balance: 500 })];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['first', 'second']);
  });
});

describe('simulateSnowball — interest-free', () => {
  it('pays a single debt off at the expected week', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 100 })];
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('a')!.payoffWeek).toBe(10);
    expect(result.debtFreeWeek).toBe(10);
    expect(result.totalInterest).toBeCloseTo(0);
  });

  it('attacks only the smallest debt while paying minimums on the rest', () => {
    const debts = [
      debt({ id: 'small', balance: 200, minimumPayment: 10 }),
      debt({ id: 'big', balance: 2000, minimumPayment: 20 }),
    ];
    // Budget is 10 + 20 + 70 extra = 100/wk. Small takes its own 10 plus the
    // 70 attack = 80/wk, so it clears in ceil(200/80) = 3 weeks.
    const result = simulateSnowball(debts, 70);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(3);
    // Big took its 20/wk minimum for 3 weeks, plus the 40 left over in week 3
    // once small was cleared mid-cascade.
    expect(result.balanceHistory.get('big')![3]).toBeCloseTo(2000 - 60 - 40);
  });

  it("rolls a cleared debt's minimum into the next debt", () => {
    const debts = [
      debt({ id: 'small', balance: 100, minimumPayment: 50 }),
      debt({ id: 'big', balance: 900, minimumPayment: 50 }),
    ];
    // 100/wk total, no extra. Small clears at week 2. From then the whole
    // 100/wk hits big, which by then owes 900 - 100 = 800 -> 8 more weeks.
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(2);
    expect(result.outcomeById.get('big')!.payoffWeek).toBe(10);
    expect(result.debtFreeWeek).toBe(10);
  });

  it('reconciles: total paid equals principal plus interest', () => {
    const debts = [
      debt({ id: 'a', balance: 1200, minimumPayment: 25, apr: 0.18 }),
      debt({ id: 'b', balance: 4000, minimumPayment: 60, apr: 0.099 }),
    ];
    const result = simulateSnowball(debts, 150);
    expect(result.totalPaid).toBeCloseTo(1200 + 4000 + result.totalInterest, 6);
  });
});

describe('simulateSnowball — interest', () => {
  it('accrues interest so payoff takes longer than the interest-free case', () => {
    const free = simulateSnowball([debt({ id: 'a', balance: 1000, minimumPayment: 100 })], 0);
    const charged = simulateSnowball(
      [debt({ id: 'a', balance: 1000, minimumPayment: 100, apr: 0.24 })],
      0,
    );
    expect(charged.outcomeById.get('a')!.payoffWeek!).toBeGreaterThan(
      free.outcomeById.get('a')!.payoffWeek!,
    );
    expect(charged.totalInterest).toBeGreaterThan(0);
  });

  it('charges no interest on a 0% family loan', () => {
    const debts = [debt({ id: 'mum', balance: 800, minimumPayment: 40, lenderType: 'personal' })];
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('mum')!.interestPaid).toBeCloseTo(0);
    expect(result.outcomeById.get('mum')!.payoffWeek).toBe(20);
  });

  it('marks a debt unreachable when its minimum cannot cover its own interest', () => {
    // 1% weekly interest on 10000 is 100/wk; a 5/wk minimum never catches it.
    const debts = [debt({ id: 'trap', balance: 10000, minimumPayment: 5, apr: 0.52 })];
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('trap')!.status).toBe('unreachable');
    expect(result.outcomeById.get('trap')!.payoffWeek).toBeNull();
    expect(result.debtFreeWeek).toBeNull();
  });

  it('a queued debt with no minimum still grows while it waits its turn', () => {
    const debts = [
      debt({ id: 'target', balance: 500, minimumPayment: 50 }),
      debt({ id: 'waiting', balance: 1000, minimumPayment: 0, apr: 0.26 }),
    ];
    const result = simulateSnowball(debts, 0);
    // By the time the first debt closes, the untouched one owes more than it started with.
    const payoff = result.outcomeById.get('target')!.payoffWeek!;
    expect(result.balanceHistory.get('waiting')![payoff]).toBeGreaterThan(1000);
    expect(result.outcomeById.get('waiting')!.payoffWeek).toBeGreaterThan(payoff);
  });
});

describe('simulateSnowball — current balance lump sum', () => {
  it('clears a debt instantly at week 0 when the balance covers it', () => {
    const debts = [debt({ id: 'a', balance: 500, minimumPayment: 25 })];
    const result = simulateSnowball(debts, 0, 500);
    expect(result.outcomeById.get('a')!.payoffWeek).toBe(0);
    expect(result.debtFreeWeek).toBe(0);
    expect(result.totalInterest).toBeCloseTo(0);
  });

  it('cascades the lump sum in payoff order rather than splitting it', () => {
    const debts = [
      debt({ id: 'small', balance: 300, minimumPayment: 10 }),
      debt({ id: 'big', balance: 900, minimumPayment: 10 }),
    ];
    const result = simulateSnowball(debts, 0, 500);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(0);
    // The remaining 200 went to big, not split evenly across both.
    expect(result.balanceHistory.get('big')![0]).toBeCloseTo(700);
  });

  it('spills the remainder to goals when the balance exceeds every debt', () => {
    const debts = [debt({ id: 'a', balance: 400, minimumPayment: 20 })];
    const result = simulateSnowball(debts, 0, 1000);
    expect(result.lumpSumRemainder).toBeCloseTo(600);
    expect(result.debtFreeWeek).toBe(0);
  });

  it('leaves nothing over while any debt remains', () => {
    const debts = [debt({ id: 'a', balance: 5000, minimumPayment: 50 })];
    expect(simulateSnowball(debts, 0, 1000).lumpSumRemainder).toBeCloseTo(0);
  });
});

describe('simulateSnowball — overflow and empty cases', () => {
  it('spills a windfall week past the target onto the next debt', () => {
    const debts = [
      debt({ id: 'small', balance: 100, minimumPayment: 0 }),
      debt({ id: 'next', balance: 1000, minimumPayment: 0 }),
    ];
    // 500/wk against a 100 debt: it clears and 400 lands on the next one, same week.
    const result = simulateSnowball(debts, 500);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(1);
    expect(result.balanceHistory.get('next')![1]).toBeCloseTo(600);
  });

  it('reports debt-free immediately when there are no debts', () => {
    const result = simulateSnowball([], 100, 500);
    expect(result.debtFreeWeek).toBe(0);
    expect(result.totalPaid).toBeCloseTo(0);
    expect(result.lumpSumRemainder).toBeCloseTo(500);
  });

  it('never progresses without a budget, but does not crash', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 0 })];
    const result = simulateSnowball(debts, 0, 0);
    expect(result.outcomeById.get('a')!.status).toBe('unreachable');
  });

  it('treats an already-cleared debt as paid at week 0', () => {
    const debts = [debt({ id: 'done', balance: 0, minimumPayment: 10 })];
    const result = simulateSnowball(debts, 50);
    expect(result.outcomeById.get('done')!.status).toBe('paid');
    expect(result.outcomeById.get('done')!.payoffWeek).toBe(0);
  });
});

describe('activeDebtId', () => {
  it('points at the smallest debt still carrying a balance', () => {
    const debts = [
      debt({ id: 'big', balance: 2000, minimumPayment: 20 }),
      debt({ id: 'small', balance: 200, minimumPayment: 10 }),
    ];
    expect(activeDebtId(debts)).toBe('small');
  });

  it('skips a debt already cleared to zero', () => {
    const debts = [
      debt({ id: 'cleared', balance: 0, minimumPayment: 10 }),
      debt({ id: 'next', balance: 900, minimumPayment: 20 }),
    ];
    expect(activeDebtId(debts)).toBe('next');
  });

  it('is null when nothing is owed', () => {
    expect(activeDebtId([debt({ id: 'a', balance: 0 })])).toBeNull();
  });
});

describe('buildDebtPayoffSeries', () => {
  it('produces a band per debt that drains to zero', () => {
    const debts = [
      debt({ id: 'a', balance: 500, minimumPayment: 50 }),
      debt({ id: 'b', balance: 500, minimumPayment: 50 }),
    ];
    const { points, series } = buildDebtPayoffSeries(debts, 0);
    expect(series.map((s) => s.id)).toEqual(['a', 'b']);
    expect(points[0].a).toBeCloseTo(500);
    const last = points[points.length - 1];
    expect(last.a).toBeCloseTo(0);
    expect(last.b).toBeCloseTo(0);
  });

  it('folds the tail into a single Other band past six debts', () => {
    const debts = Array.from({ length: 8 }, (_, i) =>
      debt({ id: `d${i}`, balance: (i + 1) * 100, minimumPayment: 10 }),
    );
    const { series } = buildDebtPayoffSeries(debts, 100);
    expect(series).toHaveLength(6);
    expect(series[5].id).toBe('__other__');
  });

  it('returns nothing when there are no debts', () => {
    expect(buildDebtPayoffSeries([], 100).points).toEqual([]);
  });
});

describe('diversionImpact', () => {
  it('quantifies the delay and extra interest from funding goals', () => {
    const debts = [debt({ id: 'a', balance: 2000, minimumPayment: 25, apr: 0.18 })];
    const impact = diversionImpact(debts, 200, 100);
    expect(impact.weeksDelayed!).toBeGreaterThan(0);
    expect(impact.extraInterest).toBeGreaterThan(0);
    expect(impact.debtFreeWeekWith!).toBeGreaterThan(impact.debtFreeWeekWithout!);
  });

  it('costs nothing when nothing is diverted', () => {
    const debts = [debt({ id: 'a', balance: 2000, minimumPayment: 25, apr: 0.18 })];
    const impact = diversionImpact(debts, 200, 0);
    expect(impact.weeksDelayed).toBe(0);
    expect(impact.extraInterest).toBeCloseTo(0);
  });
});
