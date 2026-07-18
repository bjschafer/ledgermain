import type { AbilityId, Change, ContextNote, SizeId, SkillId, TraitDef } from "./primitives.js";
import type { Feat, Race } from "./refdata.js";

/**
 * A PF1 wizard arcane school tag: one of the eight specialist schools, or
 * "uni" for Universalist (no specialization). Matches `Spell.school` values
 * in the vendored data.
 */
export type WizardSchoolTag = "abj" | "con" | "div" | "enc" | "evo" | "ill" | "nec" | "trs" | "uni";

/**
 * The character document is the single source of truth: it holds build choices
 * and live session state, but NEVER derived values. Fleshed out in Stage 2 to
 * the extent the rules engine needs as input; the builder (Stage 3) will add the
 * remaining choice/option detail. Mirrors DESIGN.md §3.1.
 */
export interface CharacterDoc {
  schemaVersion: number;
  id: string;
  /** sync (DESIGN §2.1): whose document this is. Set in Stage 5. */
  ownerId: string;
  /** sync: optimistic-concurrency counter, bumped on each save. */
  version: number;
  /** sync: ISO timestamp of last change. */
  updatedAt: string;
  identity: {
    name: string;
    /** Race id (key into RefData.races). */
    race: string;
    /** Class tag + level pairs (multiclass-capable). */
    classes: { tag: string; level: number }[];
    alignment?: string;
    deity?: string;
    gender?: string;
    age?: string;
    height?: string;
    weight?: string;
    /** Free-text physical description / appearance notes. */
    appearance?: string;
    /**
     * Favored class tag (for the favored-class bonus). The per-level HP/skill
     * choices are recorded in `build.favoredClassBonus`; until the builder
     * populates that, the engine applies no FCB (see engine HP assumptions).
     */
    favoredClass?: string;
    /**
     * Second favored-class tag, for Half-Elf's Multitalented racial trait
     * (issue #4): half-elves pick TWO favored classes, earning the FCB choice
     * for a level in EITHER one. `undefined` for every other race (and for a
     * half-elf who hasn't picked a second yet). There's no structured RefData
     * flag for Multitalented — the vendored Half-Elf entry only carries it as
     * prose in `description` — so callers key off race NAME ("Half-Elf"; see
     * `model/race.ts:isMultitalented`), same posture as `model/feats.ts`'s
     * Human-bonus-feat check. Never set to the same tag as `favoredClass`
     * (see `model/doc.ts:setFavoredClass2`) — `model/race.ts:favoredClassBonusLevels`
     * sums both classes' levels, so a duplicate would double-count.
     */
    favoredClass2?: string;
    /**
     * For races with a flexible +2 (Human/Half-Elf/Half-Orc), the chosen
     * ability. Ignored for races with fixed ability modifiers.
     */
    flexibleAbility?: AbilityId;
  };
  /** Base ability scores only — no racial/item adjustments baked in. */
  abilities: Record<AbilityId, number>;
  build: {
    /** Feat ids chosen (keys into RefData.feats). */
    feats: string[];
    /**
     * Character-trait ids chosen at creation (keys into `@pf1/engine`
     * `TRAITS`). PF1 characters normally take two, from two different
     * categories (combat/faith/magic/social) — free-choice, soft-warned only
     * above two (matches the project's hybrid soft-warning posture; see
     * `model/traits.ts`). Traits are hand-authored clean-room content (not in
     * the vendored Foundry data pack — see `@pf1/engine` `traits.ts`).
     * Optional/back-compat: documents without this field behave as if no
     * traits were chosen.
     */
    traits?: string[];
    /**
     * Alternate racial trait ids chosen (keys into `@pf1/engine`
     * `RACIAL_TRAITS`, issue #35). Each swaps one or more of the race's
     * standard traits for an alternate — the engine applies the alternate's
     * `changes[]` and suppresses the replaced standard trait's structured race
     * change (e.g. a Human taking Focused Study drops the `bonusFeats` grant).
     * Free-choice/soft-warned only: two alternates that replace the same
     * standard trait conflict (see `model/racialTraits.ts`), never blocked.
     * Alternate racial traits are hand-authored clean-room content (not in the
     * vendored Foundry pack — see `@pf1/engine` `racial-traits.ts`). Cleared on
     * any race change (`model/doc.ts:setRace`); ids whose race doesn't match the
     * current race are ignored by the engine. Optional/back-compat: absent =
     * none chosen.
     */
    racialTraits?: string[];
    skillRanks: Record<SkillId, number>;
    /**
     * Cleric domain tags chosen at L1 (PF1 grants two; UI is free-choice since
     * the vendored data carries no deity/domain mapping — matches the project's
     * hybrid-prereqs "soft warning only" policy). Empty for non-clerics. Each
     * chosen domain grants one bonus prepared slot per accessible spell level,
     * drawable from `refData.domainSpellLists[<tag>]`.
     */
    clericDomains?: string[];
    /**
     * Sorcerer bloodline tag (key into `refData.bloodlineSpellLists`), chosen at L1.
     * Free-choice since the vendored data carries no sorcerer-heritage mapping —
     * matches the project's hybrid soft-warning posture (see clericDomains above).
     * Empty/undefined for non-sorcerers. The chosen bloodline grants bonus spells
     * known at odd sorcerer levels ≥3 (see model/spellcasting.bloodlineSpellsKnown).
     * Back-compat: documents without this field are unaffected.
     */
    sorcererBloodline?: string;
    /**
     * Energy-type / subtype variant for bloodlines whose powers name a
     * player-chosen energy type (Draconic's dragon type, Elemental's
     * element) — issue #34. Free-form id into `@pf1/engine`
     * `BLOODLINES[sorcererBloodline].variantOptions` (e.g. "red" for a
     * Draconic sorcerer, "fire" for Elemental). Display-only: it selects
     * which flavor text a power's summary/context notes show, not any
     * numeric `Change` (see `bloodlines.ts`'s doc comment for why). Ignored
     * for bloodlines that don't declare `variantOptions`. Unknown/absent
     * values resolve to generic, non-crashing display text — never a crash.
     * Back-compat: documents without this field are unaffected.
     */
    sorcererBloodlineVariant?: string;
    /**
     * Wizard specialization school tag. One of the eight PF1 schools
     * ("abj","con","div","enc","evo","ill","nec","trs") or "uni" (Universalist —
     * no opposition schools, no bonus slot). Free-choice; the vendored Foundry
     * data has no per-school mapping of *spell-slot* effects (that part is
     * still hand-authored). Default undefined = Universalist (back-compat:
     * existing wizard docs load as Universalist).
     *
     * A specialist (any non-"uni" tag) gains one bonus prepared slot per
     * accessible spell level 1–9 (rendered with `PreparedSpell.kind ===
     * "school"`), exclusive to spells of that school, plus two opposition
     * schools (see `wizardOppositionSchools`). A Universalist gains NO bonus
     * slot (PF1 RAW — their compensation is school powers). School powers
     * (Hand of the Apprentice, Intense Spells, etc., for every school
     * including Universalist) ARE vendored and granted via
     * `refData.wizardSchools` / `collectGrantedFeatures` in `@pf1/engine` —
     * `undefined` here resolves to Universalist for power-granting too.
     */
    wizardSchool?: WizardSchoolTag;
    /**
     * Two opposition school tags for a specialist wizard; empty/omitted for
     * Universalist. Opposition-school spells cost two normal slots to prepare
     * (PF1 RAW). Free-choice (no school-vs-opposition validation — soft-warning
     * posture, matching the cleric domain free-choice policy).
     */
    wizardOppositionSchools?: string[];
    /**
     * Arcane bond chosen at L1 by wizards (some sorcerer archetypes also bond —
     * that gate is deferred; the picker renders for wizards only in v1). A
     * familiar grants its published master bonus (hand-authored table in
     * `@pf1/engine` `familiars.ts`, applied through the engine's
     * change-collection path — e.g. bat +3 Fly, toad +3 hit points). A bonded
     * object records the player's choice and surfaces its RAW mechanics as
     * display text only (the 1/day cast-any-spellbook-spell and the DC 20 +
     * spell level concentration check when casting without the object are NOT
     * modeled numerically in v1).
     *
     * `familiarKind` keys into the engine familiar table (e.g. "bat"); unknown
     * kinds apply nothing (soft warning, never a crash). `bondedItemName` is a
     * free-text display label for the bonded object in v1 (no `build.gear`
     * ref — gear entries have no stable ids to point at).
     * Back-compat: documents without `arcaneBond` are unaffected.
     */
    arcaneBond?: {
      type: "familiar" | "object";
      /** Present iff `type === "familiar"`; keys into the engine familiar table. */
      familiarKind?: string;
      /** Present iff `type === "object"`; free-text display name (v1). */
      bondedItemName?: string;
    };
    /**
     * Archetype ids chosen (keys into `RefData.archetypes`, e.g.
     * `"fighter:two-handed-fighter"`). No conflict validation — matches the
     * project's hybrid soft-warning posture.
     */
    archetypes?: string[];
    /**
     * Ranger favored enemies (PF1 CRB p. 64). Each entry is a chosen creature
     * type (key into `@pf1/engine` `FAVORED_ENEMY_TYPES`) plus the scaling bonus
     * the player has assigned to it. A ranger gains a new favored enemy at
     * levels 1, 5, 10, 15, 20 and, at each of those milestones, may also raise
     * one existing favored enemy's bonus by +2 — so the *distribution* is a
     * player choice, not derivable from level alone (which is why `bonus` is
     * stored per entry rather than computed). Free-choice, soft-validated: the
     * builder hints the available slot count / total bonus budget but never
     * hard-blocks (matches the project's hybrid posture). Empty/undefined for
     * non-rangers and back-compat docs.
     *
     * The bonus is inherently situational (it applies only vs. that creature
     * type), so it is NEVER folded into the always-on derived sheet — it
     * surfaces via `SavedRoll.rangerBonuses` attachments, resolved live against
     * `DerivedSheet.ranger`.
     */
    favoredEnemies?: { type: string; bonus: number }[];
    /**
     * Ranger favored terrains (PF1 CRB p. 65). Same shape and same
     * situational/soft-validated treatment as {@link favoredEnemies}; a new
     * terrain is gained at levels 3, 8, 13, 18. `type` keys into `@pf1/engine`
     * `FAVORED_TERRAIN_TYPES`. Surfaces via `SavedRoll.rangerBonuses`.
     */
    favoredTerrains?: { type: string; bonus: number }[];
    /**
     * Ranger combat style (PF1 CRB p. 64). One of `@pf1/engine` `COMBAT_STYLES`
     * (CRB: `"archery"` | `"two-weapon"`). Chosen at level 2. The bonus-feat
     * *count* already flows through the generic `classBonusFeats` pipeline; this
     * choice records which style tree those bonus feats must come from and lets
     * the feat picker waive prerequisites for that tree's feats (a ranger need
     * not meet the normal prereqs — CRB). Free-choice; undefined = unchosen.
     */
    combatStyle?: string;
    /**
     * Free-text bonus languages the character has picked up beyond the
     * racial set (`RefData.races[*].languages`) — from a positive Int
     * modifier, Linguistics ranks, or background. No fixed vocabulary in the
     * vendored data, so this is unvalidated free text (soft-warning posture,
     * matching `clericDomains`/`archetypes` above); `model/languages.ts`
     * computes a *suggested* count as a hint only, never a cap.
     * Back-compat: documents without this field show no bonus languages.
     */
    bonusLanguages?: string[];
    /** Bonus-feat picks, etc. — typed in Stage 3. */
    classFeatureChoices: unknown[];
    /**
     * Spells the character *knows*. For a prepared caster (wizard) this is the
     * spellbook — the library you may prepare from. The daily prepared loadout
     * and cast-tracking live in `live.spells`, NOT here, because preparation is
     * session state that resets on rest (DESIGN: build.* vs live.*).
     *
     * Multiclass casters (issue #22): `known` always holds the *primary*
     * caster class's list — the first class in `identity.classes` (in array
     * order) that has a spell list (see `model/spellcasting.ts`
     * `casterClassesOf`/`primaryCasterClassTag`). A second-or-later caster
     * class's known list lives in `byClass`, keyed by class tag. This keeps
     * every single-caster document — which is every document predating this
     * feature, and every document with only one caster class going forward —
     * byte-identical: `byClass` is never populated unless the character has
     * 2+ caster classes, and even then the primary class's spells stay in the
     * flat `known` array rather than being duplicated into `byClass`.
     * `model/spellcasting.ts`'s `knownSpellsFor`/`setKnownSpellsFor` are the
     * only code that should read or write either field.
     */
    spells: { known: string[]; byClass?: Record<string, { known: string[] }> };
    gear: ItemInstance[];
    /**
     * Manually-entered weapons. Optional for back-compat: existing documents without
     * this field produce an empty `attacks` array on the DerivedSheet.
     */
    weapons?: WeaponInstance[];
    /**
     * Per-character-level favored-class bonus choice. In Standard PF1 mode one of
     * `"hp"` (+1 HP), `"skill"` (+1 rank), or `"other"` (alternate per class/race).
     * In house-rule mode `"both"` grants +1 HP AND +1 skill rank simultaneously;
     * `"alternate"` still points to the alternate option. Both modes share this
     * single array so documents are backward-compatible; the UI controls which
     * options appear. Omitted entirely until the builder collects it.
     */
    favoredClassBonus?: ("hp" | "skill" | "other" | "both" | "alternate")[];
    /**
     * Per-character-level rolled HP values (index i = character level i+1).
     * Level 1 is always maxed regardless of the stored value. Only used when
     * `settings.hpMode === "rolled"`.
     */
    hpRolls?: number[];
    /**
     * User-set maximum HP (e.g. rolled). When present it overrides the computed
     * average max. Omitted = use the rules average.
     * @deprecated Prefer `settings.hpMode` + `hpRolls` for per-level entry.
     *   Still honoured for backward-compat when hpMode is absent/average.
     */
    maxHpOverride?: number;
    /**
     * Player choices for feats that require a selection (e.g. "Skill Focus" →
     * a skill id; "Weapon Focus" → a weapon type string). Keyed by feat id
     * (the same id stored in `feats[]`) — the FIRST instance of that feat
     * only; a 2nd+ instance (issue #58) stores its own choice on its
     * `extraFeats` entry instead.
     *
     * Optional for back-compat: existing documents without this field behave as if
     * no choices have been made (choice-feats emit no changes until a choice is set).
     */
    featChoices?: Record<string, string>;
    /**
     * Additional instances of a RAW-repeatable feat (issue #58) beyond the
     * first — Weapon Focus, Skill Focus, Improved Critical, the "Extra X"
     * pool feats, and the rest of `apps/web/src/model/repeatableFeats.ts`'s
     * curated set. The FIRST instance of any feat always lives in `feats[]`
     * (with its choice, if any, in `featChoices[featId]`) exactly as before
     * this field existed; `extraFeats` only ever holds the 2nd, 3rd, ...
     * copies, each with its own stable `instanceId` (since the same `featId`
     * can appear more than once here) and its own optional `choiceId`. A
     * feat's primary instance is removed from `feats[]` only once every
     * `extraFeats` entry for it is gone too — see `model/doc.ts`
     * `removeFeatInstance`'s promotion behavior, which keeps that invariant
     * so every other module's `feats.includes(featId)` "do they have this
     * feat" check stays correct without needing to know about this field.
     * Optional/back-compat: absent = no extra instances, matching every
     * document that predates this feature.
     */
    extraFeats?: { instanceId: string; featId: string; choiceId?: string }[];
    /**
     * Level-up ability score increases (one +1 per entry); the player chooses one
     * ability at each 4th character level. Capped at floor(level/4) when applied.
     */
    abilityIncreases?: AbilityId[];
    /**
     * GM/homebrew grants that adjust the build-resource budgets. All values are
     * additive addends to the rules-derived totals: `skillRanks` to the
     * skill-point budget (`model/skills.ts:skillBudget`), `featSlots` to the
     * expected feat count (`model/feats.ts:expectedFeatCount`). Negative values
     * are permitted (a GM may claw back), clamped to [-999, 999] by the
     * transitions.
     *
     * These are *budget* adjustments, not specific grants — they loosen (or
     * tighten) how many ranks/feats the player may spend, not which ones.
     * A GM who wants "give the player Toughness" instead adds the feat id to
     * `feats[]` and uses `featSlots` to loosen the budget so the over-budget
     * warning doesn't fire. Omitted fields behave as 0.
     * Back-compat: documents without `gmGrants` are unaffected.
     */
    gmGrants?: { skillRanks?: number; featSlots?: number };
    /**
     * Character-level settings controlling HP mode, FCB rule variant, hero-point
     * cap, and manual stat overrides.
     */
    settings?: {
      /**
       * How maximum HP is computed.
       * - `"average"` (default): L1 max HD, subsequent levels `floor(HD/2)+1`.
       * - `"max"`: every level is the full die value.
       * - `"rolled"`: L1 max HD; levels 2-N use `hpRolls[level-1]` (falls back to
       *   average when unset).
       */
      hpMode?: "average" | "max" | "rolled";
      /**
       * How the tracker's "Rest"/"New Day" actions heal HP overnight (issue #32).
       * - `"full"` (default): heal straight to max — a common table house-rule
       *   simplification, and the tracker's pre-#32 behavior, preserved for
       *   every existing document that predates this setting.
       * - `"natural"`: PF1 RAW natural healing rate — 1 HP × character level
       *   per night of rest, capped at max. Full bed rest (2×level, requiring
       *   a full day of doing nothing else) is out of scope for v1; this only
       *   models one night. Nonlethal damage clears entirely under either
       *   mode: RAW heals nonlethal at 1×level per HOUR, and a "new day"
       *   action represents 8+ hours, so a full clear is the exact result,
       *   not an approximation.
       */
      restMode?: "full" | "natural";
      /**
       * When true, each favored-class level that picks `"both"` grants +1 HP AND
       * +1 skill rank simultaneously (house-rule). Default false = Standard PF1.
       */
      fcbHouserule?: boolean;
      /**
       * House-rule (issue #56): cleric class features key off Wisdom instead of
       * Charisma — e.g. Channel Energy's uses/day and save DC. Scoped strictly
       * to cleric-tagged class-feature formulas; the character's actual Cha
       * score/mod, skills, and saves are unchanged, and other Cha-driven
       * classes (paladin, sorcerer, oracle, bard) are unaffected either way.
       * Default false = Standard PF1 (RAW).
       */
      clericWisdomHouserule?: boolean;
      /**
       * Whether this character uses the hero-points optional rule. When false,
       * the tracker hides the hero-points panel and `heroPointsCap` is ignored.
       * Absent (default) = true, preserving existing characters' behaviour.
       */
      heroPointsEnabled?: boolean;
      /** Override the default HERO_POINT_CAP (3). Must be a positive integer. */
      heroPointsCap?: number;
      /**
       * Whether this character tracks XP at all (PF1 optional rule — the
       * owner's table plays milestone). Absent (default) = false, hiding the
       * XP panel entirely; set true to opt in. Unlike `heroPointsEnabled`,
       * this defaults OFF since XP tracking is the exception, not the norm.
       */
      xpEnabled?: boolean;
      /**
       * Which hand-authored PF1 CRB advancement track (slow/medium/fast)
       * governs `nextLevelAt` thresholds (see model/xp.ts). Only meaningful
       * when `xpEnabled`. Absent = `"medium"`.
       */
      xpTrack?: "slow" | "medium" | "fast";
      /**
       * Manual overrides for specific derived stats. Keys are from the bounded
       * allowlist enforced by the engine: `hp.max`, `ac.normal`, `speeds.land`,
       * `initiative.total`, `bab`, `cmd`, `cmb`, `saves.fort.total`,
       * `saves.ref.total`, `saves.will.total`.
       */
      statOverrides?: Record<string, number>;
      /**
       * Whether this character uses the PF1 OPTIONAL carrying-capacity /
       * encumbrance rule (issue #16) — the owner's table doesn't use it, so
       * this defaults OFF (same posture as `xpEnabled`, unlike
       * `heroPointsEnabled` which defaults on). When false (or absent), the
       * engine applies zero load-based penalties and computes no
       * `DerivedSheet.encumbrance` — existing documents are completely
       * unaffected. When true, total carried weight (gear weight × quantity,
       * plus equipped armor/weapon weight) is compared against the
       * Strength-based carrying-capacity table (`@pf1/engine`
       * `carryingCapacity`) to derive a light/medium/heavy load tier, which
       * then feeds RAW max-Dex-to-AC caps, armor-check-penalty, and land
       * speed reduction (see `DerivedSheet.encumbrance` and
       * `@pf1/engine/encumbrance.ts`).
       */
      encumbranceEnabled?: boolean;
      /**
       * Whether the tracker offers the Polymorph / Wild Shape panel.
       * Tri-state: absent = auto — shown only when the character has a
       * polymorph source (druid Wild Shape levels, shifter, or a known
       * Beast Shape / Elemental Body / Plant Shape spell) or is already
       * transformed. `true` forces it on for a character whose only access
       * is off-sheet (a scroll, a potion, a GM handout); `false` hides it
       * even for a druid.
       */
      polymorphEnabled?: boolean;
      /**
       * Homebrew "unrestricted alignments" house rule (issue #53). PF1 CRB
       * restricts a handful of base classes to a subset of alignments
       * (Barbarian: any nonlawful; Monk: any lawful; Paladin: lawful good;
       * Druid: any neutral) — see `apps/web/src/model/alignment.ts` for the
       * full table. Ledgermain only ever soft-warns on a mismatch, never
       * blocks; this flag, when true, suppresses that warning entirely for
       * tables that don't use alignment restrictions. Default false
       * (absent) = warnings shown, matching the RAW-default posture of
       * `encumbranceEnabled`'s sibling toggles.
       */
      ignoreClassAlignmentRestrictions?: boolean;
    };
    /**
     * Player-curated bookmarks into already-computed sheet numbers (issue #2,
     * "saved rolls"). Per the owner decision on that issue, there is no dice
     * roller — this is a static lookup: pin a stat (e.g. "Full attack —
     * Composite Longbow") so its current total is one glance away on the Play
     * tab instead of hunting through the full sheet. A saved roll is always
     * resolved live against the current `DerivedSheet` (see
     * `model/savedRolls.ts`); nothing here is a frozen snapshot, so it stays
     * correct as buffs/feats/gear change.
     */
    savedRolls?: SavedRoll[];
    /**
     * A tracked familiar (PF1 arcane familiar) — independent of `arcaneBond`
     * above (which only models the Wizard class feature's master-SIDE bonus
     * choice between a familiar-kind and a bonded object). This field models
     * the familiar itself as a trackable creature with its own derived
     * AC/saves/attacks/skills — see `@pf1/engine` `deriveFamiliar` — so any
     * class/feature that grants a familiar (Wizard arcane bond, an Arcanist
     * exploit, a feat, ...) can use it, not just wizards. Reuses the same
     * species slugs as `@pf1/engine` `FAMILIAR_KINDS` (bat/cat/hawk/...) for
     * continuity with `arcaneBond`, but is a distinct field — a wizard could
     * in principle set `arcaneBond.type === "familiar"` (for the RAW master
     * bonus) and also this `familiar` (for the full trackable stat block)
     * pointing at the same species. Optional/back-compat: documents without
     * this field have no tracked familiar.
     */
    familiar?: FamiliarBuild;
    /**
     * Arcanist exploit ids chosen (keys into `@pf1/engine` `ARCANIST_EXPLOITS`
     * — issue #42). Gained at 1st level and every 2 levels thereafter (1st,
     * 3rd, 5th, ...), plus one per "Extra Arcanist Exploit" feat taken; see
     * `model/arcanistExploits.ts` for the budget math. Free-choice, soft
     * warning only on overspend — same posture as `traits`/`racialTraits`.
     */
    arcanistExploits?: string[];
    /**
     * Magus arcana ids chosen (keys into `@pf1/engine` `MAGUS_ARCANA` —
     * issue #61). Gained at 3rd level and every 3 levels thereafter (3rd,
     * 6th, 9th, ...), plus one per "Extra Arcana" feat taken; see
     * `model/magusArcana.ts` for the budget math. Free-choice, soft warning
     * only on overspend — same posture as `arcanistExploits` above.
     */
    magusArcana?: string[];
    /**
     * A tracked animal companion (PF1 druid Nature Bond / ranger Hunter's
     * Bond) — independent of, but closely mirroring, `familiar` above: this
     * models the companion itself as a trackable creature with its own
     * derived HD/BAB/saves/AC/attacks/skills — see `@pf1/engine`
     * `deriveCompanion`. Optional/back-compat: documents without this field
     * have no tracked companion.
     */
    animalCompanion?: AnimalCompanionBuild;
    /**
     * Oracle mystery tag (key into `@pf1/engine` `ORACLE_MYSTERIES`), chosen at
     * L1 and never changed thereafter (PF1 RAW). Free-choice — matches the
     * project's hybrid soft-warning posture (see `clericDomains`/
     * `sorcererBloodline` above). Grants one bonus spell known at oracle level
     * 2 and every two levels thereafter (see `model/spellcasting.mysterySpellsKnown`)
     * and (display-only) class skills — see `ORACLE_MYSTERIES` doc comment for
     * why class-skill grants aren't wired into the derived skill list.
     * Empty/undefined for non-oracles. Back-compat: documents without this
     * field are unaffected.
     */
    oracleMystery?: string;
    /**
     * Oracle's curse tag (key into `@pf1/engine` `ORACLE_CURSES`), chosen at L1
     * and never changed thereafter (PF1 RAW). Free-choice, same posture as
     * `oracleMystery`. Most curses are display-only tiered prose; Wasting and
     * Lame carry a real numeric `Change` (see `ORACLE_CURSES` doc comment).
     * Empty/undefined for non-oracles. Back-compat: documents without this
     * field are unaffected.
     */
    oracleCurse?: string;
    /**
     * Oracle revelation ids chosen (keys into `@pf1/engine`
     * `ORACLE_REVELATIONS` — issue #61), scoped to the character's chosen
     * `oracleMystery`. Gained at 1st, 3rd, 7th, 11th, 15th, and 19th level,
     * plus one per "Extra Revelation" feat taken; see
     * `model/oracleRevelations.ts` for the budget math. Free-choice, soft
     * warning only on overspend — same posture as `arcanistExploits`. Does
     * NOT include the mystery's automatic 20th-level Final Revelation (see
     * `ORACLE_MYSTERY_FINAL_REVELATIONS`, informational only).
     */
    oracleRevelations?: string[];
    /**
     * Fighter's Weapon Training group picks, in grant order — index 0 = the
     * group chosen at 5th level, index 1 = 9th, index 2 = 13th, index 3 =
     * 17th (PF1 RAW: `["bows"]` alone means only the 5th-level pick has been
     * made yet). Each entry should be one of `@pf1/engine`'s `WEAPON_GROUPS`
     * slugs (free-choice — not hard-validated, same soft posture as
     * `oracleMystery`/`oracleCurse`). Previously deferred (no schema field
     * existed at all) because the engine had no semantic weapon-group
     * targeting; issue #45 built `attack.weapon.<group>`/`damage.weapon.<group>`
     * matching against a weapon's vendored `weaponGroups`, so this field plus
     * `collect.ts`'s per-group bonus derivation (mirroring the RAW "+1 at the
     * grant level, +1 more per 4 levels thereafter, including to earlier
     * picks" progression) is the only remaining piece. Suppressed entirely —
     * see `@pf1/engine` `weaponTrainingReplaced` — when an active archetype
     * replaces the base Weapon Training feature (e.g. Archer's Expert
     * Archer), so its own extracted per-archetype bonus is never doubled by
     * also filling in this field. Empty/undefined for non-fighters or a
     * fighter who hasn't made any picks yet.
     */
    weaponTrainingGroups?: string[];
    /**
     * Psychic discipline tag (key into `@pf1/engine` `PSYCHIC_DISCIPLINES` —
     * Occult Adventures), chosen at L1 and never changed thereafter (PF1
     * RAW). Free-choice, same soft posture as `oracleMystery`/
     * `sorcererBloodline`. Determines the ability score (Wis or Cha) used for
     * the psychic's Phrenic Pool/Phrenic Amplifications (see
     * `PSYCHIC_DISCIPLINES` doc comment — the vendored `uses.maxFormula` for
     * Phrenic Pool hardcodes `@abilities.cha.mod` regardless of discipline; a
     * Wisdom-based discipline is corrected in `resources.ts`) and grants one
     * bonus spell known at psychic level 1, then 4th and every 2 levels
     * thereafter (see `model/spellcasting.disciplineSpellsKnown`). Each
     * discipline's 1st/5th/13th-level discipline powers are prose-only and
     * NOT modeled (same posture as oracle revelations). Empty/undefined for
     * non-psychics. Back-compat: documents without this field are unaffected.
     */
    psychicDiscipline?: string;
    /**
    /**
     * Witch patron tag (key into `@pf1/engine` `WITCH_PATRONS` — issue #65),
     * chosen at L1 and never changed thereafter (PF1 RAW). Free-choice, same
     * soft posture as `oracleMystery`/`sorcererBloodline`. Grants one bonus
     * spell known (added to the familiar's spells) at witch level 2 and every
     * two levels thereafter (see `model/spellcasting.patronSpellsKnown`),
     * mirroring `oracleMystery`'s bonus-spell shape exactly. Empty/undefined
     * for non-witches. Back-compat: documents without this field are
     * unaffected.
     */
    witchPatron?: string;
    /**
     * Witch hex ids chosen (keys into `@pf1/engine` `WITCH_HEXES` — issue
     * #65). Gained at 1st level and every even level thereafter (1st, 2nd,
     * 4th, 6th, ..., 20th — 11 total by 20th), plus one per "Extra Hex" feat
     * taken; see `model/witchHexes.ts` for the budget math. Major hexes
     * (minLevel 10) and Grand hexes (minLevel 18) are soft-gated the same way
     * `ORACLE_REVELATIONS`/`MAGUS_ARCANA` gate their own higher-minimum
     * entries — never blocks selection. Free-choice, soft warning only on
     * overspend — same posture as `oracleRevelations`. Empty/undefined for
     * non-witches. Back-compat: documents without this field are unaffected.
     */
    witchHexes?: string[];
    /**
     * Alchemist discovery ids chosen (keys into `@pf1/engine`
     * `ALCHEMIST_DISCOVERIES` — issue #65). Gained at 2nd level and every
     * even level thereafter (2nd, 4th, ..., 20th — 10 total by 20th), plus
     * one per "Extra Discovery" feat taken; see
     * `model/alchemistDiscoveries.ts` for the budget math. Does NOT include
     * the automatic 20th-level Grand Discovery (informational only, not one
     * of these picks — mirrors `oracleRevelations`' Final Revelation
     * treatment). Free-choice, soft warning only on overspend. Empty/undefined
     * for non-alchemists. Back-compat: documents without this field are
     * unaffected.
     */
    alchemistDiscoveries?: string[];
    /**
     * Shaman spirit tag (key into `@pf1/engine` `SHAMAN_SPIRITS` — issue #65),
     * chosen at L1 and never changed thereafter (PF1 RAW). Free-choice, same
     * soft posture as `oracleMystery`/`psychicDiscipline`. Grants the spirit's
     * Spirit Magic bonus-spell list (see `model/spellcasting.shamanSpiritSpellsKnown`),
     * a note-tier 1st-level Spirit Ability (surfaced via the class-features
     * list, no numeric effect modeled — see `SHAMAN_SPIRITS` doc comment),
     * and access to the spirit's 5 exclusive hexes (`shamanHexes` below).
     * Empty/undefined for non-shamans. Back-compat: documents without this
     * field are unaffected.
     */
    shamanSpirit?: string;
    /**
     * Shaman hex ids chosen (`<spiritTag>:<camelCaseName>` — keys into
     * `@pf1/engine` `SHAMAN_SPIRITS[tag].hexes`), scoped to the character's
     * chosen `shamanSpirit`. Gained at 2nd, 4th, 8th, 10th, 12th, 16th, 18th,
     * and 20th level (PF1 ACG RAW, verified against aonprd.com — NOT the
     * "every 4 levels from 2nd" cadence a witch's Hex table uses); see
     * `model/shamanHexes.ts` for the budget math. Free-choice, soft warning
     * only on overspend — same posture as `oracleRevelations`. Every hex here
     * is note-tier/`displayOnly` (prose summary, no `Change[]`) — a numeric
     * witch/shaman hex-effects table is a separate, larger undertaking.
     * Wandering Spirit (4th) and Wandering Hex (6th)
     * — both re-chosen DAILY, not fixed build picks — are deliberately NOT
     * modeled here, same "live/daily choice, no build.* field" posture as
     * the medium's spirits.
     */
    shamanHexes?: string[];
    /**
     * Cavalier/samurai order tag (key into `@pf1/engine` `CAVALIER_ORDERS` /
     * `SAMURAI_ORDERS` — issue #65), chosen at L1 and never changed
     * thereafter (PF1 RAW). Free-choice, same soft posture as
     * `oracleMystery`/`psychicDiscipline` — no hard validation that the tag
     * is one the character's class(es) can actually take (a samurai may pick
     * any of the six APG cavalier orders in addition to Warrior/Ronin; a
     * cavalier may not pick Warrior/Ronin — the picker UI enforces that, this
     * field doesn't). Shared by both classes rather than split into
     * `cavalierOrder`/`samuraiOrder`: PF1 RAW lets a samurai freely choose a
     * cavalier order instead of Warrior/Ronin, so a single tag space avoids a
     * cross-field migration the day a samurai picks "sword" — a character
     * with both classes (unusual but not illegal) is expected to have one
     * order in play, matching the single swift-action Challenge each grants.
     * Order skills/abilities are display-only (same documented
     * `classSkillSet`-wiring gap as `oracleMystery`'s bonus class skills —
     * see `CAVALIER_ORDERS`' doc comment); the challenge damage/AC/save rider
     * is context-note tier (target-scoped — see `resources.ts`'s Challenge
     * pool `detail`). Empty/undefined for non-cavalier/samurai. Back-compat:
     * documents without this field are unaffected.
     */
    cavalierOrder?: string;
    /**
     * Bloodrager bloodline tag (key into `@pf1/engine` `BLOODRAGER_BLOODLINES`),
     * chosen at L1 and never changed thereafter (PF1 RAW). Free-choice, same
     * soft posture as `sorcererBloodline` — the ACG bloodrager bloodlines
     * (Abyssal, Arcane, Celestial, Destined, Draconic, Elemental, Fey,
     * Infernal, Undead) are a hand-authored engine table, NOT derived from
     * `refData.bloodlineSpellLists` (that field is sorcerer-shaped: bonus
     * spells known follow a `2*spellLevel+1` sorcerer-level cadence, whereas a
     * bloodrager's bonus spells are a fixed 4-entry schedule at 7th/10th/13th/
     * 16th level — see `BLOODRAGER_BLOODLINES[tag].bonusSpells` and
     * `model/spellcasting.bloodragerBonusSpellsKnown`). Empty/undefined for
     * non-bloodragers. Back-compat: documents without this field are
     * unaffected.
     */
    bloodragerBloodline?: string;
    /**
     * Energy-type/subtype variant for bloodrager bloodlines whose powers name
     * a player-chosen energy type (Draconic's dragon type, Elemental's
     * element) — mirrors `sorcererBloodlineVariant` exactly. Free-form id into
     * `@pf1/engine` `BLOODRAGER_BLOODLINES[bloodragerBloodline].variantOptions`.
     * Display-only. Back-compat: documents without this field are unaffected.
     */
    bloodragerBloodlineVariant?: string;
    /**
     * Occultist implement school tags chosen (keys into `@pf1/engine`
     * `OCCULTIST_SCHOOLS` — issue #65, Occult Adventures). PF1 RAW
     * ("Implements"): an occultist learns TWO implement schools at 1st level,
     * then one more at 2nd level and every 4 occultist levels thereafter
     * (2nd, 6th, 10th, 14th, 18th — six picks total, up to a maximum of
     * SEVEN distinct schools at 18th; verified against aonprd.com's exact
     * "Implements" class-feature text). "An occultist can select an implement
     * school more than once in order to learn additional spells from the
     * associated school" (verbatim) — so, unlike every other budgeted-picker
     * field in this schema (`oracleRevelations`, `witchHexes`, ...), this
     * array is a MULTISET: the same tag may legitimately appear more than
     * once, and each occurrence counts toward the budget and grants its own
     * additional spell-per-level (see
     * `model/spellcasting.occultistImplementSpellsKnown` — surfaces the
     * budget only, doesn't pick specific spells). Each DISTINCT tag chosen
     * also grants that school's base Focus Power and Resonant Power
     * automatically (not a budgeted pick — see
     * `OCCULTIST_SCHOOLS[tag].basePower`/`.resonantPower`); a repeated pick of
     * an already-known school grants no *additional* base/resonant power
     * (RAW: those are per-school, not per-pick). `live.occultistFocusInvested`
     * is nonetheless keyed by tag alone, not by pick-instance — RAW tracks
     * focus per IMPLEMENT ITEM, and this v1 doesn't model owning multiple
     * physical implements of the same school; a documented simplification.
     * Free-choice, soft warning only on overspend — same posture as
     * `oracleRevelations`; see `model/occultistImplements.ts` for the budget
     * math. Empty/undefined for non-occultists. Back-compat: documents
     * without this field are unaffected.
     */
    occultistImplements?: string[];
    /**
     * Occultist focus power ids chosen from the menu (keys into `@pf1/engine`
     * `OCCULTIST_SCHOOLS[tag].focusPowers`, formatted `"<schoolTag>:<slug>"`
     * — issue #65). PF1 RAW ("Focus Powers"): at 1st level an occultist
     * selects ONE focus power (beyond the two automatic base powers from her
     * starting schools), then one more at 3rd level and every 2 levels
     * thereafter (3rd, 5th, 7th, ..., 19th — ten picks total by 19th,
     * verified against aonprd.com's exact "Focus Powers" text). Scoped to
     * powers offered by a currently-KNOWN school (`build.occultistImplements`)
     * — a leftover pick from a since-abandoned school is tolerated the same
     * "unresolvable id" way `oracleRevelations` tolerates a stale mystery.
     * Every entry here is note-tier/display-only (name + one-line summary, no
     * `Change[]`) — these are activated (mental-focus-spending) abilities,
     * not passive bonuses; see `OCCULTIST_SCHOOLS`' doc comment for why only
     * the SCHOOL-LEVEL resonant powers (automatic, not one of these picks)
     * carry any numeric modeling. Free-choice, soft warning only on
     * overspend — see `model/occultistImplements.ts` for the budget math.
     * Empty/undefined for non-occultists. Back-compat: documents without this
     * field are unaffected.
     */
    occultistFocusPowers?: string[];
    /**
     * Kineticist primary element tag chosen at 1st level (keys into
     * `@pf1/engine` `KINETICIST_ELEMENTS` — issue #65, Occult Adventures
     * "Elemental Focus"). One of "aether"|"air"|"earth"|"fire"|"water"
     * (the 5 core elements this app models — see `kineticist-elements.ts`'s
     * doc comment for the Void/Wood scoping cut). PF1 RAW: chosen once at
     * 1st level and never changes; determines the kineticist's simple
     * blast, 2 bonus class skills (display-only — same `classSkillSet`-
     * wiring gap `cavalierOrder`'s doc comment documents), the Elemental
     * Defense wild talent auto-granted at 2nd level, and an automatic bonus
     * basic utility wild talent. Free-choice, soft posture — no validation
     * that it's one of the 5 modeled tags. Empty/undefined for
     * non-kineticists or a kineticist who hasn't picked yet. Back-compat:
     * documents without this field are unaffected.
     */
    kineticistElement?: string;
    /**
     * Kineticist "Expanded Element" picks, in pick order (element tags into
     * `@pf1/engine` `KINETICIST_ELEMENTS`) — issue #65. PF1 RAW: at 7th
     * level, and again at 15th, a kineticist chooses ANY element (including
     * her own primary, to "expand her understanding" of it further) and
     * gains one of that element's simple blasts plus its basic utility wild
     * talent (NOT its defense wild talent — RAW: "she doesn't gain the
     * defense wild talent of the expanded element"). Index 0 = the
     * 7th-level pick, index 1 = the 15th-level pick; either may equal
     * `kineticistElement` (RAW's "expand an element you already have"
     * case). RAW also says the 15th-level pick can't repeat the exact
     * element chosen at 7th unless it's her primary — not hard-enforced,
     * same soft posture as every other budgeted picker here. Composite
     * blasts become available once BOTH their required elements are known
     * (primary + this array) — see `eligibleCompositeBlasts`. Free-choice,
     * soft posture. Empty/undefined for non-kineticists. Back-compat:
     * documents without this field are unaffected.
     */
    kineticistExpandedElements?: string[];
    /**
     * Kineticist wild talent ids chosen from the infusion/utility menus
     * (`"<elementTag>:<slug>"` for element-specific entries, or
     * `"universal:<slug>"` for talents any element can take — keys into
     * `@pf1/engine` `KINETICIST_WILD_TALENTS`) — issue #65. Covers BOTH
     * infusions (gained 1st/3rd/5th/9th/11th/13th/17th/19th) and utility
     * wild talents (gained 2nd/4th/6th/8th/10th/12th/14th/16th/18th/20th)
     * in one array — the two cadences are budgeted independently by
     * `model/kineticistWildTalents.ts` (which filters this array by each
     * def's `category` before counting), the same "one field, a helper
     * disambiguates" shape `occultistFocusPowers` uses rather than a
     * two-field split. Menu is soft-scoped to the character's known
     * elements (`kineticistElement` + `kineticistExpandedElements`) plus
     * the always-available `universal:` entries; a stale pick from a
     * since-unpicked element is tolerated, not deleted (same posture
     * `chosenOccultistFocusPowerCount` documents). Free-choice, soft
     * warning only on overspend/under-level. Empty/undefined for
     * non-kineticists. Back-compat: documents without this field are
     * unaffected.
     */
    kineticistWildTalents?: string[];
    /**
     * Antipaladin cruelty ids chosen (keys into `@pf1/engine`
     * `ANTIPALADIN_CRUELTIES` — issue #65 wave B). Gained at 3rd level and
     * every three levels thereafter (3rd, 6th, 9th, 12th, 15th, 18th — 6
     * total by 18th); the MENU of selectable cruelties itself also expands
     * at 3rd/6th/9th/12th — see `model/antipaladinCruelties.ts` for the
     * budget math and `ANTIPALADIN_CRUELTIES`' doc comment for the tier
     * gating. Unlike `witchHexes`/`oracleRevelations`, no "Extra Cruelty"
     * feat exists in the vendored slice (confirmed) — this budget is never
     * feat-boosted. Free-choice, soft warning only on overspend.
     * Empty/undefined for non-antipaladins.
     */
    antipaladinCruelties?: string[];
    /**
     * Antipaladin's Fiendish Boon form, chosen at 5th level and never
     * changed thereafter (PF1 APG RAW: "Once the form is chosen, it cannot
     * be changed"). "weapon" grants a scaling weapon-enhancement boon whose
     * numbers are summarized as a classFeature detail line only (see
     * `tables.ts` `fiendishBoonLabel`) — the actual weapon math stays
     * manual, the same restraint paladin's own Divine Bond gets today (which
     * has no `build.*` field at all to record its choice, let alone modeled
     * numbers). "servant" grants a permanent fiendish companion creature —
     * deferred to issue #68 (companion stat blocks); surfaced as a note
     * only. Empty/undefined for non-antipaladins or a boon not yet chosen.
     */
    antipaladinBoon?: "weapon" | "servant";
    /**
     * Ninja trick ids chosen (keys into `@pf1/engine` `NINJA_TRICKS` — issue
     * #65 wave B, Ultimate Combat). Gained at 2nd level and every two levels
     * thereafter (2nd, 4th, ..., 20th — 10 total by 20th), plus one per
     * "Extra Ninja Trick" feat taken; see `model/ninjaTricks.ts` for the
     * budget math. Master tricks (minLevel 10) are chosen IN PLACE OF a
     * normal trick pick, not an extra budget slot — the same soft-gated,
     * non-extra-budget posture `WITCH_HEXES`' major/grand tiers use. A ninja
     * trick can ALSO be spent on "a rogue talent" per RAW (and, symmetrically,
     * a rogue's advanced talent can be spent on a master trick) — see
     * `NINJA_TRICKS`' doc comment for why that overlap is left note-tier
     * rather than cross-wired: this project has no `build.rogueTalents`
     * picker/budget field at all yet (a pre-existing gap, not a new one).
     * Free-choice, soft warning only on overspend. Empty/undefined for
     * non-ninjas.
     */
    ninjaTricks?: string[];
    /**
     * A tracked phantom (PF1 Occult Adventures Spiritualist's eidolon-like
     * companion) — mirrors `animalCompanion`/`familiar` above closely; see
     * `@pf1/engine` `derivePhantom` (issue #65). Optional/back-compat:
     * documents without this field have no tracked phantom.
     */
    phantom?: PhantomBuild;
    /**
     * A tracked eidolon (PF1 APG Summoner's signature companion, "Eidolon"
     * class feature) — models the eidolon itself as a trackable creature with
     * its own derived HD/BAB/saves/AC/attacks/skills, mirroring
     * `animalCompanion`/`phantom` above; see `@pf1/engine` `deriveEidolon`
     * (issue #65, groundwork for issue #68's future full-stat-block companion
     * work). Optional/back-compat: documents without this field have no
     * tracked eidolon.
     */
    eidolon?: EidolonBuild;
    /**
     * Barbarian rage power ids chosen (keys into `@pf1/engine` `RAGE_POWERS` —
     * issue #65/#67), shared by both `barbarian` (chained) and
     * `barbarianUnchained` — PF1 RAW grants a rage power at 2nd level and
     * every two levels thereafter for both editions (verified against
     * aonprd.com's class tables: the Unchained rewrite's own "Rage Powers"
     * class feature restates the identical 2nd/4th/6th/... cadence rather
     * than changing it), plus one per "Extra Rage Power" feat taken; see
     * `apps/web/src/model/ragePowers.ts` for the budget math (sums both
     * classes' levels, mirroring `@pf1/engine` `defenses.ts`'s
     * `barbarianLevel()` — a character would only ever have one of the two,
     * but summing is correct regardless). Level-gated entries (e.g. Renewed
     * Vigor's "barbarian 4th") are soft-warned only, same posture as
     * `oracleRevelations`/`witchHexes` — never blocks selection. Free-choice,
     * soft warning only on overspend. Empty/undefined for non-barbarians.
     * Back-compat: documents without this field are unaffected.
     */
    ragePowers?: string[];
    /**
     * Monk (Unchained) ki power ids chosen (keys into `@pf1/engine`
     * `MONK_KI_POWERS` — issue #65). Gained at 4th level and every 2 levels
     * thereafter (4th, 6th, ..., 20th — 9 total by 20th); see
     * `model/monkKiPowers.ts` for the budget math. Every ki power here is
     * `displayOnly` (a limited-use/activated ability with no unconditional
     * numeric effect — see `MONK_KI_POWERS`' doc comment for why none of the
     * 39 core Pathfinder Unchained ki powers cleared the bar for a real
     * `Change`), same posture as `witchHexes`. Free-choice, soft warning only
     * on overspend. Empty/undefined for non-monkUnchained characters.
     * Back-compat: documents without this field are unaffected.
     */
    monkKiPowers?: string[];
    /**
     * Monk (Unchained) style strike ids chosen (keys into `@pf1/engine`
     * `MONK_STYLE_STRIKES` — issue #65). Gained at 5th level and every 4
     * levels thereafter (5th, 9th, 13th, 17th — 4 total by 17th; the 15th-
     * level "designate two per round" bump is a usage upgrade to the SAME
     * pool, not an extra pick — see `model/monkStyleStrikes.ts`). Every style
     * strike here is `displayOnly` (a per-attack flurry rider, same posture
     * as ki powers). Free-choice, soft warning only on overspend.
     * Empty/undefined for non-monkUnchained characters. Back-compat:
     * documents without this field are unaffected.
     */
    monkStyleStrikes?: string[];
    /**
     * Rogue talent ids chosen (keys into `@pf1/engine` `ROGUE_TALENTS` —
     * issue #65), SHARED between the chained rogue and Rogue (Unchained) —
     * both classes draw from the same curated ~28-entry core menu; entries
     * flagged `unchainedOnly` in `ROGUE_TALENTS` (e.g. ones that reference
     * Debilitating Injury) are soft-noted rather than hidden for a chained
     * rogue. Gained at 2nd level and every 2 levels thereafter, plus one per
     * "Extra Rogue Talent" feat taken; see `model/rogueTalents.ts` for the
     * budget math. Most entries are `displayOnly`; "Combat Trick" contributes
     * a real generic bonus-feat SLOT and "Finesse Rogue" grants Weapon
     * Finesse as a fixed feat outright — both bridged into
     * `apps/web/src/model/feats.ts` (`ROGUE_TALENTS[id].bonusFeatSlot` /
     * `.grantsFeat`), same "talent grants a feat" shape as Rogue's Edge
     * (UC)'s sibling `finesse training (uc)` override. Free-choice, soft
     * warning only on overspend. Empty/undefined for non-rogues. Back-compat:
     * documents without this field are unaffected.
     */
    rogueTalents?: string[];
    /**
     * Rogue (Unchained) Finesse Training weapon-type picks, in grant order —
     * index 0 = the weapon type chosen at 3rd level, index 1 = 11th, index 2
     * = 19th (PF1 RAW: "she can select any one type of weapon that can be
     * used with Weapon Finesse ... whenever she makes a successful melee
     * attack with the selected weapon, she adds her Dexterity modifier
     * instead of her Strength modifier to the damage roll"). Free-text weapon
     * TYPE name (e.g. "rapier"), matched case-insensitively against a
     * `WeaponInstance`'s `name`/`group` in `compute.ts`'s weapon-attack path
     * — not a `@pf1/engine` `WEAPON_GROUPS` slug (RAW scopes this to one
     * weapon type, not a whole semantic group; see `computeWeaponAttacks`'s
     * doc comment for the matching rule). Empty/undefined for non-
     * rogueUnchained characters or a rogue who hasn't made any picks yet.
     * Back-compat: documents without this field are unaffected.
     */
    rogueFinesseWeapons?: string[];
    /**
     * Rogue's Edge (UC) skill unlock picks, in grant order — index 0 = the
     * skill chosen at 5th level, index 1 = 10th, index 2 = 15th, index 3 =
     * 20th (PF1 Unchained RAW: "at 5th level, and every 5 levels thereafter,
     * a rogue can choose a skill unlock power for one skill in which she has
     * at least 5 ranks"). Values are `SkillId`s (see `model/names.ts`
     * `SKILL_NAMES`). The unlock's actual tiered prose effects are NOT
     * modeled (no numeric hook — same posture as `shamanHexes`); surfaced as
     * a `displayOnly` chip on the ClassFeaturesList's "Rogue's Edge (UC)" row
     * rather than the skill row itself, since the same picker also drives
     * `expectedFeatCount`'s exclusion of Rogue's Edge (UC)'s spurious
     * vendored `bonusFeats` change (see `feats.ts`'s existing exclusion) and
     * both belong together. Empty/undefined for non-rogueUnchained
     * characters. Back-compat: documents without this field are unaffected.
     */
    rogueSkillUnlocks?: string[];
    /**
     * Investigator talent ids chosen (keys into `@pf1/engine`
     * `INVESTIGATOR_TALENTS` — issue #65). Gained at 3rd level and every 2
     * levels thereafter (3rd, 5th, ..., 19th — 9 total by 20th); see
     * `model/investigatorTalents.ts` for the budget math. Free-choice, soft
     * warning only on overspend — same posture as `alchemistDiscoveries`.
     * Empty/undefined for non-investigators. Back-compat: documents without
     * this field are unaffected.
     */
    investigatorTalents?: string[];
    /**
     * Vigilante's chosen specialization (Ultimate Intrigue "Vigilante
     * Specialization" class feature), picked at 1st level and never changed
     * thereafter (PF1 RAW). "avenger" swaps the vigilante's own BAB tier for
     * full BAB (= vigilante level) — see `compute.ts`'s BAB loop, which reads
     * this field directly. "stalker" grants Hidden Strike (precision damage;
     * see `@pf1/engine` `hiddenStrikeDice`, surfaced as a class-feature
     * detail line). Free-choice, no hard validation. Empty/undefined for
     * non-vigilantes or a vigilante who hasn't picked yet. Back-compat:
     * documents without this field are unaffected.
     */
    vigilanteSpecialization?: "avenger" | "stalker";
    /**
     * Vigilante Social Talent ids chosen (keys into `@pf1/engine`
     * `VIGILANTE_SOCIAL_TALENTS` — issue #65). Gained at 1st level and every
     * 2 levels thereafter (1st, 3rd, ..., 19th — 10 total by 20th); see
     * `model/vigilanteTalents.ts` for the budget math. A DIFFERENT pool from
     * `vigilanteTalents` below — PF1 RAW grants these from two independent
     * class features. Free-choice, soft warning only on overspend.
     * Empty/undefined for non-vigilantes. Back-compat: documents without this
     * field are unaffected.
     */
    vigilanteSocialTalents?: string[];
    /**
     * Vigilante Talent ids chosen (keys into `@pf1/engine`
     * `VIGILANTE_TALENTS` — issue #65). Gained at 2nd level and every 2
     * levels thereafter (2nd, 4th, ..., 20th — 10 total by 20th); see
     * `model/vigilanteTalents.ts` for the budget math. Some entries are
     * gated to `vigilanteSpecialization` (see `VigilanteTalentEntry.gate`) —
     * soft-filtered only, same posture as `witchHexes`' tier gating; never
     * blocks selection. Empty/undefined for non-vigilantes. Back-compat:
     * documents without this field are unaffected.
     */
    vigilanteTalents?: string[];
    /**
     * Shifter aspect ids chosen (keys into `@pf1/engine` `SHIFTER_ASPECTS` —
     * issue #65). Gained at 1st, 5th, 10th, and 15th level, plus a 5th aspect
     * at 20th via the Final Aspect class feature; see
     * `model/shifterAspects.ts` for the budget math. Free-choice, soft
     * warning only on overspend. Each aspect's MINOR form is a real
     * toggleable buff (see `live.activeBuffs`/`model/shifterAspects.ts`
     * `toggleShifterAspectBuff`) built directly from `SHIFTER_ASPECTS`
     * (there is no vendored buff to link — see that table's doc comment).
     * The major form (Wild Shape transformation) is NOT modeled — deferred
     * to issue #70 (polymorph). Empty/undefined for non-shifters.
     * Back-compat: documents without this field are unaffected.
     */
    shifterAspects?: string[];
    /**
     * Mesmerist trick ids chosen (keys into `@pf1/engine` `MESMERIST_TRICKS`
     * — issue #65). Gained at 1st level and every 2 levels thereafter (1st,
     * 3rd, ..., 19th — 10 total by 19th), plus one per "Extra Trick" feat
     * taken (mirrors `witchHexes`'/`ninjaTricks`' budget shape); see
     * `apps/web/src/model/mesmeristTricks.ts` for the budget math. Masterful
     * tricks (`tier: "masterful"`, minLevel 12) are chosen IN PLACE OF a
     * normal trick pick, not an extra budget slot — same soft-gated,
     * non-extra-budget posture `WITCH_HEXES`'/`NINJA_TRICKS`' higher tiers
     * use. This is the trick MENU only — the separate Mesmerist Tricks
     * resource pool (which trick can be implanted how many times/day) rides
     * the generic `uses.maxFormula` resource-pool pipeline already (see
     * `resources.ts`), unaffected by this field. Free-choice, soft warning
     * only on overspend. Empty/undefined for non-mesmerists. Back-compat:
     * documents without this field are unaffected.
     */
    mesmeristTricks?: string[];
    /**
     * Mesmerist Bold Stare ids chosen (keys into `@pf1/engine`
     * `MESMERIST_BOLD_STARES` — issue #65). Gained at 3rd level and every 4
     * levels thereafter (3rd, 7th, 11th, 15th, 19th — 5 total by 19th); see
     * `apps/web/src/model/mesmeristBoldStares.ts` for the budget math. Each
     * pick enriches the mesmerist's existing Hypnotic Stare class-feature
     * `detail` line (see `@pf1/engine` `boldStareRiderSummary`, wired in
     * `resolveClassFeatures`'s "Hypnotic Stare" dispatch) rather than adding
     * its own standing `Change` — see `MESMERIST_BOLD_STARES`' doc comment
     * for the target-scoped honesty-bar rationale. Free-choice, soft warning
     * only on overspend. Empty/undefined for non-mesmerists. Back-compat:
     * documents without this field are unaffected.
     */
    mesmeristBoldStares?: string[];
    /**
     * Phrenic Amplification ids chosen (keys into `@pf1/engine`
     * `PHRENIC_AMPLIFICATIONS` — issue #65 follow-through). Gained at 1st,
     * 3rd, 7th, 11th, 15th, 19th level (six total by 19th, the same
     * six-threshold cadence `oracleRevelations` uses); see
     * `apps/web/src/model/psychicAmplifications.ts` for the budget math.
     * Major amplifications (`tier: "major"`, minLevel 11) are chosen IN
     * PLACE OF a basic amplification, not an extra budget slot — same
     * soft-gated, non-extra-budget posture `WITCH_HEXES`'/`NINJA_TRICKS`'
     * higher tiers use. Every amplification is a cast-time rider on a linked
     * spell (see `PHRENIC_AMPLIFICATIONS`' doc comment) — display-only, no
     * standing `Change`; the Phrenic Pool itself (points spent) rides the
     * vendored `uses.maxFormula` resource-pool pipeline already, unaffected
     * by this field. Free-choice, soft warning only on overspend. Empty/
     * undefined for non-psychics. Back-compat: documents without this field
     * are unaffected.
     */
    psychicAmplifications?: string[];
    /**
     * Casting-advancement target choices for prestige classes, keyed by the
     * prestige class's tag (e.g. "mysticTheurge"). The array is indexed by the
     * refdata Class.castingAdvancement slot index; each entry is the chosen
     * target caster class tag (must be another class in identity.classes), or
     * null while unchosen. Advancement grants spells per day / spells known /
     * caster level only — never the target class's other features.
     */
    castingAdvancement?: Record<string, (string | null)[]>;
    /**
     * User-authored homebrew reference entities. The Stage 5 server is a
     * dumb blob store, so homebrew content lives inside the doc itself
     * rather than a separate store: it travels for free through
     * sync/export/import with zero server changes, and an optional field
     * needs no doc migration. Covers races, feats, and traits.
     *
     * Keys are homebrew ids (see `homebrew.ts` `homebrewId`, prefix `hb-`)
     * so they can never collide with a vendored id. `races`/`feats` are
     * overlaid onto `RefData` at compute time (see `apps/web/src/model/
     * homebrew.ts` `resolveRefData`) — simple spreads on top of
     * `refData.races`/`refData.feats`. `traits` overlays differently:
     * traits aren't RefData at all (the engine's `TRAITS` table is
     * hand-authored, not vendored), so a homebrew trait's definition is
     * looked up straight from here as a fallback wherever `TRAITS` is
     * consulted (`@pf1/engine` `collect.ts`, and this app's `model/
     * traits.ts`). Optional/absent = no homebrew, fully back-compat (same
     * posture as `build.racialTraits`).
     */
    homebrew?: {
      races?: Record<string, Race>;
      feats?: Record<string, Feat>;
      traits?: Record<string, TraitDef>;
    };
    /**
     * Point-buy budget for the builder's optional point-buy readout (issue
     * #86) — one of the PF1 Core Rulebook standard budgets (10/15/20/25) or
     * a table-custom number; `undefined` means point buy is off and the
     * readout is hidden entirely (back-compat default). Display-only: the
     * budget is never enforced, only compared against the point-buy cost of
     * `abilities` (see `apps/web/src/model/pointBuy.ts`) for a soft warning.
     */
    abilityPointBuyBudget?: number;
  };
  live: {
    hp: { current: number; temp: number; nonlethal: number };
    /** Active condition ids (keys into the engine's conditions table). */
    conditions: string[];
    /** Active buffs with remaining duration + the changes they apply (Stage 4). */
    activeBuffs: ActiveBuff[];
    /** Resource pools: ki, rounds/day, item charges. */
    resources: Record<string, { used: number; max: number }>;
    /**
     * Spell tracking for both prepared and spontaneous casters. The two
     * sub-fields are never both meaningful for the same character — prepared
     * casters use `prepared`; spontaneous casters use `slotsUsed`.
     *
     * `prepared`: each entry is one prepared instance (the same spell may be
     * prepared into multiple slots); `expended` is set on cast; resting clears
     * `expended` but keeps the loadout. Spell level is derived from RefData.
     *
     * `slotsUsed`: for spontaneous casters, maps spell level → number of slots
     * consumed today. Total available = spellSlotsByLevel(model, ...).total.
     * Reset to {} on a new day. Omitted / absent = zero used at each level.
     *
     * Both fields are optional for backwards-compat with older documents.
     *
     * Multiclass casters (issue #22): `slotsUsed` always holds the *primary*
     * caster class's spontaneous slot usage (see `build.spells.known`'s doc
     * comment for what "primary" means); a second spontaneous caster class
     * (e.g. a bard/sorcerer multiclass) tracks its usage in
     * `slotsUsedByClass`, keyed by class tag. Every `PreparedSpell` also
     * carries an optional `classTag`, undefined for the primary class's
     * instances (see `PreparedSpell.classTag`). Single-caster documents never
     * populate `slotsUsedByClass` or any `PreparedSpell.classTag`, so their
     * shape and behavior are unchanged by this feature.
     */
    spells?: {
      prepared: PreparedSpell[];
      slotsUsed?: Record<number, number>;
      slotsUsedByClass?: Record<string, Record<number, number>>;
    };
    /**
     * Hero points currently held (PF1 optional rule). Omitted = 0.
     * Standard maximum held at once is 3 (see HERO_POINT_CAP in model/heroPoints).
     */
    heroPoints?: number;
    /**
     * Ability damage (issue #18): points of damage currently suffered per
     * ability, keyed by {@link AbilityId}. PF1 RAW: damage does NOT lower the
     * score itself — it imposes a −1 penalty on every modifier-derived stat
     * (skills, saves, attack, AC, HP for Con, spell DCs, ...) for every 2 full
     * points of damage. The engine (`collectModifiers`) applies this as a
     * provenance-tagged penalty to the ability's total that nets to exactly
     * `floor(points/2)` off the modifier — see `compute.ts`'s ability-mod math
     * for why subtracting an even number always lands exactly. Heals naturally
     * at 1 point/ability/day of rest (model/afflictions.ts `restAbilityDamage`,
     * not auto-wired to any single "rest" action — see that module's comment).
     * Damage ≥ the ability's current total score means unconscious (Str/Dex/
     * Con) or unable to act coherently (Int/Wis/Cha) — the UI surfaces a
     * warning; the engine does not model incapacitation. Omitted/0 = no damage.
     * Back-compat: absent entirely for documents predating this feature.
     */
    abilityDamage?: Partial<Record<AbilityId, number>>;
    /**
     * Ability drain (issue #18): points permanently drained per ability, keyed
     * by {@link AbilityId}. Unlike damage, drain actually lowers the ability's
     * effective score (it flows into `AbilityScore.total`/`.mod`, never
     * `.base`) until magically restored (e.g. Restoration) — there is no
     * natural-healing path for drain. Omitted/0 = no drain. Back-compat:
     * absent entirely for documents predating this feature.
     */
    abilityDrain?: Partial<Record<AbilityId, number>>;
    /**
     * Ability penalty (issue #18): points of *temporary* penalty per ability
     * (e.g. a spell or hazard effect that isn't modeled as a buff), keyed by
     * {@link AbilityId}. Same −1-per-2-points modifier math as
     * {@link abilityDamage}, but never lethal and never heals over time — it
     * simply goes away when the player clears it (its cause ending). Kept
     * distinct from `abilityDamage` so the UI/provenance can label the source
     * correctly and so damage-specific rules (unconsciousness, 1/day healing)
     * don't accidentally apply to it. Omitted/0 = no penalty. Back-compat:
     * absent entirely for documents predating this feature.
     */
    abilityPenalty?: Partial<Record<AbilityId, number>>;
    /**
     * Negative levels (issue #19), split into `temporary` (e.g. from energy
     * drain effects — RAW allows a Fortitude save to remove each temporary
     * level 24h after gaining it; this app displays the distinction only, no
     * timer) and `permanent` (only removed by Restoration-type magic). Each
     * negative level (temporary + permanent combined) imposes, per PF1 RAW: −1
     * on attack rolls, saving throws, and skill checks (applied via synthetic
     * `attack`/`allSavingThrows`/`skills` changes — see `collectModifiers`),
     * and −5 max HP (synthetic `hp` change). It also imposes −1 effective
     * caster level per negative level, which has no home in the current engine
     * (no derived "caster level" stat outside build-time prereqs — see
     * `model/casterLevel.ts`'s doc comment for why folding it in there would be
     * wrong), and −1 on ability checks, which the engine also doesn't model as
     * a distinct roll — both are documented gaps, not silently dropped. If
     * total negative levels reach or exceed the character's Hit Dice, PF1 RAW
     * kills the character; the UI surfaces a warning only. Omitted/both-0 = no
     * negative levels. Back-compat: absent entirely for documents predating
     * this feature.
     */
    negativeLevels?: { temporary?: number; permanent?: number };
    /**
     * Manual "stabilized" flag for a dying character (issue #20). PF1 RAW
     * stabilizes a dying character (current HP negative, above the death
     * threshold) via a DC 10 + |current HP| Constitution check, any magical
     * healing, or a DC 15 Heal check — all rolled/adjudicated at the table,
     * not by this app (no dice roller, ever — owner decision), so this just
     * records the outcome the player reports. Only meaningful while
     * `model/hp.ts` `hpState` would otherwise report `"dying"`; ignored once
     * HP returns to 0+ or falls to/below the death threshold. Omitted/false =
     * not stabilized (still losing 1 hp/round while dying). Back-compat:
     * absent entirely for documents predating this feature.
     */
    stable?: boolean;
    /**
     * Total XP earned so far (PF1 optional rule; see `settings.xpEnabled`).
     * Omitted = 0. Purely informational — XP never auto-levels the
     * character; the level (`identity.classes[].level`) stays a player choice
     * made at the table (see model/xp.ts for why this lives client-side only).
     */
    xp?: number;
    /**
     * Coin purse (issue #16 inventory bookkeeping — always tracked, unlike
     * the gated `encumbranceEnabled` rule). Each denomination is optional;
     * an absent denomination means 0, matching the rest of the schema's
     * "omit the default" convention. Display/bookkeeping only — no derived
     * stat reads this, and the engine never auto-spends or auto-earns coin.
     * Back-compat: absent entirely for documents predating this feature.
     */
    money?: { pp?: number; gp?: number; sp?: number; cp?: number };
    /**
     * Live session state for the tracked familiar (`build.familiar`) — damage
     * bookkeeping plus which of the master's `activeBuffs` are shared onto it
     * (e.g. casting Mage Armor "on" the familiar). Absent/omitted while
     * `build.familiar` is unset, and whenever a familiar has taken no damage
     * and shares no buffs. See {@link FamiliarLiveState}.
     */
    familiar?: FamiliarLiveState;
    /**
     * Whether the tracked familiar (`build.familiar`) is within arm's reach of
     * its master right now. PF1 RAW: while a familiar is within arm's reach,
     * its master gains the benefit of the Alertness feat (+2 Perception, +2
     * Sense Motive) even if the master doesn't otherwise have Alertness.
     * Situational table state (not a species trait — every familiar species
     * grants this the same way), so it lives here rather than on
     * `@pf1/engine`'s per-species table. Ignored (no bonus) when
     * `build.familiar` is unset. Absent/undefined defaults to true (the
     * common case — the familiar usually rides along); explicit `false` is
     * how the player records the familiar being left behind. Back-compat:
     * documents predating this field behave as if the default applied.
     *
     * Known simplification: if the master separately has the real Alertness
     * feat (`build.feats`), this stacks with it as a second untyped +2
     * (PF1 RAW wouldn't double a feat a character already has) — an
     * acceptably rare edge case, not worth a cross-check against `build.feats`.
     */
    familiarInReach?: boolean;
    /**
     * Live session state for the tracked animal companion
     * (`build.animalCompanion`) — damage bookkeeping plus which of the
     * master's `activeBuffs` are shared onto it (Share Spells). Mirrors
     * `familiar` above exactly; see {@link AnimalCompanionLiveState}.
     * Absent/omitted while `build.animalCompanion` is unset.
     */
    animalCompanion?: AnimalCompanionLiveState;
    /**
     * Brawler's Martial Flexibility (issue #65): the combat feat id currently
     * "borrowed" via a move/swift/free/immediate action (the action-type
     * shortens with brawler level per RAW but isn't tracked separately here —
     * display-only distinction). PF1 RAW: lasts 1 minute, drawn from the
     * `martialFlexibility` resource pool (`uses.maxFormula` is vendored — see
     * `@pf1/engine` `resources.ts` — `3 + floor(brawlerLevel / 2)`/day); the
     * player must meet the borrowed feat's prerequisites, which this field
     * does NOT validate (soft posture, matching the rest of the schema's
     * free-choice fields). Set/cleared by `model/martialFlexibility.ts`.
     * Undefined = no feat currently borrowed. Back-compat: documents without
     * this field are unaffected.
     */
    martialFlexibilityFeatId?: string;
    /**
     * Live session state for the tracked phantom (`build.phantom`) — damage
     * bookkeeping, which of the master's `activeBuffs` are shared onto it,
     * plus the manifestation-state toggle unique to phantoms. Mirrors
     * `animalCompanion`/`familiar` above; see {@link PhantomLiveState}.
     * Absent/omitted while `build.phantom` is unset.
     */
    phantom?: PhantomLiveState;
    /**
     * Live session state for the tracked eidolon (`build.eidolon`) — damage
     * bookkeeping, which of the master's `activeBuffs` are shared onto it
     * (Share Spells), and the summoned/dismissed toggle. Mirrors
     * `animalCompanion`/`phantom` above; see {@link EidolonLiveState}.
     * Absent/omitted while `build.eidolon` is unset.
     */
    eidolon?: EidolonLiveState;
    /**
     * Occultist Mental Focus points currently invested per implement school
     * tag (keys into `@pf1/engine` `OCCULTIST_SCHOOLS`, issue #65). PF1 RAW
     * ("Mental Focus"): once per day (after 1 hour spent preparing
     * implements), an occultist divides her Mental Focus pool (the
     * `mentalFocus` resource pool — `@class.unlevel + @abilities.int.mod`,
     * already generic/vendored) among her known implements; each implement
     * with 1+ point invested gains its school's Resonant Power, scaled by the
     * amount invested (see `OCCULTIST_SCHOOLS[tag].resonantPower` and
     * `collect.ts`'s occultist block for which resonant powers are
     * unconditional enough to apply as real sheet `Change`s vs. shown as a
     * situational computed preview only). This is genuinely a DAILY choice
     * (RAW: "mental focus that is not used before the next time the occultist
     * refreshes his focus is lost") but — unlike the medium's spirit — it's
     * modeled as `live.*` rather than reset by `model/rest.ts`'s `restNewDay`:
     * a player re-dividing focus after a rest is expected to explicitly
     * re-invest (the UI doesn't assume a default split), so `restNewDay`
     * deliberately leaves this untouched, matching its own documented
     * "active buffs... left alone by design" posture for other genuinely
     * player-directed daily setup steps. Not validated against the actual
     * Mental Focus pool max (soft posture — the UI shows remaining/overspent
     * as a hint, never blocks). Keys not in `build.occultistImplements`, or a
     * non-occultist's stale field, are ignored by the engine. Empty/undefined
     * = no focus invested anywhere. Back-compat: documents without this field
     * are unaffected.
     */
    occultistFocusInvested?: Record<string, number>;
    /**
     * Occultist Transmutation implement's Physical Enhancement resonant
     * power (issue #65): which physical ability score (Strength, Dexterity,
     * or Constitution) currently receives its scaling enhancement bonus. PF1
     * RAW lets the occultist choose the target ability each time the power
     * is invoked; modeled here as a single live choice (not per-invocation)
     * for simplicity, matching this app's "one active choice, not a history"
     * posture elsewhere (e.g. `martialFlexibilityFeatId`). Only meaningful
     * while Transmutation has 3+ Mental Focus invested (see
     * `occultistFocusInvested.transmutation`); ignored otherwise. Undefined
     * defaults to `"str"` once Transmutation focus is invested (see
     * `collect.ts`'s occultist block). Back-compat: documents without this
     * field are unaffected.
     */
    occultistPhysicalEnhancementAbility?: AbilityId;
    /**
     * Vigilante's current identity (issue #65) — "social" (public persona) or
     * "vigilante" (masked persona). Display-forward table state (an identity
     * chip + a context-note reminder about renown/alignment scope on the
     * relevant class features), not a numeric input to `compute()`: no
     * vendored `Change` gates on identity, and several vigilante talents'
     * identity-scoped bonuses (Renown's Intimidate bonus, Social Grace, ...)
     * are intentionally left as manual-apply `contextNotes` on
     * `VIGILANTE_SOCIAL_TALENTS`/`VIGILANTE_TALENTS` rather than wired to
     * this flag — see those tables' doc comments. Omitted/undefined defaults
     * to "social" (a vigilante typically starts and rests in their public
     * identity). Back-compat: documents without this field are unaffected.
     */
    vigilanteIdentity?: "social" | "vigilante";
    /**
     * Medium's currently channeled legendary spirit (issue #65) — a
     * `@pf1/engine` `MEDIUM_SPIRITS` tag ("archmage" | "champion" | "guardian"
     * | "hierophant" | "marshal" | "trickster"). PF1 RAW ("Séance"): "each
     * morning ... a medium can perform a special ritual ... to determine
     * which spirit ... the medium channels for that day" — a genuinely DAILY
     * choice, like `occultistFocusInvested` above, but UNLIKE it this is
     * modeled as a single tag rather than a record (a medium channels
     * exactly one spirit at a time; the "Legendary Medium" archetype that
     * channels two simultaneously is out of scope). Deliberately NOT reset by
     * `model/rest.ts`'s `restNewDay` — same rationale as
     * `occultistFocusInvested`'s doc comment: a player re-affirms their
     * spirit by explicit action (the tracker panel's séance picker), not an
     * implicit side effect of resting, and in practice a character channels
     * the same spirit day after day far more often than not, so silently
     * clearing it on every rest would be more friction than signal. Gates the
     * Spirit Bonus `Change`s (`collect.ts`) and the spirit's own Spirit
     * Powers (`archetypes.ts` `collectGrantedFeatures`, `origin.kind:
     * "spiritPower"`) — see `@pf1/engine` `medium-spirits.ts` for the full
     * table. Undefined = no séance performed yet today; a medium genuinely
     * has none of a spirit's benefits until one is chosen (unlike
     * `vigilanteIdentity`, there is no sensible non-undefined default). A tag
     * not in `MEDIUM_SPIRITS` (e.g. a stale value after a house-rule table
     * change) is tolerated the same way a stale `shamanSpirit`/
     * `psychicDiscipline` is — treated as "none chosen". Back-compat:
     * documents without this field are unaffected.
     */
    mediumSpirit?: string;
    /**
     * Medium's current Influence total (issue #65) — PF1 RAW ("Legendary
     * Spirit"): a 0-5 point counter that rises when the medium leans on their
     * channeled spirit (performing the séance itself grants 1; Spirit Surge
     * and several Spirit Powers cost 1 more each use; breaking a Taboo grants
     * 1). Genuinely numeric bookkeeping (unlike `vigilanteIdentity`'s display-
     * only chip) — see `@pf1/engine` `medium-spirits.ts`'s file doc comment
     * for exactly which consequences are modeled: NONE are auto-applied as
     * `Change`s (every spirit's 3+ penalty references either an unmodeled
     * stat or a behavioral restriction this app can't adjudicate, and 5 —
     * "the spirit takes over" — is a full loss-of-control the GM adjudicates,
     * not a sheet state this app can represent), so 3+ and 5 are surfaced
     * ONLY as soft warning banners in the tracker's séance panel
     * (`model/mediumSpirits.ts`). Clamped to 0-5 by that module's setters (a
     * medium simply cannot accumulate influence beyond 5 — the spirit takes
     * over first). Not reset by `restNewDay`, same rationale as
     * `mediumSpirit` above — a fresh séance (and thus fresh influence
     * bookkeeping) is a distinct, explicit player action in this app's model
     * (the panel's own "New Séance" control), not an implicit side effect of
     * the global rest button. Undefined/0 = no influence accrued. Back-compat:
     * documents without this field are unaffected.
     */
    mediumInfluence?: number;
    /**
     * A polymorph-family transformation currently affecting the character —
     * Wild Shape, or a Beast Shape/Elemental Body/Plant Shape spell (issue
     * #70; see `@pf1/engine` `SHIFTER_ASPECTS`'s `majorFormNote`, which
     * pointed here). Purely a player CHOICE — which tier + creature
     * type/size/element the form takes, plus the natural-attack lines the
     * player copies off the assumed creature's stat block; the engine
     * (`@pf1/engine` `polymorphFormOption`/`computePolymorphAttacks`)
     * derives the resulting ability-score/natural-armor/attack numbers, this
     * field never stores them directly. `undefined` = not currently
     * transformed. No separate `build.*` half (unlike `animalCompanion`/
     * `familiar`): a form has no standing configuration to persist between
     * activations, so — like `activeBuffs`/`conditions` — this is pure
     * `live.*` state, entered fresh each time. Back-compat: documents
     * without this field are unaffected.
     */
    activeForm?: ActiveForm;
  };
}

