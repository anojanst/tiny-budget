import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

// Still the old name on purpose — see STORAGE_KEY in packages/core/src/store.ts.
// Renaming it would replay the wizard for everyone who has already done it.
const STORAGE_KEY = 'tiny-budget:onboarding';

/**
 * Tracks whether first-run setup is done. Separate from the budget itself so
 * clearing a budget doesn't drag the user back through the wizard.
 */
export function useOnboarding() {
  const [completed, setCompleted] = useLocalStorage<boolean>(STORAGE_KEY, false);

  const complete = useCallback(() => setCompleted(true), [setCompleted]);
  const restart = useCallback(() => setCompleted(false), [setCompleted]);

  return { completed, complete, restart };
}
