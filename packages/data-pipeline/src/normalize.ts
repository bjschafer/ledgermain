import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";

import type {
  AlchemistDiscovery,
  ArcanistExploit,
  ArmorRef,
  BloodragerBloodline,
  Buff,
  CavalierOrder,
  Class,
  ClassFeature,
  Domain,
  DruidDomain,
  Feat,
  InvestigatorTalent,
  Item,
  KineticWildTalent,
  MagusArcana,
  MediumSpirit,
  MesmeristBoldStare,
  MesmeristTrick,
  MonkKiPower,
  MonkStyleStrike,
  OccultistImplement,
  OracleCurse,
  OracleMystery,
  PhrenicAmplification,
  PsychicDiscipline,
  Race,
  RacialTrait,
  NinjaTrick,
  RagePower,
  RefData,
  RefDataMeta,
  RogueTalent,
  ShamanHex,
  ShamanSpirit,
  ShifterAspect,
  SlayerTalent,
  SorcererBloodline,
  Spell,
  SpellList,
  Subdomain,
  Trait,
  VigilanteSocialTalent,
  VigilanteTalent,
  WeaponRef,
  WitchHex,
  WitchPatron,
  WizardSchool,
} from "@pf1/schema";

import { SCHEMA_VERSION, SLICE } from "./config.js";
import { transformArmor, isMundaneArmor } from "./transform/armor.js";
import {
  loadLegacyArchetypeFeatureLevels,
  transformArchetypePack,
} from "./transform/archetypes.js";
import { transformBuff } from "./transform/buffs.js";
import {
  normalizeElementalSpellName,
  parseElementalSpellEntries,
  transformClass,
  transformClassFeature,
  transformDomain,
  transformElementalWizardSchool,
  transformWizardSchool,
} from "./transform/classes.js";
import { transformFeat } from "./transform/feats.js";
import { transformItem } from "./transform/items.js";
import { transformPrestigeClassPack } from "./transform/prestigeClasses.js";
import { transformRace } from "./transform/races.js";
import { transformRacialTrait } from "./transform/racialTraits.js";
import { transformSpell } from "./transform/spells.js";
import { transformTrait } from "./transform/traits.js";
import {
  isFullDomainSpellList,
  normalizeEntityName,
  parseDomainSpellEntries,
  parseSubdomainRefs,
  transformDruidDomain,
  transformSubdomain,
} from "./transform/subdomains.js";
import {
  applyArchetypeFeatureLevelSupplements,
  applyClassFeatureUsesSupplements,
  applyPrestigeClassSupplements,
  applySpellProjectileSupplements,
  resolveBloodlineSupplements,
  SUPPLEMENTAL_PRESTIGE_CLASSES,
} from "./supplements.js";
import { transformAlchemistDiscoveries } from "./transform/alchemistDiscoveries.js";
import { transformArcanistExploits } from "./transform/arcanistExploits.js";
import { transformBloodragerBloodlines } from "./transform/bloodragerBloodlines.js";
import { transformCavalierOrders } from "./transform/cavalierOrders.js";
import { transformInvestigatorTalents } from "./transform/investigatorTalents.js";
import { transformKineticWildTalents } from "./transform/kineticWildTalents.js";
import { transformMagusArcana } from "./transform/magusArcana.js";
import { transformMediumSpirits } from "./transform/mediumSpirits.js";
import { transformMesmeristBoldStares } from "./transform/mesmeristBoldStares.js";
import { transformMesmeristTricks } from "./transform/mesmeristTricks.js";
import { transformMonkKiPowers } from "./transform/monkKiPowers.js";
import { transformMonkStyleStrikes } from "./transform/monkStyleStrikes.js";
import { transformNinjaTricks } from "./transform/ninjaTricks.js";
import { transformOccultistImplements } from "./transform/occultistImplements.js";
import { transformOracleCurses } from "./transform/oracleCurses.js";
import { transformOracleMysteries } from "./transform/oracleMysteries.js";
import { transformPhrenicAmplifications } from "./transform/phrenicAmplifications.js";
import { transformPsychicDisciplines } from "./transform/psychicDisciplines.js";
import { transformRagePowers } from "./transform/ragePowers.js";
import { transformRogueTalents } from "./transform/rogueTalents.js";
import { transformShamanHexes } from "./transform/shamanHexes.js";
import { transformShamanSpirits } from "./transform/shamanSpirits.js";
import { transformShifterAspects } from "./transform/shifterAspects.js";
import { transformSlayerTalents } from "./transform/slayerTalents.js";
import { transformSorcererBloodlines } from "./transform/sorcererBloodlines.js";
import {
  transformVigilanteSocialTalents,
  transformVigilanteTalents,
} from "./transform/vigilanteTalents.js";
import { transformWeapon, isMundaneWeapon } from "./transform/weapons.js";
import { transformWitchHexes } from "./transform/witchHexes.js";
import { transformWitchPatrons } from "./transform/witchPatrons.js";
import { isFolderDoc, readPack, readPackById, type RawDoc } from "./util/packs.js";
import { readPfDataDictionary } from "./util/pfdata.js";
import { makeUuid, parseUuid } from "./util/uuid.js";

