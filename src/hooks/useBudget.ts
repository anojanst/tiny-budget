import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '@/lib/id';
import {
  calculateGoalsProgress,
  currentFreeLeftover,
  calculateWeeklyLeftover,
  sumWeekly,
  toWeeklyAmount,
  weeklyIncomeAmount,
  WEEKS_PER_MONTH,
  type GoalProgress,
} from '@/lib/budgetMath';
import { simulateSnowball } from '@/lib/debtMath';
import { createEmptyBudget, type Budget, type Debt, type ExpenseCategory, type Frequency, type Goal, type Income, type MoneyEntry } from '@/types/budget';

const STORAGE_KEY = 'tiny-budget:v1';
const CURRENT_VERSION = 7;

interface StoredBudget {
  version: typeof CURRENT_VERSION;
  budget: Budget;
}

function isValidBudget(value: unknown): value is Budget {
  if (!value || typeof value !== 'object') return false;
  const b = value as Budget;
  const income = b.income as Income | undefined;
  return (
    !!income &&
    typeof income.amount === 'number' &&
    Array.isArray(b.expenses) &&
    Array.isArray(b.goals) &&
    Array.isArray(b.debts) &&
    typeof b.currentBalance === 'number'
  );
}

/** Goals from before priority existed all start equal, at 1. */
function withDefaultPriority(goals: unknown): Goal[] {
  if (!Array.isArray(goals)) return [];
  return (goals as Goal[]).map((goal) => ({
    ...goal,
    priority: typeof goal.priority === 'number' && goal.priority >= 1 ? goal.priority : 1,
  }));
}

/**
 * v1 stored income as a list of named entries. Collapse it into the single
 * weekly figure v2+ uses so an existing budget isn't silently wiped.
 */
function migrateFromV1(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!Array.isArray(b.income) || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) {
    return null;
  }
  const weeklyTotal = (b.income as MoneyEntry[]).reduce(
    (sum, entry) => sum + toWeeklyAmount(entry?.amount ?? 0, entry?.frequency ?? 'weekly'),
    0,
  );
  return {
    income: { amount: weeklyTotal, frequency: 'weekly' },
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    debts: [],
    currentBalance: 0,
  };
}

/**
 * v2 and v3 share a shape: both predate goal priority and debts, and neither
 * stored a balance anyone had actually entered.
 */
function migrateFromV2OrV3(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    debts: [],
    currentBalance: 0,
  };
}

/**
 * v4 predates debts. Everything it stored carries over untouched — except a
 * negative balance, which v4 used to mean "in debt" and v5 expresses as a
 * `debts` entry instead. There's not enough detail in a bare negative number
 * to build a Debt from, so it clamps to 0 and the user re-enters the debt.
 */
function migrateFromV4(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown; currentBalance?: unknown };
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    debts: [],
    currentBalance: Math.max(typeof b.currentBalance === 'number' ? b.currentBalance : 0, 0),
  };
}

/**
 * v5 debts carried an APR and a lender type. Both are gone: a minimum payment
 * already covers its own interest, so the balance is simply paid down. The
 * fields are dropped rather than kept as dead weight in storage.
 */
function migrateFromV5(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Partial<Budget> & { debts?: unknown };
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  const debts = Array.isArray(b.debts)
    ? (b.debts as Debt[]).map(({ id, name, balance, minimumPayment }) => ({
        id,
        name,
        balance: Math.max(balance ?? 0, 0),
        minimumPayment: Math.max(minimumPayment ?? 0, 0),
      }))
    : [];
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    debts,
    currentBalance: Math.max(b.currentBalance ?? 0, 0),
  };
}

/**
 * v6 carried `weeklyGoalContribution`, a dial that split spare money between
 * the snowball and savings. Goals are now strictly post-debt, so there's
 * nothing to split and the field is dropped.
 */
function migrateFromV6(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as Partial<Budget>;
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    debts: Array.isArray(b.debts) ? (b.debts as Debt[]) : [],
    currentBalance: Math.max(b.currentBalance ?? 0, 0),
  };
}

function readBudget(value: unknown): Budget {
  if (!value || typeof value !== 'object') return createEmptyBudget();
  const s = value as { version?: unknown; budget?: unknown };
  if (s.version === CURRENT_VERSION && isValidBudget(s.budget)) return s.budget;
  if (s.version === 6) return migrateFromV6(s.budget) ?? createEmptyBudget();
  if (s.version === 5) return migrateFromV5(s.budget) ?? createEmptyBudget();
  if (s.version === 4) return migrateFromV4(s.budget) ?? createEmptyBudget();
  if (s.version === 3 || s.version === 2) return migrateFromV2OrV3(s.budget) ?? createEmptyBudget();
  if (s.version === 1) return migrateFromV1(s.budget) ?? createEmptyBudget();
  return createEmptyBudget();
}

const initialStoredBudget: StoredBudget = { version: CURRENT_VERSION, budget: createEmptyBudget() };

