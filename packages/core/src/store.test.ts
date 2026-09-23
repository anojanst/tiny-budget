import { describe, expect, it } from 'vitest';
import { CURRENT_VERSION, buildExport, parseImport, readBudget, readStore } from './store';
import { toDateInputValue } from './dates';

/**
 * The migration chain is the one place in this app where a mistake destroys
 * data someone typed in. Every historical envelope shape gets a test.
 *
 * Goals and debts were retired when the app became a dated cashflow calendar,
 * but the money they described is real. These tests pin what becomes of it —
 * silently dropping someone's $9,000 loan would be the worst bug this codebase
 * could ship.
 */
const AT = new Date(2026, 0, 1);
const on = (offsetDays: number) => toDateInputValue(new Date(2026, 0, 1 + offsetDays));

const legacyBudget = {
  income: { amount: 2000, frequency: 'fortnightly', nextPayday: '2026-01-09' },
  expenses: [{ id: 'e1', name: 'Rent', amount: 400, frequency: 'weekly' }],
  goals: [] as unknown[],
  debts: [] as unknown[],
  currentBalance: 250,
};

const read = (budget: unknown, version = 7) => readBudget({ version, budget });

describe('readBudget — the single pay stream becomes a list', () => {
  it('carries the amount, cycle and payday onto one stream', () => {
    const b = read(legacyBudget);
    expect(b.incomes).toHaveLength(1);
    expect(b.incomes[0]).toMatchObject({
      name: 'Income',
      amount: 2000,
      frequency: 'fortnightly',
      nextDue: '2026-01-09',
    });
  });

  it('leaves no stream at all when there was no income', () => {
    const b = read({ ...legacyBudget, income: { amount: 0, frequency: 'weekly' } });
    expect(b.incomes).toEqual([]);
  });

  it('keeps expenses and the balance untouched', () => {
    const b = read(legacyBudget);
    expect(b.expenses).toHaveLength(1);
    expect(b.expenses[0]).toMatchObject({ name: 'Rent', amount: 400, frequency: 'weekly' });
    expect(b.currentBalance).toBe(250);
  });

  it('never lets a negative balance through', () => {
    expect(read({ ...legacyBudget, currentBalance: -80 }).currentBalance).toBe(0);
  });
});

describe('readBudget — debts become the payments they always were', () => {
  const withDebts = (debts: unknown[]) => ({ ...legacyBudget, debts });

  it('turns a debt into a recurring payment that stops when it is paid off', () => {
    // $900 at $100/wk is nine weeks. The end date is how the *balance*
    // survives into a model that only knows about dated payments.
    const b = readBudget(
      { version: 7, budget: withDebts([{ id: 'd1', name: 'Visa', balance: 900, minimumPayment: 100 }]) },
      AT,
    );
    const visa = b.expenses.find((e) => e.name === 'Visa');
    expect(visa).toMatchObject({ amount: 100, frequency: 'weekly', endDate: on(9 * 7) });
  });

  it('rounds a part week up rather than stopping a payment short', () => {
    const b = readBudget(
      { version: 7, budget: withDebts([{ id: 'd1', name: 'Visa', balance: 950, minimumPayment: 100 }]) },
      AT,
    );
    expect(b.expenses.find((e) => e.name === 'Visa')?.endDate).toBe(on(10 * 7));
  });

  it('makes a debt with no agreed payment a one-off instead', () => {
    // An informal loan has no schedule, so there is no recurring payment to
    // describe — but the balance is still owed and must not vanish.
    const b = readBudget(
      { version: 7, budget: withDebts([{ id: 'd1', name: 'Mum', balance: 500, minimumPayment: 0 }]) },
      AT,
    );
    expect(b.expenses.find((e) => e.name === 'Mum')).toBeUndefined();
    expect(b.oneOffs).toEqual([
      { id: 'd1', name: 'Mum', amount: 500, date: on(30), direction: 'out' },
    ]);
  });

  it('drops a debt that is already settled', () => {
    const b = read(withDebts([{ id: 'd1', name: 'Paid off', balance: 0, minimumPayment: 50 }]));
    expect(b.expenses.map((e) => e.name)).toEqual(['Rent']);
    expect(b.oneOffs).toEqual([]);
  });
});

