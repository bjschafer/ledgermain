/**
 * The three classes whose grants hang off a resource they invest rather than a
 * flat pick list: occultist implements, kineticist blasts and wild talents,
 * and the medium's currently-channeled spirit.
 */
import { MEDIUM_SPIRITS } from "../medium-spirits.js";
import { findOccultistFocusPower, OCCULTIST_SCHOOLS } from "../occultist-implements.js";
import { eligibleCompositeBlasts, mergedCompositeBlastCatalog } from "../kineticist-elements.js";
import { resolveKineticistWildTalent } from "../kineticist-wild-talents.js";
import { type GrantedFeaturesContext } from "./shared.js";

/** Occultist implement schools, base and resonant powers, and focus powers. */
export function collectOccultistPowers(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // Occultist implements — hand-authored (see occultist-implements.ts), gated
  // on actual occultist levels. Two grant shapes from one
  // `build.occultistImplements` multiset field: each DISTINCT school tag
  // (deduped — a repeated pick grants no *additional* base/ resonant power,
  // per RAW; see that field's schema doc comment) grants its school's base
  // focus power AND resonant power automatically, both at a flat display level
  // of 1 (the earliest an occultist has any implement at all).
  // `build.occultistFocusPowers` is a SEPARATE budgeted pick from the school's
  // full focus-power menu — scoped to a currently-known school the same
  // "unresolvable id tolerated" way revelations/hexes tolerate a stale
  // mystery/spirit — granted at a flat display level of 1 as well (the
  // earliest an occultist selects a menu focus power, per RAW's "at 1st
  // level... can select one more focus power").
  const occultistClassLevel = doc.identity.classes.find((c) => c.tag === "occultist")?.level ?? 0;
  if (occultistClassLevel > 0) {
    const knownSchoolTags = new Set(doc.build.occultistImplements ?? []);
    for (const tag of knownSchoolTags) {
      const school = OCCULTIST_SCHOOLS[tag];
      if (!school) continue;
      out.push({
        classTag: "occultist",
        level: 1,
        grant: {
          level: 1,
          uuid: `implementBase:${tag}`,
          featureId: `implementBase:${tag}`,
          name: `${school.basePower.name} (${school.name})`,
          resolved: true,
        },
        origin: { kind: "implementSchool", label: "Implement — Base Focus Power" },
        detail: school.basePower.summary,
      });
      out.push({
        classTag: "occultist",
        level: 1,
        grant: {
          level: 1,
          uuid: `implementResonant:${tag}`,
          featureId: `implementResonant:${tag}`,
          name: `${school.resonantPower.name} (${school.name})`,
          resolved: true,
        },
        origin: { kind: "implementSchool", label: "Implement — Resonant Power" },
        detail: school.resonantPower.summary,
      });
    }
    for (const focusPowerId of doc.build.occultistFocusPowers ?? []) {
      const found = findOccultistFocusPower(focusPowerId);
      if (!found || !knownSchoolTags.has(found.school.tag)) continue;
      out.push({
        classTag: "occultist",
        level: 1,
        grant: {
          level: 1,
          uuid: `focusPower:${focusPowerId}`,
          featureId: `focusPower:${focusPowerId}`,
          name: `${found.power.name} (${found.school.name})`,
          resolved: true,
        },
        origin: { kind: "focusPower", label: "Focus Power" },
        detail: found.power.summary,
      });
    }
  }
}

