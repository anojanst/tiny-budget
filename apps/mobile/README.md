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

Light and soft by default. White cards on a pale blue ground, a brand field
across the top, pastel washes behind icons, and generous radii — saturation is
spent only where it carries meaning rather than spread across the screen.

Four structural rules do most of the work, and getting them wrong is what made
earlier passes feel flat however the palette was tuned:

1. **Cards float.** Soft shadow on a tinted ground, never a hairline border —
   an outlined box reads as a form field, everything at one depth.
2. **The brand field has size.** A strip behind a heading is a header; a field
   with room to breathe is something the hero card can sit *into*.
3. **Every group is a card**, including the row of quick actions. Controls
   loose on the page background look unfinished next to controls on a surface.
4. **List rows have an icon disc**, a name over its date, and the figure held
   right — so a list is two scannable columns rather than a line of prose per
   row.

The headline figure stays near-black unless it is genuinely negative. Colouring
a large number makes every glance feel like an alarm; the state belongs on the
pill beside it, which says the thing in words anyway.

The headline figure keeps three states on one scale, as tints rather than
alarms. This app regularly tells people they run out of money on the 14th, so
that state is common rather than exceptional and should read clearly without
shouting:

| Lowest point | Reads as | Says |
| --- | --- | --- |
| Comfortably clear | mint | just the date |
| Under a week of bills | peach | "Under a week's bills" |
| Below zero | rose | "You run out" |

The middle state is the one that earns its place: an all-or-nothing red can
only speak once it is too late to move anything.

Colour has one job each. Blue is the brand and every selected control; mint
means money arriving; peach and rose mean the balance is thin or gone. A
selected chip is never mint, because mint already means something else.

The hero charts the month's balance as one bar per day, measured from a zero
line. A smoothed line was tried first and rejected: a balance only moves on
the days something happens, so a spline invents a gentle slope across flat
stretches and implies amounts the balance never held. Bars say what is true —
this is what you have at the end of each day — and days in the red hang below
the line, so a shortfall has a shape and not only a hue. The day you are
lowest is the single bar drawn at full strength; the rest step back.

Bar width is a proportion of the slot rather than fixed, because late in a
month only a week remains and fixed-width bars read as a few stray marks
instead of a series.

## The one hazard worth knowing

AsyncStorage reads are asynchronous, so the first render holds the *default*
budget. Writing that back before the stored value arrives would erase
everything on every cold start. `usePersistentState` therefore persists
nothing until the initial read completes, and skips the write when the value
still matches what is on disk. `usePersistentState.dom.test.tsx` pins both;
removing the guard fails it.
