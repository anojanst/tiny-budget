# Money Ahead — mobile

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

Everything about money comes from `@money-ahead/core` and is byte-identical to
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

The headline is where the month **leaves** you — "By Nov 30 you'll have
$585" — because that is the question a budget cannot answer and this app
exists to. It used to lead with the lowest point instead, which announced a
floor you were falling toward even in a month with $1,200 of room.

Leading with the ending has one failure mode, and the card is built around
avoiding it: a month can end comfortably having gone under on the 3rd, and a
card reporting only the ending would read as fine right up until a payment
bounced. So the line beneath the figure is **not** a warning that appears when
things go wrong. It is always present, and it always describes the worst point
on the way:

| On the way | Reads as | Says |
| --- | --- | --- |
| Never lower than the ending | muted | "Never lower than this on the way" |
| Comfortably clear | muted | "Thinnest on Oct 3 — $6,105 left" |
| Under a week of bills | peach | the same line, coloured |
| Dips under, then recovers | rose | "Dips $155 under on Nov 3 before it recovers" |
| Ends under | rose | "Goes under on Oct 16, in 22 days" |

The middle state earns its place: an all-or-nothing red can only speak once it
is too late to move anything. The last two name the day it **first** crosses,
not the day it is lowest — once you are under you stay under until something
arrives, so the lowest point is usually just the end of the month, while the
first crossing is the day you can still act before.

That invariant is `summariseMonth` in `src/heroSummary.ts`, kept out of the
component so it can be tested. Removing the dip branch fails two tests.

Yellow and black, on warm white. Colour has one job each: yellow is the brand
and every selected control, mint means money arriving, peach and rose mean the
balance is thin or gone. A selected chip is never mint, because mint already
means something else.

Yellow is a **field** colour and never an ink. Black on yellow is 11.5:1;
yellow on white is 1.5:1 and cannot be read at all, which is what four places
in the app were doing when the brand was blue and the substitution looked
safe. `brandInk` — a dark amber — exists for those: the same identity, legible
where the yellow is not. Writing `color: p.brand` is almost always a mistake.

The state colours are darker than they look like they need to be, because the
line they colour is 12pt and the most important sentence on the screen is also
the smallest. Every foreground in the palette clears 4.5:1 against the surface
it actually sits on; `scripts/make-brand-assets.py` and the palette comments
carry the numbers.

The mark is the name, set in black on yellow: "MA" for the icon, and the same
mark with the name under it for the splash, so tapping the launcher opens on
the thing you tapped. Every image is generated by
`scripts/make-brand-assets.py` rather than drawn, so the yellow lives in one
line of Python instead of baked into a folder of PNGs nobody can edit.

Both are built around a mask. The launcher foreground is sized to the centre
66% Android guarantees, because everything outside that is croppable
decoration. The splash has the *same* constraint for a different reason:
Android 12 and later hand the drawable to the system splash, which clips it to
a circle of about two thirds the canvas. The first splash here was the
wordmark alone at full width and would have been cut through the middle of it.
The lockup is now built at its natural size and scaled so its **diagonal**
fits that circle — a box fits a circle when its diagonal does, not when its
width does.

That constraint also rules things out. There is no full-bleed splash on
Android 12+: the OS gives you a centred icon and a background colour, and
`enableFullScreenImage_legacy` is iOS-only. A scattered pattern across the
screen is not available, only a composition inside the circle.

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

Both sides live in `@money-ahead/core` (`buildExport` / `parseImport`), so a
phone export opens on the web and a web export opens on the phone by
construction rather than by agreement. An import always arrives as an
*additional* budget; nothing already on the phone is replaced.

## An empty budget is a different screen

A budget with nothing in it has nothing to draw, so it gets three questions
instead — cash on hand, one thing coming in, one going out. That is the same
condition for a fresh install, a budget you just created and one you just
cleared, so there is no "has this person been onboarded" flag to store,
migrate, or get wrong.

Nothing is written until the last step. Saving each answer as it was given was
the obvious design and it was wrong: the first answer makes the budget
non-empty, which is the very condition the flow is shown for, so it deleted
itself out from under you at step two. Holding the answers until the end keeps
"is this budget empty" true for the whole flow, which means the flag can be
derived rather than latched — and a latched flag is what made an earlier
version flash over real data on every launch, because AsyncStorage is read
asynchronously and for the first frames every budget looks empty.

## Deleting versus clearing

Deleting your only budget is refused, with a toast saying so. It used to be
obeyed by swapping in a fresh empty one, which afterwards is indistinguishable
from having cleared it — so two different intentions produced one result and
neither was named. Clearing is now its own action, and `removeBudget` in core
returns `null` rather than emptying the list.

Refusing matters more than it looks: `readStore` repairs an empty list by
inventing a budget, so a delete that emptied it would come back as a nameless
new one and look like it had worked.

## The one hazard worth knowing

AsyncStorage reads are asynchronous, so the first render holds the *default*
budget. Writing that back before the stored value arrives would erase
everything on every cold start. `usePersistentState` therefore persists
nothing until the initial read completes, and skips the write when the value
still matches what is on disk. `usePersistentState.dom.test.tsx` pins both;
removing the guard fails it.
