import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import { generateId } from '@/lib/id';
import { isEntryActive, sumWeekly, toWeeklyAmount } from '@/lib/budgetMath';
import { addDays, addWeeks, startOfToday, toDateInputValue } from '@/lib/dates';
import {
  createEmptyBudget,
  type Budget,
  type ExpenseCategory,
  type Frequency,
  type IncomeStream,
  type MoneyEntry,
  type NamedBudget,
  type OneOff,
  type OneOffDirection,
} from '@/types/budget';

const STORAGE_KEY = 'tiny-budget:v1';
const CURRENT_VERSION = 11;

/**
 * Every version that stored budgets as a *list*. A newer version must never
 * simply fail the equality check in `readStore` and fall through to
 * `readBudget`: that path expects a single `.budget` and would hand back an
 * empty one, silently wiping every budget the user has. Adding a field means
 * adding the old version here and handling it in `toBudget`.
 */
const LIST_VERSIONS: readonly number[] = [8, 9, 10, 11];

interface StoredState {
  version: typeof CURRENT_VERSION;
  activeId: string;
  budgets: NamedBudget[];
}

/**
 * Every budget shape this app has ever written, loosely typed.
 *
 * The migration chain below converts old *envelopes* into this; `toBudget`
 * then converts this into today's `Budget`. Splitting it that way means the
 * historical migrations don't have to be rewritten every time the current
 * shape changes — they only ever have to produce something this can describe.
 */
interface LegacyBudget {
  /** v11 and later. */
  incomes?: unknown;
  /** v2–v10: exactly one pay stream. */
  income?: { amount?: unknown; frequency?: unknown; nextPayday?: unknown };
  expenses?: unknown;
  goals?: unknown;
  debts?: unknown;
  oneOffs?: unknown;
  currentBalance?: unknown;
}

interface LegacyGoal {
  id?: string;
  name?: string;
  targetAmount?: number;
  currentSaved?: number;
  targetDate?: string;
}

interface LegacyDebt {
  id?: string;
  name?: string;
  balance?: number;
  minimumPayment?: number;
}

function isValidBudget(value: unknown): value is Budget {
  if (!value || typeof value !== 'object') return false;
  const b = value as Budget;
  return Array.isArray(b.expenses) && typeof b.currentBalance === 'number';
}

function asEntries(value: unknown): MoneyEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is MoneyEntry => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: typeof entry.id === 'string' ? entry.id : generateId(),
      name: typeof entry.name === 'string' ? entry.name : '',
      amount: typeof entry.amount === 'number' ? entry.amount : 0,
      frequency: (entry.frequency ?? 'monthly') as Frequency,
      ...(entry.nextDue ? { nextDue: entry.nextDue } : {}),
      ...(entry.endDate ? { endDate: entry.endDate } : {}),
    }));
}

/**
 * How long a debt would take to clear at its minimum payment.
 *
 * Interest was never modelled — a real minimum covers it by construction — so
 * this is just division. It exists to give the converted expense an end date,
 * which is how the debt's *balance* survives the move to a pure cashflow
 * model: the payment recurs until the debt is gone, then stops on its own.
 */
function weeksToClear(balance: number, weeklyPayment: number): number {
  if (weeklyPayment <= 0) return 0;
  return Math.ceil(balance / weeklyPayment);
}

/**
 * Turns any historical budget into today's shape.
 *
 * Goals and debts no longer exist as concepts, but the money they described is
 * real and must not vanish:
 *
 * - A **debt** becomes the recurring payment it always was, ending on the date
 *   it would be paid off. Both facts survive — the payment and the balance —
 *   and the calendar stops charging it the week it clears.
 * - A **goal** becomes a one-off payment for whatever is still to find. That's
 *   what a savings target is in a dated model: money leaving on a day. Goals
 *   with a deadline keep it; the rest are parked three months out, visible and
 *   editable rather than quietly deleted.
 */