/**
 * One polymorph-family transformation entry (`live.activeForm`) — see that
 * field's doc comment. `tier`/`creatureType`/`element` are free-text keys
 * into `@pf1/engine` `POLYMORPH_TIERS`/`PolymorphFormOption` (not a strict
 * union here, matching this schema's usual "store the id, the engine table
 * resolves it" posture — e.g. `shifterAspects: string[]`); a combination the
 * engine doesn't recognize (stale after a house-rule change, or simply never
 * valid) resolves to no ability/natural-armor adjustment, same soft
 * tolerance as every other engine-table lookup in this schema. `size`,
 * however, IS the real {@link SizeId} the character takes on — the engine
 * uses it directly to override the size-ladder size for AC/attack/CMB/CMD
 * (`@pf1/engine` `compute.ts`), independent of whether the
 * tier/creatureType/element combination itself resolves.
 */
export interface ActiveForm {
  /** Polymorph tier key — e.g. "beastShapeIII" (key into `@pf1/engine` `POLYMORPH_TIERS`). */
  tier: string;
  /** Creature type within the tier's menu — "animal" | "magicalBeast" | "elemental" | "plant". */
  creatureType: string;
  /** The character's size while in this form — overrides the normal size ladder outright. */
  size: SizeId;
  /** Elemental type, only meaningful when `creatureType === "elemental"` ("air" | "earth" | "fire" | "water"). */
  element?: string;
  /** Free-text label for the specific creature assumed, e.g. "Dire Wolf". */
  formName: string;
  /**
   * Natural-attack lines copied by the player off the assumed creature's
   * stat block (name + count + display-only damage dice); the engine
   * computes each line's attack/damage bonus (BAB + Str mod + size modifier,
   * secondary attacks at −5 to hit and half Str to damage) — see
   * `@pf1/engine` `computePolymorphAttacks`. Empty/omitted = no attack lines
   * entered yet.
   */
  naturalAttacks?: ActiveFormNaturalAttack[];
  /**
   * Free-text reminders for whatever this app doesn't model numerically —
   * special abilities (grab, pounce, trip, breath weapons), movement modes,
   * senses, tactics. Honesty-bar posture: this app never invents numbers for
   * these (see `@pf1/engine` `polymorph.ts`'s per-tier `notes`, which cover
   * the SRD-common riders already; this field is for anything beyond that).
   */
  notes?: string;
}

