import { useCallback } from 'react';
import { useLocalStorage } from './useLocalStorage';

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
