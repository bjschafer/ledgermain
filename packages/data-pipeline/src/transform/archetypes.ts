import type { Archetype, ArchetypeFeature, Class } from "@pf1/schema";

/**
 * Attribution for the dataset's content (the original module + author). We
 * vendor from a cleaned fork (see config.ts ARCHETYPE_REPO/ARCHETYPE_SHA) but
 * credit belongs to the upstream module that compiled the content, not our
 * mechanical fix for its merge-conflict corruption.
 */
const CONTRIBUTOR_MODULE = "baileymh/pf1e-archetypes";

/**
 * Maps our class tag (RefData.classes[*].tag) to its CSV filename under
 * `source files/Archetypes/` in the archetype dataset. Only classes in our
 * slice (SLICE.classTags) are listed; a class missing here simply isn't
 * ingested yet.
 */
export const CLASS_ARCHETYPE_FILES: Record<string, string> = {
  fighter: "Fighter.csv",
  barbarian: "Barbarian.csv",
  wizard: "Wizard.csv",
  cleric: "Cleric.csv",
  sorcerer: "Sorcerer.csv",
  rogue: "Rogue UC.csv",
  paladin: "Paladin.csv",
  ranger: "Ranger.csv",
  bard: "Bard.csv",
};

/** A row from one of the per-class archetype CSVs (header-name-keyed). */
export type ArchetypeCsvRow = Record<string, string | undefined>;

function slug(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/**
 * Base-class (level → granted feature uuid) pairing candidates: only levels
 * where the class grants exactly one feature, and that feature isn't a
 * "Bonus Feat"-style slot (multiple unrelated picks share that level/name
 * across the game, so a level-only cross-ref can't disambiguate which one an
 * archetype replaces). Everything else stays unpaired — the UI shows the
 * archetype feature's own prose as a soft warning instead of a struck-through
 * swap.
 */
export function pairableBaseFeatureLevels(classDef: Class): Map<number, string> {
  const byLevel = new Map<number, { uuid: string; name: string }[]>();
  for (const f of classDef.features) {
    const grants = byLevel.get(f.level) ?? [];
    grants.push({ uuid: f.uuid, name: f.name });
    byLevel.set(f.level, grants);
  }

  const pairable = new Map<number, string>();
  for (const [level, grants] of byLevel) {
    if (grants.length !== 1) continue;
    if (/bonus feat/i.test(grants[0]!.name)) continue;
    pairable.set(level, grants[0]!.uuid);
  }
  return pairable;
}

/**
 * Transform one class's archetype CSV rows into `Archetype` + `ArchetypeFeature`
 * entries. Rows are grouped into archetypes by the `Archetype` column (each row
 * is one archetype class feature). No `changes` are emitted — see
 * `ArchetypeFeature`'s doc comment for why this dataset isn't a mechanics
 * source.
 */
export function transformArchetypeRows(
  classTag: string,
  rows: ArchetypeCsvRow[],
  pairable: Map<number, string>,
): { archetypes: Archetype[]; archetypeFeatures: ArchetypeFeature[] } {
  const archetypes: Archetype[] = [];
  const archetypeFeatures: ArchetypeFeature[] = [];
  const archetypeIdByName = new Map<string, string>();

  for (const row of rows) {
    const archetypeName = row.Archetype?.trim();
    const abilityName = row["Class Ability"]?.trim();
    const level = Number(row.Level?.trim());
    if (!archetypeName || !abilityName || !Number.isFinite(level)) continue;

    let archetypeId = archetypeIdByName.get(archetypeName);
    if (!archetypeId) {
      archetypeId = `${classTag}:${slug(archetypeName)}`;
      archetypeIdByName.set(archetypeName, archetypeId);
      archetypes.push({
        id: archetypeId,
        uuid: `archetype:${archetypeId}`,
        name: archetypeName,
        classTag,
        contributorModule: CONTRIBUTOR_MODULE,
      });
    }

    const featureId = `${archetypeId}:${slug(abilityName)}:${level}`;
    archetypeFeatures.push({
      id: featureId,
      uuid: `archetype-feature:${featureId}`,
      name: abilityName,
      archetypeId,
      classTag,
      level,
      description: row.Description,
      pairedBaseFeatureUuid: pairable.get(level),
    });
  }

  return { archetypes, archetypeFeatures };
}