/** One natural-attack line on an {@link ActiveForm} — see that field's doc comment. */
export interface ActiveFormNaturalAttack {
  /** Display name, e.g. "Bite", "Claw". */
  name: string;
  /** How many of this attack the form has (e.g. 2 for "2 claws"). Omitted = 1. */
  count?: number;
  /** Damage dice string for display only, e.g. "1d8". The engine does not roll. */
  damageDice?: string;
  /**
   * Primary attacks add the FULL Strength modifier to damage; secondary
   * attacks take a −5 penalty to hit and add only HALF the Strength modifier
   * (a Strength PENALTY still applies in full to both — PF1 RAW "Natural
   * Attacks"). Omitted = "primary".
   */
  kind?: "primary" | "secondary";
}

/**
 * A tracked familiar's build choices (`build.familiar`) — see that field's
 * doc comment for how this relates to `build.arcaneBond`.
 */
export interface FamiliarBuild {
  /** Species id — key into `@pf1/engine` `BASE_FAMILIARS` (e.g. "cat"). */
  speciesId: string;
  /** Player-given name (e.g. "Mortlach"). */
  name: string;
  /** Free-text notes (e.g. personality, tricks, house-rule tweaks). */
  notes?: string;
}

/**
 * A tracked animal companion's build choices (`build.animalCompanion`) — see
 * that field's doc comment. Mirrors `FamiliarBuild`'s shape, plus the extra
 * fields a companion needs that a familiar doesn't (which class feature(s)
 * grant it, and its player-assigned Ability Score Increases).
 */
