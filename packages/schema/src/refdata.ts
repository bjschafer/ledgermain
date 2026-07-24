import type { ElementalSchoolTag, WizardSchoolTag } from "./character.js";
import type {
  AbilityId,
  BabTier,
  Change,
  ContextNote,
  RefEntity,
  SaveTier,
  SizeId,
  SkillId,
  SourceRef,
} from "./primitives.js";

/**
 * `RefData` is the normalized, build-time-generated reference dataset consumed
 * by the rules engine. It is derived from the Foundry PF1 YAML packs at a pinned
 * source commit (see data-pipeline). Entities are keyed by Foundry id for O(1)
 * lookup and stable cross-references.
 */
export interface RefData {
  meta: RefDataMeta;
  races: Record<string, Race>;
  classes: Record<string, Class>;
  /** Class features (the `class-abilities` pack) referenced by classes. */
  classFeatures: Record<string, ClassFeature>;
  feats: Record<string, Feat>;
  /**
   * The full vendored PF1 character-trait catalog (~2,000 entries, see
   * {@link Trait}). Not the same as the engine's hand-authored `TRAITS`
   * table (28 verified entries, `CharacterDoc.build.traits` may reference
   * either) — see `@pf1/engine` `traits.ts` for how the two are merged.
   */
  traits: Record<string, Trait>;
  spells: Record<string, Spell>;
  buffs: Record<string, Buff>;
  items: Record<string, Item>;
  /** Per-class spell lists, keyed by class tag → spell level → spell ids. */
  spellLists: Record<string, SpellList>;
  /**
   * Per-domain spell lists, keyed by domain tag (e.g. "Air", "Fire") → spell
   * level → spell ids. Inverted from `Spell.learnedAt.domain`. A cleric's two
   * chosen domains each grant one bonus prepared slot per accessible spell
   * level, drawable from this list. Empty for non-cleric slices.
   */
  domainSpellLists: Record<string, SpellList>;
  /**
   * Per-bloodline spell lists, keyed by bloodline tag (e.g. "Draconic",
   * "Abyssal") → spell level → spell ids. Inverted from `Spell.learnedAt.bloodline`.
   * A sorcerer's chosen bloodline grants one bonus spell known per odd sorcerer
   * level starting at 3 (level-`L` bloodline spell unlocked at sorcerer level
   * `2L+1`); these do not count against the spells-known cap. Empty for non-sorcerer
   * slices. 39 bloodlines in the current vendored slice.
   */
  bloodlineSpellLists: Record<string, SpellList>;
  /** Mundane base armor/shields (the `armors-and-shields` pack, magic excluded). */
  armors: Record<string, ArmorRef>;
  /** Mundane base weapons (the `weapons-and-ammo` pack, magic + ammo excluded). */
  weapons: Record<string, WeaponRef>;
  /** Archetypes for the sliced classes (third-party dataset; see Archetype). */
  archetypes: Record<string, Archetype>;
  /** Archetype class features; each points back to its parent via `archetypeId`. */
  archetypeFeatures: Record<string, ArchetypeFeature>;
  /** Top-level cleric domains (see `Domain` doc comment; subdomains are `subdomains` below). */
  domains: Record<string, Domain>;
  /** Cleric subdomains, each swapping in place of a parent `Domain` — see `Subdomain` doc comment. */
  subdomains: Record<string, Subdomain>;
  /**
   * Per-subdomain spell lists, keyed by subdomain tag (e.g. "Cloud") → spell
   * level → spell ids. Derived at build time (not inverted from any
   * `Spell.learnedAt` field the way `domainSpellLists` is — the vendored
   * spell pack never tags individual spells by subdomain) by merging the
   * subdomain's own replacement/override list (parsed from its description
   * prose) onto its parent domain's `domainSpellLists[parentDomainTags[0]]`
   * entry for any level it doesn't override. Empty for subdomains with no
   * vendored spell-list section (rare — see `Subdomain` doc comment).
   */
  subdomainSpellLists: Record<string, SpellList>;
  /**
   * Druid nature-bond domains (`class-abilities/domains/druid-domains/**`,
   * animal-companion-alternative and terrain domains) — see `DruidDomain` doc
   * comment. Selected via `build.druidNatureBondDomain`.
   */
  druidDomains: Record<string, DruidDomain>;
  /**
   * Per-druid-domain spell lists, keyed by `DruidDomain.tag` (e.g. "Wolf",
   * "Jungle") → spell level → spell ids. Like `subdomainSpellLists`, this is
   * parsed at build time from each domain's own description prose (the source
   * `@UUID`-links every domain spell but tags NO spell by druid domain via
   * `Spell.learnedAt`, so — unlike `domainSpellLists` — there is nothing to
   * invert). A druid who takes a nature-bond domain gains one domain spell
   * slot per accessible druid spell level, drawable from the matching list
   * here (PF1 nature bond grants domain spell slots "just like a cleric").
   * Empty for a domain whose prose lists no resolvable spell. Note two tags
   * (Vermin, Ruins) collide with a cleric domain/subdomain of the same name —
   * the druid list here is the correct source for a druid.
   */
  druidDomainSpellLists: Record<string, SpellList>;
  /**
   * Per-elemental-school bonus-slot spell lists, keyed by `ElementalSchoolTag`
   * — resolved by NAME from each elemental school's own description prose (the
   * source lists them as free text, not `@UUID` links; see
   * `parseElementalSpellEntries` in `data-pipeline`). An elemental specialist's
   * bonus school slot draws from this list rather than from `Spell.school`,
   * and their single opposition element's list drives the double-slot cost.
   * A handful of listed names don't resolve (upstream typos, spells outside
   * the vendored slice) and are simply absent.
   */
  elementalSchoolSpellLists: Record<string, SpellList>;
  /**
   * Wizard arcane schools: the nine standard/Universalist schools (top-level
   * `wizard-schools/*.yaml`) plus the elemental schools (`wizard-schools/
   * elemental-schools/*.yaml`) in the same collection, distinguished only by
   * `tag`'s type (`WizardSchoolTag` vs `ElementalSchoolTag`) — both are
   * selected and granted identically via `build.wizardSchool` /
   * `collectGrantedFeatures`.
   */
  wizardSchools: Record<string, WizardSchool>;
  /**
   * Alternate racial traits from the pinned `pf1-content` module's
   * `pf-racial-traits` pack (issue #74 fill plan phase 1), covering all 80
   * vendored races. Distinct from the 7-core-races-plus-Sylph hand-authored
   * `RACIAL_TRAITS` table in `@pf1/engine` `racial-traits.ts`, which remains
   * authoritative (mechanically-enforced replacement) for those races — see
   * that module's doc comment and `RacialTrait.replacedTraitNames` below for
   * how the two catalogs relate.
   */
  racialTraits: Record<string, RacialTrait>;
  /** The full published barbarian rage-power catalog (fourth-source dataset; see `RagePower` doc comment). */
  ragePowers: Record<string, RagePower>;
  /** The full published witch hex catalog (fourth-source dataset, issue #74 Phase 3b; see `WitchHex` doc comment). */
  hexes: Record<string, WitchHex>;
  /** The full published GENERAL shaman hex catalog (fourth-source dataset, issue #74 Phase 3b; see `ShamanHex` doc comment) — spirit-specific hexes stay hand-authored only, see that type's doc comment. */
  shamanHexes: Record<string, ShamanHex>;
  /** The full published magus arcana catalog (fourth-source dataset, issue #74 Phase 3b; see `MagusArcana` doc comment). */
  magusArcana: Record<string, MagusArcana>;
  /** The full published rogue talent catalog, SHARED by chained rogue/Rogue (Unchained)/slayer's "Rogue Talent" option — see `RogueTalent` doc comment. */
  rogueTalents: Record<string, RogueTalent>;
  /** The full published ninja trick catalog (tricks + master tricks) — see `NinjaTrick` doc comment. */
  ninjaTricks: Record<string, NinjaTrick>;
  /** The full published slayer talent catalog (talents + advanced talents) — see `SlayerTalent` doc comment. No hand-authored overlay exists yet (`@pf1/engine` has no `slayer-talents.ts`); every entry is display-only. */
  slayerTalents: Record<string, SlayerTalent>;
  /** The full published vigilante talent catalog (Avenger/Stalker/shared) — see `VigilanteTalent` doc comment. */
  vigilanteTalents: Record<string, VigilanteTalent>;
  /** The full published vigilante SOCIAL talent catalog — a separate pool from `vigilanteTalents`, see `VigilanteSocialTalent` doc comment. */
  vigilanteSocialTalents: Record<string, VigilanteSocialTalent>;
  /** The full published arcanist exploit catalog, base + greater tiers (fourth-source dataset; see `ArcanistExploit` doc comment). */
  arcanistExploits: Record<string, ArcanistExploit>;
  /** The full published investigator talent catalog (fourth-source dataset; see `InvestigatorTalent` doc comment). */
  investigatorTalents: Record<string, InvestigatorTalent>;
  /** The full published kineticist wild-talent catalog, every kind (fourth-source dataset; see `KineticWildTalent` doc comment). */
  kineticWildTalents: Record<string, KineticWildTalent>;
  /** The full published mesmerist trick catalog, tricks + masterful tricks (fourth-source dataset, issue #74 Phase 3c; see `MesmeristTrick` doc comment). */
  mesmeristTricks: Record<string, MesmeristTrick>;
  /** The full published mesmerist bold-stare catalog (fourth-source dataset, issue #74 Phase 3c; see `MesmeristBoldStare` doc comment). */
  mesmeristBoldStares: Record<string, MesmeristBoldStare>;
  /** The full published psychic phrenic-amplification catalog, basic + major (fourth-source dataset, issue #74 Phase 3c; see `PhrenicAmplification` doc comment). */
  phrenicAmplifications: Record<string, PhrenicAmplification>;
  /** The full published psychic discipline catalog (fourth-source dataset, issue #74 Phase 3c; see `PsychicDiscipline` doc comment). */
  psychicDisciplines: Record<string, PsychicDiscipline>;
  /** The full published occultist implement-school catalog (fourth-source dataset, issue #74 Phase 3c; see `OccultistImplement` doc comment). */
  occultistImplements: Record<string, OccultistImplement>;
  /** The full published medium legendary-spirit catalog (fourth-source dataset, issue #74 Phase 3c; see `MediumSpirit` doc comment). */
  mediumSpirits: Record<string, MediumSpirit>;
  /** The full published oracle mystery catalog (fourth-source dataset, issue #74 Phase 3c; see `OracleMystery` doc comment). */
  oracleMysteries: Record<string, OracleMystery>;
  /** The full published oracle's curse catalog (fourth-source dataset, issue #74 Phase 3c; see `OracleCurse` doc comment). */
  oracleCurses: Record<string, OracleCurse>;
  /** The full published witch patron catalog (fourth-source dataset, issue #74 Phase 3c; see `WitchPatron` doc comment). */
  witchPatrons: Record<string, WitchPatron>;
  /** The full published shaman spirit catalog (fourth-source dataset, issue #74 Phase 3c; see `ShamanSpirit` doc comment). */
  shamanSpirits: Record<string, ShamanSpirit>;
  /** The full published sorcerer bloodline catalog (fourth-source dataset, issue #74 Phase 3c; see `SorcererBloodline` doc comment). */
  sorcererBloodlines: Record<string, SorcererBloodline>;
  /** The full published bloodrager bloodline catalog (fourth-source dataset, issue #74 Phase 3c; see `BloodragerBloodline` doc comment). */
  bloodragerBloodlines: Record<string, BloodragerBloodline>;
  /** The full published alchemist discovery catalog (fourth-source dataset, issue #74 Phase 3c; see `AlchemistDiscovery` doc comment). */
  alchemistDiscoveries: Record<string, AlchemistDiscovery>;
  /** The full published Monk (Unchained) ki-power catalog (fourth-source dataset, issue #74 Phase 3c; see `MonkKiPower` doc comment). */
  monkKiPowers: Record<string, MonkKiPower>;
  /** The full published Monk (Unchained) style-strike catalog (fourth-source dataset, issue #74 Phase 3c; see `MonkStyleStrike` doc comment). */
  monkStyleStrikes: Record<string, MonkStyleStrike>;
  /** The full published cavalier/samurai order catalog, far beyond the 8 hand-authored orders (fourth-source dataset, issue #74 Phase 3c; see `CavalierOrder` doc comment). */
  cavalierOrders: Record<string, CavalierOrder>;
  /** The full published shifter aspect catalog (fourth-source dataset, issue #74 Phase 3c; see `ShifterAspect` doc comment). */
  shifterAspects: Record<string, ShifterAspect>;
}

