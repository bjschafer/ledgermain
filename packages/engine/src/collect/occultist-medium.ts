/**
 * Live-state class subsystems whose bonuses depend on what the character is
 * currently channeling: occultist implements and the medium's spirit.
 */
import { featNameSlug } from "../feat-effects.js";
import { mediumSpiritBonus, MEDIUM_SPIRITS } from "../medium-spirits.js";
import { OCCULTIST_SCHOOLS } from "../occultist-implements.js";
import { SKILL_ABILITY } from "../tables.js";
import { type CollectContext } from "./shared.js";

/** Occultist implement resonant powers (live state). */
export function collectOccultistImplements(ctx: CollectContext): void {
  const { doc, out } = ctx;
  // `live.occultistFocusInvested[tag]` (set by `model/occultistImplements.ts`)
  // records how many of the day's Mental Focus points are currently divided
  // into each known implement (PF1 RAW "Mental Focus" — see that field's
  // schema doc comment). Only the FOUR resonant powers flagged
  // `appliesAsChange: true` in `OCCULTIST_SCHOOLS` (Abjuration/Divination/
  // Enchantment/Transmutation — see `occultist-implements.ts`'s doc comment
  // for exactly why the other four are situational/no-modelable-target and
  // stay display-only) are injected as real sheet Changes here; a school not
  // currently known (not in `build.occultistImplements`) or with 0 focus
  // invested contributes nothing (`computeBonus` already returns 0 below each
  // power's own investment threshold, e.g. Transmutation needs 3+).
  const occultistLevel = doc.identity.classes.find((c) => c.tag === "occultist")?.level ?? 0;
  if (occultistLevel > 0) {
    const knownSchools = new Set(doc.build.occultistImplements ?? []);
    for (const tag of knownSchools) {
      const school = OCCULTIST_SCHOOLS[tag];
      if (!school || !school.resonantPower.appliesAsChange) continue;
      const invested = doc.live.occultistFocusInvested?.[tag] ?? 0;
      const bonus = school.resonantPower.computeBonus(invested, occultistLevel);
      if (bonus <= 0) continue;
      const source = `${school.resonantPower.name} (${school.name} Resonant Power)`;
      const sourceId = `occultistResonant:${tag}`;
      if (tag === "abjuration") {
        out.push({ target: "allSavingThrows", type: "resistance", value: bonus, source, sourceId });
      } else if (tag === "divination") {
        out.push({ target: "skill.per", type: "insight", value: bonus, source, sourceId });
      } else if (tag === "enchantment") {
        for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
          if (ability !== "cha") continue;
          out.push({
            target: `skill.${skillId}`,
            type: "competence",
            value: bonus,
            source,
            sourceId,
          });
        }
      } else if (tag === "transmutation") {
        const ability = doc.live.occultistPhysicalEnhancementAbility ?? "str";
        out.push({ target: ability, type: "enhancement", value: bonus, source, sourceId });
      }
    }
  }
}

/** Medium spirit bonus + seance boon (live state). */
export function collectMediumSpirit(ctx: CollectContext): void {
  const { doc, refData, out } = ctx;
  // `live.mediumSpirit` (set by `model/mediumSpirits.ts`'s séance picker)
  // names which of the 6 legendary spirits (`MEDIUM_SPIRITS`) is currently
  // channeled; while one is, the flat Spirit Bonus (scaling by medium level,
  // `mediumSpiritBonus`) and any flat Séance Boon apply as real untyped
  // `Change`s wherever the spirit's own `spiritBonusTargets`/
  // `seanceBoonChange` name a target this engine actually consumes — see
  // `medium-spirits.ts`'s file doc comment for the per-spirit audit of which
  // targets are real vs. prose-only. `abilitySkills` targets fan out to one
  // `skill.<id>` Change per skill keyed to that ability (same pattern as the
  // occultist Enchantment resonant power just above), since no `chaSkills`-
  // style group target is actually consumed by `compute.ts`.
  const mediumLevel = doc.identity.classes.find((c) => c.tag === "medium")?.level ?? 0;
  if (mediumLevel > 0 && doc.live.mediumSpirit) {
    const spirit = MEDIUM_SPIRITS[doc.live.mediumSpirit];
    if (spirit) {
      const bonus = mediumSpiritBonus(mediumLevel);
      const bonusSource = `Spirit Bonus (${spirit.name} Spirit)`;
      const bonusSourceId = `mediumSpiritBonus:${spirit.tag}`;
      for (const t of spirit.spiritBonusTargets) {
        if (t.kind === "flat") {
          out.push({
            target: t.target,
            type: "untyped",
            value: bonus,
            source: bonusSource,
            sourceId: bonusSourceId,
          });
        } else {
          for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
            if (ability !== t.ability) continue;
            out.push({
              target: `skill.${skillId}`,
              type: "untyped",
              value: bonus,
              source: bonusSource,
              sourceId: bonusSourceId,
            });
          }
        }
      }

      // Spirit Focus (community pack): "Select a legend of spirits. Your
      // spirit bonus from spirits of that legend increases by 1." The feat's
      // own choice axis (feat-effects-extracted-community.ts) has no
      // build()-time access to `live.mediumSpirit`, so the match against the
      // CURRENTLY channeled spirit is checked here instead — +1 on the same
      // targets as the Spirit Bonus above, only when the chosen legend is the
      // one actually channeled.
      const spiritFocusFeatId = (doc.build.feats ?? []).find(
        (id) => featNameSlug(refData.feats[id]?.name ?? "") === "spirit-focus",
      );
      if (spiritFocusFeatId && doc.build.featChoices?.[spiritFocusFeatId] === spirit.tag) {
        const focusSource = `Spirit Focus (${spirit.name} Spirit)`;
        const focusSourceId = `spiritFocus:${spirit.tag}`;
        for (const t of spirit.spiritBonusTargets) {
          if (t.kind === "flat") {
            out.push({
              target: t.target,
              type: "untyped",
              value: 1,
              source: focusSource,
              sourceId: focusSourceId,
            });
          } else {
            for (const [skillId, ability] of Object.entries(SKILL_ABILITY)) {
              if (ability !== t.ability) continue;
              out.push({
                target: `skill.${skillId}`,
                type: "untyped",
                value: 1,
                source: focusSource,
                sourceId: focusSourceId,
              });
            }
          }
        }
      }

      if (spirit.seanceBoonChange) {
        out.push({
          target: spirit.seanceBoonChange.target,
          type: "untyped",
          value: spirit.seanceBoonChange.value,
          source: `Séance Boon (${spirit.name} Spirit)`,
          sourceId: `mediumSeanceBoon:${spirit.tag}`,
        });
      }
    }
  }
}
