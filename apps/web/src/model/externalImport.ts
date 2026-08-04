/**
 * Shared plumbing for importing a character built in an EXTERNAL tool
 * (Pathbuilder 1e, Hero Lab classic — see `importPathbuilder.ts` /
 * `importHeroLab.ts`) into a fresh Ledgermain {@link CharacterDoc}.
 *
 * This is best-effort personal-use tooling, NOT a compatibility promise —
 * neither external tool publishes a schema we can code against with
 * confidence (see each importer's module doc for what's confirmed vs.
 * inferred). The shape-specific parsers in the sibling modules reduce
 * whatever they can recognize down to the tool-agnostic {@link
 * ExternalCharacterData} below; this module does the (one, shared, tested-
 * once) job of turning that into a `CharacterDoc` plus an {@link
 * ImportReport} of what could and couldn't be mapped to real `RefData`
 * entries. Nothing here fabricates a mapping: an unrecognized race/class/
 * feat/skill/gear name is always left out of the document and listed in
 * `report.unmapped` rather than guessed at.
 */
import { compute, deriveResourcePools, featNameSlug, raceGrantsFlexibleAbility } from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData, SkillId } from "@pf1/schema";

import {
  ABILITY_IDS,
  addClass,
  addCustomGearItem,
  addWornArmorFromRef,
  createEmptyDoc,
  setAbility,
  setAge,
  setAlignment,
  setBonusLanguages,
  setClassLevel,
  setDeity,
  setFavoredClass,
  setFlexibleAbility,
  setGear,
  setGender,
  setMoney,
  setName,
  setRace,
  setSkillRank,
  toggleFeat,
  toggleKnownSpell,
} from "./doc.js";
import { localId } from "./ids.js";
import { normalizeAlignmentCode, SKILL_NAMES, slugifySkillLabel } from "./names.js";

/** Which external tool an import came from — carried through to the UI report. */
export type ExternalImportSource = "pathbuilder" | "herolab";

/**
 * Human-readable results of an external import: what got matched to a real
 * `RefData` entry (or skill/class registry) vs. what the source named that we
 * couldn't recognize. Always safe to render as-is — every line is already a
 * complete sentence naming the thing and what happened to it.
 */
export interface ImportReport {
  source: ExternalImportSource;
  mapped: string[];
  unmapped: string[];
}

/**
 * The tool-agnostic shape both external importers reduce their source format
 * down to. Deliberately flat and permissive (arrays of loose `{ name, ... }`
 * records) since that's the least each format has in common — see
 * `importPathbuilder.ts`/`importHeroLab.ts` for how each shape's actual
 * fields get funneled into this.
 */
export interface ExternalCharacterData {
  name?: string;
  race?: string;
  alignment?: string;
  deity?: string;
  gender?: string;
  age?: string;
  abilities: Partial<Record<AbilityId, number>>;
  classes: { name: string; level: number }[];
  feats: string[];
  skills: { name: string; ranks: number }[];
  languages: string[];
  gear: { name: string; quantity?: number }[];
  money: Partial<Record<"pp" | "gp" | "sp" | "cp", number>>;
  /**
   * Known/prepared spells grouped by the class name that casts them (free
   * text, matched against `RefData.classes` the same way `classes` above
   * is). Currently only populated by `importPathbuilderHtml.ts` (a stat
   * block's "<Class> spells prepared/known" sections); left empty by the
   * other importers. Spells are only added to the doc when `className`
   * matches a class already present in `classes` above — a caster's spells
   * with no matching class on the sheet are reported as unmapped rather
   * than added to some arbitrary/first class.
   */
  spellsByClass?: { className: string; spellNames: string[] }[];
  /**
   * True when `abilities` above are the scores WITH racial modifiers already
   * applied, as a stat block reports them. `CharacterDoc.abilities` holds the
   * pre-racial scores (the engine adds the race's modifiers itself), so the
   * racial delta is subtracted back out at build time — otherwise a Half-Orc's
   * +2 Str would be counted twice. Only Hero Lab sets this; Pathbuilder's
   * export is read as pre-racial, which is what it was before this field
   * existed. See `racialAbilityModifiers`.
   */
  abilitiesIncludeRacial?: boolean;
  /**
   * Which ability got the flexible +2 of a Human/Half-Elf/Half-Orc. Needed
   * both for the doc itself and to subtract the right racial modifier when
   * `abilitiesIncludeRacial` is set. Left undefined when the source doesn't
   * say — never guessed from which score happens to be highest.
   */
  flexibleAbility?: AbilityId;
  /**
   * Live session state: where the character's hit points actually stand, not
   * their maximum (which the engine derives). `max` is carried only so the
   * import report can flag a disagreement with our own computed maximum for
   * the player to reconcile; it never overrides the derived value.
   */
  hp?: { max?: number; current?: number; nonlethal?: number };
  /**
   * Live per-use pools the source was tracking ("Martial Flexibility", 4 of 5
   * spent). Matched by name against the pools the engine derives for this
   * build; an entry with no match is reported rather than invented as a
   * free-floating pool (see `buildDocFromExternalData`).
   */
  resources?: { name: string; used: number; max: number }[];
  /**
   * Worn armor and shields, separated from `gear` because they need real
   * physical stats (AC, max Dex, check penalty) snapshotted from
   * `RefData.armors` to affect AC at all — a plain gear entry with the right
   * name contributes nothing. `name` is the BASE armor name with any "+N"
   * enhancement split off into `enhancement`.
   */
  armor?: { name: string; enhancement?: number }[];
  /** Favored class name, matched against `RefData.classes` like `classes` above. */
  favoredClass?: string;
}

