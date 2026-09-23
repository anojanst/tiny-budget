export type Frequency =
  | 'weekly'
  | 'fortnightly'
  | 'monthly'
  | 'quarterly'
  | 'biannual'
  | 'annual';

/**
 * A recurring amount on a cycle — money in or money out.
 *
 * Income and expenses share this shape deliberately. A paycheck and a rent
 * payment are the same four facts (what it's called, how much, how often, when
 * next), differing only in which way the money goes, and the direction is
 * carried by which list it sits in. Sharing the type means the calendar's
 * recurrence logic is written once and both sides get dates, end dates and
 * roll-forward for free.
 */
export interface MoneyEntry {
  id: string;
  name: string;
  amount: number;
  frequency: Frequency;
  /**
   * Optional: when the next instance falls due — payday for income, the due
   * date for a bill. Without it the calendar can't place the money on a day,
   * so it spreads the amount evenly instead. Rolls forward on its own, so a
   * stale date never has to be maintained by hand.
   */
  nextDue?: string;
  /**
   * Optional: the last date this runs. Past it the entry stops counting — a
   * contract ending, a loan's final payment, a job finishing.
   */
  endDate?: string;
}

export type ExpenseCategory = MoneyEntry;

/**
 * A pay stream. Structurally an expense that arrives instead of leaving —
 * see `MoneyEntry`. There can be several: two jobs, a partner's wage, a
 * rental, each on its own cycle and its own payday.
 */
export type IncomeStream = MoneyEntry;

/**
 * A single dated movement of money — a headphone bought this month, a tax
 * refund landing next week.
 *
 * The difference from a `MoneyEntry` is that it happens once. A recurring
 * amount shifts what's spare from now until forever; a one-off moves cash on
 * one day and is then over, so it must not touch any weekly figure — a bonus
 * that arrives once shouldn't read as a permanent pay rise any more than a
 * one-time purchase should read as a permanent bill.
 */
export interface OneOff {
  id: string;
  name: string;
  /** Always positive; `direction` carries the sign. */
  amount: number;
  /** When the money moves, as a `yyyy-mm-dd` local date. */
  date: string;
  /** `out` for a payment, `in` for money arriving — a refund, a bonus, a sale. */
  direction: OneOffDirection;
}

export type OneOffDirection = 'in' | 'out';

export interface Budget {
  /** Every pay stream. Empty is valid — a budget can be all outgoings. */
  incomes: IncomeStream[];
  expenses: ExpenseCategory[];
  /** Planned one-off payments and windfalls. Dated events, not rates. */
  oneOffs: OneOff[];
  /** Cash on hand right now, never negative. Where the projection starts. */
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
  incomes: [],
  expenses: [],
  oneOffs: [],
  currentBalance: 0,
});
