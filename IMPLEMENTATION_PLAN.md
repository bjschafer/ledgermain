# Implementation Plan — PF1e In-Play Tracker

Companion to `DESIGN.md`. Stages are ordered to **de-risk the unknowns first** (data shape, then engine), then build UI on a proven foundation. Each stage should compile, pass tests, and be committable.

> **Licensing: DECIDED — clean-room (license-free).** The engine is reimplemented from the PF1 rules; Foundry's GPL code is used only as a behavioral test oracle, never copied. See DESIGN.md §6. Stage 2 is written accordingly.

---

## Stage 1: Data pipeline + schema

**Goal**: A reproducible build that turns the Foundry YAML packs into our own normalized JSON, for a vertical slice of content.

**Slice**: core races, 3–4 base classes (fighter, barbarian, wizard, cleric) with their `class-abilities` links resolved, the feats those need, and the spells for one class.

**Success Criteria**:
- `packages/schema` defines `RefData` types (Class, Race, Feat, Spell, Buff, Item).
- `packages/data-pipeline` reads `packs/**/*.yaml`, resolves `links.supplements` UUIDs and `@UUID[...]` refs, emits normalized JSON.
- Per-class spell lists derived by inverting `learnedAt.class`.
- Free-text feat prereqs parsed into structured form where possible; unparsed remainder retained as `prereqText`.
- Output is versioned and content-addressable (so updates are diffable).

**Tests**: snapshot tests on the slice; assert known facts (barbarian BAB=high, gets Rage at L1 via resolved link; Cleave lists Power Attack as a structured prereq; Fireball is wizard L3).

**Status**: Complete

**Notes / caveats (as built)**:
- Monorepo: `packages/schema` (`RefData` + members, `CharacterDoc`/`DerivedSheet` stubs) and `packages/data-pipeline` (pinned fetch → transform → emit). pnpm workspaces, TS strict, Vitest. 19 tests pass; 6 snapshots.
- **Pinning**: source SHA + system version live in `packages/data-pipeline/src/config.ts`. `pnpm data:fetch` does a shallow fetch of the exact SHA into a gitignored `.cache/`; `pnpm data:build` regenerates. Bumping data = edit `FOUNDRY_SHA`, re-run, review diff.
- **Vendoring**: normalized JSON committed under `packages/data-pipeline/data/` (key-sorted for stable diffs, per-file sha256 in `meta.json`). App builds with no network.
- **Slice as built**: 7 core races; 4 classes (fighter/barbarian/wizard/cleric) with `links.supplements` fully resolved into level-tagged grants (+ a `classFeatures` collection holding the resolved entries, e.g. Rage's `uses.maxFormula`); all 390 feats (curating wasn't simpler); 1897 wizard-learnable spells + inverted `wizard` spell list; 185 buffs; 111 items that carry typed-modifier `changes` (the engine-relevant subset of the 1124-item pack).
- **Feat prereqs**: hybrid parse — 262/390 feats yield structured signals (ability minimums, BAB, caster level, `@UUID` feat refs, best-effort skill ranks); full prose retained as `prereqText` (with `@UUID` enrichers resolved to display names). Skill-name → id mapping deferred (raw retained).

**For Stage 2 (rules engine)**:
- The typed-modifier model is already in the data: every `Change` is `{ formula, target, type }`. `type` is the stacking category (observed: `untyped`, `dodge`, `morale`, `racial`, `enhancement`, `deflection`). `target` covers ability scores (`str`/`dex`/…), `attack`, `ac`, `skill.<id>`, `cl`, and build-time targets like `bonusFeats`/`bonusSkillRanks`.
- **Formula DSL** to evaluate (clean-room): functions seen include `if`, `gte`, `min`, `max`; data paths like `@abilities.con.mod`, `@cl`, `@skills.acr.rank`, `@class.unlevel`, `@attributes.hd.total`, `@item.level`; and dice terms embedded in formulas, e.g. `(min(10, @cl))d6`. Resource pools use `maxFormula` (e.g. Rage `4 + @abilities.con.mod + (2 * (@class.unlevel - 1))`).
- `contextNotes` (`{ target, text }`) are non-mechanical reminders (e.g. "+2 vs Enchantment") — surface on the sheet, do not auto-apply.
- BAB/save numeric tables are NOT in the data (only the `high|med|low` / `high|low` tiers) — hardcode the three BAB and two save progressions in the engine.

