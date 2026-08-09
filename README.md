# tiny-budget

A weekly budget tuner. Enter what you earn and spend, set savings goals with
priorities, and see in real time when each goal lands — plus what your balance
looks like at any future date.

Everything runs in the browser and persists to `localStorage`. No backend, no
accounts, no data leaves the machine.

## Features

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
  lib/dates.ts          local-date parsing/formatting helpers
  hooks/useBudget.ts    persisted budget state + versioned migrations
  hooks/useTimeMachine.ts  the shared "what if I wait until X" horizon
  components/           dashboard widgets
  components/ui/        shadcn/ui primitives
```

The math lives in `budgetMath.ts` as pure functions with no React imports, so
the waterfall behaviour is covered by tests independently of the UI.

## Stack

Vite · React 19 · TypeScript · Tailwind CSS v4 · shadcn/ui · Recharts · Vitest