/** Provenance + integrity metadata for a generated dataset. */
export interface RefDataMeta {
  /** Bumped when the *shape* of RefData changes. */
  schemaVersion: number;
  /** Identifies this dataset build; derived from the source commit. */
  dataVersion: string;
  sourceRepo: string;
  /** Exact upstream git SHA the data was generated from. */
  sourceSha: string;
  /** Foundry PF1 *system* version (e.g. "11.11"). */
  systemVersion: string;
  /** Foundry *content* core version (e.g. "13.351"). */
  contentVersion: string;
  generatedAt: string;
  counts: Record<string, number>;
  /** sha256 of each emitted data file, for content-addressable diffing. */
  hashes: Record<string, string>;
}

/** A spell level (0–9) mapped to the spell ids available at that level. */
export type SpellList = Record<number, string[]>;

/* ------------------------------------------------------------------ races -- */

export interface Race extends RefEntity {
  size: SizeId;
  /** Movement speeds in feet, keyed by mode ("land", "fly", "swim", ...). */
  speeds: Record<string, number>;
  languages: string[];
  creatureTypes: string[];
  creatureSubtypes: string[];
  /**
   * Typed modifiers granted by the race — including ability adjustments
   * (target = an AbilityId), bonus skill ranks, bonus feats, etc.
   */
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Skills that are always class skills for this race, regardless of class
   * (e.g. Adaro always treat Swim as a class skill). Present on a minority of
   * non-core races; omitted (rather than an empty array) when the source has
   * no such grant.
   */
  classSkills?: SkillId[];
}

/**
 * An alternate racial trait vendored from `pf1-content`'s `pf-racial-traits`
 * pack (1,872 entries, ~900 of which are alternates or heritage variants —
 * see data-pipeline `transformRacialTrait`'s doc comment for how those are
 * told apart from the pack's standard-trait entries, which are dropped
 * before emission since `Race.changes`/`contextNotes` already carry them).
 *
 * Honesty posture (mirrors the hybrid feat-prereq model): `changes` apply
 * exactly like any other change source when present, but nothing here
 * SUPPRESSES a race's standard `Change`s the way the hand-authored
 * `@pf1/engine` `RACIAL_TRAITS` table does for its 8 races — this pack gives
 * only the replaced trait's NAME (`replacedTraitNames`), not a verified
 * mapping to the specific `Race.changes`/`contextNotes` entries it swaps
 * out, so mechanically suppressing them would risk silently dropping the
 * wrong thing (or the right thing for the wrong reason) on an unaudited
 * entry. The player is expected to manually retire the replaced standard
 * trait; the UI surfaces `replacedTraitNames` as a reminder, never a block.
 */
export interface RacialTrait extends RefEntity {
  /**
   * Race/heritage tag(s) this entry is filed under (`system.tags` verbatim) —
   * usually one race name matching `Race.name` (e.g. "Goblin"), but a
   * heritage-specific entry carries both its base race and heritage tags
   * (e.g. `["Aasimar", "Plumekith"]`). Match against `Race.name` to scope a
   * picker to the character's current race.
   */
  race: string[];
  /**
   * The heritage this entry belongs to, when it is a heritage variant rather
   * than a free-standing alternate — the second `system.tags` entry (e.g.
   * `"Plumekith"` on `race: ["Aasimar", "Plumekith"]`). A heritage variant is
   * only correct for a character of that heritage, which the doc doesn't
   * model, so this is a display/grouping label the picker shows rather than a
   * gate. Absent on ordinary alternates.
   */
  heritage?: string;
  /**
   * The pack's own grouping tag: "featSkills" | "defense" | "offense" |
   * "senses" | "magical" | "movement" | "other" | "weakness". Absent on a
   * minority of entries.
   */
  traitCategory?: string;
  changes: Change[];
  /**
   * Changes the source ships with no `target` on purpose: the trait says
   * "choose one" and the Foundry sheet expects the player to fill the target
   * in by hand (Kindred-Raised's second +2 ability, Artistic's Perform
   * skill). They are kept out of `changes` — which is only ever
   * apply-as-written — so nothing can apply them untargeted; the engine
   * applies one only once the player names a target in
   * `build.vendoredRacialTraitTargets`. Absent when the entry has none.
   */
  openChanges?: Change[];
  contextNotes: ContextNote[];
  /**
   * Standard trait name(s) this entry replaces, parsed from the source
   * description's structured "Replaced Trait(s)" header — see this
   * interface's doc comment. Empty only for a heritage variant (see
   * `heritage`), which the source files under its heritage tag instead of
   * naming what it swaps out.
   */
  replacedTraitNames: string[];
  /** The published point cost in the Race Builder point-buy system, when tagged. */
  racePoints?: number;
  /**
   * Limited-use resource, mirroring `Feat.uses` (e.g. a 1/day spell-like
   * ability). Becomes a tracker resource pool — see
   * `deriveVendoredRacialTraitResourcePools` in `@pf1/engine`.
   */
  uses?: { maxFormula?: string; per?: string };
}

/* ----------------------------------------------------------------- classes -- */

export interface Class extends RefEntity {
  /** Stable slug, e.g. "barbarian". */
  tag: string;
  /** "base" | "prestige" | "npc" | ... */
  subType: string;
  /** Hit die size, e.g. 12 for d12. */
  hd: number;
  bab: BabTier;
  saves: { fort: SaveTier; ref: SaveTier; will: SaveTier };
  skillsPerLevel: number;
  classSkills: SkillId[];
  armorProf: string[];
  weaponProf: string[];
  /** Class features granted by level, resolved from `links.supplements`. */
  features: ClassFeatureGrant[];
  /**
   * Casting-advancement slots for prestige classes ("+1 level of existing
   * spellcasting class"). Absent for classes that don't advance casting.
   * Each slot advances ONE existing casting class the character already has
   * (of the matching `kind`) by one effective level at the listed prestige
   * levels — spells per day / spells known / caster level ONLY, never that
   * target class's other features (bonus feats, domains, etc). A class with
   * two slots (e.g. Mystic Theurge) can advance two different casting
   * classes independently, one per slot.
   */
  castingAdvancement?: {
    /** Which kind of existing casting class a slot may target. */
    kind: "arcane" | "divine" | "any";
    /** The prestige-class levels (1-based) at which this slot advances its target. */
    levels: number[];
  }[];
  /**
   * Structured entry requirements (prestige classes; issue #66 chunk 4).
   * Hybrid prereq model (DESIGN.md §4, mirrors `FeatPrerequisites`): the
   * builder hard-blocks only on these structured signals; `prereqText` (the
   * verbatim published requirements line) is shown as a soft advisory for
   * everything not structurally captured (alignment, race, sneak-attack-die
   * minimums, parametrized/OR feats like "Weapon Focus (longbow or
   * shortbow)", parametrized skills like "Perform (oratory)", etc).
   */
  prereqs?: {
    bab?: number;
    /** Feat NAMES as published (matched by name-slug like feat prereqs). */
    feats?: string[];
    skillRanks?: { skill: SkillId; ranks: number }[];
    /**
     * "Able to cast Nth-level (arcane|divine|any) spells" — one entry per
     * requirement (Mystic Theurge has two: 2nd-level arcane AND divine).
     */
    casting?: { kind: "arcane" | "divine" | "any"; spellLevel: number }[];
    /** Verbatim published requirements line (plain text), always present for display. */
    prereqText: string;
  };
}

/** A class feature granted at a specific level (resolved UUID link). */
export interface ClassFeatureGrant {
  level: number;
  /** UUID of the granted class feature. */
  uuid: string;
  /** Resolved class-feature id (key into `RefData.classFeatures`). */
  featureId: string;
  name: string;
  /** False if the UUID could not be resolved within the generated slice. */
  resolved: boolean;
}

/**
 * A top-level cleric domain (`class-abilities/domains/*.yaml`, one directory
 * level deep — excludes subdomains and druid-specific domains, each vendored
 * separately as `Subdomain` / `DruidDomain`, see their doc comments).
 */
export interface Domain extends RefEntity {
  /** Matches `Spell.learnedAt.domain` / `RefData.domainSpellLists` keys (e.g. "Fire"). */
  tag: string;
  /** Granted powers by level, resolved from `links.supplements` (same shape as `Class.features`). */
  features: ClassFeatureGrant[];
  /**
   * A numeric bonus carried directly on the domain doc itself, rather than
   * proxied through a `links.supplements`-linked `ClassFeature.changes` the
   * way `features` above works. Present for the handful of domains whose
   * source doc has one (Protection's +1-per-5-levels save resistance, Travel's
   * +10 land speed, and the Darkness/Rune `bonusFeats` grants — the latter two
   * are fixed bonus feats named only in prose, granted via the web layer, see
   * `apps/web/src/model/feats.ts`). `@class.unlevel` in a formula resolves to
   * the cleric's level. Same shape as `Subdomain.changes`. Empty for the rest.
   */
  changes: Change[];
}

