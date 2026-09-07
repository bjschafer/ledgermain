/**
 * Pure spellbook export: the character's known spells as self-contained
 * markdown, spell ids hydrated against RefData. The JSON export carries the
 * doc (build choices, ids and all) and only this app can read it back; this
 * one is for everywhere else: pasted into a chat with an assistant for
 * review, or handed to a party member. Every displayed number (range bands,
 * `@cl`-scaled durations, damage dice) is resolved against the character's
 * real caster level via the same `spellStats.ts` formatters the tracker's
 * `SpellDetail` uses, so the two can't drift.
 *
 * Scope is everything the character knows: the curated known list per caster
 * class, plus the free cantrips a `grantsAllCantrips` class gets. Live state
 * (what's prepared, what's expended) is deliberately absent: this is the
 * spellbook, not the day's loadout. A `preparesFromClassList` caster
 * (cleric/druid/…) has no known list to export, so their section says so
 * rather than dumping the entire class list.
 */
import { classByTag, featNameSlug } from "@pf1/engine";
import type { CharacterDoc, DerivedSheet, RefData, Spell } from "@pf1/schema";

import { casterLevelForClass, effectiveCasterClassLevel } from "./casterLevel.js";
import { spellLevelMap } from "./preparedSpells.js";
import {
  casterClassesOf,
  casterModelFor,
  grantedCantrips,
  knownSpellsFor,
  SCHOOL_LABELS,
} from "./spellcasting.js";
import {
  formatCastingTime,
  formatSpellArea,
  formatSpellComponents,
  formatSpellDuration,
  formatSpellRange,
  spellDamageParts,
} from "./spellStats.js";

/** Save info from the first action that has one, mirroring `SpellDetail`. */
function saveLine(spell: Spell): string | null {
  for (const action of spell.actions) {
    if (!action.save) continue;
    return action.save.description ?? action.save.type ?? null;
  }
  return null;
}

/**
 * A spell's school + descriptors as a statblock-style line, e.g.
 * `"conjuration (creation) [acid]"`. Descriptors arrive camelCased
 * (`mindAffecting`, `languageDependent`) because the vendored pack never
 * dash-forms them.
 */
function schoolLine(spell: Spell): string | null {
  if (!spell.school) return null;
  const name = SCHOOL_LABELS[spell.school as keyof typeof SCHOOL_LABELS] ?? spell.school;
  const descriptors = spell.descriptors
    .map((d) => d.replace(/([a-z])([A-Z])/g, "$1-$2").toLowerCase())
    .join(", ");
  return `${name.toLowerCase()}${descriptors ? ` [${descriptors}]` : ""}`;
}

/**
 * Vendored spell descriptions are Foundry-pack HTML: `<p>` paragraphs,
 * `<strong>`/`<i>` emphasis, and occasional `<ul>`/`<table>` blocks. Converted
 * to markdown (bold, italics, `- ` bullets, `| `-separated table cells) so the
 * export reads as formatted text rather than escaped tags. No `@UUID` or roll
 * link syntax appears in the spells pack, so no other Foundry inline
 * constructs need handling here.
 */
