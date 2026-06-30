import { join } from "node:path";

import type {
  ArmorRef,
  Buff,
  Class,
  ClassFeature,
  Feat,
  Item,
  Race,
  RefData,
  RefDataMeta,
  Spell,
  SpellList,
  WeaponRef,
} from "@pf1/schema";

import { SCHEMA_VERSION, SLICE } from "./config.js";
import { transformArmor, isMundaneArmor } from "./transform/armor.js";
import { transformBuff } from "./transform/buffs.js";
import { transformClass, transformClassFeature } from "./transform/classes.js";
import { transformFeat } from "./transform/feats.js";
import { transformItem } from "./transform/items.js";
import { transformRace } from "./transform/races.js";
import { transformSpell } from "./transform/spells.js";
import { transformWeapon, isMundaneWeapon } from "./transform/weapons.js";
import { readPack, readPackById, type RawDoc } from "./util/packs.js";
import { parseUuid } from "./util/uuid.js";

export interface NormalizeOptions {
  packsDir: string;
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

/** Build the normalized RefData slice from the source packs. */
export function normalize(opts: NormalizeOptions): {
  refData: RefData;
  contentVersion: string;
} {
  const { packsDir } = opts;

  // --- classes (filtered to the slice) + their resolved feature links --------
  const classFiles = readPack(join(packsDir, "classes")).filter(
    (pf) => pf.doc.type === "class",
  );
  const selectedClassDocs = classFiles
    .map((pf) => pf.doc)
    .filter((d) => (SLICE.classTags as readonly string[]).includes(asTag(d)));

  // Read the full class-abilities pack once (keyed by id) for resolution.
  const classAbilitiesById = readPackById(join(packsDir, "class-abilities"));

  // Collect the feature ids referenced by selected classes.
  const referencedFeatureIds = new Set<string>();
  for (const cls of selectedClassDocs) {
    for (const uuid of supplementUuids(cls)) {
      const parsed = parseUuid(uuid);
      if (parsed?.pack === "class-abilities") referencedFeatureIds.add(parsed.id);
    }
  }

  const classFeatures: ClassFeature[] = [];
  for (const id of referencedFeatureIds) {
    const pf = classAbilitiesById.get(id);
    if (pf) classFeatures.push(transformClassFeature(pf.doc));
  }
  const classFeaturesById = byId(classFeatures);

  const classes: Class[] = selectedClassDocs.map((d) =>
    transformClass(d, (id) => classFeaturesById[id]?.name ?? null),
  );

  // --- races (filtered to slice folders) -------------------------------------
  const races: Race[] = readPack(join(packsDir, "races"))
    .filter(
      (pf) =>
        pf.doc.type === "race" &&
        SLICE.raceFolders.some((f) => pf.relPath.startsWith(`${f}/`)),
    )
    .map((pf) => transformRace(pf.doc));

  // --- feats (all of them; prereq refs point within this set) ----------------
  const feats: Feat[] = readPack(join(packsDir, "feats"))
    .filter((pf) => pf.doc.type === "feat")
    .map((pf) => transformFeat(pf.doc));

  // --- spells (those any sliced spell-list class can learn) ------------------
  const spellListTags = new Set<string>(SLICE.spellListClassTags);
  const spells: Spell[] = [];
  for (const pf of readPack(join(packsDir, "spells"))) {
    if (pf.doc.type !== "spell") continue;
    const spell = transformSpell(pf.doc);
    if (Object.keys(spell.learnedAt.class).some((t) => spellListTags.has(t))) {
      spells.push(spell);
    }
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

  // --- buffs (all; small + engine-relevant) ----------------------------------
  const buffs: Buff[] = readPack(join(packsDir, "buffs"))
    .filter((pf) => pf.doc.type === "buff")
    .map((pf) => transformBuff(pf.doc));

  // --- items (engine-relevant subset: those carrying typed modifiers) --------
  const items: Item[] = readPack(join(packsDir, "items"))
    .filter((pf) => pf.doc.type !== "folder")
    .map((pf) => transformItem(pf.doc))
    .filter((it) => it.changes.length > 0);

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
    armors: byId(armors),
    weapons: byId(weapons),
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
