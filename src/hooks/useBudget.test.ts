import { describe, expect, it } from 'vitest';
import { readBudget, readStore } from './useBudget';

/**
 * The migration chain is the one place in this app where a mistake destroys
 * data someone typed in. Every historical envelope shape gets a test.
 */
describe('readBudget — legacy envelopes', () => {
  it('reads a v7 budget through untouched', () => {
    const budget = {
      income: { amount: 2900, frequency: 'weekly' },
      expenses: [{ id: 'e1', name: 'Rent', amount: 525, frequency: 'weekly' }],
      goals: [{ id: 'g1', name: 'Fund', targetAmount: 5000, currentSaved: 400, priority: 1 }],
      debts: [{ id: 'd1', name: 'Visa', balance: 3000, minimumPayment: 25 }],
      currentBalance: 800,
    };
    expect(readBudget({ version: 7, budget })).toEqual(budget);
  });

  it('drops the goal-split dial from a v6 budget but keeps everything else', () => {
    const result = readBudget({
      version: 6,
      budget: {
        income: { amount: 3000, frequency: 'monthly' },
        expenses: [{ id: 'e1', name: 'Rent', amount: 900, frequency: 'monthly' }],
        goals: [{ id: 'g1', name: 'Fund', targetAmount: 5000, currentSaved: 400, priority: 1 }],
        debts: [{ id: 'd1', name: 'Visa', balance: 3000, minimumPayment: 25 }],
        currentBalance: 800,
        weeklyGoalContribution: 50,
      },
    });
    expect(result).not.toHaveProperty('weeklyGoalContribution');
    expect(result.debts).toHaveLength(1);
    expect(result.currentBalance).toBe(800);
  });

  it('strips APR and lender type from v5 debts', () => {
    const result = readBudget({
      version: 5,
      budget: {
        income: { amount: 3000, frequency: 'monthly' },
        expenses: [],
        goals: [],
        debts: [
          { id: 'd1', name: 'Visa', balance: 3000, minimumPayment: 25, apr: 0.199, lenderType: 'institutional' },
        ],
        currentBalance: 800,
        weeklyGoalContribution: 50,
      },
    });
    expect(result.debts[0]).toEqual({ id: 'd1', name: 'Visa', balance: 3000, minimumPayment: 25 });
  });

  it('clamps the negative balance v4 used to mean "in debt"', () => {
    const result = readBudget({
      version: 4,
      budget: {
        income: { amount: 4000, frequency: 'monthly' },
        expenses: [{ id: 'e1', name: 'Rent', amount: 1500, frequency: 'monthly' }],
        goals: [{ id: 'g1', name: 'Emergency', targetAmount: 5000, currentSaved: 1200, priority: 1 }],
        currentBalance: -250,
      },
    });
    expect(result.currentBalance).toBe(0);
    expect(result.expenses).toHaveLength(1);
    expect(result.debts).toEqual([]);
  });

  it('gives v2 and v3 goals a default priority', () => {
    for (const version of [2, 3]) {
      const result = readBudget({
        version,
        budget: {
          income: { amount: 500, frequency: 'weekly' },
          expenses: [],
          goals: [{ id: 'g1', name: 'Car', targetAmount: 9000, currentSaved: 900 }],
        },
      });
      expect(result.goals[0].priority).toBe(1);
    }
  });

  it('collapses the v1 income list into a single weekly figure', () => {
    const result = readBudget({
      version: 1,
      budget: {
        income: [
          { id: 'i1', name: 'Job', amount: 1000, frequency: 'weekly' },
          { id: 'i2', name: 'Side', amount: 200, frequency: 'weekly' },
        ],
        expenses: [{ id: 'e1', name: 'Food', amount: 100, frequency: 'weekly' }],
        goals: [{ id: 'g1', name: 'Car', targetAmount: 9000, currentSaved: 900 }],
      },
    });
    expect(result.income).toEqual({ amount: 1200, frequency: 'weekly' });
    expect(result.expenses).toHaveLength(1);
  });

  it('falls back to an empty budget for junk rather than throwing', () => {
    for (const junk of [null, undefined, 42, 'nope', {}, { version: 3 }]) {
      const result = readBudget(junk);
      expect(result.expenses).toEqual([]);
      expect(result.debts).toEqual([]);
      expect(result.income.amount).toBe(0);
    }
  });
});

/**
 * v8 introduced the budget *list*. A version bump that doesn't teach
 * `readStore` about the older list shape sends it down the single-budget path,
 * which finds no `.budget` and hands back an empty one — silently deleting
 * every budget the user has. That is the failure these tests exist to catch.
 */
describe('readStore — the multi-budget envelope', () => {
  const v8Budget = {
    income: { amount: 1000, frequency: 'weekly' },
    expenses: [{ id: 'e1', name: 'Rent', amount: 400, frequency: 'weekly' }],
    goals: [{ id: 'g1', name: 'Buffer', targetAmount: 2000, currentSaved: 100, priority: 1 }],
    debts: [{ id: 'd1', name: 'Visa', balance: 900, minimumPayment: 40 }],
    currentBalance: 250,
  };

  it('keeps every v8 budget and backfills one-offs', () => {
    const store = readStore({
      version: 8,
      activeId: 'b2',
      budgets: [
        { id: 'b1', name: 'Household', budget: v8Budget },
        { id: 'b2', name: 'Flat', budget: { ...v8Budget, currentBalance: 10 } },
      ],
    });
    expect(store.budgets).toHaveLength(2);
    expect(store.activeId).toBe('b2');
    expect(store.budgets[0].name).toBe('Household');
    expect(store.budgets[0].budget.expenses).toHaveLength(1);
    expect(store.budgets[0].budget.goals[0].name).toBe('Buffer');
    expect(store.budgets[0].budget.debts[0].balance).toBe(900);
    expect(store.budgets[0].budget.currentBalance).toBe(250);
    // The field added in v9 exists rather than being undefined, so nothing
    // downstream reads `.length` off nothing.
    expect(store.budgets[0].budget.oneOffs).toEqual([]);
    expect(store.budgets[1].budget.oneOffs).toEqual([]);
  });

  it('preserves one-offs already stored at v9', () => {
    const oneOffs = [{ id: 'o1', name: 'Headphones', amount: 300, date: '2026-09-30' }];
    const store = readStore({
      version: 9,
      activeId: 'b1',
      budgets: [{ id: 'b1', name: 'Household', budget: { ...v8Budget, oneOffs } }],
    });
    expect(store.budgets[0].budget.oneOffs).toEqual(oneOffs);
  });

  it('still lifts a single legacy budget into the list', () => {
    const store = readStore({ version: 7, budget: v8Budget });
    expect(store.budgets).toHaveLength(1);
    expect(store.budgets[0].budget.currentBalance).toBe(250);
    expect(store.budgets[0].budget.oneOffs).toEqual([]);
  });

  it('repairs an activeId pointing at a budget that is gone', () => {
    const store = readStore({
      version: 8,
      activeId: 'missing',
      budgets: [{ id: 'b1', name: 'Household', budget: v8Budget }],
    });
    expect(store.activeId).toBe('b1');
  });
});