export interface AnimalCompanionBuild {
  /** Species id — key into `@pf1/engine` `BASE_COMPANIONS` (e.g. "wolf"). */
  speciesId: string;
  /** Player-given name. */
  name: string;
  /**
   * Which class feature(s) grant this companion — a druid's Nature Bond
   * (chosen instead of a domain) and/or a ranger's Hunter's Bond (chosen
   * instead of the ally favored-enemy-sharing option). Both may be present on
   * a multiclass druid/ranger; see `@pf1/engine` `companionEffectiveLevel`'s
   * doc comment for why their contributions are summed (a documented v1
   * simplification) rather than the game picking one. An empty array (or a
   * document with `animalCompanion` set but neither source chosen yet) means
   * effective level 0 — the companion doesn't show up on the sheet yet,
   * matching the engine's soft-warning posture. `"hunter-companion"` (issue
   * #65) is the ACG Hunter class's OWN Animal Companion class feature —
   * distinct from the ranger's "Hunter's Bond" despite the similar name; a
   * hunter's effective druid level equals her hunter level 1:1 (no −3 offset,
   * unlike the ranger's `hunters-bond`) — see `@pf1/engine`
   * `companionEffectiveLevel`'s doc comment. `"cavalier-mount"`/
   * `"samurai-mount"` (issue #68) are the Cavalier's and Samurai's own
   * "Mount" class feature (UC "This mount functions as a druid's animal
   * companion, using the cavalier's/samurai's level as his effective druid
   * level" — verified against aonprd.com during authoring; identical text
   * for both classes) — 1:1, no −3 offset, granted at 1st level (unlike the
   * ranger's 4th-level gate), and kept as two separate tags (rather than one
   * shared "mount" tag) purely to match this field's existing one-tag-per-
   * class-feature convention, even where the math is identical.
   */
  source: (
    | "nature-bond"
    | "hunters-bond"
    | "hunter-companion"
    | "cavalier-mount"
    | "samurai-mount"
  )[];
  /**
   * Player-assigned ability score for each Ability Score Increase milestone
   * reached so far (CRB Table: Animal Companion Base Statistics — effective
   * levels 4, 9, 14, 20). Index 0 = the level-4 increase, index 1 = level 9,
   * etc. A missing/short entry for an already-reached milestone defaults to
   * Strength (`@pf1/engine` `deriveCompanion`) — a sensible default, not a
   * requirement to choose immediately. Entries beyond
   * `companionAbilityIncreaseSlots(effectiveLevel)` are ignored.
   */
  abilityIncreases?: AbilityId[];
  /**
   * Feat ids chosen for the companion itself (issue #68) — keys into
   * `RefData.feats`. Free pick from the full feat list (no "animal-eligible"
   * filter — a documented v1 "first cut" scope, matching this project's
   * hybrid-prereq honesty bar rather than promising perfect eligibility
   * curation), soft-capped (never blocked) against the companion's own
   * `DerivedCompanion.bonusFeats` budget by `apps/web/src/model/companion.ts`.
   * Structured prereqs (ability score, BAB) are checked against the
   * COMPANION's own derived stats, not the master's — see
   * `model/companion.ts`'s `companionFeatPrereqContext`. Omitted/empty = no
   * feats picked yet.
   */
  feats?: string[];
  /**
   * Per-skill rank allocation for the companion's six trackable skills
   * (issue #68 — `acr`/`clm`/`fly`/`per`/`ste`/`swm`, the same set
   * `@pf1/engine` `companion.ts`'s module doc comment names). `@pf1/engine`
   * `deriveCompanion` hard-caps each skill's ranks at the companion's own Hit
   * Dice (a monster's structural rank cap — RAW, not a house rule) and adds
   * the standard +3 class-skill bonus once a skill has 1+ rank invested
   * (every one of the six is always a class skill for an Animal-type
   * creature, per Universal Monster Rules — same convention `familiar.ts`'s
   * `ANIMAL_CLASS_SKILLS` already established). The TOTAL across all six is
   * only soft-warned against `DerivedCompanion.skillPointsAvailable`
   * (`hd * max(1, 2 + Int mod)`, Monster Creation's skill-point formula) —
   * never blocked, same posture as every other budgeted picker in this
   * codebase. Entries for a skill id outside that set of six are ignored.
   * Omitted/empty = no ranks invested (the v1-through-#68 default: pure
   * ability mod + racial/size, as before).
   */
  skillRanks?: Record<string, number>;
  /** Free-text notes (e.g. personality, tricks, house-rule tweaks). */
  notes?: string;
}

