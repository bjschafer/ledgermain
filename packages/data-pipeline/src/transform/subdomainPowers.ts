import type { ClassFeature, ClassFeatureGrant, Domain, SourceRef, Subdomain } from "@pf1/schema";

import {
  parsePfDataAbility,
  pfDataSourceRefFromLine,
  type PfDataDictionary,
} from "../util/pfdata.js";
import { normalizeEntityName } from "./subdomains.js";

/**
 * A cleric subdomain's GRANTED POWERS, imported from the "Pf Data 1e" fourth
 * pinned source.
 *
 * The Foundry pack models a subdomain's replacement power for only 11 of the
 * 136 vendored subdomains (the ones whose source doc carries a structured
 * `links.supplements` override — see `Subdomain.features`). For the other
 * 125 it carries the replacement SPELLS and nothing else: there is no
 * "Sudden Shift" document anywhere in the compendium, so a Deception cleric
 * resolved against Foundry data alone gets Trickery's copycat — a power the
 * character does not have — and never sees the one it does.
 *
 * Pf Data 1e publishes every subdomain inline under its parent domain's
 * entry, as an `::h3[Deception Subdomain]` section whose powers are `::ab[]`
 * directives carrying a `replace="The ‹‹copycat/#cat›› power of the Trickery
 * domain"` property. That names both halves of the swap, so this module can
 * rebuild the complete granted-power list — the parent's powers minus the
 * displaced ones, plus the subdomain's own — rather than guessing.
 *
 * Same import posture as every other Pf Data 1e catalog (see
 * `util/pfdata.ts`): the vendored Foundry data stays authoritative where it
 * has an opinion, so a subdomain that already resolved a structured override
 * is left exactly as it was.
 */

/** One granted power parsed out of a subdomain's section. */
export interface SubdomainPower {
  /** Display name, ability-type suffix stripped (e.g. "Sudden Shift"). */
  name: string;
  /** "ex" | "su" | "sp", from the stripped suffix; absent when the source states none. */
  abilityType?: string;
  /**
   * Class level the power comes online at. The source states one only for
   * later powers (`l=8`); an unstated level means 1st, emitted as 0 to match
   * how the Foundry pack levels a domain's own first power (see
   * `Domain.features`) so a subdomain's kept and replacement powers group
   * together rather than splitting across two rows in the builder.
   */
  level: number;
  /** The power's prose. */
  description: string;
  /**
   * The parent-domain power this displaces, normalized for matching
   * (`normalizePowerName`). Absent when the source names no replacement
   * target, i.e. the subdomain adds this power outright.
   */
  replaces?: string;
}

/** Every power a subdomain's section grants, plus the parent domain it was listed under. */
export interface SubdomainPowerSet {
  /** Subdomain name with the " Subdomain" word and any disambiguator stripped, normalized (e.g. "deception"). */
  subdomainKey: string;
  /** `Domain.tag` of the domain whose entry this section appeared under (e.g. "Trickery"). */
  parentDomainTag: string;
  /** The section's own book/page citation, when it carries one. */
  sources?: SourceRef[];
  powers: SubdomainPower[];
}

/**
 * Normalize a power name for cross-source matching: lowercased, punctuation
 * folded to single spaces, and any parenthesized suffix dropped — the two
 * sources disagree on both the ability-type marker ("Copycat" vs "Copycat
 * (Sp)") and the Foundry pack's own disambiguators ("Agile Feet (Domain
 * Power)"), neither of which is part of the name.
 */
