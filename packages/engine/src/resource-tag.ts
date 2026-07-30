/**
 * Foundry's `@resources.<tag>` roll-data key for a granting item: a camelCase
 * slug of the item's NAME — split on runs of non-alphanumeric characters,
 * lowercase the first word, Title-Case each subsequent word, and join with no
 * separator. Verified against the vendored catalog's own granting-item names:
 * "Grit" -> "grit", "Burn" -> "burn", "Adaptable Luck" -> "adaptableLuck",
 * "Tenacious" -> "tenacious", "Secrets of the Sphinx (Scarab Sages)" ->
 * "secretsOfTheSphinxScarabSages", "Formerly Mindswapped (Strange Aeons)" ->
 * "formerlyMindswappedStrangeAeons".
 *
 * Standalone (no dependency on `resources.ts`/`rolldata.ts`) so both can
 * import it: `resources.ts` uses it to resolve `@resources.*` formulas
 * against pools derived earlier in the same pass (Gunslinger's Utility Shot),
 * and the web app uses the engine's `resourcePoolRollDataResources` (built on
 * top of this) to populate `RollData.resources` for inline-roll text.
 */
export function resourceTagSlug(name: string): string {
  const words = name.split(/[^A-Za-z0-9]+/).filter(Boolean);
  return words
    .map((word, i) =>
      i === 0 ? word.toLowerCase() : word.charAt(0).toUpperCase() + word.slice(1).toLowerCase(),
    )
    .join("");
}
