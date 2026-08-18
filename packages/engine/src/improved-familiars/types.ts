/**
 * Shared types for the Improved Familiar species tables in this directory.
 * Kept separate so an agent adding species to a shard never touches this
 * file — only `index.ts` merges shards.
 *
 * What this table family is: hand-authored stat blocks for the creatures the
 * Improved Familiar feat unlocks (CRB p.127's table plus the splatbook
 * expansions), clean-room from the published PF1 rules via aonprd.com /
 * d20pfsrd.com — no vendored creature data exists (the data pipeline ships
 * no bestiary), and Foundry source is never consulted (DESIGN §6).
 *
 * Rules posture, pinned during design (verified against the published feat
 * text): improved familiars use the NORMAL familiar rules with exactly two
 * exceptions — the creature's type does not change, and it never gains Speak
 * with Animals of Its Kind. Everything else in `familiar.ts` therefore
 * applies unchanged: HP is half the master's (regardless of the creature's
 * own HD), attacks use the master's BAB, saves and skill ranks use the
 * better-of rule against the creature's own real values. The one genuine
 * ambiguity is Intelligence: the progression table only contemplates Int-2
 * animals rising, and nothing in the rules supports LOWERING an outsider's
 * printed Int on acquisition — this module resolves it as the better of the
 * table value and the creature's own printed score (`ownInt`), mirroring the
 * saves/skills better-of shape.
 */

import type { AbilityId } from "@pf1/schema";

import type { BaseFamiliar } from "../familiar.js";

/**
 * Static defensive qualities a creature carries — the display surface DR /
 * SR / energy resistance / immunities never had before this module (the gap
 * that kept improved familiars out; see also #129's companion residue, which
 * names the same missing block). Display-shaped on purpose: nothing on a
 * PC-side sheet computes AGAINST a familiar's DR, so strings keep the
 * authoring honest ("5/good or silver") instead of forcing a bypass
 * vocabulary nothing consumes.
 */
export interface CreatureDefenses {
  /** Damage reduction, as printed: "5/good or silver". */
  dr?: string;
  /**
   * The creature's OWN spell resistance. The familiar progression's SR
   * (master level + 5, at ML 11+) is folded in by `deriveFamiliar` — the
   * derived sheet shows a single SR, the higher of the two.
   */
  sr?: number;
  /** Fast healing, as printed (e.g. imp's 2). */
  fastHealing?: number;
  /** Energy resistances, as printed: ["acid 10", "cold 10"]. */
  resist?: string[];
  /** Immunities: ["fire", "poison"]. */
  immune?: string[];
  /** Vulnerabilities/weaknesses: ["vulnerability to cold"]. */
  weaknesses?: string[];
}

/**
 * One spell-like ability an improved-familiar species carries, from its
 * published stat block. Distinct from `spell-like-abilities/types.ts`'s
 * `SlaGrantDef` (the MASTER's own SLA grants): a familiar's SLAs are cast by
 * the familiar with the CREATURE's printed caster level and its own
 * ability-derived DCs, and their per-day uses live on the familiar's own
 * ledger (`live.familiar.slaUses`), not the master's resource pools.
 */
export interface FamiliarSlaDef {
  /**
   * Stable kebab-case id, unique within the species — the key used by
   * `live.familiar.slaUses`. Renaming a shipped slug orphans stored counts,
   * so treat it as frozen once shipped.
   */
  slug: string;
  /** Display name — usually the spell name as printed ("detect magic"). */
  name: string;
  /**
   * Exact vendored spell name for detail display, when it differs from
   * `name` (e.g. a name printed with a scope suffix). The web app resolves
   * `spell ?? name` against `RefData.spells` case-insensitively and degrades
   * to a plain row when nothing matches — same posture as
   * `spell-like-abilities/`.
   */
  spell?: string;
  /**
   * How often it can be used. Metered shapes track spent uses in
   * `live.familiar.slaUses` and reset on New Day (a documented v1
   * simplification for the rare `per: "week"` meter).
   */
  frequency: "constant" | "atWill" | { uses: number; per: "day" | "week" };
  /** The creature's printed caster level for its SLAs (imp: 6). */
  cl: number;
  /** DC ability when the stat block departs from the Charisma default. */
  dcAbility?: AbilityId;
  /** Rider reminder rendered as fine print ("self only", "see text"). */
  note?: string;
}

