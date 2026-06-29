# apps/web — Design Notes

Visual direction for the Stage 3 builder + live sheet. Established with the
`frontend-design` skill (a deliberate art direction, not a template default).

## Subject & job

A Pathfinder 1e **character builder** whose center of gravity is *play at the
table*. The page's single job: make build choices and watch every derived number
recompute — correctly, with its provenance visible. The product's real claim is
"it knows the rules," so the design makes **the math and its sources the hero.**

## Direction: "Illuminated ledger"

A scribe's nighttime accounting of a hero — a dark workbench with illuminated
gold. Chosen specifically to avoid the three generic AI-design defaults:

- not the cream + high-contrast-serif + terracotta look,
- not near-black with a single acid-green/vermilion accent,
- not a hairline broadsheet.

Instead: a **dark, panelled, gilded** sheet that reads at a dim table, with
tabular ledger numerals because a character sheet is, fundamentally, a ledger.

### Color (named tokens — see `src/styles.css`)

| token        | hex       | role                                         |
|--------------|-----------|----------------------------------------------|
| `--bg`       | `#15171c` | iron-gall ink background                      |
| `--surface`  | `#1d2027` | raised panel                                 |
| `--surface-2`| `#23262f` | inset / controls                             |
| `--line`     | `#33373f` | hairline rules                               |
| `--ink`      | `#e8e3d6` | warm bone text (parchment ink, reversed)     |
| `--muted`    | `#9a9488` | secondary text / labels                      |
| `--gold`     | `#c9a227` | illuminated accent — key numbers, active     |
| `--gold-2`   | `#e8c34a` | bright gold highlight                        |
| `--oxblood`  | `#b04a37` | blocked / errors / danger                    |
| `--sage`     | `#88a06a` | met prerequisites / valid                    |

### Type

- **Display — Fraunces**: an old-style serif with optical "wonk" and soft
  serifs. Used with restraint: character name, section headings. Not the usual
  Playfair/Cormorant default.
- **Body — Public Sans**: clean humanist sans for labels and prose (not Inter).
- **Data — IBM Plex Mono** with tabular figures: *every number on the sheet.*
  The ledger feel is the subject-driven choice — numbers line up like accounts.

### Signature element

**The seal + provenance reveal.** Each core derived stat (AC, HP, saves, BAB,
CMB/CMD, attacks, skills) is a gilded "seal" showing the big tabular total.
Expanding a seal unrolls its **modifier breakdown straight from `compute()`'s
per-source provenance** — each contributor labelled, with overridden
(non-stacking) bonuses struck through. The differentiator (knowing *why* a
number is what it is) is the memorable interaction; everything else stays quiet.

## Restraint

Boldness is spent only on the gold seals + provenance. Panels are hairline-ruled
and calm. Quality floor: responsive to mobile, visible keyboard focus,
`prefers-reduced-motion` respected.