/** An `ExternalCharacterData` with every field empty — a safe starting point for parsers to fill in. */
export function emptyExternalData(): ExternalCharacterData {
  return {
    abilities: {},
    classes: [],
    feats: [],
    skills: [],
    languages: [],
    gear: [],
    money: {},
  };
}

/** Normalize a free-text name to the slug space used for RefData name lookups. */
export function nameSlug(name: string): string {
  return featNameSlug(name);
}

/**
 * Build a name-slug -> id index over a `RefData` entity collection keyed by
 * id with a `.name` (races, feats, items, ...). First entry wins a slug
 * collision (rare, and good enough for best-effort matching).
 */
export function buildNameIndex(entities: Record<string, { name: string }>): Map<string, string> {
  const idx = new Map<string, string>();
  for (const [id, entity] of Object.entries(entities)) {
    const slug = nameSlug(entity.name);
    if (slug && !idx.has(slug)) idx.set(slug, id);
  }
  return idx;
}

/**
 * Build a name-slug -> class tag index over `RefData.classes`. Base classes
 * are indexed before prestige/NPC classes so a name collision (rare) prefers
 * the base class.
 */
export function buildClassTagIndex(refData: RefData): Map<string, string> {
  const idx = new Map<string, string>();
  const ordered = Object.values(refData.classes).sort((a, b) => {
    const aBase = a.subType === "base" ? 0 : 1;
    const bBase = b.subType === "base" ? 0 : 1;
    return aBase - bBase;
  });
  for (const cls of ordered) {
    const slug = nameSlug(cls.name);
    if (slug && !idx.has(slug)) idx.set(slug, cls.tag);
  }
  return idx;
}

const PARAMETERIZED_BASE_NAMES: Record<string, string> = {
  craft: "crf",
  profession: "pro",
  perform: "prf",
};

const SKILL_NAME_TO_ID: Map<string, SkillId> = new Map(
  Object.entries(SKILL_NAMES).map(([id, name]) => [name.toLowerCase(), id]),
);

/**
 * Match a free-text skill display name (as either external tool would show
 * it, e.g. "Acrobatics", "Knowledge (Arcana)", "Craft (Alchemy)") to a
 * Ledgermain `SkillId`. Returns undefined for anything unrecognized — never
 * guesses a Craft/Profession/Perform subskill without an explicit
 * parenthetical, and never partial-matches.
 */
export function matchSkillId(rawName: string): SkillId | undefined {
  const trimmed = rawName.trim();
  if (!trimmed) return undefined;
  const direct = SKILL_NAME_TO_ID.get(trimmed.toLowerCase());
  if (direct) return direct;
  const paren = /^([a-z ]+?)\s*\(([^)]+)\)$/i.exec(trimmed);
  if (paren) {
    const base = paren[1]!.trim().toLowerCase();
    const prefix = PARAMETERIZED_BASE_NAMES[base];
    if (prefix) {
      const slug = slugifySkillLabel(paren[2]!);
      if (slug) return `${prefix}.${slug}`;
    }
  }
  return undefined;
}

