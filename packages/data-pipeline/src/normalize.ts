import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import type {
  ArmorRef,
  Archetype,
  ArchetypeFeature,
  Buff,
  Class,
  ClassFeature,
  Domain,
  Feat,
  Item,
  Race,
  RefData,
  RefDataMeta,
  Spell,
  SpellList,
  WeaponRef,
  WizardSchool,
} from "@pf1/schema";

import { SCHEMA_VERSION, SLICE } from "./config.js";
import { transformArmor, isMundaneArmor } from "./transform/armor.js";
import {
  CLASS_ARCHETYPE_FILES,
  pairableBaseFeatureLevels,
  transformArchetypeRows,
} from "./transform/archetypes.js";
import { transformBuff } from "./transform/buffs.js";
import {
  transformClass,
  transformClassFeature,
  transformDomain,
  transformWizardSchool,
} from "./transform/classes.js";
import { transformFeat } from "./transform/feats.js";
import { transformItem } from "./transform/items.js";
import { transformRace } from "./transform/races.js";
import { transformSpell } from "./transform/spells.js";
import { resolveBloodlineSupplements } from "./supplements.js";
import { transformWeapon, isMundaneWeapon } from "./transform/weapons.js";
import { readCsv } from "./util/csv.js";
import { isFolderDoc, readPack, readPackById, type RawDoc } from "./util/packs.js";
import { makeUuid, parseUuid } from "./util/uuid.js";

export interface NormalizeOptions {
  packsDir: string;
  /** Directory containing the per-class archetype CSVs (`<Class>.csv`). */
  archetypeSourceDir: string;
  sourceRepo: string;
  sourceSha: string;
  systemVersion: string;
  /**
   * ISO timestamp recorded in meta. Pass the pinned commit's date (not the wall
   * clock) so regeneration is byte-for-byte deterministic and diff-friendly.
   */
  generatedAt: string;
}

function byId<T extends { id: string }>(items: T[]): Record<string, T> {
  const out: Record<string, T> = {};
  for (const it of items) out[it.id] = it;
  return out;
}

/**
 * Indexes every doc across every pack (not just the ones in this dataset's
 * slice) by uuid, so bare `@UUID[...]` enrichers in description prose can be
 * resolved to a display name even when they point outside the slice (e.g. a
 * buff describing a `technology` item). Keyed under both the well-formed
 * `Compendium.pf1.<pack>.Item.<id>` form and the `.Item.`-less form some
 * source prose uses.
 */
function buildUuidIndex(packsDir: string): Map<string, string> {
  const index = new Map<string, string>();
  for (const dirName of readdirSync(packsDir)) {
    if (!statSync(join(packsDir, dirName)).isDirectory()) continue;
    for (const pf of readPack(join(packsDir, dirName))) {
      index.set(makeUuid(dirName, pf.doc._id), pf.doc.name);
      index.set(`Compendium.pf1.${dirName}.${pf.doc._id}`, pf.doc.name);
    }
  }
  return index;
}

