import { describe, expect, it } from 'vitest';
import { readBudget } from './useBudget';

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