const ABILITY_ALIASES: Record<string, AbilityId> = {
  str: "str",
  strength: "str",
  dex: "dex",
  dexterity: "dex",
  con: "con",
  constitution: "con",
  int: "int",
  intelligence: "int",
  wis: "wis",
  wisdom: "wis",
  cha: "cha",
  charisma: "cha",
};

/** Match a free-text ability name/abbreviation ("Strength", "STR", "str") to an `AbilityId`. */
export function matchAbilityId(rawName: string): AbilityId | undefined {
  return ABILITY_ALIASES[rawName.trim().toLowerCase()];
}

/**
 * The net racial modifier to each ability for `raceId` — the race's own
 * ability `changes` plus, for a race with the flexible +2 (Human/Half-Elf/
 * Half-Orc), that +2 on `flexibleAbility` when one is known.
 *
 * Mirrors what `@pf1/engine`'s `collect.ts` applies for a *freshly imported*
 * doc: no alternate racial traits are chosen yet, so nothing can suppress or
 * replace these. An importer that later learns to bring alternate traits
 * across has to revisit this.
 */
export function racialAbilityModifiers(
  refData: RefData,
  raceId: string,
  flexibleAbility?: AbilityId,
): Partial<Record<AbilityId, number>> {
  const race = refData.races[raceId];
  if (!race) return {};
  const out: Partial<Record<AbilityId, number>> = {};
  for (const change of race.changes ?? []) {
    const ability = ABILITY_IDS.find((a) => a === change.target);
    if (!ability) continue;
    const value = Number(change.formula);
    // A non-literal formula (none ship on a vendored race today) is skipped
    // rather than guessed at — better to leave the score alone than shift it.
    if (!Number.isFinite(value)) continue;
    out[ability] = (out[ability] ?? 0) + value;
  }
  if (raceGrantsFlexibleAbility(race) && flexibleAbility) {
    out[flexibleAbility] = (out[flexibleAbility] ?? 0) + 2;
  }
  return out;
}

/**
 * Turn tool-agnostic {@link ExternalCharacterData} into a `CharacterDoc` +
 * {@link ImportReport}. The one place shared by both external importers that
 * knows how to map names to `RefData` ids — see the module doc comment.
 * Always returns a doc that typechecks and loads: unmapped names are simply
 * omitted from the doc (feats/classes/gear) or left as free text with no
 * numeric effect (alignment), never fabricated.
 */
