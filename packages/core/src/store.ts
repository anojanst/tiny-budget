/**
 * The persisted store, minus any notion of *where* it is persisted.
 *
 * Reading, validating and migrating a budget is the riskiest code in the app —
 * a mistake here deletes what someone typed in — so it lives once, shared by
 * every client. Each app supplies its own storage (localStorage on the web,
 * AsyncStorage on a phone) and hands the raw value to `readStore`.
 */
import { generateId } from './id';
import { toWeeklyAmount } from './budgetMath';
import { addDays, addWeeks, startOfToday, toDateInputValue } from './dates';
import {
  createEmptyBudget,
  type Budget,
  type ExpenseCategory,
  type Frequency,
  type IncomeStream,
  type MoneyEntry,
  type NamedBudget,
  type OneOff,
} from './types';

export const STORAGE_KEY = 'tiny-budget:v1';
export const CURRENT_VERSION = 11;

/**
 * Every version that stored budgets as a *list*. A newer version must never
 * simply fail the equality check in `readStore` and fall through to
 * `readBudget`: that path expects a single `.budget` and would hand back an
 * empty one, silently wiping every budget the user has. Adding a field means
 * adding the old version here and handling it in `toBudget`.
 */
const LIST_VERSIONS: readonly number[] = [8, 9, 10, 11];

export interface StoredState {
  version: typeof CURRENT_VERSION;
  activeId: string;
  budgets: NamedBudget[];
}

/**
 * Every budget shape this app has ever written, loosely typed.
 *
 * The migration chain below converts old *envelopes* into this; `toBudget`
 * then converts this into today's `Budget`. Splitting it that way means the
 * historical migrations don't have to be rewritten every time the current
 * shape changes — they only ever have to produce something this can describe.
 */
interface LegacyBudget {
  /** v11 and later. */
  incomes?: unknown;
  /** v2–v10: exactly one pay stream. */
  income?: { amount?: unknown; frequency?: unknown; nextPayday?: unknown };
  expenses?: unknown;
  goals?: unknown;
  debts?: unknown;
  oneOffs?: unknown;
  currentBalance?: unknown;
}

interface LegacyGoal {
  id?: string;
  name?: string;
  targetAmount?: number;
  currentSaved?: number;
  targetDate?: string;
}

interface LegacyDebt {
  id?: string;
  name?: string;
  balance?: number;
  minimumPayment?: number;
}

function isValidBudget(value: unknown): value is Budget {
  if (!value || typeof value !== 'object') return false;
  const b = value as Budget;
  return Array.isArray(b.expenses) && typeof b.currentBalance === 'number';
}

function asEntries(value: unknown): MoneyEntry[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((entry): entry is MoneyEntry => !!entry && typeof entry === 'object')
    .map((entry) => ({
      id: typeof entry.id === 'string' ? entry.id : generateId(),
      name: typeof entry.name === 'string' ? entry.name : '',
      amount: typeof entry.amount === 'number' ? entry.amount : 0,
      frequency: (entry.frequency ?? 'monthly') as Frequency,
      ...(entry.nextDue ? { nextDue: entry.nextDue } : {}),
      ...(entry.endDate ? { endDate: entry.endDate } : {}),
    }));
}

/**
 * How long a debt would take to clear at its minimum payment.
 *
 * Interest was never modelled — a real minimum covers it by construction — so
 * this is just division. It exists to give the converted expense an end date,
 * which is how the debt's *balance* survives the move to a pure cashflow
 * model: the payment recurs until the debt is gone, then stops on its own.
 */
function weeksToClear(balance: number, weeklyPayment: number): number {
  if (weeklyPayment <= 0) return 0;
  return Math.ceil(balance / weeklyPayment);
}

/**
 * Turns any historical budget into today's shape.
 *
 * Goals and debts no longer exist as concepts, but the money they described is
 * real and must not vanish:
 *
 * - A **debt** becomes the recurring payment it always was, ending on the date
 *   it would be paid off. Both facts survive — the payment and the balance —
 *   and the calendar stops charging it the week it clears.
 * - A **goal** becomes a one-off payment for whatever is still to find. That's
 *   what a savings target is in a dated model: money leaving on a day. Goals
 *   with a deadline keep it; the rest are parked three months out, visible and
 *   editable rather than quietly deleted.
 */
