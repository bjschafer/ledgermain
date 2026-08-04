/**
 * Language display + bonus-language hint (pure, no DOM). PF1 grants racial
 * languages automatically (`RefData.races[*].languages`); "bonus languages"
 * from a positive Int modifier or Linguistics ranks have no fixed vocabulary
 * in the vendored data itself, so `suggestedBonusLanguageCount` only computes
 * a *suggested* count and `build.bonusLanguages` stays free text — this never
 * blocks or caps what the player records (soft-warning posture, matching
 * `model/prereqs.ts`). `model/languageCatalog.ts` supplies the hand-authored
 * vocabulary and per-race bonus-language options the builder's picker offers
 * on top of that free text.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

import {
  bonusLanguageOptionsForRace,
  catalogLanguage,
  LANGUAGE_CATALOG,
  type LanguageEntry,
} from "./languageCatalog.js";

/** Racial languages granted by the character's chosen race (empty if no race chosen, or race not found). */
export function racialLanguages(doc: CharacterDoc, refData: RefData): string[] {
  return refData.races[doc.identity.race]?.languages ?? [];
}

/**
 * Racial + bonus languages for display, deduplicated case-insensitively
 * (racial entries first, then bonus entries in the order the player added
 * them). A bonus language that merely re-types an already-known racial
 * language collapses to one entry.
 */
export function combinedLanguages(doc: CharacterDoc, refData: RefData): string[] {
  const racial = racialLanguages(doc, refData);
  const bonus = doc.build.bonusLanguages ?? [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const lang of [...racial.map(languageLabel), ...bonus]) {
    const trimmed = lang.trim();
    const key = trimmed.toLowerCase();
    if (!trimmed || seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }
  return out;
}

/**
 * Suggested bonus-language count: positive Int modifier (0 if Int mod is
 * negative or zero) plus ranks in Linguistics ("lin"). A hint only, shown
 * next to the bonus-language editor — never a hard cap.
 *
 * @param intMod final Intelligence modifier (from the derived sheet, so
 *   racial/item bonuses are included) — same convention as `skillBudget`.
 */
export function suggestedBonusLanguageCount(doc: CharacterDoc, intMod: number): number {
  const fromInt = Math.max(0, intMod);
  const fromLinguistics = doc.build.skillRanks.lin ?? 0;
  return fromInt + fromLinguistics;
}

/**
 * Display label for a raw racial language id (e.g. `"elven"` → `"Elven"`).
 * Resolves through the catalog first (for its exact display name), falling
 * back to a capitalized copy of the id for a language the catalog doesn't
 * cover — so an uncataloged vendored id (e.g. a race's own unique tongue)
 * still renders reasonably instead of blank.
 */
export function languageLabel(id: string): string {
  return (
    catalogLanguage(id)?.name ?? (id.length > 0 ? id.charAt(0).toUpperCase() + id.slice(1) : id)
  );
}

/**
 * The character's race's curated bonus-language options, resolved to catalog
 * entries and with anything already known racially filtered out (no point
 * suggesting a language the character already speaks automatically). `[]`
 * for a race with no fixed list (open "any" choice) or no race chosen —
 * distinguish that case from `raceBonusLanguagePolicy` below.
 */
export function suggestedRaceBonusLanguages(doc: CharacterDoc, refData: RefData): LanguageEntry[] {
  const options = bonusLanguageOptionsForRace(doc, refData);
  if (options === "any") return [];
  const known = new Set(racialLanguages(doc, refData).map((id) => id.toLowerCase()));
  return options
    .filter((id) => !known.has(id.toLowerCase()))
    .map((id) => catalogLanguage(id))
    .filter((entry): entry is LanguageEntry => entry != null);
}

/** Whether the character's race has a fixed bonus-language list or may pick any (non-secret) language. */
export function raceBonusLanguagePolicy(doc: CharacterDoc, refData: RefData): "fixed" | "any" {
  return bonusLanguageOptionsForRace(doc, refData) === "any" ? "any" : "fixed";
}

/**
 * The full catalog vocabulary for a free-text autocomplete, minus secret
 * languages (never a legal bonus-language pick) and anything already known
 * racially (no need to suggest re-adding it). Alphabetical by display name.
 */
export function pickableLanguages(doc: CharacterDoc, refData: RefData): LanguageEntry[] {
  const known = new Set(racialLanguages(doc, refData).map((id) => id.toLowerCase()));
  return LANGUAGE_CATALOG.filter((entry) => !entry.secret && !known.has(entry.id)).sort((a, b) =>
    a.name.localeCompare(b.name),
  );
}
