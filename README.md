# tiny-budget

A cash calendar. Enter what comes in and what goes out, give each one a date,
and see what you're actually left holding on any day of the month.

Everything runs in the browser and persists to `localStorage`. No backend, no
accounts, no data leaves the machine.

## The idea

Most budgeting tools answer "can I afford this on average". That question is
easy and not very useful: a budget that balances on average still leaves you
short the week a half-yearly insurance premium lands next to your rent.

This one answers "what will be in the account on the 14th". Money has dates,
so the calendar is the app — everything else exists to feed it.

## Features

- **The calendar** — a month grid of what lands when. Every pay is marked with
  the balance you're left holding once the bills in between have gone out, and
  any day that goes negative is flagged before you get there. The lowest point
  of the month is called out, because that is the number that actually bites.
- **Several income streams** — two jobs, a partner's wage, a rental. Each has
  its own cycle and its own payday, and each is named on the calendar so you
  can see which money landed.
- **Recurring payments** — rent, power, a loan repayment. Any of them can carry
  a next-due date and an end date. A loan is nothing more than this: an amount,
  a cycle, and a final payment, after which the calendar stops charging it.
- **One-offs, in and out** — a headphone bought this month, a tax refund
  landing next week. Single dated events that move cash on one day and are then
  over, so they never touch the weekly figures. A bonus that arrives once
  should not read as a permanent pay rise, and never counts as a payday.
- **Undated money is spread, not dropped** — anything without a date is spread
  evenly at its weekly rate rather than ignored, so an unconfigured calendar
  reads flat instead of bleeding to red. The app says how many entries are in
  that state, because dating them is what turns the shape of your month into
  its actual schedule.
- **Weekly normalisation** — mix weekly, fortnightly, monthly, quarterly,
  half-yearly and annual amounts; everything converts to a common weekly basis
  (`52 / 12` weeks per month) for the summary figures.
- **Several budgets at once** — a household, a flat, a what-if. Switch from the
  sidebar; each keeps its own income, payments and one-offs.
- **Export and import** — a budget as a JSON file you can back up or carry to
  another browser. Importing opens the file as an *additional* budget, so it
  never overwrites what you already have. Exports from older versions still
  open; they are migrated on the way in.
- **Six themes** — one hue drives the brand colour, the greys, the borders and
  the chart palette together, so the whole app changes tone rather than just
  the buttons.

## What happened to goals and debts

Earlier versions modelled debts with a Ramsey-style snowball and savings goals
with a priority waterfall. Both were retired: once every payment can carry a
date, a debt *is* a recurring payment with an end date, and a savings goal is a
dated payment you are building up to. Keeping separate machinery for them meant
two models of the same money that could disagree.

Nothing stored is discarded. Old budgets are converted on load:

| Was | Becomes |
| --- | --- |
| A debt with a minimum payment | A recurring payment, ending on the date it would be paid off |
| A debt with no agreed payment | A one-off payment for the balance, a month out |
| A goal with a deadline | A one-off payment on that date, for whatever is still to find |
| A goal with no deadline | The same, parked three months out |
| The single income figure | One pay stream, keeping its cycle and payday |

The trade-off is real and worth stating: you lose the automatic debt-free date
and the snowball's rolling payments. What you get back is one model instead of
three, and a payoff date you can *see* on a calendar rather than trust.

## Getting started

```bash
npm install
npm run dev
```

The dev server is noticeably slower than a real build (React's dev bundle plus
StrictMode double-rendering). To feel actual performance:

```bash
npm run build
npx vite preview
```

## Scripts

| Command | What it does |
| --- | --- |
| `npm run dev` | Vite dev server with HMR |
| `npm run build` | Typecheck (`tsc -b`) then production build |
| `npm run preview` | Serve the production build |
| `npm test` | Unit tests for the cashflow and migration logic (Vitest) |
| `npm run lint` | Oxlint |

## Layout

```
src/
  lib/calendar.ts       the dated cashflow projection (unit tested)
  lib/budgetMath.ts     frequency/weekly-rate primitives (unit tested)
  lib/dates.ts          local-date parsing, formatting and arithmetic
  hooks/useBudget.ts    persisted state + versioned migrations (unit tested)
  hooks/useHashRoute.ts tiny hash router (no dependency)
  pages/                Calendar, Money in & out, Settings
  components/shell/     sidebar, mobile nav, page header
  components/           widgets
  components/ui/        shadcn/ui primitives
```

`calendar.ts` and `budgetMath.ts` are pure functions with no React imports, so
the projection is covered by tests independently of the UI.

### How the projection works

Every entry is either **dated** or **undated**, never both. A dated entry lands
as a lump on its date and recurs from there; an undated one is spread evenly
across the days it covers. Counting an entry both ways would silently
double-charge exactly the bills someone took the trouble to date, so there is a
test pinning it.

Income and expenses share one type and one code path, differing only in which
list they sit in. That symmetry is load-bearing: an earlier version dated the
money going out but not the money coming in, and the balance could only ever
fall — every calendar rendered red regardless of how healthy the budget was.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Base UI · Vitest
