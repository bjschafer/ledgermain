import type { RacialTrait } from "@pf1/schema";

import { resolveUuidLinks, stripHtml } from "../util/html.js";
import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  asNumber,
  asStringArray,
  descriptionValue,
  normalizeChanges,
  normalizeContextNotes,
  normalizeSources,
  normalizeUntargetedChanges,
  normalizeUses,
  type UuidResolver,
} from "./common.js";

/**
 * The `pf-racial-traits` pack ships BOTH standard racial traits (already
 * fully baked into `Race.changes`/`Race.contextNotes` by `transformRace` —
 * spot-checked: Goblin's "Skilled" entry here carries the exact same
 * `skill.rid`/`skill.ste` +4 the Goblin race doc already has) and the
 * alternates/heritage variants we want, with no `subType`/flag distinguishing
 * them. Two structured signals tell them apart, and an entry is kept if it
 * carries either:
 *
 * 1. The source's own description header, `<strong>Replaced Trait(s)</strong>:
 *    ...` — present on every alternate we spot-checked, absent on every
 *    standard trait we spot-checked. Four punctuation variants of the header
 *    occur in the pack (singular "Trait", colon inside or outside the
 *    `<strong>`), so {@link REPLACED_TRAITS_RE} matches all of them.
 * 2. A heritage tag: `system.tags` reading `[<race>, <heritage>]`, where the
 *    first tag names a vendored race and no later tag does (e.g. `["Aasimar",
 *    "Plumekith"]`). Those are the heritage's OWN version of a standard trait
 *    — Plumekith's *see invisibility* SLA in place of the base aasimar's
 *    *daylight* — and the source frequently omits the header on them because
 *    what they replace is implied by the heritage. Keeping them is safe for
 *    the same reason the header rule is: `races.json` vendors the BASE race
 *    only, so a heritage entry can never duplicate a change already baked
 *    into `Race.changes`. The "no later tag is a race" clause excludes the
 *    pack's "counts as" tag sets (Elf Blood: `["Half-Elf", "Elf", "Human"]`),
 *    which are standard traits, not heritages.
 *
 * Entries matching neither are dropped rather than guessed at, matching the
 * project's hybrid "structured signal or nothing" posture (feat prereqs,
 * archetype pairing, etc.) — vendoring a standard trait alongside its
 * already-vendored `Race.changes` would risk a double-apply bug if a future
 * UI ever surfaced both.
 */
const REPLACED_TRAITS_RE =
  /<strong>\s*Replaced Trait(?:\(s\))?\s*:?\s*<\/strong>\s*:?\s*([\s\S]*?)(?=<\/p>|<hr\b|<br\s*\/?>|$)/i;

/**
 * Splits the header's payload into names. It runs to the end of the header's
 * own paragraph rather than to the first `<` so that a name the source
 * italicized (Blood Enmity's "<em>Invisibility</em> Spell-Like Ability") or
 * wrote as a `@UUID` link (the Dhampir heritages' "Manipulative") survives —
 * `stripHtml` flattens both. Entries use either "," or ";" as the separator.
 */
function parseReplacedTraitNames(headerHtml: string): string[] {
  return headerHtml
    .split(/[,;]/)
    .map((s) => stripHtml(s).replace(/\.$/, "").trim())
    .filter((s) => s.length > 0);
}

/**
 * Returns `null` for a standard-trait entry (see module doc comment).
 * `raceNames` is every vendored `Race.name`, for the heritage-tag rule.
 */
export function transformRacialTrait(
  doc: RawDoc,
  resolveUuid: UuidResolver,
  raceNames: ReadonlySet<string>,
): RacialTrait | null {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  const rawValue = typeof desc?.value === "string" ? desc.value : "";

  const replacedMatch = REPLACED_TRAITS_RE.exec(rawValue);
  const replacedTraitNames = replacedMatch ? parseReplacedTraitNames(replacedMatch[1]!) : [];

  // Tags carry trailing whitespace on a handful of entries ("Lavasoul ").
  const tags = asStringArray(sys.tags).map((t) => t.trim());
  const heritage =
    tags.length > 1 && raceNames.has(tags[0]!) && !tags.slice(1).some((t) => raceNames.has(t))
      ? tags[1]
      : undefined;

  if (replacedTraitNames.length === 0 && heritage === undefined) return null;

  // A third of the kept entries carry a `description.instructions` block (e.g.
  // "pick which standard traits this replaces" or "set the target on the
  // untargeted change") that isn't part of `description.value` at all. The
  // pick it describes is wired up via `openChanges` below when it's a change
  // target; the prose is folded into the shown description regardless, since
  // it often adds steps no structured field captures (add the chosen skill to
  // your sheet, mark it a class skill).
  // `instructions` is itself a block of `<p>`-wrapped HTML (not inline text),
  // so it's appended as siblings after a labeled heading rather than nested
  // inside another `<p>` (which would produce invalid nested-`<p>` markup).
  const instructions = typeof desc?.instructions === "string" ? desc.instructions : undefined;
  let description = descriptionValue(sys, resolveUuid) ?? "";
  if (instructions) {
    description += `<hr /><p><strong>Note</strong></p>${resolveUuidLinks(instructions, resolveUuid)}`;
  }

  const racePoints = asNumber(sys.racePoints);
  const openChanges = normalizeUntargetedChanges(sys.changes);

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("pf-racial-traits", doc._id),
    description: description.length > 0 ? description : undefined,
    sources: normalizeSources(sys.sources),
    race: tags,
    ...(heritage !== undefined ? { heritage } : {}),
    traitCategory: typeof sys.traitCategory === "string" ? sys.traitCategory : undefined,
    changes: normalizeChanges(sys.changes),
    ...(openChanges.length > 0 ? { openChanges } : {}),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    replacedTraitNames,
    ...(racePoints !== undefined ? { racePoints } : {}),
    uses: normalizeUses(sys.uses),
  };
}
