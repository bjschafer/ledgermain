import type { DruidDomain, Subdomain } from "@pf1/schema";

import type { RawDoc } from "../util/packs.js";
import { makeUuid } from "../util/uuid.js";
import {
  descriptionValue,
  normalizeChanges,
  normalizeSources,
  type UuidResolver,
} from "./common.js";
import { resolveFeatureGrants, supplementsOf } from "./classes.js";

/**
 * Collapse a raw description's whitespace/line-folding (YAML folds long
 * prose across source lines) so regex matches spanning a fold don't miss.
 */
function normalizeHtml(html: string): string {
  return html.replace(/\s+/g, " ");
}

/** One entry from a domain's "Subdomains: ..." listing — an id (when the source links one) and/or a display name. */
export interface SubdomainRef {
  /**
   * The id parsed from an `@UUID[...]` link, when present. NOT guaranteed
   * correct — at least one linked UUID in the source is simply wrong
   * (Trickery's "Deception" entry resolves to an unrelated wizard subschool
   * doc, not the Deception subdomain) and at least one display name doesn't
   * match its own subdomain's real name (Protection's "Fortifications" vs.
   * the "Fortification Subdomain" doc) — callers should resolve by id first
   * when it names a real subdomain, falling back to matching `name`.
   */
  id?: string;
  name: string;
}

/**
 * Parse a top-level domain's "Subdomains: ..." description section into the
 * subdomain refs it lists. The source is inconsistent: most entries are
 * `@UUID[...]{Name}` links, some domains list bare comma-separated names
 * instead — see `SubdomainRef` doc comment for the two known correctness
 * gaps this format has.
 */
export function parseSubdomainRefs(html: string): SubdomainRef[] {
  const norm = normalizeHtml(html);
  const m = /Subdomains:?\s*<\/strong>\s*(.*?)(?:<\/p>|<h3)/.exec(norm);
  if (!m) return [];
  const section = m[1]!;
  const out: SubdomainRef[] = [];
  const uuidRe = /@UUID\[Compendium\.pf1\.class-abilities\.(?:Item\.)?([A-Za-z0-9]+)\]\{([^}]*)\}/g;
  for (const um of section.matchAll(uuidRe)) {
    out.push({ id: um[1], name: um[2]! });
  }
  const plain = section.replace(uuidRe, "").replace(/<[^>]+>/g, " ");
  for (const raw of plain.split(",")) {
    const name = raw
      .trim()
      .replace(/^and\s+/i, "")
      .replace(/\.$/, "");
    if (name) out.push({ name });
  }
  return out;
}

/** Normalize a subdomain/domain display name for name-based matching (strip the " Subdomain"/" Domain" suffix, lowercase). */
export function normalizeEntityName(name: string): string {
  return name
    .replace(/\s+(Subdomain|Domain)\b/, "")
    .trim()
    .toLowerCase();
}

/**
 * True when a subdomain's description carries a full domain spell list
 * (`<h3>Domain Spells</h3>`, one per level 1–9) rather than a partial
 * "Replacement Domain Spells" list (2–3 levels only, the rest inherited from
 * the parent domain). In the vendored slice this always coincides with the
 * subdomain having a structured `links.supplements` granted-power override
 * (see `Subdomain.features` doc comment) — both signal "this subdomain's
 * source doc models a full mechanical override", but they're checked
 * independently since nothing in the data guarantees they always will.
 */
export function isFullDomainSpellList(html: string): boolean {
  return /<h3>\s*Domain\s*Spells\s*<\/h3>/.test(normalizeHtml(html));
}

/**
 * Parse a domain/subdomain description's spell list (either heading form)
 * into level -> spellId entries. Only the first spell id linked per level is
 * kept: a handful of levels offer an alignment-variant choice (e.g. Purity's
 * 1st is Protection from Evil/Good/Law/Chaos, "pick your deity's opposite"),
 * and the domain-bonus-slot mechanic only needs one valid id to be usable —
 * the other options aren't lost from the game, just not separately offered.
 */
export function parseDomainSpellEntries(html: string): { level: number; spellId: string }[] {
  const norm = normalizeHtml(html);
  const out: { level: number; spellId: string }[] = [];
  const re =
    /(\d+)(?:st|nd|rd|th)\s*—\s*@UUID\[Compendium\.pf1\.spells\.(?:Item\.)?([A-Za-z0-9]+)\]/g;
  for (const m of norm.matchAll(re)) {
    out.push({ level: Number(m[1]), spellId: m[2]! });
  }
  return out;
}

/**
 * Transform a `class-abilities/domains/subdomains/*.yaml` entry.
 * `parentDomainTags` is resolved by the caller (`normalize.ts`) from every
 * top-level domain's own "Subdomains:" listing — see `parseSubdomainRefs`.
 */
export function transformSubdomain(
  doc: RawDoc,
  parentDomainTags: string[],
  resolveFeatureName: (id: string) => string | null,
  resolveUuid: UuidResolver,
): Subdomain {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    // Strip only the " Subdomain" word, not a trailing disambiguator — two
    // docs share the base name "Self-Realization" (Strength's and
    // Liberation's versions), distinguished by "(Strength)"/"(Liberation)".
    tag: doc.name.replace(/\s+Subdomain\b/, ""),
    parentDomainTags,
    features: resolveFeatureGrants(supplementsOf(sys), resolveFeatureName),
    changes: normalizeChanges(sys.changes),
  };
}

/** Transform a `class-abilities/domains/druid-domains/{animal,terrain}-domains/*.yaml` entry. */
export function transformDruidDomain(
  doc: RawDoc,
  kind: DruidDomain["kind"],
  resolveUuid: UuidResolver,
): DruidDomain {
  const sys = (doc.system ?? {}) as Record<string, unknown>;
  return {
    id: doc._id,
    name: doc.name,
    uuid: makeUuid("class-abilities", doc._id),
    description: descriptionValue(sys, resolveUuid),
    sources: normalizeSources(sys.sources),
    tag: doc.name.replace(/\s+Domain\b/, ""),
    kind,
    // The source models every druid domain power as free-text prose, never a
    // `links.supplements`-linked class-abilities entry — nothing to resolve.
    features: [],
  };
}
