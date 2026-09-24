import { useCallback, useEffect, useRef, useState } from 'react';

/**
 * A brief message explaining something the app just declined to do.
 *
 * Deliberately not an Alert: an alert stops everything and demands a tap,
 * which is a lot of ceremony for "that button does not apply here".
 * `ToastAndroid` would have been less code but exists only on Android, and a
 * rule the app enforces should be explained the same way everywhere.
 */
export function useToast() {
  const [message, setMessage] = useState<string | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const show = useCallback((next: string) => {
    if (timer.current) clearTimeout(timer.current);
    setMessage(next);
    timer.current = setTimeout(() => setMessage(null), 3200);
  }, []);

  // A timer that outlives the screen would call setState on a gone component.
  useEffect(() => () => {
    if (timer.current) clearTimeout(timer.current);
  }, []);

  return { message, show };
}
