# tiny-budget

A weekly budget tuner for getting out of debt and building savings. Enter what
you earn and spend, list your debts, and see exactly when you'll be debt free —
then set savings goals for what comes after.

Everything runs in the browser and persists to `localStorage`. No backend, no
accounts, no data leaves the machine.

## Features

- **Guided setup** — a five-step intake asks for income, cash on hand,
  expenses, and debts before dropping you on the dashboard, so you're never
  staring at an empty screen wondering where to start.
- **Debt snowball** — the Ramsey method. Debts are ordered smallest balance
  first, every minimum gets paid, and every spare dollar attacks the top debt.
  When it clears, its payment rolls into the next one — the payment snowballs.
  A debt is just two numbers: what you owe and the least you must pay each
  week. Interest isn't asked for, because a real minimum payment already covers
  it — so the balance is simply paid down.
- **Debt-free date** — the headline number: when you're out, and what you'll
  have paid to get there.
- **Debt vs. savings dial** — saving while you owe money is allowed, but never
  silent. Move the dial and it tells you exactly how many weeks it adds to your
  debt-free date. Defaults to $0.
- **Honest about shortfalls** — if your leftover can't cover your minimum
  payments, the app says so and refuses to project a payoff date you can't hit.
- **Six themes** — one hue drives the brand colour, the greys, the borders and
  the chart palette together, so the whole app changes tone rather than just
  the buttons.
- **Several budgets at once** — a household, a flat, a what-if. Switch from the
  sidebar; each keeps its own income, expenses, debts and goals. Manage, rename
  and delete them in Settings.
- **Export and import** — a budget as a JSON file you can back up or carry to
  another browser. Importing opens the file as an *additional* budget, so it
  never overwrites what you already have. Exports from older versions still
  open; they're migrated on the way in.
- **Weekly-normalized budgeting** — mix weekly and monthly amounts; everything
  is converted to a common weekly basis (`52 / 12` weeks per month).
- **Priority waterfall for goals** — give each goal a priority number (lower
  funds first). Goals sharing a number split the leftover evenly; a tier only
  starts receiving money once every goal ahead of it is fully funded, and a
  goal's share redistributes to the rest of its tier the moment it completes.
- **Every penny goes to goals** — the current balance is spent first (instantly),
  then the ongoing weekly leftover. "Free each week" reads $0 until the last
  goal is funded, which is the point.
- **Time machine** — pick any future date and see the projected balance, split
  into what's free vs. what's committed to goals.
- **Live charts** — a pie of where income goes, and a stacked-area projection
  where each goal is its own band that visibly flattens the week it's funded.

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
| `npm test` | Unit tests for the budget/waterfall math (Vitest) |
| `npm run lint` | Oxlint |

## Layout

```
src/
  lib/budgetMath.ts     pure budget + priority-waterfall math (unit tested)
  lib/debtMath.ts       pure debt-snowball simulation (unit tested)
  lib/dates.ts          local-date parsing/formatting helpers
  hooks/useBudget.ts    persisted budget state + versioned migrations
  hooks/useTimeMachine.ts  the shared "what if I wait until X" horizon
  hooks/useOnboarding.ts   first-run setup flag
  hooks/useHashRoute.ts    tiny hash router (no dependency)
  pages/                one file per screen
  components/shell/     sidebar, mobile nav, page header
  components/           widgets
  components/ui/        shadcn/ui primitives
```

The app is split across five screens — Overview, Debts, Budget, Goals,
Settings — rather than one dense dashboard. Each screen holds only the widgets
that screen is about, so nothing has to scroll inside its own card: the page
scrolls, the widgets don't.

Both math modules are pure functions with no React imports, so the waterfall and
snowball behaviour are covered by tests independently of the UI.

### How the money splits

With no debts, nothing has changed: the weekly leftover and your balance fund
savings goals by priority. With debts, minimums come off the top, and what's
left is split by the dial — everything to the snowball by default. Your cash on
hand attacks debts first, and only reaches goals once every debt is cleared.

Goal math is solved in closed form because nothing compounds. Debt math is
simulated week by week because interest does — see the header comment in
`debtMath.ts` for why the closed-form version was rejected.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · Vitest