export function buildDocFromExternalData(
  data: ExternalCharacterData,
  refData: RefData,
  source: ExternalImportSource,
): { doc: CharacterDoc; report: ImportReport } {
  const report: ImportReport = { source, mapped: [], unmapped: [] };
  let doc = createEmptyDoc(localId("import-"));

  if (data.name?.trim()) doc = setName(doc, data.name.trim());

  let raceId: string | undefined;
  if (data.race?.trim()) {
    raceId = buildNameIndex(refData.races).get(nameSlug(data.race));
    if (raceId) {
      doc = setRace(doc, raceId);
      report.mapped.push(`Race: "${data.race}" -> ${refData.races[raceId]!.name}`);
    } else {
      report.unmapped.push(`Race "${data.race}" not found in reference data; left unset.`);
    }
  }

  if (data.flexibleAbility && raceId && raceGrantsFlexibleAbility(refData.races[raceId]!)) {
    doc = setFlexibleAbility(doc, data.flexibleAbility);
    report.mapped.push(`Racial +2 ability choice: ${data.flexibleAbility.toUpperCase()}`);
  }

  if (data.alignment?.trim()) {
    const code = normalizeAlignmentCode(data.alignment);
    doc = setAlignment(doc, code ?? data.alignment.trim());
    if (!code) {
      report.unmapped.push(
        `Alignment "${data.alignment}" not recognized; stored as text but won't show selected in the Alignment dropdown.`,
      );
    }
  }

  if (data.deity?.trim()) doc = setDeity(doc, data.deity.trim());
  if (data.gender?.trim()) doc = setGender(doc, data.gender.trim());
  if (data.age?.trim()) doc = setAge(doc, data.age.trim());

  if (data.classes.length > 0) {
    const classIdx = buildClassTagIndex(refData);
    for (const cls of data.classes) {
      if (!cls.name.trim()) continue;
      const tag = classIdx.get(nameSlug(cls.name));
      if (tag) {
        doc = addClass(doc, tag);
        doc = setClassLevel(doc, tag, Math.max(1, Math.round(cls.level) || 1));
        report.mapped.push(`Class: "${cls.name}" (level ${cls.level}) -> ${tag}`);
      } else {
        report.unmapped.push(`Class "${cls.name}" (level ${cls.level}) not found; not added.`);
      }
    }
  }

  if (data.favoredClass?.trim()) {
    const tag = buildClassTagIndex(refData).get(nameSlug(data.favoredClass));
    if (tag && doc.identity.classes.some((c) => c.tag === tag)) {
      doc = setFavoredClass(doc, tag);
      report.mapped.push(`Favored class: ${data.favoredClass}`);
    }
  }

  // A stat block quotes post-racial scores; the doc stores pre-racial ones and
  // lets the engine re-add the race's modifiers. Without a matched race there
  // is nothing to subtract, so the scores go in as-is and the report says so.
  const racialMods =
    data.abilitiesIncludeRacial && raceId
      ? racialAbilityModifiers(refData, raceId, data.flexibleAbility)
      : {};
  if (data.abilitiesIncludeRacial && !raceId && Object.keys(data.abilities).length > 0) {
    report.unmapped.push(
      "Ability scores include racial modifiers, but the race wasn't recognized, so they couldn't be backed out; check them against the source.",
    );
  }
  for (const ability of ABILITY_IDS) {
    const score = data.abilities[ability];
    if (score != null && Number.isFinite(score)) {
      doc = setAbility(doc, ability, score - (racialMods[ability] ?? 0));
    }
  }
  if (
    data.abilitiesIncludeRacial &&
    raceId &&
    raceGrantsFlexibleAbility(refData.races[raceId]!) &&
    !data.flexibleAbility
  ) {
    report.unmapped.push(
      `${refData.races[raceId]!.name} picks which ability gets its +2 and the source didn't record the choice; pick it on the Race step, then lower that score by 2.`,
    );
  }

  for (const skill of data.skills) {
    if (!(skill.ranks > 0)) continue; // untrained/zero-rank entries are noise, not worth reporting
    const id = matchSkillId(skill.name);
    if (id) {
      doc = setSkillRank(doc, id, Math.round(skill.ranks));
      report.mapped.push(`Skill: "${skill.name}" -> ${id} (${skill.ranks} ranks)`);
    } else {
      report.unmapped.push(
        `Skill "${skill.name}" (${skill.ranks} ranks) not recognized; not added.`,
      );
    }
  }

  if (data.feats.length > 0) {
    const featIdx = buildNameIndex(refData.feats);
    for (const featName of data.feats) {
      if (!featName.trim()) continue;
      const id = featIdx.get(nameSlug(featName));
      if (id) {
        if (!doc.build.feats.includes(id)) doc = toggleFeat(doc, id);
        report.mapped.push(`Feat: "${featName}" -> ${refData.feats[id]!.name}`);
      } else {
        report.unmapped.push(`Feat "${featName}" not found in reference data; not added.`);
      }
    }
  }

  if (data.spellsByClass && data.spellsByClass.length > 0) {
    const classIdx = buildClassTagIndex(refData);
    const spellIdx = buildNameIndex(refData.spells);
    for (const entry of data.spellsByClass) {
      if (entry.spellNames.length === 0) continue;
      const tag = classIdx.get(nameSlug(entry.className));
      if (tag == null || !doc.identity.classes.some((c) => c.tag === tag)) {
        report.unmapped.push(
          `Spells listed under "${entry.className}" not imported because that class wasn't added to this character: ${entry.spellNames.join(", ")}.`,
        );
        continue;
      }
      for (const spellName of entry.spellNames) {
        const id = spellIdx.get(nameSlug(spellName));
        if (id) {
          doc = toggleKnownSpell(doc, refData, id, tag);
          report.mapped.push(
            `Spell: "${spellName}" -> ${refData.spells[id]!.name} (${entry.className})`,
          );
        } else {
          report.unmapped.push(
            `Spell "${spellName}" (${entry.className}) not found in reference data; not added.`,
          );
        }
      }
    }
  }

  if (data.languages.length > 0) {
    doc = setBonusLanguages(doc, data.languages);
  }

  // Worn armor before gear: it needs real physical stats snapshotted from
  // `RefData.armors` (a same-named gear entry contributes nothing to AC).
  if (data.armor && data.armor.length > 0) {
    const armorIdx = buildNameIndex(refData.armors);
    for (const worn of data.armor) {
      if (!worn.name.trim()) continue;
      const id = armorIdx.get(nameSlug(worn.name));
      const ref = id ? refData.armors[id] : undefined;
      if (ref) {
        doc = addWornArmorFromRef(doc, ref, worn.enhancement ?? 0);
        report.mapped.push(
          `Armor: "${worn.name}"${worn.enhancement ? ` +${worn.enhancement}` : ""} -> ${ref.name}`,
        );
      } else {
        report.unmapped.push(
          `Armor "${worn.name}" not found in reference data; add it on the Armor step so it counts toward AC.`,
        );
      }
    }
  }

  if (data.gear.length > 0) {
    const itemIdx = buildNameIndex(refData.items);
    const gear = [...doc.build.gear];
    for (const item of data.gear) {
      if (!item.name.trim()) continue;
      const id = itemIdx.get(nameSlug(item.name));
      if (id) {
        gear.push({
          itemId: id,
          equipped: true,
          ...(item.quantity && item.quantity !== 1 ? { quantity: item.quantity } : {}),
        });
        report.mapped.push(`Gear: "${item.name}" -> ${refData.items[id]!.name}`);
      }
    }
    doc = setGear(doc, gear);
    // Anything that didn't match a RefData item is added as a free-text
    // custom entry instead — never dropped, but never given fabricated
    // weight/price/stats either.
    for (const item of data.gear) {
      if (!item.name.trim()) continue;
      if (itemIdx.has(nameSlug(item.name))) continue;
      doc = addCustomGearItem(doc, item.name, { quantity: item.quantity });
      report.unmapped.push(
        `Gear "${item.name}" not found in reference data; added as a custom item.`,
      );
    }
  }

  for (const field of ["pp", "gp", "sp", "cp"] as const) {
    const value = data.money[field];
    if (value != null) doc = setMoney(doc, field, value);
  }

  doc = applyLiveState(doc, data, refData, report);

  return { doc, report };
}

