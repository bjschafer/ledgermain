/**
 * PF1 slayer talent catalog (issue #74 Phase 3b) — UNLIKE every sibling
 * rogue-family subsystem (`rogue-talents.ts`, `ninja-tricks.ts`,
 * `vigilante-talents.ts`), there is no pre-existing hand-authored table here:
 * the slayer class previously had zero talent-picker support in this app
 * beyond the "Extra Slayer Talent" feat's repeatable-feat audit note
 * (`feat-classification.ts`). So this file is a pure "catalog from data, NO
 * mechanics overlay yet" — every entry is `displayOnly`, sourced entirely
 * from `RefData.slayerTalents` (see that type's doc comment), the "Pf Data
 * 1e" vendored catalog (43 entries after junk filtering). A future pass can
 * add hand-verified `changes`/`contextNotes` the same way `rage-powers.ts`
 * grew its overlay — this file's shape (`SlayerTalentEntry`,
 * `resolveSlayerTalent`, `slayerTalentCatalog`) is deliberately parallel to
 * that eventual overlay so promoting an entry later needs no restructuring.
 *
 * RAW cross-class sharing (a slayer may select "a rogue talent" instead of a
 * slayer talent; at 10th level+ an "Advanced Slayer Talent" pick may instead
 * be spent on a rogue/ninja advanced talent) is already represented
 * STRUCTURALLY as its own catalog rows — `rogue_talent` ("Other Talents") and
 * `rogue_and_ninja_advanced_talents` ("Advanced Slayer Talents") — rather
 * than needing a cross-wired mechanic. No new cross-class picker plumbing is
 * added here, matching this project's existing "ninja can spend a trick on a
 * rogue talent" posture (`ninja-tricks.ts`'s doc comment): the option is
 * surfaced as a normal, display-only catalog entry, not a live budget
 * transfer between `build.rogueTalents` and `build.slayerTalents`.
 *
 * The source's `category` is prefixed `Advanced ` for the 10th-level
 * "Advanced Slayer Talents" tier — confirmed against the vendored Foundry
 * `ClassFeature` description for "Advanced Talents (SLA)": "At 10th level
 * and every 2 levels thereafter, a slayer can select an advanced talent in
 * place of a slayer talent" (an IN-PLACE-OF swap, not extra budget — same
 * shape as ninja master tricks). Carried through uninterpreted, same as
 * `RagePower.level`'s trap: the handful of vendored entries carrying a raw
 * `level` (e.g. Jaguar's Pounce `1` -> Jaguar's Protection `2`) are
 * within-chain tier depth, not a slayer-level requirement.
 */

import type { RefData, SlayerTalent, SourceRef } from "@pf1/schema";

/** True when a vendored talent's own `category` marks it as the 10th-level "Advanced" tier (see file doc comment). */
export function isAdvancedSlayerTalent(category: string | undefined): boolean {
  return category?.startsWith("Advanced ") ?? false;
}

/** A slayer-talent catalog entry the picker can browse — always display-only today (see file doc comment). */
export interface SlayerTalentEntry {
  id: string;
  name: string;
  nameSuffix?: string;
  category?: string;
  /** True for the 10th-level "Advanced Slayer Talents" tier, chosen in place of a normal pick — see `isAdvancedSlayerTalent`. */
  advanced: boolean;
  /** Cheap HTML->text preview for the picker row. */
  summary: string;
  description?: string;
  sources?: SourceRef[];
  /** Always true — no slayer talent carries a hand-verified mechanical effect yet, see file doc comment. */
  displayOnly: true;
}

/** Cheap HTML->text preview for a catalog entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

function toEntry(entry: SlayerTalent): SlayerTalentEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    advanced: isAdvancedSlayerTalent(entry.category),
    summary: plainTextPreview(entry.description ?? ""),
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked slayer-talent id (`doc.build.slayerTalents` entries) to its vendored catalog entry. */
export function resolveSlayerTalent(id: string, refData: RefData): SlayerTalentEntry | undefined {
  const vendored = refData.slayerTalents?.[id];
  return vendored ? toEntry(vendored) : undefined;
}

/** The full picker-browsable catalog — every vendored entry, display-only (see file doc comment). */
export function slayerTalentCatalog(refData: RefData): SlayerTalentEntry[] {
  return Object.values(refData.slayerTalents ?? {}).map(toEntry);
}
