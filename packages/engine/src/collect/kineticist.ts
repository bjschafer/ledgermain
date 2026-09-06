/**
 * Kineticist picks: wild talents, the Skilled Kineticist utility talent, and
 * the element's Elemental Defense.
 */
import { resolveKineticistDefense } from "../kineticist-defense.js";
import { KINETICIST_ELEMENTS } from "../kineticist-elements.js";
import { resolveKineticistWildTalent } from "../kineticist-wild-talents.js";
import { classFeatureByTag } from "../refdata-index.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Kineticist wild talents (build choice). */
export function collectKineticistWildTalents(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Talent ids resolve through the hand-authored table first, falling back
  // to the vendored catalog — see `@pf1/engine` `kineticist-wild-talents.ts`
  // `resolveKineticistWildTalent`. Gated on the character actually having
  // kineticist levels. Most talents are display-only (activated abilities
  // with burn/action state — see that file's doc comment); a promoted set
  // (Clockwork Heart's feat benefits, the elemental-resistance Adaptation
  // talents, Eyes of the Void's darkvision, Herbal Antivenom's poison-save
  // bonus, ...) carries a real unconditional Change — see that file's doc
  // comment for the list.
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  if (kineticistLevel > 0) {
    for (const talentId of doc.build.kineticistWildTalents ?? []) {
      const talent = resolveKineticistWildTalent(talentId, refData);
      if (!talent) continue;
      for (const ch of talent.changes ?? []) {
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

/** Kineticist Skilled Kineticist (universal utility wild talent). */
export function collectSkilledKineticist(ctx: CollectContext): void {
  const { doc, rollData, out } = ctx;
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  // RAW (Occult Adventures): "you gain a bonus equal to 1/2 your kineticist
  // level on skill checks with the skills your primary element added to your
  // class skill list." Which two skills that is depends on the player's
  // PRIMARY element (`KINETICIST_ELEMENTS[...].classSkills`, the same table
  // `compute.ts`'s `computeSkills` reads for the class-skill grant itself),
  // not a player choice, so it can't live in the talent's own static
  // `changes[]` (which has no access to `doc.build.kineticistElement`) —
  // resolved here instead, the same "needs the character's own build state"
  // shape as the Elemental Defense block below. Greater Skilled Kineticist's
  // OWN bonus (a player-chosen THIRD skill) stays unmodeled: the schema has
  // no field recording which skill was picked.
  if (kineticistLevel > 0 && doc.build.kineticistElement) {
    const hasSkilledKineticist = (doc.build.kineticistWildTalents ?? []).includes(
      "universal:skilledKineticist",
    );
    if (hasSkilledKineticist) {
      const primaryClassSkills =
        KINETICIST_ELEMENTS[doc.build.kineticistElement]?.classSkills ?? [];
      for (const skillId of primaryClassSkills) {
        evalChange(
          "floor(@classes.kineticist.level / 2)",
          rollData,
          `skill.${skillId}`,
          "competence",
          "Skilled Kineticist",
          "universal:skilledKineticist",
          out,
        );
      }
    }
  }
}

/** Kineticist Elemental Defense (primary element, 2nd level). */
export function collectKineticistDefense(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  const kineticistLevel = doc.identity.classes.find((c) => c.tag === "kineticist")?.level ?? 0;
  // Always on, and always scaled by however much of the burn currently held
  // the player spent on it (`live.kineticistDefenseBurn`) — clamped to the
  // burn actually held, so a stale counter can never inflate the sheet. Five
  // of the seven defenses land on a real target; the other two carry
  // `changes: []` and stay reminders. See `kineticist-defense.ts`.
  if (kineticistLevel > 0) {
    const burnFeature = classFeatureByTag(refData, "burn");
    const burnHeld = burnFeature ? (doc.live.resources[burnFeature.id]?.used ?? 0) : 0;
    const defense = resolveKineticistDefense(doc.build.kineticistElement, kineticistLevel, {
      burnInvested: Math.min(doc.live.kineticistDefenseBurn ?? 0, burnHeld),
      shroudMode: doc.live.kineticistShroudMode,
    });
    for (const ch of defense?.changes ?? []) {
      if (!gateOpen(ch)) continue;
      evalChange(
        ch.formula,
        rollData,
        ch.target,
        ch.type,
        defense!.name,
        `kineticistDefense:${defense!.elementTag}`,
        out,
        ch.operator,
        ch.saveCategories,
        ch.maneuverCategories,
        ch.acCategories,
      );
    }
  }
}