---

## Stage 2: Rules engine core

**Goal**: `compute(doc, refData) -> DerivedSheet` for a static (no-buffs) character.

**Success Criteria**:
- Ability mods, BAB (tier tables), saves (tier tables + ability), AC (all components), CMB/CMD, skill totals (ranks + class-skill bonus + ability + ACP), HP.
- **Typed bonus-stacking** implemented per PF1 rules (highest-within-type; dodge & untyped stack; penalties stack).
- **Formula evaluator** for the DSL: `@data.paths`, `if/gte/min/max`, dice terms.
- (Per licensing decision) clean-room implementation validated against Foundry behavior as an oracle.

**Tests**: hand-computed fixtures for a L1 and a L5 build; targeted stacking tests (two morale bonuses don't stack; dodge+untyped do); formula evaluator unit tests.

**Status**: Complete (with caveats)

**Notes / caveats (as built)**:
- New package `packages/engine` (`@pf1/engine`): pure, framework-agnostic. Depends on `@pf1/schema`; `@pf1/data-pipeline` is a dev dep so tests run against the real vendored slice via `loadRefData()`. 44 engine tests pass; `bun run typecheck` clean across all three packages.
- **Public API** (`src/index.ts`): `compute(doc, refData) -> DerivedSheet`; formula evaluator `parseFormula` / `evaluateFormula` / `tryEvaluateFormula` / `evaluateNode` / `containsDice` (+ `DiceTermError`, `FormulaSyntaxError`, `RollData`, `FormulaNode`); stacking `resolveStack` (+ `TypedModifier`, `ResolvedModifier`, `StackResult`); `collectModifiers` / `forTarget`; roll-data helpers `buildRollData` / `abilityMod` / `totalLevel`; rules tables `babForLevels` / `saveForLevels` / `specialSizeMod` / `SIZE_AC_MOD` / `SAVE_ABILITY` / `SKILL_ABILITY` / `SKILL_IDS` / `skillUsesAcp`.
- **Formula DSL**: recursive-descent parser + tree-walking evaluator (no `eval`). Functions: `if`, `eq/ne/gt/gte/lt/lte`, `and/or/not`, `min/max`, `floor/ceil/round/abs/sign`, `clamp`. Missing `@paths` resolve to `0` (Foundry behaviour). Dice terms (`(min(10,@cl))d6`) parse into a node but throw `DiceTermError` on numeric eval; `tryEvaluateFormula` returns `null` for them — so damage formulas never crash the static sheet.
- **Stacking** (clean-room): same-type bonuses → highest; `dodge`/`untyped`/`circumstance` → sum; penalties always stack; provenance (`applied` flag per source) retained for the Stage 4 UI.
- **Schema**: `CharacterDoc` fleshed out with the DESIGN §3.1 sync fields (`ownerId`/`version`/`updatedAt`) and an `ItemInstance`/`WornArmor` gear model; `DerivedSheet` fully specified with per-source modifier provenance.
- **PF1 rules decisions / assumptions**:
  - *HP*: max at 1st character level; each later level adds `floor(HD/2)+1`; Con mod per HD; favored-class HP applied only from explicit `build.favoredClassBonus` `"hp"` entries (not auto-assumed).
  - *Worn armor*: the vendored slice omits the `armors-and-shields` pack, so body-armor/shield AC/maxDex/ACP are recorded on `ItemInstance.armor`; only magic items (which carry `changes`) come from `RefData`.
  - *Multiclass*: BAB and each save computed per class then summed (good-save +2 applies once per class).
  - *Caster level*: `@cl` = highest single class level (single-class assumption); fine until prestige casting matters.
  - *Armor training*: `mDexA` raises the max-Dex cap; `acpA` reduces ACP magnitude.
  - *Buffs/conditions*: NOT applied here (Stage 4); only passive race/item/class-feature `changes` feed `compute`.
- **For Stage 3/4**: `compute` is pure and cheap — recompute on every doc change. Provenance lives in `DerivedSheet` (`ResolvedStat.components`, `AbilityScore.components`, `Ac.components` with `category`, `DerivedSkill.components`); each carries `applied` for strike-through. Stage 4 buffs are just more `Change[]` to merge into `collectModifiers` (extend it to read `doc.live.activeBuffs`); the formula evaluator and stacker already handle their formulas/types.

---

## Stage 3: Builder MVP

**Goal**: Create a valid character from scratch through the UI, persisting to a local document.

**Success Criteria**:
- React app: ability score entry, race pick, class/level pick (multiclass-capable), skill rank allocation, feat selection (with prereq warnings, hard-block where structured), spell selection for casters.
- Builder writes the `CharacterDoc`; sheet view renders `compute()` output live.
- Document stored in IndexedDB (Dexie).

**Tests**: component tests for prereq gating; e2e "build a L1 fighter" produces expected derived sheet.

**Status**: Complete (with caveats)

**Notes / caveats (as built)**:
- New app `apps/web` (`@pf1/web`): Vite + React 18 + TS, bun toolchain. `bun run dev`
  serves it; `bun run build` produces a static bundle (Cloudflare Pages-ready, not
  deployed). Repo gates green: `bun run typecheck` clean across all 4 packages;
  `bun run test` = 75 pass (44 engine + 19 data-pipeline + 12 web).
- **Testability split (the important bit)**: all builder logic is pure and
  framework-agnostic in `src/model/` — `doc.ts` (CharacterDoc transitions),
  `prereqs.ts` (feat gating), `skills.ts` (skill-point budget), `casterLevel.ts`,
  `names.ts`. React components are thin views; `state/useCharacter.ts` is the only
  binding (model → `compute()` → Dexie). Tests drive the model directly with no DOM.
- **Builder → doc → compute flow**: every control calls `update(fn)` with a pure
  model transition; the hook recomputes `compute(doc, refData)` on each change
  (pure/cheap, per Stage 2 notes) and the sticky sheet re-renders. Provenance from
  `DerivedSheet` is surfaced via expandable stat "seals" (overridden bonuses struck
  through) — the design's signature element.
- **RefData in the browser**: `loadRefData()` in data-pipeline is Node-fs based, so
  the app uses `src/refdata/loader.ts` (fetch) instead; `scripts/copy-refdata.ts`
  copies the vendored JSON into `public/data/` at predev/prebuild (gitignored — the
  source of truth stays in `packages/data-pipeline/data/`). This module is the only
  place that knows where data lives, so Stage 5 can swap in lazy R2 loading.
- **Vite/workspace-TS gotcha**: `@pf1/engine` and `@pf1/schema` publish raw `.ts`;
  `vite.config.ts` aliases the bare specifiers to their `src/index.ts` and Vite's
  resolver falls back `./foo.js` → `./foo.ts` for their internal imports. Verified:
  `vite build` transforms 64 modules and the dev server serves the engine source +
  data over HTTP (200s).
- **Feat prereqs**: hard-block ONLY on structured signals (ability min, BAB, caster
  level, required `@UUID` feats); prose-only prereqs (`prereqText`) show a soft
  warning and never block — matching DESIGN §4.
- **Scope notes / Stage 4–5 hooks**: builder covers abilities, race, multiclass
  classes+levels, skill ranks, feats, and caster spell selection (writes
  `build.spells.known`). Engine doesn't yet apply feat `changes` (feats are recorded
  for prereqs/display only) and spell *slots* aren't tracked — both land naturally in
  Stage 4 (the live tracker reads `doc.live`). Caster level uses a small hardcoded
  full-caster tag set (single-class assumption). Worn armor is entered as raw stats
  on gear (the slice omits the armor pack). Persistence is local Dexie only; the doc
  already carries `ownerId`/`version`/`updatedAt`, so Stage 5 adds the sync push/pull
  without changing the storage shape.