export interface NormalizeOptions {
  packsDir: string;
  /** `src/pf-archetypes` directory from the pinned archetype module clone. */
  archetypesDir: string;
  /** `src/pf-arch-features` directory from the pinned archetype module clone. */
  archFeaturesDir: string;
  /** `src/pf-prestige-classes` directory from the pinned archetype module clone. */
  prestigeClassesDir: string;
  /** `src/pf-prestige-features` directory from the pinned archetype module clone. */
  prestigeFeaturesDir: string;
  /**
   * Path to the previously-vendored `archetype-features.json` (typically
   * `OUTPUT_DIR`'s own copy, read before this run's `emit()` overwrites it) —
   * see `loadLegacyArchetypeFeatureLevels`'s doc comment. Optional: a
   * from-scratch build (no prior output) passes a nonexistent path and gets an
   * empty fallback map.
   */
  legacyArchetypeFeaturesJsonPath: string;
  /** `src/pf-feats` directory from the pinned PF1 Content module clone. */
  pfContentFeatsDir: string;
  /** `src/pf-traits` directory from the pinned PF1 Content module clone. */
  pfContentTraitsDir: string;
  /** `src/pf-racial-traits` directory from the pinned PF1 Content module clone. */
  pfContentRacialTraitsDir: string;
  /** `json` directory from the pinned Pf Data 1e clone. */
  pfDataJsonDir: string;
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

