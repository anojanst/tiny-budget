import { createContext, useContext } from 'react';
import type { useBudget } from './useBudget';

export type BudgetApi = ReturnType<typeof useBudget>;

/**
 * Kept apart from the provider component so the module exports either
 * components or plain functions, never both — mixing them breaks fast refresh.
 */
export const BudgetContext = createContext<BudgetApi | null>(null);

export function useBudgetContext(): BudgetApi {
  const value = useContext(BudgetContext);
  if (!value) throw new Error('useBudgetContext must be used inside BudgetProvider');
  return value;
}
