/**
 * Talent-family picks: the rogue / ninja / investigator / vigilante shared
 * shape, plus slayer talents.
 */
import { resolveInvestigatorTalent } from "../investigator-talents.js";
import { resolveNinjaTrick } from "../ninja-tricks.js";
import { resolveRogueTalent } from "../rogue-talents.js";
import { resolveVigilanteSocialTalent, resolveVigilanteTalent } from "../vigilante-talents.js";
import { resolveSlayerTalent } from "../slayer-talents.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Rogue, ninja, investigator, and vigilante talents (build choices). */
export function collectTalentFamilies(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // These four families were surfaced as display features (see
  // `collectGrantedFeatures`) from day one but never had modifier loops
  // here, so a def's `changes[]` silently went nowhere — found when the
  // first promotions landed (ninja Wall Climber, vigilante Rooftop
  // Infiltrator) and the pre-existing vigilante entries (Shadow's Speed,
  // Monkey's Paws) turned out never to have reached the sheet either. Same
  // gate-resolve-skip-apply shape as every loop above; class gates mirror
  // `collectGrantedFeatures`' own (rogue OR unchained rogue for talents,
  // one vigilante gate for both talent pools).
  const rogueTalentLevel =
    doc.identity.classes.find((c) => c.tag === "rogue" || c.tag === "rogueUnchained")?.level ?? 0;
  if (rogueTalentLevel > 0) {
    for (const talentId of doc.build.rogueTalents ?? []) {
      const talent = resolveRogueTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const ninjaLevel = doc.identity.classes.find((c) => c.tag === "ninja")?.level ?? 0;
  if (ninjaLevel > 0) {
    for (const trickId of doc.build.ninjaTricks ?? []) {
      const trick = resolveNinjaTrick(trickId, refData);
      if (!trick) continue;
      for (const ch of trick.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          trick.name,
          trick.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const investigatorTalentLevel =
    doc.identity.classes.find((c) => c.tag === "investigator")?.level ?? 0;
  if (investigatorTalentLevel > 0) {
    for (const talentId of doc.build.investigatorTalents ?? []) {
      const talent = resolveInvestigatorTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
  const vigilanteLevel = doc.identity.classes.find((c) => c.tag === "vigilante")?.level ?? 0;
  if (vigilanteLevel > 0) {
    for (const talentId of doc.build.vigilanteTalents ?? []) {
      const talent = resolveVigilanteTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
    for (const talentId of doc.build.vigilanteSocialTalents ?? []) {
      const talent = resolveVigilanteSocialTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}

/** Slayer talents (build choice, hand-table follow-up). */
export function collectSlayerTalents(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Talent ids are hand-authored clean-room content overlaid onto the
  // vendored catalog (`@pf1/engine` `slayer-talents.ts`'s
  // `resolveSlayerTalent`, hand-authored table first, vendored fallback for
  // an id not yet promoted), same posture as rage powers above. Gated on the
  // character actually having slayer levels. Most talents are `displayOnly`
  // with `changes: []` (sneak-attack/studied-target riders, activated
  // abilities, or scoped-target near misses — see that file's doc comment),
  // but Foil Scrutiny/Armored Marauder/Armored Swiftness carry a real
  // Change (the latter two conditional on `@armor.type`, not buff-gated).
  const slayerLevel = doc.identity.classes.find((c) => c.tag === "slayer")?.level ?? 0;
  if (slayerLevel > 0) {
    for (const talentId of doc.build.slayerTalents ?? []) {
      const talent = resolveSlayerTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          talent.name,
          talent.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
    }
  }
}
