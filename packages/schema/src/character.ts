import type { AbilityId, Change, ContextNote, SkillId } from "./primitives.js";

/**
 * A PF1 wizard arcane school tag: one of the eight specialist schools, or
 * "uni" for Universalist (no specialization). Matches `Spell.school` values
 * in the vendored data.
 */
export type WizardSchoolTag =
  | "abj"
  | "con"
  | "div"
  | "enc"
  | "evo"
  | "ill"
  | "nec"
  | "trs"
  | "uni";

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
     * Wizard specialization school tag. One of the eight PF1 schools
     * ("abj","con","div","enc","evo","ill","nec","trs") or "uni" (Universalist —
     * no opposition schools, no bonus slot). Free-choice; the vendored Foundry
     * data has no per-school mapping of school features. Default undefined =
     * Universalist (back-compat: existing wizard docs load as Universalist).
     *
     * A specialist (any non-"uni" tag) gains one bonus prepared slot per
     * accessible spell level 1–9 (rendered with `PreparedSpell.kind ===
     * "school"`), exclusive to spells of that school, plus two opposition
     * schools (see `wizardOppositionSchools`). A Universalist gains NO bonus
     * slot (PF1 RAW — their compensation is school powers, deferred).
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
    /** Bonus-feat picks, etc. — typed in Stage 3. */
    classFeatureChoices: unknown[];
    /**
     * Spells the character *knows*. For a prepared caster (wizard) this is the
     * spellbook — the library you may prepare from. The daily prepared loadout
     * and cast-tracking live in `live.spells`, NOT here, because preparation is
     * session state that resets on rest (DESIGN: build.* vs live.*).
     */
    spells: { known: string[] };
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
       * Manual overrides for specific derived stats. Keys are from the bounded
       * allowlist enforced by the engine: `hp.max`, `ac.normal`, `speeds.land`,
       * `initiative.total`, `bab`, `cmd`, `cmb`, `saves.fort.total`,
       * `saves.ref.total`, `saves.will.total`.
       */
      statOverrides?: Record<string, number>;
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
     */
    spells?: { prepared: PreparedSpell[]; slotsUsed?: Record<number, number> };
    /**
     * Hero points currently held (PF1 optional rule). Omitted = 0.
     * Standard maximum held at once is 3 (see HERO_POINT_CAP in model/heroPoints).
     */
    heroPoints?: number;
  };
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
}

/** Ranger favored enemies/terrains + combat style, projected onto the sheet (see `DerivedSheet.ranger`). */
export interface DerivedRanger {
  favoredEnemies: { type: string; bonus: number }[];
  favoredTerrains: { type: string; bonus: number }[];
  combatStyle?: string;
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
}

/** One feature granted by an active archetype (in addition to/instead of the base grant). */
export interface DerivedArchetypeFeature {
  level: number;
  name: string;
  description?: string;
  /** True when this feature has no `pairedBaseFeatureUuid` — prose-only soft warning, not a swap. */
  ambiguous: boolean;
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
