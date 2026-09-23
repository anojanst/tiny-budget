import { useCallback, useMemo } from 'react';
import { useLocalStorage } from './useLocalStorage';
import {
  CURRENT_VERSION,
  DEFAULT_BUDGET_NAME,
  createEmptyBudget,
  generateId,
  initialStoredState,
  isEntryActive,
  makeEntry,
  readBudget,
  readStore,
  STORAGE_KEY,
  sumWeekly,
  startOfToday,
  type Budget,
  type Frequency,
  type IncomeStream,
  type ExpenseCategory,
  type OneOff,
  type OneOffDirection,
  type StoredState,
} from '@tiny-budget/core';

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
