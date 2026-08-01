import type { AbilityId, Feat, FeatPrerequisites, FeatRef } from "@pf1/schema";

import { resolveFoundryMarkup, stripHtml } from "../util/html.js";
import { parseUuid } from "../util/uuid.js";
import type { UuidResolver } from "./common.js";

/**
 * Feat prerequisites are FREE TEXT inside the description HTML. This is a hybrid
 * parser: it pulls out the structured signals we can match reliably (ability
 * minimums, BAB, caster level, character level, embedded feat UUID refs,
 * "N ranks in ..." skills) and retains the full prose as `prereqText` for
 * everything else. It deliberately does NOT chase 100% coverage.
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

/*
 * ----------------------------------------------------------------------
 * Fragment/clause splitting shared by every structured extractor below
 * (abilities, BAB, caster level, character level, and the plain-text feat
 * name resolver in `resolveNamedFeatPrereqs`). Prereq prose is a semicolon-
 * and-comma-separated list, e.g. "Str 13; Dodge, Mobility; base attack bonus
 * +4" — each fragment is tested independently against one pattern, which is
 * what lets an unrecognized fragment ("proficient with weapon") sit right
 * next to a recognized one ("base attack bonus +8") without either affecting
 * the other (see issue #49 in `apps/web/src/model/prereqs.ts`).
 *
 * Crucially, this is also where "or" alternatives ("Cha 15, Int 15, or Wis
 * 15" — any ONE suffices, not all three) get excluded from extraction
 * entirely, rather than mis-read as an AND list. Two patterns:
 *  - A fragment that itself embeds "or" between two candidates ("Con 13 or
 *    Wis 13") is excluded on its own.
 *  - A comma list whose LAST fragment starts with "or" ("Cha 15, Int 15, or
 *    Wis 15") is an Oxford-comma alternation spanning the whole list — every
 *    fragment in that list is excluded, not just the last one.
 * "or higher/more/greater/better" is exempted from both checks: it's a
 * verbose way of writing a plain minimum ("caster level 6th or higher" is
 * just "caster level >= 6", already what a minimum means), not a real
 * alternative.
 * ----------------------------------------------------------------------
 */

/** Splits `text` on `sep` at paren-depth 0 only, so a parenthetical list
 * ("Knowledge (arcana, dungeoneering, or nature)") is never sliced apart. */
