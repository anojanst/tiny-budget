import { describe, expect, it } from 'vitest';
import {
  activeDebtId,
  buildDebtPayoffSeries,
  debtSpendAtWeek,
  simulateSnowball,
  snowballOrder,
} from './debtMath';
import type { Debt } from '@/types/budget';

const debt = (over: Partial<Debt> & { id: string; balance: number }): Debt => ({
  name: over.id,
  minimumPayment: 0,
  ...over,
});

describe('snowballOrder', () => {
  it('orders by starting balance ascending, smallest first', () => {
    const debts = [debt({ id: 'big', balance: 5000 }), debt({ id: 'small', balance: 300 })];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['small', 'big']);
  });

  it('ignores the size of the minimum payment — only the balance decides', () => {
    const debts = [
      debt({ id: 'small-balance', balance: 100, minimumPayment: 5 }),
      debt({ id: 'big-payment', balance: 900, minimumPayment: 400 }),
    ];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['small-balance', 'big-payment']);
  });

  it('breaks ties by input order rather than splitting between them', () => {
    const debts = [debt({ id: 'first', balance: 500 }), debt({ id: 'second', balance: 500 })];
    expect(snowballOrder(debts).map((d) => d.id)).toEqual(['first', 'second']);
  });
});

describe('simulateSnowball', () => {
  it('pays a single debt off at the expected week', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 100 })];
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('a')!.payoffWeek).toBe(10);
    expect(result.debtFreeWeek).toBe(10);
  });

  it('attacks only the smallest debt while paying minimums on the rest', () => {
    const debts = [
      debt({ id: 'small', balance: 200, minimumPayment: 10 }),
      debt({ id: 'big', balance: 2000, minimumPayment: 20 }),
    ];
    // Budget is 10 + 20 + 70 extra = 100/wk. Small takes its own 10 plus the
    // 70 attack = 80/wk, so it clears in 3 weeks.
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
    // 100/wk hits big, which by then owes 800 -> 8 more weeks.
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(2);
    expect(result.outcomeById.get('big')!.payoffWeek).toBe(10);
    expect(result.debtFreeWeek).toBe(10);
  });

  it('total paid is exactly what was owed — nothing is added on top', () => {
    const debts = [
      debt({ id: 'a', balance: 1200, minimumPayment: 25 }),
      debt({ id: 'b', balance: 4000, minimumPayment: 60 }),
    ];
    expect(simulateSnowball(debts, 150).totalPaid).toBeCloseTo(5200);
  });

  it('leaves a queued debt untouched until its turn comes', () => {
    const debts = [
      debt({ id: 'target', balance: 500, minimumPayment: 50 }),
      debt({ id: 'waiting', balance: 1000, minimumPayment: 0 }),
    ];
    const result = simulateSnowball(debts, 0);
    const payoff = result.outcomeById.get('target')!.payoffWeek!;
    // No minimum and not yet the target, so the balance is exactly as entered.
    expect(result.balanceHistory.get('waiting')![payoff]).toBeCloseTo(1000);
    expect(result.outcomeById.get('waiting')!.payoffWeek).toBeGreaterThan(payoff);
  });

  it('handles a debt with no minimum payment at all', () => {
    const debts = [debt({ id: 'family', balance: 800, minimumPayment: 0 })];
    // Nothing contractual, but the whole 40/wk extra still goes at it.
    const result = simulateSnowball(debts, 40);
    expect(result.outcomeById.get('family')!.payoffWeek).toBe(20);
  });
});

