import type { ReactNode } from 'react';
import { BudgetContext } from './budgetContext';
import { useBudget } from './useBudget';

/**
 * One store for the whole app. Calling `useBudget` per screen would give each
 * tab its own copy of the budget, so an edit on one would never reach the
 * other — and both would race to write the same key.
 */
export function BudgetProvider({ children }: { children: ReactNode }) {
  const budget = useBudget();
  return <BudgetContext.Provider value={budget}>{children}</BudgetContext.Provider>;
}
