import { join } from "node:path";

import type { Class, SkillId } from "@pf1/schema";

import { readPfDataDictionary } from "../util/pfdata.js";

/**
 * Corrects the vendored prestige-class chassis against the "Pf Data 1e" prose
 * catalog, which states each class's published "Class Skills" sentence,
 * "Skill Points at each Level", and "Hit Die" verbatim.
 *
 * The archetype module those classes come from (see
 * `transformPrestigeClassPack`) carries a real `system.classSkills` array, but
 * it is unreliable in a systematic way: Sense Motive is absent from most
 * lists, Sleight of Hand from many, Craft is present on classes whose
 * published list has no Craft at all, and a handful of lists (Justicar, Lion
 * Blade, Red Mantis Assassin) stop partway through. Since the class-skill flag
 * is worth a flat +3 on every ranked skill, each of those is a wrong number on
 * the sheet. `hd`/`skillsPerLevel` from the same module agree with the
 * published tables everywhere except one class, and are re-derived here for
 * the same price.
 *
 * The prose is authority here, so a parsed list REPLACES the module's rather
 * than merging with it: a spurious Craft is as wrong as a missing Sense
 * Motive, and merging would only ever fix the missing half. Parsing is
 * deliberately conservative (see {@link parseClassSkillSentence}) and a class
 * the catalog doesn't state, or states in a shape this can't resolve, keeps
 * whatever the module gave it.
 */

/** Skill display name (as published) to Foundry skill id, for the fixed skills. */
const SKILL_IDS: Readonly<Record<string, SkillId>> = {
  Acrobatics: "acr",
  Appraise: "apr",
  Artistry: "art",
  Bluff: "blf",
  Climb: "clm",
  Craft: "crf",
  "Disable Device": "dev",
  Diplomacy: "dip",
  Disguise: "dis",
  "Escape Artist": "esc",
  Fly: "fly",
  "Handle Animal": "han",
  Heal: "hea",
  Intimidate: "int",
  Linguistics: "lin",
  Lore: "lor",
  Perception: "per",
  Perform: "prf",
  Profession: "pro",
  Ride: "rid",
  "Sense Motive": "sen",
  "Sleight of Hand": "slt",
  Spellcraft: "spl",
  Stealth: "ste",
  Survival: "sur",
  Swim: "swm",
  "Use Magic Device": "umd",
};

/** Knowledge parenthetical to skill id. */
const KNOWLEDGE_IDS: Readonly<Record<string, SkillId>> = {
  arcana: "kar",
  dungeoneering: "kdu",
  engineering: "ken",
  geography: "kge",
  history: "khi",
  local: "klo",
  nature: "kna",
  nobility: "kno",
  planes: "kpl",
  religion: "kre",
};

const ALL_KNOWLEDGE = Object.values(KNOWLEDGE_IDS);

/**
 * The catalog's own markup, stripped before matching: `‹skill/Sense Motive›`
 * wraps a cross-reference (only some mentions in a sentence are wrapped, so
 * the plain-text ones have to match too) and `«` marks the end of the linkable
 * stem inside one, e.g. `‹skill/Perform« (oratory)›`.
 */
function plainText(line: string): string {
  return line.replaceAll(/‹skill\/([^›]+)›/g, "$1").replaceAll(/[«»]/g, "");
}

/**
 * Parse a class's "Class Skills" sentence into skill ids, or `null` when the
 * sentence resolves to something this shouldn't guess at.
 *
 * Returns `null` rather than a partial list when a "Knowledge" mention carries
 * no parenthetical or an unrecognized one, since silently dropping a Knowledge
 * skill would look exactly like a correct parse. Legacy 3.5 skill names that
 * PF1 folded into other skills (Justicar's "Gather Information", "Speak
 * Language") simply don't match and are left out, which is the right answer:
 * the published PF1 conversion of those lists is what the rest of the sentence
 * already spells out.
 */
