import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '@/lib/id';
import {
  calculateGoalsProgress,
  currentFreeLeftover,
  isEntryActive,
  sumWeekly,
  toWeeklyAmount,
  weeklyIncomeAmount,
  WEEKS_PER_MONTH,
  type GoalProgress,
} from '@/lib/budgetMath';
import { simulateSnowball } from '@/lib/debtMath';
import { startOfToday } from '@/lib/dates';
import { createEmptyBudget, type Budget, type Debt, type ExpenseCategory, type Frequency, type Goal, type Income, type MoneyEntry, type NamedBudget } from '@/types/budget';

const STORAGE_KEY = 'tiny-budget:v1';
const CURRENT_VERSION = 8;

interface StoredState {
  version: typeof CURRENT_VERSION;
  /** Which budget the app is currently showing. Always present in `budgets`. */
  activeId: string;
  budgets: NamedBudget[];
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

/**
 * One budget out of any envelope this app has ever written. Every version up
 * to 7 stored exactly one budget under `.budget`; from 8 they live in a list,
 * so this is only reached for the legacy shapes and for imported files.
 */
export function readBudget(value: unknown): Budget {
  if (!value || typeof value !== 'object') return createEmptyBudget();
  const s = value as { version?: unknown; budget?: unknown };
  if (s.version === 7 && isValidBudget(s.budget)) return s.budget;
  if (s.version === 6) return migrateFromV6(s.budget) ?? createEmptyBudget();
  if (s.version === 5) return migrateFromV5(s.budget) ?? createEmptyBudget();
  if (s.version === 4) return migrateFromV4(s.budget) ?? createEmptyBudget();
  if (s.version === 3 || s.version === 2) return migrateFromV2OrV3(s.budget) ?? createEmptyBudget();
  if (s.version === 1) return migrateFromV1(s.budget) ?? createEmptyBudget();
  // An unversioned or v8+ envelope handed here has no single budget to read.
  return isValidBudget(s.budget) ? (s.budget as Budget) : createEmptyBudget();
}

export const DEFAULT_BUDGET_NAME = 'My budget';

function makeEntry(name: string, budget: Budget): NamedBudget {
  return { id: generateId(), name: name.trim() || DEFAULT_BUDGET_NAME, budget };
}

function isValidEntry(value: unknown): value is NamedBudget {
  if (!value || typeof value !== 'object') return false;
  const e = value as NamedBudget;
  return typeof e.id === 'string' && typeof e.name === 'string' && isValidBudget(e.budget);
}

/**
 * Reads the whole store. Versions 1–7 held a single budget; they become a
 * one-entry list so nobody loses what they'd already entered when the app
 * learned to hold several.
 *
 * Also repairs a store that's structurally intact but internally inconsistent
 * — an empty list, or an `activeId` pointing at a budget that isn't there —
 * because both would otherwise render an app with no budget at all.
 */
function readStore(value: unknown): StoredState {
  const fresh = () => {
    const entry = makeEntry(DEFAULT_BUDGET_NAME, createEmptyBudget());
    return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] } as StoredState;
  };
  if (!value || typeof value !== 'object') return fresh();
  const s = value as { version?: unknown; activeId?: unknown; budgets?: unknown };

  if (s.version === CURRENT_VERSION && Array.isArray(s.budgets)) {
    const budgets = s.budgets.filter(isValidEntry);
    if (budgets.length === 0) return fresh();
    const activeId =
      typeof s.activeId === 'string' && budgets.some((b) => b.id === s.activeId)
        ? s.activeId
        : budgets[0].id;
    return { version: CURRENT_VERSION, activeId, budgets };
  }

  const entry = makeEntry(DEFAULT_BUDGET_NAME, readBudget(value));
  return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] };
}

const initialStoredState: StoredState = (() => {
  const entry: NamedBudget = {
    id: 'initial',
    name: DEFAULT_BUDGET_NAME,
    budget: createEmptyBudget(),
  };
  return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] };
})();

