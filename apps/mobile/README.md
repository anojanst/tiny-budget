# Tiny Budget — mobile

The phone client. Same money engine as the web app, different interface.

```bash
npm install          # from the repo root; this is an npm workspace
npm run mobile       # Expo dev server; press i / a, or scan with Expo Go
```

`npx expo start --web` also runs it through react-native-web, which is handy
for checking layout quickly but is not what ships.

Releases are built and published free by GitHub Actions — see
[DISTRIBUTING.md](DISTRIBUTING.md).

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

Money in and money out get a tab each. They shared one page at first, which
meant scrolling past your wages to reach your rent and reading two opposite
kinds of figure in one column. Split, each side carries its own totals at the
top — and the one-off form loses its direction toggle, because the page
already says which way the money goes. A toggle left unpressed filed a
purchase as a windfall, which the calendar then added to your balance.

The tab bar fills its icon in when selected rather than only recolouring it,
by appending `-outline` for the unselected state. Not every glyph has an
outline twin: `cash-plus` has none, and asking for `cash-plus-outline` drew a
literal "?" in the bar. `TabIcon` now checks before appending, and
`icons.test.ts` checks every icon name in the app against the font binary's
own character map — the JSON glyph map that ships beside it lists names the
font cannot draw, so it cannot be the thing you verify against.

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

Under the headline the hero carries one bar: the month's outgoings measured
against the month's income, with the margin named underneath. A per-day
balance chart sat here first and was removed — the calendar grid directly
below already says what the balance does day by day, and says it better,
because there a shortfall has a date you can point at. The question the grid
*cannot* answer is whether the month covers itself at all, so that is the one
this answers. One fact, one shape.

The track fills against income, or against outgoings in a month with no pay,
so a month of bills and no wages reads as completely full rather than empty.

## Dates are picked, never typed

Every date is stored as `yyyy-mm-dd`, which is the right thing to store and
the wrong thing to ask someone to type on a phone. A mistyped date does not
error — it silently moves a bill, and the projection quietly becomes wrong.
`DateField` shows the date the way people read one and hands back the format
the store wants, so the two never have to agree in a user's head.

The picker itself is platform-split. `@react-native-community/datetimepicker`
ships no web build — the module it falls back to renders `null` and logs a
warning — so on the web the field drew correctly and tapping it opened
nothing. `DateField.web.tsx` reaches for the browser's own picker instead,
through an invisible `<input type="date">` laid over the control and opened
with `showPicker()`; clicking a date input only moves between its day/month/
year segments, so the press handler has to call that method explicitly. Both
files share `dateFieldShell.tsx`, so the two differ in mechanism only and the
control cannot drift into looking like two different things.

Recurring entries ask for the date **in the add form**, not only in the row
that appears afterwards. It stays optional, because undated is a real state
here and not an empty field waiting to be filled — but asking later meant
most entries never got one, and the calendar stayed a drip instead of a
schedule. One-off dates are required: a one-off *is* its date.

## Backup runs both ways

Export writes a real `.json` file and shares that, rather than sharing the
JSON as a message — a message can only be pasted back, while a file can be
picked up again by Import, or opened by the web app. Import takes any file
and lets `parseImport` judge it, because a picker that refuses the user's
actual backup is worse than one that lets them pick the wrong file.

Both sides live in `@tiny-budget/core` (`buildExport` / `parseImport`), so a
phone export opens on the web and a web export opens on the phone by
construction rather than by agreement. An import always arrives as an
*additional* budget; nothing already on the phone is replaced.

## The one hazard worth knowing

AsyncStorage reads are asynchronous, so the first render holds the *default*
budget. Writing that back before the stored value arrives would erase
everything on every cold start. `usePersistentState` therefore persists
nothing until the initial read completes, and skips the write when the value
still matches what is on disk. `usePersistentState.dom.test.tsx` pins both;
removing the guard fails it.