/**
 * Live session state for a tracked familiar (`live.familiar`) — see that
 * field's doc comment.
 */
export interface FamiliarLiveState {
  /** Lethal damage taken so far (current HP = derived max − damage). Omitted/0 = undamaged. */
  damage?: number;
  /** Nonlethal damage taken so far. Omitted/0 = none. */
  nonlethal?: number;
  /**
   * Instance ids from `live.activeBuffs` (the MASTER's buff list — a familiar
   * has no separate buff list of its own in v1) that also apply to the
   * familiar's derived sheet (e.g. a shared Mage Armor). Toggled via
   * `apps/web/src/model/familiar.ts`; resolved by `@pf1/engine`
   * `deriveFamiliar`, which evaluates each shared buff's `changes[]` against
   * the familiar the same way the master's own sheet does for `ac`/`aac`/
   * `sac`/`nac`, `fort`/`ref`/`will`/`allSavingThrows`, and `skill.*` targets.
   * Omitted/empty = no shared buffs.
   */
  sharedBuffIds?: string[];
  /**
   * The familiar's OWN active conditions — condition ids, keys into
   * `@pf1/engine` `CONDITIONS`, tracked independently of the master's own
   * `live.conditions` (it can be shaken/entangled/etc. while the master
   * isn't). Same ladder-aware auto-upgrade/implied-condition posture as
   * {@link AnimalCompanionLiveState.conditions} (the established pattern) —
   * toggled via `apps/web/src/model/familiar.ts` `toggleFamiliarCondition`,
   * resolved by `@pf1/engine` `deriveFamiliar` through the same
   * `routeSharedBuffs` pipeline as a shared buff. Omitted/empty = no active
   * conditions.
   */
  conditions?: string[];
}

/**
 * Live session state for a tracked animal companion (`live.animalCompanion`)
 * — see that field's doc comment. Identical shape to {@link FamiliarLiveState};
 * kept as a distinct type (rather than a shared alias) so the two can diverge
 * later without a breaking rename.
 */
export interface AnimalCompanionLiveState {
  /** Lethal damage taken so far (current HP = derived max − damage). Omitted/0 = undamaged. */
  damage?: number;
  /** Nonlethal damage taken so far. Omitted/0 = none. */
  nonlethal?: number;
  /**
   * Instance ids from `live.activeBuffs` (the MASTER's buff list — a
   * companion has no separate buff list of its own in v1) that also apply to
   * the companion's derived sheet via Share Spells (e.g. a shared Barkskin).
   * Toggled via `apps/web/src/model/companion.ts`; resolved by `@pf1/engine`
   * `deriveCompanion` exactly like `FamiliarLiveState.sharedBuffIds`.
   * Omitted/empty = no shared buffs.
   */
  sharedBuffIds?: string[];
  /**
   * Hunter's Animal Focus (ACG) applied to the companion (issue #65) — a
   * `RefData.buffs` id, e.g. one of the 12 vendored "Animal Focus (<Animal>)"
   * buffs (`grantsBuffs` on the Hunter's own Animal Focus class feature,
   * already resolved generically by `@pf1/engine` `deriveResourcePools`).
   * PF1 RAW: the companion's aspect is independent of the hunter's own
   * active focus (can differ, doesn't count against her daily minutes, and
   * persists until changed) — so this is DISPLAY-ONLY bookkeeping (a chip
   * naming which aspect is active), not wired into `deriveCompanion`'s
   * numeric stat block, matching this field's existing display-only posture
   * for anything beyond `sharedBuffIds`/damage. Toggled via
   * `apps/web/src/model/companion.ts` `setCompanionFocus`. Omitted = no
   * focus applied to the companion.
   */
  focusBuffId?: string;
  /**
   * The companion's OWN active conditions (issue #68) — condition ids, keys
   * into `@pf1/engine` `CONDITIONS`, exactly like the master's own
   * `live.conditions` but tracked independently: the companion can be
   * shaken/entangled/etc. while the master isn't, and vice versa (e.g. an
   * area fear effect that only catches one of them). Toggled via
   * `apps/web/src/model/companion.ts` `toggleCompanionCondition`, which
   * reuses `model/conditions.ts`'s `toggleConditionIn` for the same
   * ladder-aware auto-upgrade/implied-condition behavior the master's own
   * conditions get. Resolved by `@pf1/engine` `deriveCompanion`, which routes
   * each active condition's `Change[]` through the exact same
   * `routeSharedBuffs` pipeline as a shared buff (see that module's doc
   * comment). Omitted/empty = no active conditions.
   */
  conditions?: string[];
}