export function normalizePowerName(name: string): string {
  return name
    .toLowerCase()
    .replace(/’/g, "'")
    .replace(/\([^)]*\)/g, "")
    .replace(/[^a-z0-9']+/g, " ")
    .trim();
}

/**
 * Key a subdomain by its base name for cross-source matching: the
 * " Subdomain" word and any trailing disambiguator dropped. Two vendored docs
 * share the base name "Self-Realization" and are told apart by a
 * "(Strength)"/"(Liberation)" suffix the Pf Data 1e headings don't carry —
 * those two resolve on their parent domain instead (see `powerSetFor`).
 */
function subdomainKey(name: string): string {
  return normalizePowerName(normalizeEntityName(name));
}

/** Matches names that differ only by a trailing plural — the source lists Protection's subdomain as "Fortifications", its own doc calls it "Fortification". */
function namesMatch(a: string, b: string): boolean {
  return a === b || `${a}s` === b || a === `${b}s`;
}

const ABILITY_TYPE_SUFFIX_RE = /\s*\((Ex|Su|Sp)\)\s*$/i;

/** `The ‹‹copycat/#cat›› power of the Trickery domain` -> the power name. The doubled guillemets are the source's own intra-page anchor-link form. */
function parseReplaceTarget(raw: string): string | undefined {
  const m = /‹+\s*([^/›]+?)\s*(?:\/[^›]*)?›/.exec(raw);
  return m ? normalizePowerName(m[1]!) : undefined;
}

const H3_SECTION_RE = /^::h3\[([^\]]*)\](?:\{[^}]*\})?$/;

/**
 * Parse one domain entry's description into the power sets of every
 * subdomain listed under it. Sections that aren't a subdomain (each domain
 * entry also carries a "Variant Domain Powers" section, a GM-facing
 * alternate-rules block) are skipped.
 */
function parseDomainEntry(domainTag: string, lines: string[]): SubdomainPowerSet[] {
  const out: SubdomainPowerSet[] = [];
  let current: SubdomainPowerSet | undefined;
  for (const line of lines) {
    const heading = H3_SECTION_RE.exec(line.trim());
    if (heading) {
      const name = heading[1]!.trim();
      current = /\bSubdomain\b/i.test(name)
        ? { subdomainKey: subdomainKey(name), parentDomainTag: domainTag, powers: [] }
        : undefined;
      if (current) out.push(current);
      continue;
    }
    if (!current) continue;

    const source = pfDataSourceRefFromLine(line);
    if (source && !current.sources) {
      current.sources = [source];
      continue;
    }

    const ability = parsePfDataAbility(line);
    if (!ability) continue;
    const suffix = ABILITY_TYPE_SUFFIX_RE.exec(ability.name);
    const replaceRaw = ability.props.replace;
    current.powers.push({
      name: ability.name.replace(ABILITY_TYPE_SUFFIX_RE, "").trim(),
      ...(suffix ? { abilityType: suffix[1]!.toLowerCase() } : {}),
      level: ability.level !== undefined && ability.level > 1 ? ability.level : 0,
      description: ability.bodyHtml,
      ...(typeof replaceRaw === "string"
        ? (() => {
            const target = parseReplaceTarget(replaceRaw);
            return target ? { replaces: target } : {};
          })()
        : {}),
    });
  }
  return out.filter((s) => s.powers.length > 0);
}

/**
 * Parse the Pf Data 1e domain dictionaries (the catalog is split across
 * `class_ability_domains{,2,3}.json`) into every subdomain power set they
 * describe. A subdomain attached to two parent domains is listed under each,
 * once per parent, naming that parent's own displaced power — so this
 * returns one set per (subdomain, parent) pair, not one per subdomain.
 * `domainTags` bounds the walk to entries that name a vendored domain.
 */
export function parseSubdomainPowerSets(
  dicts: PfDataDictionary[],
  domainTags: ReadonlySet<string>,
): SubdomainPowerSet[] {
  const out: SubdomainPowerSet[] = [];
  for (const dict of dicts) {
    for (const entry of Object.values(dict)) {
      if (!entry.name || !entry.description || !domainTags.has(entry.name)) continue;
      out.push(...parseDomainEntry(entry.name, entry.description));
    }
  }
  return out;
}

/**
 * The parent-domain ability each domain's `changes` entry represents, named
 * as Pf Data 1e names it. A domain's granted-powers preamble sometimes
 * carries a flat bonus that isn't one of its two named powers (Travel's +10
 * ft base speed, Darkness/Rune's bonus feat, Protection's resistance), which
 * the Foundry pack models as a `Domain.changes` entry rather than a linked
 * feature. A subdomain keeps those unless it explicitly replaces them: the
 * Portal subdomain is the one that does, trading Travel's speed increase away
 * for Rift-Step, which is why inheritance has to be checked per subdomain
 * rather than applied wholesale.
 */
