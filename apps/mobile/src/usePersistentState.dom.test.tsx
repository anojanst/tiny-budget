// @vitest-environment jsdom
import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, cleanup, waitFor, act } from '@testing-library/react';

/**
 * AsyncStorage is asynchronous, which introduces a hazard localStorage never
 * had: the first render holds the *default* value. Persisting that before the
 * stored value arrives would erase the user's budget on every cold start.
 *
 * These tests exist because that failure is silent and total.
 */
const store = new Map<string, string>();
let resolveGet: ((value: string | null) => void) | null = null;

vi.mock('@react-native-async-storage/async-storage', () => ({
  default: {
    getItem: vi.fn(
      (key: string) =>
        new Promise<string | null>((resolve) => {
          resolveGet = () => resolve(store.get(key) ?? null);
        }),
    ),
    setItem: vi.fn((key: string, value: string) => {
      store.set(key, value);
      return Promise.resolve();
    }),
  },
}));

const AsyncStorage = (await import('@react-native-async-storage/async-storage')).default;
const { usePersistentState } = await import('./usePersistentState');

function Harness() {
  const { value, setValue, loaded } = usePersistentState('k', { name: 'default' });
  return (
    <div>
      <output data-testid="value">{value.name}</output>
      <output data-testid="loaded">{String(loaded)}</output>
      <button onClick={() => setValue({ name: 'edited' })}>edit</button>
    </div>
  );
}

beforeEach(() => {
  store.clear();
  resolveGet = null;
  vi.mocked(AsyncStorage.setItem).mockClear();
});
afterEach(cleanup);

describe('usePersistentState', () => {
  it('writes nothing until the stored value has been read', async () => {
    store.set('k', JSON.stringify({ name: 'saved' }));
    render(<Harness />);

    // Mid-flight: the default is on screen, but it must not have been written.
    expect(screen.getByTestId('value').textContent).toBe('default');
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();

    await act(async () => {
      resolveGet?.(null);
    });

    await waitFor(() => expect(screen.getByTestId('value').textContent).toBe('saved'));
    expect(screen.getByTestId('loaded').textContent).toBe('true');
    // The read must not have overwritten what it just read, either.
    expect(AsyncStorage.setItem).not.toHaveBeenCalled();
  });

  it('persists once an edit is made after loading', async () => {
    store.set('k', JSON.stringify({ name: 'saved' }));
    render(<Harness />);
    await act(async () => {
      resolveGet?.(null);
    });
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));

    await act(async () => {
      screen.getByText('edit').click();
    });
    await waitFor(() => expect(AsyncStorage.setItem).toHaveBeenCalled());
    expect(JSON.parse(store.get('k')!)).toEqual({ name: 'edited' });
  });

  it('falls back to the default when the stored value is corrupt', async () => {
    store.set('k', '{not json');
    render(<Harness />);
    await act(async () => {
      resolveGet?.(null);
    });
    await waitFor(() => expect(screen.getByTestId('loaded').textContent).toBe('true'));
    expect(screen.getByTestId('value').textContent).toBe('default');
  });
});
