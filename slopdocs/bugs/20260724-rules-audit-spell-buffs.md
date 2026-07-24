# Rules-correctness audit: vendored buffs + extracted feat effects (part 8)

Audited 2026-07-24 (second wave). Full dump of `buffs.json` (185 entries)
verified inline against RAW spell/feature text; `feat-effects-extracted.ts`
(13 entries) extracted by Opus subagent and verified. Siblings: parts 1–7.
**Nothing fixed yet.**

## Findings

### 1. `carryMult` / `carryStr` change targets are dead — Ant Haul does nothing

- `targets.ts:142-143` labels both as "carrying capacity" (so the buff editor
  shows them as real), but NO consumer exists — `encumbrance.ts`/`compute.ts`
  never read either target. Ant Haul (`carryMult 2`), and Enlarge/Reduce
  Person's `carryStr ±2` / `carryMult ±0.5`, silently no-op.
- Second-order bug for when it IS wired: vendored Ant Haul says ×2; RAW Ant
  Haul TRIPLES carrying capacity. Also note the Enlarge Person values use
  Foundry's multiplier semantics (−0.5 meaning ×0.5?) — pin down semantics
  before consuming.
- Fix shape: either consume the targets in `computeEncumbrance` (multiplier
  product + effective-Str adjustment, correcting Ant Haul to ×3 via
  supplement) or strip the label so the UI stops implying it works.

### 2. Temp-HP-granting spells omit their temp HP (same class as unchained rage)

- Divine Power: RAW also grants +1 temp HP per CL — formula is dice-free and
  modelable; vendored buff has attack/damage/Str-checks only.
- Greater Heroism: RAW also grants temp HP = CL (max 20). Absent.
- Aid: RAW grants 1d8+CL temp HP — dice-based, so a static change can't carry
  it, but a context note should (currently silent).
- (Part-5 finding 1, unchained rage 2/HD, is the big sibling of this family.)

### 3. Stoneskin models nothing

- Vendored Stoneskin has `changes: []` — RAW DR 10/adamantine. The engine
  already renders DR lines (barbarian DR, Resiliency judgment `dr.magic`), so
  a `dr.adamantine` change is expressible today. Currently the buff toggles
  and displays with zero effect.

## Checked and found CORRECT (don't re-audit) — buffs.json highlights

Ability buffs ±4 enh (Bear's/Bull's/Cat's/Eagle's/Fox's/Owl's); Barkskin
clamp(2+(CL−3)/3, 2, 5) enh-to-NA; Shield of Faith 2+min(3, CL/6) deflection;
Divine Favor clamp(CL/3,1,3) luck atk/dmg; Divine Power min(6, CL/3) luck
atk/dmg/Str-checks/Str-skills; Magic Vestment min(5, CL/4) enh armor; Mage
Armor +4 armor(base); Shield +4 shield(base); Bless/Aid +1 morale attack
(situational vs-fear halves omitted by design); Heroism ±2 / Greater +4
morale atk/saves/skills; Prayer ±1 luck/penalty 4-target pairs; Rage spell
+2/+2/+1 morale −2 AC; Haste +1 attack/AC/Reflex (pseudo-type "haste",
stacking-safe) + enh speed min(base, 30) — the max-double-base rule done
right; Slow mirror (−1s, half speed with 5-ft floor); Fly +CL/2 Fly skill +
60/40 ft armor-and-load-gated fly speed; Inspire Competence clamp((CL+5)/4,
2,6); Longstrider +10 (Greater +20/+10 others); Enlarge/Reduce ±2 Str/Dex
size-typed + size step; Evil Eye −2/−4-at-8th; witch/hex, judgment, stance
(unchained barbarian stance rage powers incl. Calm Stance's exact rage-
negation mirror), mutagen (+4 alch/−2 partner/+2 NA), Fighting Defensively
−4/+2 and Total Defense +4 WITH the 3-ranks-Acrobatics +1/+2 upgrades
(obscure rule, correctly modeled!), Resistance/Resistant Touch/Wrathful
Mantle/Ward resistance-save shapes, Spell Resistance 12+CL, Spider Climb/
Touch of the Sea/Ape Walk speeds, Darkvision 60/120, True Seeing 120,
Justice's 10th-level crit-confirm doubling (models the upgrade the hand
judgments table only notes as prose).

## Extracted feat effects: ALL 13 CLEAN

9 APG skill-pair feats with the exact +2/+4-at-10-ranks scaling (Acrobatic,
Athletic, Deceitful, Animal Affinity, Deft Hands, Magical Aptitude,
Persuasive, Self-Sufficient, Stealthy — pairings all correct); Intimidating
Prowess +Str-mod to Intimidate; Greater Weapon Focus +1 / Greater Weapon
Specialization +2 (untyped, stacking with their base feats — correct);
Master Craftsman +2 chosen skill (partial model, medium confidence, no-ops
without a stored choice). Zero hand/extracted collisions; hand-wins
precedence verified by synthetic fixture.

## Gaps (absent, not wrong)

Resist Energy / Protection From Energy / Stoneskin-family carry no
resistances (energy-resistance display lines absent engine-wide); False Life
not vendored as a buff at all; Invisibility/See Invisibility display-only
(fine); "haste" pseudo-type undocumented in stacking.ts comment (behaviorally
benign — not in STACKING_TYPES so same-type dedup applies).