/**
 * A cleric subdomain (`class-abilities/domains/subdomains/*.yaml`) — a domain
 * variant a cleric may pick in place of one of its parent domain(s)
 * (`parentDomainTags`), entirely replacing that domain choice. Its parent
 * association and replacement spell list are parsed from the parent domain's
 * own description prose (a "Subdomains: ..." list) and the subdomain's own
 * "(Replacement) Domain Spells" list — neither is a structured link in the
 * source, so this is best-effort text parsing, not a `links.supplements`
 * resolution (see data-pipeline `transform/subdomains.ts`).
 */
export interface Subdomain extends RefEntity {
  /** Matches `RefData.subdomainSpellLists` keys (e.g. "Cloud"). Not a `Spell.learnedAt` key — see `subdomainSpellLists` doc comment. */
  tag: string;
  /**
   * `Domain.tag`(s) this subdomain can replace. Almost always one entry; a
   * handful (e.g. Alchemy: Artifice or Magic) attach to two parent domains —
   * `subdomainSpellLists` merges against `parentDomainTags[0]` only in that
   * case (a documented simplification, not derived per chosen parent).
   */
  parentDomainTags: string[];
  /**
   * Structured granted-power override, resolved from `links.supplements`
   * exactly like `Domain.features` — present for only ~11 of 137 subdomains
   * whose source doc models a full override (e.g. Cloud replaces Air's
   * 8th-level power with Thundercloud alongside Air's unchanged 1st power).
   * Empty for the rest: the source only documents a spell-list replacement
   * for those, so treat this subdomain's granted powers as identical to its
   * parent's — use `RefData.domains[parentDomainTags[0]].features` when this
   * array is empty, not an empty grant list.
   */
  features: ClassFeatureGrant[];
  /**
   * A numeric bonus carried directly on the subdomain doc itself (e.g.
   * Purity's +1-per-5-levels resistance bonus to all saves), rather than
   * proxied through a `links.supplements`-linked `ClassFeature.changes` the
   * way `features` above works. Vendored for the ~4 subdomains that have one
   * (Purity, Defense, Fortification, Solitude — the source's richest
   * `system.changes` slice in the ecosystem). Applied by `collectModifiers`
   * for a cleric's chosen subdomains, gated on cleric level, exactly like the
   * same-shaped top-level `Domain.changes`. Empty for the rest.
   */
  changes: Change[];
}

/**
 * A druid nature-bond domain (`class-abilities/domains/druid-domains/**`) —
 * an alternate to an animal companion; PF1 grants powers scaling off druid
 * level instead of a cleric's channel-energy-adjacent kit. `kind` mirrors the
 * source's own split: `"animal"` domains (Wolf, Eagle, ...) key off an animal
 * totem, `"terrain"` domains (Desert, Jungle, ...) off a landscape. `features`
 * is always `[]` — the source models every druid domain power as free-text
 * prose under its own description, never a `links.supplements`-linked
 * `class-abilities` entry, so there is nothing structured to resolve for the
 * granted *powers*. Its domain *spells*, by contrast, ARE `@UUID`-linked in
 * that prose and parsed into `RefData.druidDomainSpellLists` (see there).
 */
export interface DruidDomain extends RefEntity {
  tag: string;
  kind: "animal" | "terrain";
  features: ClassFeatureGrant[];
}

/**
 * A wizard arcane school — the nine standard/Universalist schools
 * (`class-abilities/wizard-schools/*.yaml`) or one of the eight elemental
 * schools (`wizard-schools/elemental-schools/*.yaml`; the elemental/focused
 * variant-rule subfolder within THAT folder is excluded — too niche a
 * combination to vendor). Elemental entries carry `features` resolved from
 * `links.supplements` exactly like the standard schools, but their two other
 * mechanics come from prose rather than structure: the bonus-slot spell list
 * is free-text names (parsed into `RefData.elementalSchoolSpellLists`, since
 * `spell.school` never matches an elemental tag) and the opposition is a
 * single element rather than two standard schools (see `oppositionOptions`).
 */
export interface WizardSchool extends RefEntity {
  tag: WizardSchoolTag | ElementalSchoolTag;
  /** Granted powers by level, resolved from `links.supplements`. */
  features: ClassFeatureGrant[];
  /**
   * Elemental schools only: the elements this school may oppose, parsed from
   * its "Opposing element / school" prose. An elemental specialist opposes
   * exactly ONE element and takes no second opposition school. Most schools
   * list a single fixed opposite (Air opposes Earth); a few offer a choice
   * (Earth opposes Air or Wood; Void and Aether pick any of air/earth/fire/
   * water). Absent for the standard schools, which use
   * `build.wizardOppositionSchools` instead.
   */
  oppositionOptions?: ElementalSchoolTag[];
}

/** An entry from the `class-abilities` pack (e.g. Rage, Bravery). */
export interface ClassFeature extends RefEntity {
  tag?: string;
  /** "classFeat" | "talent" | ... */
  subType?: string;
  /** "ex" | "su" | "sp" — supernatural/extraordinary/spell-like. */
  abilityType?: string;
  /**
   * Limited-use resource pool, e.g. Rage rounds/day. `source`, when present
   * INSTEAD of `maxFormula` (e.g. Channel Positive Energy's `source:
   * "layOnHands"`, Wholeness of Body's `source: "kiPool"`), means this
   * feature has no independent daily cap of its own — using it spends uses
   * from another granted feature's pool (matched by that feature's `tag`).
   * Not resolved into a numeric max here (that would double-count the shared
   * pool); the engine surfaces such a feature's `actions` as an addendum on
   * the referenced pool's detail line instead (see `deriveResourcePools`).
   */
  uses?: { maxFormula?: string; per?: string; source?: string };
  changes: Change[];
  /** UUIDs of buffs this feature can activate (from `links.supplements`). */
  grantsBuffs: string[];
  /**
   * Structured attack/damage/save/heal actions from the feature's
   * `system.actions` block (e.g. Acid Dart's ranged touch acid damage,
   * Stunning Fist's Fortitude DC). Present on a minority of the sliced
   * features (~39 of 254 as of schema v8) — most class features (Rage,
   * Bravery, ...) carry no action data upstream, and `undefined`/absent here
   * means exactly that, not a missing extraction. When multiple actions
   * exist (e.g. Channel Energy's heal-living/harm-undead/heal-undead/
   * harm-living quartet), they're kept in source order; only the first
   * damage part of each action is captured (the vendored slice never needs
   * more than one). Used by the engine to derive a resource-pool `detail`
   * summary (see `deriveResourcePools` in `@pf1/engine`).
   */
  actions?: FeatureAction[];
}

/**
 * One action entry off a class feature's `system.actions` block — lean by
 * design (just enough to render an in-play summary line, not a full replica
 * of Foundry's action schema; contrast `SpellAction`, which keeps more shape
 * for the builder's spell detail view).
 */
export interface FeatureAction {
  /** The action's own label, e.g. "Use", "Heal living" — rarely shown verbatim. */
  name?: string;
  /** Foundry action-type code, e.g. "rsak" (ranged spell attack), "heal", "save". */
  actionType?: string;
  /** First damage part's formula + damage types (e.g. `["acid"]`, `["positive"]`). */
  damage?: { formula: string; types: string[] };
  /** Saving throw, when the action calls for one. */
  save?: { type: string; dcFormula?: string };
  /** Activation type, e.g. "standard", "swift", "nonaction". */
  activation?: string;
  /** Whether this is a touch attack (ranged or melee). */
  touch?: boolean;
  /** Display-only range string, e.g. "30 ft", "touch" — not parsed further. */
  range?: string;
}

/* ------------------------------------------------------------------- feats -- */

export interface Feat extends RefEntity {
  /** "feat" | "classFeat" | ... */
  subType?: string;
  /** Free-form tags, e.g. ["Combat", "Combat Trick"]. */
  tags: string[];
  prerequisites: FeatPrerequisites;
  /**
   * Limited-use resource, mirroring `ClassFeature.uses` (see its doc
   * comment) — e.g. Combat Reflexes' `1 + max(0, @abilities.dex.mod)`
   * AoOs/round, Alignment Channel's `3 + @abilities.cha.mod` uses/day.
   * 12 feats in the current vendored slice carry this (schema v9). No
   * `source` field here (unlike `ClassFeature.uses`) — no vendored feat
   * currently draws from another feature's pool the way Channel Positive
   * Energy draws from Lay on Hands.
   */
  uses?: { maxFormula?: string; per?: string };
  /**
   * Directly-authored typed modifiers (homebrew only — see
   * `apps/web/src/model/homebrew.ts`). Every VENDORED feat's mechanical
   * effect instead comes from the hand-curated `FEAT_EFFECTS`/
   * `FEAT_EFFECTS_EXTRACTED` tables in `@pf1/engine` keyed by name-slug
   * (clean-room discipline: Foundry's own per-feat script logic is never
   * ported), so the data pipeline never emits this field. A homebrew feat
   * has no name-slug table entry to resolve, so it needs its effect encoded
   * directly on the entity, the same way `Race.changes`/`Item.changes`
   * already work. `collectModifiers` applies these unconditionally
   * alongside (never instead of) any table-resolved effect.
   */
  changes?: Change[];
}

/* ------------------------------------------------------------------ traits -- */

/**
 * A PF1 character trait, vendored from the pf1-content community module's
 * `pf-traits` pack (issue #74 Phase 1) — same per-entity YAML shape as
 * `Feat`, normalized by the same `readPack`/transform machinery. This is the
 * FULL published catalog (~2,000 entries); it exists alongside, not instead
 * of, the engine's 28-entry hand-authored `TRAITS` table (issue #23) — see
 * `@pf1/engine` `traits.ts`'s `mergedTraits`/`resolveTraitDef` for how the two
 * are reconciled (hand-authored wins on a name collision; every other
 * vendored entry is pickable under its own Foundry id).
 */