/** Kineticist composite blasts and wild talents. */
export function collectKineticistPowers(ctx: GrantedFeaturesContext): void {
  const { doc, refData, out } = ctx;
  // Kineticist composite blasts + wild talents — hand-authored (see
  // kineticist-elements.ts / kineticist-wild-talents.ts), gated on actual
  // kineticist levels. Composite blasts are NOT a budgeted pick (RAW:
  // automatic once the required element(s) are known — see
  // `eligibleCompositeBlasts`'s doc comment); granted at a flat display level
  // of 7 (the earliest Expanded Element can make any composite's prerequisites
  // met, since every entry needs at least one expanded element).
  // `build.kineticistWildTalents` covers BOTH infusions and utility talents in
  // one field (disambiguated by `resolveKineticistWildTalent`'s `.category`,
  // same "one field, helper disambiguates" shape `occultistFocusPowers` uses)
  // — granted at a flat display level of 1 (infusions) or 2 (utility), the
  // earliest each category's own cadence starts. A stale pick whose id no
  // longer resolves (or a universal pick, always valid) is tolerated silently,
  // matching every other budgeted picker's soft posture. Both
  // `eligibleCompositeBlasts` and `resolveKineticistWildTalent` resolve
  // against the vendored catalog overlay too, so a vendored-only pick shows up
  // here exactly like a hand-authored one.
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  if (kineticistLevel > 0) {
    const primaryElement = doc.build.kineticistElement;
    const expandedElements = doc.build.kineticistExpandedElements ?? [];
    const blastChoices = doc.build.kineticistSimpleBlasts ?? {};
    const compositeCatalog = mergedCompositeBlastCatalog(refData);
    for (const blast of eligibleCompositeBlasts(
      primaryElement,
      expandedElements,
      compositeCatalog,
      blastChoices,
    )) {
      out.push({
        classTag: "kineticist",
        level: 7,
        grant: {
          level: 7,
          uuid: `compositeBlast:${blast.id}`,
          featureId: `compositeBlast:${blast.id}`,
          name: blast.name,
          resolved: true,
        },
        origin: { kind: "compositeBlast", label: "Composite Blast" },
        detail: `${blast.summary} (${blast.burn} burn)`,
      });
    }
    for (const talentId of doc.build.kineticistWildTalents ?? []) {
      const talent = resolveKineticistWildTalent(talentId, refData);
      if (!talent) continue;
      out.push({
        classTag: "kineticist",
        level: talent.category === "infusion" ? 1 : 2,
        grant: {
          level: talent.category === "infusion" ? 1 : 2,
          uuid: `wildTalent:${talentId}`,
          featureId: `wildTalent:${talentId}`,
          name: talent.name,
          resolved: true,
        },
        origin: {
          kind: "wildTalent",
          label: talent.category === "infusion" ? "Infusion" : "Utility Wild Talent",
        },
        detail: `${talent.summary} (${talent.burn} burn)`,
        contextNotes: talent.contextNotes,
      });
    }
  }
}

/** Medium spirit powers (live state). */
export function collectMediumSpiritPowers(ctx: GrantedFeaturesContext): void {
  const { doc, out } = ctx;
  // Medium spirit powers — hand-authored (see medium-spirits.ts), gated on
  // actual medium levels AND the currently channeled spirit
  // (`live.mediumSpirit` — a LIVE daily séance choice, not a build pick, per
  // that field's schema doc comment). Unlike a shaman's spirit ability
  // (auto-granted at a flat level) or an occultist's implements (a budgeted
  // build-time pick), each of a spirit's 4 named powers (lesser/intermediate/
  // greater/supreme) is auto-granted the moment BOTH the medium's level
  // reaches that power's own gate AND that spirit is the one currently
  // channeled — same "automatic once you qualify" shape as psychic discipline
  // powers above, just re-evaluated against whichever spirit is live today
  // instead of a permanent build choice. A medium who switches spirits between
  // sessions simply sees a different 4 powers; nothing is "kept" from a
  // previously channeled spirit (matches RAW: the powers are a property of the
  // spirit, not the medium).
  const mediumLevel = doc.identity.classes.find((c) => c.tag === "medium")?.level ?? 0;
  if (mediumLevel > 0 && doc.live.mediumSpirit) {
    const spirit = MEDIUM_SPIRITS[doc.live.mediumSpirit];
    if (spirit) {
      for (const power of spirit.powers) {
        if (power.level > mediumLevel) continue;
        out.push({
          classTag: "medium",
          level: power.level,
          grant: {
            level: power.level,
            uuid: `spiritPower:${spirit.tag}:${power.tier}`,
            featureId: `spiritPower:${spirit.tag}:${power.tier}`,
            name: power.name,
            resolved: true,
          },
          origin: {
            kind: "spiritPower",
            label: `${spirit.name} Spirit — ${power.tier[0]?.toUpperCase()}${power.tier.slice(1)} Power`,
          },
          detail: power.summary,
        });
      }
    }
  }
}
