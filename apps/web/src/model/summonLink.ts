/**
 * Deep link from a Summon Monster / Summon Nature's Ally spell row into the
 * reference site's `#/summon` helper (see `apps/reference`'s
 * `hooks/useHashRoute.ts` for the authoritative URL contract:
 * `#/summon/<sm|sna>/<1-9>?feats=a,b&cl=N`). The two apps share only the URL
 * shape, never code, since they're separate bundles.
 *
 * Detection matches by spell name rather than a refData id: the two summon
 * families are just "Summon Monster/Summon Nature's Ally" plus a roman
 * numeral, and matching text is robust to whichever pinned spell entry the
 * data pipeline happens to produce.
 */
import { featNameSlug } from "@pf1/engine";
import type { CharacterDoc, RefData } from "@pf1/schema";

import { featInstances, grantedFeats } from "./feats.js";
import { referenceSiteUrl } from "./referenceSite.js";

export type SummonSpellList = "sm" | "sna";

export interface DetectedSummonSpell {
  list: SummonSpellList;
  level: number;
}

const ROMAN_LEVELS: Record<string, number> = {
  i: 1,
  ii: 2,
  iii: 3,
  iv: 4,
  v: 5,
  vi: 6,
  vii: 7,
  viii: 8,
  ix: 9,
};

// Fully anchored, so the numeral alternation's order doesn't matter.
const SUMMON_SPELL_RE = /^summon (monster|nature's ally) (i|ii|iii|iv|v|vi|vii|viii|ix)$/i;

/** Detect Summon Monster/Summon Nature's Ally I-IX by name; null for every other spell. */
export function detectSummonSpell(spellName: string): DetectedSummonSpell | null {
  const normalized = spellName.trim().replace(/[‘’]/g, "'");
  const match = SUMMON_SPELL_RE.exec(normalized);
  if (!match) return null;
  const level = ROMAN_LEVELS[match[2]!.toLowerCase()];
  if (!level) return null;
  return { list: match[1]!.toLowerCase() === "monster" ? "sm" : "sna", level };
}

/** Reference-site feat slugs among Augment Summoning / Superior Summoning. */
const SUMMON_HELPER_FEAT_SLUGS = new Set(["augment-summoning", "superior-summoning"]);

/**
 * Which of Augment Summoning / Superior Summoning this character has, as the
 * reference site's feat slugs -- built the same way `ownedMetamagic` walks
 * owned feats (primary, extra, and class-granted), just filtered to the two
 * slugs the summoning helper understands.
 */
export function summonFeatSlugs(doc: CharacterDoc, refData: RefData): string[] {
  const slugs = new Set<string>();
  for (const inst of featInstances(doc)) {
    const name = refData.feats[inst.featId]?.name;
    if (name) slugs.add(featNameSlug(name));
  }
  for (const g of grantedFeats(doc, refData)) {
    slugs.add(featNameSlug(g.featName));
  }
  return [...slugs].filter((slug) => SUMMON_HELPER_FEAT_SLUGS.has(slug)).sort();
}

/**
 * Build the full `#/summon` URL for a detected spell. `cl` is always emitted:
 * any query string at all makes the helper trust the URL's feats over its own
 * localStorage defaults, so a caster with no summon feats lands with none
 * preselected instead of inheriting whatever was ticked last.
 */
export function summonHelperHref(
  spell: DetectedSummonSpell,
  feats: readonly string[],
  casterLevel: number,
): string {
  const search = new URLSearchParams();
  if (feats.length > 0) search.set("feats", feats.join(","));
  search.set("cl", String(Math.round(casterLevel)));
  return `${referenceSiteUrl()}#/summon/${spell.list}/${spell.level}?${search.toString()}`;
}