const PREAMBLE_ABILITY_NAMES: Record<string, string> = {
  Travel: "base speed increase",
  Darkness: "bonus feat",
  Rune: "bonus feat",
  Protection: "resistance",
};

function slug(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** The power set for a subdomain, preferring the section listed under the parent its spell list already merges against. */
function powerSetFor(
  sub: Subdomain,
  sets: readonly SubdomainPowerSet[],
): SubdomainPowerSet | undefined {
  const key = subdomainKey(sub.name);
  const candidates = sets.filter((s) => namesMatch(s.subdomainKey, key));
  if (candidates.length === 0) return undefined;
  const primary = sub.parentDomainTags[0];
  return candidates.find((s) => s.parentDomainTag === primary) ?? candidates[0];
}

export interface SubdomainPowerSupplementResult {
  /** Subdomains whose granted-power list this import rebuilt. */
  supplemented: number;
  /** Subdomains left alone because the Foundry pack already resolved a structured override. */
  vendored: number;
  /** Names of subdomains no power set could be matched to (they keep falling back to the parent's powers). */
  unmatched: string[];
}

/**
 * Rebuild each subdomain's granted-power list from its Pf Data 1e section,
 * pushing a `ClassFeature` per replacement power onto `classFeatures` and
 * mutating `subdomains` in place. Throws on an id collision rather than
 * silently overwriting a feature.
 *
 * A subdomain the Foundry pack already resolved keeps what it had — vendored
 * structure stays authoritative over an imported name match.
 */
export function applySubdomainPowerSupplements(
  subdomains: Subdomain[],
  domains: readonly Domain[],
  sets: readonly SubdomainPowerSet[],
  classFeatures: ClassFeature[],
): SubdomainPowerSupplementResult {
  const domainByTag = new Map(domains.map((d) => [d.tag, d]));
  const featureIds = new Set(classFeatures.map((f) => f.id));
  const result: SubdomainPowerSupplementResult = { supplemented: 0, vendored: 0, unmatched: [] };

  for (const sub of subdomains) {
    if (sub.features.length > 0) {
      result.vendored += 1;
      continue;
    }
    const set = powerSetFor(sub, sets);
    const parent = domainByTag.get(set?.parentDomainTag ?? sub.parentDomainTags[0] ?? "");
    if (!set || !parent) {
      result.unmatched.push(sub.name);
      continue;
    }

    const replaced = new Set(set.powers.map((p) => p.replaces).filter((r): r is string => !!r));
    const kept = parent.features.filter((g) => !replaced.has(normalizePowerName(g.name)));

    const granted: ClassFeatureGrant[] = [];
    for (const power of set.powers) {
      const id = `subdomain-power:${slug(sub.tag)}:${slug(power.name)}`;
      if (featureIds.has(id)) throw new Error(`duplicate subdomain power feature id: ${id}`);
      featureIds.add(id);
      const uuid = `pfdata:subdomain-power:${slug(sub.tag)}:${slug(power.name)}`;
      classFeatures.push({
        id,
        name: power.name,
        uuid,
        description: power.description,
        ...(set.sources ? { sources: set.sources } : {}),
        ...(power.abilityType ? { abilityType: power.abilityType } : {}),
        subType: "classFeat",
        changes: [],
        grantsBuffs: [],
      });
      granted.push({ level: power.level, uuid, featureId: id, name: power.name, resolved: true });
    }

    sub.features = [...kept, ...granted].sort((a, b) => a.level - b.level);

    // A subdomain with a direct bonus of its own (Purity's save resistance)
    // states the whole of it — inheriting the parent's on top would
    // double-apply the same number.
    if (sub.changes.length === 0 && parent.changes.length > 0) {
      const preamble = PREAMBLE_ABILITY_NAMES[parent.tag];
      if (!preamble || !replaced.has(preamble)) sub.changes = parent.changes.map((c) => ({ ...c }));
    }
    result.supplemented += 1;
  }
  return result;
}