---

## Stage 4: In-play tracker

**Goal**: The differentiator — mutate live state at the table and watch correct numbers update.

**Success Criteria**:
- HP/temp/nonlethal controls; condition toggles that feed real modifiers into `compute()`.
- Buffs (from the `buffs` pack + user-authored) with **round-based durations** that count down; expired buffs auto-drop.
- Resource pools (spell slots, ki, rounds/day, charges) drain/restore; rest restores.
- Modified values show their provenance (which buff/condition contributed), with overridden bonuses struck through.

**Tests**: toggle Haste+Bless+prone → assert exact AC/attack/save deltas; advance N rounds → buff expires and stats revert.

**Status**: Complete (with caveats)

**Notes / caveats (as built)**:
- **Engine** — buffs + conditions now flow through the *existing* evaluator +
  stacker with full provenance. `collectModifiers` reads `doc.live.activeBuffs[].changes`
  and `doc.live.conditions` (mapped via a new conditions table) alongside the
  passive race/item/feature sources; nothing about the formula/stacking layer
  changed. New modules: `conditions.ts` (clean-room table), `duration.ts`
  (`advanceRounds`, pure), `resources.ts` (`deriveResourcePools`).
- **Conditions modelled with real modifiers**: shaken, frightened, panicked,
  sickened, fatigued, exhausted, entangled, grappled, prone, dazzled, deafened,
  blinded, stunned, cowering. **Display-only** (no flat modifier — narrative or
  not expressible on a static sheet): flat-footed, nauseated, staggered,
  paralyzed, helpless, confused, dazed, unconscious. Approximations (left as
  `contextNotes`, not auto-applied): prone's −4 AC is melee-only and grants +4 vs
  ranged; blinded/stunned/cowering "lose Dex to AC"; speed-halving; fear/fatigue
  ladders don't auto-supersede each other (toggling both stacks both).