export function useBudget() {
  const [stored, setStored] = useLocalStorage<StoredBudget>(STORAGE_KEY, initialStoredBudget);

  // Memoized so migration/validation doesn't re-run on every render, and so
  // `budget` keeps a stable identity for the memoized children below it.
  const budget: Budget = useMemo(() => readBudget(stored), [stored]);

  const setBudget = useCallback(
    (updater: (prev: Budget) => Budget) => {
      setStored((prev) => ({ version: CURRENT_VERSION, budget: updater(readBudget(prev)) }));
    },
    [setStored],
  );

  const setIncome = useCallback(
    (patch: Partial<Income>) => {
      setBudget((prev) => ({ ...prev, income: { ...prev.income, ...patch } }));
    },
    [setBudget],
  );

  const setCurrentBalance = useCallback(
    (amount: number) => {
      setBudget((prev) => ({ ...prev, currentBalance: Math.max(amount, 0) }));
    },
    [setBudget],
  );

  const addExpense = useCallback(
    (name: string, amount: number, frequency: Frequency) => {
      setBudget((prev) => ({ ...prev, expenses: [...prev.expenses, { id: generateId(), name, amount, frequency }] }));
    },
    [setBudget],
  );

  const updateExpense = useCallback(
    (id: string, patch: Partial<Omit<ExpenseCategory, 'id'>>) => {
      setBudget((prev) => ({
        ...prev,
        expenses: prev.expenses.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      }));
    },
    [setBudget],
  );

  const removeExpense = useCallback(
    (id: string) => {
      setBudget((prev) => ({ ...prev, expenses: prev.expenses.filter((entry) => entry.id !== id) }));
    },
    [setBudget],
  );

  const addGoal = useCallback(
    (name: string, targetAmount: number, currentSaved: number, priority: number) => {
      setBudget((prev) => ({
        ...prev,
        goals: [...prev.goals, { id: generateId(), name, targetAmount, currentSaved, priority }],
      }));
    },
    [setBudget],
  );

  const updateGoal = useCallback(
    (id: string, patch: Partial<Omit<Goal, 'id'>>) => {
      setBudget((prev) => ({
        ...prev,
        goals: prev.goals.map((goal) => (goal.id === id ? { ...goal, ...patch } : goal)),
      }));
    },
    [setBudget],
  );

  const removeGoal = useCallback(
    (id: string) => {
      setBudget((prev) => ({ ...prev, goals: prev.goals.filter((goal) => goal.id !== id) }));
    },
    [setBudget],
  );

  const addDebt = useCallback(
    (debt: Omit<Debt, 'id'>) => {
      setBudget((prev) => ({ ...prev, debts: [...prev.debts, { ...debt, id: generateId() }] }));
    },
    [setBudget],
  );

  const updateDebt = useCallback(
    (id: string, patch: Partial<Omit<Debt, 'id'>>) => {
      setBudget((prev) => ({
        ...prev,
        debts: prev.debts.map((debt) => (debt.id === id ? { ...debt, ...patch } : debt)),
      }));
    },
    [setBudget],
  );

  const removeDebt = useCallback(
    (id: string) => {
      setBudget((prev) => ({ ...prev, debts: prev.debts.filter((debt) => debt.id !== id) }));
    },
    [setBudget],
  );

  const resetBudget = useCallback(() => {
    setStored({ version: CURRENT_VERSION, budget: createEmptyBudget() });
  }, [setStored]);

  /** The whole budget as a portable, human-readable document. */
  const exportJson = useCallback(
    () =>
      JSON.stringify(
        { app: 'tiny-budget', version: CURRENT_VERSION, exportedAt: new Date().toISOString(), budget },
        null,
        2,
      ),
    [budget],
  );

  /**
   * Replaces everything with the contents of an exported file. Older exports
   * are welcome: the text goes through the same migration chain as stored
   * data, so a file written by any previous version still opens.
   *
   * Returns an error string rather than throwing — a bad paste is a normal
   * thing for someone to do, not an exception.
   */
  const importJson = useCallback(
    (text: string): string | null => {
      let parsed: unknown;
      try {
        parsed = JSON.parse(text);
      } catch {
        return "That file isn't valid JSON.";
      }
      if (!parsed || typeof parsed !== 'object') {
        return "That file doesn't look like a Tiny Budget export.";
      }
      const envelope = parsed as { version?: unknown; budget?: unknown };
      if (typeof envelope.version !== 'number' || !envelope.budget || typeof envelope.budget !== 'object') {
        return "That file doesn't look like a Tiny Budget export.";
      }
      if (envelope.version > CURRENT_VERSION) {
        return 'That file was made by a newer version of Tiny Budget.';
      }
      // readBudget falls back to an empty budget for anything it can't parse,
      // which would silently wipe the current one — so check first.
      const migrated = readBudget(envelope);
      const looksEmpty =
        migrated.expenses.length === 0 &&
        migrated.goals.length === 0 &&
        migrated.debts.length === 0 &&
        migrated.income.amount === 0 &&
        migrated.currentBalance === 0;
      const sourceHadContent = JSON.stringify(envelope.budget).length > 80;
      if (looksEmpty && sourceHadContent) {
        return "That file couldn't be read as a budget.";
      }
      setStored({ version: CURRENT_VERSION, budget: migrated });
      return null;
    },
    [setStored],
  );

  const weeklyIncome = useMemo(() => weeklyIncomeAmount(budget.income), [budget.income]);
  const weeklyExpenses = useMemo(() => sumWeekly(budget.expenses), [budget.expenses]);
  const weeklyLeftover = useMemo(
    () => calculateWeeklyLeftover(budget.income, budget.expenses),
    [budget.income, budget.expenses],
  );

  // "Has debts" means money is still owed, not that rows exist. A list of
  // settled debts is a debt-free budget, and must read as one.
  const hasDebts = budget.debts.some((debt) => debt.balance > 0);

  // Minimums come off the top — they're contractual, not discretionary. A
  // settled debt owes no minimum however its row was left, so counting it
  // would both overstate commitments and fake a shortfall.
  const debtMinimums = useMemo(
    () =>
      budget.debts.reduce(
        (sum, debt) => (debt.balance > 0 ? sum + Math.max(debt.minimumPayment, 0) : sum),
        0,
      ),
    [budget.debts],
  );

  // Positive means the minimums cost more than there is to spend. The snowball
  // assumes every minimum gets paid, so past this point its projection is
  // describing money that isn't there — callers must say so rather than show a
  // payoff date the user can't hit.
  const budgetShortfall = Math.max(debtMinimums - weeklyLeftover, 0);
  const postMinimum = Math.max(weeklyLeftover - debtMinimums, 0);

  // Debt first, in full. Nothing is diverted to goals while money is owed, so
  // everything above the minimums goes at the snowball.
  const debtWeeklyExtra = hasDebts ? postMinimum : 0;

  const snowball = useMemo(
    () => simulateSnowball(budget.debts, debtWeeklyExtra, budget.currentBalance),
    [budget.debts, debtWeeklyExtra, budget.currentBalance],
  );

  /**
   * The week goals start receiving money: the day the last debt dies. Until
   * then the snowball takes everything, so goals sit exactly where they are.
   * null means there's no route out of debt, so goals never begin at all.
   */
  const goalStartWeek = hasDebts ? snowball.debtFreeWeek : 0;

  // Once the debts are gone their minimums stop too, so the whole weekly
  // leftover lands on goals.
  const goalWeeklyRate = goalStartWeek === null ? 0 : weeklyLeftover;

  // Debts get the cash first; goals only see what's left after every debt is
  // cleared. With no debts this is the whole balance, exactly as before.
  const goalFundingBalance = hasDebts ? snowball.lumpSumRemainder : budget.currentBalance;

  const goalProgressById: Map<string, GoalProgress> = useMemo(() => {
    const base = calculateGoalsProgress(budget.goals, goalWeeklyRate, goalFundingBalance);
    if (goalStartWeek === null || goalStartWeek === 0) return base;
    // The waterfall solves from week 0 at a constant rate, which is exactly
    // what happens *after* the debts clear — so the whole schedule just shifts
    // forward by the payoff date. Already-met goals aren't waiting on anything
    // and must not be pushed into the future with the rest.
    const shifted = new Map<string, GoalProgress>();
    for (const [id, progress] of base) {
      if (progress.status !== 'on-track' || progress.weeksRemaining === null) {
        shifted.set(id, progress);
        continue;
      }
      const weeks = progress.weeksRemaining + goalStartWeek;
      shifted.set(id, { ...progress, weeksRemaining: weeks, monthsRemaining: weeks / WEEKS_PER_MONTH });
    }
    return shifted;
  }, [budget.goals, goalWeeklyRate, goalFundingBalance, goalStartWeek]);

  // What's actually spendable this week — $0 whenever a debt or a goal is
  // still absorbing the whole leftover.
  const freeLeftover = useMemo(
    () => (hasDebts ? 0 : currentFreeLeftover(budget.goals, weeklyLeftover)),
    [hasDebts, budget.goals, weeklyLeftover],
  );

  return {
    budget,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    freeLeftover,
    goalProgressById,
    hasDebts,
    debtMinimums,
    budgetShortfall,
    postMinimum,
    debtWeeklyExtra,
    goalStartWeek,
    goalWeeklyRate,
    goalFundingBalance,
    snowball,
    setIncome,
    setCurrentBalance,
    addExpense,
    updateExpense,
    removeExpense,
    addGoal,
    updateGoal,
    removeGoal,
    addDebt,
    updateDebt,
    removeDebt,
    resetBudget,
    exportJson,
    importJson,
  };
}
