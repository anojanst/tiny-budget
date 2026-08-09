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
  type GoalProgress,
} from '@/lib/budgetMath';
import { createEmptyBudget, type Budget, type ExpenseCategory, type Frequency, type Goal, type Income, type MoneyEntry } from '@/types/budget';

const STORAGE_KEY = 'tiny-budget:v1';
const CURRENT_VERSION = 4;

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
    currentBalance: 0,
  };
}

/** v2 goals predate priority. */
function migrateFromV2(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    currentBalance: 0,
  };
}

/** v3 predates a general current-balance figure — nobody had entered one, so it starts at 0. */
function migrateFromV3(value: unknown): Budget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return {
    income: b.income as Income,
    expenses: b.expenses as ExpenseCategory[],
    goals: withDefaultPriority(b.goals),
    currentBalance: 0,
  };
}

function readBudget(value: unknown): Budget {
  if (!value || typeof value !== 'object') return createEmptyBudget();
  const s = value as { version?: unknown; budget?: unknown };
  if (s.version === CURRENT_VERSION && isValidBudget(s.budget)) return s.budget;
  if (s.version === 3) return migrateFromV3(s.budget) ?? createEmptyBudget();
  if (s.version === 2) return migrateFromV2(s.budget) ?? createEmptyBudget();
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
      setBudget((prev) => ({ ...prev, currentBalance: amount }));
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

  const resetBudget = useCallback(() => {
    setStored({ version: CURRENT_VERSION, budget: createEmptyBudget() });
  }, [setStored]);

  const weeklyIncome = useMemo(() => weeklyIncomeAmount(budget.income), [budget.income]);
  const weeklyExpenses = useMemo(() => sumWeekly(budget.expenses), [budget.expenses]);
  const weeklyLeftover = useMemo(
    () => calculateWeeklyLeftover(budget.income, budget.expenses),
    [budget.income, budget.expenses],
  );

  const goalProgressById: Map<string, GoalProgress> = useMemo(
    () => calculateGoalsProgress(budget.goals, weeklyLeftover, budget.currentBalance),
    [budget.goals, weeklyLeftover, budget.currentBalance],
  );

  // What's actually spendable this week — $0 whenever a goal is still
  // absorbing the whole leftover, per the priority waterfall.
  const freeLeftover = useMemo(
    () => currentFreeLeftover(budget.goals, weeklyLeftover),
    [budget.goals, weeklyLeftover],
  );

  return {
    budget,
    weeklyIncome,
    weeklyExpenses,
    weeklyLeftover,
    freeLeftover,
    goalProgressById,
    setIncome,
    setCurrentBalance,
    addExpense,
    updateExpense,
    removeExpense,
    addGoal,
    updateGoal,
    removeGoal,
    resetBudget,
  };
}