export function parseClassSkillSentence(line: string): SkillId[] | null {
  const text = plainText(line);
  const start = text.toLowerCase().indexOf("class skills are");
  if (start < 0) return null;
  const sentence = text.slice(start).split("**Skill Points")[0]!;

  const ids = new Set<SkillId>();
  for (const group of sentence.matchAll(/Knowledge\s*\(([^)]*)\)/g)) {
    const inner = group[1]!.toLowerCase();
    if (inner.includes("all") || inner.includes("any")) {
      for (const id of ALL_KNOWLEDGE) ids.add(id);
      continue;
    }
    // "Knowledge (nobility and royalty)" is the 3.5 spelling of one skill, not two.
    for (const part of inner.replaceAll("nobility and royalty", "nobility").split(/,|\band\b|\//)) {
      const key = part.trim().split(/\s+/)[0];
      if (!key) continue;
      const id = KNOWLEDGE_IDS[key];
      if (!id) return null;
      ids.add(id);
    }
  }
  if (/\bKnowledge\b(?!\s*\()/.test(sentence)) return null;

  for (const [name, id] of Object.entries(SKILL_IDS)) {
    if (new RegExp(String.raw`\b${name.replaceAll(" ", String.raw`\s+`)}\b`).test(sentence)) {
      ids.add(id);
    }
  }
  // A one-skill list is legal in principle but far more likely a mis-parse.
  return ids.size >= 2 ? [...ids].sort() : null;
}

interface PfDataChassis {
  classSkills: SkillId[] | null;
  hd: number | null;
  skillsPerLevel: number | null;
}

function readChassis(description: string[]): PfDataChassis {
  const skillLine = description.find((l) => l.toLowerCase().includes("class skills are"));
  const joined = description.join("\n");
  const ranks = /Skill (?:Points|Ranks) at each Level:\*\*\s*(\d+)/.exec(joined);
  const hd = /Hit Die[:s]*\*\*\s*d(\d+)/.exec(joined);
  return {
    classSkills: skillLine ? parseClassSkillSentence(skillLine) : null,
    hd: hd ? Number(hd[1]) : null,
    skillsPerLevel: ranks ? Number(ranks[1]) : null,
  };
}

/** One class the pass changed, for the build log. */
export interface PrestigeChassisFix {
  name: string;
  addedSkills: SkillId[];
  removedSkills: SkillId[];
  hd?: [number, number];
  skillsPerLevel?: [number, number];
}

export interface PrestigeChassisReport {
  fixes: PrestigeChassisFix[];
  /** Classes with no usable catalog entry, left exactly as the module had them. */
  unstated: string[];
}

/**
 * Apply the catalog's chassis to every vendored prestige class in `classes`,
 * in place. `excludeNames` is the hand-authored set (see
 * `transformPrestigeClassPack`), which stays authoritative.
 */
export function applyPfDataPrestigeChassis(
  classes: Class[],
  pfDataJsonDir: string,
  excludeNames: ReadonlySet<string>,
): PrestigeChassisReport {
  const catalog = new Map<string, string[]>();
  for (const file of [
    "prestige_classes.json",
    "prestige_classes2.json",
    "prestige_classes3.json",
    "prestige_classes4.json",
  ]) {
    for (const entry of Object.values(readPfDataDictionary(join(pfDataJsonDir, file)))) {
      if (entry.name && entry.description) catalog.set(entry.name.toLowerCase(), entry.description);
    }
  }

  const report: PrestigeChassisReport = { fixes: [], unstated: [] };
  for (const cls of classes) {
    if (cls.subType !== "prestige" || excludeNames.has(cls.name)) continue;
    const description = catalog.get(cls.name.toLowerCase());
    const chassis = description ? readChassis(description) : null;
    if (!chassis?.classSkills) {
      report.unstated.push(cls.name);
      continue;
    }

    const had = new Set(cls.classSkills);
    const want = new Set(chassis.classSkills);
    const fix: PrestigeChassisFix = {
      name: cls.name,
      addedSkills: chassis.classSkills.filter((s) => !had.has(s)),
      removedSkills: cls.classSkills.filter((s) => !want.has(s)),
    };
    cls.classSkills = chassis.classSkills;
    if (chassis.hd !== null && chassis.hd !== cls.hd) {
      fix.hd = [cls.hd, chassis.hd];
      cls.hd = chassis.hd;
    }
    if (chassis.skillsPerLevel !== null && chassis.skillsPerLevel !== cls.skillsPerLevel) {
      fix.skillsPerLevel = [cls.skillsPerLevel, chassis.skillsPerLevel];
      cls.skillsPerLevel = chassis.skillsPerLevel;
    }
    if (
      fix.addedSkills.length > 0 ||
      fix.removedSkills.length > 0 ||
      fix.hd ||
      fix.skillsPerLevel
    ) {
      report.fixes.push(fix);
    }
  }
  return report;
}
