/**
 * Foundry VTT importer: reads a PF1 actor's "Export Data" JSON (the actor's
 * `toObject()`, written against real exports from the pf1 build our RefData
 * is pinned to) into a fresh CharacterDoc.
 *
 * Unlike the name-matching importers, most of this maps by id: an item copied
 * from a compendium records `_stats.compendiumSource`
 * (`Compendium.pf1.<pack>.Item.<id>`), and RefData is keyed by those same
 * ids. Names are the fallback for items created by hand. Archetypes are the
 * exception: RefData keys them `<class tag>:<slug>`, so the archetype item's
 * name is matched against each of the character's classes. Class features
 * and standard racial traits are skipped rather than imported, since the
 * engine grants them from class level, archetype and race; anything else
 * that can't be matched is reported, never guessed.
 */
import {
  alternateRacialTraitsForRace,
  CONDITIONS,
  compute,
  mergedTraits,
  raceGrantsFlexibleAbility,
} from "@pf1/engine";
import {
  ABILITY_IDS,
  normalizeSkillId,
  type AbilityId,
  type CharacterDoc,
  type RefData,
} from "@pf1/schema";

import { addBuff, makeActiveBuff } from "./buffs.js";
import { activateConditionIn } from "./conditions.js";
import {
  addClass,
  addCustomGearItem,
  addFeatInstance,
  addWeaponFromRef,
  addWornArmorFromRef,
  appendGear,
  createEmptyDoc,
  setAbility,
  setAlignment,
  setClassLevel,
  setFlexibleAbility,
  setArchetypes,
  setHpMode,
  setHpRoll,
  setMoney,
  setName,
  setRace,
  setSkillRank,
} from "./doc.js";
import { setAbilityAffliction, setNegativeLevels } from "./afflictions.js";
import {
  buildClassTagIndex,
  buildNameIndex,
  nameSlug,
  type ImportReport,
} from "./externalImport.js";
import { featChoiceDescriptor } from "./feats.js";
import { localId } from "./ids.js";
import { SKILL_NAMES } from "./names.js";
import {
  hasRacialTrait,
  hasVendoredRacialTrait,
  normalizeTraitName,
  toggleRacialTrait,
  toggleVendoredRacialTrait,
} from "./racialTraits.js";
import { hasTrait, toggleTrait, traitChoiceDescriptor } from "./traits.js";

type Dict = Record<string, unknown>;

