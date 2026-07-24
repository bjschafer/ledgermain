# Rules-correctness audit: combat mechanics (part 4)

Audited 2026-07-24 — Opus subagent extracted implemented-rule claims
(natural-attacks.ts, monk.ts, polymorph.ts, two-weapon-fighting.ts,
weapon-groups.ts, tables.ts flurry/weapon-training + tests); Fable main loop
verified every claim against RAW (Elemental Body II table verified by fetch).
Siblings: parts 1–3 in this directory. **All 3 FIXED 2026-07-24**
(findings 1–2 commit fe1067c; finding 3 via supplements, commit 8d57fe2).
Flurry label now derives from monk-level-as-BAB iteratives and reproduces all
six published anchors; classifyNaturalAttacks keys on total attack count and
carries a strMultiplier (1.5 for a sole attack, bonus-only) consumed by
naturalAttackDamageBonus — the pony/companion pinning tests were corrected.

## Findings (implemented-but-wrong, ranked)

### 1. Chained monk flurry display is wrong in both count and comment — 3.5e rules leaked in

- `packages/engine/src/tables.ts:1244-1265` (`flurryOfBlowsLabel`).
- Two defects:
  a. The doc comment asserts "the SRD actually reduces the flat -2 penalty to
  -1 at monk level 11 and drops it entirely at level 16" — that is the
  **D&D 3.5 monk** progression. PF1 chained flurry keeps the −2 at every
  level (published flurry column is always monk level − 2: L11 +9/+9/…,
  L16 +14/+14/…).
  b. The attack-count schedule (2 at L1-7, 3 at L8-14, 4 at L15+) misses that
  monk-level-as-BAB generates its own iteratives at effective BAB 6/11/16.
  Real chained totals: 2 (L1-5), 3 (L6-7), 4 (L8-10, ITWF-style extra),
  5 (L11-14), 6 (L15), 7 (L16-20). Published anchors: L6 +4/+4/−1,
  L8 +6/+6/+1/+1, L11 +9/+9/+4/+4/−1, L15 +13/+13/+8/+8/+3/+3,
  L20 +18/+18/+13/+13/+8/+8/+3.
- Display-only (flurry is deliberately not wired into live iteratives), but
  the displayed count is wrong from L6 on and the comment plants a false rule
  for future implementers. Unchained flurry (tables.ts:1360) is CORRECT
  (1 extra at full BAB, 2 extra at L11+, no penalty).
- Pinning test `unarmedStrike.test.ts:71-93` encodes the wrong counts.

### 2. Multi-count single-kind natural attacks wrongly classified primary

- `packages/engine/src/natural-attacks.ts:106-109` — `distinctNames.size <= 1`
  → every entry primary, explicitly "regardless of name or count".
- RAW (UMR): "If a creature has ONLY ONE natural attack, it is always made
  using the creature's full base attack bonus and adds 1-1/2 times the
  Strength bonus." One attack, not one _kind_. A creature with two hooves and
  nothing else keeps them SECONDARY (−5, half Str) — see the Bestiary pony:
  "2 hooves –3" = BAB 1 + Str 1 − 5.
- Fix shape: the always-primary upgrade applies only when total attack count
  (sum of counts) is exactly 1; and that single attack should then also get
  the ×1.5 Str rider (currently a separately documented gap,
  natural-attacks.ts:32-40).
- Pinning test `natural-attacks.test.ts:11-18` (two "Hoof" entries → both
  primary) encodes the misreading.

### 3. Vendored brawler "AC Bonus (BRA)" formula off by one at L4 and L17

- Vendored `class-features.json` formula `clamp(floor((@class.unlevel-1)/4),0,4)`:
  gives +0 at L4 (RAW: +1 from 4th) and +4 at L17 (RAW: +4 arrives at 18th).
  Correct at 5-16 and 18-20. Already flagged as a quirk in
  `martialFlexibility.test.ts:48-87` but it IS a wrong number, reachable on a
  live sheet at those levels. RAW schedule: +1@4, +2@9, +3@13, +4@18 →
  supplements override candidate (e.g. `min(4, 1 + floor((L-4)/…))` — hand-fit:
  +1@4, +2@9, +3@13, +4@18 is irregular; use explicit tiers).

## Checked and found CORRECT (don't re-audit)

- Natural attacks: primary/secondary name table (bite/claw/gore/slam/sting/
  talon primary; hoof/pincer/tail-slap/tentacle/wing secondary); secondary −5
  (−2 with Multiattack); primary full Str, secondary HALF Str with penalties
  applied in FULL (correctly asymmetric — note compute.ts weapon damage got
  this same rule wrong, part-1 finding 3); multiple primary kinds all stay
  primary (bear Bite + 2 Claws).
- Polymorph: attack math (BAB + Str + size, −5 secondary, half-Str secondary
  damage); ALL Beast Shape I-IV / Plant Shape I-III / Elemental Body I-IV
  ability-score and natural-armor tables verified exactly (incl. Plant Shape
  Medium's odd +2 Con ENHANCEMENT — the published outlier — and EB II's
  3/5 NA split, verified via d20pfsrd fetch); EB III+ crit/sneak/bleed
  immunity, EB IV DR 5/—; tier menus cumulative for Beast/Plant Shape, one
  fixed size per EB tier; druid wild shape unlock ladder 4/6/8/10/12 with no
  Beast Shape IV ever.
- Monk: unarmed damage 1d6→2d10 Medium progression (shared by unchained —
  correct); monk AC bonus Wis + L/4 untyped to AC/touch/FF/CMD, lost with
  armor/shield/load; unchained chassis (full BAB, F/R good, W poor, d10, ki
  at 3rd = L/2+Wis, style strikes 1/round → 2 at 15th); bonus feat list
  tiers at 1/6/10 match RAW exactly.
- TWF module: −6/−10 base, light −4/−8, feat +2/+6, ITWF/GTWF off-hand
  [0,−5,−10] at full off-hand BAB, prereq gating (illegal feat = no effect),
  Double Slice ×1 Str off-hand, Rend/Defense reminder-only.
- Weapon training: tiers at 5/9/13/17, `1 + floor((L-grant)/4)` per pick
  (first group reaches +4 at 17), archetype suppression.
- Weapon groups: 15-group vocabulary + camelCase normalization + no
  double-apply on free-text/vendored overlap; missing "natural" and "siege
  engines" groups (gap, below).
- Martial flexibility: 3 + L/2 uses; borrowed feat applies real changes.
- Iteratives: sequence steps full attack total down by 5, cap 4, driven by
  BAB thresholds; haste/TWF/flurry explicitly out of scope.

## Gaps (absent, not wrong)

Single-natural-attack ×1.5 Str deliberately unmodeled (fold into finding 2's
fix); weapon-group vocabulary lacks "natural" and "siege engines"; chained
monk ki pool not compared here (class-features pass covers it); flurry not
wired into live attack table (documented scope decision).
