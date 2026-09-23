import { useCallback, useMemo } from 'react';
import { usePersistentState } from './usePersistentState';
import {
  createEmptyBudget,
  DEFAULT_BUDGET_NAME,
  generateId,
  initialStoredState,
  isEntryActive,
  makeEntry,
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
    (name: string, amount: number, frequency: Frequency) =>
      setBudget((prev) => ({
        ...prev,
        incomes: [...prev.incomes, { id: generateId(), name, amount, frequency }],
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
    (name: string, amount: number, frequency: Frequency) =>
      setBudget((prev) => ({
        ...prev,
        expenses: [...prev.expenses, { id: generateId(), name, amount, frequency }],
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
    return JSON.stringify(
      {
        app: 'tiny-budget',
        version: store.version,
        exportedAt: new Date().toISOString(),
        name: active?.name ?? DEFAULT_BUDGET_NAME,
        budget,
      },
      null,
      2,
    );
  }, [budget, store]);

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
  };
}
