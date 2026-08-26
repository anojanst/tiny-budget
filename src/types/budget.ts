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
 * Institutional lenders charge interest and hold you to a minimum; money from
 * friends and family usually does neither, so both fields tolerate zero.
 */
export type LenderType = 'institutional' | 'personal';

export interface Debt {
  id: string;
  name: string;
  balance: number;
  /** Can be 0 — typical for an informal loan with no agreed schedule. */
  minimumPayment: number;
  /** Annual rate as a decimal (0.199 = 19.9%). 0 for interest-free. */
  apr: number;
  lenderType: LenderType;
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
  /**
   * Weekly dollars diverted from debt payoff to savings goals. Defaults to 0:
   * while you owe money, the snowball gets everything by default. Clamped to
   * what's actually available at the point of use, never on write.
   */
  weeklyGoalContribution: number;
}

export const createEmptyBudget = (): Budget => ({
  income: { amount: 0, frequency: 'weekly' },
  expenses: [],
  goals: [],
  debts: [],
  currentBalance: 0,
  weeklyGoalContribution: 0,
});