/**
 * Picker prerequisites from the published Improved Familiar table — surfaced
 * as SOFT WARNINGS only (the repo's hybrid-prereq posture; prose prereqs
 * never block). The table's level column is headed "Arcane Spellcaster
 * Level" in the CRB, but later expansions add divine-keyed entries, so the
 * check is against the character's best caster level of any kind — the
 * warning copy stays honest by quoting the printed requirement.
 */
export interface ImprovedFamiliarPrereq {
  /** Minimum caster level from the published table (3, 5, or 7 for the CRB rows). */
  casterLevel: number;
  /**
   * The familiar's alignment as printed ("LE", "CE", "N", "NG"...). The
   * master's alignment must be within one step on each axis (the feat's own
   * rule); omit for "any alignment" rows. Warning-only, like everything else
   * here.
   */
  alignment?: string;
}

/**
 * The broad creature type, machine-readable — drives which class-skill rule
 * applies in `deriveFamiliar` (`animal`/`vermin` keep the Universal Monster
 * Rules animal set; everything else uses the species' own `classSkills`).
 * Display uses `creatureType` (the full printed line) instead.
 */
export type FamiliarTypeKind =
  | "animal"
  | "vermin"
  | "outsider"
  | "dragon"
  | "construct"
  | "fey"
  | "elemental"
  | "magical beast"
  | "undead"
  | "plant";

/**
 * An Improved Familiar species — a `BaseFamiliar` chassis plus the surfaces
 * only a non-animal needs. Authored per-species in this directory's shard
 * files, merged by `index.ts`.
 */
export interface ImprovedFamiliar extends BaseFamiliar {
  /** Machine-readable type — see {@link FamiliarTypeKind}. */
  typeKind: FamiliarTypeKind;
  /** Full printed type line for display: "Outsider (devil, evil, extraplanar, lawful)". */
  creatureType: string;
  /** The creature's own Hit Dice (display + the HD whichever-is-higher rule). */
  hd: number;
  /**
   * The creature's own printed Intelligence. The familiar's Int is the
   * better of this and the progression table (see the module doc comment's
   * rules-posture note).
   */
  ownInt?: number;
  /**
   * The species' own class skills (skill ids) — replaces the animal set for
   * the +3 trained bonus, since the Universal Monster Rules animal list does
   * not apply to a non-animal (the gap coverageNotes called out).
   */
  classSkills?: string[];
  /** Defensive qualities — see {@link CreatureDefenses}. */
  defenses?: CreatureDefenses;
  /** Spell-like abilities from the printed stat block. */
  slas?: FamiliarSlaDef[];
  /** Languages, as printed (display only). */
  languages?: string[];
  /** Special-quality reminders with no numeric surface ("poison (DC 13)", "change shape"). */
  specialNotes?: string[];
  /** Published-table prerequisites — soft warnings in the picker. */
  prereq: ImprovedFamiliarPrereq;
  /** Book/page citation for the authored stat block (doc/testing aid, not displayed). */
  source: string;
}

/**
 * One of the four Improved Familiar TEMPLATES applicable to any standard
 * animal species (celestial/fiendish from the CRB table's "celestial hawk" /
 * "fiendish viper" rows, generalized per the expanded published lists;
 * entropic/resolute from Bestiary 2). A templated animal keeps its species
 * stat block and master bonus and adds the template's senses/defenses; its
 * type gains a subtype but stays animal, so the animal class-skill rule
 * still applies.
 */
export interface FamiliarTemplate {
  id: string;
  /** Display name prefix ("Celestial"). */
  name: string;
  /** Senses added by the template (deduped against the species' own). */
  senses: string[];
  /**
   * Defensive qualities granted at a given Hit Dice count — the published
   * templates step their resistances/DR/SR by HD tier, and every
   * `BASE_FAMILIARS` animal is 1 HD today, but the tier math stays explicit
   * so a future multi-HD base doesn't silently get the wrong tier.
   */
  defensesForHd: (hd: number) => CreatureDefenses;
  /** Display note for the template's non-numeric ability ("smite evil 1/day..."). */
  note: string;
  /** Published-table prerequisites — soft warnings in the picker. */
  prereq: ImprovedFamiliarPrereq;
  /** Book/page citation (doc/testing aid). */
  source: string;
}
