# apps/web — Design Notes

Visual direction for the character builder and live sheet.

## Subject & job

Ledgermain is a Pathfinder 1e character sheet for use at the table. A player
should be able to read a number, change the state that drives it, and check
where it came from without leaving the sheet.

## Direction: "Illuminated ledger"

An illuminated ledger, not a fantasy dashboard. Use flat ink surfaces and
hairline rules to separate entries. Let the serif titles carry the character
of the page, and set figures in tabular mono so they scan down a column.

### Color (named tokens — see `packages/tokens/tokens.css`)

| token         | hex       | role                                     |
| ------------- | --------- | ---------------------------------------- |
| `--bg`        | `#15171c` | iron-gall ink background                 |
| `--surface`   | `#1d2027` | raised panel                             |
| `--surface-2` | `#23262f` | inset / controls                         |
| `--line`      | `#33373f` | hairline rules                           |
| `--ink`       | `#e8e3d6` | warm bone text (parchment ink, reversed) |
| `--muted`     | `#a49e91` | secondary text / labels                  |
| `--gold`      | `#c9a227` | illuminated accent — key numbers, active |
| `--gold-2`    | `#e8c34a` | bright gold highlight                    |
| `--oxblood`   | `#b04a37` | blocked / errors / danger                |
| `--sage`      | `#88a06a` | met prerequisites / valid                |

### Type

- **Display — Fraunces**: an old-style serif with optical "wonk" and soft
  serifs. Used with restraint: character name, section headings. Not the usual
  Playfair/Cormorant default.
- **Body — Public Sans**: clean humanist sans for labels and prose (not Inter).
- **Data — IBM Plex Mono** with tabular figures: _every number on the sheet._
  The ledger feel is the subject-driven choice — numbers line up like accounts.

### Signature element

**The seal + provenance reveal.** Each core derived stat (AC, HP, saves, BAB,
CMB/CMD, attacks, skills) is a gilded "seal" showing the big tabular total.
Expanding a seal unrolls its **modifier breakdown straight from `compute()`'s
per-source provenance** — each contributor labelled, with overridden
(non-stacking) bonuses struck through. The differentiator (knowing _why_ a
number is what it is) is the memorable interaction; everything else stays quiet.

## Restraint

Gold marks the current place, key totals, and controls that affect play. Keep
routine panel headers and secondary actions neutral so a gold cue means
something. Use sentence case and the body face for navigation and controls;
reserve small mono labels for the sheet's keys and section legends.

Lead Play with HP and running effects. Keep catalog results out of the way
until requested, and keep less frequent actions like New day in the chrome,
not in front of those numbers. On phones, HP, AC, saves, initiative, and the
round clock stay together above the section rail. Preserve visible keyboard
focus, comfortable touch targets, and reduced-motion behavior.
