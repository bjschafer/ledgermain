/**
 * Pathbuilder 1e HTML stat-block importer — reads the rendered HTML "stat
 * block" produced by Pathbuilder 1e's (the community Pathfinder 1e character
 * builder app) only export option. Unlike Pathbuilder *2e*, which exports
 * structured JSON, Pathbuilder 1e's export is a small standalone HTML
 * document styled to look like a Bestiary stat block (`<p class="stat-block-
 * title">`, `<p class="stat-block-1">`, `<div class="divIndent">`, ...) —
 * see the committed sample at
 * `apps/web/test/fixtures/pathbuilder-statblock-c1-orcAlchemist.html` (issue
 * #3; the owner's own export, first confirmed real sample of this tool's
 * output). `importPathbuilder.ts` (the earlier, speculative JSON importer)
 * predates this sample and stays speculative — see its module doc comment.
 *
 * PROVENANCE: written and tested against exactly one real sample. The
 * overall paragraph/label structure looks like a fixed template (Foundry-
 * style `<b>Label</b> value` pairs inside `<p class="stat-block-1">`
 * elements), so this is regex/string-slicing over that structure rather than
 * a general HTML parser (house style — see `xml.ts`'s doc comment for the
 * same reasoning applied to Hero Lab's XML). Things that look fragile if a
 * second real sample turns up different: the single-word-race assumption in
 * the "Alignment Size Race Class N; Class N;" line (a two-word race name
 * would misparse); the malformed `</p></p>` right before the Equipment
 * paragraph in the sample (harmless here since every extraction regex stops
 * at the *nearest* `</p>`, but suggests Pathbuilder's own HTML emission has
 * bugs); and the empty-text `<a></a>` anchor inside the SQ list (a dropped
 * label for one class feature, not something we can recover).
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  buildDocFromExternalData,
  buildNameIndex,
  emptyExternalData,
  nameSlug,
  type ExternalCharacterData,
  type ImportReport,
} from "./externalImport.js";

/** Content sniff used by `importExternalFile.ts` before it falls back to treating `<`-leading text as Hero Lab XML. */
export function isPathbuilderStatBlockHtml(text: string): boolean {
  return /stat-block-title/i.test(text) && /stat-block-1/i.test(text);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/gi, "&")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&quot;/gi, '"')
    .replace(/&#0*39;|&apos;/gi, "'")
    .replace(/&rsquo;/gi, "’")
    .replace(/&nbsp;/gi, " ")
    .replace(/&#(\d+);/g, (_m, code: string) => String.fromCodePoint(Number(code)))
    .replace(/&#x([0-9a-f]+);/gi, (_m, code: string) => String.fromCodePoint(parseInt(code, 16)));
}

function stripTags(html: string): string {
  return decodeHtmlEntities(html.replace(/<[^>]*>/g, " "))
    .replace(/\s+/g, " ")
    .trim();
}

/** Inner text of every `<a>...</a>` in `html`, cleaned and with empty entries dropped. */
function extractAnchorTexts(html: string): string[] {
  const out: string[] = [];
  const re = /<a\b[^>]*>([\s\S]*?)<\/a>/gi;
  let m: RegExpExecArray | null;
  while ((m = re.exec(html))) {
    const text = stripTags(m[1]!);
    if (text) out.push(text);
  }
  return out;
}

/** A spell name anchor's text also carries a trailing " (DC NN)" — strip it. */
function cleanSpellName(raw: string): string {
  return raw.replace(/\(DC\s*\d+\)\s*$/i, "").trim();
}

/** Content between `<b>${label}</b>` and the next `</p>` (case-insensitive, first match), stripped of the label itself. */
function labeledParagraph(html: string, label: string): string | undefined {
  const re = new RegExp(
    `<b>${label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}<\\/b>([\\s\\S]*?)<\\/p>`,
    "i",
  );
  return re.exec(html)?.[1];
}

const ALIGNMENT_WORDS = new Set(["Lawful", "Neutral", "Chaotic", "Good", "Evil", "True"]);
const SIZE_WORDS = new Set([
  "Fine",
  "Diminutive",
  "Tiny",
  "Small",
  "Medium",
  "Large",
  "Huge",
  "Gargantuan",
  "Colossal",
]);

interface HeaderLine {
  alignment?: string;
  size?: string;
  race?: string;
  classes: { name: string; level: number }[];
}

/**
 * Parse the "Neutral Medium Orc Fighter 4; Alchemist 8; " line: alignment,
 * size, and a single-word race prefix the first ";"-separated segment, then
 * one or more "Class N" pairs (the first segment's tail, plus every
 * subsequent segment for a multiclass character).
 */
function parseHeaderLine(line: string): HeaderLine {
  const segments = line
    .split(";")
    .map((s) => s.trim())
    .filter(Boolean);
  const result: HeaderLine = { classes: [] };
  if (segments.length === 0) return result;

  const words = segments[0]!.split(/\s+/).filter(Boolean);
  let idx = 0;
  if (
    idx + 1 < words.length &&
    ALIGNMENT_WORDS.has(words[idx]!) &&
    ALIGNMENT_WORDS.has(words[idx + 1]!)
  ) {
    result.alignment = `${words[idx]} ${words[idx + 1]}`;
    idx += 2;
  } else if (idx < words.length && ALIGNMENT_WORDS.has(words[idx]!)) {
    result.alignment = words[idx];
    idx += 1;
  }
  if (idx < words.length && SIZE_WORDS.has(words[idx]!)) {
    result.size = words[idx];
    idx += 1;
  }
  const rest = words.slice(idx);
  if (rest.length >= 2 && /^\d+$/.test(rest[rest.length - 1]!)) {
    result.race = rest[0];
    const classWords = rest.slice(1, -1);
    const level = Number(rest[rest.length - 1]);
    if (classWords.length > 0) result.classes.push({ name: classWords.join(" "), level });
  }

  for (const seg of segments.slice(1)) {
    const segWords = seg.split(/\s+/).filter(Boolean);
    if (segWords.length >= 2 && /^\d+$/.test(segWords[segWords.length - 1]!)) {
      const level = Number(segWords[segWords.length - 1]);
      result.classes.push({ name: segWords.slice(0, -1).join(" "), level });
    }
  }
  return result;
}

interface SpellLevelBlock {
  /** Cleaned level label as shown in the source, e.g. "3rd (3/day)". */
  label: string;
  spellNames: string[];
}

interface SpellcastingBlock {
  /** The class name prefix of "<Class> spells prepared/known", e.g. "Alchemist". */
  className: string;
  levels: SpellLevelBlock[];
}

function parseSpellcastingBlocks(html: string): SpellcastingBlock[] {
  const blocks: SpellcastingBlock[] = [];
  const headerRe = /<b>([^<]+?)\s+spells\s+(?:prepared|known)<\/b>([\s\S]*?)<\/p>/gi;
  let headerMatch: RegExpExecArray | null;
  while ((headerMatch = headerRe.exec(html))) {
    const className = headerMatch[1]!.trim();
    const body = headerMatch[2]!;
    const levels: SpellLevelBlock[] = [];
    const divRe = /<div class=['"]divIndent['"]>([\s\S]*?)<\/div>/gi;
    let divMatch: RegExpExecArray | null;
    while ((divMatch = divRe.exec(body))) {
      const block = divMatch[1]!;
      const labelMatch = /<b>([\s\S]*?)<\/b>/i.exec(block);
      const label = labelMatch ? stripTags(labelMatch[1]!).replace(/-\s*$/, "").trim() : "";
      const spellNames = extractAnchorTexts(block).map(cleanSpellName).filter(Boolean);
      levels.push({ label, spellNames });
    }
    blocks.push({ className, levels });
  }
  return blocks;
}

interface SkillTotal {
  name: string;
  total: number;
}

function parseSkillTotals(html: string): SkillTotal[] {
  const content = labeledParagraph(html, "Skills");
  if (!content) return [];
  const text = stripTags(content);
  const out: SkillTotal[] = [];
  for (const entry of text.split(";")) {
    const trimmed = entry.trim();
    if (!trimmed) continue;
    const m = /^(.*?)\s+([+-]\d+)$/.exec(trimmed);
    if (m) out.push({ name: m[1]!.trim(), total: Number(m[2]) });
  }
  return out;
}

interface SourceStats {
  ac?: number;
  touch?: number;
  flatFooted?: number;
  hp?: number;
  fort?: number;
  ref?: number;
  will?: number;
  bab?: number;
  cmb?: number;
  cmd?: number;
  init?: number;
  perception?: number;
}

function parseSourceStats(html: string): SourceStats {
  const stats: SourceStats = {};
  const ac = /<b>AC<\/b>\s*(\d+),\s*touch\s*(\d+),\s*flat-footed\s*(\d+)/i.exec(html);
  if (ac) {
    stats.ac = Number(ac[1]);
    stats.touch = Number(ac[2]);
    stats.flatFooted = Number(ac[3]);
  }
  const hp = /<b>hp<\/b>\s*(\d+)/i.exec(html);
  if (hp) stats.hp = Number(hp[1]);
  const saves =
    /<b>Fort<\/b>\s*([+-]?\d+),\s*<b>Ref<\/b>\s*([+-]?\d+),\s*<b>Will<\/b>\s*([+-]?\d+)/i.exec(
      html,
    );
  if (saves) {
    stats.fort = Number(saves[1]);
    stats.ref = Number(saves[2]);
    stats.will = Number(saves[3]);
  }
  const babLine =
    /<b>Base Atk<\/b>\s*\+?\s*([+-]?\d+);\s*<b>CMB<\/b>\s*([+-]?\d+);\s*<b>CMD<\/b>\s*(\d+)/i.exec(
      html,
    );
  if (babLine) {
    stats.bab = Number(babLine[1]);
    stats.cmb = Number(babLine[2]);
    stats.cmd = Number(babLine[3]);
  }
  const init = /<b>Init<\/b>\s*([+-]?\d+)/i.exec(html);
  if (init) stats.init = Number(init[1]);
  const perception = /Perception:\s*([+-]?\d+)/i.exec(html);
  if (perception) stats.perception = Number(perception[1]);
  return stats;
}

/**
 * Extra, off-`ExternalCharacterData` information pulled from the stat block
 * that doesn't have a home in the shared tool-agnostic shape — used by
 * {@link importPathbuilderHtml} to build the human-readable report.
 */
export interface PathbuilderHtmlExtras {
  sourceStats: SourceStats;
  skillTotals: SkillTotal[];
  spellcasting: SpellcastingBlock[];
  /** Raw SQ text (minus "Discoveries:" and beyond), anchor texts only. */
  specialQualities: string[];
  discoveries: string[];
  /** True if at least one SQ/discovery anchor had no visible text in the source (a Pathbuilder template quirk). */
  hasUnlabeledSpecialQuality: boolean;
  equipmentText: string;
  /** `{ feat, choice }` pairs split out of "Feat: Choice"-style feat names, e.g. Weapon Focus: Falchion. */
  featChoices: { feat: string; choice: string }[];
}

/**
 * Reduce a Pathbuilder 1e HTML stat-block export to {@link
 * ExternalCharacterData} plus {@link PathbuilderHtmlExtras}. Pure string
 * processing, no `RefData` lookups — matching or ability-score back-out
 * against `RefData` happens in {@link importPathbuilderHtml}. Throws only
 * when the input doesn't look like a stat block at all.
 */
export function pathbuilderHtmlToIntermediate(html: string): {
  data: ExternalCharacterData;
  extras: PathbuilderHtmlExtras;
} {
  if (!isPathbuilderStatBlockHtml(html)) {
    throw new Error(
      "That file doesn't look like a Pathbuilder 1e stat-block export (expected the rendered HTML stat block).",
    );
  }
  const data = emptyExternalData();

  const titleMatch = /<p class="stat-block-title">([\s\S]*?)<\/p>/i.exec(html);
  if (titleMatch) {
    const name = stripTags(titleMatch[1]!);
    if (name) data.name = name;
  }

  const headerMatch =
    /<p class="stat-block-title">[\s\S]*?<\/p>\s*<p class="stat-block-1">([\s\S]*?)<\/p>/i.exec(
      html,
    );
  const header = headerMatch ? parseHeaderLine(stripTags(headerMatch[1]!)) : { classes: [] };
  data.alignment = header.alignment;
  data.race = header.race;
  data.classes = header.classes;

  const abilityMatch =
    /<b>Str<\/b>\s*(\d+),\s*<b>Dex<\/b>\s*(\d+),\s*<b>Con<\/b>\s*(\d+),\s*<b>Int<\/b>\s*(\d+),\s*<b>Wis<\/b>\s*(\d+),\s*<b>Cha<\/b>\s*(\d+)/i.exec(
      html,
    );
  if (abilityMatch) {
    data.abilities = {
      str: Number(abilityMatch[1]),
      dex: Number(abilityMatch[2]),
      con: Number(abilityMatch[3]),
      int: Number(abilityMatch[4]),
      wis: Number(abilityMatch[5]),
      cha: Number(abilityMatch[6]),
    };
  }

  const featsContent = labeledParagraph(html, "Feats");
  const featChoices: { feat: string; choice: string }[] = [];
  if (featsContent) {
    for (const rawFeat of extractAnchorTexts(featsContent)) {
      const colon = rawFeat.indexOf(":");
      if (colon === -1) {
        data.feats.push(rawFeat);
      } else {
        const feat = rawFeat.slice(0, colon).trim();
        const choice = rawFeat.slice(colon + 1).trim();
        data.feats.push(feat);
        if (choice) featChoices.push({ feat, choice });
      }
    }
  }

  const sqContent = labeledParagraph(html, "SQ") ?? "";
  const discoveriesSplit = sqContent.split(/<b>Discoveries:<\/b>/i);
  const sqRaw = discoveriesSplit[0] ?? "";
  const discoveriesRaw = discoveriesSplit.slice(1).join(" ");
  const specialQualities = extractAnchorTexts(sqRaw);
  const discoveries = extractAnchorTexts(discoveriesRaw);
  const totalSqAnchors =
    (sqRaw.match(/<a\b/gi)?.length ?? 0) + (discoveriesRaw.match(/<a\b/gi)?.length ?? 0);
  const hasUnlabeledSpecialQuality = totalSqAnchors > specialQualities.length + discoveries.length;

  const equipmentContent = labeledParagraph(html, "Equipment");
  const equipmentText = equipmentContent ? stripTags(equipmentContent) : "";

  const extras: PathbuilderHtmlExtras = {
    sourceStats: parseSourceStats(html),
    skillTotals: parseSkillTotals(html),
    spellcasting: parseSpellcastingBlocks(html),
    specialQualities,
    discoveries,
    hasUnlabeledSpecialQuality,
    equipmentText,
    featChoices,
  };

  return { data, extras };
}

/** Numeric racial ability-score `Change`s (e.g. Orc's +4 Str) for `raceId`, keyed by ability. Skips non-fixed formulas (e.g. flexible/choice-based bonuses). */
function racialAbilityMods(refData: RefData, raceId: string): Partial<Record<string, number>> {
  const race = refData.races[raceId];
  if (!race) return {};
  const out: Partial<Record<string, number>> = {};
  const abilityIds = new Set(["str", "dex", "con", "int", "wis", "cha"]);
  for (const change of race.changes) {
    if (change.type !== "racial" || change.operator === "set") continue;
    if (!abilityIds.has(change.target)) continue;
    if (!/^-?\d+$/.test(change.formula.trim())) continue; // skip formula/choice-based mods, e.g. flexible +2
    out[change.target] = (out[change.target] ?? 0) + Number(change.formula.trim());
  }
  return out;
}

function signed(n: number): string {
  return n >= 0 ? `+${n}` : `${n}`;
}

/**
 * Parse a Pathbuilder 1e HTML stat-block export and produce a `CharacterDoc`
 * + {@link ImportReport}. See the module doc comment for format provenance.
 *
 * Ability scores: the stat block only shows FINAL (post-racial) scores, but
 * `doc.abilities` stores base (pre-racial) scores — the engine re-applies
 * racial modifiers on top (see `packages/schema/src/character.ts`'s doc
 * comment on `abilities`). When the race is recognized, this backs out its
 * *fixed-value* racial ability changes (skipping flexible/choice-based ones,
 * e.g. Human's +2-to-any) so the imported character computes back to the
 * same final scores; level-based ability increases (4th/8th/12th/...) can't
 * be recovered from a stat block at all (it shows no breakdown), so those
 * are flagged as a caveat rather than guessed. When the race isn't
 * recognized, scores are imported as literal source totals with a warning
 * instead (consistent with how `importHeroLab.ts`/`importPathbuilder.ts`
 * treat ability input generally: no back-out, since neither has a confirmed
 * final-vs-base provenance to justify one).
 */
export function importPathbuilderHtml(
  html: string,
  refData: RefData,
): { doc: CharacterDoc; report: ImportReport } {
  const { data, extras } = pathbuilderHtmlToIntermediate(html);

  const raceMappedNotes: string[] = [];
  const raceCaveats: string[] = [];
  if (data.race && Object.keys(data.abilities).length > 0) {
    const raceId = buildNameIndex(refData.races).get(nameSlug(data.race));
    if (raceId) {
      const mods = racialAbilityMods(refData, raceId);
      const modAbilities = Object.keys(mods);
      if (modAbilities.length > 0) {
        const finalScores = { ...data.abilities };
        for (const ability of modAbilities) {
          const key = ability as keyof typeof data.abilities;
          const final = data.abilities[key];
          if (final == null) continue;
          data.abilities[key] = final - mods[ability]!;
        }
        const modText = modAbilities
          .map((a) => `${a} ${mods[a]! >= 0 ? "+" : ""}${mods[a]}`)
          .join(", ");
        const finalText = Object.entries(finalScores)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ");
        const baseText = Object.entries(data.abilities)
          .map(([k, v]) => `${k} ${v}`)
          .join(", ");
        raceMappedNotes.push(
          `Ability scores: source sheet lists final scores (${finalText}); backed out ${refData.races[raceId]!.name}'s racial modifiers (${modText}) to get base scores (${baseText}) for the doc.`,
        );
      }
      const totalLevel = data.classes.reduce((sum, c) => sum + (c.level || 0), 0);
      if (totalLevel >= 4) {
        raceCaveats.push(
          "Ability scores don't account for level-based ability increases (4th/8th/12th/...) — a stat block doesn't show which ability received them, so verify against the source sheet's final totals and adjust by hand if needed.",
        );
      }
    } else {
      raceCaveats.push(
        `Ability scores imported as literal source totals (race "${data.race}" wasn't recognized, so racial modifiers couldn't be backed out) — they may not match once a race is set and the sheet recomputes.`,
      );
    }
  }

  const { doc, report } = buildDocFromExternalData(data, refData, "pathbuilder");

  for (const note of raceMappedNotes) report.mapped.push(note);
  for (const note of raceCaveats) report.unmapped.push(note);

  for (const { feat, choice } of extras.featChoices) {
    report.unmapped.push(
      `Feat choice "${choice}" for "${feat}" wasn't applied automatically (e.g. a weapon/skill specialization) — set it by hand on the Feats tab.`,
    );
  }

  if (extras.skillTotals.length > 0) {
    for (const skill of extras.skillTotals) {
      const abbreviated = /\(a\)$/i.test(skill.name)
        ? ' (source sheet abbreviates the Craft/Profession subtype as "(a)" — the specific subtype isn\'t recoverable from a stat block)'
        : "";
      report.unmapped.push(
        `Skill "${skill.name}" showed a total of ${skill.total >= 0 ? "+" : ""}${skill.total} on the source sheet — Pathbuilder's stat block only prints totals, not ranks, so it wasn't imported${abbreviated}; add ranks by hand if needed.`,
      );
    }
  }

  if (extras.equipmentText) {
    report.unmapped.push(
      `Equipment listed on the source sheet wasn't imported (stat-block gear text isn't structured enough to map reliably): ${extras.equipmentText}`,
    );
  } else {
    report.unmapped.push(
      "The source sheet's Equipment section was empty — Pathbuilder 1e's stat block doesn't reliably list carried gear, so nothing was imported; add equipment by hand.",
    );
  }

  if (extras.specialQualities.length > 0 || extras.discoveries.length > 0) {
    const parts: string[] = [];
    if (extras.specialQualities.length > 0) parts.push(extras.specialQualities.join(", "));
    if (extras.discoveries.length > 0) parts.push(`Discoveries: ${extras.discoveries.join(", ")}`);
    const unlabeled = extras.hasUnlabeledSpecialQuality
      ? " (one entry had no visible label in the source and was dropped)"
      : "";
    report.unmapped.push(
      `Source sheet also lists these special qualities${unlabeled}: ${parts.join("; ")} — not imported, since these come from class features the engine derives automatically (or from a class not in this app's reference data).`,
    );
  }

  for (const block of extras.spellcasting) {
    const summary = block.levels
      .map((l) => `${l.label || "?"}: ${l.spellNames.join(", ") || "(none)"}`)
      .join(" | ");
    report.unmapped.push(
      `Source sheet spells under "${block.className} spells" (per level): ${summary}`,
    );
  }

  const s = extras.sourceStats;
  const statParts: string[] = [];
  if (s.ac != null) statParts.push(`AC ${s.ac} (touch ${s.touch}, flat-footed ${s.flatFooted})`);
  if (s.hp != null) statParts.push(`hp ${s.hp}`);
  if (s.fort != null)
    statParts.push(`Fort ${signed(s.fort)}/Ref ${signed(s.ref!)}/Will ${signed(s.will!)}`);
  if (s.bab != null) statParts.push(`BAB ${signed(s.bab)}, CMB ${signed(s.cmb!)}, CMD ${s.cmd}`);
  if (s.init != null) statParts.push(`Init ${signed(s.init)}`);
  if (s.perception != null) statParts.push(`Perception ${signed(s.perception)}`);
  if (statParts.length > 0) {
    report.unmapped.push(
      `Source sheet reported (not imported — the engine recomputes all of these): ${statParts.join(", ")}.`,
    );
  }

  return { doc, report };
}
