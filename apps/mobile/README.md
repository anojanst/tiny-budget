# Tiny Budget — mobile

The phone client. Same money engine as the web app, different interface.

```bash
npm install          # from the repo root; this is an npm workspace
npm run mobile       # Expo dev server; press i / a, or scan with Expo Go
```

`npx expo start --web` also runs it through react-native-web, which is handy
for checking layout quickly but is not what ships.

## What is shared, and what is not

Everything about money comes from `@tiny-budget/core` and is byte-identical to
the web app's: the dated cashflow projection, weekly normalisation, and the
migration chain that reads an old stored budget. Seeded with the same data,
both clients print the same figures — that is the point of the split, and the
reason a second implementation in another language was rejected.

What is *not* shared is anything platform-shaped:

| Concern | Web | Mobile |
| --- | --- | --- |
| Storage | `localStorage`, synchronous | `AsyncStorage`, asynchronous |
| Routing | hash router | `expo-router` file routes |
| Styling | Tailwind | `StyleSheet` + `src/theme.ts` |

## The interface is not the web layout shrunk

On the web the month grid carries figures inside its cells. At 375px a cell is
barely wider than its date, so here the grid is a **map** — dots for what
happens, a ring for today, a red wash for a day you run out — and the agenda
beneath it carries the detail. Tapping a day shows its balance.

Recurring entries collapse to one line each (name, next date, weekly cost) and
open on tap. Twenty expenses with five fields each is a wall; the summary line
is what people actually scan.

## Visual direction

The palette is a depth gauge rather than decoration. Most budgeting apps are
fintech blue — the colour of a bank rather than of your own money — and they
keep red for a rare error state. This app's most important screen is often the
one saying you run out on the 14th, so "running low" and "under" are
first-class colours sharing one scale with "fine": deep water, shallows,
aground.

The hero answers the question the app exists for — how low does this month get,
and when — and draws the curve that produces it, marking only the low point and
the waterline. Reference fintech kits chart a portfolio going up and to the
right; this one is honest about dipping, because the dip is the reason to open
the app.

Three states, one scale:

| Lowest point | Reads as | Wording |
| --- | --- | --- |
| Comfortably clear | tide green | just the date |
| Under a week of bills | shoal amber | "less than a week's bills left" |
| Below zero | aground red | "you run out" |

The middle state is the one that earns its place: a binary red can only tell
you after it is too late to move anything.

## The one hazard worth knowing

AsyncStorage reads are asynchronous, so the first render holds the *default*
budget. Writing that back before the stored value arrives would erase
everything on every cold start. `usePersistentState` therefore persists
nothing until the initial read completes, and skips the write when the value
still matches what is on disk. `usePersistentState.dom.test.tsx` pins both;
removing the guard fails it.
