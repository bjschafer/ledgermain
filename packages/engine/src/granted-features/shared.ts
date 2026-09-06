/**
 * The shared contract for the granted-feature collectors in this directory:
 * the grant shape they push, the context they receive, and the one lookup
 * (which class level a domain's powers scale off) more than one of them needs.
 */

import type { CharacterDoc, ClassFeatureGrant, ContextNote, RefData } from "@pf1/schema";

import type { BloodlineResourcePool } from "../bloodlines.js";

/** A single class-feature grant the character qualifies for, with its granting context. */
export interface GrantedFeature {
  classTag: string;
  level: number;
  grant: ClassFeatureGrant;
  /**
   * Set when this grant came from a chosen domain/school/bloodline/exploit/
   * arcana/revelation/hex/discovery/spirit/discipline power/phrenic
   * amplification/mesmerist trick/mesmerist bold stare/cruelty/ninja trick/
   * ki power/style strike/rogue talent/investigator talent/vigilante talent/
   * shifter aspect/rage power/occultist implement/focus power/kineticist
   * composite blast/wild talent/medium spirit power/slayer talent/chosen
   * inquisition/warpriest blessing rather than the class itself, or (kind
   * `"custom"`) from a user-authored homebrew ability, which belongs to no
   * class at all.
   */
  origin?: {
    kind:
      | "domain"
      | "school"
      | "bloodline"
      | "exploit"
      | "arcana"
      | "revelation"
      | "hex"
      | "discovery"
      | "spirit"
      | "discipline"
      | "amplification"
      | "trick"
      | "stare"
      | "cruelty"
      | "ragePower"
      | "kiPower"
      | "styleStrike"
      | "rogueTalent"
      | "investigatorTalent"
      | "vigilanteSocialTalent"
      | "vigilanteTalent"
      | "shifterAspect"
      | "implementSchool"
      | "focusPower"
      | "compositeBlast"
      | "wildTalent"
      | "spiritPower"
      | "slayerTalent"
      | "inquisition"
      | "blessing"
      | "custom";
    label: string;
  };
  /**
   * Pre-computed display detail for grants with no vendored `RefData.classFeatures`
   * entry to look up (bloodline powers — see `bloodlines.ts`; hand-authored, not in
   * the vendored pack). `undefined` for domain/school/base-class grants, which
   * `resolveClassFeatures` derives `detail` for itself (or leaves undefined).
   */
  detail?: string;
  /**
   * Pre-computed uses/day pool for grants with no vendored `uses.maxFormula` to
   * read (bloodline powers). `deriveResourcePools` uses this directly instead of
   * looking up `refData.classFeatures[grant.featureId]` when set.
   */
  resourcePool?: BloodlineResourcePool;
  /**
   * Non-mechanical reminders (save DC, duration, activation shape,...) copied
   * straight from the hand-authored table this grant resolved against — see
   * that table's own `contextNotes` field (e.g. `WitchHexDef.contextNotes`).
   * `resolveClassFeatures` copies this onto the resulting `DerivedClassFeature`
   * unchanged.
   */
  contextNotes?: ContextNote[];
}

/**
 * Everything a granted-feature collector needs. `out` is the shared
 * accumulator each one pushes into; the rest is read-only input.
 */
export interface GrantedFeaturesContext {
  doc: CharacterDoc;
  refData: RefData;
  out: GrantedFeature[];
}

/**
 * The class level a domain's granted powers scale off. Clerics are the common
 * case; inquisitors also pick a domain at 1st level and "use their inquisitor
 * level as their cleric level" for its granted powers (they get the powers
 * only — never the domain's bonus spell slots, which is why the web layer's
 * domain-spell wiring stays cleric-gated).
 *
 * `build.clericDomains` is a single flat list with no record of which class
 * granted each pick, so a cleric/inquisitor multiclass resolves to the cleric
 * level rather than trying to split one list across two progressions —
 * picking the class that would actually have granted a second domain slot.
 */
export function domainCasterLevel(doc: CharacterDoc): number {
  const level = (tag: string): number =>
    doc.identity.classes.find((c) => c.tag === tag)?.level ?? 0;
  return level("cleric") || level("inquisitor");
}
