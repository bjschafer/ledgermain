/**
 * Shared types for the per-source spell-like-ability grant tables in this
 * directory. Kept separate so an agent adding entries to a shard never
 * touches this file — only `index.ts` merges shards and derives rows.
 *
 * What this table family is: hand-authored grants of a SPECIFIC NAMED SPELL
 * castable as a spell-like ability — the vendored packs state these facts
 * only in prose ("Gnomes ... gain the following spell-like abilities: 1/day —
 * dancing lights, ..."), never as a structured link into the spells pack, so
 * every entry here is clean-room-authored from the published rules text and
 * verified against the vendored description. The engine resolves `spell`
 * against `RefData.spells` by exact name (the same degradation posture as
 * `apps/web`'s `model/spellcasting.ts` name-resolved bonus spells) and emits
 * `DerivedSheet.spellLikeAbilities`; metered grants ride the normal
 * resource-pool machinery and the `live.resources` ledger.
 *
 * What belongs here: a grant of one or more real, resolvable spells with a
 * stated frequency (N/day, N/week, at will, constant). What does not:
 * spell-EQUIVALENT effects that are not an actual spell ("a wall-of-fire-like
 * barrier"), scaling summon-monster lists (the summoning subsystem),
 * choice-from-a-list SLA grants whose option list can't be enumerated (a
 * chosen domain's full spell list, "any formula-book spell"), feats that
 * apply metamagic to existing SLAs, slot-conversion riders, and budgets that
 * are not a use counter (minutes divisible across uses stay prose unless the
 * vendored entry itself meters them). A choice-from-a-list grant whose option
 * set IS short and enumerable from the published text (an alignment, an
 * element, ...) is one def per option, gated by `when` on the matching
 * `build.pickChoices["classFeature:<id>"]`/`["racialTrait:<id>"]` entry — see
 * `when` below.
 *
 * DC and caster level, clean-room from the CRB magic chapter's spell-like
 * ability rules: the save DC is `10 + spell level + Charisma modifier` unless
 * the granting text names another ability (`dcAbility`); Spell Focus and the
 * rest of the spell-feat family deliberately never fold in (SLAs are not
 * spells being cast). The default effective spell level is the
 * sorcerer/wizard list level when the spell is on that list, else the lowest
 * of its class-list levels — override with `spellLevel` when the granting
 * text or published errata pins a different one.
 */

import type { AbilityId, CharacterDoc } from "@pf1/schema";

export interface SlaGrantDef {
  /**
   * Stable kebab-case id suffix, unique within the granting source — the
   * derived row's id (and synthetic pool id, when one derives) is
   * `sla:<sourceKey>:<slug>`. Renaming a slug orphans any `live.resources`
   * count already stored under the old id, so treat it as frozen once
   * shipped.
   */
  slug: string;
  /** Exact vendored spell name, resolved case-insensitively against `RefData.spells`. */
  spell: string;
  /** Display label when it should differ from the spell name (scoped uses, "self only"). */
  displayName?: string;
  /**
   * Per-period use meter. The formula evaluates against the grant's roll
   * data (class-feature/archetype grants see `@class.unlevel` as the
   * granting class's level; racial/feat grants see character-level data
   * only). Omit when `frequency` or `attachToSourcePool` is set instead —
   * exactly one of the three metering shapes applies per def.
   */
  uses?: { formula: string; per?: "day" | "week" };
  /** Unmetered grants: at will, or a constant always-on effect. */
  frequency?: "atWill" | "constant";
  /**
   * Meter through the granting entry's OWN derived pool (a vendored
   * `uses.maxFormula` on the trait/feature) instead of a synthetic one —
   * the heritage "Spell-Like Ability (Tiefling - X)" traits and any class
   * feature whose vendored entry already carries its per-day budget. The
   * row's `poolId` becomes the source id, so the tracker never shows two
   * counters for one budget.
   */
  attachToSourcePool?: boolean;
  /**
   * Minimum level before the grant appears — the GRANTING class's level for
   * class-feature/archetype grants, total character level otherwise. Omit
   * when the source's own gating suffices (an archetype feature's `level`,
   * a class feature's grant level).
   */
  minLevel?: number;
  /** Ability-score gate (Gnome Magic's "Charisma scores of 11 or higher"), checked against FINAL scores. */
  minAbility?: { ability: AbilityId; score: number };
  /**
   * Caster-level formula. Defaults to the granting class's level
   * (`@class.unlevel`) for class-feature/archetype grants and total
   * character level (`@attributes.hd.total`) for racial/feat grants — the
   * published default for each shape. Override only when the granting text
   * says otherwise.
   */
  cl?: string;
  /** DC ability when the granting text departs from the Charisma default. */
  dcAbility?: AbilityId;
  /** Effective spell level override — see the header's default-resolution rule. */
  spellLevel?: number;
  /** Rider reminder rendered as fine print ("self only", "objects only", ...). */
  note?: string;
  /**
   * Extra applicability gate, checked after `minLevel`/`minAbility` — the
   * enumerable choice-from-a-list shape (see the header): each option is its
   * own def, gated on the matching stored pick. No stored pick, or a pick
   * that matches no def's `when`, grants nothing (same open-changes posture
   * as `CLASS_FEATURE_CHOICES`/`PcNaturalAttackDef.when`).
   */
  when?: (doc: CharacterDoc) => boolean;
}

/**
 * A race-innate grant (keyed by `Race.name` in `RACE_SLA_GRANTS`), which can
 * additionally be suppressed when an alternate/heritage trait replaces the
 * standard trait it belongs to — see `index.ts`'s suppression rules.
 */
export interface RaceSlaGrantDef extends SlaGrantDef {
  /**
   * The standard racial trait this grant is part of, as published ("Gnome
   * Magic", "Spell-Like Ability"). A selected alternate racial trait that
   * replaces this standard trait — via vendored `replacedTraitNames`, the
   * hand table's `replaces`, or a heritage variant NAMED after the standard
   * trait ("Spell-Like Ability (Tiefling - Beastbrood)") — suppresses the
   * grant. Parentheticals are stripped before comparing, so "Spell-Like
   * Ability (Dhampir)" matches "Spell-Like Ability".
   */
  standardTraitName?: string;
}
