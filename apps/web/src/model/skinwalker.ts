/**
 * Skinwalker Change Shape toggle (Blood of the Moon): a player-controlled
 * marker buff for the race's own supernatural "change to a bestial form"
 * ability. The ability itself is at-will (no daily-use limit, unlike a
 * resource-pool-gated toggle such as Rage or a shifter minor form), so this
 * is a bare on/off switch rather than something routed through
 * `resources.ts`'s `linkedBuffIds`/`tableOptions`.
 *
 * The switch carries no `changes` of its own — the numeric payoff lives on
 * each "-Kin" heritage's own racial-trait entry, hand-authored in
 * data-pipeline's `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES` with a third `Change`
 * gated by `activeWhenBuff: { effectTags: ["skinwalker:changeShape"] }` (see
 * that table's doc comment). Toggling this buff on/off is what flips those
 * gated `Change`s on/off, the same "buff as a pure gate, no changes of its
 * own" shape `@pf1/engine` `rage-powers.ts`'s `WHILE_RAGING` uses against the
 * real vendored Rage buff — except Change Shape has no vendored buff to key
 * a real `buffId` off, so this uses `effectTag` instead (mirrors
 * `model/shifterAspects.ts`'s synthetic-id toggle).
 *
 * Only the ability-score rider is modeled. Change Shape's other bestial
 * features (natural attacks, speed bonuses, senses, size) are NOT — same
 * scope line `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES`'s doc comment draws.
 */

import type { ActiveBuff, CharacterDoc, RefData } from "@pf1/schema";

import { localId } from "./ids.js";

/** Matches `SUPPLEMENTAL_RACIAL_TRAIT_CHANGES`'s `SKINWALKER_CHANGE_SHAPE_GATE` in data-pipeline. */
const CHANGE_SHAPE_EFFECT_TAG = "skinwalker:changeShape";

function activeChangeShapeBuff(doc: CharacterDoc): ActiveBuff | undefined {
  return doc.live.activeBuffs.find((b) => b.effectTag === CHANGE_SHAPE_EFFECT_TAG);
}

export function isChangeShapeActive(doc: CharacterDoc): boolean {
  return activeChangeShapeBuff(doc) !== undefined;
}

/** Toggle Change Shape on/off. */
export function toggleChangeShape(doc: CharacterDoc): CharacterDoc {
  const active = activeChangeShapeBuff(doc);
  if (active) {
    return {
      ...doc,
      live: {
        ...doc.live,
        activeBuffs: doc.live.activeBuffs.filter((b) => b.instanceId !== active.instanceId),
      },
    };
  }
  const buff: ActiveBuff = {
    instanceId: localId("buff-"),
    effectTag: CHANGE_SHAPE_EFFECT_TAG,
    name: "Change Shape (Skinwalker)",
    changes: [],
    contextNotes: [
      {
        target: "allChecks",
        text: "Applies your heritage's ability bonus while shapechanged, if you have a -Kin heritage. Natural attacks, bestial speed, and senses from Change Shape are not modeled: apply them by hand.",
      },
    ],
  };
  return { ...doc, live: { ...doc.live, activeBuffs: [...doc.live.activeBuffs, buff] } };
}

/** True for a Skinwalker character (any heritage) — gates the tracker panel's visibility. */
export function isSkinwalker(doc: CharacterDoc, refData: RefData): boolean {
  return refData.races[doc.identity.race]?.name === "Skinwalker";
}

/**
 * True when at least one of the character's chosen vendored racial traits
 * actually carries a `Change` gated on the Change Shape buff — i.e. a -Kin
 * heritage is picked, so the toggle currently does something. Derived
 * generically (matched by the gate itself, not a hardcoded heritage-id list)
 * so a future supplement entry gating on the same buff (e.g. the base race's
 * own choose-one rider, if it's ever modeled) picks this up for free.
 */
export function changeShapeHasEffect(doc: CharacterDoc, refData: RefData): boolean {
  return (doc.build.vendoredRacialTraits ?? []).some((id) =>
    refData.racialTraits[id]?.changes.some((c) =>
      c.activeWhenBuff?.effectTags?.includes(CHANGE_SHAPE_EFFECT_TAG),
    ),
  );
}
