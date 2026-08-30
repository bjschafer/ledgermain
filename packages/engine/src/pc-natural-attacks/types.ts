/**
 * Shared types for the per-source PC natural-attack grant tables in this
 * directory. Kept separate so an agent adding entries to a shard never
 * touches this file — only `index.ts` merges shards and derives rows.
 *
 * What this table family is: hand-authored grants of one or more natural
 * weapons onto the PC's OWN body — claws from a racial trait (tengu, catfolk,
 * ...), a druid/shifter class feature, an archetype feature, or a feat. This
 * is distinct from `polymorph.ts` (a transformation the player transcribes
 * off an assumed creature's stat block) and from companion/eidolon natural
 * attacks (a different creature's own body) — see this directory's `index.ts`
 * header for how the two natural-attack surfaces coexist.
 *
 * A single def can grant more than one attack LINE at once (e.g. a race that
 * grants both a bite and two claws from one trait), so `attacks` is an array
 * rather than a single name/count/dice triple.
 */

import type { CharacterDoc } from "@pf1/schema";

/** Mirrors `natural-attacks.ts`'s `NaturalAttackType` without importing it — kept a plain literal so this file stays import-free of the resolver. */
export type PcNaturalAttackKind = "primary" | "secondary";

/**
 * One granted attack line. `mediumDice` is written for a MEDIUM creature
 * (the CRB "Table: Natural Attacks" convention) and scaled to the character's
 * actual effective size by the resolver — a fixed function for flat dice, or
 * a function of the granting class's level for a line that scales with level
 * (e.g. a shifter's claws growing from 1d4 to 1d6 to 1d8).
 */
export interface PcNaturalAttackLine {
  name: string;
  /** How many of this attack (e.g. 2 for "2 claws"). Default 1. */
  count?: number;
  /** Display-only damage-dice string at Medium size, or a function of the granting class's level for a level-scaled line. Omitted for a line with no separate damage die (rare). */
  mediumDice?: string | ((classLevel: number) => string);
  /**
   * Explicit primary/secondary override. Omit to let `classifyNaturalAttacks`
   * classify by name (see `natural-attacks.ts`) — the right choice for every
   * published natural weapon name ("Bite", "Claw", "Tail Slap", ...). Only
   * set this for a granting text that names a non-standard weapon whose
   * classification the name heuristic would get wrong.
   */
  kind?: PcNaturalAttackKind;
}

/** Which `doc.live.activeBuffs` gate a grant that only applies under a specific stance/rage/mutagen (feral mutagen, a rage power, ...). Satisfied by ANY match, same posture as `Change.activeWhenBuff`. */
export interface PcNaturalAttackBuffGate {
  buffIds?: readonly string[];
  effectTags?: readonly string[];
  /** Exact `ActiveBuff.name` match — the escape hatch for a buff with neither a `buffId` nor an `effectTag` (e.g. a plain user-authored buff standing in for an unmodeled effect). */
  names?: readonly string[];
}

export interface PcNaturalAttackDef {
  /**
   * Stable kebab-case id suffix, unique within the granting source — the
   * resolved grant's id is `pcNattack:<sourceKey>:<slug>`. Renaming a slug is
   * safe (nothing meters against it, unlike the SLA tables' pool ids) but
   * still avoid it without reason, to keep git blame useful.
   */
  slug: string;
  attacks: readonly PcNaturalAttackLine[];
  /**
   * Minimum level before the grant applies — the GRANTING class's level when
   * `classTag` is set (or, for a class-feature/archetype-feature grant, the
   * granting feature's own class implicitly), total character level
   * otherwise. Omit when the source's own gating already suffices (an
   * archetype feature's `level`, a class feature's grant level).
   */
  minLevel?: number;
  /**
   * Which class's level feeds a level-scaled `mediumDice` function and/or
   * `minLevel` above, for a racial-trait or feat grant tied to levels in one
   * particular class. Class-feature/archetype-feature grants already have an
   * implicit granting class from context and normally omit this; set it only
   * if the grant explicitly scales with a DIFFERENT class's level than its
   * own granting feature's.
   */
  classTag?: string;
  /** Gate: only applies while a matching buff (rage, feral mutagen, a stance) is active. */
  requiredBuff?: PcNaturalAttackBuffGate;
  /** Extra applicability gate evaluated after the level/buff gates, for a grant conditioned on a stored build choice. */
  when?: (doc: CharacterDoc) => boolean;
  /**
   * Feat-sourced grant only: restricts this def to the SAME feat occurrence's
   * stored choice (`doc.build.featChoices[featId]` / `extraFeats[].choiceId`)
   * equaling this id — e.g. Aspect of the Beast's four manifestations share
   * one feat table entry keyed by slug, and only the "claws-of-the-beast"
   * pick should grant the claw attack. Resolved by the feat-loop in
   * `index.ts`, which has the feat's own id (and so its own choice) in scope;
   * ignored for race/racialTrait/classFeature/archetypeFeature grants, which
   * have no per-occurrence choiceId to gate on.
   */
  requiredChoiceId?: string;
  /** Display-only reminder rendered as fine print on the derived line(s) ("bite only usable while raging"). */
  note?: string;
}

/**
 * A race-innate grant (keyed by `Race.name` in `RACE_NATURAL_ATTACKS`),
 * suppressible when a selected alternate/heritage racial trait replaces the
 * standard trait the grant belongs to — same `standardTraitName` convention
 * as `spell-like-abilities/types.ts`'s `RaceSlaGrantDef`.
 */
export interface RaceNaturalAttackDef extends PcNaturalAttackDef {
  /** The standard racial trait this grant is part of, as published — a selected alternate/heritage trait that replaces or is named after it suppresses the grant. */
  standardTraitName?: string;
}

/** All five source tables, overridable for tests — same posture as `SlaSourceTables`. */
export interface PcNaturalAttackTables {
  race: Readonly<Record<string, readonly RaceNaturalAttackDef[]>>;
  racialTrait: Readonly<Record<string, readonly PcNaturalAttackDef[]>>;
  classFeature: Readonly<Record<string, readonly PcNaturalAttackDef[]>>;
  archetypeFeature: Readonly<Record<string, readonly PcNaturalAttackDef[]>>;
  feat: Readonly<Record<string, readonly PcNaturalAttackDef[]>>;
}
