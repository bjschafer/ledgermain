/**
 * Clean-room table of the class abilities that let a caster apply a NAMED
 * metamagic feat to a spell at no increase to its slot, metered by a small
 * per-day allotment of their own (Ultimate Magic's magus arcana, the Heavens
 * mystery's Guiding Star and the Heavens spirit hex of the same name).
 * Hand-authored from the published text.
 *
 * These differ from the two abilities the web layer already models
 * (universalist Metamagic Mastery, Meta-Rage) on two axes, which is why they
 * need a table rather than a hardcoded branch:
 *   - The feat is NAMED by the ability, not chosen from what the caster
 *     knows: "cast a spell as if affected by the Empower Spell feat". The
 *     caster need not have the feat at all.
 *   - There is no vendored pool behind them. Magus arcana and oracle
 *     revelations are hand-authored selections (`magus-arcana.ts`,
 *     `oracle-revelations.ts`), so `deriveResourcePools` grows a one-use
 *     daily pool per selected entry off this table.
 *
 * Only the SLOT is waived, exactly as for the two abilities in
 * `apps/web/src/model/freeMetamagic.ts`: nothing here touches the save DC,
 * and Heighten is not on any of these feat lists anyway.
 */

import type { CharacterDoc } from "@pf1/schema";

/** Which `build.*` list carries the selection that grants the ability. */
export type FreeMetamagicGrantKind = "magusArcana" | "oracleRevelation" | "shamanHex";

export interface FreeMetamagicGrantDef {
  kind: FreeMetamagicGrantKind;
  /** Id within that list (`MAGUS_ARCANA` / `ORACLE_REVELATIONS` / `SHAMAN_SPIRITS` hex id). */
  selectionId: string;
  /** The class whose spell panel offers the free application. */
  classTag: string;
  /** Player-facing ability name — the pool row's label too. */
  label: string;
  /** Metamagic slugs (see `metamagic.ts`) the ability may apply; the caster need not own them. */
  featSlugs: readonly string[];
  /** Daily allotment. Every entry is once per day. */
  usesPerDay: number;
  /** At-table reminder shown on the free-application control. */
  note: string;
}

/** One magus arcana that mimics a single metamagic feat once per day (Ultimate Magic). */
function arcana(
  selectionId: string,
  label: string,
  slug: string,
  feat: string,
): FreeMetamagicGrantDef {
  return {
    kind: "magusArcana",
    selectionId,
    classTag: "magus",
    label,
    featSlugs: [slug],
    usesPerDay: 1,
    note: `Once per day, cast a spell as if it were modified by ${feat}, with no increase to its level or casting time.`,
  };
}

/**
 * Guiding Star's own feat list (Advanced Player's Guide, Heavens mystery, and
 * the Advanced Class Guide Heavens spirit hex that repeats it verbatim):
 * "once per night while outdoors, you can cast one spell as if it were
 * modified by the Empower Spell, Extend Spell, Silent Spell, or Still Spell
 * feat without increasing the spell's casting time or level."
 */
const GUIDING_STAR_FEATS = ["empower-spell", "extend-spell", "silent-spell", "still-spell"];

const GUIDING_STAR_NOTE =
  "Once per night, outdoors under an open sky, cast one spell as if it were modified by Empower, Extend, Silent, or Still Spell, with no increase to its level or casting time.";

export const FREE_METAMAGIC_GRANTS: readonly FreeMetamagicGrantDef[] = [
  arcana("empoweredMagic", "Empowered Magic", "empower-spell", "Empower Spell"),
  arcana("maximizedMagic", "Maximized Magic", "maximize-spell", "Maximize Spell"),
  arcana("quickenedMagic", "Quickened Magic", "quicken-spell", "Quicken Spell"),
  arcana("reachMagic", "Reach Magic", "reach-spell", "Reach Spell"),
  arcana("silentMagic", "Silent Magic", "silent-spell", "Silent Spell"),
  arcana("stillMagic", "Still Magic", "still-spell", "Still Spell"),
  {
    kind: "oracleRevelation",
    selectionId: "heavens:guidingStar",
    classTag: "oracle",
    label: "Guiding Star",
    featSlugs: GUIDING_STAR_FEATS,
    usesPerDay: 1,
    note: GUIDING_STAR_NOTE,
  },
  {
    kind: "shamanHex",
    selectionId: "heavens:guidingStar",
    classTag: "shaman",
    label: "Guiding Star",
    featSlugs: GUIDING_STAR_FEATS,
    usesPerDay: 1,
    note: GUIDING_STAR_NOTE,
  },
];

/**
 * The pool id a grant's daily allotment is tracked under — its own namespace
 * rather than a class-feature id, since none of these selections IS a
 * vendored class feature.
 */
export function freeMetamagicGrantPoolId(def: FreeMetamagicGrantDef): string {
  return `freeMetamagic:${def.kind}:${def.selectionId}`;
}

/** The `build.*` list a grant kind reads from. */
function selectionList(doc: CharacterDoc, kind: FreeMetamagicGrantKind): readonly string[] {
  switch (kind) {
    case "magusArcana":
      return doc.build.magusArcana ?? [];
    case "oracleRevelation":
      return doc.build.oracleRevelations ?? [];
    case "shamanHex":
      return doc.build.shamanHexes ?? [];
  }
}

/**
 * The grants this character has selected, gated on still having the granting
 * class in the loadout (a selection left behind after the class is dropped
 * grants nothing, same posture as every other stale-pick check).
 */
export function characterFreeMetamagicGrants(doc: CharacterDoc): FreeMetamagicGrantDef[] {
  return FREE_METAMAGIC_GRANTS.filter(
    (def) =>
      selectionList(doc, def.kind).includes(def.selectionId) &&
      doc.identity.classes.some((c) => c.tag === def.classTag),
  );
}