- **compute() additions** to support precise live effects: melee/ranged-specific
  attack targets (`mattack`/`rattack`, e.g. prone), a global `skills` penalty
  target (shaken/sickened), and `cmb` modifier collection. All provenance-bearing.
- **Round-advance** is the pure `advanceRounds(buffs, n)`; the web wraps it in
  `advanceRound(doc, n)` and an "Advance round" control auto-drops expired buffs.
  Indefinite buffs (no `remainingRounds`) ignore the clock.
- **Web** — Build/Play mode toggle; Play swaps the left column to the tracker
  while the sticky provenance sheet (the signature seal/strike-through UI from
  Stage 3) recomputes live. Live logic is pure + unit-tested in `src/model/`
  (`hp`, `conditions`, `buffs`, `resources`); React panels are thin views.
- **Resources**: class-feature pools (Rage rounds/day, Channel Energy) derived
  from `uses.maxFormula` via `deriveResourcePools`. **Spell-slot limitation**
  (as flagged in DESIGN/Stage 1): the vendored data has no per-class/level slot
  tables and items carry no charge counts, so spell slots *and* item charges are
  **manual pools** (user-entered max, drain/restore/rest). Not blocked on it.
- **Buffs UI**: add from the 185-buff compendium (snapshotting `changes`, with a
  best-effort suggested round duration from the buff's structured `duration`) or
  author a custom buff (same `Change[]` shape — the "expert flexibility" door).
- **Tests**: engine `tracker.test.ts` (Haste+Bless+prone exact deltas;
  same-type morale bonus doesn't stack while a morale penalty does; fatigued
  cascades to attack; round-advance expiry + stat revert; Rage pool derivation).
  Web `tracker.test.ts` (HP through temp/nonlethal/rest, buff add/remove/round,
  resource drain/restore/sync/rest). e2e `tracker.spec.ts` (condition toggle +
  buff apply/expire in the real UI). Repo gates green: `bun run typecheck` clean
  (4 packages); `bun run test` = 90 pass (50 engine + 19 data-pipeline + 21 web);
  `bun run e2e` = 3 pass.
- **For Stage 5 (persistence/sync)**: `doc.live` (hp/conditions/activeBuffs/
  resources) is fully serializable and self-contained — `ActiveBuff` snapshots
  its own `changes`, so a synced doc needs no RefData to recompute. No schema
  shape change beyond typing `live.activeBuffs: ActiveBuff[]`. Autosave still
  goes to local Dexie (version bump deferred to Stage 5, as noted there).

---

## Stage 5: Persistence + cross-device sync (Level 1)

**Goal**: Save/load documents to Cloudflare, account-scoped, so a user can build on one device and play on another. Online-first. (See DESIGN.md §2.1.)

**Success Criteria**:
- **Lightweight identity**: GitHub OAuth or email magic-link; sessions in KV/D1. Documents are owned (`ownerId`).
- Cloudflare Worker stores/retrieves character-doc blobs (D1 or KV) behind a thin API; server stays dumb (no game logic).
- Client syncs IndexedDB ↔ server: pull latest on open, push on change.
- **Optimistic concurrency**: doc carries `version`/`updatedAt`; a save based on a stale `version` is rejected; client prompts to reload. (No merge engine — single-user multi-device.)
- Deployed on Pages + Workers.

**Tests**: round-trip a document; a save against a stale `version` is rejected (409) and the client surfaces the reload prompt; a fresh device pulls the latest doc for the owner.

**Status**: Not Started

---

## Stage 6: Vendor base armor & weapons into RefData

**Goal**: Stop forcing users to type AC/maxDex/ACP and damage-dice/crit by hand for the common
cases. Vendor the upstream **mundane** armor (64) and weapon (~310) entries from the Foundry
`armors-and-shields` and `weapons-and-ammo` packs into normalized JSON, exposed as `RefData.armors`
and `RefData.weapons`. Named magical gear (Frost Brand, Elven Chain, +N items) is **out of scope**
— generic "+N weapon" is achieved by selecting a mundane base and setting an enhancement bonus
(Stages 7/8); named unique items remain a future enhancement.

**Design: denormalize on select** — the engine reads armor/weapon physical stats directly off the
`CharacterDoc` (`computeAc` reads `inst.armor.*`; `computeWeaponAttacks` reads `w.*`). Selecting a
ref entry at add-time snapshots its fields onto the doc (the same pattern `ActiveBuff` uses for
`changes` and `WornArmor` uses for AC). The engine therefore needs **no change** across Stages 6-8;
ref-id fields added in 7/8 are display + future re-sync only.

**Slice / filter**:
- Armor: `type==="equipment" && subType∈{"armor","shield"} && !enh && !aura && !masterwork`
  (drops the `armor-unique/` named magical suits). 64 entries (heavy 16, light 19, medium 14,
  shields 15).
- Weapons: `type==="weapon" && subType∈{"simple","martial","exotic"} && !enh && !aura &&
  !masterwork` (drops the `magic-weapons/` named magical weapons, ammunition, siege, firearms
  special ammo). ~310 entries.

**Success Criteria**:
- `packages/schema` defines `ArmorRef` and `WeaponRef`; extends `RefData` with `armors` and
  `weapons`; bumps `RefDataMeta.schemaVersion` (1 → 2).
- `packages/data-pipeline` reads the two new packs, applies new `transform/armor.ts` and
  `transform/weapons.ts`, and emits `data/armors.json` + `data/weapons.json`.
- `loadRefData()` (both Node and browser loaders) reassemble the new collections.
- `meta.counts` records `armors` and `weapons`.
- Repo gates green: `bun run typecheck` + `bun run test` clean across all 4 packages.

**Tests**: snapshot tests on a representative entry per category (Full Plate, Buckler, Longsword,
Composite Longbow); refdata fact tests ("Longsword is martial, crit 19/×2, damage 1d8"). Existing
`refdata.test.ts` schemaVersion assertion updated to 2.

**Status**: Complete

**Field mapping** (Foundry YAML → RefData):

`ArmorRef` (extends `RefEntity`):
- `slot` ← `subType` (`"armor"|"shield"`)
- `ac` ← `system.armor.value`
- `maxDex` ← `system.armor.dex`
- `acp` ← `system.armor.acp` (kept positive; denormalizer negates when storing on `WornArmor`)
- `weightClass` ← `system.equipmentSubtype` (`lightArmor→1`, `mediumArmor→2`, `heavyArmor→3`,
  otherwise omit/0 — shields track via `slot` not weightClass)
- `baseTypes` ← `system.baseTypes`
- `price` ← `system.price`

`WeaponRef` (extends `RefEntity`):
- `damageDice` ← regex-parsed from the first `sizeRoll(N,F,…)` or `NdM` in
  `system.actions[*].damage.parts[0].formula` (e.g. "1d8"); omitted if unparseable (rare).
- `critRange` ← `actions[*].ability.critRange` (default 20)
- `critMult` ← `actions[*].ability.critMult` (default 2)
- `group` ← `slug(baseTypes[0])` (the per-weapon type Weapon Focus routes on, e.g. "longsword")
- `category` ← action's range units / actionType (`mwak`+`melee`→`"melee"`; `rwak`+`ft`→`"ranged"`)
- `attackAbility` ← `"str"` (mwak) / `"dex"` (rwak)
- `damageAbility` ← `"str"` if `actions[*].ability.damage==="str"` else `"none"`
- `damageMultiplier` ← `weaponSubtype==="2h" ? 1.5 : 1`
- `proficiency` ← `subType` (`simple|martial|exotic`)
- `weaponGroups` ← `system.weaponGroups` (Foundry tags like `bladesHeavy`)
- `weaponSubtype` ← `system.weaponSubtype` (`1h|2h|ranged`)
- `baseTypes`, `price`, `weight` ← as available

---

## Stage 7: Armor picker (GearSection)

**Goal**: Replace/augment the manual "Add worn armor/shield" form with a search picker, keeping
the manual form as the "Custom" fallback.

**Success Criteria**:
- Schema: add `armorId?: string` to `ItemInstance` (separate from `itemId` which keys
  `RefData.items` — keeps the two ref tables unambiguous).
- `model/doc.ts`: `addWornArmorFromRef(doc, armorRef)` snapshots `armorRef → WornArmor` (negating
  `acp`) + sets `name`/`armorId`, appended to `build.gear`.
- `GearSection`: a search row mirroring the magic-item picker, scoped to `refData.armors`. A small
  "Custom" toggle reveals the existing manual form.
- Engine: unchanged.

**Tests**: `addWornArmorFromRef` reducer unit test (input `ArmorRef` → expected `WornArmor` + `armorId`).
`bun run typecheck` + `bun run test` green.

**Status**: Complete

**Notes / caveats (as built)**:
- `addWornArmorFromRef(doc, armor)` snapshots `armor.ac`, `armor.maxDex`, `armor.weightClass` (→ `type`), and `armor.acp` **negated** (the schema stores ACP as a non-positive number; the ref keeps the source's positive magnitude). Shields omit `type` entirely — the engine derives `armor.type` from body armor only. `name` and `armorId` are both recorded; the gear-list display falls back to `refData.armors[armorId]?.name` if `inst.name` is ever cleared.
- GearSection now opens a single "+ Add worn armor / shield" card with two modes: **Select** (search `refData.armors`, AC/max-Dex/ACP preview) and **Custom** (the original manual form). "Custom entry…" link at the bottom of the Select list switches to manual; "← Back to list" returns. The custom-entry `Add` still requires a non-zero AC for body armor (matches the pre-existing guard).
- Engine: unchanged. `computeAc` reads `inst.armor.*` directly as before.

---

## Stage 8: Weapon picker (WeaponsSection)

**Goal**: Add a search picker to `WeaponsSection` with an enhancement bonus selector and a "Custom"
fallback to the existing manual form.

**Success Criteria**:
- Schema: add `weaponId?: string` to `WeaponInstance`.
- `model/doc.ts`: `addWeaponFromRef(doc, weaponRef, enhancement?)` denormalizes `WeaponRef` →
  `WeaponInstance` (overlaid with the user-chosen enhancement, name like "Longsword +1" when
  nonzero) + sets `weaponId`.
- `WeaponsSection` (already receives `refData` via props): picker UI + `+0…+5` enhancement
  selector; "Custom" toggle reveals the existing manual form.
- Engine: unchanged.

**Tests**: `addWeaponFromRef` reducer unit test (with and without a nonzero enhancement).
`bun run typecheck` + `bun run test` green. Optional e2e for "search longsword, set +1, assert
derived attack/damage/crit".

**Status**: Complete

**Notes / caveats (as built)**:
- `addWeaponFromRef(doc, weaponRef, enhancement = 0)` snapshots the ref's fields onto a
  `WeaponInstance` (overlaying the enhancement: name suffix ` +N`, `enhancement` field set only
  when N > 0). Default-valued optionals (`critRange===20`, `critMult===2`,
  `damageMultiplier===1`) are omitted for doc minimalism — the engine falls back to its own
  defaults. Enhancement is clamped to `[0, 10]`.
- `WeaponsSection` now destructures `refData` (it was already passed in via `BuilderProps` but
  unused). The "+ Add weapon" button opens a card with two modes: **Select** (search
  `refData.weapons`, an `Enh.` selector +0..+5 that applies to the next Add, a preview row per
  weapon showing proficiency / category / damage dice / crit / group) and **Custom** (the
  existing `WeaponForm`, linked via "+ Custom entry…").
- The enhancement selector is *picker-global* (set it once, click Add on each weapon you want
  at that bonus). Clicking "Add" closes the picker; reopening it resets enhancement to +0.
- Engine: unchanged. `computeWeaponAttacks` reads the snapshot fields directly as before;
  feat routing still works because `addWeaponFromRef` populates `w.group` from the ref's
  slugified `baseTypes[0]` (verified by a featChoiceOptions integration test).

---

## Stage 9: Armor enhancement selector + material support

**Goal**: Close the armor-enhancement gap (weapons have an Enh. selector, armor doesn't) and add
special-material support (mithral, adamantine, etc.) for both armor and weapons. Mithral modifies
base stats at pick-time (weight class shift, maxDex +2, ACP −3, weight ×0.5); other materials are
display-only for now (DR/hardness not modeled by the engine).

**Design**: denormalize-on-select continues — material modifiers are applied to the base ref's
stats at pick-time, snapshotting the final values onto the doc. The engine reads the final values
as before. The `material` tag is stored on the doc for display + future re-sync.

**Success Criteria**:
- Schema: `enhancement?: number` on `WornArmor`; `material?: string` on both `WornArmor` and
  `WeaponInstance`.
- Engine: `computeAc` pushes armor/shield enhancement as a separate `{type: "enh"}` candidate
  alongside the base `{type: "untyped"}` candidate — provenance shows the breakdown, stacking is
  RAW-correct (armor base + shield base stack; two enh sources to the same slot don't).
- Model: `addWornArmorFromRef(doc, armor, enhancement, material)` applies material modifiers
  (mithral: weightClass −1 min 1, maxDex +2, acp −3, weight ×0.5) and snapshots final stats.
  `addWeaponFromRef` gains a `material` parameter (display-only for now).
- UI: both pickers get a Material selector alongside the existing Enhancement selector.
- Curated material table in `apps/web/src/model/materials.ts` (clean-room from PF1 RAW, not
  Foundry code).

**Tests**: mithral Full Plate modifier test (heavy→medium, maxDex 1→3, acp 6→3); armor
enhancement AC test (base + enh as separate provenance components); engine stacking test
(armor enh + shield enh both apply).

**Status**: Complete

**Notes / caveats (as built)**:
- Schema: `enhancement?: number` + `material?: string` on `WornArmor`; `material?: string` on
  `WeaponInstance`. Armor enhancement is stored separately from base `ac` (not folded in) so the
  engine can push it as a separate `{type: "enh"}` candidate for clean provenance.
- Engine: `computeAc` pushes armor/shield enhancement as `{category, type: "enh", value}` alongside
  the base `{category, type: "untyped", value}`. The `(category|type)` grouping means armor base +
  armor enhancement stack (different types), but two enhancement sources to the same slot don't
  (same `armor|enh` group → highest wins, provenance strikes through the loser). Armor enhancement
  and shield enhancement both apply (different categories → different groups). Verified by 3 new
  engine tests.
- Materials: curated table in `apps/web/src/model/materials.ts` (clean-room from PF1 RAW). Mithral
  applies: `weightClass - 1` (min 1), `maxDex + 2`, `acp - 3` (reduces penalty magnitude). Other
  materials (adamantine, darkwood, silver, cold iron) are display-only for now (DR / hardness bypass
  not modeled by the engine).
- `addWornArmorFromRef` and `addWeaponFromRef` both accept `enhancement` + `material` params.
  Material modifiers are applied to the `ArmorRef` before denormalization (while ACP is still a
  positive magnitude). Name gets a material prefix ("Mithral Full Plate") and enhancement suffix
  ("+3") — combined: "Mithral Full Plate +3".

---

## Stage 10: Magical weapon & armor abilities (curated)

**Goal**: Support common magical abilities (flaming, keen, frost, etc.) on weapons and armor. The
upstream data carries only the *names* (roll-tables in `ultimate-equipment/`) and ad-hoc per-item
effects — no portable mechanics. A curated table in ledgermain maps each ability to its mechanical
effect (if any) + display note.

**Design**: abilities are stored as `abilities?: string[]` on `WeaponInstance`/`WornArmor`. At
pick-time, mechanical effects are applied (keen doubles crit range; everything else is display-only
since the engine doesn't roll dice). Ability names + notes surface in the weapon/armor meta line.

**Success Criteria**:
- Schema: `abilities?: string[]` on `WeaponInstance` and `WornArmor`.
- Curated table in `apps/web/src/model/abilities.ts` with ~10 weapon abilities (keen, flaming,
  frost, shock, ghost touch, holy, unholy, vicious, speed, defending) and ~5 armor abilities
  (light/medium/heavy fortification, ghost touch, bashing). Each entry: `{ id, name, slot,
  bonusEquivalent, note?, applyCritRange? }`.
- Model: `addWeaponFromRef` / `addWornArmorFromRef` accept `abilities[]`; keen applies
  `critRange = max(1, 2 * critRange - 21)` at pick-time.
- UI: multi-select ability chips in both pickers; selected abilities surface in the weapon/armor
  meta line. Enhancement-equivalent bonus shown for reference (pricing only — no mechanical effect).
- Engine: unchanged (keen modifies the stored critRange before the engine sees it).

**Tests**: keen longsword (critRange 19→17); flaming weapon display note; armor fortification
display.

**Status**: Complete

**Notes / caveats (as built)**:
- Schema: `abilities?: string[]` on both `WeaponInstance` and `WornArmor`. Ability ids reference the
  curated table in `apps/web/src/model/abilities.ts` (e.g. `"keen"`, `"flaming"`,
  `"light-fortification"`).
- Curated table: 13 weapon abilities (keen, flaming, frost, shock, flaming/icy/shocking burst,
  holy, unholy, ghost touch, vicious, speed, defending) + 5 armor abilities (light/medium/heavy
  fortification, ghost touch, bashing). Each entry carries `{ id, name, slot, bonusEquivalent,
  note?, applyToWeaponRef? }`. Clean-room from PF1 RAW — not Foundry code (the upstream data has
  only roll-table names, no portable mechanics).
- **Keen** is the only ability with a mechanical effect: `critRange = max(1, 2 * critRange - 21)`
  applied to the `WeaponRef` before denormalization. A longsword (critRange 19) with keen yields
  critRange 17 (threat 17–20). All other abilities are display-only (the engine doesn't roll dice,
  so "+1d6 fire" from Flaming surfaces as a note in the weapon meta line, not a computed value).
- `addWeaponFromRef` and `addWornArmorFromRef` both accept `abilities?: string[]` as the final
  parameter. Abilities are stored on the doc for display + future re-sync. The weapon/armor meta
  line shows each ability's name + note (e.g. "Flaming (+1d6 fire)").
- UI: both pickers get a row of toggle-chip buttons below the search/selectors row. Active chips
  are highlighted. Clicking toggles the ability in/out of the selection. The enhancement-equivalent
  bonus is shown as a tooltip for pricing reference (no mechanical effect).
- Engine: unchanged. Keen modifies the stored `critRange` before the engine sees it; everything else
  is display-only.

---

## Deferred (de-risked by the architecture, not v1)

- **Party/GM session** — Durable Object per session; documents already self-contained.
- **Full offline PWA** — service worker + sync reconciliation; engine already client-side.
- **Import** — Pathbuilder/Foundry JSON → `CharacterDoc`.
- **Homebrew authoring** — user entries in the same schema as SRD (the "expert flexibility" door).
- **Named magical weapons/armor** (Frost Brand, Elven Chain) as selectable presets — Stages 6-8
  vendor mundane bases only; named unique items have multi-part damage / special properties that
  don't fit the current `WeaponInstance`/`WornArmor` shapes cleanly. Custom fallback covers them
  for now.