describe('readBudget — goals become dated payments', () => {
  const withGoals = (goals: unknown[]) => ({ ...legacyBudget, goals });

  it('keeps the deadline and asks only for what is still to find', () => {
    const b = readBudget(
      {
        version: 7,
        budget: withGoals([
          { id: 'g1', name: 'Car engine', targetAmount: 2000, currentSaved: 500, targetDate: '2026-03-01' },
        ]),
      },
      AT,
    );
    expect(b.oneOffs).toEqual([
      { id: 'g1', name: 'Car engine', amount: 1500, date: '2026-03-01', direction: 'out' },
    ]);
  });

  it('parks an undated goal three months out rather than deleting it', () => {
    const b = readBudget(
      { version: 7, budget: withGoals([{ id: 'g1', name: 'Buffer', targetAmount: 1000, currentSaved: 0 }]) },
      AT,
    );
    expect(b.oneOffs[0]).toMatchObject({ name: 'Buffer', amount: 1000, date: on(90) });
  });

  it('drops a goal that is already funded', () => {
    const b = read(withGoals([{ id: 'g1', name: 'Done', targetAmount: 500, currentSaved: 500 }]));
    expect(b.oneOffs).toEqual([]);
  });
});

describe('readStore — the multi-budget envelope', () => {
  const listStore = (version: number, budget: unknown) => ({
    version,
    activeId: 'b1',
    budgets: [{ id: 'b1', name: 'Household', budget }],
  });

  /**
   * A version bump that doesn't teach `readStore` about the older list shape
   * sends it down the single-budget path, which finds no `.budget` and hands
   * back an empty one — deleting every budget the user has.
   */
  it.each([8, 9, 10, 11])('keeps a v%i budget rather than wiping it', (version) => {
    const store = readStore(listStore(version, legacyBudget));
    expect(store.budgets).toHaveLength(1);
    expect(store.budgets[0].budget.expenses[0]).toMatchObject({ name: 'Rent' });
    expect(store.budgets[0].budget.currentBalance).toBe(250);
  });

  it('keeps every budget in the list and the one that was active', () => {
    const store = readStore({
      version: 10,
      activeId: 'b2',
      budgets: [
        { id: 'b1', name: 'Household', budget: legacyBudget },
        { id: 'b2', name: 'Flat', budget: { ...legacyBudget, currentBalance: 10 } },
      ],
    });
    expect(store.budgets.map((b) => b.name)).toEqual(['Household', 'Flat']);
    expect(store.activeId).toBe('b2');
    expect(store.budgets[1].budget.currentBalance).toBe(10);
  });

  it('treats a one-off with no direction as an outgoing payment', () => {
    // Only payments could be expressed before v10, so a missing direction is
    // not ambiguous — but leaving it undefined reads as income.
    const store = readStore(
      listStore(9, {
        ...legacyBudget,
        oneOffs: [{ id: 'o1', name: 'Headphones', amount: 300, date: '2026-09-30' }],
      }),
    );
    expect(store.budgets[0].budget.oneOffs[0].direction).toBe('out');
  });

  it('preserves a v11 income list instead of rebuilding it', () => {
    const incomes = [
      { id: 'i1', name: 'Salary', amount: 2000, frequency: 'fortnightly', nextDue: '2026-01-09' },
      { id: 'i2', name: 'Partner income', amount: 900, frequency: 'weekly' },
    ];
    const store = readStore(listStore(11, { ...legacyBudget, income: undefined, incomes }));
    expect(store.budgets[0].budget.incomes).toEqual(incomes);
  });

  it('still lifts a single legacy budget into the list', () => {
    const store = readStore({ version: 7, budget: legacyBudget });
    expect(store.budgets).toHaveLength(1);
    expect(store.budgets[0].budget.incomes).toHaveLength(1);
  });

  it('repairs an activeId pointing at a budget that is gone', () => {
    const store = readStore({ ...listStore(10, legacyBudget), activeId: 'missing' });
    expect(store.activeId).toBe('b1');
  });

  it('falls back to an empty budget for junk rather than throwing', () => {
    expect(readStore(null).budgets).toHaveLength(1);
    expect(readStore({ version: 10, budgets: [] }).budgets).toHaveLength(1);
  });
});

