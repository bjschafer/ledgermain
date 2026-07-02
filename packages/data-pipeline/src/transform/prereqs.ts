import type { AbilityId, FeatPrerequisites, FeatRef } from "@pf1/schema";

import { resolveUuidLinks, stripHtml } from "../util/html.js";
import { parseUuid } from "../util/uuid.js";
import type { UuidResolver } from "./common.js";

/**
 * Feat prerequisites are FREE TEXT inside the description HTML. This is a hybrid
 * parser: it pulls out the structured signals we can match reliably (ability
 * minimums, BAB, caster level, embedded feat UUID refs, "N ranks in ..." skills)
 * and retains the full prose as `prereqText` for everything else. It deliberately
 * does NOT chase 100% coverage.
 */

const ABILITY_NAMES: Record<string, AbilityId> = {
  str: "str",
  dex: "dex",
  con: "con",
  int: "int",
  wis: "wis",
  cha: "cha",
};

/** Extract the "Prerequisite(s): ... </p>" section from description HTML. */
export function extractPrereqSection(html: string): string | null {
  const flat = html.replace(/\r?\n/g, " ");
  const idx = flat.search(/Prerequisite/i);
  if (idx === -1) return null;
  // From the label, take up to the end of the enclosing paragraph.
  const afterLabel = flat.slice(idx);
  // Drop the "Prerequisites</strong>:" or "Prerequisite:" label itself.
  const colon = afterLabel.indexOf(":");
  const body = colon === -1 ? afterLabel : afterLabel.slice(colon + 1);
  const end = body.search(/<\/p>/i);
  return (end === -1 ? body : body.slice(0, end)).trim();
}

/** Pull `@UUID[Compendium.pf1.feats.Item.<id>]{Name}` feat references. */
function extractFeatRefs(sectionHtml: string, resolveUuid: UuidResolver): FeatRef[] {
  const re = /@UUID\[([^\]]+)\](?:\{([^}]*)\})?/g;
  const refs: FeatRef[] = [];
  const seen = new Set<string>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(sectionHtml)) !== null) {
    const uuid = m[1]!;
    const parsed = parseUuid(uuid);
    // Only refs into the feats pack are feat prerequisites.
    if (!parsed || parsed.pack !== "feats") continue;
    if (seen.has(parsed.id)) continue;
    seen.add(parsed.id);
    const name = m[2]?.trim() || resolveUuid(uuid) || parsed.id;
    refs.push({ id: parsed.id, name, uuid });
  }
  return refs;
}

function parseAbilities(text: string): { ability: AbilityId; min: number }[] {
  const re = /\b(Str|Dex|Con|Int|Wis|Cha)\b\s+(\d+)/gi;
  const out: { ability: AbilityId; min: number }[] = [];
  const seen = new Set<AbilityId>();
  let m: RegExpExecArray | null;
  while ((m = re.exec(text)) !== null) {
    const ability = ABILITY_NAMES[m[1]!.toLowerCase()]!;
    const min = Number(m[2]);
    if (seen.has(ability)) continue;
    seen.add(ability);
    out.push({ ability, min });
  }
  return out;
}

function parseBab(text: string): number | undefined {
  const m = /base attack bonus\s*\+?\s*(\d+)/i.exec(text);
  return m ? Number(m[1]) : undefined;
}

function parseCasterLevel(text: string): number | undefined {
  const m = /caster level\s+(\d+)/i.exec(text);
  return m ? Number(m[1]) : undefined;
}

/** Best-effort "N rank(s) in <skill>" capture; skill id mapping deferred. */
function parseSkills(text: string): { skill: string | null; ranks: number; raw: string }[] {
  const out: { skill: string | null; ranks: number; raw: string }[] = [];
  // "1 rank in Knowledge (arcana)" / "3 ranks in Stealth"
  const re1 = /(\d+)\s+ranks?\s+in\s+([^,.;]+)/gi;
  let m: RegExpExecArray | null;
  while ((m = re1.exec(text)) !== null) {
    out.push({ skill: null, ranks: Number(m[1]), raw: m[0].trim() });
  }
  // "Knowledge (planes) 3 ranks" / "Stealth 5 ranks"
  const re2 = /([A-Z][A-Za-z]+(?:\s*\([^)]+\))?)\s+(\d+)\s+ranks?\b/g;
  while ((m = re2.exec(text)) !== null) {
    out.push({ skill: null, ranks: Number(m[2]), raw: m[0].trim() });
  }
  return out;
}

export function parsePrerequisites(
  descriptionHtml: string | undefined,
  resolveUuid: UuidResolver,
): FeatPrerequisites {
  const empty: FeatPrerequisites = { abilities: [], feats: [], skills: [] };
  if (!descriptionHtml) return empty;

  const section = extractPrereqSection(descriptionHtml);
  if (!section) return empty;

  const text = stripHtml(resolveUuidLinks(section, resolveUuid));
  const result: FeatPrerequisites = {
    abilities: parseAbilities(text),
    feats: extractFeatRefs(section, resolveUuid),
    skills: parseSkills(text),
    prereqText: text || undefined,
  };
  const bab = parseBab(text);
  if (bab !== undefined) result.bab = bab;
  const cl = parseCasterLevel(text);
  if (cl !== undefined) result.casterLevel = cl;
  return result;
}
