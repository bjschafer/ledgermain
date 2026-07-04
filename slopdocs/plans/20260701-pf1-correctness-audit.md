# PF1 correctness audit — findings + fix plan (2026-07-01)

Full-project audit for technical + PF1e rules correctness. Scope: engine (tables, stacking,
compute, collect, formula, conditions, feat-effects, resources, duration), web model layer,
data-pipeline normalizer, and a cross-check of vendored change **targets** vs what the engine
consumes. Excludes what GitHub issues #4–#10/#12 already track (archetype numerics, condition
exclusivity, feat bypass hard-block, armor corner cases, Multitalented, play-tab feats).

Baseline at audit time: typecheck green, 575 tests green. **None of the findings below are
covered by the existing suite** — that's why they were invisible.

Method note for re-verification: enumerate `{target}` across `packages/data-pipeline/data/*.json`
changes and diff against targets consumed in `packages/engine/src/compute.ts` / `collect.ts`.
That diff is what surfaced A2/A5/A6/C2.

## Status board

| id       | task                                                                                                       | agent                         | status                                                                                                                                   |
| -------- | ---------------------------------------------------------------------------------------------------------- | ----------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- |
| A1       | sorcerer spells-known table wrong L7+                                                                      | sonnet                        | done (3086744)                                                                                                                           |
| A2+A5+A7 | compute.ts: wdamage routing, size change, per-HD min HP                                                    | sonnet                        | done (4f91959)                                                                                                                           |
| A4+A6+A8 | web model: nonlethal healing, bonusFeats budget, prereq warn                                               | sonnet                        | done (3db6822; note: bonusFeats also counts Scribe Scroll / Eschew Materials — player adds those feats explicitly to balance the budget) |
| B1+B2+B4 | nits: burst prereqs/ghost-touch/vicious, fear typing, @cl durations                                        | sonnet                        | done (f13a464)                                                                                                                           |
| B3       | masterwork armor (ACP −1) in armor picker                                                                  | sonnet                        | done (316e3e8)                                                                                                                           |
| A3       | pipeline drops `operator: set` (+ speed totals in rollData)                                                | sonnet                        | done (0353097; Change.operator lives in schema/src/primitives.ts, set semantics = lowest wins, rollData speeds = race base only)         |
| A6b      | auto-grant fixed class bonus feats (Scribe Scroll / Eschew Materials) instead of budgeting a slot for them | fable (agent hit spend limit) | done (431086e; name-match rule: bonusFeats feature whose name matches a feat = fixed grant, else budgeted slot)                          |
| C1       | iterative attacks display                                                                                  | sonnet                        | done (a19f2fa; ResolvedStat.iteratives?, engine iterativeSequence(); haste/TWF/flurry still excluded)                                    |
| C2       | surface "unsupported effects" on buffs/items                                                               | sonnet                        | done (953c518; engine/src/targets.ts is the applied-target registry — update it whenever compute() consumes a new target)                |

## A. Real bugs

### A1. Sorcerer spells-known table wrong from L7 up

`packages/engine/src/tables.ts` `SORCERER_SPELLS_KNOWN`. Current table caps 1st-level known at
4 forever; L20 row is all 4s. Real PF1 CRB table (0th..9th):

```
L1  4 2                     L11 9 5 5 4 3 2
L2  5 2                     L12 9 5 5 4 3 2 1
L3  5 3                     L13 9 5 5 4 4 3 2
L4  6 3 1                   L14 9 5 5 4 4 3 2 1
L5  6 4 2                   L15 9 5 5 4 4 4 3 2
L6  7 4 2 1                 L16 9 5 5 4 4 4 3 2 1
L7  7 5 3 2                 L17 9 5 5 4 4 4 3 3 2
L8  8 5 3 2 1               L18 9 5 5 4 4 4 3 3 2 1
L9  8 5 4 3 2               L19 9 5 5 4 4 4 3 3 3 2
L10 9 5 4 3 2 1             L20 9 5 5 4 4 4 3 3 3 3
```

Rows L1–L6 in the code are already correct. Impact: builder advisory + tracker **cap** block
legal picks (e.g. 5th 1st-level spell at sorc L7).

### A2. Weapon-damage buff/condition targets dropped

