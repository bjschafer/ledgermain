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
import { featNameSlug } from "@pf1/engine";
import type { AbilityId, CharacterDoc, RefData, SkillId } from "@pf1/schema";

import {
  ABILITY_IDS,
  addClass,
  addCustomGearItem,
  createEmptyDoc,
  setAbility,
  setAge,
  setAlignment,
  setBonusLanguages,
  setClassLevel,
  setDeity,
  setGear,
  setGender,
  setMoney,
  setName,
  setRace,
  setSkillRank,
  toggleFeat,
} from "./doc.js";
import { localId } from "./ids.js";
import { ALIGNMENT_LABELS, SKILL_NAMES, slugifySkillLabel } from "./names.js";

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

const ALIGNMENT_NAME_TO_CODE: Map<string, string> = new Map(
  Object.entries(ALIGNMENT_LABELS).map(([code, label]) => [label.toLowerCase(), code]),
);
const ALIGNMENT_CODES = new Set(Object.keys(ALIGNMENT_LABELS));

/**
 * Normalize free-text alignment ("Chaotic Evil", "ce", "CE") to the two-
 * letter code the builder's Alignment dropdown expects. Returns undefined
 * when unrecognized — the caller still stores the raw text (schema allows any
 * string) but reports it, since it won't show up selected in the dropdown.
 */
function normalizeAlignmentCode(raw: string): string | undefined {
  const trimmed = raw.trim();
  if (!trimmed) return undefined;
  const upper = trimmed.toUpperCase();
  if (ALIGNMENT_CODES.has(upper)) return upper;
  return ALIGNMENT_NAME_TO_CODE.get(trimmed.toLowerCase());
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

  if (data.race?.trim()) {
    const id = buildNameIndex(refData.races).get(nameSlug(data.race));
    if (id) {
      doc = setRace(doc, id);
      report.mapped.push(`Race: "${data.race}" -> ${refData.races[id]!.name}`);
    } else {
      report.unmapped.push(`Race "${data.race}" not found in reference data — left unset.`);
    }
  }

  if (data.alignment?.trim()) {
    const code = normalizeAlignmentCode(data.alignment);
    doc = setAlignment(doc, code ?? data.alignment.trim());
    if (!code) {
      report.unmapped.push(
        `Alignment "${data.alignment}" not recognized — stored as text but won't show selected in the Alignment dropdown.`,
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
        report.unmapped.push(`Class "${cls.name}" (level ${cls.level}) not found — not added.`);
      }
    }
  }

  for (const ability of ABILITY_IDS) {
    const score = data.abilities[ability];
    if (score != null && Number.isFinite(score)) {
      doc = setAbility(doc, ability, score);
    }
  }

  for (const skill of data.skills) {
    if (!(skill.ranks > 0)) continue; // untrained/zero-rank entries are noise, not worth reporting
    const id = matchSkillId(skill.name);
    if (id) {
      doc = setSkillRank(doc, id, Math.round(skill.ranks));
      report.mapped.push(`Skill: "${skill.name}" -> ${id} (${skill.ranks} ranks)`);
    } else {
      report.unmapped.push(
        `Skill "${skill.name}" (${skill.ranks} ranks) not recognized — not added.`,
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
        report.unmapped.push(`Feat "${featName}" not found in reference data — not added.`);
      }
    }
  }

  if (data.languages.length > 0) {
    doc = setBonusLanguages(doc, data.languages);
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
        `Gear "${item.name}" not found in reference data — added as a custom item.`,
      );
    }
  }

  for (const field of ["pp", "gp", "sp", "cp"] as const) {
    const value = data.money[field];
    if (value != null) doc = setMoney(doc, field, value);
  }

  return { doc, report };
}
