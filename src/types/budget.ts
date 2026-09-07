export type Frequency = 'weekly' | 'monthly';

export interface MoneyEntry {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
}

export type ExpenseCategory = MoneyEntry;

/** A single figure — most people have one paycheck, so it needs no id or name. */
export interface Income {
  amount: number;
  frequency: Frequency;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  /** Lower funds first, starting at 1. Goals sharing a number split the leftover. */
  priority: number;
}

/**
 * Two numbers, deliberately. Interest isn't modelled: a real minimum payment
 * already covers the interest by construction, so treating the balance as a
 * fixed amount to pay down keeps the projection honest without asking anyone
 * to hunt down an APR they probably can't find.
 */
export interface Debt {
  id: string;
  name: string;
  balance: number;
  /** Can be 0 — typical for an informal loan with no agreed schedule. */
  minimumPayment: number;
}

export interface Budget {
  income: Income;
  expenses: ExpenseCategory[];
  goals: Goal[];
  debts: Debt[];
  /**
   * Cash on hand right now, never negative — debt is the `debts` list, not a
   * negative balance. Funds debts first when any exist, goals otherwise.
   */
  currentBalance: number;
}

/**
 * A budget plus the identity the app needs to keep several side by side —
 * separate households, a "what if" copy, a partner's plan.
 */
export interface NamedBudget {
  id: string;
  name: string;
  budget: Budget;
}

export const createEmptyBudget = (): Budget => ({
  income: { amount: 0, frequency: 'weekly' },
  expenses: [],
  goals: [],
  debts: [],
  currentBalance: 0,
});
