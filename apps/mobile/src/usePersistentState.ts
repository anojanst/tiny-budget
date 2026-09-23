import { useCallback, useEffect, useRef, useState } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

/**
 * The phone's answer to the web's `useLocalStorage`.
 *
 * AsyncStorage reads are asynchronous, which introduces a hazard localStorage
 * never had: the first render holds the *default* value, and writing that back
 * before the stored value arrives would erase the user's budget on every cold
 * start. So nothing is persisted until the initial read has completed, and
 * `loaded` lets the UI wait rather than flash an empty state.
 */
export function usePersistentState<T>(key: string, initialValue: T) {
  const [value, setValue] = useState<T>(initialValue);
  const [loaded, setLoaded] = useState(false);
  const loadedRef = useRef(false);
  /** What is already on disk, so a no-op render doesn't cost a write. */
  const persisted = useRef<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    AsyncStorage.getItem(key)
      .then((stored) => {
        if (cancelled || stored === null) return;
        try {
          setValue(JSON.parse(stored) as T);
          // Recording it here is what stops the very next effect writing the
          // value straight back, which every launch would otherwise do.
          persisted.current = stored;
        } catch {
          // Corrupt JSON is treated as "nothing stored" rather than a crash;
          // readStore then hands back an empty budget.
        }
      })
      .finally(() => {
        if (cancelled) return;
        loadedRef.current = true;
        setLoaded(true);
      });
    return () => {
      cancelled = true;
    };
  }, [key]);

  useEffect(() => {
    if (!loadedRef.current) return;
    const serialized = JSON.stringify(value);
    if (serialized === persisted.current) return;
    persisted.current = serialized;
    AsyncStorage.setItem(key, serialized).catch(() => {
      // Ignore write failures; in-memory state stays correct either way.
    });
  }, [key, value]);

  const update = useCallback((next: T | ((prev: T) => T)) => setValue(next), []);

  return { value, setValue: update, loaded } as const;
}