function toBudget(legacy: LegacyBudget, today = startOfToday()): Budget {
  const expenses: ExpenseCategory[] = asEntries(legacy.expenses);
  const oneOffs: OneOff[] = Array.isArray(legacy.oneOffs)
    ? (legacy.oneOffs as OneOff[])
        .filter((item) => !!item && typeof item === 'object')
        // One-offs could only be payments before v10, so a missing direction
        // is an outgoing one — leaving it undefined reads as income.
        .map((item) => ({ ...item, direction: item.direction ?? 'out' }))
    : [];

  // v11 onward stores a list; everything before it stored a single stream.
  let incomes: IncomeStream[] = asEntries(legacy.incomes);
  if (incomes.length === 0 && legacy.income && typeof legacy.income === 'object') {
    const amount = typeof legacy.income.amount === 'number' ? legacy.income.amount : 0;
    if (amount > 0) {
      incomes = [
        {
          id: generateId(),
          name: 'Income',
          amount,
          frequency: (legacy.income.frequency ?? 'weekly') as Frequency,
          ...(typeof legacy.income.nextPayday === 'string' && legacy.income.nextPayday
            ? { nextDue: legacy.income.nextPayday }
            : {}),
        },
      ];
    }
  }

  for (const debt of Array.isArray(legacy.debts) ? (legacy.debts as LegacyDebt[]) : []) {
    if (!debt || typeof debt !== 'object') continue;
    const balance = typeof debt.balance === 'number' ? debt.balance : 0;
    const minimum = typeof debt.minimumPayment === 'number' ? debt.minimumPayment : 0;
    if (balance <= 0) continue;
    if (minimum > 0) {
      expenses.push({
        id: typeof debt.id === 'string' ? debt.id : generateId(),
        name: debt.name || 'Loan',
        amount: minimum,
        frequency: 'weekly',
        endDate: toDateInputValue(addWeeks(today, weeksToClear(balance, minimum))),
      });
    } else {
      // Owed, but on no schedule at all — an informal loan. There is no
      // recurring payment to describe, so it becomes a single payment for the
      // balance, dated a month out for the user to move.
      oneOffs.push({
        id: typeof debt.id === 'string' ? debt.id : generateId(),
        name: debt.name || 'Loan',
        amount: balance,
        date: toDateInputValue(addDays(today, 30)),
        direction: 'out',
      });
    }
  }

  for (const goal of Array.isArray(legacy.goals) ? (legacy.goals as LegacyGoal[]) : []) {
    if (!goal || typeof goal !== 'object') continue;
    const target = typeof goal.targetAmount === 'number' ? goal.targetAmount : 0;
    const saved = typeof goal.currentSaved === 'number' ? goal.currentSaved : 0;
    const outstanding = Math.max(target - saved, 0);
    if (outstanding <= 0) continue;
    oneOffs.push({
      id: typeof goal.id === 'string' ? goal.id : generateId(),
      name: goal.name || 'Goal',
      amount: outstanding,
      date: goal.targetDate || toDateInputValue(addDays(today, 90)),
      direction: 'out',
    });
  }

  return {
    incomes,
    expenses,
    oneOffs,
    currentBalance: Math.max(
      typeof legacy.currentBalance === 'number' ? legacy.currentBalance : 0,
      0,
    ),
  };
}

/** Goals from before priority existed all start equal, at 1. */
function withDefaultPriority(goals: unknown): unknown[] {
  return Array.isArray(goals) ? goals : [];
}

function migrateFromV1(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as { income?: unknown; expenses?: unknown; goals?: unknown };
  if (!Array.isArray(b.income) || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) {
    return null;
  }
  // v1 held several income rows; every version after it held one weekly total.
  const weeklyTotal = (b.income as MoneyEntry[]).reduce(
    (sum, entry) => sum + toWeeklyAmount(entry?.amount ?? 0, entry?.frequency ?? 'weekly'),
    0,
  );
  return {
    income: { amount: weeklyTotal, frequency: 'weekly' },
    expenses: b.expenses,
    goals: withDefaultPriority(b.goals),
    currentBalance: 0,
  };
}

function migrateFromV2OrV3(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as LegacyBudget;
  if (!b.income || !Array.isArray(b.expenses) || !Array.isArray(b.goals)) return null;
  return { ...b, goals: withDefaultPriority(b.goals) };
}

function migrateLater(value: unknown): LegacyBudget | null {
  if (!value || typeof value !== 'object') return null;
  const b = value as LegacyBudget;
  if (!b.income || !Array.isArray(b.expenses)) return null;
  return b;
}

/**
 * One budget out of any envelope this app has ever written. Every version up
 * to 7 stored exactly one budget under `.budget`; from 8 they live in a list,
 * so this is only reached for the legacy shapes and for imported files.
 */
