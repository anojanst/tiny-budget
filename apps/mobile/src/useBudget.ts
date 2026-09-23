import { useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';
import {
  buildExport,
  createEmptyBudget,
  DEFAULT_BUDGET_NAME,
  generateId,
  initialStoredState,
  isEntryActive,
  makeEntry,
  parseImport,
  readStore,
  startOfToday,
  STORAGE_KEY,
  sumWeekly,
  type Budget,
  type ExpenseCategory,
  type Frequency,
  type IncomeStream,
  type OneOff,
  type OneOffDirection,
  type StoredState,
} from '@tiny-budget/core';

/**
 * The React binding over the shared store.
 *
 * Every rule about money — what a budget is, how an old one migrates, what a
 * week is worth — comes from `@tiny-budget/core` and is identical to the web
 * app's. What lives here is only the React and AsyncStorage plumbing.
 */
export function useBudget() {
  const { value: stored, setValue: setStored, loaded } = usePersistentState<StoredState>(
    STORAGE_KEY,
    initialStoredState,
  );

  const store: StoredState = useMemo(() => readStore(stored), [stored]);
  const budget: Budget =
    store.budgets.find((entry) => entry.id === store.activeId)?.budget ?? store.budgets[0].budget;

  /** Every edit lands on the active budget and leaves the rest alone. */
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

  const today = useMemo(() => startOfToday(), []);

  const activeIncomes = useMemo(
    () => budget.incomes.filter((entry) => isEntryActive(entry, today)),
    [budget.incomes, today],
  );
  const activeExpenses = useMemo(
    () => budget.expenses.filter((entry) => isEntryActive(entry, today)),
    [budget.expenses, today],
  );
  const weeklyIncome = useMemo(() => sumWeekly(activeIncomes), [activeIncomes]);
  const weeklyExpenses = useMemo(() => sumWeekly(activeExpenses), [activeExpenses]);
  const weeklyLeftover = weeklyIncome - weeklyExpenses;

  const addIncome = useCallback(
    (name: string, amount: number, frequency: Frequency, nextDue?: string) =>
      setBudget((prev) => ({
        ...prev,
        incomes: [...prev.incomes, { id: generateId(), name, amount, frequency, nextDue }],
      })),
    [setBudget],
  );
  const updateIncome = useCallback(
    (id: string, patch: Partial<Omit<IncomeStream, 'id'>>) =>
      setBudget((prev) => ({
        ...prev,
        incomes: prev.incomes.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    [setBudget],
  );
  const removeIncome = useCallback(
    (id: string) =>
      setBudget((prev) => ({ ...prev, incomes: prev.incomes.filter((e) => e.id !== id) })),
    [setBudget],
  );

  const addExpense = useCallback(
    (name: string, amount: number, frequency: Frequency, nextDue?: string) =>
      setBudget((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { id: generateId(), name, amount, frequency, nextDue }],
      })),
    [setBudget],
  );
  const updateExpense = useCallback(
    (id: string, patch: Partial<Omit<ExpenseCategory, 'id'>>) =>
      setBudget((prev) => ({
        ...prev,
        expenses: prev.expenses.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    [setBudget],
  );
  const removeExpense = useCallback(
    (id: string) =>
      setBudget((prev) => ({ ...prev, expenses: prev.expenses.filter((e) => e.id !== id) })),
    [setBudget],
  );

  const addOneOff = useCallback(
    (name: string, amount: number, date: string, direction: OneOffDirection) =>
      setBudget((prev) => ({
        ...prev,
        oneOffs: [...prev.oneOffs, { id: generateId(), name, amount, date, direction }],
      })),
    [setBudget],
  );
  const updateOneOff = useCallback(
    (id: string, patch: Partial<Omit<OneOff, 'id'>>) =>
      setBudget((prev) => ({
        ...prev,
        oneOffs: prev.oneOffs.map((e) => (e.id === id ? { ...e, ...patch } : e)),
      })),
    [setBudget],
  );
  const removeOneOff = useCallback(
    (id: string) =>
      setBudget((prev) => ({ ...prev, oneOffs: prev.oneOffs.filter((e) => e.id !== id) })),
    [setBudget],
  );

  const setCurrentBalance = useCallback(
    (amount: number) => setBudget((prev) => ({ ...prev, currentBalance: Math.max(amount, 0) })),
    [setBudget],
  );

  const switchBudget = useCallback(
    (id: string) =>
      setStored((prev) => {
        const current = readStore(prev);
        return current.budgets.some((b) => b.id === id) ? { ...current, activeId: id } : current;
      }),
    [setStored],
  );

  const createBudget = useCallback(
    (name: string) =>
      setStored((prev) => {
        const current = readStore(prev);
        const entry = makeEntry(name || DEFAULT_BUDGET_NAME, createEmptyBudget());
        return { ...current, activeId: entry.id, budgets: [...current.budgets, entry] };
      }),
    [setStored],
  );

  /** Deleting the last budget leaves an empty one rather than no app at all. */
  const deleteBudget = useCallback(
    (id: string) =>
      setStored((prev) => {
        const current = readStore(prev);
        const remaining = current.budgets.filter((b) => b.id !== id);
        if (remaining.length === 0) {
          const entry = makeEntry(DEFAULT_BUDGET_NAME, createEmptyBudget());
          return { ...current, activeId: entry.id, budgets: [entry] };
        }
        const activeId = remaining.some((b) => b.id === current.activeId)
          ? current.activeId
          : remaining[0].id;
        return { ...current, activeId, budgets: remaining };
      }),
    [setStored],
  );

  const exportJson = useCallback(() => {
    const active = store.budgets.find((entry) => entry.id === store.activeId);
    return buildExport(active?.name ?? DEFAULT_BUDGET_NAME, budget);
  }, [budget, store]);

  /** The name of the budget an export is of, for naming the file. */
  const activeBudgetName =
    store.budgets.find((entry) => entry.id === store.activeId)?.name ?? DEFAULT_BUDGET_NAME;

  /**
   * Opens a backup as a *new* budget rather than replacing the one on screen.
   * Several budgets can coexist, so importing costs nothing and destroys
   * nothing — which matters more on a phone, where the file was probably
   * picked from a list of vaguely-named downloads.
   *
   * Returns an error string rather than throwing: choosing the wrong file is
   * a normal thing to do, not an exception.
   */
  const importJson = useCallback(
    (text: string): string | null => {
      const result = parseImport(text);
      if (!result.ok) return result.error;
      setStored((prev) => {
        const current = readStore(prev);
        const entry = makeEntry(result.name, result.budget);
        return { ...current, activeId: entry.id, budgets: [...current.budgets, entry] };
      });
      return null;
    },
    [setStored],
  );

  return {
    loaded,
    budget,
    budgets: store.budgets,
    activeBudgetId: store.activeId,
    today,
    activeIncomes,
    activeExpenses,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    addIncome,
    updateIncome,
    removeIncome,
    addExpense,
    updateExpense,
    removeExpense,
    addOneOff,
    updateOneOff,
    removeOneOff,
    setCurrentBalance,
    switchBudget,
    createBudget,
    deleteBudget,
    exportJson,
    importJson,
    activeBudgetName,
  };
}
