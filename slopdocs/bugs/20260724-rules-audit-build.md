# Rules-correctness audit: character build rules + affliction edge cases (part 3)

Audited 2026-07-24 inline. Siblings: `20260724-rules-audit-derived-math.md`,
`20260724-rules-audit-spellcasting.md`. Scope: skill budget, feat slots (base
+ class bonus formulas), ability increases, point buy, traits/drawbacks, XP
tracks, favored-class bonuses, core race data spot-check, plus the
afflictions/negative-levels/duration models (folded in here; they came up
clean). **Nothing fixed yet.**

## Findings

### 1. Skill-point budget reads the FINAL derived Int mod (buffs included) — minor
- `apps/web/src/model/skills.ts:27` — `skillBudget(doc, refData, intMod)` is
  fed the derived sheet's Int mod (per its own doc comment, "so racial and
  item bonuses are included").
- RAW: retroactive skill ranks come only from PERMANENT Int increases;
  temporary bonuses (Fox's Cunning, alchemist's Cognatogen, any active buff
  that touches Int) grant no skill ranks.
- Repro: toggle a +4 Int buff in the tracker → builder skill budget grows by
  +2 ranks/level. Advisory-only (budget is soft), so low severity, but the
  number shown is wrong while any Int buff is active.
- Fix shape: feed a "permanent-only" Int mod (base + racial + level increases
  + permanent-flagged items) — needs a notion of permanence the collect
  pipeline doesn't currently tag, OR simply exclude `live.activeBuffs`-sourced
  Int deltas from the mod used here (headband items arguably SHOULD count —
  they're permanent-while-worn and PF1 headbands even grant ranks).

## Checked and found CORRECT (don't re-audit)
- Skill points: `max(1, class + Int) × level` per class, human +1/level via
  `bonusSkillRanks` change (with alternate-trait suppression), FCB "skill"
  +1 each, rank cap = character level (enforced in `setSkillRank`).
- Feat slots: base `ceil(level/2)` (odd levels) + human bonus (suppressed by
  Focused Study correctly). All vendored class `bonusFeats` formulas verified
  against published schedules: fighter `1+floor(L/2)` (1st, 2nd, every even),
  monk `1+floor((L+2)/4)` (1,2,6,10,14,18), wizard `floor(L/5)` (5/10/15/20),
  ranger style `floor((L+2)/4)` (2,6,10,14,18), sorcerer bloodline
  `floor((L-1)/6)` (7/13/19), magus `floor((L+1)/6)` (5/11/17), gunslinger
  `floor(L/4)`, warpriest/inquisitor/hunter teamwork `floor(L/3)`.
- Ability increases: `floor(totalLevel/4)` budget (4/8/12/16/20).
- Point buy: CRB purchase table exact (7:−4 … 18:17), budgets 10/15/20/25,
  out-of-range reported rather than extrapolated.
- Traits: two at creation; drawback unlocks exactly ONE bonus trait no matter
  how many drawbacks; same-category is a soft warning; trait bonuses typed
  `"trait"` (non-stacking, verified against stacking.ts).
- XP tracks: slow/medium/fast all match CRB Table 3-1 at every level.
- FCB: "hp" = +1 HP each (engine compute.ts:691), "skill" = +1 rank,
  "both" clearly marked house-rule; half-elf dual favored class modeled with
  double-count guard.
- Core race data: Dwarf/Elf/Gnome/Halfling ability mods + sizes correct;
  Human/Half-Elf/Half-Orc floating +2 as choice (no fixed changes).
- Afflictions (task 6, no findings): drain lowers score; damage/penalty shift
  the MODIFIER only by floor(points/2) (parity-safe even-subtraction with
  documented display simplification); Con damage → max HP − level×floor(dmg/2);
  negative levels −1 attack/saves/skills, −5 max HP each, temp+perm summed;
  ability-check/CL/spell-slot penalties are documented gaps; buff duration
  advance/expiry model trivially correct.

## Gaps (absent, not wrong)
FCB entries aren't validated against levels actually taken in the favored
class (builder UI gates it; a hand-edited doc could over-claim). Negative
levels: no "dies at negLevels ≥ HD" check. Skill budget: no per-level
spent-vs-earned tracking (single pooled budget).
