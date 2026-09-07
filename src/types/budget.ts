export type Frequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

export interface MoneyEntry {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  /**
   * Optional: when the next instance falls due. Display only — it rolls
   * forward on its own so a stale date never has to be maintained by hand.
   */
  nextDue?: string;
  /**
   * Optional: the last date this is owed. Past it, the entry stops counting
   * toward weekly expenses — a loan-linked insurance or a fixed-term fee
   * shouldn't inflate the budget forever.
   */
  endDate?: string;
}

export type ExpenseCategory = MoneyEntry;

/** A single figure — most people have one paycheck, so it needs no id or name. */
export interface Income {
  amount: number;
  frequency: Frequency;
  /**
   * Optional anchor for the pay cycle, as a `yyyy-mm-dd` local date. Only the
   * calendar needs it — every weekly figure elsewhere is rate-based and does
   * not care which day the money lands.
   */
  nextPayday?: string;
}

export interface Goal {
  id: string;
  name: string;
  targetAmount: number;
  currentSaved: number;
  /** Lower funds first, starting at 1. Goals sharing a number split the leftover. */
  priority: number;
  /**
   * Optional deadline, as a `yyyy-mm-dd` local date.
   *
   * Deliberately does *not* affect funding order. A dated goal isn't
   * necessarily an important one — a nice-to-have repair can carry a tighter
   * date than an emergency fund — so ordering stays under the user's control
   * and the date is used to check the plan against reality instead.
   */
  targetDate?: string;
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

/**
 * A single dated payment — a headphone this month, a flight in March.
 *
 * Deliberately not an expense and not a goal. An expense is a *rate*: it
 * recurs, so it earns a weekly set-aside and permanently lowers what's spare.
 * A goal is money being *accumulated* toward a target. A one-off is neither —
 * it's a single event that empties some cash on one day and is then over, so
 * it must not inflate the weekly figures for the rest of time.
 */
export interface OneOff {
  id: string;
  name: string;
  amount: number;
  /** When it will be paid, as a `yyyy-mm-dd` local date. */
  date: string;
}

export interface Budget {
  income: Income;
  expenses: ExpenseCategory[];
  goals: Goal[];
  debts: Debt[];
  /** Planned one-off payments. Dated events, not weekly rates — see `OneOff`. */
  oneOffs: OneOff[];
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
  oneOffs: [],
  currentBalance: 0,
});
