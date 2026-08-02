import type { FocusedSchool, WizardSchool } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import { descriptionValue, normalizeSources, type UuidResolver } from "./common.js";
import { resolveFeatureGrants, supplementsOf } from "./classes.js";
import { normalizePowerName } from "./subdomainPowers.js";

/**
 * A focused arcane school (APG "Focused Schools" variant rule, `class-abilities/
 * wizard-schools/focused-schools/*.yaml`): a narrower specialization within one
 * of the eight standard wizard schools — Admixture within Evocation,
 * Teleportation within Conjuration, and so on — trading one or two of the
 * parent school's granted powers for its own.
 *
 * Unlike a cleric subdomain (`transform/subdomainPowers.ts`, which needs a
 * fourth-party dataset because the Foundry pack documents a replacement power
 * for only 11 of 136 subdomains), the pack states a focused school's full
 * mechanics directly on the doc itself: an "Associated School" line linking
 * the parent school by `@UUID`, a "Replacement Powers" sentence naming the
 * displaced power(s) — almost always themselves `@UUID` links resolved by id,
 * not name — and the focused school's own granted powers through the same
 * `links.supplements` shape a top-level school uses. No fourth-party source
 * needed; `parseReplacedPowers`'s doc comment covers the one entry (Infernal
 * Binder, a Paths of Prestige variant) that states its target as a bare name
 * instead.
 */

const REPLACEMENT_SENTENCE_RE = /Replacement\s*Powers[^:]*:?\s*(?:<\/[a-z]+>)*\s*(.*?)<\/p>/is;
const REPLACEMENT_UUID_RE =
  /@UUID\[Compendium\.pf1\.class-abilities\.(?:Item\.)?([^.\]]+)\](?:\{[^}]*\})?/g;
const ASSOCIATED_SCHOOL_RE =
  /Associated School[^:]*:?\s*(?:<\/[a-z]+>)*\s*(?:<em>)?@UUID\[Compendium\.pf1\.class-abilities\.(?:Item\.)?([^.\]]+)\]/i;

/** Parse a focused school's "Associated School: @UUID[...]" line into the parent school doc's `_id`. */
export function parseAssociatedSchoolId(html: string): string | undefined {
  return ASSOCIATED_SCHOOL_RE.exec(html)?.[1];
}

/**
 * Parse a focused school's "Replacement Powers" sentence into the parent
 * power(s) it displaces, as either resolved `@UUID` ids (the normal case,
 * matched against the parent's `ClassFeatureGrant.featureId` directly) or
 * normalized names (the one fallback case: Infernal Binder Subschool states
 * "This subschool replaces the acid dart and dimensional steps powers of the
 * conjuration school" with no links at all, so its target is matched by
 * `normalizePowerName` against the parent's own granted-power names instead —
 * the same cross-source match `transform/subdomainPowers.ts` uses). A focused
 * school never mixes the two forms, so the result carries one or the other,
 * never both.
 */
export function parseReplacedPowers(html: string): { ids: string[]; names: string[] } {
  const sentence = REPLACEMENT_SENTENCE_RE.exec(html)?.[1];
  if (!sentence) return { ids: [], names: [] };
  const ids = [...sentence.matchAll(REPLACEMENT_UUID_RE)].map((m) => m[1]!);
  if (ids.length > 0) return { ids, names: [] };
  const text = sentence.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ");
  const m = /replaces the (.+?) powers? of the/i.exec(text);
  if (!m) return { ids: [], names: [] };
  const names = m[1]!
    .split(/,|\band\b/i)
    .map((s) => normalizePowerName(s))
    .filter((s) => s.length > 0);
  return { ids: [], names };
}

/**
 * Transform a `wizard-schools/focused-schools/*.yaml` entry against its
 * already-built parent `WizardSchool`s. Throws when the "Associated School"
 * link doesn't resolve to a vendored school, or when the "Replacement Powers"
 * sentence names a power the parent doesn't actually grant — both would mean
 * the hand-verified 22-entry mapping this was built against has drifted, a
 * data bump worth reviewing rather than silently degrading.
 */
export function transformFocusedSchool(
  doc: RawDoc,
  parentSchools: readonly WizardSchool[],
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): FocusedSchool {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  const description = sys.description as Record<string, unknown> | undefined;
  const html = typeof description?.value === "string" ? description.value : "";

  const parentId = parseAssociatedSchoolId(html);
  const parent = parentId ? parentSchools.find((s) => s.id === parentId) : undefined;
  if (!parent) {
    throw new Error(`focused school "${doc.name}" names no resolvable Associated School`);
  }

  const { ids: replacedIds, names: replacedNames } = parseReplacedPowers(html);
  const totalReplaced = replacedIds.length + replacedNames.length;
  if (totalReplaced === 0) {
    throw new Error(`focused school "${doc.name}" names no Replacement Powers target`);
  }
  const isDisplaced = (name: string, featureId: string): boolean =>
    replacedIds.includes(featureId) || replacedNames.includes(normalizePowerName(name));
  const kept = parent.features.filter((g) => !isDisplaced(g.name, g.featureId));
  if (parent.features.length - kept.length !== totalReplaced) {
    throw new Error(
      `focused school "${doc.name}" named ${totalReplaced} replaced power(s) of ` +
        `"${parent.name}" but only ${parent.features.length - kept.length} matched`,
    );
  }

  const granted = resolveFeatureGrants(supplementsOf(sys), resolveFeatureName).filter(
    (f) => f.resolved,
  );

  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: doc.name.replace(/\s+Subschool\b/, ""),
    parentTag: parent.tag,
    features: [...kept, ...granted].sort((a, b) => a.level - b.level),
  };
}