/** Build the normalized RefData slice from the source packs. */
export function normalize(opts: NormalizeOptions): {
  refData: RefData;
  contentVersion: string;
} {
  const { packsDir } = opts;

  const uuidIndex = buildUuidIndex(packsDir);
  const resolveUuid = (uuid: string): string | undefined => uuidIndex.get(uuid);

  // --- classes (filtered to the slice) + their resolved feature links --------
  const classFiles = readPack(join(packsDir, "classes")).filter((pf) => pf.doc.type === "class");
  const selectedClassDocs = classFiles
    .map((pf) => pf.doc)
    .filter((d) => (SLICE.classTags as readonly string[]).includes(asTag(d)));

  // Read the full class-abilities pack once (keyed by id) for resolution.
  const classAbilitiesById = readPackById(join(packsDir, "class-abilities"));

  // --- domains + wizard schools (top-level only; see Domain/WizardSchool docs) -
  // Foundry stores these as `type: feat` docs under class-abilities/domains/ and
  // class-abilities/wizard-schools/; each folder also contains a `type: Item`
  // folder-marker doc ("Druid Domains", "Subdomains", "Elemental Schools",
  // "Focused Schools") with no `system` at all, excluded by the `type === "feat"`
  // check. Nested subfolders (subdomains, druid-domains, elemental/focused
  // schools) are excluded by the relPath depth check — see IMPLEMENTATION_PLAN.md.
  const classAbilitiesDocs = [...classAbilitiesById.values()];
  const domainDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("domains/") &&
        pf.relPath.split("/").length === 2,
    )
    .map((pf) => pf.doc);
  const schoolDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("wizard-schools/") &&
        pf.relPath.split("/").length === 2,
    )
    .map((pf) => pf.doc);

  // Collect the feature ids referenced by selected classes + domains + schools.
  const referencedFeatureIds = new Set<string>();
  for (const cls of [...selectedClassDocs, ...domainDocs, ...schoolDocs]) {
    for (const uuid of supplementUuids(cls)) {
      const parsed = parseUuid(uuid);
      if (parsed?.pack === "class-abilities") referencedFeatureIds.add(parsed.id);
    }
  }

  const classFeatures: ClassFeature[] = [];
  for (const id of referencedFeatureIds) {
    const pf = classAbilitiesById.get(id);
    if (pf) classFeatures.push(transformClassFeature(pf.doc, resolveUuid));
  }
  const classFeaturesById = byId(classFeatures);

  const classes: Class[] = selectedClassDocs.map((d) =>
    transformClass(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
  );

  const domains: Domain[] = domainDocs.map((d) =>
    transformDomain(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
  );
  const wizardSchools: WizardSchool[] = schoolDocs
    .map((d) => transformWizardSchool(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid))
    .filter((s): s is WizardSchool => s !== null);

  // --- races (filtered to slice folders) -------------------------------------
  const races: Race[] = readPack(join(packsDir, "races"))
    .filter(
      (pf) =>
        pf.doc.type === "race" && SLICE.raceFolders.some((f) => pf.relPath.startsWith(`${f}/`)),
    )
    .map((pf) => transformRace(pf.doc, resolveUuid));

  // --- feats (all of them; prereq refs point within this set) ----------------
  const feats: Feat[] = readPack(join(packsDir, "feats"))
    .filter((pf) => pf.doc.type === "feat")
    .map((pf) => transformFeat(pf.doc, resolveUuid));

  // --- spells (those any sliced spell-list class can learn, OR a domain) -----
  // Domain-only spells (e.g. Control Winds — druid class, but Air domain L5)
  // would otherwise be dropped, taking their `learnedAt.domain` data with them.
  // Keeping any spell with a non-empty domain/subdomain entry lets us invert a
  // per-domain spell list for clerics.
  const spellListTags = new Set<string>(SLICE.spellListClassTags);
  const spells: Spell[] = [];
  for (const pf of readPack(join(packsDir, "spells"))) {
    if (pf.doc.type !== "spell") continue;
    const spell = transformSpell(pf.doc, resolveUuid);
    const hasClass = Object.keys(spell.learnedAt.class).some((t) => spellListTags.has(t));
    const hasDomain =
      Object.keys(spell.learnedAt.domain ?? {}).length > 0 ||
      Object.keys(spell.learnedAt.subdomain ?? {}).length > 0;
    const hasBloodline = Object.keys(spell.learnedAt.bloodline ?? {}).length > 0;
    if (hasClass || hasDomain || hasBloodline) spells.push(spell);
  }

  // --- per-class spell lists (invert learnedAt.class) ------------------------
  const spellLists: Record<string, SpellList> = {};
  for (const tag of spellListTags) {
    const list: SpellList = {};
    for (const spell of spells) {
      const lvl = spell.learnedAt.class[tag];
      if (lvl === undefined) continue;
      (list[lvl] ??= []).push(spell.id);
    }
    for (const lvl of Object.keys(list)) {
      list[Number(lvl)]!.sort();
    }
    spellLists[tag] = list;
  }

  // --- per-domain spell lists (invert learnedAt.domain + learnedAt.subdomain) -
  // Domain tags appear across all spells whose `learnedAt.domain`/`.subdomain`
  // is populated. A cleric's two chosen domains each grant a bonus prepared
  // slot per spell level (1–9), drawable from the matching list here.
  const domainTags = new Set<string>();
  for (const spell of spells) {
    for (const tag of Object.keys(spell.learnedAt.domain ?? {})) domainTags.add(tag);
    for (const tag of Object.keys(spell.learnedAt.subdomain ?? {})) domainTags.add(tag);
  }
  const domainSpellLists: Record<string, SpellList> = {};
  for (const tag of domainTags) {
    const list: SpellList = {};
    for (const spell of spells) {
      const lvl = spell.learnedAt.domain?.[tag] ?? spell.learnedAt.subdomain?.[tag];
      if (lvl === undefined) continue;
      (list[lvl] ??= []).push(spell.id);
    }
    for (const lvl of Object.keys(list)) {
      list[Number(lvl)]!.sort();
    }
    domainSpellLists[tag] = list;
  }

  // --- per-bloodline spell lists (invert learnedAt.bloodline) -----------------
  // A sorcerer's chosen bloodline grants bonus spells known at odd sorcerer
  // levels ≥3, drawable from this list. Bloodline-only spells (e.g. a spell
  // tagged "Abyssal" but not on the sorcerer class list) would otherwise be
  // dropped by the slice filter above — keep any spell with a non-empty
  // bloodline entry, mirroring the domain retain-term.
  const bloodlineTags = new Set<string>();
  for (const spell of spells) {
    for (const tag of Object.keys(spell.learnedAt.bloodline ?? {})) bloodlineTags.add(tag);
  }
  const bloodlineSpellLists: Record<string, SpellList> = {};
  for (const tag of bloodlineTags) {
    const list: SpellList = {};
    for (const spell of spells) {
      const lvl = spell.learnedAt.bloodline?.[tag];
      if (lvl === undefined) continue;
      (list[lvl] ??= []).push(spell.id);
    }
    for (const lvl of Object.keys(list)) list[Number(lvl)]!.sort();
    bloodlineSpellLists[tag] = list;
  }
  // Fill in bloodlines the upstream pack never tags (e.g. Aberrant) from the
  // hand-authored CRB supplement, resolved to vendored spell ids by name.
  const spellIdByName = new Map(spells.map((s) => [s.name, s.id]));
  Object.assign(
    bloodlineSpellLists,
    resolveBloodlineSupplements(spellIdByName, bloodlineSpellLists),
  );

  // --- buffs (all; small + engine-relevant) ----------------------------------
  const buffs: Buff[] = readPack(join(packsDir, "buffs"))
    .filter((pf) => pf.doc.type === "buff")
    .map((pf) => transformBuff(pf.doc, resolveUuid));

  // --- items (full usable breadth of the `items` pack) -----------------------
  // Every real (non-folder) doc in the pack is one of five Item subtypes —
  // loot, equipment, container, weapon (splash/thrown one-shots like
  // alchemist's fire), consumable (staves, rods, poisons) — all of which are
  // representable gear, so nothing is excluded by type. Folder documents are
  // interleaved in the same directory and excluded via `isFolderDoc` (their
  // own `type` field mirrors the folder's *content* type, e.g. "Item", not
  // "folder", so a naive type check doesn't catch them — see isFolderDoc doc
  // comment). Note: Foundry's pf1 system does not ship potions/scrolls/wands
  // as static compendium items — those are generated at runtime from the
  // spells compendium, so there is nothing to vendor for them here.
  const items: Item[] = readPack(join(packsDir, "items"))
    .filter((pf) => !isFolderDoc(pf.doc))
    .map((pf) => transformItem(pf.doc, resolveUuid));

  // --- armors & shields (mundane base gear; magic named suits excluded) ------
  const armors: ArmorRef[] = readPack(join(packsDir, "armors-and-shields"))
    .filter((pf) => isMundaneArmor(pf.doc))
    .map((pf) => transformArmor(pf.doc));

  // --- weapons (mundane base: simple / martial / exotic; magic + ammo excl) -
  const weapons: WeaponRef[] = readPack(join(packsDir, "weapons-and-ammo"))
    .filter((pf) => isMundaneWeapon(pf.doc))
    .map((pf) => transformWeapon(pf.doc));

  // Determine content (core) version from any doc's _stats.
  const contentVersion =
    selectedClassDocs[0]?._stats?.coreVersion ??
    classFiles[0]?.doc._stats?.coreVersion ??
    "unknown";

  // --- archetypes (third-party dataset; Foundry ships none — see config.ts) --
  const classesByTag = new Map(classes.map((c) => [c.tag, c]));
  const archetypes: Archetype[] = [];
  const archetypeFeatures: ArchetypeFeature[] = [];
  for (const [classTag, fileName] of Object.entries(CLASS_ARCHETYPE_FILES)) {
    const classDef = classesByTag.get(classTag);
    if (!classDef) continue; // class not in this slice yet

    const rows = readCsv(join(opts.archetypeSourceDir, fileName));
    const pairable = pairableBaseFeatureLevels(classDef);
    const result = transformArchetypeRows(classTag, rows, pairable);
    archetypes.push(...result.archetypes);
    archetypeFeatures.push(...result.archetypeFeatures);
  }

  const counts = {
    races: races.length,
    classes: classes.length,
    classFeatures: classFeatures.length,
    feats: feats.length,
    spells: spells.length,
    buffs: buffs.length,
    items: items.length,
    armors: armors.length,
    weapons: weapons.length,
    archetypes: archetypes.length,
    archetypeFeatures: archetypeFeatures.length,
    domainSpellLists: Object.keys(domainSpellLists).length,
    bloodlineSpellLists: Object.keys(bloodlineSpellLists).length,
    domains: domains.length,
    wizardSchools: wizardSchools.length,
  };

  const meta: RefDataMeta = {
    schemaVersion: SCHEMA_VERSION,
    dataVersion: `${opts.systemVersion}+${opts.sourceSha.slice(0, 12)}`,
    sourceRepo: opts.sourceRepo,
    sourceSha: opts.sourceSha,
    systemVersion: opts.systemVersion,
    contentVersion,
    generatedAt: opts.generatedAt,
    counts,
    hashes: {}, // filled by the emitter once files are written
  };

  const refData: RefData = {
    meta,
    races: byId(races),
    classes: byId(classes),
    classFeatures: classFeaturesById,
    feats: byId(feats),
    spells: byId(spells),
    buffs: byId(buffs),
    items: byId(items),
    spellLists,
    domainSpellLists,
    bloodlineSpellLists,
    armors: byId(armors),
    weapons: byId(weapons),
    archetypes: byId(archetypes),
    archetypeFeatures: byId(archetypeFeatures),
    domains: byId(domains),
    wizardSchools: byId(wizardSchools),
  };

  return { refData, contentVersion };
}

function asTag(doc: RawDoc): string {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return typeof sys.tag === "string" ? sys.tag : doc.name.toLowerCase();
}

function supplementUuids(doc: RawDoc): string[] {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const links = sys.links as Record<string, unknown> | undefined;
  const sup = Array.isArray(links?.supplements)
    ? (links!.supplements as Record<string, unknown>[])
    : [];
  return sup
    .map((s) => (typeof s.uuid === "string" ? s.uuid : null))
    .filter((u): u is string => u !== null);
}