/**
 * A tracked phantom's build choices (`build.phantom`) — see that field's doc
 * comment. Mirrors `FamiliarBuild`'s shape; the difference is the emotional
 * focus in place of a species.
 */
export interface PhantomBuild {
  /** Emotional Focus id — key into `@pf1/engine` `EMOTIONAL_FOCI` (e.g. "anger"). */
  focus: string;
  /** Player-given name. */
  name: string;
  /**
   * The phantom's size (PF1 Occult Adventures "Phantom": a spiritualist may
   * manifest her phantom one size category smaller than herself, or — if she
   * is Small or smaller — one size category larger; the common case is the
   * same size as the spiritualist). Omitted/undefined defaults to `"med"`
   * (`@pf1/engine` `derivePhantom`) — the overwhelmingly common choice for a
   * Medium-sized spiritualist, and the size RAW's own slam-damage table
   * anchors on. Only `"sm" | "med" | "lg"` are offered (the phantom's
   * template doesn't support other sizes).
   */
  size?: "sm" | "med" | "lg";
  /**
   * Player-assigned ability score for each Ability Score Increase milestone
   * reached so far (PF1 Occult Adventures "Manifested Phantom's Base
   * Statistics" — spiritualist levels 5, 10, 15). Index 0 = the level-5
   * increase, index 1 = level 10, index 2 = level 15. A missing/short entry
   * for an already-reached milestone defaults to Charisma (`@pf1/engine`
   * `derivePhantom` — Cha drives the phantom's incorporeal-form deflection
   * bonus and several Emotional Focus abilities, so it's the more broadly
   * useful default than `AnimalCompanionBuild`'s Strength). Entries beyond
   * `phantomAbilityIncreaseSlots(level)` are ignored. Mirrors
   * `AnimalCompanionBuild.abilityIncreases`'s shape exactly.
   */
  abilityIncreases?: AbilityId[];
  /** Free-text notes (e.g. personality, house-rule tweaks). */
  notes?: string;
}

/**
 * Live session state for a tracked phantom (`live.phantom`) — see that
 * field's doc comment. Same damage/nonlethal/sharedBuffIds shape as
 * {@link AnimalCompanionLiveState}, plus the manifestation-state toggle
 * unique to phantoms.
 */
export interface PhantomLiveState {
  /** Lethal damage taken so far (current HP = derived max − damage). Omitted/0 = undamaged. */
  damage?: number;
  /** Nonlethal damage taken so far. Omitted/0 = none. */
  nonlethal?: number;
  /**
   * Instance ids from `live.activeBuffs` (the MASTER's buff list) that also
   * apply to the phantom's derived sheet. Toggled via
   * `apps/web/src/model/phantom.ts`; resolved by `@pf1/engine`
   * `derivePhantom` exactly like `AnimalCompanionLiveState.sharedBuffIds`.
   * Omitted/empty = no shared buffs.
   */
  sharedBuffIds?: string[];
  /**
   * Which of the phantom's three manifestation states it's currently in
   * (PF1 Occult Adventures "Manifestation") — see `@pf1/engine`
   * `phantom.ts`'s module doc comment for the full RAW summary of each
   * state. Display-only chip; toggling doesn't change any derived number
   * (the phantom's stat block is the same regardless of state — RAW
   * changes its interaction rules, not its stats). Omitted/undefined
   * defaults to `"ectoplasmic"` (the default manifested state).
   */
  manifestation?: "ectoplasmic" | "incorporeal" | "confined";
  /**
   * The phantom's OWN active conditions — condition ids, keys into
   * `@pf1/engine` `CONDITIONS`, tracked independently of the master's own
   * `live.conditions` (it can be shaken/entangled/etc. while the master
   * isn't). Same ladder-aware auto-upgrade/implied-condition posture as
   * {@link AnimalCompanionLiveState.conditions} (the established pattern) —
   * toggled via `apps/web/src/model/phantom.ts` `togglePhantomCondition`,
   * resolved by `@pf1/engine` `derivePhantom` through the same
   * `routeSharedBuffs` pipeline as a shared buff. Omitted/empty = no active
   * conditions.
   */
  conditions?: string[];
}

/**
 * One evolution pick spent from an eidolon's evolution pool
 * (`EidolonBuild.evolutions`) — keys into `@pf1/engine` `EIDOLON_EVOLUTIONS`.
 * Repeatable evolutions (e.g. `"ability-increase"`, `"improved-natural-armor"`,
 * `"tentacle"`, `"climb"`, `"swim"`, `"limbs-legs"`) appear as multiple
 * entries with the same `id`, mirroring `occultistImplements`'s multiset
 * posture rather than a per-id count map (keeps pick ORDER, which matters
 * for e.g. "Ability Increase... plus 1 additional time for every 6 levels"
 * gating, though that gating itself is soft/unenforced — see
 * `@pf1/engine` `eidolon.ts`'s module doc comment).
 */
export interface EidolonEvolutionPick {
  /** Evolution id — key into `@pf1/engine` `EIDOLON_EVOLUTIONS`. */
  id: string;
  /**
   * Per-pick target for evolutions that need one (currently only
   * `"ability-increase"`, an {@link AbilityId}). Ignored by every other
   * evolution id. Defaults to `"str"` when required but missing/invalid
   * (`@pf1/engine` `deriveEidolon`) — Str is the overwhelmingly common
   * choice for a melee-combat eidolon, mirroring `AnimalCompanionBuild`'s
   * own Str default over `PhantomBuild`'s Cha default.
   */
  choice?: AbilityId | string;
}

/**
 * A tracked eidolon's build choices (`build.eidolon`) — see that field's doc
 * comment. Mirrors `AnimalCompanionBuild`'s shape; the core differences are
 * the base-form selection (in place of a species) and the evolution-pool
 * spend (`evolutions`, in place of ability-score-increase slots — a
 * CHAINED eidolon's Ability Increase is itself just one more evolution
 * pick, not a separate automatic table grant the way
 * `PhantomBuild.abilityIncreases`/`AnimalCompanionBuild.abilityIncreases`
 * are). An UNCHAINED eidolon (Pathfinder Unchained) is the one exception:
 * it has BOTH mechanisms at once — the evolution pool still exists (just
 * smaller, see `@pf1/engine` `EIDOLON_UNCHAINED_POOL`), but it ALSO gets
 * genuine automatic ASI slots (`abilityIncreases` below, phantom-shaped)
 * plus its subtype's own themed grants (`subtype`/`subtypeGrantChoices`
 * below) — see `@pf1/engine` `eidolon-unchained.ts`'s module doc comment
 * for the full unchained system.
 */
export interface EidolonBuild {
  /**
   * Base form id — key into `@pf1/engine` `EIDOLON_BASE_FORMS`. Only
   * `"biped" | "quadruped" | "serpentine"` are offered in v1 (the three
   * forms every eidolon-optimization guide treats as core); APG's other
   * three forms (Aquatic, Avian, Tauric) are a documented deferral — see
   * `eidolon.ts`'s module doc comment.
   */
  baseForm: string;
  /**
   * Outsider subtype id — key into `@pf1/engine` `EIDOLON_SUBTYPES` (e.g.
   * "angel", "elemental-fire"). Summoner (Unchained)-only: meaningful only
   * when `@pf1/engine` `eidolonVariant(doc)` is `"unchained"` (see that
   * function's doc comment for the exact chained/unchained determination);
   * a chained eidolon ignores this field entirely, since the chained system
   * has no subtype concept. Omitted/unrecognized = no subtype grants, and
   * `deriveEidolon` falls back to the chained base form's attacks (soft
   * posture, never an undefined stat block just because a subtype hasn't
   * been picked yet).
   */
  subtype?: string;
  /**
   * Player-assigned ability score for each automatic Ability Score Increase
   * milestone reached so far (Pathfinder Unchained "Eidolons (Unchained)" —
   * unchained summoner levels 5, 10, 15; see `eidolon-unchained.ts`'s
   * `EIDOLON_UNCHAINED_ABILITY_INCREASE_LEVELS`). Index 0 = the level-5
   * increase, index 1 = level 10, index 2 = level 15 — mirrors
   * `PhantomBuild.abilityIncreases`'s exact shape. A missing/short entry
   * for an already-reached milestone defaults to Strength (`@pf1/engine`
   * `deriveEidolon` — matching this module's existing Str-default
   * convention for `EidolonEvolutionPick.choice`, over `PhantomBuild`'s Cha
   * default). Entries beyond `eidolonUnchainedAbilityIncreaseSlots(level)`
   * are ignored. Ignored entirely for a chained eidolon, which has no
   * automatic ASI slots at all (its own "Ability Increase" is just one more
   * evolution pick, `EidolonEvolutionPick`'s `"ability-increase"` id).
   */
  abilityIncreases?: AbilityId[];
  /**
   * Target ability for each subtype grant that hands over a free +2 Ability
   * Increase (e.g. Archon 8th, Demon 12th — see `@pf1/engine`
   * `EidolonSubtypeGrant.abilityIncrease`), keyed by the grant's milestone
   * level AS A STRING (e.g. `{ "8": "cha" }`) since a subtype grants at most
   * one such bonus per level. Missing/invalid entries for an unlocked grant
   * default to Strength, same convention as `abilityIncreases` above.
   * Unchained-only; ignored for a chained eidolon.
   */
  subtypeGrantChoices?: Record<string, AbilityId>;
  /**
   * Player-set STARTING ability scores, overriding the defaults `@pf1/engine`
   * `deriveEidolon` would otherwise use (the base form's own Str/Dex/Con plus
   * the universal Int 7/Wis 10/Cha 11 every eidolon shares). Partial — only
   * the abilities present are overridden; the rest keep their default. Purely
   * a STARTING-score override: the level table's Str/Dex bonus, Large's fixed
   * deltas, evolutions, ASI slots, subtype grants, and shared buffs all still
   * apply on top, exactly as they do to the defaults.
   *
   * Exists because base-form scores are a common house-rule/GM-variant knob
   * (and cover the APG base forms this v1 doesn't model — see `eidolon.ts`'s
   * module doc comment). No validation: any integer is accepted, matching this
   * codebase's soft-posture convention for player-entered numbers.
   * Omitted/empty = pure RAW defaults.
   */
  baseAbilities?: Partial<Record<AbilityId, number>>;
  /** Player-given name (e.g. "Grix"). */
  name: string;
  /**
   * Chosen evolution picks, in pick order — see {@link EidolonEvolutionPick}.
   * Free-choice; the evolution pool's budget (`@pf1/engine`
   * `eidolonProgressionRow(level).evolutionPool`) is a SOFT warning only on
   * overspend, same posture as `traits`/`racialTraits`/every other budgeted
   * picker in this codebase — see `apps/web/src/model/eidolon.ts`'s
   * `eidolonEvolutionPointsSpent`/`eidolonEvolutionPoolNeedsWarning`.
   */
  evolutions: EidolonEvolutionPick[];
  /**
   * Feat ids chosen for the eidolon itself — keys into `RefData.feats`. Free
   * pick from the full feat list (no "eidolon-eligible" filter — a
   * documented v1 "first cut" scope, matching this project's hybrid-prereq
   * honesty bar rather than promising perfect eligibility curation),
   * soft-capped (never blocked) against the eidolon's own
   * `DerivedEidolon.bonusFeats` budget (APG Table: Eidolon Base Statistics
   * "Feats" column) by `apps/web/src/model/eidolon.ts`. Structured prereqs
   * (ability score, BAB) are checked against the EIDOLON's own derived
   * stats, not the summoner's — see `model/eidolon.ts`'s
   * `eidolonFeatPrereqContext`. Omitted/empty = no feats picked yet.
   */
  feats?: string[];
  /** Free-text notes (e.g. personality, tactics, house-rule tweaks). */
  notes?: string;
}

/**
 * Live session state for a tracked eidolon (`live.eidolon`) — see that
 * field's doc comment. Same damage/nonlethal/sharedBuffIds shape as
 * {@link AnimalCompanionLiveState}/{@link PhantomLiveState}, plus the
 * summoned/dismissed toggle unique to eidolons.
 */
export interface EidolonLiveState {
  /** Lethal damage taken so far (current HP = derived max − damage). Omitted/0 = undamaged. */
  damage?: number;
  /** Nonlethal damage taken so far. Omitted/0 = none. */
  nonlethal?: number;
  /**
   * Instance ids from `live.activeBuffs` (the MASTER's buff list) that also
   * apply to the eidolon's derived sheet (Share Spells). Toggled via
   * `apps/web/src/model/eidolon.ts`; resolved by `@pf1/engine`
   * `deriveEidolon` exactly like `AnimalCompanionLiveState.sharedBuffIds`.
   * Omitted/empty = no shared buffs.
   */
  sharedBuffIds?: string[];
  /**
   * Whether the eidolon is currently manifested on the material plane (PF1
   * RAW: a summoner can summon/dismiss her eidolon as a standard action; a
   * dismissed eidolon returns to its home plane and can't act). Display-only
   * bookkeeping — same posture as `PhantomLiveState.manifestation`: the
   * eidolon's derived stat block renders identically either way (so the
   * player can reference it while planning a re-summon), the panel just
   * flags the state. Omitted/undefined defaults to `true` (summoned).
   *
   * Life Link (PF1 CRB "Eidolon": the summoner may transfer damage from the
   * eidolon to herself, 1 hp per point, as an immediate action, no daily
   * limit, whenever the eidolon would be reduced below 0 hp) is a manual
   * player-triggered transfer with no automatic recomputation, so — like
   * `martialFlexibilityFeatId`'s manual-borrow bookkeeping — it is
   * deliberately NOT modeled numerically anywhere in this schema; the
   * tracker panel surfaces the rule as a reminder only.
   */
  summoned?: boolean;
  /**
   * The eidolon's OWN active conditions — condition ids, keys into
   * `@pf1/engine` `CONDITIONS`, tracked independently of the summoner's own
   * `live.conditions` (it can be shaken/entangled/etc. while the summoner
   * isn't). Same ladder-aware auto-upgrade/implied-condition posture as
   * {@link AnimalCompanionLiveState.conditions} (the established pattern) —
   * toggled via `apps/web/src/model/eidolon.ts` `toggleEidolonCondition`,
   * resolved by `@pf1/engine` `deriveEidolon` through the same
   * `routeSharedBuffs` pipeline as a shared buff. Omitted/empty = no active
   * conditions.
   */
  conditions?: string[];
}

/**
 * One prepared spell instance in a prepared caster's daily loadout. The same
 * `spellId` may appear in multiple entries (prepared into multiple slots).
 * Cantrips are prepared like any spell but cast at will, so their `expended`
 * flag is left untouched by the cast action.
 */
export interface PreparedSpell {
  /** Spell id (key into `RefData.spells`); must be in `build.spells.known`. */
  spellId: string;
  /** True once this prepared instance has been cast; cleared on rest. */
  expended: boolean;
  /**
   * Which slot this prepared instance occupies. `"normal"` (default, omitted for
   * backward-compat with pre-v2 docs) is a standard class slot; `"domain"` is a
   * cleric's bonus domain slot, sourced from `refData.domainSpellLists[<tag>]`
   * for one of the cleric's chosen domains. A `"domain"` slot is reserved per
   * accessible spell level per chosen domain (each is exclusive: a domain spell
   * may only be prepared in a domain slot and vice versa). `"school"` is a
   * specialist wizard's bonus school slot (one per accessible spell level
   * 1–9), exclusive to spells whose `Spell.school` matches `build.wizardSchool`
   * — never granted to a Universalist. A `"normal"`-kind spell whose school is
   * one of `build.wizardOppositionSchools` costs two normal slots to prepare
   * (PF1 RAW), accounted for in `model/preparedSpells.oppositionCost`, not by
   * a distinct `kind`.
   */
  kind?: "normal" | "domain" | "school";
  /**
   * Which caster class (key into `identity.classes[].tag`) this prepared
   * instance belongs to — issue #22 multiclass support. Undefined means the
   * document's *primary* caster class (see `build.spells.known`'s doc
   * comment): every prepared instance on a single-caster document, and every
   * instance predating this field, is implicitly the (only) caster class's,
   * so this stays undefined for them — zero migration needed. Only a second
   * (or further) caster class's instances set this explicitly.
   */
  classTag?: string;
  /**
   * Metamagic feats applied to this prepared instance (issue #71). Each entry
   * names a metamagic feat the character has (by `featNameSlug`, key into
   * `@pf1/engine`'s `METAMAGIC_FEATS`); the sum of their slot-level increases
   * bumps the slot this instance occupies (e.g. an Empowered Fireball — base
   * 3rd — consumes a 5th-level slot). Absent/empty means an unmodified spell,
   * so every pre-#71 prepared instance is unchanged. Only the SLOT accounting
   * is modeled; the numeric effect on the spell is a display-only note (see
   * `METAMAGIC_FEATS`'s honesty-bar doc comment). Save DC is unaffected by
   * every metamagic EXCEPT Heighten (`raisesEffectiveLevel`).
   */
  metamagic?: AppliedMetamagic[];
}

/**
 * One metamagic feat applied to a spell (a {@link PreparedSpell}, or a
 * spontaneous/hybrid cast — issue #71). The slot-level increase is read live
 * from `@pf1/engine`'s `METAMAGIC_FEATS[slug]` (following the same
 * "store the slug, look up the number" posture as `SavedRollFeatRef`), so a
 * data/registry bump never leaves a stale number baked into the doc.
 */
export interface AppliedMetamagic {
  /** `featNameSlug` of the metamagic feat (key into `@pf1/engine` `METAMAGIC_FEATS`). */
  slug: string;
  /**
   * Chosen level increase for a VARIABLE metamagic (Reach Spell 1–3, Heighten
   * Spell 1–`9 − spellLevel`). Omitted for fixed-increase feats, whose
   * increase is read straight from the registry (`MetamagicDef.slotIncrease`).
   */
  levels?: number;
}

