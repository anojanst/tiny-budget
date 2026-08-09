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

export interface Budget {
  income: Income;
  expenses: ExpenseCategory[];
  goals: Goal[];
  /**
   * Cash on hand right now. Like the weekly leftover, it funds unmet goals
   * first (by priority, instantly rather than over time) — only free once
   * every goal is met. Can go negative (existing debt).
   */
  currentBalance: number;
}

export const createEmptyBudget = (): Budget => ({
  income: { amount: 0, frequency: 'weekly' },
  expenses: [],
  goals: [],
  currentBalance: 0,
});
