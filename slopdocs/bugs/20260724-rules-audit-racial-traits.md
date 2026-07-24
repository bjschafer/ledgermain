# Rules-correctness audit: races + racial traits catalog (part 10 — final)

Audited 2026-07-24 (second wave). Opus subagent extracted races.json (80
races), racial-traits.json (860 entries, 252 with numeric changes), and the
hand-authored racial-traits.ts table; Fable verified applied numbers against
RAW. Siblings: parts 1–9. **Applied numbers all correct; findings are
structural gaps + one dead change target.** **All 3 FIXED 2026-07-24**
(finding 3 commit 8d57fe2, finding 1 commit 0507b60 — most of the
SR pipeline already existed via issue #21; the real dead spots were
`@details.level.value` missing from rollData, leaving Drow Noble flat at 11,
and svirfneblin SR being prose-only in vendored data, now supplemented as
`11 + @attributes.hd.total`). Finding 2 was the deferred one and took its own
pass: senses are now a first-class `DerivedSheet.senses` line fed by a
`sense*` change family, and all 70 races with a Senses racial trait carry
their darkvision/low-light/scent/blindsense/see-in-darkness mechanically.

## Findings

### 1. `spellResist` change target is parsed but never applied (dead-target family)

- Drow Noble (`11 + level`), Svirfneblin, Dwarf Magic Resistant / Half-Elf
  vendored traits (`5/6 + HD`) all carry `spellResist` changes; compute()
  ignores the target entirely (`races-other.test.ts:132-151` pins the
  no-throw/no-apply behavior). The sheet has no SR line at all, so a
  svirfneblin's signature SR silently vanishes.
- Same family as part 8's `carryMult`/`carryStr`: data + label exist,
  consumer doesn't. Fix shape: add an SR line to DerivedSheet fed by a
  `spellResist` stack (buffs.json's Spell Resistance spell buff `12 + CL`
  would light up too).

### 2. Race-level senses are prose-only — and now inconsistent with traits

- No race in races.json encodes darkvision/low-light mechanically (45 races
  mention darkvision in description text only), BUT 16 vendored alternate
  traits DO encode `sensedv` (60/90/120 ft), plus scent/tremorsense. Result:
  a half-orc who takes Acute Darkvision shows a 90-ft darkvision line while
  a stock half-orc shows no senses at all — backwards-feeling UX and an
  audit trap. Fix shape: either supplement races with `sensedv`-style
  changes or surface description-derived sense lines.
- FIXED: `DerivedSheet.senses` (engine `senses.ts`) resolves the whole
  `sense*` family highest-range-wins with provenance, and
  `SUPPLEMENTAL_RACE_SENSES` mechanizes each race's own description prose for
  all 70 races that have a Senses racial trait (the other 10 genuinely have
  none — pinned by `raceSenses.test.ts`, which also fails if a race grows
  sense prose that the table doesn't cover). Adds `sensell`/`sensesid` as
  this engine's targets for the two senses Foundry models as booleans.
  Situational senses (Adaro underwater Keen Scent, Cecaelia's concentration-
  gated blindsight, Skinwalker bestial-form darkvision) are deliberately left
  as prose. Shifter Bat/Wolf and vigilante Shadow's Sight now grant their
  flat sense values too — their old "resolves by lowest-value" caveat was
  describing behavior that no longer exists. Uncovered en route: `ifelse`
  (a real Foundry roll function) was missing from the formula evaluator, so
  6 vendored buff changes — Evil Eye's four penalties and Animal Focus
  (Bat)'s darkvision among them — were silently dropped; now supported.
  Still missing from the evaluator: `lookup` (9 buff formulas), `sizeRoll`
  (7), `clamped` (1), `mins` (1).

### 3. Planetouched energy resistances unmodeled

- Aasimar (acid/cold/elec 5), Tiefling (cold/elec/fire 5), Ifrit/Oread/
  Sylph/Undine (element 5) — all prose-only. The engine renders eres.\* lines
  (archetype-extracted entries use them), so the data model supports it;
  the races just don't carry the changes. Supplement candidate. (Pairs with
  part 8's note that Resist Energy buffs are also empty — one eres pass
  would fix both.)

## Verified correct (don't re-audit)

- All applied race numbers: ability changes (tiefling/kobold/oread fixtures
  exact), natural armor (kobold/nagaji/merfolk/etc.), svirfneblin +2 dodge,
  sizes (13 small, 2 large), speed table (20-ft races incl. slow-and-steady
  dwarves; merfolk 5 land/50 swim; strix fly 60; grippli/vanara climb 20).
- Slow and Steady: dwarf/duergar exempt from armor + encumbrance speed
  reduction, baked into base 20 (no double-penalty) — exact.
- Hand-authored alternates (8 races, 21 traits): every bonus and every
  suppression verified (Fleet-Footed +2 init suppressing Keen Senses' +2
  Perception; Sacred Tattoo +1 luck saves; Dual Minded +2 Will; Outrider/
  Practicality sure-footed swaps; Sylph Like the Wind +5 speed; Whispering
  Wind +4 Stealth; Storm in the Blood 2 hp × HD/day pool scaling with
  CHARACTER level). Steel Soul / Eternal Hope deliberately displayOnly
  (situational) — correct honesty call.
- Vendored trait numeric changes: sense ranges match RAW where checkable
  (Acute Darkvision 90, Minesight 90), init/save/CMD-family bonuses match,
  open "choose one" changes correctly inert until targeted, SLA `uses`
  pools (1/day, Cha-gated 4-ceiling shapes) derive correctly.
- Honesty postures confirmed as documented: situational save bonuses
  (Hardy, elf vs enchantment, android) are contextNotes, never stacked;
  vendored traits never auto-suppress replaced standard traits (UI reminder
  only) — known, documented limitation, distinct from the hand table's real
  suppression for the 8 covered races.

## Gaps (absent, not wrong)

Low-light vision entirely unrepresented even in traits (fixed with finding 2 —
`sensell` is now a target and 38 races carry it); Dual Minded doesn't
suppress Multitalented's second favored class (soft); 592 display-only
vendored trait entries are picker-visible prose (by design); heritage
variants (134) ride the same non-suppressing posture.