/**
 * A player-curated bookmark into one already-computed `DerivedSheet` number
 * (see `build.savedRolls`). `label` is user-editable display text, seeded
 * from the source's default name at add-time.
 */
export interface SavedRoll {
  /** Unique instance id (stable across renames). */
  id: string;
  label: string;
  source: SavedRollSource;
  /**
   * Flat adjustment layered on top of the source's attack bonus (or, for
   * `source.kind === "custom"`, the roll's entire value) — for situational
   * feats the engine doesn't model as a toggle (Rapid Shot -2, Deadly Aim -1,
   * Two-Weapon Fighting -2, ...). Applied to every entry of an iterative
   * full-attack sequence equally. Not rescaled automatically as level/BAB
   * changes (e.g. Power Attack/Deadly Aim's BAB-tiered damage) — a flat
   * number the player sets and updates by hand. Zero/undefined = no adjustment.
   */
  attackModifier?: number;
  /**
   * Flat adjustment to the source's damage bonus (e.g. Deadly Aim's +2/+3,
   * Power Attack's +2/+3/+4). Only meaningful when the source resolves a
   * damage line (`kind: "weapon"`); ignored otherwise.
   */
  damageModifier?: number;
  /**
   * Freeform damage note (e.g. "2d6+4, x3 crit"). Only meaningful for
   * `source.kind === "custom"`, which has no engine-computed damage to
   * adjust — display-only, never parsed or evaluated.
   */
  customDamage?: string;
  /**
   * Feats folded into this roll at resolve time, by engine name slug (stable
   * across data bumps — see `featNameSlug`/`SITUATIONAL_FEAT_EFFECTS` in
   * `@pf1/engine`). Optional; absent on every saved roll persisted before
   * this field existed, which resolve identically to `[]`.
   */
  feats?: SavedRollFeatRef[];
  /**
   * Ranger situational class-feature bonuses folded into this roll at resolve
   * time (Favored Enemy, Favored Terrain). Each ref names a chosen `type`; its
   * numeric bonus is looked up LIVE from `DerivedSheet.ranger` (never
   * snapshotted), so re-assigning bonuses keeps saved rolls correct — same
   * "recompute, don't memoize" posture as feat attachments. A ref whose `type`
   * is no longer among the character's favored enemies/terrains renders as a
   * reminder chip but contributes no numbers (mirrors an un-owned feat).
   */
  rangerBonuses?: SavedRollRangerRef[];
}

/**
 * One ranger situational bonus attached to a `SavedRoll`. Unlike a feat ref
 * (keyed by a fixed registry slug), the bonus magnitude is a per-character
 * build choice, so it is resolved live from `DerivedSheet.ranger` by matching
 * `type` — see `apps/web/src/model/savedRolls.ts`.
 */
export interface SavedRollRangerRef {
  /** Which ranger feature this bonus comes from. */
  kind: "favored-enemy" | "favored-terrain";
  /** Chosen creature-type / terrain id (matches `build.favoredEnemies[].type` etc.). */
  type: string;
  /** Display name snapshot (e.g. "Undead", "Forest") so a since-removed pick still renders a chip. */
  name: string;
}

/**
 * One feat attached to a `SavedRoll`. Applies its registry effect (if any) at
 * resolve time in `apps/web/src/model/savedRolls.ts`; renders as a chip
 * either way (a feat with no registry entry is still a useful at-table
 * reminder, just not a numeric contributor).
 */
export interface SavedRollFeatRef {
  /** `featNameSlug` of the feat (key into SITUATIONAL_FEAT_EFFECTS, or any owned feat as a reminder chip). */
  slug: string;
  /** Display name, snapshotted at attach time so un-modeled/removed feats still render a chip. */
  name: string;
  /** Selected variant id when the registry entry declares `options`. */
  option?: string;
}

/**
 * What a `SavedRoll` points at. Every variant resolves against a live
 * `DerivedSheet` — no value is ever stored here — so a saved roll always
 * reflects the character's current buffs/feats/gear. `weapon`/`skill`
 * references are by stable id/name rather than array index, since
 * `build.weapons` and skill lists can be reordered or edited. `custom` has no
 * engine source at all — its value is entirely `SavedRoll.attackModifier` —
 * for one-off bookmarks the other variants don't cover.
 */
export type SavedRollSource =
  | { kind: "melee" }
  | { kind: "ranged" }
  /** One `DerivedSheet.attacks[]` entry, matched by `ResolvedWeaponAttack.name`. */
  | { kind: "weapon"; weaponName: string }
  | { kind: "cmb" }
  | { kind: "cmd" }
  | { kind: "initiative" }
  | { kind: "save"; save: "fort" | "ref" | "will" }
  | { kind: "skill"; skillId: SkillId }
  | { kind: "custom" };

/**
 * A buff currently affecting the character at the table. It carries its own
 * `changes` (a snapshot of the source buff's typed modifiers, or user-authored
 * ones), so the document is self-contained and the engine can evaluate it without
 * re-reading `RefData`. Mirrors DESIGN.md §3.1's `{ sourceId, remainingRounds,
 * changes }` sketch, with display + caster-level context for formula evaluation.
 */
export interface ActiveBuff {
  /** Unique instance id (multiple copies of the same buff can coexist). */
  instanceId: string;
  /** Source buff id from `RefData.buffs`; absent for user-authored buffs. */
  buffId?: string;
  /**
   * Stable id for a hand-authored engine-table effect this buff represents
   * (e.g. an inquisitor judgment `"judgment:destruction"`, a skald's
   * Inspired Rage `"ragingSong:inspiredRage"` — see `@pf1/engine`'s
   * `ToggleBuffOption`) that has no backing `RefData.buffs` entry. Lets the
   * tracker find/toggle its own active instance without borrowing `buffId`'s
   * documented RefData-only contract. Absent for ordinary and user-authored buffs.
   */
  effectTag?: string;
  /** Display label. */
  name: string;
  /** Typed modifiers this buff applies (same shape as any `Change`). */
  changes: Change[];
  /** Non-mechanical reminders to surface (e.g. "+2 vs fear"). */
  contextNotes?: ContextNote[];
  /**
   * Caster/effect level used to resolve `@item.level` / `@cl` in the buff's
   * formulas (e.g. Barkskin's natural-armor scaling). Absent → character level.
   */
  casterLevel?: number;
  /**
   * Rounds remaining before the buff auto-expires. `undefined` = indefinite
   * (stays until manually removed; e.g. a worn-item or stance buff).
   */
  remainingRounds?: number;
  /**
   * When true, this buff is NOT applied to the master's own derived sheet —
   * only to whichever companion creatures it's shared with (`FamiliarLive
   * State.sharedBuffIds` et al.). Models the RAW Share Spells choice of
   * casting a personal spell (e.g. Mage Armor) on the familiar *instead of*
   * yourself: the buff still lives in `activeBuffs` (so it ticks duration and
   * can be shared), but `collect.ts` skips it for the master. Absent/false →
   * the default, applies to the master as usual.
   */
  excludeMaster?: boolean;
}

/**
 * A piece of gear on the character. Magic/typed-modifier items reference
 * `RefData.items` by id (their `changes` feed the stacking engine when equipped).
 *
 * Base armor/shields selected from the picker snapshot their physical stats onto
 * `armor` at add-time (from `RefData.armors`, referenced by `armorId`); the
 * engine reads those stats off `armor` directly on compute. The `armorId` is a
 * display + re-sync pointer; a magic-item `itemId` and an `armorId` may both be
 * present (e.g. a named magical suit).
 */
export interface ItemInstance {
  /** Reference into RefData.items. Optional for purely mundane gear. */
  itemId?: string;
  /**
   * Reference into `RefData.armors` when this gear entry was created by
   * selecting a base armor/shield from the picker. Display + re-sync only —
   * the engine reads physical stats from `armor`, not from this id.
   */
  armorId?: string;
  /** Only equipped items contribute their changes to the derived sheet. */
  equipped: boolean;
  /** Worn armor/shield physical stats (snapshotted from RefData.armors on pick). */
  armor?: WornArmor;
  /** Display label fallback when `itemId` is absent. */
  name?: string;
  /**
   * How many of this item the character carries (issue #16). Absent means 1 —
   * every gear entry predating this field, and every entry added since where
   * the player never touched the stepper, behaves exactly as before. Used to
   * scale weight (unit weight × quantity) for both the gear-row display and
   * `@pf1/engine`'s `totalCarriedWeight` (encumbrance). This is how ammo/bulk
   * consumables are tracked (e.g. "Arrows" ×20) — there is no auto-decrement
   * on attack (no dice roller; attacks aren't "resolved" by this app), so the
   * player adjusts the stepper by hand as they use items up.
   */
  quantity?: number;
  /**
   * Charges spent so far on a limited-use item (issue #16), e.g. 3 of a Staff
   * of Healing's 10. Only meaningful when the instance has a charge cap — see
   * `charges` below, which is the instance's own cap or, absent that, the
   * linked `RefData.items[itemId].uses.maxFormula`. Absent means 0 (full
   * charges). Deliberately NOT modeled as a
   * generic `live.resources` pool keyed by a derived id: `ItemInstance`s live
   * in an unordered array with no stable per-instance identity (the same item
   * name can appear more than once, and removing an earlier entry shifts
   * every later index), so a pool keyed by array position would silently
   * misattribute charge state after any edit. Storing the count directly on
   * the instance means it always travels with the correct array element.
   * Ignored for gear with no `itemId` or whose ref carries no `uses`.
   * Back-compat: absent entirely for documents predating this feature.
   */
  chargesUsed?: number;
  /**
   * Unit weight in pounds. The default source is the vendored data — an
   * `itemId` entry reads `RefData.items[itemId].weight`, a worn suit reads
   * `armor.weight` — but a value here *overrides* it, since it's what the
   * player typed into the gear editor and a hand correction has to win over
   * the reference. Absent = use the vendored weight, or 0 lb when there is
   * none (a free-text custom entry, e.g. a Harrow deck with no listed weight).
   */
  weight?: number;
  /**
   * Unit price in gp (mirrors `weight` above: overrides
   * `RefData.items[itemId].price` when present, falls back to it when absent).
   * Display only; never affects any derived stat. Absent with no ref price = no
   * price shown.
   */
  price?: number;
  /**
   * Maximum charges for a limited-use item. Mirrors `weight`/`price`: overrides
   * `RefData.items[itemId].uses.maxFormula` when present, falls back to it when
   * absent — so a player can correct a wand's cap by hand (a 50-charge wand at
   * 47 remaining is `charges: 50`, `chargesUsed: 3`), and self-contained
   * consumables with no `itemId` at all (a generated wand; see
   * `apps/web/src/model/consumables.ts`) carry their cap here. Spent charges
   * live in `chargesUsed` regardless of `itemId`. Absent with no ref formula =
   * not a charge-tracked item. Display + live-tracking only; never a derived
   * stat.
   */
  charges?: number;
}

/** Physical stats of a worn piece of body armor or a shield. */
export interface WornArmor {
  slot: "armor" | "shield";
  /** Base armor/shield AC bonus (excluding enhancement — tracked separately). */
  ac: number;
  /** Enhancement bonus to armor/shield AC (a +3 suit of full plate has `ac:9, enhancement:3`). */
  enhancement?: number;
  /** Special material tag (e.g. "mithral", "adamantine") — display + pick-time modifiers applied. */
  material?: string;
  /** Maximum Dexterity bonus the armor permits (omit for no cap). */
  maxDex?: number;
  /** Armor check penalty (a negative number, or 0). */
  acp?: number;
  /** Armor weight class for `@armor.type` formulas: 0 none,1 light,2 med,3 heavy. */
  type?: number;
  /**
   * Masterwork quality (reduces armor check penalty by 1, floor 0 magnitude).
   * Only meaningful at `enhancement` 0 — any magic enhancement bonus already
   * implies masterwork quality, so this is dropped once `enhancement` is
   * positive. The ACP reduction is baked into the snapshotted `acp` value
   * at pick-time (see `model/doc.ts` `addWornArmorFromRef`), mirroring how
   * weapon enhancement is snapshotted rather than recomputed by the engine.
   */
  masterwork?: boolean;
  /** Magical armor/shield ability ids (e.g. "light-fortification", "ghost-touch") — display only. */
  abilities?: string[];
  /**
   * Weight in pounds, snapshotted from `ArmorRef.weight` at pick-time (issue
   * #16 encumbrance), or entered directly for a hand-authored custom armor
   * entry. Feeds `@pf1/engine`'s `totalCarriedWeight`; ignored entirely when
   * `settings.encumbranceEnabled` is off. Omitted = 0 lb (e.g. a manually
   * entered armor the player didn't bother to weigh).
   */
  weight?: number;
  /**
   * Arcane spell failure chance (%), snapshotted from `ArmorRef.asf` at
   * pick-time, reduced by mithral's -10% (issue #8; see `model/materials.ts`).
   * Display-only — feeds `DerivedSheet.arcaneSpellFailure`, shown only when
   * the character has an arcane-casting class. Omitted = 0%.
   */
  asf?: number;
}

/**
 * A weapon on the character — either hand-entered (the "Custom" picker fallback)
 * or snapshotted from `RefData.weapons` via `weaponId`. Enough information to
 * compute per-weapon attack and numeric damage bonus lines. Dice and crit are
 * stored for display; the engine never rolls.
 */
export interface WeaponInstance {
  /** Display name (e.g. "Longsword +1"). */
  name: string;
  /**
   * Reference into `RefData.weapons` when this weapon was created by selecting
   * a base weapon from the picker. Display + re-sync only — the engine reads
   * the per-weapon stats off this `WeaponInstance` directly.
   */
  weaponId?: string;
  /** Which ability modifier applies to the attack roll. */
  attackAbility: "str" | "dex";
  /**
   * Which ability modifier adds to the damage bonus.
   * - `"str"` (default): STR × damageMultiplier, melee only.
   * - `"dex"`: DEX × damageMultiplier, melee only — a hand-set override for a
   *   Dex-to-damage source the player wants to force on (e.g. Slashing
   *   Grace). Rogue (Unchained)'s Finesse Training (`build.rogueFinesseWeapons`
   *   — issue #65) applies this automatically for a matching weapon instead
   *   of requiring it to be set by hand; see `computeWeaponAttacks` in
   *   `compute.ts`.
   * - `"none"`: no ability modifier to damage (ranged, finesse, thrown without STR).
   */
  damageAbility?: "str" | "dex" | "none";
  /**
   * Multiplier applied to the damage ability modifier.
   * 1 = one-handed (default), 1.5 = two-handed, 0.5 = off-hand.
   */
  damageMultiplier?: number;
  /** Enhancement bonus; adds to both attack roll and damage bonus. Default 0. */
  enhancement?: number;
  /**
   * Masterwork quality (+1 to attack, no damage effect). Only meaningful at
   * `enhancement` 0 — any magic enhancement bonus already implies masterwork,
   * so this is dropped once `enhancement` is positive.
   */
  masterwork?: boolean;
  /** Special material tag (e.g. "mithral", "adamantine", "silver") — display only for weapons. */
  material?: string;
  /** Damage dice string for display only, e.g. "1d8". The engine does not roll. */
  damageDice?: string;
  /**
   * Lower bound of the critical threat range. Default 20 (i.e. "20/×2").
   * Example: 19 produces the string "19–20/×N".
   */
  critRange?: number;
  /** Critical hit multiplier. Default 2 (×2). */
  critMult?: number;
  /**
   * Weapon group / type label (e.g. "longsword", "greataxe").
   * Stored for future use by feat-matching (Weapon Focus, Weapon Specialization).
   * Has no effect on the computed values until that follow-up is implemented.
   */
  group?: string;
  /**
   * Semantic weapon-group tags (e.g. `["bows"]`, `["blades-heavy"]`),
   * snapshotted from `WeaponRef.weaponGroups` at pick-time and normalized to
   * `@pf1/engine`'s kebab-case slug convention (`normalizeWeaponGroup` in
   * `weapon-groups.ts`). Unlike `group` (a free-text, one-weapon tag), this
   * is Foundry's canonical weapon-category vocabulary — what
   * `attack.weapon.<group>` / `damage.weapon.<group>` Changes match against
   * for category-scoped bonuses (Weapon Training and its archetype
   * reflavors), in addition to `group`. Omitted for hand-entered custom
   * weapons, which have no vendored group data and keep working via `group`
   * alone (issue #45).
   */
  weaponGroups?: string[];
  /** Melee or ranged; determines which attack modifier targets apply. Default "melee". */
  category?: "melee" | "ranged";
  /**
   * Magical weapon ability ids (e.g. "keen", "flaming") — keen modifies
   * critRange at pick-time; others display-only. Requires `enhancement >= 1`
   * (PF1 magic item rules); `enhancement` plus the abilities' combined
   * bonus-equivalent is capped at +10 total. Both rules are enforced by the
   * `model/doc.ts` weapon transitions, not by the schema itself.
   */
  abilities?: string[];
  /**
   * Weight in pounds, snapshotted from `WeaponRef.weight` at pick-time (issue
   * #16 encumbrance), or entered directly for a hand-authored custom weapon.
   * Feeds `@pf1/engine`'s `totalCarriedWeight`; ignored when
   * `settings.encumbranceEnabled` is off. Omitted = 0 lb.
   */
  weight?: number;
}

/* ----------------------------------------------------------- derived sheet -- */

/**
 * The output of `compute(doc, refData)` — every displayed number. Derived values
 * are never persisted; they are recomputed from the document on demand.
 */
