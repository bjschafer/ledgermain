/**
 * Language display + bonus-language hint (pure, no DOM). PF1 grants racial
 * languages automatically (`RefData.races[*].languages`); "bonus languages"
 * from a positive Int modifier or Linguistics ranks have no fixed vocabulary
 * in the vendored data, so this only computes a *suggested* count — it never
 * blocks or caps what the player records in `build.bonusLanguages` (soft-warning
 * posture, matching `model/prereqs.ts`).
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

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

/** Display label for a raw racial language id (e.g. `"elven"` → `"Elven"`). */
export function languageLabel(id: string): string {
  return id.length > 0 ? id.charAt(0).toUpperCase() + id.slice(1) : id;
}