export function useBudget() {
  const [stored, setStored] = useLocalStorage<StoredState>(STORAGE_KEY, initialStoredState);

  // Memoized so migration/validation doesn't re-run on every render, and so
  // `budget` keeps a stable identity for the memoized children below it.
  const store: StoredState = useMemo(() => readStore(stored), [stored]);
  const budget: Budget =
    store.budgets.find((entry) => entry.id === store.activeId)?.budget ?? store.budgets[0].budget;

  /** Every edit below lands on the active budget and leaves the rest alone. */
  const setBudget = useCallback(
    (updater: (prev: Budget) => Budget) => {
      setStored((prev) => {
        const current = readStore(prev);
        return {
          ...current,
          budgets: current.budgets.map((entry) =>
            entry.id === current.activeId ? { ...entry, budget: updater(entry.budget) } : entry,
          ),
        };
      });
    },
    [setStored],
  );

  const switchBudget = useCallback(
    (id: string) => {
      setStored((prev) => {
        const current = readStore(prev);
        if (!current.budgets.some((entry) => entry.id === id)) return current;
        return { ...current, activeId: id };
      });
    },
    [setStored],
  );

  /** Creates an empty budget and switches to it. Returns nothing — the caller
   * usually wants to send the user through setup next. */
  const createBudget = useCallback(
    (name: string) => {
      setStored((prev) => {
        const current = readStore(prev);
        const entry = makeEntry(name, createEmptyBudget());
        return { ...current, activeId: entry.id, budgets: [...current.budgets, entry] };
      });
    },
    [setStored],
  );

  const renameBudget = useCallback(
    (id: string, name: string) => {
      setStored((prev) => {
        const current = readStore(prev);
        return {
          ...current,
          budgets: current.budgets.map((entry) =>
            entry.id === id ? { ...entry, name: name.trim() || DEFAULT_BUDGET_NAME } : entry,
          ),
        };
      });
    },
    [setStored],
  );

  /** Deleting the last budget leaves an empty one rather than no app at all. */
  const deleteBudget = useCallback(
    (id: string) => {
      setStored((prev) => {
        const current = readStore(prev);
        const remaining = current.budgets.filter((entry) => entry.id !== id);
        if (remaining.length === 0) {
          const entry = makeEntry(DEFAULT_BUDGET_NAME, createEmptyBudget());
          return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] };
        }
        const activeId = remaining.some((entry) => entry.id === current.activeId)
          ? current.activeId
          : remaining[0].id;
        return { ...current, activeId, budgets: remaining };
      });
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
    (
      name: string,
      targetAmount: number,
      currentSaved: number,
      priority: number,
      targetDate?: string,
    ) => {
      setBudget((prev) => ({
        ...prev,
        goals: [
          ...prev.goals,
          { id: generateId(), name, targetAmount, currentSaved, priority, targetDate },
        ],
      }));
    },
    [setBudget],
  );

  /**
   * Moves one goal to the front of the queue and pushes everything else back a
   * place, so it ends up alone at priority 1 rather than sharing (and halving)
   * the money with whatever was already there. The numbers stay visible and
   * editable afterwards — this is a shortcut, not a separate mode.
   */
  const prioritiseGoal = useCallback(
    (id: string) => {
      setBudget((prev) => ({
        ...prev,
        goals: prev.goals.map((goal) =>
          goal.id === id ? { ...goal, priority: 1 } : { ...goal, priority: goal.priority + 1 },
        ),
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

  /** Empties the active budget, keeping its name and the other budgets. */
  const resetBudget = useCallback(() => {
    setBudget(() => createEmptyBudget());
  }, [setBudget]);

  /**
   * The active budget as a portable document. Exports stay single-budget and
   * keep the version-7 envelope shape, so a file written here still opens in
   * an older build — and carries its name so an import can restore it.
   */
  const exportJson = useCallback(() => {
    const active = store.budgets.find((entry) => entry.id === store.activeId);
    return JSON.stringify(
      {
        app: 'tiny-budget',
        version: 7,
        exportedAt: new Date().toISOString(),
        name: active?.name ?? DEFAULT_BUDGET_NAME,
        budget,
      },
      null,
      2,
    );
  }, [budget, store]);

  /**
   * Opens an exported file as a *new* budget rather than overwriting the one
   * on screen — now that several can coexist, importing costs nothing and
   * destroys nothing. Older exports are welcome: the text goes through the
   * same migration chain as stored data.
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
      const envelope = parsed as { version?: unknown; budget?: unknown; name?: unknown };
      if (typeof envelope.version !== 'number' || !envelope.budget || typeof envelope.budget !== 'object') {
        return "That file doesn't look like a Tiny Budget export.";
      }
      if (envelope.version > CURRENT_VERSION) {
        return 'That file was made by a newer version of Tiny Budget.';
      }
      // readBudget falls back to an empty budget for anything it can't parse,
      // so a file that reads as blank but wasn't is a failure, not an import.
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
      const name = typeof envelope.name === 'string' && envelope.name.trim() ? envelope.name : 'Imported budget';
      setStored((prev) => {
        const current = readStore(prev);
        const entry = makeEntry(name, migrated);
        return { ...current, activeId: entry.id, budgets: [...current.budgets, entry] };
      });
      return null;
    },
    [setStored],
  );

  // Recomputed once per mount: a commitment that ended yesterday should stop
  // being reserved, and nothing here needs to react mid-session.
  const today = useMemo(() => startOfToday(), []);

  /** Only commitments still owed. An ended one would inflate the budget forever. */
  const activeExpenses = useMemo(
    () => budget.expenses.filter((entry) => isEntryActive(entry, today)),
    [budget.expenses, today],
  );

  const weeklyIncome = useMemo(() => weeklyIncomeAmount(budget.income), [budget.income]);
  const weeklyExpenses = useMemo(() => sumWeekly(activeExpenses), [activeExpenses]);
  const weeklyLeftover = useMemo(
    () => weeklyIncomeAmount(budget.income) - sumWeekly(activeExpenses),
    [budget.income, activeExpenses],
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
    activeExpenses,
    today,
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
    prioritiseGoal,
    updateGoal,
    removeGoal,
    addDebt,
    updateDebt,
    removeDebt,
    resetBudget,
    budgets: store.budgets,
    activeBudgetId: store.activeId,
    switchBudget,
    createBudget,
    renameBudget,
    deleteBudget,
    exportJson,
    importJson,
  };
}