function toBudget(legacy: LegacyBudget, today = startOfToday()): Budget {
  const expenses: ExpenseCategory[] = asEntries(legacy.expenses);
  const oneOffs: OneOff[] = Array.isArray(legacy.oneOffs)
    ? (legacy.oneOffs as OneOff[])
        .filter((item) => !!item && typeof item === 'object')
        // One-offs could only be payments before v10, so a missing direction
        // is an outgoing one — leaving it undefined reads as income.
        .map((item) => ({ ...item, direction: item.direction ?? 'out' }))
    : [];

  // v11 onward stores a list; everything before it stored a single stream.
  let incomes: IncomeStream[] = asEntries(legacy.incomes);
  if (incomes.length === 0 && legacy.income && typeof legacy.income === 'object') {
    const amount = typeof legacy.income.amount === 'number' ? legacy.income.amount : 0;
    if (amount > 0) {
      incomes = [
        {
          id: generateId(),
          name: 'Income',
          amount,
          frequency: (legacy.income.frequency ?? 'weekly') as Frequency,
          ...(typeof legacy.income.nextPayday === 'string' && legacy.income.nextPayday
            ? { nextDue: legacy.income.nextPayday }
            : {}),
        },
      ];
    }
  }

  for (const debt of Array.isArray(legacy.debts) ? (legacy.debts as LegacyDebt[]) : []) {
    if (!debt || typeof debt !== 'object') continue;
    const balance = typeof debt.balance === 'number' ? debt.balance : 0;
    const minimum = typeof debt.minimumPayment === 'number' ? debt.minimumPayment : 0;
    if (balance <= 0) continue;
    if (minimum > 0) {
      expenses.push({
        id: typeof debt.id === 'string' ? debt.id : generateId(),
        name: debt.name || 'Loan',
        amount: minimum,
        frequency: 'weekly',
        endDate: toDateInputValue(addWeeks(today, weeksToClear(balance, minimum))),
      });
    } else {
      // Owed, but on no schedule at all — an informal loan. There is no
      // recurring payment to describe, so it becomes a single payment for the
      // balance, dated a month out for the user to move.
      oneOffs.push({
        id: typeof debt.id === 'string' ? debt.id : generateId(),
        name: debt.name || 'Loan',
        amount: balance,
        date: toDateInputValue(addDays(today, 30)),
        direction: 'out',
      });
    }
  }

  for (const goal of Array.isArray(legacy.goals) ? (legacy.goals as LegacyGoal[]) : []) {
    if (!goal || typeof goal !== 'object') continue;
    const target = typeof goal.targetAmount === 'number' ? goal.targetAmount : 0;
    const saved = typeof goal.currentSaved === 'number' ? goal.currentSaved : 0;
    const outstanding = Math.max(target - saved, 0);
    if (outstanding <= 0) continue;
    oneOffs.push({
      id: typeof goal.id === 'string' ? goal.id : generateId(),
      name: goal.name || 'Goal',
      amount: outstanding,
      date: goal.targetDate || toDateInputValue(addDays(today, 90)),
      direction: 'out',
    });
  }

  return {
    incomes,
    expenses,
    oneOffs,
    currentBalance: Math.max(
      typeof legacy.currentBalance === 'number' ? legacy.currentBalance : 0,
      0,
    ),
  };
}

/** Goals from before priority existed all start equal, at 1. */
function withDefaultPriority(goals: unknown): unknown[] {
  return Array.isArray(goals) ? goals : [];
}

function migrateFromV1(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!Array.isArray(b.income) || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) {
    return null;
  }
  // v1 held several income rows; every version after it held one weekly total.
  const weeklyTotal = (b.income as MoneyEntry[]).reduce(
    (sum, entry) => sum + toWeeklyAmount(entry?.amount ?? 0, entry?.frequency ?? 'weekly'),
    0,
  );
  return {
    income: { amount: weeklyTotal, frequency: 'weekly' },
    expenses: b.expenses,
    goals: withDefaultPriority(b.goals),
    currentBalance: 0,
  };
}

function migrateFromV2OrV3(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as LegacyBudget;
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return { ...b, goals: withDefaultPriority(b.goals) };
}

function migrateLater(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as LegacyBudget;
  if (!b.income || !Array.isArray(b.expenses)) return null;
  return b;
}

/**
 * One budget out of any envelope this app has ever written. Every version up
 * to 7 stored exactly one budget under `.budget`; from 8 they live in a list,
 * so this is only reached for the legacy shapes and for imported files.
 */