Engine consumes only `damage` / `damage.weapon.<group>` in `computeWeaponAttacks`
(`packages/engine/src/compute.ts`). Vendored buffs + `conditions.ts` emit `wdamage` (all
weapons), `mwdamage` (melee), `twdamage` (thrown), `rwdamage` (ranged). Affected content the
attack half of which WORKS, making the damage gap invisible: Divine Favor, Inspire Courage,
Divine Power, Prayer (±), Destruction, Rage (Unchained), Calm/Powerful Stance, Rally Allies,
sickened (−2 `wdamage`).
Fix: in computeWeaponAttacks fold `wdamage` into every line, `mwdamage` into melee,
`rwdamage`+`twdamage` into ranged (we don't distinguish thrown; document that).

### A3. Pipeline drops `operator`/`priority`; set-changes applied additively

`normalizeChanges` in `packages/data-pipeline/src/transform/common.ts` keeps only
formula/target/type. 18 buffs in the pack use `operator: set` (Slow, Fly, Debilitating Injury,
Darkvision(s), Spider Climb, True Seeing, Resistance, Animal Focus senses, Monkey Fish,
angelic aspects, Blessing of the Mole, Spell Resistance…). Two stacked problems:

1. set-changes are added instead of replacing;
2. their formulas reference `@attributes.speed.<mode>.total`, which is missing from rollData
   (`packages/engine/src/rolldata.ts`) → resolves 0.
   Concrete today: **Debilitating Injury (Hampered) grants +5 to every speed** (max(5, floor(0/2))
   added); Slow's halving is a no-op (if(gt(0,0),…)→0).
   Fix: add `operator?: "add"|"set"` (+ priority if needed) to `Change` in
   `packages/schema/src/refdata.ts`, carry through normalizeChanges (regen data), put current
   speed totals into rollData, and give collect/compute set semantics for speed targets
   (set wins over add; evaluate set against pre-buff base). Regen: `bun run data:build`.

### A4. Healing doesn't remove equal nonlethal

`apps/web/src/model/hp.ts` `applyHealing`. PF1 CRB (Nonlethal Damage): curing hit point damage
also removes an equal amount of nonlethal. Fix: subtract heal amount from nonlethal (floor 0).

### A5. Enlarge/Reduce Person `size` change unconsumed

`size` target (+1/−1 size step) is collected then dropped: Str/Dex apply but AC/attack size
mod, CMB/CMD special size mod, and displayed size stay Medium. Fix: consume `size` in
compute() as a step offset on the race SizeId (clamp to fine..col) before size mods are read.
(`carryMult`/`carryStr` also dropped — fine, encumbrance is out of scope entirely.)

### A6. Wizard/sorcerer bonus feats missing from expected feat count

`apps/web/src/model/feats.ts` `expectedFeatCount` hardcodes human + fighter. Vendored class
features already carry `bonusFeats` changes: Fighter `1+floor(@class.unlevel/2)`, Wizard
`floor(@class.unlevel/5)`, Sorcerer bloodline `floor((@class.unlevel-1)/6)` (see
class-features.json). Fix: evaluate `bonusFeats` changes from granted features (per-class
rollData with class.unlevel = that class's level) and drop the hardcoded fighter term; keep
human +1.

### A7. Per-HD minimum 1 HP not enforced

`computeHp` (compute.ts) does `hdBase + conMod*hd`. PF1: min 1 HP per HD after Con. Fix: apply
per-level `max(1, levelHp + conMod)`; keep component display coherent (Con component becomes
the actual applied delta).

### A8. Prose prereqs hidden when structured checks exist

`apps/web/src/model/prereqs.ts`: `warn` only when `checks.length === 0`. Feat with structured
prereqs + extra prose shows no advisory once structured pass. Fix: warn whenever softText
exists (blocked stays structured-only).

## B. Rules nits

- **B1** `apps/web/src/model/abilities.ts`: burst abilities RAW don't require the base ability
  (drop `requires` on flaming/icy/shocking-burst → stop double-charging the +10 budget);
  armor ghost touch bonusEquivalent 1→3; vicious note "+2 dmg"→"+2d6 dmg".
- **B2** `packages/engine/src/conditions.ts`: shaken/frightened/panicked penalties typed
  `morale` → RAW untyped. Zero numeric impact (penalties always stack) but provenance labels lie.
- **B3** masterwork armor not modeled: ACP reduced by 1 (min 0 magnitude), and enhancement
  implies masterwork (like weapons). Touch `addWornArmorFromRef`/`updateGearItem` in
  `apps/web/src/model/doc.ts` + GearSection UI, mirroring the weapon masterwork pattern
  (commits 3cf2287/1a20737).
- **B4** `apps/web/src/model/buffs.ts` `suggestRounds` only regexes `@item.level`; durations
  written with `@cl` fall back to 1 unit. Add `@cl` to the per-level detection.
- **B5** (note only, not fixing) Tiny-or-smaller use Dex for CMB — not modeled.

## C. Bigger gaps (user decision pending)

- **C1** No iterative attacks — sheet shows single attack bonus; BAB 6+ should render
  "+11/+6" etc. Most table-visible gap.
- **C2** Other vendored-but-unconsumed targets, silently half-applying items/buffs:
  `nattack`/`ndamage` (Amulet of Mighty Fists), `spellResist`, `concentration`, `cl`,
  `critConfirm` (Justice), `reach` (Long Arm), `allChecks`/`strChecks`/`dexChecks`/`chaChecks`/
  `dexSkills`/`strSkills` (Divine Power, Circlet of Persuasion, Iron Mask), `tattack`.
  Minimum viable: badge "has effects the sheet can't apply" on buff/item rows.
- **C3** Armor speed reduction, arcane spell failure %, encumbrance, nonproficiency penalties —
  unmodeled; overlaps issue #8.

## Verified CORRECT — do not re-audit

BAB/save progressions; wizard+cleric & sorcerer spells-per-day; bonus-spells formula
(floor((mod−SL)/4)+1 gated mod≥SL); channel energy (floor((L+1)/2)d6, DC 10+L/2+Cha);
stacking engine semantics; SIZE_AC_MOD & specialSizeMod; skill→ability map, trained-only set,
ACP application, class-skill +3, skill budget (min 1/level, human bonusSkillRanks, retroactive
Int); keen 2\*range−21; fighter (1+floor(f/2)) + human feat budget; per-class caster level
(issue #11 fix); touch/flat-footed AC category sets; CMB/CMD composition; formula parser
(2d6 tokenization, missing path→0, function set matches observed data); prepared/spontaneous
slot accounting; weapon groups are per-weapon-type (right granularity for Weapon Focus).

## Verification for the fixes

- `bun run typecheck && bun run test`; add hand-computed fixtures per engine convention:
  sorc L7 → five 1st known; Divine Favor CL3 active → weapon line +1 atk/+1 dmg; sickened →
  −2 weapon damage; heal 5 with 8 nonlethal → 3 nonlethal; wizard L10 expected feats includes
  +2 bonus; Con −3 d6 rolled-2 level contributes 1.
- Manual: toggle Debilitating Injury (Hampered) → speeds must not increase (post-A3).