export interface Trait extends RefEntity {
  /** Foundry's raw category tag, e.g. "combat", "drawback", "region". Title-Case it for display (see `TraitCategory`'s doc comment). */
  traitType: string;
  tags: string[];
  /** Typed modifiers — empty for purely situational/prose traits. */
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Limited-use resource, same shape as `Feat.uses` — e.g. a once-per-day
   * faction trait like "A Sure Thing". ~290 of the vendored 1,998 carry this.
   */
  uses?: { maxFormula?: string; per?: string };
}

/**
 * Feat prerequisites are FREE TEXT in the source. We parse what we reliably can
 * into structured form and retain everything as `prereqText` for the unparsed
 * remainder / soft validation. Do not assume completeness.
 */
export interface FeatPrerequisites {
  /** Ability minimums, e.g. { ability: "str", min: 13 }. */
  abilities: { ability: AbilityId; min: number }[];
  /** Minimum base attack bonus, e.g. 1 for "base attack bonus +1". */
  bab?: number;
  /** Minimum caster level, e.g. 7 for "caster level 7th". */
  casterLevel?: number;
  /** Required feats, extracted from embedded `@UUID[...]{Name}` references. */
  feats: FeatRef[];
  /** Skill-rank requirements parsed from prose (best-effort). */
  skills: { skill: SkillId | null; ranks: number; raw: string }[];
  /** The full prerequisite text, verbatim (HTML stripped). */
  prereqText?: string;
}

export interface FeatRef {
  id: string;
  name: string;
  uuid: string;
}

/* ------------------------------------------------------------------ spells -- */

export interface Spell extends RefEntity {
  /** Default/nominal spell level; per-class levels live in `learnedAt`. */
  level: number;
  /** School abbreviation, e.g. "evo". */
  school?: string;
  descriptors: string[];
  /** Whether spell resistance applies to this spell. */
  sr?: boolean;
  components: {
    verbal?: boolean;
    somatic?: boolean;
    material?: boolean;
    focus?: boolean;
    divineFocus?: boolean;
  };
  /**
   * Per-context spell level. `class` maps a class tag → the level at which that
   * class learns the spell; inverting this yields per-class spell lists.
   */
  learnedAt: {
    class: Record<string, number>;
    domain?: Record<string, number>;
    bloodline?: Record<string, number>;
    subdomain?: Record<string, number>;
  };
  actions: SpellAction[];
  /**
   * `@cl`-keyed formula for the number of projectiles a multi-projectile spell
   * fires (Magic Missile's missiles, Scorching Ray's rays) — the count scales
   * with caster level in the spell's prose, not in `damage.parts[].formula`, so
   * it can't be derived from vendored data. Hand-authored by name in
   * `data-pipeline`'s `SPELL_PROJECTILE_COUNTS` supplement and applied in
   * `normalize.ts`; absent for the ~all spells whose effect count is fixed.
   */
  projectileCount?: string;
}

export interface SpellAction {
  id: string;
  name?: string;
  actionType?: string;
  save?: { type?: string; description?: string };
  range?: { units?: string; value?: string };
  area?: string;
  duration?: { units?: string; value?: string };
  damage?: { parts: { formula: string; types: string[] }[] };
  /**
   * Casting time — Foundry action-economy code (e.g. "standard", "swift",
   * "round", "minute", "hour", "full", "immediate", "free") plus an optional
   * multiplier for the unit types that support one ("round" -> "3 rounds",
   * "minute" -> "10 minutes"). `cost` absent means 1. See
   * `apps/web/src/model/spellStats.ts`'s `formatCastingTime` for the
   * player-facing formatter.
   */
  activation?: { type?: string; cost?: number };
}

/* ------------------------------------------------------------------- buffs -- */

export interface Buff extends RefEntity {
  /** "spell" | "temp" | "perm" | "item" | ... */
  subType?: string;
  changes: Change[];
  contextNotes: ContextNote[];
  duration?: { end?: string; units?: string; value?: string };
  level?: number;
}

/* ------------------------------------------------------------------- items -- */

export interface Item extends RefEntity {
  /** "wondrous" | "magic" | "weapon" | ... */
  subType?: string;
  /** Equipment slot, e.g. "ring", "head". */
  slot?: string;
  price?: number;
  /** Total weight in pounds, where tracked (captured for #16 encumbrance). */
  weight?: number;
  /** Caster level of the item, where applicable. */
  cl?: number;
  changes: Change[];
  contextNotes: ContextNote[];
  /**
   * Limited-use resource, e.g. a staff's charges or a poison's single use.
   * Foundry also tracks a live `value` (current charges), but that's
   * per-instance session state, not reference data — the character-side
   * `ItemInstance` is where a concrete item's current charges would live.
   */
  uses?: { maxFormula?: string; per?: string };
  aura?: { school?: string };
  /**
   * What's inside a container item — the class kits ("Kit, Wizard's") and a
   * handful of pre-packed bundles (Mess Kit, Grooming Kit). Absent for the
   * ~97% of items that aren't containers.
   *
   * Contents are a flat, one-level list: a kit that packs another container
   * keeps that container as a single entry and does *not* recurse into it (a
   * Wizard's Kit yields one "Mess Kit" row, not six pieces of cutlery). The
   * doc-side `build.gear` is a flat `ItemInstance[]` with no nesting to
   * represent the tree anyway, and a player thinks of a mess kit as one thing
   * they're carrying.
   */
  contents?: ItemContent[];
}

/**
 * One entry in a container item's `contents`. Quantities and prices are the
 * container's own snapshot of the entry (a Wizard's Kit packs 10 torches at
 * its own listed price), which is why they're captured here rather than being
 * read back off the referenced item.
 */
export interface ItemContent {
  /** Display name, always present (the fallback when `itemId` is absent). */
  name: string;
  /**
   * Reference into `RefData.items`. Absent when the entry resolves to a
   * different pack — the Vampire Slayer's Kit's Wooden Stake is a weapon, and
   * `RefData.items` can't represent it — in which case `weight`/`price` below
   * carry the snapshot instead and consumers treat it as mundane gear.
   */
  itemId?: string;
  /** How many the container packs. Absent means 1. */
  quantity?: number;
  /**
   * Unit weight in pounds / unit price in gp, snapshotted from the container's
   * own copy of the entry. Only emitted when `itemId` is absent: a linked entry
   * has no need of them, since `ItemInstance` already falls back to
   * `RefData.items[itemId]` for both.
   */
  weight?: number;
  price?: number;
}

/* -------------------------------------------------------- armor & shields -- */

/**
 * A mundane base armor or shield from the `armors-and-shields` pack. Magic gear
 * (Frost Brand etc.) is excluded; the enhancement bonus is handled separately
 * as a user-set field on the character's weapon, and named magical armors live
 * in `RefData.items` already (when they carry `changes`). The engine reads
 * physical stats off the doc's `WornArmor`; the schema `armorId` on
 * `ItemInstance` is purely a display + re-sync pointer back to this entry.
 */
export interface ArmorRef extends RefEntity {
  /** "armor" (body slot) | "shield" (off-hand). */
  slot: "armor" | "shield";
  /** Base armor/shield AC bonus (e.g. 9 for Full Plate, 1 for a Buckler). */
  ac: number;
  /** Maximum Dexterity bonus the armor permits (omit for no cap). */
  maxDex?: number;
  /** Armor check penalty ∗as a positive magnitude∗ (e.g. 6 for Full Plate). */
  acp?: number;
  /**
   * Armor weight class for `@armor.type` formulas: 1 light, 2 medium, 3 heavy.
   * Omitted / 0 for shields (identified via `slot`; engine derives `armor.type`
   * from body armor only).
   */
  weightClass?: 0 | 1 | 2 | 3;
  /** Canonical base type label(s), e.g. ["Full Plate"]. */
  baseTypes?: string[];
  /** Foundry proficiency tag, e.g. "heavyArmor" / "lightShield" / "towerShield". */
  proficiency?: string;
  price?: number;
  /** Total weight in pounds. */
  weight?: number;
  /**
   * Arcane spell failure chance, as a percentage magnitude (e.g. 35 for Full
   * Plate, 5 for a Buckler) — Foundry's `system.spellFailure` field. Shields
   * carry this too (a shield's ASF stacks with worn body armor's). Omitted
   * means 0% (issue #8).
   */
  asf?: number;
}

/* ---------------------------------------------------------------- weapons -- */

/**
 * A mundane base weapon from the `weapons-and-ammo` pack (simple / martial /
 * exotic). Magic + ammo + siege subtypes are excluded; named magical weapons
 * (Frost Brand) live in `RefData.items` already (when they carry `changes`).
 * The engine computes per-weapon attack and damage from the doc's
 * `WeaponInstance`; the schema `weaponId` is purely a display + re-sync pointer
 * back to this entry.
 */
export interface WeaponRef extends RefEntity {
  /** Damage dice for display, e.g. "1d8" (parsed from `sizeRoll(N,F,…)` / `NdM`). */
  damageDice?: string;
  /** Lower bound of the critical threat range (default 20). */
  critRange?: number;
  /** Critical hit multiplier (default 2). */
  critMult?: number;
  /**
   * Per-weapon type slug the engine routes Weapon Focus / Specialization
   * bonuses through (e.g. "longsword"); derived from `baseTypes[0]`.
   */
  group?: string;
  /** Melee or ranged; which attack modifier target applies. */
  category: "melee" | "ranged";
  /** Ability used for the attack roll: "str" (mwak) or "dex" (rwak). */
  attackAbility: "str" | "dex";
  /** Ability added to damage: "str" when the source declares it, else "none". */
  damageAbility?: "str" | "none";
  /**
   * Multiplier applied to the damage ability modifier (1 one-handed / ranged,
   * 1.5 two-handed, 0.5 off-hand).
   */
  damageMultiplier?: number;
  /** Foundry proficiency tag: "simple" | "martial" | "exotic". */
  proficiency: string;
  /** Foundry weapon-group tags, e.g. ["bladesHeavy"] (for Weapon Training). */
  weaponGroups?: string[];
  /** Foundry weapon subtype: "1h" | "2h" | "ranged" (drives damageMultiplier). */
  weaponSubtype?: string;
  /** Canonical base type label(s), e.g. ["Longsword"]. */
  baseTypes?: string[];
  price?: number;
  /** Total weight in pounds. */
  weight?: number;
}

/* -------------------------------------------------------------- archetypes -- */

/**
 * A PF1 class archetype (e.g. "Two-Handed Fighter"). Unlike the rest of RefData,
 * archetypes are NOT sourced from the Foundry pf1 system — it ships no archetype
 * data at all (confirmed: no `subType: archetype`, no parent-class field,
 * anywhere in the pinned packs). Sourced instead from a third-party CSV dataset
 * (see `ARCHETYPE_REPO`/`ARCHETYPE_SHA` in data-pipeline config); `id`/`uuid`
 * are therefore synthetic slugs, not real Foundry identifiers.
 */