  // --- domains + wizard schools (+ their subdomain/druid/elemental variants) -
  // Foundry stores these as `type: feat` docs under class-abilities/domains/ and
  // class-abilities/wizard-schools/; each folder also contains a `type: Item`
  // folder-marker doc ("Druid Domains", "Subdomains", "Elemental Schools",
  // "Focused Schools") with no `system` at all, excluded by the `type === "feat"`
  // check. Nested subfolders are matched by their own relPath depth below; the
  // "focused-schools" variant-rule subfolder (nested inside both wizard-schools/
  // and wizard-schools/elemental-schools/) is never matched by any of them and
  // stays excluded — too niche a combination (a focused elemental sub-school) to
  // vendor.
  const classAbilitiesDocs = [...classAbilitiesById.values()];
  const domainDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("domains/") &&
        pf.relPath.split("/").length === 2,
    )
    .map((pf) => pf.doc);
  const subdomainDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("domains/subdomains/") &&
        pf.relPath.split("/").length === 3,
    )
    .map((pf) => pf.doc);
  const druidAnimalDomainDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("domains/druid-domains/animal-domains/") &&
        pf.relPath.split("/").length === 4,
    )
    .map((pf) => pf.doc);
  const druidTerrainDomainDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("domains/druid-domains/terrain-domains/") &&
        pf.relPath.split("/").length === 4,
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
  const elementalSchoolDocs = classAbilitiesDocs
    .filter(
      (pf) =>
        pf.doc.type === "feat" &&
        pf.relPath.startsWith("wizard-schools/elemental-schools/") &&
        pf.relPath.split("/").length === 3,
    )
    .map((pf) => pf.doc);

  // Collect the feature ids referenced by selected classes + domains + schools
  // (+ subdomains + elemental schools — druid domains carry no `links.supplements`
  // at all, see `DruidDomain` doc comment, so they contribute nothing here).
  const referencedFeatureIds = new Set<string>();
  for (const cls of [
    ...selectedClassDocs,
    ...domainDocs,
    ...schoolDocs,
    ...subdomainDocs,
    ...elementalSchoolDocs,
  ]) {
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
  applyClassFeatureUsesSupplements(classFeatures);
  const classFeaturesById = byId(classFeatures);

  const classes: Class[] = selectedClassDocs.map((d) =>
    transformClass(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
  );

  // --- prestige classes (hand-authored; the pinned Foundry pack ships none) --
  // Mutates `classes`/`classFeatures` in place (pushes the two supplemental
  // entries); throws loudly on any id/uuid/tag/name collision. See
  // `supplements.ts`'s doc comment for sourcing/verification notes.
  applyPrestigeClassSupplements(classes, classFeatures);

  // --- vendored prestige classes (issue #74 phase 2c) — the remaining
  // splatbook prestige classes the hand-authored CRB set above doesn't cover,
  // from the same third-party archetype module's prestige-class packs.
  // Mutates `classes`/`classFeatures` in place; skips any class whose name
  // matches a hand-authored entry (those stay authoritative) and throws
  // loudly on any other id/uuid/tag/name collision — see
  // `transformPrestigeClassPack`'s doc comment.
  transformPrestigeClassPack(
    opts.prestigeClassesDir,
    opts.prestigeFeaturesDir,
    new Set(SUPPLEMENTAL_PRESTIGE_CLASSES.map((c) => c.name)),
    classes,
    classFeatures,
    resolveUuid,
  );

  const domains: Domain[] = domainDocs.map((d) =>
    transformDomain(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
  );

  // --- subdomains: resolve each one's parent domain(s) from every top-level
  // domain's own "Subdomains:" description prose (not a structured link in
  // the source — see `transform/subdomains.ts` doc comments) -----------------
  const subdomainIds = new Set(subdomainDocs.map((d) => d._id));
  const subdomainIdByName = new Map(subdomainDocs.map((d) => [normalizeEntityName(d.name), d._id]));
  const subdomainParentTags = new Map<string, Set<string>>();
  for (const d of domainDocs) {
    const html = rawDescriptionHtml(d);
    const tag = d.name.replace(/ Domain$/, "");
    for (const ref of parseSubdomainRefs(html)) {
      // Prefer the linked id when it names a real subdomain in this slice;
      // fall back to matching the display name (a few links point at the
      // wrong doc, and a few names don't match their subdomain's real name —
      // see `SubdomainRef` doc comment).
      const subId =
        (ref.id && subdomainIds.has(ref.id) ? ref.id : undefined) ??
        subdomainIdByName.get(normalizeEntityName(ref.name));
      if (!subId) continue; // unresolvable against this slice — never crash, just skip
      let set = subdomainParentTags.get(subId);
      if (!set) {
        set = new Set();
        subdomainParentTags.set(subId, set);
      }
      set.add(tag);
    }
  }
  const subdomains: Subdomain[] = subdomainDocs.map((d) =>
    transformSubdomain(
      d,
      [...(subdomainParentTags.get(d._id) ?? [])].sort(),
      (id) => classFeaturesById[id]?.name ?? null,
      resolveUuid,
    ),
  );

  const druidDomains: DruidDomain[] = [
    ...druidAnimalDomainDocs.map((d) => transformDruidDomain(d, "animal", resolveUuid)),
    ...druidTerrainDomainDocs.map((d) => transformDruidDomain(d, "terrain", resolveUuid)),
  ];

  // Druid nature-bond domain spell lists — like subdomains, parsed from each
  // domain's own description prose (the source `@UUID`-links every domain
  // spell but tags NO spell by druid domain via `learnedAt`, so there's
  // nothing to invert). Parse the refs up front so the referenced spells
  // survive the spell slice below — most are off the druid class list (domain
  // slots exist precisely to prepare those).
  const druidDomainSpellRefs = new Map<string, { level: number; spellId: string }[]>();
  for (const doc of [...druidAnimalDomainDocs, ...druidTerrainDomainDocs]) {
    const dd = druidDomains.find((d) => d.id === doc._id);
    if (!dd) continue;
    druidDomainSpellRefs.set(dd.tag, parseDomainSpellEntries(rawDescriptionHtml(doc)));
  }
  const druidDomainSpellIds = new Set<string>();
  for (const entries of druidDomainSpellRefs.values()) {
    for (const e of entries) druidDomainSpellIds.add(e.spellId);
  }

  const wizardSchools: WizardSchool[] = [
    ...schoolDocs
      .map((d) =>
        transformWizardSchool(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
      )
      .filter((s): s is WizardSchool => s !== null),
    ...elementalSchoolDocs
      .map((d) =>
        transformElementalWizardSchool(d, (id) => classFeaturesById[id]?.name ?? null, resolveUuid),
      )
      .filter((s): s is WizardSchool => s !== null),
  ];

  // --- races (filtered to slice folders) -------------------------------------
  const races: Race[] = readPack(join(packsDir, "races"))
    .filter(
      (pf) =>
        pf.doc.type === "race" && SLICE.raceFolders.some((f) => pf.relPath.startsWith(`${f}/`)),
    )
    .map((pf) => transformRace(pf.doc, resolveUuid));

  // --- racial traits: pf1-content pf-racial-traits pack (alternate racial
  // traits only — the pack's standard-trait entries are dropped by
  // `transformRacialTrait`, see its doc comment) ------------------------------
  const racialTraits: RacialTrait[] = [];
  for (const pf of readPack(opts.pfContentRacialTraitsDir)) {
    if (pf.doc.type !== "feat") continue;
    const rt = transformRacialTrait(pf.doc, resolveUuid);
    if (rt) racialTraits.push(rt);
  }

  // --- feats: system pack (all of them; prereq refs point within this set) --
  const systemFeats: Feat[] = readPack(join(packsDir, "feats"))
    .filter((pf) => pf.doc.type === "feat")
    .map((pf) => transformFeat(pf.doc, resolveUuid));

  // --- feats: pf1-content community pack (adds ~3,250 splatbook feats the
  // system pack doesn't ship). Dedup by normalized name against the system
  // pack — on a collision the system record wins, since it's richer (`uses`,
  // `@UUID` prereq links, structured `sources`) — and within the community
  // pack itself (first-wins), in case it has internal near-dupes. The
  // community pack has no `@UUID` resolver index of its own, so any feat cross
  // -refs in its prose fall back to prose-only soft warnings (see prereqs.ts).
  const normalizeFeatName = (name: string): string => name.toLowerCase().replace(/[^a-z0-9]+/g, "");
  const systemFeatNames = new Set(systemFeats.map((f) => normalizeFeatName(f.name)));
  const seenPfContentNames = new Set<string>();
  const pfContentFeats: Feat[] = [];
  for (const pf of readPack(opts.pfContentFeatsDir)) {
    if (pf.doc.type !== "feat") continue;
    const key = normalizeFeatName(pf.doc.name);
    if (systemFeatNames.has(key) || seenPfContentNames.has(key)) continue;
    seenPfContentNames.add(key);
    pfContentFeats.push(transformFeat(pf.doc, resolveUuid));
  }

  const feats: Feat[] = [...systemFeats, ...pfContentFeats];

  // --- traits: pf1-content community pack (Foundry's own system pack ships
  // none — traits aren't part of the base game data, see `@pf1/engine`
  // `traits.ts`'s hand-authored 28-entry table for the pre-existing
  // clean-room content this catalog now sits alongside). Dedup within the
  // pack only (first-wins on an internal near-dupe by normalized name) —
  // there is no system pack to prefer, unlike feats. The hand-authored/
  // vendored reconciliation happens downstream in `@pf1/engine`'s
  // `mergedTraits`, not here, so every vendored trait is normalized and kept.
  const seenTraitNames = new Set<string>();
  const traits: Trait[] = [];
  for (const pf of readPack(opts.pfContentTraitsDir)) {
    if (pf.doc.type !== "feat") continue;
    const key = normalizeFeatName(pf.doc.name);
    if (seenTraitNames.has(key)) continue;
    seenTraitNames.add(key);
    traits.push(transformTrait(pf.doc, resolveUuid));
  }

  // --- spells (those any sliced spell-list class can learn, OR a domain) -----
  // Domain-only spells (e.g. Control Winds — druid class, but Air domain L5)
  // would otherwise be dropped, taking their `learnedAt.domain` data with them.
  // Keeping any spell with a non-empty domain/subdomain entry lets us invert a
  // per-domain spell list for clerics.
  const spellListTags = new Set<string>(SLICE.spellListClassTags);
  const allSpells: Spell[] = readPack(join(packsDir, "spells"))
    .filter((pf) => pf.doc.type === "spell")
    .map((pf) => transformSpell(pf.doc, resolveUuid));

  // --- elemental wizard school bonus-slot spell lists ------------------------
  // Resolved by NAME against every transformed spell (not just the slice): the
  // source lists these as free-text prose rather than `@UUID` links, so this
  // has to happen after `transformSpell` but before the slice filter below,
  // which retains whatever the lists reference.
  const spellIdByElementalName = new Map<string, string>();
  for (const spell of allSpells) {
    const key = normalizeElementalSpellName(spell.name);
    if (!spellIdByElementalName.has(key)) spellIdByElementalName.set(key, spell.id);
  }
  const resolveElementalSpellName = (name: string) =>
    spellIdByElementalName.get(normalizeElementalSpellName(name));
  const elementalSchoolSpellRefs = new Map<string, { level: number; spellId: string }[]>();
  for (const doc of elementalSchoolDocs) {
    const school = wizardSchools.find((s) => s.id === doc._id);
    if (!school) continue;
    elementalSchoolSpellRefs.set(
      school.tag,
      parseElementalSpellEntries(rawDescriptionHtml(doc), resolveElementalSpellName),
    );
  }
  const elementalSchoolSpellIds = new Set<string>();
  for (const entries of elementalSchoolSpellRefs.values()) {
    for (const e of entries) elementalSchoolSpellIds.add(e.spellId);
  }

  const spells: Spell[] = [];
  for (const spell of allSpells) {
    const hasClass = Object.keys(spell.learnedAt.class).some((t) => spellListTags.has(t));
    const hasDomain =
      Object.keys(spell.learnedAt.domain ?? {}).length > 0 ||
      Object.keys(spell.learnedAt.subdomain ?? {}).length > 0;
    const hasBloodline = Object.keys(spell.learnedAt.bloodline ?? {}).length > 0;
    const hasDruidDomain = druidDomainSpellIds.has(spell.id);
    const hasElementalSchool = elementalSchoolSpellIds.has(spell.id);
    if (hasClass || hasDomain || hasBloodline || hasDruidDomain || hasElementalSchool) {
      spells.push(spell);
    }
  }
  // Attach `@cl`-keyed projectile counts to the multi-projectile spells whose
  // count scales in prose, not their damage formula (Magic Missile, Scorching
  // Ray). Throws if a named spell is absent — a data-drift guard.
  applySpellProjectileSupplements(spells);

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

  // --- per-subdomain spell lists (merge each subdomain's own replacement/full
  // spell-list section onto its parent's domainSpellLists entry) -------------
  // Unlike domainSpellLists above, this isn't inverted from any spell's
  // `learnedAt` field — the vendored spell pack never tags a spell by
  // subdomain (see `RefData.subdomainSpellLists` doc comment) — it's parsed
  // from each subdomain doc's own description prose instead.
  const spellsById = byId(spells);
  const subdomainSpellLists: Record<string, SpellList> = {};
  for (const doc of subdomainDocs) {
    const sub = subdomains.find((s) => s.id === doc._id);
    if (!sub) continue;
    const html = rawDescriptionHtml(doc);
    const entries = parseDomainSpellEntries(html).filter((e) => spellsById[e.spellId]);
    const parentTag = sub.parentDomainTags[0];
    const parentList = parentTag ? domainSpellLists[parentTag] : undefined;
    const list: SpellList = {};
    if (!isFullDomainSpellList(html) && parentList) {
      for (const [lvl, ids] of Object.entries(parentList)) list[Number(lvl)] = [...ids];
    }
    for (const { level, spellId } of entries) list[level] = [spellId];
    if (Object.keys(list).length > 0) subdomainSpellLists[sub.tag] = list;
  }

  // --- per-druid-domain spell lists (parsed from each domain's own prose) ----
  // Nature bond grants a druid one domain spell slot per accessible level,
  // drawable from these. Built from the refs parsed above, dropping any spell
  // that didn't survive the slice (a handful reference spells outside the
  // vendored content — graceful degradation, the slot just won't offer them).
  const druidDomainSpellLists: Record<string, SpellList> = {};
  for (const [tag, entries] of druidDomainSpellRefs) {
    const list: SpellList = {};
    for (const { level, spellId } of entries) {
      if (!spellsById[spellId]) continue;
      (list[level] ??= []).push(spellId);
    }
    for (const lvl of Object.keys(list)) list[Number(lvl)]!.sort();
    if (Object.keys(list).length > 0) druidDomainSpellLists[tag] = list;
  }

  // --- per-elemental-school bonus-slot spell lists (parsed above) ------------
  // Every referenced spell survived the slice by construction (the filter
  // retains them), so nothing needs dropping here — unlike the druid domains,
  // whose refs are `@UUID`s that may point outside the vendored content.
  const elementalSchoolSpellLists: Record<string, SpellList> = {};
  for (const [tag, entries] of elementalSchoolSpellRefs) {
    const list: SpellList = {};
    for (const { level, spellId } of entries) {
      const ids = (list[level] ??= []);
      if (!ids.includes(spellId)) ids.push(spellId);
    }
    for (const lvl of Object.keys(list)) list[Number(lvl)]!.sort();
    if (Object.keys(list).length > 0) elementalSchoolSpellLists[tag] = list;
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
  const legacyArchetypeFeatureLevels = loadLegacyArchetypeFeatureLevels(
    opts.legacyArchetypeFeaturesJsonPath,
  );
  const { archetypes, archetypeFeatures } = transformArchetypePack(
    opts.archetypesDir,
    opts.archFeaturesDir,
    classesByTag,
    legacyArchetypeFeatureLevels,
    resolveUuid,
  );
  applyArchetypeFeatureLevelSupplements(archetypeFeatures);

  // --- rage powers (fourth-party dataset; Foundry ships only a stub — see
  // config.ts PFDATA_REPO/PFDATA_SHA and RagePower's doc comment) -----------
  const ragePowerDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_rage_powers.json"),
  );
  const ragePowers: RagePower[] = transformRagePowers(ragePowerDict);

  // --- witch hexes / general shaman hexes / magus arcana (fourth-party
  // dataset, issue #74 Phase 3b — same posture as rage powers above) --------
  const witchHexDict = readPfDataDictionary(join(opts.pfDataJsonDir, "class_ability_hexes.json"));
  const hexes: WitchHex[] = transformWitchHexes(witchHexDict);

  const shamanHexDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_shaman_hexes.json"),
  );
  const shamanHexes: ShamanHex[] = transformShamanHexes(shamanHexDict);

  const magusArcanaDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_magus_arcana.json"),
  );
  const magusArcana: MagusArcana[] = transformMagusArcana(magusArcanaDict);

  // --- rogue-family talent catalogs (fourth-party dataset, issue #74 Phase 3b) -
  const rogueTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_rogue_talents.json"),
  );
  const rogueTalents: RogueTalent[] = transformRogueTalents(rogueTalentDict);

  const ninjaTrickDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_ninja_tricks.json"),
  );
  const ninjaTricks: NinjaTrick[] = transformNinjaTricks(ninjaTrickDict);

  const slayerTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_slayer_talents.json"),
  );
  const slayerTalents: SlayerTalent[] = transformSlayerTalents(slayerTalentDict);

  const vigilanteTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_vigilante_talents.json"),
  );
  const vigilanteTalents: VigilanteTalent[] = transformVigilanteTalents(vigilanteTalentDict);

  const vigilanteSocialTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_social_talents.json"),
  );
  const vigilanteSocialTalents: VigilanteSocialTalent[] =
    transformVigilanteSocialTalents(vigilanteSocialTalentDict);

  // --- arcanist exploits / investigator talents / kineticist wild talents
  // (fourth-party dataset, Phase 3b) — same posture as rage powers above.
  const arcanistExploitDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_exploits.json"),
  );
  const arcanistExploits: ArcanistExploit[] = transformArcanistExploits(arcanistExploitDict);

  const investigatorTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_investigator_talents.json"),
  );
  const investigatorTalents: InvestigatorTalent[] =
    transformInvestigatorTalents(investigatorTalentDict);

  const kineticTalentDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_kinetic_talents.json"),
  );
  const kineticWildTalents: KineticWildTalent[] = transformKineticWildTalents(kineticTalentDict);

  // --- mesmerist tricks/bold stares, phrenic amplifications, psychic
  // disciplines, occultist implements, Medium legendary spirits (fourth-party
  // dataset, issue #74 Phase 3c) — same posture as rage powers above.
  const mesmeristTrickDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_tricks.json"),
  );
  const mesmeristTricks: MesmeristTrick[] = transformMesmeristTricks(mesmeristTrickDict);

  const mesmeristBoldStareDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_stares.json"),
  );
  const mesmeristBoldStares: MesmeristBoldStare[] =
    transformMesmeristBoldStares(mesmeristBoldStareDict);

  const phrenicAmplificationDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_phrenic_amplifications.json"),
  );
  const phrenicAmplifications: PhrenicAmplification[] =
    transformPhrenicAmplifications(phrenicAmplificationDict);

  const psychicDisciplineDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_disciplines.json"),
  );
  const psychicDisciplines: PsychicDiscipline[] =
    transformPsychicDisciplines(psychicDisciplineDict);

  const occultistImplementDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_implements.json"),
  );
  const occultistImplements: OccultistImplement[] =
    transformOccultistImplements(occultistImplementDict);

  // NOT `class_ability_shaman_spirits.json` — that's the sibling shaman-spirit
  // file (already vendored elsewhere); see `MediumSpirit`'s doc comment.
  const mediumSpiritDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_spirits.json"),
  );
  const mediumSpirits: MediumSpirit[] = transformMediumSpirits(mediumSpiritDict);

  // --- oracle mysteries/curses, witch patrons, shaman spirits, sorcerer/
  // bloodrager bloodlines (fourth-party dataset, issue #74 Phase 3c) — same
  // posture as rage powers above.
  const oracleMysteryDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_mysteries.json"),
  );
  const oracleMysteries: OracleMystery[] = transformOracleMysteries(oracleMysteryDict);

  const oracleCurseDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_curses.json"),
  );
  const oracleCurses: OracleCurse[] = transformOracleCurses(oracleCurseDict);

  const witchPatronDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_patrons.json"),
  );
  const witchPatrons: WitchPatron[] = transformWitchPatrons(witchPatronDict);

  const shamanSpiritDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_shaman_spirits.json"),
  );
  const shamanSpirits: ShamanSpirit[] = transformShamanSpirits(shamanSpiritDict);

  const sorcererBloodlineDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_sorcerer_bloodlines.json"),
  );
  const sorcererBloodlines: SorcererBloodline[] =
    transformSorcererBloodlines(sorcererBloodlineDict);

  const bloodragerBloodlineDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_bloodrager_bloodlines.json"),
  );
  const bloodragerBloodlines: BloodragerBloodline[] =
    transformBloodragerBloodlines(bloodragerBloodlineDict);

  // --- alchemist discoveries / monk (unchained) ki powers + style strikes /
  // cavalier orders / shifter aspects (fourth-party dataset, issue #74 Phase
  // 3c) — same posture as rage powers above.
  const alchemistDiscoveryDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_discoveries.json"),
  );
  const alchemistDiscoveries: AlchemistDiscovery[] =
    transformAlchemistDiscoveries(alchemistDiscoveryDict);

  const monkKiPowerDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_ki_powers.json"),
  );
  const monkKiPowers: MonkKiPower[] = transformMonkKiPowers(monkKiPowerDict);

  const monkStyleStrikeDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_style_strikes.json"),
  );
  const monkStyleStrikes: MonkStyleStrike[] = transformMonkStyleStrikes(monkStyleStrikeDict);

  const cavalierOrderDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_orders.json"),
  );
  const cavalierOrders: CavalierOrder[] = transformCavalierOrders(cavalierOrderDict);

  const shifterAspectDict = readPfDataDictionary(
    join(opts.pfDataJsonDir, "class_ability_aspects.json"),
  );
  const shifterAspects: ShifterAspect[] = transformShifterAspects(shifterAspectDict);

  const counts = {
    races: races.length,
    racialTraits: racialTraits.length,
    classes: classes.length,
    classFeatures: classFeatures.length,
    feats: feats.length,
    traits: traits.length,
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
    subdomains: subdomains.length,
    subdomainSpellLists: Object.keys(subdomainSpellLists).length,
    druidDomains: druidDomains.length,
    druidDomainSpellLists: Object.keys(druidDomainSpellLists).length,
    elementalSchoolSpellLists: Object.keys(elementalSchoolSpellLists).length,
    wizardSchools: wizardSchools.length,
    ragePowers: ragePowers.length,
    hexes: hexes.length,
    shamanHexes: shamanHexes.length,
    magusArcana: magusArcana.length,
    rogueTalents: rogueTalents.length,
    ninjaTricks: ninjaTricks.length,
    slayerTalents: slayerTalents.length,
    vigilanteTalents: vigilanteTalents.length,
    vigilanteSocialTalents: vigilanteSocialTalents.length,
    arcanistExploits: arcanistExploits.length,
    investigatorTalents: investigatorTalents.length,
    kineticWildTalents: kineticWildTalents.length,
    mesmeristTricks: mesmeristTricks.length,
    mesmeristBoldStares: mesmeristBoldStares.length,
    phrenicAmplifications: phrenicAmplifications.length,
    psychicDisciplines: psychicDisciplines.length,
    occultistImplements: occultistImplements.length,
    mediumSpirits: mediumSpirits.length,
    oracleMysteries: oracleMysteries.length,
    oracleCurses: oracleCurses.length,
    witchPatrons: witchPatrons.length,
    shamanSpirits: shamanSpirits.length,
    sorcererBloodlines: sorcererBloodlines.length,
    bloodragerBloodlines: bloodragerBloodlines.length,
    alchemistDiscoveries: alchemistDiscoveries.length,
    monkKiPowers: monkKiPowers.length,
    monkStyleStrikes: monkStyleStrikes.length,
    cavalierOrders: cavalierOrders.length,
    shifterAspects: shifterAspects.length,
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
    racialTraits: byId(racialTraits),
    classes: byId(classes),
    // Recomputed (not the earlier `classFeaturesById`) so the prestige-class
    // supplement pushed onto `classFeatures` above is included — the earlier
    // dict was a snapshot taken before that push, deliberately kept for the
    // domains/wizard-schools resolvers above (which must never see synthetic
    // prestige features).
    classFeatures: byId(classFeatures),
    feats: byId(feats),
    traits: byId(traits),
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
    subdomains: byId(subdomains),
    subdomainSpellLists,
    druidDomains: byId(druidDomains),
    druidDomainSpellLists,
    elementalSchoolSpellLists,
    wizardSchools: byId(wizardSchools),
    ragePowers: byId(ragePowers),
    hexes: byId(hexes),
    shamanHexes: byId(shamanHexes),
    magusArcana: byId(magusArcana),
    rogueTalents: byId(rogueTalents),
    ninjaTricks: byId(ninjaTricks),
    slayerTalents: byId(slayerTalents),
    vigilanteTalents: byId(vigilanteTalents),
    vigilanteSocialTalents: byId(vigilanteSocialTalents),
    arcanistExploits: byId(arcanistExploits),
    investigatorTalents: byId(investigatorTalents),
    kineticWildTalents: byId(kineticWildTalents),
    mesmeristTricks: byId(mesmeristTricks),
    mesmeristBoldStares: byId(mesmeristBoldStares),
    phrenicAmplifications: byId(phrenicAmplifications),
    psychicDisciplines: byId(psychicDisciplines),
    occultistImplements: byId(occultistImplements),
    mediumSpirits: byId(mediumSpirits),
    oracleMysteries: byId(oracleMysteries),
    oracleCurses: byId(oracleCurses),
    witchPatrons: byId(witchPatrons),
    shamanSpirits: byId(shamanSpirits),
    sorcererBloodlines: byId(sorcererBloodlines),
    bloodragerBloodlines: byId(bloodragerBloodlines),
    alchemistDiscoveries: byId(alchemistDiscoveries),
    monkKiPowers: byId(monkKiPowers),
    monkStyleStrikes: byId(monkStyleStrikes),
    cavalierOrders: byId(cavalierOrders),
    shifterAspects: byId(shifterAspects),
  };

  return { refData, contentVersion };
}

function asTag(doc: RawDoc): string {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return typeof sys.tag === "string" ? sys.tag : doc.name.toLowerCase();
}

/** Raw (unresolved) `system.description.value` HTML, for text-parsing a doc before `descriptionValue` resolves its `@UUID` enrichers. */
function rawDescriptionHtml(doc: RawDoc): string {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const d = sys.description as Record<string, unknown> | undefined;
  return typeof d?.value === "string" ? d.value : "";
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