describe('simulateSnowball — settled debts left in the list', () => {
  it('ignores the minimum on a debt that is already cleared', () => {
    const debts = [
      debt({ id: 'settled', balance: 0, minimumPayment: 60 }),
      debt({ id: 'live', balance: 400, minimumPayment: 20 }),
    ];
    // The user affords 50/wk: 20 of live minimums plus 30 spare. The settled
    // row's stale 60 must not be spent — budgeting it would pay 80/wk out of
    // a 50/wk budget and report a payoff date two months too early.
    const result = simulateSnowball(debts, 30);
    expect(result.outcomeById.get('live')!.payoffWeek).toBe(8);
  });

  it('still frees a minimum when the lump sum clears that debt today', () => {
    const debts = [
      debt({ id: 'small', balance: 100, minimumPayment: 40 }),
      debt({ id: 'big', balance: 300, minimumPayment: 10 }),
    ];
    // 100 cash wipes `small` at week 0. Its 40/wk was genuinely being paid
    // until now, so it rolls into the attack: 50/wk against 300 -> 6 weeks.
    const result = simulateSnowball(debts, 0, 100);
    expect(result.outcomeById.get('small')!.payoffWeek).toBe(0);
    expect(result.outcomeById.get('big')!.payoffWeek).toBe(6);
  });

  it('reports debt-free when every listed debt is settled', () => {
    const debts = [
      debt({ id: 'a', balance: 0, minimumPayment: 25 }),
      debt({ id: 'b', balance: 0, minimumPayment: 40 }),
    ];
    const result = simulateSnowball(debts, 100);
    expect(result.debtFreeWeek).toBe(0);
    expect(result.totalPaid).toBeCloseTo(0);
  });
});

describe('simulateSnowball — current balance lump sum', () => {
  it('clears a debt instantly at week 0 when the balance covers it', () => {
    const debts = [debt({ id: 'a', balance: 500, minimumPayment: 25 })];
    const result = simulateSnowball(debts, 0, 500);
    expect(result.outcomeById.get('a')!.payoffWeek).toBe(0);
    expect(result.debtFreeWeek).toBe(0);
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
      debt({ id: 'small', balance: 100 }),
      debt({ id: 'next', balance: 1000 }),
    ];
    // 500/wk against a 100 debt: it clears and 400 lands on the next one.
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

  it('is unreachable only when no money reaches the debt at all', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 0 })];
    const result = simulateSnowball(debts, 0, 0);
    expect(result.outcomeById.get('a')!.status).toBe('unreachable');
    expect(result.outcomeById.get('a')!.payoffWeek).toBeNull();
    expect(result.debtFreeWeek).toBeNull();
  });

  it('always terminates for any positive payment, however small', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 1 })];
    const result = simulateSnowball(debts, 0);
    expect(result.outcomeById.get('a')!.status).toBe('paid');
    expect(result.outcomeById.get('a')!.payoffWeek).toBe(1000);
  });

  it('treats an already-cleared debt as paid at week 0', () => {
    const debts = [debt({ id: 'done', balance: 0, minimumPayment: 10 })];
    const result = simulateSnowball(debts, 50);
    expect(result.outcomeById.get('done')!.status).toBe('paid');
    expect(result.outcomeById.get('done')!.payoffWeek).toBe(0);
  });
});

describe('debtSpendAtWeek', () => {
  it('stops growing once the debts are paid off', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 100 })];
    const result = simulateSnowball(debts, 0);
    // Cleared at week 10; a year out must report the same total, not ten
    // times it — otherwise a projection keeps draining money that is no
    // longer owed to anyone.
    expect(debtSpendAtWeek(result, 10)).toBeCloseTo(1000);
    expect(debtSpendAtWeek(result, 52)).toBeCloseTo(1000);
  });

  it('never counts more than was actually handed over in a final part-week', () => {
    // 300/wk against a 1000 debt: weeks 1-3 pay 900, week 4 pays only 100.
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 300 })];
    const result = simulateSnowball(debts, 0);
    expect(debtSpendAtWeek(result, 4)).toBeCloseTo(1000);
  });

  it('counts the week-0 lump sum immediately', () => {
    const debts = [debt({ id: 'a', balance: 1000, minimumPayment: 50 })];
    const result = simulateSnowball(debts, 0, 400);
    expect(debtSpendAtWeek(result, 0)).toBeCloseTo(400);
  });

  it('reconciles a full projection: inflow minus debt spend leaves the rest free', () => {
    const debts = [debt({ id: 'a', balance: 2000, minimumPayment: 100 })];
    const weeklyLeftover = 500;
    const result = simulateSnowball(debts, weeklyLeftover - 100, 0);
    const weeks = 52;
    const free = weeklyLeftover * weeks - debtSpendAtWeek(result, weeks);
    // Debt clears at week 4; the remaining 48 weeks of leftover are free.
    expect(result.debtFreeWeek).toBe(4);
    expect(free).toBeCloseTo(500 * 52 - 2000);
    expect(free).toBeGreaterThan(0);
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
