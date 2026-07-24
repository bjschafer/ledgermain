# Rules-correctness audit: core derived math (packages/engine)

Part 1 of a multi-domain audit of the engine against actual PF1 RAW, motivated by
several caught instances of agents implementing from a wrong rules understanding.
This domain (core derived math: AC/CMB/CMD/attack/damage/stacking/tables/HP/
conditions/encumbrance) was audited 2026-07-23 by a subagent whose report was
recovered from session logs; every finding below was then re-verified 2026-07-24
against both the cited code and the RAW independently. All 7 findings are
confirmed real. **All 7 FIXED 2026-07-24** (commit e046168): each with
hand-computed pinning tests; the wrong tests noted below were corrected.
The Str-penalty-multiplier rule (finding 3) had a second, independent copy
in `apps/web/src/model/twf.ts` `offHandAbilityDelta` — fixed in the same
commit with its own test (apps/web/test/twf.test.ts).

Remaining domains (not yet audited): combat mechanics detail, core class
features, spellcasting, character build rules, occult/hybrid classes,
companions/eidolons/familiars, conditions/encumbrance edge cases. Audit those
before trusting them; file each domain's findings as a sibling doc.

## Confirmed findings (implemented-but-wrong, ranked)

### 1. Flat-footed AC incorrectly removes a Dexterity _penalty_

- `packages/engine/src/compute.ts:275` — `FLAT_FOOTED_CATEGORIES` excludes the
  `dex` category entirely, regardless of sign.
- RAW: flat-footed loses your Dex **bonus** to AC; a Dex penalty still applies.
  Flat-footed AC can never exceed normal AC.
- Repro: unarmored, Dex 6 (mod −2): engine normal AC 8, flat-footed **10**; RAW 8.
- Tests only cover positive-Dex cases (`compute.test.ts:79-130, 998-1002`).
- Fix shape: keep the dex line when `cappedDex < 0` (same for any dodge penalty,
  though typed dodge penalties basically don't exist as data).

### 2. ACP from armor and from encumbrance load are summed; RAW takes the worse

- `packages/engine/src/compute.ts:756-760` — `effectiveAcp = min(0, wornAcp +
acpReduction + loadAcp)`. The comment claims "additive with worn armor's ACP
  (PF1 RAW)" — **the comment itself is wrong**.
- RAW (CRB p.171, Carrying Capacity): "If your character is wearing armor, use
  the worse figure (from armor or from load) for each category. Do not stack the
  penalties."
- Repro: breastplate (−4) + medium load (−3): engine −7, RAW −4.
- `test/compute.encumbrance.test.ts:203` encodes the same misunderstanding
  (expects −7) — the test must change with the fix.
- Note the max-Dex half of the same RAW sentence IS correctly worse-of
  (`compute.ts:384-391`), so the file is internally inconsistent.

### 3. Strength penalties are multiplied by the damage multiplier

- `packages/engine/src/compute.ts:1073` — `abilityDamage = floor(damageAbilityMod
  - mult)` unconditionally.
- RAW: two-handed adds 1.5× Str **bonus** — penalties are not multiplied; ×0.5
  off-hand — the **entire** penalty applies (not half).
- Repro: Str 5 (mod −3): 2H engine floor(−4.5)=−5, RAW −3. Off-hand ×0.5 engine
  floor(−1.5)=−2, RAW −3.
- Fix shape: `mod >= 0 ? floor(mod * mult) : mod`. Also applies where
  `two-weapon-fighting.ts` `offHandDamageMultiplier: 0.5` feeds in.
- `test/weapons.test.ts:220` only tests positive Str with ×1.5.

### 4. Tiny-or-smaller creatures' CMB uses Str; RAW says Dex

- `packages/engine/src/compute.ts:1291` — `cmb = bab + strMod + sizeSpecial +
cmbStack.total`; no size check anywhere.
- RAW (CRB p.199): Tiny or smaller use Dex in place of Str for CMB.
- Reachable via Reduce Person on a Small PC, polymorph.

### 5. AC penalties do not flow into CMD

- `packages/engine/src/compute.ts:1314-1321` — auto-derivation from `"ac"`
  modifiers filters to `CMD_AC_TYPES` (eight named bonus types) regardless of
  sign, so untyped AC **penalties** are dropped.
- RAW (CRB p.199): "Any penalties to a creature's AC also apply to its CMD."
- Repro with engine's own data: pinned condition (`conditions.ts:107`, −4
  untyped to `ac`) leaves CMD unchanged; RAW CMD −4. Same for blinded/stunned/
  cowering −2.
- The doc comment at `compute.ts:285-293` justifies excluding untyped, but that
  reasoning only holds for bonuses. Fix shape: auto-include any `"ac"` modifier
  with `value < 0` regardless of type (still deduped against explicit-`cmd`
  sources).

### 6. Tower shield's Max Dex bonus is ignored

- `packages/engine/src/compute.ts:343-373` — `maxDex` only read in the
  `slot !== "shield"` branch; the shield branch drops it.
- Vendored `armors.json` Tower Shield carries `"maxDex": 2` and
  `apps/web/src/model/doc.ts:1083` snapshots maxDex onto shield instances, so
  the data is present and silently unused.
- (Adjacent gap: tower shield's −2 attack penalty also unmodeled.)

### 7. Same-source circumstance bonuses stack (minor)

- `packages/engine/src/stacking.ts:42` — `circumstance` unconditionally stacks;
  no same-source check. RAW: circumstance bonuses stack unless from essentially
  the same source. Low practical impact (distinct buffs are distinct sources).
  `computeGrantedTempHp` (`compute.ts:176-204`) already models per-source logic
  for temp HP if a pattern is wanted.

## Gaps noticed (absent, not wrong)

Flat-footed CMD not computed; Agile Maneuvers / Tiny-finesse CMB substitution
unmodeled; tower shield −2 attack unmodeled; vendored Bracers of Armor have
empty `changes[]` (item does nothing); size changes don't scale weapon damage
dice; helpless/paralyzed "Dex 0" is display-only (documented in conditions.ts).

## Checked and found CORRECT (don't re-audit)

stacking.ts core semantics (highest-per-type, dodge/untyped/circumstance/""
sum, penalties always stack, provenance); tables.ts BAB & save progressions
incl. prestige tiers and multiclass summation; size AC/CMB-CMD modifiers and
sizeChanges tests; iterative attacks (6/11/16, cap 4, −5 steps); touch/
flat-footed composition for positive Dex; max-Dex applies to touch AC; armor-vs-
load max-Dex worse-of; masterwork (+1 atk only at +0 enh, ACP −1); amulet of NA
as enh-on-nac; CMD eight-type auto-apply + explicit-cmd dedup; non-proficiency
−4 and ACP-to-attack rules; armor+shield ACP additive (correct — only
load-vs-armor is worse-of); carrying-capacity tables incl. tremendous Str,
Small ×¾ / Large ×2, load maxDex/ACP tiers, speed reduction applied once; HP
model (L1 max, avg, min 1/HD, temp-HP soak & same-source-highest stacking,
nonlethal staggered/unconscious, dying/dead thresholds, natural healing);
condition modifier numbers; TWF penalty table incl. Double Slice; skill
trained-only/ability mappings/class-skill +3/ACP-on-Str-Dex (no doubled Swim
ACP in PF1 — that's 3.5).