function isDict(value: unknown): value is Dict {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function num(value: unknown): number | undefined {
  return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function str(value: unknown): string | undefined {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

/** Foundry keys `changes` by random id; older exports used an array. */
function values(value: unknown): Dict[] {
  if (Array.isArray(value)) return value.filter(isDict);
  if (isDict(value)) return Object.values(value).filter(isDict);
  return [];
}

interface FoundryItem {
  type: string;
  name: string;
  system: Dict;
  /** RefData id from the item's compendium source, when it has one. */
  sourceId?: string;
  /** The source compendium's pack name (`feats`, `pf-archetypes`). */
  sourcePack?: string;
}

const COMPENDIUM_SOURCE = /^Compendium\.[^.]+\.([^.]+)\.Item\.([^.]+)$/;

function readItem(raw: unknown): FoundryItem | undefined {
  if (!isDict(raw)) return undefined;
  const type = str(raw.type);
  const name = str(raw.name);
  if (!type || !name) return undefined;
  const stats = isDict(raw._stats) ? raw._stats : {};
  const source = str(stats.compendiumSource)?.match(COMPENDIUM_SOURCE);
  return {
    type,
    name,
    system: isDict(raw.system) ? raw.system : {},
    ...(source ? { sourcePack: source[1], sourceId: source[2] } : {}),
  };
}

/**
 * The RefData archetype id for an archetype item named `"Fighter (Two-Handed
 * Fighter)"`, tried against each of the character's classes. The data
 * pipeline keys archetypes by class tag plus a slug of that parenthesized name.
 */
function archetypeIdFor(itemName: string, doc: CharacterDoc, refData: RefData): string | undefined {
  const open = itemName.indexOf("(");
  const bare = open < 0 ? itemName : itemName.slice(open + 1).replace(/\)$/, "");
  const slug = bare
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return doc.identity.classes
    .map((c) => `${c.tag}:${slug}`)
    .find((id) => refData.archetypes[id] !== undefined);
}

/**
 * True for a Foundry actor export: an object with Foundry's `type`, a
 * `system` block and an `items` array. A Ledgermain export has none of the
 * three, a Pathbuilder export at most a loose subset.
 */
export function isFoundryActorExport(value: unknown): value is Dict {
  return (
    isDict(value) &&
    (value.type === "character" || value.type === "npc") &&
    isDict(value.system) &&
    Array.isArray(value.items)
  );
}

/** Foundry condition ids that Ledgermain spells differently. */
const CONDITION_ALIASES: Record<string, string> = { blind: "blinded", deaf: "deafened" };

/** Item types that carry no build choice of their own. */
const IGNORED_TYPES: Record<string, true> = { spellcasting: true, attack: true };

/**
 * Resolve an item against one RefData collection: by compendium id first,
 * then by name. Returns the matching id.
 */
function resolve<T extends { name: string }>(
  item: FoundryItem,
  collection: Record<string, T>,
  nameIndex: () => Map<string, string>,
): string | undefined {
  if (item.sourceId && collection[item.sourceId]) return item.sourceId;
  return nameIndex().get(nameSlug(item.name));
}

function lazy<T>(make: () => T): () => T {
  let value: T | undefined;
  return () => (value ??= make());
}

export function importFoundryActor(
  actor: Dict,
  refData: RefData,
): { doc: CharacterDoc; report: ImportReport } {
  const report: ImportReport = { source: "foundry", mapped: [], unmapped: [] };
  const system = isDict(actor.system) ? actor.system : {};
  const attributes = isDict(system.attributes) ? system.attributes : {};
  const details = isDict(system.details) ? system.details : {};
  const items = (Array.isArray(actor.items) ? actor.items : [])
    .map(readItem)
    .filter((i): i is FoundryItem => i != null);

  const raceIdx = lazy(() => buildNameIndex(refData.races));
  const featIdx = lazy(() => buildNameIndex(refData.feats));
  const armorIdx = lazy(() => buildNameIndex(refData.armors));
  const itemIdx = lazy(() => buildNameIndex(refData.items));
  const weaponIdx = lazy(() => buildNameIndex(refData.weapons));
  const buffIdx = lazy(() => buildNameIndex(refData.buffs));
  const classTagIdx = lazy(() => buildClassTagIndex(refData));
  const traitCatalog = lazy(() => mergedTraits(refData));
  const traitIdx = lazy(() => buildNameIndex(traitCatalog()));

  let doc = createEmptyDoc(localId("import-"));
  const name = str(actor.name);
  if (name) doc = setName(doc, name);
  const alignment = str(details.alignment);
  if (alignment) doc = setAlignment(doc, alignment);

  // Race, and the flexible +2: Foundry's race item has no ability change for
  // it, so a player adds a racial change to the race item themselves.
  const race = items.find((i) => i.type === "race");
  if (race) {
    const raceId = resolve(race, refData.races, raceIdx);
    if (raceId) {
      doc = setRace(doc, raceId);
      report.mapped.push(`Race: ${refData.races[raceId]!.name}`);
      if (raceGrantsFlexibleAbility(refData.races[raceId]!)) {
        const flex = values(race.system.changes).find(
          (c) => c.type === "racial" && ABILITY_IDS.includes(c.target as AbilityId),
        );
        if (flex) {
          const ability = flex.target as AbilityId;
          doc = setFlexibleAbility(doc, ability);
          report.mapped.push(`Racial +2 ability choice: ${ability.toUpperCase()}`);
        } else {
          report.unmapped.push(
            `${race.name} picks which ability gets its +2 and the export didn't record one; pick it on the Race step.`,
          );
        }
      }
    } else {
      report.unmapped.push(`Race "${race.name}" not found in reference data; left unset.`);
    }
  }

  // Classes, in item order: Foundry appends each class as it's taken.
  const classHp: { tag: string; level: number; hp: number | undefined }[] = [];
  for (const cls of items.filter((i) => i.type === "class")) {
    const level = Math.max(1, Math.round(num(cls.system.level) ?? 1));
    const fromId = cls.sourceId ? refData.classes[cls.sourceId]?.tag : undefined;
    const tag = fromId ?? classTagIdx().get(nameSlug(cls.name));
    if (!tag) {
      report.unmapped.push(`Class "${cls.name}" (level ${level}) not found; not added.`);
      continue;
    }
    doc = addClass(doc, tag);
    doc = setClassLevel(doc, tag, level);
    classHp.push({ tag, level, hp: num(cls.system.hp) });
    report.mapped.push(`Class: ${cls.name} ${level}`);
    if (cls.system.fc != null) {
      report.unmapped.push(
        `Favored class bonuses on ${cls.name} weren't imported; set them on the Favored Class step.`,
      );
    }
  }
  doc = applyClassHp(doc, refData, classHp, report);

  const abilities = isDict(system.abilities) ? system.abilities : {};
  for (const ability of ABILITY_IDS) {
    const entry = isDict(abilities[ability]) ? abilities[ability] : {};
    const score = num(entry.value);
    if (score != null) doc = setAbility(doc, ability, score);
    const drain = num(entry.drain);
    if (drain) doc = setAbilityAffliction(doc, "drain", ability, drain);
    const damage = num(entry.damage);
    if (damage) doc = setAbilityAffliction(doc, "damage", ability, damage);
    const penalty = num(entry.userPenalty);
    if (penalty) doc = setAbilityAffliction(doc, "penalty", ability, penalty);
  }

  let classFeatures = 0;
  let racialTraits = 0;
  let spells = 0;
  const archetypes: string[] = [];
  for (const item of items) {
    switch (item.type) {
      case "race":
      case "class":
        break;
      case "skill": {
        const rank = num(item.system.rank) ?? 0;
        if (rank <= 0) break;
        const key = str(item.system.identifier);
        const grouping = str(item.system.grouping);
        const id = key && normalizeSkillId(grouping ? `${grouping}.${key}` : key);
        if (id && SKILL_NAMES[id.split(".")[0]!]) {
          doc = setSkillRank(doc, id, Math.round(rank));
          report.mapped.push(`Skill: ${item.name} (${rank} ranks)`);
        } else {
          report.unmapped.push(`Skill "${item.name}" (${rank} ranks) not recognized; not added.`);
        }
        break;
      }
      case "feat": {
        const subType = str(item.system.subType);
        if (subType === "classFeat") {
          classFeatures++;
          break;
        }
        if (subType === "racial") {
          const mapped = importRacialTrait(doc, item, refData, report);
          if (mapped) doc = mapped;
          else racialTraits++;
          break;
        }
        if (subType === "trait") {
          const traitId = resolve(item, traitCatalog(), traitIdx);
          if (!traitId) {
            report.unmapped.push(`Trait "${item.name}" not found in reference data; not added.`);
            break;
          }
          if (!hasTrait(doc, traitId)) doc = toggleTrait(doc, traitId);
          const traitName = traitCatalog()[traitId]!.name;
          if (traitChoiceDescriptor(traitId)) {
            report.unmapped.push(`Trait: ${traitName} needs its choice picked on the Traits step.`);
          } else {
            report.mapped.push(`Trait: ${traitName}`);
          }
          break;
        }
        if (item.sourcePack === "pf-archetypes") {
          const archetypeId = archetypeIdFor(item.name, doc, refData);
          if (archetypeId) {
            archetypes.push(archetypeId);
            report.mapped.push(`Archetype: ${item.name}`);
          } else {
            report.unmapped.push(
              `Archetype "${item.name}" not found for this character's classes; pick it on the Classes step.`,
            );
          }
          break;
        }
        if (subType !== "feat") {
          report.unmapped.push(
            `${item.name} (${subType ?? "feature"}) wasn't imported; add it by hand.`,
          );
          break;
        }
        const featId = resolve(item, refData.feats, featIdx);
        if (!featId) {
          report.unmapped.push(`Feat "${item.name}" not found in reference data; not added.`);
          break;
        }
        doc = addFeatInstance(doc, featId);
        const featName = refData.feats[featId]!.name;
        if (featChoiceDescriptor(featName)) {
          report.unmapped.push(`Feat: ${featName} needs its choice picked on the Feats step.`);
        } else {
          report.mapped.push(`Feat: ${featName}`);
        }
        break;
      }
      case "equipment": {
        const equipped = item.system.equipped === true;
        const subType = str(item.system.subType);
        if (subType === "armor" || subType === "shield") {
          const armorId = resolve(item, refData.armors, armorIdx);
          if (!armorId) {
            report.unmapped.push(
              `Armor "${item.name}" not found in reference data; add it on the Armor step so it counts toward AC.`,
            );
            break;
          }
          const armor = isDict(item.system.armor) ? item.system.armor : {};
          const material =
            isDict(armor.material) && isDict(armor.material.base)
              ? str(armor.material.base.value)
              : undefined;
          const enh = num(armor.enh) ?? 0;
          doc = addWornArmorFromRef(
            doc,
            refData.armors[armorId]!,
            enh,
            material,
            undefined,
            item.system.masterwork === true,
          );
          if (!equipped) {
            const gear = doc.build.gear.map((g, i, all) =>
              i === all.length - 1 ? { ...g, equipped: false } : g,
            );
            doc = { ...doc, build: { ...doc.build, gear } };
          }
          report.mapped.push(
            `Armor: ${item.name}${enh ? ` +${enh}` : ""}${material && material !== "steel" ? ` (${material})` : ""}`,
          );
          break;
        }
        doc = addGear(doc, item, equipped, refData, itemIdx, report);
        break;
      }
      case "weapon": {
        const weaponId = resolve(item, refData.weapons, weaponIdx);
        if (!weaponId) {
          report.unmapped.push(
            `Weapon "${item.name}" not found in reference data; add it on the Weapons step.`,
          );
          break;
        }
        doc = addWeaponFromRef(
          doc,
          refData.weapons[weaponId]!,
          num(item.system.enh) ?? 0,
          undefined,
          undefined,
          item.system.masterwork === true,
        );
        report.mapped.push(`Weapon: ${item.name}`);
        break;
      }
      case "loot":
      case "consumable":
      case "container":
        doc = addGear(doc, item, item.system.equipped !== false, refData, itemIdx, report);
        break;
      case "buff": {
        if (item.system.active !== true) break;
        const buffId = resolve(item, refData.buffs, buffIdx);
        if (!buffId) {
          report.unmapped.push(
            `Active buff "${item.name}" not found in reference data; add it on the tracker.`,
          );
          break;
        }
        const casterLevel = num(item.system.level);
        doc = addBuff(
          doc,
          makeActiveBuff(refData.buffs[buffId]!, casterLevel != null ? { casterLevel } : {}),
        );
        report.mapped.push(`Active buff: ${item.name}`);
        break;
      }
      case "spell":
        spells++;
        break;
      default:
        if (!IGNORED_TYPES[item.type]) {
          report.unmapped.push(`${item.name} (${item.type}) wasn't imported; add it by hand.`);
        }
    }
  }
  if (archetypes.length > 0) doc = setArchetypes(doc, archetypes, refData);
  if (classFeatures > 0) {
    report.mapped.push(
      `${classFeatures} class and archetype features come from class levels here, not the import.`,
    );
  }
  if (racialTraits > 0) {
    report.mapped.push(`${racialTraits} racial traits come from the race here, not the import.`);
  }
  if (spells > 0) {
    report.unmapped.push(`${spells} spells weren't imported; add them on the Spells step.`);
  }

  // Conditions are active effects carrying a status id.
  for (const effect of Array.isArray(actor.effects) ? actor.effects.filter(isDict) : []) {
    if (effect.disabled === true || !Array.isArray(effect.statuses)) continue;
    for (const status of effect.statuses) {
      if (typeof status !== "string") continue;
      const id = CONDITION_ALIASES[status] ?? status;
      if (CONDITIONS[id]) {
        doc = {
          ...doc,
          live: { ...doc.live, conditions: activateConditionIn(doc.live.conditions, id) },
        };
        report.mapped.push(`Condition: ${CONDITIONS[id]!.name}`);
      } else {
        report.unmapped.push(`Condition "${status}" has no counterpart here; track it by hand.`);
      }
    }
  }

  const negativeLevels = num(attributes.energyDrain);
  if (negativeLevels) doc = setNegativeLevels(doc, "temporary", negativeLevels);

  const currency = isDict(system.currency) ? system.currency : {};
  for (const field of ["pp", "gp", "sp", "cp"] as const) {
    const amount = num(currency[field]);
    if (amount) doc = setMoney(doc, field, amount);
  }

  doc = applyCurrentHp(doc, refData, isDict(attributes.hp) ? attributes.hp : {});
  return { doc, report };
}

function addGear(
  doc: CharacterDoc,
  item: FoundryItem,
  equipped: boolean,
  refData: RefData,
  itemIdx: () => Map<string, string>,
  report: ImportReport,
): CharacterDoc {
  const quantity = num(item.system.quantity);
  const itemId = resolve(item, refData.items, itemIdx);
  if (!itemId) {
    report.unmapped.push(
      `Gear "${item.name}" not found in reference data; added as a custom item.`,
    );
    return addCustomGearItem(doc, item.name, { quantity });
  }
  const gear = appendGear(doc.build.gear, {
    itemId,
    equipped,
    ...(quantity && quantity !== 1 ? { quantity } : {}),
  });
  report.mapped.push(`Gear: ${refData.items[itemId]!.name}`);
  return { ...doc, build: { ...doc.build, gear } };
}

/**
 * Foundry stores one hit point total per class item. A total matching the
 * average or maximum rule sets that mode; anything else becomes per-level
 * rolls spread evenly across the class's levels, so the maximum comes out
 * the same.
 */
function applyClassHp(
  doc: CharacterDoc,
  refData: RefData,
  classes: { tag: string; level: number; hp: number | undefined }[],
  report: ImportReport,
): CharacterDoc {
  if (classes.length === 0) return doc;
  if (classes.some((c) => c.hp == null)) {
    report.unmapped.push(
      "Class hit points weren't in the export; using the average for each level.",
    );
    return doc;
  }
  const dieOf = (tag: string) => Object.values(refData.classes).find((c) => c.tag === tag)?.hd ?? 8;
  let average = 0;
  let max = 0;
  classes.forEach((c, index) => {
    const die = dieOf(c.tag);
    const later = index === 0 ? c.level - 1 : c.level;
    average += (index === 0 ? die : 0) + later * (Math.floor(die / 2) + 1);
    max += die * c.level;
  });
  const total = classes.reduce((sum, c) => sum + c.hp!, 0);
  if (total === average) return doc;
  if (total === max) {
    report.mapped.push("Hit points: maximum at every level");
    return setHpMode(doc, "max");
  }

  let out = setHpMode(doc, "rolled");
  let charLevel = 1;
  classes.forEach((c, index) => {
    const die = dieOf(c.tag);
    const rolledLevels = index === 0 ? c.level - 1 : c.level;
    const pool = c.hp! - (index === 0 ? die : 0);
    if (index === 0) charLevel++;
    for (let i = 0; i < rolledLevels; i++) {
      const share = Math.floor(pool / rolledLevels) + (i < pool % rolledLevels ? 1 : 0);
      out = setHpRoll(out, charLevel++, share);
    }
  });
  report.mapped.push(`Hit points: ${total} from class levels, entered as rolls`);
  return out;
}

/** Foundry stores current HP as an offset from the maximum. */
function applyCurrentHp(doc: CharacterDoc, refData: RefData, hp: Dict): CharacterDoc {
  let max: number;
  try {
    max = compute(doc, refData).hp.max;
  } catch {
    return doc;
  }
  return {
    ...doc,
    live: {
      ...doc.live,
      hp: {
        current: max + Math.trunc(num(hp.offset) ?? 0),
        temp: Math.max(0, Math.trunc(num(hp.temp) ?? 0)),
        nonlethal: Math.max(0, Math.trunc(num(hp.nonlethal) ?? 0)),
      },
    },
  };
}