export interface Archetype extends RefEntity {
  /** The base class this archetype modifies, e.g. "fighter". */
  classTag: string;
  /** Attribution for the source dataset (module name; content is OGL/Paizo CUP via AON). */
  contributorModule: string;
}

/**
 * A single archetype class feature — something an archetype adds, or that
 * replaces a base-class feature at the same level.
 *
 * No `changes` (mechanical effects) in v1: the dataset declares which features
 * exist and at what level, not how to compute them (its `Description` prose has
 * at least one verified copy-paste error, so it isn't trustworthy as a mechanics
 * source either). Any future numeric
 * effect must be hand-authored from the published rules, same as
 * `feat-effects.ts`/`tables.ts`.
 */
export interface ArchetypeFeature extends RefEntity {
  /** Parent `Archetype.id`. */
  archetypeId: string;
  /** Inherited from the parent archetype, for convenient filtering. */
  classTag: string;
  level: number;
  /**
   * The base-class `ClassFeatureGrant.uuid` (from `Class.features`) this
   * feature replaces, when the (classTag, level) pairing is unambiguous (a
   * single base feature at that level, not a multi-occupant slot like Bonus
   * Feats). `undefined` means the UI shows this feature's prose as a soft
   * warning instead of a paired swap.
   */
  pairedBaseFeatureUuid?: string;
}

/* ---------------------------------------------------------- rage powers -- */

/**
 * A published barbarian rage power (issue #74 Phase 3a: the "catalog from
 * data, mechanics as overlay" pattern later subsystems — hexes, arcana,
 * talents, exploits, wild talents — replicate). Unlike the rest of RefData,
 * rage powers are NOT sourced from the Foundry pf1 system — its Barbarian /
 * Barbarian Unchained class defs only link a generic "Rage Powers" stub
 * `ClassFeature`, no per-power breakdown. Sourced instead from the "Pf Data
 * 1e" third-party dataset (see `PFDATA_REPO`/`PFDATA_SHA` in
 * data-pipeline); `id` is that dataset's own slug key, `uuid` a synthetic
 * pointer (same posture as `Archetype`/`ArchetypeFeature`).
 *
 * This is the FULL published catalog (~244 entries after the source's own
 * redirect/disambiguation aliases are filtered out) with prose only — no
 * `changes` (mechanical effects). It exists to make the rage-power PICKER
 * browsable against the complete catalog; live mechanics for the
 * hand-verified subset remain in `@pf1/engine` `rage-powers.ts`'s
 * hand-authored `RAGE_POWERS` table, which is authoritative on any name
 * collision with an entry here (see that file's `mergedRagePowerCatalog`).
 */
export interface RagePower extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Ex)", "(Su)", "(Sp)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Totem", "Blood", "Stance", "Elemental" — absent for most (ungrouped) entries. */
  category?: string;
  /**
   * A small integer (observed range 1-3) the source attaches to some
   * entries — empirically NOT a barbarian-level requirement (e.g. the
   * Beast Totem chain has `lesser_beast_totem` with no `level` at all,
   * `beast_totem` at `1`, `greater_beast_totem` at `2`, while
   * `terrifying_howl` — an actual 8th-level-minimum rage power per the
   * published rules — carries `level: 1`). Reads more like a within-chain
   * tier depth than a character-level gate, but the source doesn't document
   * the field, so this is carried through UNINTERPRETED rather than
   * asserted as either. Do NOT use this as a level-gate minimum — every
   * actual "requires Nth level" prerequisite the published rules state is
   * already present as prose inside `description` (do not attempt to parse
   * it out structurally — see the data-pipeline transform's doc comment).
   */
  level?: number;
}

/* --------------------------------------------------------- witch hexes -- */

/**
 * A published witch hex (issue #74 Phase 3b, same "catalog from data,
 * mechanics as overlay" pattern `RagePower` established). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_hexes.json` (~105 raw entries;
 * see `PFDATA_REPO`/`PFDATA_SHA` in data-pipeline) rather than the Foundry
 * pf1 system — the Witch class def only links generic "Hex"/"Major Hex"/
 * "Grand Hex" stub `ClassFeature`s, no per-hex breakdown.
 *
 * The FULL published catalog (~104 entries after dropping the source's
 * `not_found` sentinel) with prose only — no `changes`. Live mechanics for
 * the hand-verified subset remain in `@pf1/engine` `witch-hexes.ts`'s
 * `WITCH_HEXES` table, authoritative on any name collision with an entry
 * here (see that file's `mergedWitchHexCatalog`).
 */
export interface WitchHex extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
  /**
   * Hex tier, taken directly from the source's own `category` field
   * (`"hex" | "majorhex" | "grandhex"`, renamed here to this project's
   * `"hex" | "major" | "grand"` convention — matching `@pf1/engine`
   * `WitchHexTier`). Empirically validated against all 27 hand-authored
   * entries plus the published tier thresholds (10th-level Major Hexes,
   * 18th-level Grand Hexes): every vendored entry's `category` matched the
   * expected tier with zero exceptions. The source ALSO carries a `level`
   * field on a handful of entries, but it's always `1` regardless of tier
   * (never a real level gate) — deliberately NOT carried onto this type; see
   * `RagePower.level`'s doc comment for the identical trap in that sibling
   * catalog.
   */
  tier: "hex" | "major" | "grand";
}

/* -------------------------------------------------- general shaman hexes -- */

/**
 * A published GENERAL shaman hex (issue #74 Phase 3b) — the Advanced Class
 * Guide's own "Shaman Hexes" table, available to any shaman regardless of
 * spirit. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_shaman_hexes.json` (18 raw entries, 16 after dropping
 * the source's `not_found` sentinel AND its `witch_hex` entry — the latter
 * isn't a hex at all, just the ACG rule text stating a shaman may instead
 * pick any non-major/non-grand WITCH hex, treating shaman level as witch
 * level; see the data-pipeline transform's doc comment).
 *
 * Distinct from `@pf1/engine` `shaman-spirits.ts`'s `ShamanSpiritHex` —
 * those are the 5 hexes each of the 8 spirits individually grants (hand-
 * authored, not vendored anywhere in this source), while this catalog is the
 * spirit-agnostic general list. The two are presented as separate sections
 * in `ShamanHexPicker` but share the same `doc.build.shamanHexes` id array.
 * No hand-authored mechanical table exists for this catalog (every entry
 * here is prose-only, browsable via `@pf1/engine` `shaman-hexes.ts`'s
 * `mergedShamanHexCatalog`) — unlike `RagePower`/`WitchHex`, there is no
 * "authoritative hand-verified subset" to overlay.
 */
export interface ShamanHex extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)" — absent for a minority of entries the source doesn't tag. */
  nameSuffix?: string;
}

/* -------------------------------------------------------- magus arcana -- */

/**
 * A published magus arcanum (issue #74 Phase 3b, same pattern as
 * `RagePower`/`WitchHex`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_magus_arcana.json` (66 raw entries, 64 after dropping
 * the source's `not_found` sentinel and one `redirect` alias — Greater
 * Arcane Redoubt -> Arcane Redoubt, Greater) rather than the Foundry pf1
 * system — the Magus class def only links a generic "Magus Arcana" stub
 * `ClassFeature`, no per-arcana breakdown.
 *
 * Unlike `RagePower`/`WitchHex`, this source has NO structured `level` or
 * `category` field at all — every stated level minimum (base 3rd, or a
 * higher stated minimum for a handful of arcana) is prose-only, embedded in
 * `description`'s own text (do not attempt to parse it out structurally).
 * `nameSuffix` is similarly not a top-level source field here — every
 * entry's description instead OPENS with a `**Name (Ex/Su/Sp):**` bold
 * header restating the name; the data-pipeline transform parses that header
 * out into `nameSuffix` and strips it from the rendered `description` (which
 * would otherwise duplicate the name already shown by the picker).
 *
 * The FULL published catalog with prose only — no `changes`. Live mechanics
 * for the hand-verified subset remain in `@pf1/engine` `magus-arcana.ts`'s
 * `MAGUS_ARCANA` table, authoritative on any name collision with an entry
 * here (see that file's `mergedMagusArcanaCatalog`).
 */
export interface MagusArcana extends RefEntity {
  /** Ability-type suffix, parsed from the description's own leading `**Name (Ex/Su/Sp):**` header — see the interface doc comment. */
  nameSuffix?: string;
}

/* ------------------------------------------------------- rogue-family talents -- */

/**
 * A published rogue talent (issue #74 Phase 3b), same "Pf Data 1e" source and
 * catalog-from-data posture as `RagePower` — prose only, no `changes`. SHARED
 * by the chained rogue, Rogue (Unchained), and (via that class's own "Rogue
 * Talent" menu option) slayer. `@pf1/engine` `rogue-talents.ts`'s
 * hand-authored `ROGUE_TALENTS` table (27 entries) is authoritative for
 * mechanics on any name collision — see that file's `mergedRogueTalentCatalog`.
 *
 * The source dictionary tags some entries with a `category` prefix of `R_`
 * (chained-Rogue-specific wording) or `UR_` (Rogue (Unchained)-specific
 * wording) — e.g. `powerful_sneak` ("R_Primary Sneak Attack Talents") vs. the
 * separately-keyed `powerful_sneak_unchained_rogue` ("UR_Primary Sneak Attack
 * Talents", a distinct entry with its own "(Unchained Rogue)"-suffixed
 * `name`). Carried through UNINTERPRETED (same posture as `RagePower.level`)
 * — this app doesn't gate the picker by edition on `category`, it only
 * affects display grouping. A `category` prefixed `Advanced ` is the
 * "Advanced Talents" tier (rogue/slayer 10th level, in place of a normal
 * pick) — also carried uninterpreted; no vendored entry states a `level`
 * that means anything other than a within-chain tier depth (verified: the
 * handful of entries carrying `level` are chain steps like Gloom Magic ->
 * Greater Gloom Magic, not a rogue-level requirement).
 */
export interface RogueTalent extends RefEntity {
  nameSuffix?: string;
  /** Grouping tag from the source (see doc comment above for the `R_`/`UR_`/`Advanced ` prefix conventions). */
  category?: string;
  /** Uninterpreted source field — NOT a rogue-level requirement, see doc comment. */
  level?: number;
}

