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
  normalizeUses,
  type UuidResolver,
} from "./common.js";

/**
 * The `pf-racial-traits` pack ships BOTH standard racial traits (already
 * fully baked into `Race.changes`/`Race.contextNotes` by `transformRace` —
 * spot-checked: Goblin's "Skilled" entry here carries the exact same
 * `skill.rid`/`skill.ste` +4 the Goblin race doc already has) and alternate
 * racial traits, with no `subType`/flag distinguishing the two. The one
 * reliable machine-checkable signal is the source's own structured
 * description header, `<strong>Replaced Trait(s)</strong>: ...` — present on
 * every alternate we spot-checked, absent on every standard trait we
 * spot-checked. Entries without it are dropped here rather than guessed at,
 * matching the project's hybrid "structured signal or nothing" posture
 * (feat prereqs, archetype pairing, etc.) — vendoring a standard trait
 * alongside its already-vendored `Race.changes` would risk a double-apply
 * bug if a future UI ever surfaced both.
 */
const REPLACED_TRAITS_RE = /<strong>Replaced Trait\(s\)<\/strong>:\s*([^<]+)/i;

/** Returns `null` for a standard-trait entry (see module doc comment). */
export function transformRacialTrait(doc: RawDoc, resolveUuid: UuidResolver): RacialTrait | null {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const desc = sys.description as Record<string, unknown> | undefined;
  const rawValue = typeof desc?.value === "string" ? desc.value : "";

  const replacedMatch = REPLACED_TRAITS_RE.exec(rawValue);
  if (!replacedMatch) return null;
  const replacedTraitNames = replacedMatch[1]!
    .split(",")
    .map((s) => stripHtml(s).trim())
    .filter((s) => s.length > 0);
  if (replacedTraitNames.length === 0) return null;

  // A handful of entries carry a `description.instructions` block (e.g.
  // "pick which standard traits this replaces" or "set the target ability on
  // the untargeted change") that isn't part of `description.value` at all —
  // fold it into the shown description as a note rather than dropping it,
  // since there's no dedicated UI surface for it (mirrors how the Foundry
  // sheet shows it as a separate GM-only field).
  // `instructions` is itself a block of `<p>`-wrapped HTML (not inline text),
  // so it's appended as siblings after a labeled heading rather than nested
  // inside another `<p>` (which would produce invalid nested-`<p>` markup).
  const instructions = typeof desc?.instructions === "string" ? desc.instructions : undefined;
  let description = descriptionValue(sys, resolveUuid) ?? "";
  if (instructions) {
    description += `<hr /><p><strong>Note</strong></p>${resolveUuidLinks(instructions, resolveUuid)}`;
  }

  const racePoints = asNumber(sys.racePoints);

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("pf-racial-traits", doc._id),
    description: description.length > 0 ? description : undefined,
    sources: normalizeSources(sys.sources),
    race: asStringArray(sys.tags),
    traitCategory: typeof sys.traitCategory === "string" ? sys.traitCategory : undefined,
    changes: normalizeChanges(sys.changes),
    contextNotes: normalizeContextNotes(sys.contextNotes, resolveUuid),
    replacedTraitNames,
    ...(racePoints !== undefined ? { racePoints } : {}),
    uses: normalizeUses(sys.uses),
  };
}