/**
 * A backup file is the only copy of someone's budget that survives losing the
 * phone, so the failure modes matter more than the happy path: a file that
 * isn't a backup has to be *refused*, because `readBudget` on its own answers
 * "empty budget" to anything it can't parse, and importing that silently
 * would look like the file was fine and the budget was blank.
 */
describe('parseImport', () => {
  const backup = buildExport('Household', readBudget({ version: 7, budget: legacyBudget }, AT));

  it('round-trips what buildExport wrote', () => {
    const result = parseImport(backup, AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe('Household');
    expect(result.budget.expenses).toHaveLength(1);
    expect(result.budget.currentBalance).toBe(250);
  });

  it('migrates an export written before goals and debts were retired', () => {
    const old = JSON.stringify({
      app: 'tiny-budget',
      version: 7,
      name: 'Old phone',
      budget: {
        ...legacyBudget,
        debts: [{ id: 'd1', name: 'Car loan', balance: 9000, minimumPayment: 100, apr: 0.1 }],
      },
    });
    const result = parseImport(old, AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.budget.expenses.map((e) => e.name)).toContain('Car loan');
  });

  it('refuses text that is not JSON', () => {
    expect(parseImport('not json at all', AT)).toEqual({
      ok: false,
      error: "That file isn't valid JSON.",
    });
  });

  it.each([['null', 'null'], ['an array', '[]'], ['a bare number', '42']])(
    'refuses %s',
    (_label, text) => {
      const result = parseImport(text, AT);
      expect(result.ok).toBe(false);
    },
  );

  it('refuses a JSON file that is not an export envelope', () => {
    const result = parseImport(JSON.stringify({ hello: 'world' }), AT);
    expect(result).toEqual({
      ok: false,
      error: "That file doesn't look like a Tiny Budget export.",
    });
  });

  it('refuses a file from a newer version rather than guessing at it', () => {
    const future = JSON.stringify({ version: CURRENT_VERSION + 1, budget: legacyBudget });
    expect(parseImport(future, AT)).toEqual({
      ok: false,
      error: 'That file was made by a newer version of Tiny Budget.',
    });
  });

  it('refuses a budget with content that reads back as empty', () => {
    // Shaped like an envelope, but nothing inside is a budget field, so the
    // migration chain hands back an empty budget. Importing that would look
    // like a success and lose the file's actual contents.
    const junk = JSON.stringify({
      version: 11,
      budget: { somethingElse: Array.from({ length: 20 }, (_, i) => ({ id: i, value: i })) },
    });
    expect(parseImport(junk, AT)).toEqual({
      ok: false,
      error: "That file couldn't be read as a budget.",
    });
  });

  it('accepts a genuinely empty budget, which is not the same as unreadable', () => {
    const empty = JSON.stringify({ version: 11, budget: { incomes: [], expenses: [], oneOffs: [], currentBalance: 0 } });
    const result = parseImport(empty, AT);
    expect(result.ok).toBe(true);
  });

  it('names an unnamed import rather than leaving it blank', () => {
    const unnamed = JSON.stringify({ version: 11, budget: { ...legacyBudget, name: undefined } });
    const result = parseImport(unnamed, AT);
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.name).toBe('Imported budget');
  });
});
