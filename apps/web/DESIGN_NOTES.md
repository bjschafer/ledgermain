# apps/web — Design Notes

Visual direction for the character builder, live sheet, and reference site.

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

**Boxed stats + provenance.** Use colored labels to find the right group and
stat in the side sheet. The full Hit Points box is a gauge: its fill recedes
with damage and turns red at low HP. Keep Armor Class prominent and let
color and a marker flag changed values. A chevron identifies entries that
expand into a modifier breakdown from `compute()`'s per-source provenance.
Give successive attack bonuses room to read as a sequence.

## Restraint

Use gold-tinted panel headers with an ink title and a gold bottom rule so
players can find sections in the main column. Keep secondary actions neutral.
Use sentence case and the body face for navigation, controls, and sheet
headings; reserve small mono labels for the individual stat keys.

Leave the wordmark on its own on wide screens. Center primary navigation
when there is room, and anchor the character picker at the outer right edge
so it stays put when account status changes. On phones the wordmark and
picker share the top row, with utilities and navigation below. The reference
site uses Search and Summons in place of character modes. Both apps share
the palette and type stack in `@pf1/tokens`.

Lead Play with HP and running effects. Keep catalog results out of the way
until requested, and keep less frequent actions like New day in the chrome,
not in front of those numbers. On phones, HP, AC, saves, initiative, and the
round clock stay together above the section rail. Preserve visible keyboard
focus, comfortable touch targets, and reduced-motion behavior.