/**
 * A published ninja trick (issue #74 Phase 3b), same posture as `RagePower`.
 * `@pf1/engine` `ninja-tricks.ts`'s hand-authored `NINJA_TRICKS` table (44
 * entries: 31 tricks + 13 master tricks) is authoritative for mechanics on
 * any name collision — see that file's `mergedNinjaTrickCatalog`. The
 * source's `category` is prefixed `Master ` for the 10th-level master-trick
 * tier (e.g. "Master Ki Tricks"), which lines up with the hand-authored
 * table's own `tier: "trick" | "master"` split, but is carried through as a
 * plain string rather than parsed into that union — a vendored-only entry
 * has no hand-authored `tier` to fall back to.
 */
export interface NinjaTrick extends RefEntity {
  nameSuffix?: string;
  category?: string;
  /** Uninterpreted source field — NOT a ninja-level requirement, same trap as `RagePower.level`. */
  level?: number;
}

/**
 * A published slayer talent (issue #74 Phase 3b), same posture as
 * `RagePower`. UNLIKE the other rogue-family subsystems, `@pf1/engine` has
 * NO hand-authored slayer-talent table today — the slayer class previously
 * had zero talent-picker support beyond the "Extra Slayer Talent" feat's
 * repeatable-feat audit note (`feat-classification.ts`). Every entry here is
 * therefore necessarily display-only; there is nothing to overlay onto. The
 * source's own `rogue_talent` entry (category "Other Talents") documents PF1
 * RAW's "or select a rogue talent instead" option structurally, as its own
 * catalog row, rather than needing a cross-wired mechanic — see
 * `@pf1/engine` `slayer-talents.ts`'s doc comment. `category` is prefixed
 * `Advanced ` for the 10th-level "Advanced Slayer Talents" tier (in place of
 * a normal pick, confirmed against the vendored Foundry `ClassFeature`
 * description for "Advanced Talents (SLA)": "At 10th level and every 2
 * levels thereafter" — same in-place-of shape as ninja master tricks, NOT an
 * extra budget slot).
 */
export interface SlayerTalent extends RefEntity {
  nameSuffix?: string;
  category?: string;
  /** Uninterpreted source field — NOT a slayer-level requirement, same trap as `RagePower.level`. */
  level?: number;
}

/**
 * A published vigilante talent — the "Vigilante Talent" pool (issue #74
 * Phase 3b), same posture as `RagePower`. `@pf1/engine`
 * `vigilante-talents.ts`'s hand-authored `VIGILANTE_TALENTS` table (32
 * entries) is authoritative for mechanics on any name collision — see that
 * file's `mergedVigilanteTalentCatalog`. `category` distinguishes "Avenger
 * Talents"/"Stalker Talents" (specialization-gated, matching the
 * hand-authored table's own `gate` field) from "Hidden Strike Talents"/
 * "Other Talents" (shared) — carried through as a plain string rather than
 * parsed into `VigilanteTalentGate`; a vendored-only entry's specialization
 * gating is a display fact only (the picker's specialization filter only
 * applies to the hand-authored `gate` field, see that file's doc comment).
 */
export interface VigilanteTalent extends RefEntity {
  nameSuffix?: string;
  category?: string;
  /** Uninterpreted source field — NOT a vigilante-level requirement, same trap as `RagePower.level`. */
  level?: number;
}

/**
 * A published vigilante SOCIAL talent — a separate pool from
 * `VigilanteTalent` (PF1 RAW grants Social Talents and Vigilante Talents from
 * two independent class features, see `CharacterDoc.build.vigilanteSocialTalents`'s
 * doc comment), same posture as `RagePower`. `@pf1/engine`
 * `vigilante-talents.ts`'s hand-authored `VIGILANTE_SOCIAL_TALENTS` table (30
 * entries) is authoritative for mechanics on any name collision — see that
 * file's `mergedVigilanteSocialTalentCatalog`.
 */
export interface VigilanteSocialTalent extends RefEntity {
  nameSuffix?: string;
  category?: string;
  /** Uninterpreted source field — NOT a vigilante-level requirement, same trap as `RagePower.level`. */
  level?: number;
}

/* ------------------------------------------------- arcanist exploits -- */

/**
 * A published arcanist exploit (issue #74 Phase 3b), same "catalog from
 * data, mechanics as overlay" pattern `RagePower` documents. Sourced from
 * the "Pf Data 1e" dataset's `json/class_ability_exploits.json` (see
 * `PFDATA_REPO`/`PFDATA_SHA` in data-pipeline).
 *
 * This is the FULL published catalog — both the ~20 BASE Advanced Class
 * Guide exploits and the 11th-level+ "greater exploits" tier (see
 * `category`) — with prose only; live mechanics for the hand-verified base
 * subset remain in `@pf1/engine` `arcanist-exploits.ts`'s
 * `ARCANIST_EXPLOITS` table, authoritative on any name collision (see that
 * file's `mergedArcanistExploitCatalog`).
 */
export interface ArcanistExploit extends RefEntity {
  /**
   * Ability-type suffix as published, e.g. "(Su)", "(Ex)" — this subsystem
   * file doesn't carry it as its own dictionary field (unlike `RagePower`/
   * `InvestigatorTalent`); parsed from the source's own markdown header line
   * instead (see the data-pipeline transform). Absent for a handful of
   * entries the source states with no activation type at all (e.g. Item
   * Crafting, Metamagic Knowledge).
   */
  nameSuffix?: string;
  /**
   * `"Greater Exploits"` for the ACG 11th-level+ tier — the source's own
   * `topLink` field (a parent-page pointer, `["Greater Exploits",
   * "ability/greater_exploits"]`) is present on EXACTLY the 22 greater
   * exploits and absent from every base exploit, verified against the full
   * 73-entry catalog — so this field doubles as a reliable greater-exploit
   * flag; undefined for a base exploit.
   */
  category?: string;
}

/* --------------------------------------------- investigator talents -- */

/**
 * A published investigator talent (issue #74 Phase 3b), same pattern as
 * `RagePower`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_investigator_talents.json`.
 *
 * The full published catalog (68 entries after junk filtering) with prose
 * only; live mechanics for the hand-verified core subset remain in
 * `@pf1/engine` `investigator-talents.ts`'s `INVESTIGATOR_TALENTS` table,
 * authoritative on any name collision (see that file's
 * `mergedInvestigatorTalentCatalog`).
 */
export interface InvestigatorTalent extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Ex)", "(Su)" — absent for a minority of entries. */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Studied Strike Talents", "Inspiration Talents", "Alchemist and Poison Talents". */
  category?: string;
  /**
   * Same "small integer the source attaches to some entries, NOT a
   * character-level requirement" shape as `RagePower.level` — see that
   * field's doc comment. Every entry that carries this field carries `1`
   * (verified across the full catalog), consistent with a within-chain tier
   * marker rather than a level gate. Carried through uninterpreted; any
   * real "requires Nth investigator level" prerequisite is prose inside
   * `description`.
   */
  level?: number;
}

/* ---------------------------------------- kineticist wild talents -- */

export type KineticWildTalentKind =
  | "infusion"
  | "utility"
  | "simpleBlast"
  | "compositeBlast"
  | "defense"
  | "unclassified";

export type KineticInfusionKind = "form" | "substance";

/**
 * A published kineticist wild talent — infusion, utility talent, simple
 * blast, composite blast, or defense talent (issue #74 Phase 3b). Sourced
 * from the "Pf Data 1e" dataset's `json/class_ability_kinetic_talents.json`,
 * the trickiest of the Phase 3b imports: unlike `RagePower`/
 * `InvestigatorTalent`, this subsystem file carries NO per-entry
 * `category`/`level`/`compilationSources` dictionary fields at all — every
 * one of `kind`/`infusionKind`/`elements`/`level`/`burn` below is instead
 * parsed out of the entry's own `description` text, which embeds a
 * consistent stat-line the source's own renderer displays as a header
 * (`**Element** fire; **Type** utility (Su); **Level** 3; **Burn** 1`) —
 * see the data-pipeline transform's doc comment for the parse and the
 * empirical validation against `@pf1/engine`'s hand-authored table.
 *
 * The full published catalog (278 entries after junk filtering) with prose
 * only; live mechanics for the hand-verified infusion/utility subset remain
 * in `@pf1/engine` `kineticist-wild-talents.ts`'s `KINETICIST_WILD_TALENTS`
 * table, authoritative on any name collision (see that file's
 * `mergedKineticistWildTalentCatalog`). Composite blasts additionally merge
 * through `kineticist-elements.ts`'s `mergedCompositeBlastCatalog`. Simple
 * blasts and defense talents are carried here for data completeness but are
 * NOT merged into new picker machinery — this app only offers the 5 core
 * elements as a selectable primary/expanded element (see
 * `KINETICIST_ELEMENT_TAGS`), and every one of those 5 elements' simple
 * blast/defense talent is already hand-authored in `kineticist-elements.ts`;
 * a vendored-only simple blast/defense talent exists only for a later-
 * splatbook element (`void`, `wood`) this app has no selectable tag for, so
 * it could never actually apply.
 */
export interface KineticWildTalent extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)", "(Sp)" — parsed from the stat-line's `**Type**` field (or, for a form/substance infusion the source doesn't tag, the description header) when present. */
  nameSuffix?: string;
  kind: KineticWildTalentKind;
  /** Only set for `kind: "infusion"` — "form" or "substance" per the source's own `**Type**` field. */
  infusionKind?: KineticInfusionKind;
  /**
   * Element tag(s) this talent needs/is associated with — lowercase,
   * matching `@pf1/engine` `KINETICIST_ELEMENT_TAGS` values for the 5 core
   * elements this app models (`aether`/`air`/`earth`/`fire`/`water`), plus
   * `"universal"` for an infusion/utility talent usable with any element,
   * or a later-splatbook element (`"void"`, `"wood"`) this app has no
   * selectable tag for but carries through as-is rather than dropping.
   * Length 2 for a composite blast requiring two distinct elements; length
   * 1 (same element) for one requiring the SAME element twice (primary +
   * Expanded Element) — same convention as
   * `KineticistCompositeBlastDef.requiredElements`.
   */
  elements: string[];
  /**
   * Effective spell level 1-9 — a REAL character-level gate via
   * `minKineticistLevelForTalent`, UNLIKE `RagePower.level`/
   * `InvestigatorTalent.level` (empirically verified: matches
   * `@pf1/engine`'s hand-authored `level` on every checked entry, e.g.
   * Extended Range 1/Extreme Range 3/Aerial Evasion 3 — see the
   * data-pipeline transform's doc comment for the full check). Undefined
   * for a `simpleBlast`/`compositeBlast`/`defense` entry — the source marks
   * these entries' level field `"-"` (no spell level; they aren't gated by
   * this formula at all).
   */
  level?: number;
  /** Burn cost, 0 or more (always a clean integer in the source for this file — no "variable"/"0 or 1" text to simplify, unlike a few other subsystems' prose). */
  burn: number;
}