/**
 * Carry the source's live session state (current HP, spent uses) onto an
 * otherwise-built doc. Split out because it has to run LAST: resource pools
 * are matched against what the engine derives from the finished build, so the
 * race/classes/feats all have to be in place first.
 */
function applyLiveState(
  doc: CharacterDoc,
  data: ExternalCharacterData,
  refData: RefData,
  report: ImportReport,
): CharacterDoc {
  let out = doc;

  if (data.hp) {
    const { current, nonlethal, max } = data.hp;
    if (current != null && Number.isFinite(current)) {
      out = {
        ...out,
        live: {
          ...out.live,
          hp: {
            ...out.live.hp,
            current: Math.trunc(current),
            nonlethal: Math.max(0, Math.trunc(nonlethal ?? 0)),
          },
        },
      };
      report.mapped.push(
        `Current HP: ${Math.trunc(current)}${max != null ? ` of ${max}` : ""}${
          nonlethal ? ` (${nonlethal} nonlethal)` : ""
        }`,
      );
    }
    // The engine derives maximum HP from class/level/Con, so a maximum that
    // disagrees with the source's is a real difference the player should see
    // rather than something to silently override.
    if (max != null && Number.isFinite(max)) {
      const ourMax = deriveMaxHp(out, refData);
      if (ourMax != null && ourMax !== max) {
        report.unmapped.push(
          `Maximum HP is ${max} in the import but ${ourMax} here (we compute it from class, level, and Con); set an HP mode on the Hit Points step if you want to match.`,
        );
      }
    }
  }

  if (data.resources && data.resources.length > 0) {
    const pools = deriveResourcePools(out, refData);
    const byName = new Map(pools.map((p) => [nameSlug(p.name), p]));
    const resources = { ...out.live.resources };
    for (const entry of data.resources) {
      const pool = byName.get(nameSlug(entry.name));
      if (!pool) {
        report.unmapped.push(
          `Tracked "${entry.name}" (${entry.used} of ${entry.max} used) has no matching pool on this sheet; track it by hand.`,
        );
        continue;
      }
      const used = Math.min(Math.max(0, Math.trunc(entry.used)), pool.max);
      resources[pool.id] = { used, max: pool.max };
      report.mapped.push(`Tracked: "${entry.name}" -> ${pool.name} (${used} of ${pool.max} used)`);
    }
    out = { ...out, live: { ...out.live, resources } };
  }

  return out;
}

/** Our own computed maximum HP, or undefined if the sheet can't be computed. */
function deriveMaxHp(doc: CharacterDoc, refData: RefData): number | undefined {
  try {
    return compute(doc, refData).hp.max;
  } catch {
    return undefined;
  }
}
