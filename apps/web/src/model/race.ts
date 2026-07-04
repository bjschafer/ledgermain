/**
 * Race-trait helpers that need to key off race NAME rather than a structured
 * RefData flag. The vendored Foundry race entries carry racial traits like
 * Half-Elf's Multitalented only as prose inside `description` — there's no
 * `Race.changes` entry or dedicated field to detect it structurally. Keying
 * off `race.name === "Half-Elf"` matches existing precedent in the codebase
 * (`model/feats.ts`'s `race?.name === "Human"` bonus-feat check). Document
 * the fragility: this silently stops matching if a future data-pipeline bump
 * ever renames the vendored Half-Elf entry.
 */
import type { CharacterDoc, RefData } from "@pf1/schema";

/**
 * The alternate racial trait that swaps out Half-Elf's Multitalented (issue
 * #35). Taking it disables the second-favored-class benefit.
 */
const DUAL_MINDED_TRAIT_ID = "half-elf-dual-minded";

/**
 * True when the character's race is Half-Elf, which grants Multitalented:
 * two favored classes instead of one (issue #4). See `CharacterDoc.identity.
 * favoredClass2` doc comment for the chosen-doc shape.
 *
 * Returns false when the Half-Elf has taken the Dual Minded alternate racial
 * trait (issue #35), which replaces Multitalented — so a chosen `favoredClass2`
 * stops earning FCB the moment the swap is made (the trait picker doesn't force
 * the stale value to be cleared).
 */
export function isMultitalented(doc: CharacterDoc, refData: RefData): boolean {
  if (refData.races[doc.identity.race]?.name !== "Half-Elf") return false;
  return !(doc.build.racialTraits ?? []).includes(DUAL_MINDED_TRAIT_ID);
}

/**
 * Total favored-class-bonus-eligible character levels: normally just the
 * favored class's level. A Multitalented half-elf with a second favored
 * class picked adds that class's level too — a level in EITHER favored
 * class earns an FCB choice (CRB). Ignores `favoredClass2` for any
 * non-Multitalented race, so a stale value left over from a race change
 * (see `model/doc.ts:setRace`, which also clears it directly) never
 * silently inflates the budget.
 */
export function favoredClassBonusLevels(doc: CharacterDoc, refData: RefData): number {
  const levelOf = (tag: string | undefined): number =>
    tag != null ? (doc.identity.classes.find((c) => c.tag === tag)?.level ?? 0) : 0;
  let total = levelOf(doc.identity.favoredClass);
  if (isMultitalented(doc, refData)) total += levelOf(doc.identity.favoredClass2);
  return total;
}