/* --------------------------------------------------------- mesmerist tricks -- */

/**
 * A published mesmerist trick (issue #74 Phase 3c, same "catalog from data,
 * mechanics as overlay" pattern `RagePower` established). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_tricks.json` (44 real entries
 * after dropping the source's `not_found` sentinel — VERIFIED empirically:
 * every entry's own prose refers to "the mesmerist"/"implant"/a stared
 * subject, matching the class's Tricks class feature, not another
 * subsystem) rather than the Foundry pf1 system — the Mesmerist class def
 * only links a generic "Trick" stub `ClassFeature`, no per-trick breakdown.
 *
 * The FULL published catalog with prose only — no `changes`. Live mechanics
 * for the hand-verified OA-core subset remain in `@pf1/engine`
 * `mesmerist-tricks.ts`'s `MESMERIST_TRICKS` table (26 entries: 17 tricks +
 * 9 masterful tricks), authoritative on any name collision — see that file's
 * `mergedMesmeristTrickCatalog`. All 26 hand-authored entries matched a
 * vendored entry by normalized name with zero aliases needed.
 */
export interface MesmeristTrick extends RefEntity {
  /**
   * Trick tier, taken directly from the source's own `category` field
   * (`"trick" | "masterfultrick"`, renamed here to this project's
   * `"trick" | "masterful"` convention — matching `@pf1/engine`
   * `MesmeristTrickTier`). Absent for a handful of entries the source
   * doesn't tag (treated as `"trick"` by the transform).
   */
  tier: "trick" | "masterful";
}

/* ----------------------------------------------------- mesmerist bold stares -- */

/**
 * A published mesmerist bold stare (issue #74 Phase 3c), same posture as
 * `MesmeristTrick`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_stares.json` (24 real entries after dropping the
 * source's `not_found` sentinel). Unlike tricks, this source carries NO
 * tier-like `category` field at all — PF1 RAW has only one Bold Stare tier
 * (matching `@pf1/engine` `MesmeristBoldStareDef`, which also has no `tier`
 * field). `@pf1/engine` `mesmerist-bold-stares.ts`'s hand-authored
 * `MESMERIST_BOLD_STARES` table (7 OA-core entries) is authoritative for
 * mechanics on any name collision — see that file's
 * `mergedMesmeristBoldStareCatalog`. All 7 hand-authored entries matched a
 * vendored entry by normalized name with zero aliases needed; 6 of the 17
 * vendored-only entries are a themed "Devilbane" sub-chain (Occult Origins)
 * carried through with no special handling — the source's own `addenda`
 * grouping tag isn't surfaced on this type, same "flavor grouping, not a
 * structural field this app needs" call as other subsystems' unused tags.
 */
export type MesmeristBoldStare = RefEntity;

/* ------------------------------------------------- phrenic amplifications -- */

/**
 * A published psychic phrenic amplification (issue #74 Phase 3c), same
 * posture as `RagePower`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_phrenic_amplifications.json` (31 real entries after
 * dropping the source's `not_found` sentinel). `@pf1/engine`
 * `phrenic-amplifications.ts`'s hand-authored `PHRENIC_AMPLIFICATIONS` table
 * (31 entries: 22 basic + 9 major) is authoritative for mechanics on any
 * name collision — see that file's `mergedPhrenicAmplificationCatalog`. ALL
 * 31 hand-authored entries matched a vendored entry by normalized name
 * (including "Space-Rending Spell" vs. the source's "Space-rending Spell" —
 * a case-only difference the normalizer already ignores) — a clean 1:1
 * match with zero vendored-only entries and zero aliases needed, the only
 * subsystem in this wave where that's true.
 */
export interface PhrenicAmplification extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)", "(Ex)" — absent for a minority of entries. */
  nameSuffix?: string;
  /**
   * Tier, taken directly from the source's own `category` field (`"MajorAmp"`
   * present = major, absent = basic) — renamed here to this project's
   * `"basic" | "major"` convention, matching `@pf1/engine`
   * `PhrenicAmplificationTier`.
   */
  tier: "basic" | "major";
}

/* -------------------------------------------------------- psychic disciplines -- */

/**
 * A published psychic discipline (issue #74 Phase 3c). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_disciplines.json` (23 real
 * entries after dropping the source's `not_found` sentinel). Unlike the
 * other subsystems in this wave, a discipline is a CHASSIS — a single
 * character-defining pick (`doc.build.psychicDiscipline`) that grants a
 * whole bonus-spell progression and Discipline Powers, not a menu of many
 * small effects — so this catalog is prose-only ROW DATA for the picker,
 * never a source of derived mechanics. `@pf1/engine`
 * `psychic-disciplines.ts`'s hand-authored `PSYCHIC_DISCIPLINES` table (the
 * 12 core Occult Adventures disciplines) remains the ONLY source of bonus
 * spells/Discipline Powers/phrenic pool ability — all 12 matched a vendored
 * entry by normalized name with zero aliases needed; the 11 vendored-only
 * disciplines (splatbook additions: Bleaching, Hag-Called, Mindtech,
 * Psychedelia, Rapport, Rivethun, Shadow, Sorrow, Superiority, Symbiosis,
 * Warp) are selectable in the picker for completeness but grant NO bonus
 * spells/powers/pool-ability resolution — see `mergedPsychicDisciplineCatalog`'s
 * doc comment for how the picker keeps that honest.
 */
export type PsychicDiscipline = RefEntity;

/* -------------------------------------------------------- occultist implements -- */

/**
 * A published occultist implement school (issue #74 Phase 3c). Sourced from
 * the "Pf Data 1e" dataset's `json/class_ability_implements.json` (12 real
 * entries after dropping the source's `not_found` sentinel). Same chassis
 * caveat as `PsychicDiscipline`: an implement school grants a base focus
 * power + resonant power + its own focus-power menu, all hand-authored in
 * `@pf1/engine` `occultist-implements.ts`'s `OCCULTIST_SCHOOLS` table (the 8
 * core Occult Adventures schools) — this catalog is prose-only row data,
 * never a source of derived mechanics. All 8 hand-authored schools matched a
 * vendored entry by normalized name with zero aliases needed; the 4
 * vendored-only entries are the "Psychic Anthology" Panoply variant schools
 * (Mage's Paraphernalia, Performer's Accoutrements, Saint's Holy Regalia,
 * Trappings of the Warrior) — selectable in the implement-school stepper for
 * completeness but grant no base/resonant/focus powers (see
 * `mergedOccultistImplementCatalog`'s doc comment).
 */
export type OccultistImplement = RefEntity;

/* -------------------------------------------------------------- medium spirits -- */

/**
 * A published Medium legendary spirit (issue #74 Phase 3c). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_spirits.json` (40 real entries
 * after dropping the source's `not_found` sentinel — VERIFIED empirically
 * against the sibling `json/class_ability_shaman_spirits.json` file, which
 * is the DIFFERENT shaman-spirit catalog (Battle/Bones/Flame/Heavens/...,
 * already vendored as `RefData.shamanHexes`'s neighbor — see
 * `@pf1/engine` `shaman-spirits.ts`); this file's first six entries are
 * exactly the Medium's Archmage/Champion/Guardian/Hierophant/Marshal/
 * Trickster). Same chassis caveat as `PsychicDiscipline`/
 * `OccultistImplement`: a legendary spirit grants a Spirit Bonus target set,
 * a Séance Boon, an influence penalty, and 4 tiered Spirit Powers, all
 * hand-authored in `@pf1/engine` `medium-spirits.ts`'s `MEDIUM_SPIRITS`
 * table (the 6 core spirits) — this catalog is prose-only row data. All 6
 * hand-authored spirits matched a vendored entry by normalized name with
 * zero aliases needed; the 34 vendored-only entries are a mix of 12
 * outsider-type spirits (Psychic Anthology: Aeon/Agathion/Angel/Archon/
 * Azata/Daemon/Demon/Devil/Psychopomp/...) and 22 named historical/NPC
 * legendary spirits from later splatbooks (e.g. Abrogail Thrune I, a
 * Hierophant-flavored unique spirit per Occult Realms) — selectable in the
 * séance panel for completeness but grant no Spirit Bonus targets/Séance
 * Boon/Spirit Powers (see `mergedMediumSpiritCatalog`'s doc comment).
 */
export type MediumSpirit = RefEntity;
/* -------------------------------------------------- oracle mysteries -- */

/**
 * A published oracle mystery (issue #74 Phase 3c, same "catalog from data,
 * mechanics as overlay" pattern `RagePower` established). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_mysteries.json` (35 raw
 * entries, 34 after dropping the source's `not_found` sentinel) rather than
 * the Foundry pf1 system — the Oracle class def only links the generic
 * "Mystery" stub `ClassFeature`, no per-mystery breakdown.
 *
 * The FULL published catalog with prose only — no structured bonus-spell/
 * class-skill arrays. `@pf1/engine` `oracle-mysteries.ts`'s hand-authored
 * `ORACLE_MYSTERIES` table (the 10 Advanced Player's Guide "core" mysteries)
 * remains authoritative for those, matched by name (see that file's
 * `mergedOracleMysteryCatalog`); the other ~24 vendored-only mysteries
 * (Ancestor, Apocalypse, Dragon, Lunar, ...) are display-only.
 *
 * A mystery's REVELATIONS (its menu of choosable powers) are NOT their own
 * dictionary entries in this source — they're prose embedded inside the
 * mystery's own `description`, under a "### Revelations" heading, as bolded
 * `**Name (Tag):**` paragraphs with no stable per-revelation key. Out of
 * scope for this catalog (and for `@pf1/engine` `oracle-revelations.ts`,
 * which stays scoped to its existing 10-core-mystery hand-authored table) —
 * see the data-pipeline transform's doc comment for why parsing them out
 * into discrete addressable records was deferred rather than forced.
 */
export interface OracleMystery extends RefEntity {}

/* ----------------------------------------------------- oracle curses -- */

/**
 * A published oracle's curse (issue #74 Phase 3c, same pattern as
 * `RagePower`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_curses.json` (42 raw entries, 41 after dropping
 * `not_found`) — NOT the dataset's top-level `curses.json` (that file is
 * spell/monster-ability afflictions, an unrelated catalog). The Oracle class
 * def only links the generic "Oracle's Curse" stub `ClassFeature`.
 *
 * The FULL published catalog with prose only. `@pf1/engine`
 * `oracle-curses.ts`'s hand-authored `ORACLE_CURSES` table (the 6 base APG
 * curses) remains authoritative for those, matched by name (see that file's
 * `mergedOracleCurseCatalog`); the rest are display-only.
 */