export function readBudget(value: unknown, today = startOfToday()): Budget {
  if (!value || typeof value !== 'object') return createEmptyBudget();
  const s = value as { version?: unknown; budget?: unknown };
  const legacy =
    s.version === 1
      ? migrateFromV1(s.budget)
      : s.version === 2 || s.version === 3
        ? migrateFromV2OrV3(s.budget)
        : typeof s.version === 'number'
          ? migrateLater(s.budget)
          : null;
  if (legacy) return toBudget(legacy, today);
  // An unversioned or list envelope handed here has no single budget to read.
  return isValidBudget(s.budget) ? toBudget(s.budget as LegacyBudget, today) : createEmptyBudget();
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
export function readStore(value: unknown): StoredState {
  const fresh = () => {
    const entry = makeEntry(DEFAULT_BUDGET_NAME, createEmptyBudget());
    return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] } as StoredState;
  };
  if (!value || typeof value !== 'object') return fresh();
  const s = value as { version?: unknown; activeId?: unknown; budgets?: unknown };

  if (typeof s.version === 'number' && LIST_VERSIONS.includes(s.version) && Array.isArray(s.budgets)) {
    const budgets = s.budgets
      .filter(isValidEntry)
      .map((entry) => ({ ...entry, budget: toBudget(entry.budget as unknown as LegacyBudget) }));
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

  const addIncome = useCallback(
    (name: string, amount: number, frequency: Frequency) => {
      setBudget((prev) => ({
        ...prev,
        incomes: [...prev.incomes, { id: generateId(), name, amount, frequency }],
      }));
    },
    [setBudget],
  );

  const updateIncome = useCallback(
    (id: string, patch: Partial<Omit<IncomeStream, 'id'>>) => {
      setBudget((prev) => ({
        ...prev,
        incomes: prev.incomes.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      }));
    },
    [setBudget],
  );

  const removeIncome = useCallback(
    (id: string) => {
      setBudget((prev) => ({ ...prev, incomes: prev.incomes.filter((entry) => entry.id !== id) }));
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

  const addOneOff = useCallback(
    (name: string, amount: number, date: string, direction: OneOffDirection) => {
      setBudget((prev) => ({
        ...prev,
        oneOffs: [...prev.oneOffs, { id: generateId(), name, amount, date, direction }],
      }));
    },
    [setBudget],
  );

  const updateOneOff = useCallback(
    (id: string, patch: Partial<Omit<OneOff, 'id'>>) => {
      setBudget((prev) => ({
        ...prev,
        oneOffs: prev.oneOffs.map((entry) => (entry.id === id ? { ...entry, ...patch } : entry)),
      }));
    },
    [setBudget],
  );

  const removeOneOff = useCallback(
    (id: string) => {
      setBudget((prev) => ({ ...prev, oneOffs: prev.oneOffs.filter((entry) => entry.id !== id) }));
    },
    [setBudget],
  );

  const resetBudget = useCallback(() => {
    setBudget(() => createEmptyBudget());
  }, [setBudget]);

  /**
   * The active budget as a portable document. Exports stay single-budget —
   * one file, one budget — and carry the name so an import can restore it.
   * Older exports still open: they go through the same migration chain as
   * stored data, so a file written before goals and debts were retired comes
   * back as the payments and one-offs those described.
   */
  const exportJson = useCallback(() => {
    const active = store.budgets.find((entry) => entry.id === store.activeId);
    return JSON.stringify(
      {
        app: 'tiny-budget',
        version: CURRENT_VERSION,
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
        migrated.incomes.length === 0 &&
        migrated.oneOffs.length === 0 &&
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

  /** Only streams still running. An ended job would inflate income forever. */
  const activeIncomes = useMemo(
    () => budget.incomes.filter((entry) => isEntryActive(entry, today)),
    [budget.incomes, today],
  );

  const weeklyIncome = useMemo(() => sumWeekly(activeIncomes), [activeIncomes]);
  const weeklyExpenses = useMemo(() => sumWeekly(activeExpenses), [activeExpenses]);
  const weeklyLeftover = weeklyIncome - weeklyExpenses;

  return {
    budget,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    activeExpenses,
    activeIncomes,
    addIncome,
    updateIncome,
    removeIncome,
    today,
    setCurrentBalance,
    addExpense,
    updateExpense,
    removeExpense,
    addOneOff,
    updateOneOff,
    removeOneOff,
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