export function readBudget(value: unknown, today = startOfToday()): Budget {
  if (!value || typeof value !== 'object') return createEmptyBudget();
  const s = value as { version?: unknown; budget?: unknown };
  const legacy =
    s.version === 1
      ? migrateFromV1(s.budget)
      : s.version === 2 || s.version === 3
        ? migrateFromV2OrV3(s.budget)
        : typeof s.version === 'number'
          ? migrateLater(s.budget)
          : null;
  if (legacy) return toBudget(legacy, today);
  // An unversioned or list envelope handed here has no single budget to read.
  return isValidBudget(s.budget) ? toBudget(s.budget as LegacyBudget, today) : createEmptyBudget();
}

export const DEFAULT_BUDGET_NAME = 'My budget';

export function makeEntry(name: string, budget: Budget): NamedBudget {
  return { id: generateId(), name: name.trim() || DEFAULT_BUDGET_NAME, budget };
}

function isValidEntry(value: unknown): value is NamedBudget {
  if (!value || typeof value !== 'object') return false;
  const e = value as NamedBudget;
  return typeof e.id === 'string' && typeof e.name === 'string' && isValidBudget(e.budget);
}

/**
 * Reads the whole store. Versions 1–7 held a single budget; they become a
 * one-entry list so nobody loses what they'd already entered when the app
 * learned to hold several.
 *
 * Also repairs a store that's structurally intact but internally inconsistent
 * — an empty list, or an `activeId` pointing at a budget that isn't there —
 * because both would otherwise render an app with no budget at all.
 */
export function readStore(value: unknown): StoredState {
  const fresh = () => {
    const entry = makeEntry(DEFAULT_BUDGET_NAME, createEmptyBudget());
    return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] } as StoredState;
  };
  if (!value || typeof value !== 'object') return fresh();
  const s = value as { version?: unknown; activeId?: unknown; budgets?: unknown };

  if (typeof s.version === 'number' && LIST_VERSIONS.includes(s.version) && Array.isArray(s.budgets)) {
    const budgets = s.budgets
      .filter(isValidEntry)
      .map((entry) => ({ ...entry, budget: toBudget(entry.budget as unknown as LegacyBudget) }));
    if (budgets.length === 0) return fresh();
    const activeId =
      typeof s.activeId === 'string' && budgets.some((b) => b.id === s.activeId)
        ? s.activeId
        : budgets[0].id;
    return { version: CURRENT_VERSION, activeId, budgets };
  }

  const entry = makeEntry(DEFAULT_BUDGET_NAME, readBudget(value));
  return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] };
}

export const initialStoredState: StoredState = (() => {
  const entry: NamedBudget = {
    id: 'initial',
    name: DEFAULT_BUDGET_NAME,
    budget: createEmptyBudget(),
  };
  return { version: CURRENT_VERSION, activeId: entry.id, budgets: [entry] };
})();

/** What a backup file turned into, or why it couldn't be read. */
export type ImportResult =
  | { ok: true; name: string; budget: Budget }
  | { ok: false; error: string };

/**
 * Reads an exported backup.
 *
 * This lives in core rather than in either client because the failure modes
 * are the interesting part, and they should read the same on both: a file
 * that isn't a backup must be refused rather than quietly imported as an
 * empty budget, which is what `readBudget`'s own fallback would do.
 */
export function parseImport(text: string, today = startOfToday()): ImportResult {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, error: "That file isn't valid JSON." };
  }
  if (!parsed || typeof parsed !== 'object') {
    return { ok: false, error: "That file doesn't look like a Tiny Budget export." };
  }
  const envelope = parsed as { version?: unknown; budget?: unknown; name?: unknown };
  if (
    typeof envelope.version !== 'number' ||
    !envelope.budget ||
    typeof envelope.budget !== 'object'
  ) {
    return { ok: false, error: "That file doesn't look like a Tiny Budget export." };
  }
  if (envelope.version > CURRENT_VERSION) {
    return { ok: false, error: 'That file was made by a newer version of Tiny Budget.' };
  }
  // readBudget falls back to an empty budget for anything it can't parse, so a
  // file that reads as blank but wasn't is a failure, not an import.
  const budget = readBudget(envelope, today);
  const looksEmpty =
    budget.expenses.length === 0 &&
    budget.incomes.length === 0 &&
    budget.oneOffs.length === 0 &&
    budget.currentBalance === 0;
  const sourceHadContent = JSON.stringify(envelope.budget).length > 80;
  if (looksEmpty && sourceHadContent) {
    return { ok: false, error: "That file couldn't be read as a budget." };
  }
  const name =
    typeof envelope.name === 'string' && envelope.name.trim() ? envelope.name : 'Imported budget';
  return { ok: true, name, budget };
}

/** The envelope both clients write, so an export from either imports into either. */
export function buildExport(name: string, budget: Budget): string {
  return JSON.stringify(
    { app: 'tiny-budget', version: CURRENT_VERSION, exportedAt: new Date().toISOString(), name, budget },
    null,
    2,
  );
}