export function descriptionToMarkdown(html: string): string {
  return html
    .replace(/<(strong|b)>/gi, "**")
    .replace(/<\/(strong|b)>/gi, "**")
    .replace(/<(em|i)>/gi, "*")
    .replace(/<\/(em|i)>/gi, "*")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "- ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<\/(td|th)>/gi, " | ")
    .replace(/<\/tr>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&mdash;/g, "—")
    .replace(/&nbsp;/g, " ")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/** One spell as a markdown statblock, every `@cl`-scaled value at `cl`. */
function spellBlock(spell: Spell, cl: number): string[] {
  const out: string[] = [`#### ${spell.name}`, ""];
  const school = schoolLine(spell);
  if (school) out.push(`- **School:** ${school}`);
  const castingTime = formatCastingTime(spell);
  if (castingTime) out.push(`- **Casting Time:** ${castingTime}`);
  const components = formatSpellComponents(spell);
  if (components) out.push(`- **Components:** ${components}`);
  const range = formatSpellRange(spell, cl);
  if (range) out.push(`- **Range:** ${range}`);
  const area = formatSpellArea(spell);
  if (area) out.push(`- **Area/Target:** ${area}`);
  const duration = formatSpellDuration(spell, cl);
  if (duration) out.push(`- **Duration:** ${duration}`);
  const damage = spellDamageParts(spell, cl);
  if (damage.length > 0) {
    out.push(
      `- **Damage:** ${damage
        .map((d) => {
          const dice = d.types.length > 0 ? `${d.text} ${d.types.join("/")}` : d.text;
          return d.count !== undefined ? `${dice} ×${d.count}` : dice;
        })
        .join(", ")}`,
    );
  }
  const save = saveLine(spell);
  if (save) out.push(`- **Saving Throw:** ${save}`);
  if (spell.sr !== undefined) {
    out.push(`- **Spell Resistance:** ${spell.sr.charAt(0).toUpperCase() + spell.sr.slice(1)}`);
  }
  if (spell.description) {
    const desc = descriptionToMarkdown(spell.description);
    if (desc) out.push("", desc);
  }
  return out;
}

/** One caster class's known spells as a section, or `null` for a non-caster. */
function casterSection(doc: CharacterDoc, refData: RefData, tag: string): string[] | null {
  const model = casterModelFor(tag);
  if (!model) return null;
  const className = classByTag(refData, tag)?.name ?? tag;
  const classLevel = effectiveCasterClassLevel(doc, refData, tag);
  const cl = casterLevelForClass(tag, classLevel);

  if (model.preparesFromClassList) {
    const count = Object.values(refData.spellLists[tag] ?? {}).reduce(
      (n, ids) => n + ids.length,
      0,
    );
    return [
      `## ${className} (CL ${cl})`,
      "",
      `${className}s prepare from the full ${className.toLowerCase()} spell list each day (${count} spells), so there is no spellbook to export.`,
      "",
    ];
  }

  const byLevel = new Map<number, Spell[]>();
  const unknown: string[] = [];
  const add = (id: string): void => {
    const spell = refData.spells[id];
    if (!spell) {
      unknown.push(id);
      return;
    }
    const level = spellLevelMap(refData, tag).get(id) ?? spell.level;
    (byLevel.get(level) ?? byLevel.set(level, []).get(level)!).push(spell);
  };
  for (const id of knownSpellsFor(doc, refData, tag)) add(id);
  // A `grantsAllCantrips` caster's cantrips are known for free and never sit
  // in the stored known list, so they join the export here.
  if (model.grantsAllCantrips) {
    for (const c of grantedCantrips(refData, tag)) {
      if (!knownSpellsFor(doc, refData, tag).includes(c.id)) add(c.id);
    }
  }

  const out = [`## ${className} ${model.knownLabel} (CL ${cl})`, ""];
  for (const level of [...byLevel.keys()].sort((a, b) => a - b)) {
    out.push(`### Level ${level}${level === 0 ? " (cantrips)" : ""}`, "");
    const spells = byLevel.get(level)!.sort((a, b) => a.name.localeCompare(b.name));
    for (const spell of spells) out.push(...spellBlock(spell, cl), "");
  }
  if (unknown.length > 0) {
    out.push(`Unknown spell ids: ${unknown.join(", ")}`, "");
  }
  return out;
}

/**
 * The character's known spells across every caster class, as markdown.
 * Empty string when the character has no caster class and no known spells
 * (callers hide the export affordance in that case).
 */
export function spellbookMarkdown(
  doc: CharacterDoc,
  sheet: DerivedSheet,
  refData: RefData,
): string {
  const name = doc.identity.name || "Unnamed";
  const raceName = refData.races[doc.identity.race]?.name;
  const classLine = doc.identity.classes
    .map((c) => `${classByTag(refData, c.tag)?.name ?? c.tag} ${c.level}`)
    .join(" / ");
  const out = [
    `# ${name}: Spellbook`,
    "",
    [raceName, classLine].filter(Boolean).join(", ") + ` (level ${sheet.level})`,
    "",
  ];
  let any = false;
  for (const { tag } of casterClassesOf(doc, refData)) {
    const section = casterSection(doc, refData, tag);
    if (section) {
      out.push(...section);
      any = true;
    }
  }
  if (!any) return "";
  return (
    out
      .join("\n")
      .replace(/\n{3,}/g, "\n\n")
      .trim() + "\n"
  );
}

/** A filesystem-safe filename for the markdown export, alongside the JSON one. */
export function spellbookFilename(doc: CharacterDoc): string {
  const slug = featNameSlug(doc.identity.name);
  return `${slug || "character"}-spellbook.md`;
}
