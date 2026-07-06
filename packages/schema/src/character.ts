import type { AbilityId, Change, ContextNote, SkillId } from "./primitives.js";

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
     * project's hybrid soft-warning posture (see IMPLEMENTATION_PLAN.md Stage 11.3).
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
     * (the same id stored in `feats[]`).
     *
     * One choice per feat id. Taking the same feat twice with different choices
     * (e.g. Skill Focus (Perception) and Skill Focus (Stealth)) is a known future
     * limitation — each feat id maps to exactly one choice here. When a feat is
     * removed from `feats[]`, its entry here should also be deleted.
     *
     * Optional for back-compat: existing documents without this field behave as if
     * no choices have been made (choice-feats emit no changes until a choice is set).
     */
    featChoices?: Record<string, string>;
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
  };
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
   * matching the engine's soft-warning posture.
   */
  source: ("nature-bond" | "hunters-bond")[];
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
   * of Healing's 10. Only meaningful when the linked `RefData.items[itemId]`
   * carries `uses.maxFormula` — the UI reads the max from there rather than
   * storing it here, so the max always stays in sync if the vendored data
   * changes. Absent means 0 (full charges). Deliberately NOT modeled as a
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
   * Unit weight in pounds, for gear with no `itemId`/`armorId` (a free-text
   * custom entry — see `model/doc.ts` `addCustomGearItem`). Ignored when
   * `itemId` or `armor` is present; those look their weight up from
   * `RefData.items[itemId].weight` / `armor.weight` instead, so the vendored
   * data stays the single source of truth for anything it covers. Omitted =
   * 0 lb (e.g. a Harrow deck-style item with no listed weight).
   */
  weight?: number;
  /**
   * Unit price in gp, for gear with no `itemId` (mirrors `weight` above —
   * `itemId` entries read `RefData.items[itemId].price` instead). Display
   * only; never affects any derived stat. Omitted = no price shown.
   */
  price?: number;
  /**
   * Maximum charges for a self-contained limited-use consumable that has no
   * `itemId` to look a `uses.maxFormula` up from — currently only a generated
   * wand ("Wand of Cure Light Wounds", 50 charges; see
   * `apps/web/src/model/consumables.ts`). The gear UI reads the charge cap from
   * `RefData.items[itemId].uses.maxFormula` when `itemId` is present, else from
   * this field, and tracks spent charges in `chargesUsed` (which is already
   * stored on the instance regardless of `itemId`). Omitted = not a
   * charge-tracked item. Display + live-tracking only; never a derived stat.
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
   * - `"none"`: no ability modifier to damage (ranged, finesse, thrown without STR).
   */
  damageAbility?: "str" | "none";
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
   * sorcerer, or bard in the current vendored class slice — divine casters
   * never incur ASF and this stays undefined for them). No component
   * breakdown, same posture as `speeds` (see `DerivedEncumbrance` doc
   * comment) — display-only, no cast-failure mechanics.
   *
   * `bardExempt` is true when the character's ONLY arcane class is bard and
   * they're wearing light armor (or none) with no shield — PF1 RAW exempts
   * bards from ASF under those conditions; `total` reads 0 in that case. A
   * bard who also has another arcane class (e.g. multiclass wizard/bard), or
   * who's in medium/heavy armor or carrying a shield, does not get the
   * exemption and `total` is the plain sum.
   */
  arcaneSpellFailure?: { total: number; bardExempt: boolean };
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
   * school, sorcerer bloodline (issue #34), or arcanist exploit (issue #42)
   * rather than the class itself — all four share `classTag: "cleric"`/
   * `"wizard"`/`"sorcerer"`/`"arcanist"` with the class's own intrinsic
   * features, so this disambiguates e.g. "Fire Bolt" (Fire Domain) from
   * Channel Energy (cleric itself), "Claws" (Draconic Bloodline) from a
   * sorcerer's other features, or "Quick Study" (an exploit) from an
   * arcanist's own Arcane Reservoir.
   */
  origin?: { kind: "domain" | "school" | "bloodline" | "exploit"; label: string };
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