export interface OracleCurse extends RefEntity {}

/* ----------------------------------------------------- witch patrons -- */

/**
 * A published witch patron (issue #74 Phase 3c, same pattern as
 * `RagePower`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_patrons.json` (62 raw entries, 61 after dropping
 * `not_found`) — the Witch class def only links the generic "Patron
 * Spells" stub `ClassFeature`.
 *
 * The FULL published catalog with prose only. `@pf1/engine`
 * `witch-patrons.ts`'s hand-authored `WITCH_PATRONS` table (17 APG/Ultimate
 * Magic "core" patrons) remains authoritative for those, matched by name
 * (see that file's `mergedWitchPatronCatalog`); the rest are display-only.
 * `category` distinguishes the source's own `"basic"` (a simple 9-spell
 * bonus-spell progression) from `"unique"` (a themed patron with its own
 * prerequisite/restriction prose, e.g. "Celestial Agenda") — carried through
 * for display grouping only, not gated.
 */
export interface WitchPatron extends RefEntity {
  category?: "basic" | "unique";
}

/* ---------------------------------------------------- shaman spirits -- */

/**
 * A published shaman spirit (issue #74 Phase 3c, same pattern as
 * `RagePower`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_shaman_spirits.json` (19 raw entries, 18 after
 * dropping `not_found`) — NOT the dataset's `class_ability_spirits.json`
 * (that file is the unrelated medium "spirit" catalog, a sibling import).
 * The Shaman class def only links the generic "Spirit" stub `ClassFeature`.
 *
 * The FULL published catalog with prose only. `@pf1/engine`
 * `shaman-spirits.ts`'s hand-authored `SHAMAN_SPIRITS` table (the 8
 * Advanced Class Guide "core" spirits) remains authoritative for those,
 * matched by name (see that file's `mergedShamanSpiritCatalog`); the other
 * ~10 vendored-only spirits (Ancestors, Dark Tapestry, Frost, Lore,
 * Mammoth, Restoration, Slums, Tribe, Wind, Wood) are display-only.
 */
export interface ShamanSpirit extends RefEntity {}

/* ------------------------------------------------- sorcerer bloodlines -- */

/**
 * A published sorcerer bloodline (issue #74 Phase 3c, same pattern as
 * `RagePower`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_sorcerer_bloodlines.json` (53 raw entries, 51 after
 * dropping `not_found` and the one `kobold` -> `kobold_sorcerer` redirect)
 * — distinct from `RefData.bloodlineSpellLists` (the Foundry-vendored
 * per-bloodline BONUS SPELL progressions, a different source entirely);
 * this catalog instead carries a bloodline's ARCANA and POWERS prose, which
 * the Foundry pack doesn't vendor at all (the Sorcerer class def only links
 * a generic "Bloodline" stub `ClassFeature`).
 *
 * The FULL published catalog with prose only — no structured power-level
 * array. `@pf1/engine` `bloodlines.ts`'s hand-authored `BLOODLINES` table
 * (the 10 Core Rulebook bloodlines) remains authoritative for those,
 * matched by name (see that file's `mergedSorcererBloodlineCatalog`); the
 * other ~41 vendored-only bloodlines (Accursed, Astral, Daemon, Djinni,
 * Harrow, Rakshasa, ...) are display-only.
 */
export interface SorcererBloodline extends RefEntity {}

/* ------------------------------------------------ bloodrager bloodlines -- */

/**
 * A published bloodrager bloodline (issue #74 Phase 3c, same pattern as
 * `RagePower`). Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_bloodrager_bloodlines.json` (25 raw entries, 24 after
 * dropping `not_found`) — the Bloodrager class def only links a generic
 * "Bloodline" stub `ClassFeature`.
 *
 * Unlike `SorcererBloodline`, this source's prose IS internally structured
 * via the dataset's own `::ab[Name]{l=N ...}`/`::list[Label]{...}`
 * directives (bonus feats, bonus spells by level, and each bloodline power's
 * own level gate) — see the data-pipeline reader's (`util/pfdata.ts`)
 * directive rendering for how these are turned into readable prose. Still
 * carried as prose only here, not parsed into a structured power array;
 * `@pf1/engine` `bloodrager-bloodlines.ts`'s hand-authored
 * `BLOODRAGER_BLOODLINES` table (the 10 Advanced Class Guide bloodlines
 * shared with sorcerer) remains authoritative for those, matched by name
 * (see that file's `mergedBloodragerBloodlineCatalog`); the other ~14
 * vendored-only bloodlines (Aquatic, Black Blood, Hag, Kyton, Medusa, Naga,
 * Phoenix, Salamander, Shadow, Shapechanger, Sphinx, Verdant, Vestige) are
 * display-only.
 */
export interface BloodragerBloodline extends RefEntity {}
/* -------------------------------------------------- alchemist discoveries -- */

/**
 * A published alchemist discovery (issue #74 Phase 3c), same "catalog from
 * data, mechanics as overlay" pattern `RagePower` documents. Sourced from
 * the "Pf Data 1e" dataset's `json/class_ability_discoveries.json` — NOT
 * `json/class_ability_arcane_discoveries.json` (the wizard's Arcane
 * Discoveries subsystem, a different class feature; this app has no picker
 * for it, so it stays unvendored).
 *
 * The full published catalog (168 entries after junk filtering) with prose
 * only; live mechanics for the hand-verified core-plus-selected-splatbook
 * subset remain in `@pf1/engine` `alchemist-discoveries.ts`'s
 * `ALCHEMIST_DISCOVERIES` table, authoritative on any name collision (see
 * that file's `mergedAlchemistDiscoveryCatalog`).
 */
export interface AlchemistDiscovery extends RefEntity {
  /** Ability-type suffix as published — absent for most entries (most discoveries are (Ex)/passive with no suffix stated). */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Primary Bomb Discoveries", "Mutagen Discoveries", "Grand Discoveries". */
  category?: string;
  /**
   * Same "small integer the source attaches to some entries, NOT a
   * character-level requirement" shape as `RagePower.level` — see that
   * field's doc comment. Carried through uninterpreted; any real "requires
   * Nth alchemist level" prerequisite is prose inside `description`.
   */
  level?: number;
}

/* ---------------------------------------------------- monk ki powers -- */

/**
 * A published Monk (Unchained) ki power (issue #74 Phase 3c), same pattern
 * as `RagePower`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_ki_powers.json`.
 *
 * The full published catalog (44 entries after junk filtering) with prose
 * only; live mechanics for the hand-verified core-book subset remain in
 * `@pf1/engine` `monk-ki-powers.ts`'s `MONK_KI_POWERS` table, authoritative
 * on any name collision (see that file's `mergedMonkKiPowerCatalog`).
 */
export interface MonkKiPower extends RefEntity {
  /** Ability-type suffix as published, e.g. "(Su)", "(Ex)" — absent for a minority of entries. */
  nameSuffix?: string;
  /**
   * Same "small integer the source attaches to some entries, NOT a
   * character-level requirement" shape as `RagePower.level` — see that
   * field's doc comment (empirically confirmed again here: e.g.
   * `cobra_breath`/`ki_volley`/`master_thought_koan` all carry `level: 1`
   * despite being 12th/16th/12th-level-minimum powers per the published
   * rules). Carried through uninterpreted; any real "requires Nth monk
   * level" prerequisite is prose inside `description`.
   */
  level?: number;
}

/* ------------------------------------------------- monk style strikes -- */

/**
 * A published Monk (Unchained) style strike (issue #74 Phase 3c), same
 * pattern as `RagePower`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_style_strikes.json`.
 *
 * The full published catalog (15 entries after junk filtering — this
 * subsystem file carries no `category`/`level`/`compilationSources` at all,
 * unlike most others) with prose only; live mechanics for the hand-
 * verified table remain in `@pf1/engine` `monk-style-strikes.ts`'s
 * `MONK_STYLE_STRIKES` table, authoritative on any name collision (see that
 * file's `mergedMonkStyleStrikeCatalog`). All 15 hand-authored entries
 * matched a vendored entry 1:1 — there is no vendored-only style strike.
 */
export type MonkStyleStrike = RefEntity;

/* -------------------------------------------------------- orders -- */

/**
 * A published cavalier/samurai order (issue #74 Phase 3c). Sourced from the
 * "Pf Data 1e" dataset's `json/class_ability_orders.json` — NOT
 * `json/class_ability_hellknight_orders.json` (the Hellknight prestige
 * class's own, unrelated, "order" chassis; out of scope here).
 *
 * The full published catalog (38 entries after junk filtering) — far more
 * than the 8 hand-authored orders (the 6 Advanced Player's Guide cavalier
 * orders plus the Ultimate Combat samurai-specific Warrior/Ronin orders) in
 * `@pf1/engine` `cavalier-orders.ts`. This subsystem file carries no
 * `category`/`level` metadata at all — an order's 2nd/8th/15th-level
 * ability tiers live ENTIRELY inside the free-text `description` (headed
 * "### Order Abilities" in the source markdown), unlike the structured
 * `OrderAbility[]` the hand-authored table carries. A vendored-only order
 * (30 of the 38) therefore resolves to prose display only — its abilities
 * aren't broken out into the picker's structured tier view, see
 * `@pf1/engine` `cavalier-orders.ts`'s `mergedOrderCatalog` doc comment for
 * how the picker renders that case.
 */
export interface CavalierOrder extends RefEntity {
  /** Grouping tag — absent for every entry in this file (kept for shape parity with `pfDataSourceRefs`-adjacent types; always undefined here). */
  category?: string;
}

/* -------------------------------------------------------- shifter aspects -- */

/**
 * A published shifter aspect (issue #74 Phase 3c), same pattern as
 * `RagePower`. Sourced from the "Pf Data 1e" dataset's
 * `json/class_ability_aspects.json`.
 *
 * The full published catalog (30 entries after junk filtering) with prose
 * only; live mechanics for the hand-verified table remain in `@pf1/engine`
 * `shifter-aspects.ts`'s `SHIFTER_ASPECTS` table, authoritative on any name
 * collision (see that file's `mergedShifterAspectCatalog`). All 30
 * hand-authored entries matched a vendored entry 1:1 — this file carries no
 * `category`/`level` metadata at all (the minor/major form split lives
 * entirely in prose).
 */
export type ShifterAspect = RefEntity;

export type { SourceRef };