export interface DerivedSheet {
  schemaVersion: number;
  /** Total character level (sum of class levels). */
  level: number;
  abilities: Record<AbilityId, AbilityScore>;
  bab: number;
  saves: { fort: ResolvedStat; ref: ResolvedStat; will: ResolvedStat };
  ac: ArmorClass;
  cmb: number;
  cmd: number;
  /**
   * The character's current effective size category — race base size,
   * shifted by any relative "size"-target Change (Enlarge/Reduce Person,
   * ...), then replaced outright by an active polymorph form's size if one
   * is active (issue #70, see `live.activeForm`). Feeds the size modifiers
   * baked into `ac`/`attack`/`attacks`/`cmb`/`cmd` above; exposed directly
   * here (previously computed only internally by `compute()`) so the UI can
   * show it.
   */
  size: SizeId;
  initiative: ResolvedStat;
  /** Base melee/ranged attack bonus (single-attack, before weapon specifics). */
  attack: { melee: ResolvedStat; ranged: ResolvedStat };
  /** Per-weapon attack + damage lines derived from build.weapons. */
  attacks: ResolvedWeaponAttack[];
  hp: HitPoints;
  /** Movement speeds in feet, keyed by mode ("land", "fly", ...). */
  speeds: Record<string, number>;
  skills: Record<SkillId, DerivedSkill>;
  /** Every granted base-class feature up to current level, with archetype-swap strike-through. */
  classFeatures: DerivedClassFeature[];
  /** One entry per chosen `build.archetypes` id, with its swap map + own feature list. */
  activeArchetypes: DerivedArchetype[];
  /**
   * Ranger situational selections, present only when the character has ranger
   * levels. A live projection of `build.favoredEnemies`/`favoredTerrains`/
   * `combatStyle` (bonuses pass through the player's assignment), read by the
   * builder pickers for display and by `SavedRoll.rangerBonuses` resolution to
   * fold favored-enemy/terrain bonuses into attached rolls. Absent for
   * non-rangers.
   */
  ranger?: DerivedRanger;
  /**
   * Damage reduction / energy resistance / spell resistance, display-only
   * (issue #21). Undefined when the character has none of the three — the UI
   * renders nothing rather than an empty "Defenses" line.
   */
  defenses?: Defenses;
  /**
   * Carrying capacity / encumbrance (issue #16) — an OPTIONAL PF1 rule, only
   * computed when `build.settings.encumbranceEnabled` is true. Undefined
   * whenever the setting is off/absent, which is the default for every
   * existing document: this keeps `compute()` byte-identical for characters
   * that predate the feature and for every table that doesn't use the rule.
   */
  encumbrance?: DerivedEncumbrance;
  /**
   * Total arcane spell failure chance (%) from equipped armor/shields (issue
   * #8), shown only when the character has an arcane-casting class (wizard,
   * sorcerer, arcanist, magus, bard, summoner, skald, witch, or bloodrager in
   * the current vendored class slice — divine casters never incur ASF and
   * this stays undefined for them). No component breakdown, same posture as
   * `speeds` (see `DerivedEncumbrance` doc comment) — display-only, no
   * cast-failure mechanics.
   *
   * `exempt` is true when the character's ONLY arcane class grants a PF1-RAW
   * "Weapon and Armor Proficiency" ASF exemption (bard, summoner, skald,
   * bloodrager, or magus — see `computeArcaneSpellFailure`'s
   * `ARMOR_EXEMPTIONS` in the engine for the exact per-class armor tier /
   * shield rules, issue #64) AND the worn armor/shield qualifies; `total`
   * reads 0 in that case and `exemptNote` carries a human-readable
   * explanation for the sheet footnote. A character with more than one
   * arcane class (e.g. multiclass wizard/bard) never gets the exemption,
   * even if every arcane class they have would individually qualify — this
   * app tracks ASF as a single sheet-level number rather than per-spell, so
   * the exemption is all-or-nothing and the conservative (non-exempt) total
   * is shown whenever the classes could disagree.
   */
  arcaneSpellFailure?: { total: number; exempt: boolean; exemptNote?: string };
  /**
   * The active polymorph-family transformation's resolved sheet (issue #70),
   * present only while `live.activeForm` is set. The ability-score and
   * natural-armor adjustments themselves are NOT duplicated here — they
   * already flow through `abilities.*.components`/`ac.components` like any
   * other typed modifier (see `live.activeForm`'s doc comment); this carries
   * what those don't: the resolved natural-attack lines, the tier/option's
   * honesty-bar context notes, and the player's own free-text notes.
   */
  activeForm?: DerivedActiveForm;
}

/** One resolved natural-attack line on `DerivedActiveForm.attacks` — see `@pf1/engine` `computePolymorphAttacks`. */
export interface DerivedPolymorphAttack {
  name: string;
  count: number;
  kind: "primary" | "secondary";
  /** BAB + Str mod + size modifier, and −5 more when `kind === "secondary"`. */
  attackBonus: number;
  /** Str mod added to damage (full for primary, half — floored, full penalty if negative — for secondary). */
  damageBonus: number;
  damageDice?: string;
}

/**
 * The active polymorph-family transformation's resolved sheet — see
 * `DerivedSheet.activeForm`'s doc comment.
 */
export interface DerivedActiveForm {
  /** Polymorph tier key, e.g. "beastShapeIII". */
  tier: string;
  /** Display name, e.g. "Beast Shape III". */
  tierName: string;
  creatureType: string;
  size: SizeId;
  element?: string;
  formName: string;
  /** Natural armor bonus this form grants (0 when the tier/creatureType/size/element combo didn't resolve). */
  naturalArmor: number;
  attacks: DerivedPolymorphAttack[];
  /** Context-note reminders (tier/option riders + the gear-melding disclaimer) — display only. */
  notes: string[];
  /** The player's own free-text notes (`ActiveForm.notes`). */
  playerNotes?: string;
  /**
   * True when `tier`/`creatureType`/`size`/`element` didn't resolve to a
   * known `PolymorphFormOption` — the form still shows (name, attacks, size
   * override), just with no ability/natural-armor adjustment applied.
   */
  unresolved: boolean;
}

/** Light/medium/heavy carrying-capacity tier (PF1 CRB "Carrying Capacity"). */
export type LoadTier = "light" | "medium" | "heavy";

/**
 * Encumbrance (issue #16), computed only when `build.settings.encumbranceEnabled`
 * is true — see `@pf1/engine/encumbrance.ts` for the hand-authored carrying-
 * capacity table and load-tier penalties this is built from.
 */
export interface DerivedEncumbrance {
  /** Sum of gear weight × quantity, plus equipped armor/weapon weight, in pounds. */
  totalWeight: number;
  /** Effective Strength score (post racial/item/buff modifiers) the thresholds were computed from. */
  strScore: number;
  /** Light/medium/heavy weight ceilings in pounds (size-multiplier applied). */
  thresholds: { light: number; medium: number; heavy: number };
  /** Which tier `totalWeight` falls into. "up to" a threshold stays the lighter tier (PF1 RAW). */
  tier: LoadTier;
  /** RAW max Dexterity bonus to AC for this tier; undefined at light load (no load-based cap). */
  maxDexCap?: number;
  /** RAW armor check penalty from this tier alone (0, -3, or -6) — combines with worn-armor ACP. */
  acp: number;
  /** True for medium/heavy — land speed is reduced per the RAW "Table: Speed" mapping. */
  speedPenalty: boolean;
}

/** Ranger favored enemies/terrains + combat style, projected onto the sheet (see `DerivedSheet.ranger`). */
export interface DerivedRanger {
  favoredEnemies: { type: string; bonus: number }[];
  favoredTerrains: { type: string; bonus: number }[];
  combatStyle?: string;
}

/**
 * DR / energy resistance / spell resistance, gathered from the same collected-
 * modifier pipeline as every other change target (race/item/class-feature/buff/
 * condition) plus the hand-authored barbarian Damage Reduction progression.
 * Display-only: nothing here feeds back into damage/attack math.
 */
export interface Defenses {
  /** One entry per distinct bypass qualifier (e.g. "—", "magic", "cold iron"). */
  dr: DefenseEntry[];
  /** One entry per distinct energy type (e.g. "fire", "cold"). */
  resistances: DefenseEntry[];
  /** Spell resistance, if any source grants it. */
  sr?: { total: number; components: ModifierComponent[] };
}

/**
 * One DR or energy-resistance line. Same same-qualifier sources don't stack in
 * PF1 (you benefit from the single highest value of a given qualifier) — the
 * losing sources still appear in `components` with `applied: false`, same
 * strike-through convention as `ModifierComponent` elsewhere.
 */
export interface DefenseEntry {
  /** The winning (highest) value for this qualifier. */
  total: number;
  /** Bypass type ("—" for DR/—, "magic", "cold iron", ...) or energy type ("fire", "cold", ...). */
  qualifier: string;
  components: ModifierComponent[];
}

/**
 * One granted base-class feature. `applied: false` means an active archetype's
 * `pairedBaseFeatureUuid` matches this grant's `uuid` — the UI strikes it
 * through, same visual language as `ModifierComponent.applied`.
 */
export interface DerivedClassFeature {
  level: number;
  classTag: string;
  /** Key into `RefData.classFeatures`. */
  featureId: string;
  name: string;
  applied: boolean;
  /** Set when `applied` is false: the archetype feature name that replaced it. */
  replacedBy?: string;
  /**
   * One-line mechanical summary that the prose-only `changes[]` carries upstream
   * (e.g. sneak attack's "3d6"). Undefined for features with no hand-authored
   * numeric detail. The UI renders this next to the feature name.
   */
  detail?: string;
  /**
   * Set when this feature came from a chosen cleric domain, wizard arcane
   * school, sorcerer bloodline (issue #34), arcanist exploit (issue #42),
   * magus arcana, oracle revelation (both issue #61), witch hex, alchemist
   * discovery (both issue #65 wave 1), antipaladin cruelty, or ninja trick
   * (both issue #65 wave B) rather than the class itself — all ten share
   * `classTag: "cleric"`/`"wizard"`/`"sorcerer"`/`"arcanist"`/`"magus"`/
   * `"oracle"`/`"witch"`/`"alchemist"`/`"antipaladin"`/`"ninja"` with the
   * class's own intrinsic features, so this disambiguates e.g. "Fire Bolt"
   * (Fire Domain) from Channel Energy (cleric itself), "Claws" (Draconic
   * Bloodline) from a sorcerer's other features, "Quick Study" (an
   * exploit) from an arcanist's own Arcane Reservoir, "Familiar" (a magus
   * arcana) from a magus's own Spell Combat, "Ward" (a hex) from a witch's
   * own Witch's Familiar, or "Cauldron" (a discovery) from an alchemist's
   * own Bomb, "Fatigued" (a cruelty) from an antipaladin's own Touch of
   * Corruption, or "Combat Trick" (a ninja trick) from a ninja's own
   * Sneak Attack. Issue #65 adds more origin kinds (spirit, rage power,
   * ki power, style strike, rogue talent, investigator talent, vigilante
   * social/vigilante talent, shifter aspect, psychic discipline power,
   * phrenic amplification, mesmerist trick, mesmerist bold stare, occultist
   * implement school, occultist focus power, kineticist composite blast,
   * kineticist wild talent, medium spirit power) — same disambiguation need
   * against each class's own intrinsic features.
   */
  origin?: {
    kind:
      | "domain"
      | "school"
      | "bloodline"
      | "exploit"
      | "arcana"
      | "revelation"
      | "hex"
      | "discovery"
      | "spirit"
      | "cruelty"
      | "trick"
      | "ragePower"
      | "kiPower"
      | "styleStrike"
      | "rogueTalent"
      | "investigatorTalent"
      | "vigilanteSocialTalent"
      | "vigilanteTalent"
      | "shifterAspect"
      | "discipline"
      | "amplification"
      | "stare"
      | "implementSchool"
      | "focusPower"
      | "compositeBlast"
      | "wildTalent"
      | "spiritPower";
    label: string;
  };
}

/** One feature granted by an active archetype (in addition to/instead of the base grant). */
export interface DerivedArchetypeFeature {
  level: number;
  name: string;
  description?: string;
  /** True when this feature has no `pairedBaseFeatureUuid` — prose-only soft warning, not a swap. */
  ambiguous: boolean;
  /**
   * One-line mechanical summary for the slice of archetype features with
   * real numeric effects — hand-verified (issue #7) or machine-extracted
   * (issue #45) — e.g. "DR 5/—". Undefined for the vast majority of
   * archetype features, which are structural/prose-only (see `@pf1/engine`
   * `archetype-effects.ts` / `archetype-effects-extracted.ts`).
   */
  detail?: string;
  /**
   * Which table `detail`/the underlying `Change`s came from — "verified"
   * (issue #7, a human read the rulebook) or "extracted" (issue #45, a
   * prose→Change extraction pass; carries lower confidence, see
   * `@pf1/engine` `archetype-effects-extracted.ts`). Undefined when neither
   * table has an entry for this feature (no `detail` either, in that case).
   * Kept as a distinct field (not folded into `detail`'s string) so the UI
   * can render a visibly different badge without string-sniffing.
   */
  effectSource?: "verified" | "extracted";
}

/** A resolved archetype the character has chosen, with its swap map + feature list. */
export interface DerivedArchetype {
  id: string;
  name: string;
  classTag: string;
  /** Spell/class level -> the base-class grant uuid this archetype swaps out at that level. */
  swappedSlots: Record<number, string>;
  features: DerivedArchetypeFeature[];
}

export interface AbilityScore {
  /** Score from the document, before any modifiers. */
  base: number;
  /** Final score after racial/item/etc. modifiers. */
  total: number;
  /** Ability modifier: floor((total - 10) / 2). */
  mod: number;
  /** Per-source breakdown of the modifiers applied to the base score. */
  components: ModifierComponent[];
}

/** One contribution to a stacked value, with provenance for the UI. */
export interface ModifierComponent {
  /** Human-readable source label, e.g. "Belt of Physical Might +4". */
  source: string;
  /** Source entity id, where applicable. */
  sourceId?: string;
  /** Stacking category (e.g. "enh", "morale", "dodge", "untyped"). */
  type: string;
  value: number;
  /** False when overridden by a higher same-type bonus (struck through in UI). */
  applied: boolean;
}

/** A scalar derived value plus the modifier breakdown that produced it. */
export interface ResolvedStat {
  total: number;
  components: ModifierComponent[];
  /**
   * Full-attack iterative sequence (e.g. [11, 6] for BAB 6 => "+11/+6"),
   * including the first attack. Only ever set on `DerivedSheet.attack.melee` /
   * `.ranged` and `ResolvedWeaponAttack.attack`, where extra attacks from BAB
   * apply; omitted (rather than a 1-length array) when BAB grants no extras.
   * Every other `ResolvedStat` consumer (saves, initiative, cmb, ...) leaves
   * this undefined.
   */
  iteratives?: number[];
}

/**
 * Computed attack and numeric damage bonus for one weapon entry. Dice are
 * display-only; the engine does not evaluate random rolls.
 */
export interface ResolvedWeaponAttack {
  /** Weapon name (from WeaponInstance.name). */
  name: string;
  category: "melee" | "ranged";
  /**
   * Total attack bonus with full provenance (BAB + ability + size + enh + modifiers).
   * `attack.iteratives`, when set, is this weapon's full attack sequence.
   */
  attack: ResolvedStat;
  /**
   * Numeric damage bonus (no dice) with provenance.
   * = floor(abilityMod × damageMultiplier) + enhancement + damage-target changes.
   */
  damageBonus: ResolvedStat;
  /** Damage dice string for display (e.g. "1d8"), if the weapon entry includes it. */
  damageDice?: string;
  /** Critical hit string, e.g. "19–20/×2" or "×2". */
  crit: string;
}

export interface ArmorClass {
  normal: number;
  touch: number;
  flatFooted: number;
  /** All AC contributions with provenance + applicability flags. */
  components: AcComponent[];
}

export interface AcComponent extends ModifierComponent {
  /** Which AC bucket this belongs to (controls touch/flat-footed inclusion). */
  category:
    | "base"
    | "armor"
    | "shield"
    | "natural"
    | "dex"
    | "size"
    | "dodge"
    | "deflection"
    | "generic";
}

export interface HitPoints {
  /** Rules-average maximum HP, before any user override (for display/reset). */
  auto: number;
  max: number;
  /** From the document's live state. */
  current: number;
  temp: number;
  nonlethal: number;
  /** Per-source breakdown of contributions to max HP (HD total, Con, FCB, etc.). */
  components: ModifierComponent[];
  /**
   * Temporary HP a currently-active buff/feature GRANTS (issue #67) — e.g.
   * Unchained Rage's "2 temporary hit points per Hit Die" (scaling to 3 at
   * 11th via Greater Rage, 4 at 20th via Mighty Rage). Collected from every
   * `Change` targeting `"tempHp"`, the same generic collect → target pipeline
   * as every other stat — see `@pf1/engine` `collect.ts`/`compute.ts`.
   *
   * This is DISTINCT from the manual `temp` field above, which is the tracker's
   * single source of truth for the character's actual current temp-HP buffer
   * (consumed by damage before real HP — see `apps/web/src/model/hp.ts`
   * `applyDamage`). `grantedTemp` is a ceiling/suggestion the UI uses to know
   * how much to set `live.hp.temp` to on activation — see
   * `apps/web/src/model/hp.ts` `applyGrantedTempHp` for the sync logic and its
   * documented edge cases (it cannot distinguish buff-granted temp HP already
   * merged into `live.hp.temp` from unrelated manually-entered temp HP once
   * they're in the same pool).
   *
   * PF1 RAW (Paizo FAQ, Core Rulebook p. 208 "Combining Magical Effects"):
   * temporary HP from the SAME source do not stack (the higher application
   * wins); temporary HP from DIFFERENT sources DO stack (sum). `total` already
   * applies this rule — grouped by each modifier's `source` (display name),
   * highest-per-group, then summed across groups; `components` lists every
   * contributing modifier with `applied: false` on any same-source entry that
   * lost to a higher one from the same source.
   */
  grantedTemp: { total: number; components: ModifierComponent[] };
}

export interface DerivedSkill {
  id: SkillId;
  ability: AbilityId;
  ranks: number;
  abilityMod: number;
  /** +3 when this is a class skill with at least one rank. */
  classSkillBonus: number;
  /** Armor check penalty applied (0 unless a str/dex skill with worn armor). */
  acp: number;
  /** Net of typed modifiers targeting this skill. */
  miscMod: number;
  total: number;
  classSkill: boolean;
  /** Provenance for the misc modifiers. */
  components: ModifierComponent[];
  /** True when this skill requires at least 1 rank to use (PF1 "trained only"). */
  trainedOnly: boolean;
  /**
   * True when the skill can actually be attempted: either it is not
   * trained-only, or the character has at least one rank invested.
   * Equivalent to `ranks > 0 || !trainedOnly`.
   */
  usable: boolean;
}
