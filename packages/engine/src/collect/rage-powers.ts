/**
 * Barbarian rage powers, whose changes are rage-gated.
 */
import { resolveRagePower } from "../rage-powers.js";
import { type CollectContext, evalChange } from "./shared.js";

/** Barbarian rage powers (build choice, gated). */
export function collectRagePowers(ctx: CollectContext): void {
  const { doc, refData, rollData, out, gateOpen } = ctx;
  // Power ids are hand-authored clean-room content (not in the vendored
  // Foundry data pack — see `@pf1/engine` `rage-powers.ts`), same posture as
  // magus arcana above. Gated on the character actually having barbarian
  // (either edition) levels. Most powers are still `displayOnly` with
  // `changes: []` (activated/per-round abilities or conditional-target near
  // misses — see that file's doc comment), but a handful (Raging Climber,
  // Raging Swimmer, Swift Foot) now carry a real `Change` gated by
  // `activeWhenBuff` ("while raging" mechanism) —
  // `buffGateSatisfied` skips those entirely unless the character currently
  // has the (chained or Unchained) Rage buff active in `live.activeBuffs`.
  const barbarianAnyLevel = doc.identity.classes
    .filter((c) => c.tag === "barbarian" || c.tag === "barbarianUnchained")
    .reduce((sum, c) => sum + c.level, 0);
  if (barbarianAnyLevel > 0) {
    for (const powerId of doc.build.ragePowers ?? []) {
      const power = resolveRagePower(powerId, refData);
      if (!power) continue;
      for (const ch of power.changes) {
        if (!gateOpen(ch)) continue;
        evalChange(
          ch.formula,
          rollData,
          ch.target,
          ch.type,
          power.name,
          power.id,
          out,
          ch.operator,
          ch.saveCategories,
          ch.maneuverCategories,
          ch.acCategories,
        );
      }
      // Choose-one powers (Energy Resistance's energy type, the Elemental
      // Blood chain): apply the stored selection's changes. The pick lives
      // under the DECLARING power's key (`choiceFrom` for chain entries);
      // no stored pick, or a stale option id, emits nothing.
      if (power.choiceChanges) {
        const picked = doc.build.pickChoices?.[`ragePower:${power.choiceFrom ?? power.id}`];
        for (const ch of (picked && power.choiceChanges[picked]) || []) {
          if (!gateOpen(ch)) continue;
          evalChange(
            ch.formula,
            rollData,
            ch.target,
            ch.type,
            power.name,
            power.id,
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
}
