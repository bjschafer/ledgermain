# Engine Cookbook

A maintainer's guide to `packages/engine` -- the pure PF1 rules engine, `compute(doc, refData) -> DerivedSheet`. Read `docs/design.md` first for _why_ the architecture looks like this; this document is the _how_: the pipeline, the two hard cores, and copy-a-pattern recipes for the 40+ near-parallel per-class modules that make up most of the package's bulk.

Audience: a competent TypeScript developer who has never opened this repo and doesn't necessarily play Pathfinder. Game terms are glossed briefly on first use.

## 1. The 10,000-ft pipeline

Everything starts and ends in one function: `compute(doc: CharacterDoc, refData: RefData): DerivedSheet` in `packages/engine/src/compute.ts`. `CharacterDoc` (build choices + live session state, `packages/schema/src/character.ts`) and `RefData` (vendored Pathfinder content, `packages/schema/src/refdata.ts`) go in; `DerivedSheet` (every number the sheet displays) comes out. `compute()` is pure -- no I/O, no mutation of its inputs -- and the web app calls it on every state change rather than memoizing, so it has to stay cheap.

Reading `compute()` top to bottom, in the order it actually runs:

1. **BAB and base size first** (`compute.ts`, top of the function). Base attack bonus (a class's per-level combat-effectiveness score) only depends on class levels, so it's computed before anything else needs it as an input. Base size comes from the race.
2. **Boot pass** -- `buildRollData()` (`rolldata.ts`) assembles the `@data.path` context formulas evaluate against, using base ability scores; `collectModifiers()` (`collect.ts`) walks every source (race, gear, class features, archetypes, active buffs, conditions, traits, and ~20 more build-choice loops) and evaluates each `Change`'s formula into a flat list of `CollectedModifier`s; `computeAbilities()` folds those through the stacking resolver to get real ability totals. This is a bootstrap because some formulas (e.g. carrying capacity, encumbrance-driven AC caps) need final Strength before they can run, but final Strength needs the same collect pass encumbrance depends on -- so the boot pass breaks the circularity by collecting once against base scores.
3. **Encumbrance** (`encumbrance.ts`, optional rule, off by default) is computed from the boot pass's ability/size results, since later roll data needs `@attributes.encumbrance.level`.
4. **Final pass** -- `buildRollData()` and `collectModifiers()` run again, this time with real abilities, encumbrance level, and BAB threaded in. `collected` from this point on is the canonical modifier list every subsequent section reads via `forTarget(collected, "<target>")`.
5. **Size, saves, proficiencies** -- size ladder shifts (Enlarge Person, polymorph forms) resolve; saving throws (Fortitude/Reflex/Will resistance rolls) are computed per class-level tables in `tables.ts`; `deriveProficiencies()` (`proficiency.ts`) determines what armor/weapons the character can use without penalty.
6. **Attack, AC, CMB/CMD** -- base melee/ranged attack bonus, `computeAc()` (armor class -- how hard the character is to hit), and combat maneuver bonus/defense (CMB/CMD -- the grapple-and-trip stat) are all built from `collected` plus the ability/size values above.
7. **Initiative, HP, speeds** -- straightforward modifier sums via `resolveStack`/`applySpeedTarget`.
8. **Arcane spell failure, skills, per-weapon attacks, kinetic blasts** -- `computeSkills()` handles the parameterized-skill fan-out (Craft/Profession/Perform subtypes); `computeWeaponAttacks()` builds one resolved attack line per `build.weapons` entry; `computeKineticBlasts()` (`kinetic-blast.ts`) does the same for a kineticist's blasts, which have no gear entry to hang off and scale with the burn currently held, plus the per-activation loadout (`live.kineticistBlastLoadout`) resolved through `kineticist-infusions.ts`.
9. **Defenses, senses, active polymorph form** -- `computeDefenses()` (DR/energy resistance/spell resistance), `computeSenses()` (darkvision etc.), and, if `live.activeForm` is set, the resolved natural-attack lines for a Wild Shape/Beast Shape transformation.
10. **Class features and archetypes** -- `resolveClassFeatures()` (`archetypes.ts`) builds the display list of granted class features with archetype swap-strikethrough, plus `computeRanger()` for ranger-specific situational bonuses.
11. **Manual stat overrides** -- a small allowlisted set of `build.settings.statOverrides` keys (`hp.max`, `ac.normal`, `bab`, ...) is applied last, after the `sheet` object is assembled, so a player's manual override always wins.

Two collect passes, one stacking resolver, one formula evaluator -- that combination is the entire engine. Everything else in the package is _data_ (tables of `Change`s) that flows through `collectModifiers()`'s many loops.

## 2. The two hard cores

Everything else in the engine is well-trodden game-stats arithmetic. These two pieces are the ones clean-room reimplemented from PF1 rules text (never from Foundry's GPL source -- see §4's licensing note) and worth understanding before touching either.

### 2.1 Typed bonus stacking (`stacking.ts`)

PF1's central house rule: two bonuses of the **same named type** (e.g. two "morale" bonuses) don't add -- only the higher one counts. `resolveStack(mods: TypedModifier[]): StackResult` implements this:

- Same-type **bonuses** (positive values) compete; only the highest survives, others get `applied: false`.
- `dodge`, `untyped`, and `circumstance` (and an empty-string type) are exempt -- they always sum. `circumstance` has one further wrinkle: RAW says circumstance bonuses stack "unless from essentially the same source," so same-source circumstance bonuses still compete against each other (grouped by `TypedModifier.source`, the display-name string) even though circumstance-vs-circumstance from different sources sums freely.
- **Penalties** (negative values) always stack regardless of type -- PF1 never lets a bad guy's second curse cancel out because it shares a type with the first.
- Provenance survives the whole pipeline: every input modifier comes back out in `StackResult.modifiers` with its `applied` flag, so the UI can strike through a loser rather than silently dropping it.

If you're writing a new modifier source, the one decision that matters is: what `type` string does this bonus have? Get that wrong and it'll either wrongly stack with something it shouldn't, or wrongly get capped by something unrelated. `type: "untyped"` is the safe default for anything without a printed bonus-type name.

### 2.2 The formula DSL (`formula.ts`)

Every `Change.formula` in the vendored data (and in every hand-authored table in this package) is a string in Foundry's PF1 roll-formula dialect: `@data.paths`, arithmetic, functions (`if`, `gte`, `min`, `max`, `floor`, ...), and dice terms (`2d6`). `formula.ts` is a small hand-rolled recursive-descent parser + tree-walking evaluator -- no `eval`, no `Function`.

Three things to know before writing a formula:

- **Missing `@paths` resolve to `0`**, not an error (`resolvePath` in `formula.ts`) -- this matches Foundry's own behavior and means a formula referencing `@classes.witch.level` is safe to write even for a non-witch; it just evaluates to 0.
- **Dice terms parse but can't evaluate to a number.** `evaluateNode` throws `DiceTermError` the moment it hits a `dice` node. Static-sheet consumers (attack bonuses, AC, saves -- anything that needs one number) should call `tryEvaluateFormula(src, data)`, which catches `DiceTermError` and returns `null` instead of throwing, so a damage formula like `"1d6 + floor(@class.unlevel / 2)"` never crashes the sheet. `evaluateFormula` (no "try") throws on dice -- only use it where you've already confirmed the formula can't contain one.
- `collect.ts`'s `evalChange` helper wraps every single `Change` evaluation in a try/catch and silently drops a modifier on `null`/`NaN`/thrown syntax error. A malformed formula anywhere in the vendored data degrades that one bonus to "not applied," never a crashed sheet.

`RollData` (the `@data.path` context) is assembled once per `compute()` pass by `buildRollData()` in `rolldata.ts` -- abilities, class levels, skill ranks, HD, caster level, speeds, armor type. If a formula you're writing needs a path that isn't there yet, add it in `rolldata.ts`, not by inventing an ad-hoc context object at the call site.

## 3. Cookbook

### 3.1 Add a class feature module

Worked example: **oracle's curse** (`oracle-curses.ts`), specifically the **Lame** curse, which reduces base land speed. This walks the full round trip from a player's build choice to a number on the sheet.

1. **The doc field.** `CharacterDoc.build.oracleCurse?: string` (`packages/schema/src/character.ts`) is a plain string tag, set by the builder UI (`apps/web/src/model/doc.ts`'s `setOracleCurse`). No validation lives in the schema -- free-choice, matching the project's soft-warning posture (§3.3 below covers the harder-validated feat case).
2. **The definition table.** `oracle-curses.ts` exports `ORACLE_CURSES: Record<string, OracleCurseDef>`, keyed by the same tag. Lame's entry:
   ```ts
   changes: [c("if(gte(@attributes.speed.land.total, 30), -10, -5)", "landSpeed")],
   ```
   `c()` is a tiny local helper building a `{ formula, target, type }` `Change` literal -- most tables in this package define one. The formula reads the character's own base land speed off `RollData` (populated by `buildRollData`, §2.2) to decide whether the penalty is -10 or -5, per RAW.
3. **Collection.** `collect.ts` has one loop per build-choice field; the oracle's-curse block (`collect.ts`, "oracle's curse (build choice)") is representative of the whole pattern:
   ```ts
   const oracleLevel = doc.identity.classes.find((c) => c.tag === "oracle")?.level ?? 0;
   if (oracleLevel > 0 && doc.build.oracleCurse) {
     const curse = ORACLE_CURSES[doc.build.oracleCurse];
     if (curse) {
       for (const ch of curse.changes) {
         evalChange(
           ch.formula,
           rollData,
           ch.target,
           ch.type,
           curse.name,
           `curse:${curse.tag}`,
           out,
         );
       }
     }
   }
   ```
   Note the gating: a non-oracle with a stale `oracleCurse` field (e.g. after switching classes) contributes nothing, because the level check runs first. This "gate on the granting class's level, never crash on an unknown/stale id" shape is universal across every loop in `collect.ts` -- copy it.
4. **Consumption.** The `Change` targets `"landSpeed"`. `compute.ts`'s `applySpeedTarget(speeds, collected, "land", "landSpeed")` sums every modifier targeting `"landSpeed"` into `speeds.land`. This is the step that's easy to get wrong when adding a _new_ target: **`targets.ts`** is the single source of truth for which `Change.target` strings `compute.ts` actually reads (`APPLIED_TARGETS`/`APPLIED_TARGET_PREFIXES`, built by grepping every `forTarget(` call site). If you invent a new target string, it silently collects-and-does-nothing unless you also wire a consumer in `compute.ts` **and** register the target in `targets.ts` -- otherwise the UI's "partial application" badge lies. `oracle-curses.ts`'s own Wasting curse (`chaSkills` target) is a real, documented instance of this exact gap: the vendored data itself uses a `chaSkills` group target that `compute.ts` never fans out to individual `skill.*` entries, so that curse's -4 penalty is inert on the derived sheet today (see `medium-spirits.ts`'s doc comment, which cites it explicitly). Don't repeat it -- check `targets.ts` before picking a target string.
5. **Test.** `packages/engine/test/oracleMysteryCurse.test.ts` is the fixture: build a Level 5 oracle with `oracleCurse: "lame"`, `compute()` it, assert `speeds.land === 20` (30 base - 10). A second test asserts an unknown curse tag computes byte-identical output to no curse at all, and a third asserts a non-oracle with a stale curse field is likewise unaffected -- the same three-shape test pattern (real effect / unknown id / wrong class) is worth writing for any new module.

Most of the 40-odd per-class modules (`arcanist-exploits.ts`, `witch-hexes.ts`, `rage-powers.ts`, `magus-arcana.ts`, `alchemist-discoveries.ts`, ...) follow this exact five-step shape: schema field → definition table with `changes: Change[]` → a gated loop in `collect.ts` → an existing consumer in `compute.ts` (or, if none exists yet, a new one plus a `targets.ts` entry) → a fixture test. Many entries in these tables are `changes: []` with only `contextNotes` (a prose reminder shown in the UI, never fed through `collect.ts`) -- that's the honest choice for an ability that's genuinely conditional/situational/triggered rather than a flat always-on number (see `judgments.ts`'s Resistance/Smiting entries, or almost any `displayOnly` cavalier order ability in `cavalier-orders.ts`). Don't invent a `Change` for something that only sometimes applies; a note is more honest than a wrong number.

When such a note states a save DC, write it as one of the phrases `feature-save-dc.ts` already knows (`"DC = 10 + 1/2 witch level + Int mod"` and friends) rather than inventing a new spelling: `resolveClassFeatures` swaps every recognized phrase for the number it works out to for this character before the note reaches the UI. An unlisted phrasing isn't an error -- it just passes through as the formula, which is what the sheet used to show for all of them. Adding a class means adding one entry to `SAVE_DC_PHRASES`, not a parser.

One exception to "a note is more honest than a wrong number": a bonus that always applies but only against a _category of effects_ ("+2 vs. poison", "+4 vs. spells and spell-like abilities") is expressible. Give the `Change` a `saveCategories` list drawn from `save-categories.ts`'s vocabulary, and it stays out of the save's headline total while producing a situational total underneath it (`ResolvedStat.conditionals`). Only promote a bonus when the whole of it fits the vocabulary; where it reaches past what the vocabulary carries, apply the part that fits and leave the rest in the note. The tracked creatures (companion, eidolon, phantom, familiar) don't go through `computeSave`, so anything they need calls `resolveSave` directly.

The same shape exists for combat maneuvers: a bonus scoped to named maneuvers ("+2 on trip attempts", "+4 to CMD against disarm") takes a `maneuverCategories` list drawn from `maneuver-categories.ts`'s ten-key vocabulary, stays out of the cmb/cmd headline totals, and surfaces as `DerivedSheet.cmbConditionals`/`cmdConditionals`. Whether the bonus guards your attempt or your defense is the `Change`'s own `cmb`/`cmd` target, so unlike saves there is no confinement axis and no parent graph -- the vocabulary is just the ten maneuvers. Flat-footed CMD deliberately takes no conditional lines.

A second, less common shape is the **toggle-buff pool** (`judgments.ts`, wired through `resources.ts`'s `ToggleBuffOption`): instead of a `build.*` field selecting one fixed option, the player activates/deactivates entries at the table (like a buff), and each one's `changes[]` only takes effect while active. Use this shape when the class feature is RAW a stance/toggle (a Judgment, a Bold Stare) rather than a permanent build-time pick.

### 3.2 Add a buff or condition effect

Buffs (temporary magical/mundane effects) and conditions (afflictions like shaken or prone) are largely **already vendored** -- `RefData.buffs`/the `CONDITIONS` table in `conditions.ts` carry their own `changes[]` in the same `{ formula, target, type }` shape as everything else, because Foundry's own data model for these already matches this engine's typed-modifier model (see `docs/design.md` §4: "Buffs already ARE the typed-modifier model"). `collect.ts`'s active-buffs loop applies `doc.live.activeBuffs[*].changes` directly; the conditions loop applies `CONDITIONS[condId].changes` directly. Most of the time, adding a new buff means nothing in the engine -- it's a data problem (is the buff correctly vendored?), not a code problem.

The recipe you actually need is for the case where a vendored buff's own `changes[]` is _missing_ a numeric effect its published description promises -- `buff-effects.ts`'s `BUFF_CHANGE_PATCHES`. Worked example: **Rage (Unchained)**, whose description text grants temporary HP per Hit Die, but the vendored `changes[]` never got a matching entry (a vendored-data gap, not an engine bug).

1. Author the missing `Change` as a `const`, with a doc comment citing the exact RAW text and the tier breakpoints (`buff-effects.ts`'s `RAGE_UNCHAINED_TEMP_HP`).
2. Register it in `BUFF_CHANGE_PATCHES`, **keyed by the buff's display `name`**, not its `RefData.buffs` id -- the id is a content hash that can shift on a data-pipeline rebuild (`refdata-update` skill), while `ActiveBuff.name` is a stable snapshot taken at activation time regardless of which UI path toggled the buff on.
3. `collect.ts`'s active-buffs loop applies `BUFF_CHANGE_PATCHES[buff.name] ?? []` alongside the buff's own vendored `changes[]` automatically -- no new wiring needed once the entry exists.

Conditions follow the same "mostly vendored, patch only if truly missing" posture, though there's no per-condition patch table today since none has needed one yet -- if you find a gap, mirror `BUFF_CHANGE_PATCHES`'s shape (name-keyed, doc-commented with the RAW citation) rather than editing `conditions.ts`'s vendored data in place.

Buff-gated build choices are the other buff-adjacent pattern worth knowing: a hand-authored `Change` can carry `activeWhenBuff: { buffIds?, effectTags? }`, consulted by `collect.ts`'s `buffGateSatisfied()`. Use this when a permanent build choice's bonus should only apply while a _separate_ buff is active -- e.g. a barbarian rage power that only works "while raging" (`rage-powers.ts`'s Raging Climber). A gated-but-inactive change is simply omitted from the collected list, not pushed through with a forced `applied: false` -- see `buffGateSatisfied`'s doc comment for why.

### 3.3 Add a feat effect

Feats are hand-authored in `feat-effects.ts`'s `FEAT_EFFECTS`, keyed by a normalized slug of the feat's name (`featNameSlug`, e.g. `"Iron Will"` → `"iron-will"`) rather than by `RefData.feats` id, because feat ids are opaque Foundry UUIDs that can shift between data versions while names are stable. Three entry shapes:

- **`StaticFeatEntry`** -- unconditional `changes[]`, applied whenever the character has the feat. Example: `toughness` (`+max(3, HD)` HP).
- **`ChoiceFeatEntry`** -- the feat needs a player-picked value. `collect.ts` reads `doc.build.featChoices[featId]` and, if set, calls `entry.build(choiceId)` to get the changes; unset means "no changes yet," never a crash. The `choice.type` axes are `skill`/`weapon`/`school` (option lists built from refData/doc in `apps/web/src/model/feats.ts`), `options` (the entry carries its own fixed `{id,label}` list -- Angelic Flesh's four manifestations), `energy` (the shared `ENERGY_TYPES` five), and `craft`/`perform`/`profession` (the character's OWN skill instances of that family, so `build()` receives a full instance id like `crf.alchemy` and targets `skill.<id>`).
- **`SituationalFeatEntry`** -- attack/damage tweaks that only apply under a condition the player judges at the table (Power Attack's grip choice, a range requirement). These are **never** read by `collect.ts`/`compute()` at all -- they live in a separate `SITUATIONAL_FEAT_EFFECTS` map, folded in only by `apps/web/src/model/savedRolls.ts` at resolve time, so it's structurally impossible for one to leak onto the always-on derived sheet.

Lookup precedence between the hand-verified table and the machine-extracted one (§3.4) goes through a single chokepoint, `resolveFeatEffect()` in `feat-effects-resolve.ts`: hand-verified wins whenever a slug exists in both, so the two tables can never double-apply the same feat. Both `collect.ts` and the builder's choice-picker UI call this resolver rather than touching either table directly -- if you're adding a feat, you only ever add to `FEAT_EFFECTS`; you never need to check `FEAT_EFFECTS_EXTRACTED` for a collision.

**The hybrid prerequisite rule** (this is a builder/`apps/web` concern, not an engine one -- feat _mechanics_ live in the engine, feat _prerequisite gating_ lives in `apps/web/src/model/prereqs.ts`): PF1 feat prerequisites in the vendored data are free text (`<p>Prerequisites: Str 13, Power Attack, base attack bonus +1.</p>` -- no structured field at all, per `docs/design.md` §4). `prereqs.ts` hard-blocks selection only on prerequisites it can reliably parse as **structured signals** -- an ability-score minimum, a BAB threshold, a caster-level threshold, or a required feat (extractable from the vendored `@UUID[...]` reference embedded in the prose). Anything else -- skill ranks, a class feature, a race, an alignment requirement -- is **soft-warned only**: shown to the player, never blocking the pick. `filterProseFragments` additionally suppresses a prose fragment once a matching structured check has confirmed it's met, so a satisfied `Dex 13` doesn't show both a green check and a redundant prose warning. **Never promise perfect prereq enforcement** when documenting or building against this -- the hybrid posture is deliberate, not a gap to be closed.

### 3.4 What the `*-extracted` files are

Two directories hold **machine-assisted, not machine-generated**, content: `feat-effects-extracted.ts` and `archetype-extracted/*.ts` (one file per class, plus `index.ts` aggregating them and `types.ts` holding shared types). These are the product of a one-time batch-extraction pass: an AI agent read every vendored feat/archetype-feature description in a class's slice, classified each into a bucket (`numeric` / `situational` / `subsystem` / `blocked` for archetype features -- see `archetype-extracted/fighter.ts`'s doc comment for the exact rubric), and, for the `numeric` bucket, wrote an ordinary hand-typed `Change` plus two extra fields: `confidence: "high" | "medium" | "low"` and `provenance: string` (the exact source sentence the number came from).

**There is no script that regenerates these files.** Don't confuse them with `packages/data-pipeline/data/*.json`, which genuinely _is_ machine-generated -- `bun run data:build` rebuilds every one of those from the vendored Foundry YAML, and hand-editing that JSON directly is the thing you must never do (edit `packages/data-pipeline/src/config.ts` or `supplements.ts`, then rebuild -- see the `refdata-update` skill). The `*-extracted.ts` files in `packages/engine/src` are the opposite: ordinary checked-in TypeScript source, written once by following a documented methodology, and extended the same way -- by hand (or by an AI agent repeating the same methodology) for a new class or a new feat, never by running a command. `archetype-extracted/index.ts`'s doc comment spells out the per-class file convention for anyone adding a class: one new `<class-tag>.ts` file exporting `<CLASS>_ARCHETYPE_EFFECTS_EXTRACTED` and `<CLASS>_ARCHETYPE_FEATURE_CLASSIFICATION`, plus one import + one object-spread line in `index.ts` -- no other file changes.

The rule that _does_ hold for these files: never add an entry without its own `provenance` quote and an honest `confidence` rating, and never promote a `situational`/`subsystem`/`blocked`-bucketed feature into a `Change` just because it would be convenient -- the classification audit is as much the deliverable as the effects table, since it's what lets a future pass (or a human reviewer) find what's still unmodeled.

**Three routes model an archetype's replacement of a scaling base feature** (fighter Armor Training is the archetype-dense case), and picking the wrong one double-counts, so check which already applies before adding anything:

1. **Whole-grant pairing** -- `pairedBaseFeatureUuid` suppresses the base grant entirely. Correct only when the archetype's features, in union, replace _every_ tier (most fighter archetypes do: each tier has its own replacing feature at 3rd/7th/11th/15th).
2. **Suppress + backfill** -- the pairing suppresses the whole grant AND the archetype's own vendored "Armor Training" row carries the kept/modified schedule as an extracted effect (dragoon, mobile fighter, tactician, rondelero duelist, weapon-bearer squire, cyber-soldier, child of Acavna and Amaznen). The vendored restatement row's truncated text usually _is_ the kept schedule -- read it before calling it a duplicate.
3. **`ARCHETYPE_TIER_REPLACEMENTS`** (`archetype-tier-replacements.ts`) -- for the residue where the base grant must stay live with individual tiers removed (Unbreakable, unarmed fighter): `collect.ts` substitutes the kept-tier count for the vendored formula. The same table's `"bonus feat"` kind subtracts single traded-away bonus-feat instances from the class's slot budget (`apps/web`'s `model/feats.ts`), unioned with vendored leveled `replacesSlot: { kind: "bonus feat" }` entries (monk/warpriest/swashbuckler archetypes carry those upstream). Entries key off the feature's own id, gate on the replaced tier's _gain_ level (not the feature's grant level), and claim conflict slot keys so two archetypes trading the same tier hard-block in the picker.

### 3.5 Add a granted-power patch (domain/school/inquisition)

A cleric/inquisitor domain, wizard arcane school (or focused school), and inquisitor inquisition all resolve their granted powers through one shared function, `collectGrantedFeatures()` (`archetypes.ts`) -- used for the class-feature display list and uses/day resource pools. Unlike a base class feature's own `changes[]` (§3.1, walked directly by `collect.ts`'s class-feature loop), nothing walked a _granted_ power's `changes[]` before `granted-power-effects/`: a domain power whose text plainly promises a bonus could sit inert forever.

Worked example: **Guarded Mind** (Void domain and its Isolation/Stars subdomains), "+2 insight bonus on saving throws against all mind-affecting effects" -- the same save-category shape §3.1 describes, just reached through a different collection path.

1. Author the `Change` in the right file under `granted-power-effects/`: `domains.ts` for cleric/inquisitor domains, subdomains, and druid nature-bond domain picks (all three resolve to `origin.kind: "domain"`); `schools.ts` for wizard arcane/focused schools (`origin.kind: "school"`); `inquisitions.ts` for inquisitor inquisitions (`origin.kind: "inquisition"`).
2. Key it by the granted power's `name`, matching `CLASS_FEATURE_CHANGE_PATCHES`'s rationale (§3.1) -- but the uniqueness check is wider here: the name has to be unique across _every_ catalog `collectGrantedFeatures` can reach (domains, subdomains, schools, focused schools, inquisitions), not just the one file being edited.
3. `collect.ts`'s granted-power loop calls `collectGrantedFeatures()` itself, filters to the `"domain"`/`"school"`/`"inquisition"` origins (every other origin -- bloodlines, hexes, rage powers, ... -- already has its own dedicated effect path, so it's deliberately excluded here to avoid a double-apply), looks up `GRANTED_POWER_CHANGE_PATCHES[grant.name]`, and evaluates with `@class.unlevel` set to the _granting_ class's level -- no new wiring needed once the entry exists.
4. As with every hand patch table in this package: never apply the granted power's own vendored `changes[]` here, only the hand-authored patch -- and only for an unconditional, self-facing number. Same "note is more honest than a wrong number" posture as §3.1.

### 3.6 Add a choose-one pick (`build.pickChoices`)

Some entries need a fixed selection locked in when they're gained (an energy type, a class skill) rather than a per-attack situational judgment -- `build.pickChoices` is the general-purpose store for this, keyed `"<namespace>:<entryId>"`, unioned into a `CharacterDoc` alongside `build.featChoices` (§3.3's narrower feat-only axis). The pattern originates with rage powers' Energy Resistance (`rage-powers.ts`'s `choice`/`choiceChanges` fields, keyed `ragePower:<powerId>`) and now covers four namespaces: `ragePower:`, `trait:` (`trait-effects-extracted.ts`'s `TRAIT_CHOICES`), `archetypeFeature:` (`archetype-effects.ts`'s `ArchetypeFeatureEffect.choice`/`.choiceChanges`, also on the machine-extracted per-class tables), and `classFeature:` (`class-feature-effects.ts`'s `CLASS_FEATURE_CHOICES` for a base class feature, or `granted-power-effects/schools.ts`'s `GRANTED_POWER_CHOICES` for a granted power -- both share the `classFeature:<id>` storage key even though they're consumed by two different `collect.ts` loops, since the entry's own vendored id is what's stable, not which loop happens to walk it).

Every namespace shares one shape: a `choice: { label: string; options: readonly {id,label}[] }` descriptor plus `choiceChanges: Record<optionId, Change[]>`. The consuming loop in `collect.ts` reads `doc.build.pickChoices["<namespace>:<id>"]`, looks up that option in `choiceChanges`, and applies its `Change[]` through the normal `evalChange` path -- no stored pick, or a stale option id no longer in the table, emits nothing, same posture as an unset `featChoices` entry. A class-skill grant (rather than a numeric bonus) doesn't ride `choiceChanges` at all -- it needs its own per-option list mirroring `TraitDef.classSkills`/`ExtractedTraitEntry.classSkills` (see `TRAIT_CHOICES`' `choiceClassSkills`), consumed wherever the base grant already flows (`traitGrantedClassSkills`, not the `evalChange` loop).

The trait namespace additionally supports a **family variant** for picks over the character's own Craft/Perform/Profession instances, which can't be enumerated into a fixed option list ahead of time: `choice: { families: readonly ("craft"|"perform"|"profession")[]; label }` with `familyChangeTemplate(instanceId)` / `familyClassSkillTemplate(instanceId)` in place of the static maps (the trait analog of a feat's `build(choiceId)`; the stored pick value is the full instance id, e.g. `crf.alchemy`). Web-side, `TraitRow` enumerates the options from the doc via the same helper the feat picker's craft/perform/profession axes use (`featChoiceOptions` in `apps/web/src/model/feats.ts`).

Cleanup on deselect is a per-namespace concern, not automatic: `apps/web/src/model/ragePowers.ts`'s `toggleRagePower` and `model/traits.ts`'s `toggleTrait` both drop their own namespace's stale key when the declaring entry is removed, and `model/doc.ts`'s `setArchetypes` does the same (given a `RefData` to resolve which features belonged to the removed archetype) for `archetypeFeature:`. `classFeature:` has no such seam yet -- `removeClass` has no `RefData` in scope to enumerate a removed class's feature ids -- so a stale `classFeature:` pick is inert (the class-feature loops only ever walk the character's current classes) but not purged; a future wave threading `RefData` through class removal would close that gap.

## 4. Testing

Every non-trivial engine behavior gets a **hand-computed fixture test** against the real vendored data, loaded via `loadRefData()` from `@pf1/data-pipeline` -- not a mock `RefData`. The pattern, visible in essentially every file under `packages/engine/test/`:

```ts
import { loadRefData } from "@pf1/data-pipeline";
import { compute } from "../src/index.js";

const ref = loadRefData();

function makeDoc(/* ... */): CharacterDoc {
  /* minimal but complete CharacterDoc */
}

describe("compute() + build.oracleCurse (Lame)", () => {
  it("a Lame oracle 5 (Human, base land speed 30) loses 10 ft. of land speed", () => {
    const withCurse = compute(makeDoc([{ tag: "oracle", level: 5 }], "lame"), ref);
    expect(withCurse.speeds.land).toBe(20);
  });
});
```

Because the test runs against real vendored data, it exercises the actual class/race/feat lookups a production sheet would, not a hand-rolled stand-in that could silently drift from the schema.

**Convention: cite the rulebook source for every expected number**, so a human (not just the original author) can re-derive it without trusting the test blindly. Existing tests cite a CRB/APG page number or a live aonprd.com page (e.g. `tempHp.test.ts` cites "Paizo FAQ / CRB p. 208"; `judgments.test.ts` cites "aonprd.com's live Inquisitor class page"). Do the same for any new fixture: a bare `expect(x).toBe(37)` with no citation is a test nobody can review.

**The licensing constraint, verbatim in spirit** (`docs/design.md` §6, `CLAUDE.md`): the engine is a clean-room reimplementation, licensed AGPL-3.0-or-later specifically because part of it was written with LLM assistance whose training data plausibly includes Foundry's GPL-3.0 `pf1` system source. Foundry's system code (`apply-changes.mjs`, `formulas.mjs`) may be used **only as a behavioral test oracle** -- run their code and this engine's code against the same input, compare the two _outputs_, and if they diverge, fix the divergence. Never open their source to see _how_ they computed a result, never copy or transcribe a line of it, and never let a test assertion's derivation trace back to "because their code does X" instead of "because CRB p. N says X." If you genuinely need to validate a tricky stacking or formula edge case against their behavior, do it by running their system in Foundry and recording the observed input/output pair as your fixture's citation -- not by reading their `.mjs` files.