function splitTopLevel(text: string, sep: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = "";
  for (const ch of text) {
    if (ch === "(") depth++;
    else if (ch === ")") depth = Math.max(0, depth - 1);
    if (depth === 0 && ch === sep) {
      parts.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  parts.push(current);
  return parts;
}

function splitClauses(text: string): string[] {
  return splitTopLevel(text, ";")
    .map((s) => s.trim())
    .filter((s) => s.length > 0);
}

function splitFragments(clause: string): string[] {
  return splitTopLevel(clause, ",")
    .map((s) => s.trim().replace(/\.+$/, "").trim())
    .filter((s) => s.length > 0);
}

const OR_PREFIX_RE = /^or\b/i;
const BENIGN_OR_RE = /\bor\s+(?:higher|more|greater|better)\b/gi;

function stripBenignOr(s: string): string {
  return s.replace(BENIGN_OR_RE, "");
}

function fragmentIsAlternation(fragment: string): boolean {
  return /\bor\b/i.test(stripBenignOr(fragment));
}

/**
 * Every fragment of `text` that reads as part of an "or" alternative rather
 * than a flat AND requirement — see the block comment above. Returned as the
 * exact (trimmed, trailing-period-stripped) fragment strings, for an exact
 * membership test against whatever fragment an extractor is about to match.
 */
function excludedFragments(text: string): ReadonlySet<string> {
  const excluded = new Set<string>();
  for (const clause of splitClauses(text)) {
    const fragments = splitFragments(clause);
    if (fragments.length === 0) continue;
    const last = fragments[fragments.length - 1]!;
    const wholeClauseIsAlternation = fragments.length > 1 && OR_PREFIX_RE.test(stripBenignOr(last));
    for (const frag of fragments) {
      if (wholeClauseIsAlternation || fragmentIsAlternation(frag)) excluded.add(frag);
    }
  }
  return excluded;
}

/** Runs `pattern` (first-capture-group numeric) against every non-excluded
 * fragment of `text`, returning the first hit. */
function firstFragmentMatch(text: string, pattern: RegExp): number | undefined {
  const excluded = excludedFragments(text);
  for (const clause of splitClauses(text)) {
    for (const frag of splitFragments(clause)) {
      if (excluded.has(frag)) continue;
      const m = pattern.exec(frag);
      if (m) return Number(m[1]);
    }
  }
  return undefined;
}

const ABILITY_FRAG_RE = /\b(str|dex|con|int|wis|cha)\b\s+(\d+)/i;

function parseAbilities(text: string): { ability: AbilityId; min: number }[] {
  const excluded = excludedFragments(text);
  const out: { ability: AbilityId; min: number }[] = [];
  const seen = new Set<AbilityId>();
  for (const clause of splitClauses(text)) {
    for (const frag of splitFragments(clause)) {
      if (excluded.has(frag)) continue;
      const m = ABILITY_FRAG_RE.exec(frag);
      if (!m) continue;
      const ability = ABILITY_NAMES[m[1]!.toLowerCase()]!;
      if (seen.has(ability)) continue;
      seen.add(ability);
      out.push({ ability, min: Number(m[2]) });
    }
  }
  return out;
}

// "BAB" is never spelled out that way in the vendored slice today (only
// "base attack bonus"), but the abbreviation is common enough in published
// PF1 prereq lines elsewhere that it's worth matching defensively.
const BAB_FRAG_RE = /(?:base attack bonus|bab)\s*\+?\s*(\d+)/i;
const CASTER_LEVEL_FRAG_RE = /caster level\s*\+?\s*(\d+)/i;
const CHARACTER_LEVEL_FRAG_RE = /character level\s*\+?\s*(\d+)/i;

function parseBab(text: string): number | undefined {
  return firstFragmentMatch(text, BAB_FRAG_RE);
}

function parseCasterLevel(text: string): number | undefined {
  return firstFragmentMatch(text, CASTER_LEVEL_FRAG_RE);
}

function parseCharacterLevel(text: string): number | undefined {
  return firstFragmentMatch(text, CHARACTER_LEVEL_FRAG_RE);
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

  const text = stripHtml(resolveFoundryMarkup(section, resolveUuid));
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
  const charLevel = parseCharacterLevel(text);
  if (charLevel !== undefined) result.characterLevel = charLevel;
  return result;
}

/**
 * Second pass, run once every feat has been transformed (issue #108): matches
 * each feat's still-unstructured `prereqText` fragments against the full
 * vendored feat name list, converting an exact (case-insensitive, trimmed),
 * UNIQUE name match into an additional structured `FeatRef` — the same
 * "hard-block signal" a `@UUID` reference already produces, just spelled out
 * in prose instead of linked.
 *
 * Deliberately exact-match only: a fragment that's merely similar to a feat
 * name ("Improved Two" vs. "Improved Two-Weapon Fighting") never matches, and
 * a name shared by more than one vendored feat is skipped as ambiguous
 * (never guessed). "Or" alternatives are excluded the same way the other
 * extractors are, via `excludedFragments`. Mutates `feats` in place.
 */
export function resolveNamedFeatPrereqs(feats: Feat[]): void {
  const byName = new Map<string, Feat[]>();
  for (const feat of feats) {
    const key = feat.name.trim().toLowerCase();
    const existing = byName.get(key);
    if (existing) existing.push(feat);
    else byName.set(key, [feat]);
  }

  for (const feat of feats) {
    const text = feat.prerequisites.prereqText;
    if (!text) continue;
    const linkedIds = new Set(feat.prerequisites.feats.map((r) => r.id));
    const excluded = excludedFragments(text);
    const newRefs: FeatRef[] = [];
    for (const clause of splitClauses(text)) {
      for (const frag of splitFragments(clause)) {
        if (excluded.has(frag)) continue;
        const matches = byName.get(frag.toLowerCase());
        if (!matches || matches.length !== 1) continue; // no match, or ambiguous
        const match = matches[0]!;
        if (match.id === feat.id || linkedIds.has(match.id)) continue;
        linkedIds.add(match.id);
        newRefs.push({ id: match.id, name: match.name, uuid: match.uuid });
      }
    }
    if (newRefs.length > 0) feat.prerequisites.feats = [...feat.prerequisites.feats, ...newRefs];
  }
}
