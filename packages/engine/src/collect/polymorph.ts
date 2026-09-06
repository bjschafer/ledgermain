/**
 * The active polymorph form's size and ability changes.
 */
import { polymorphFormOption } from "../polymorph.js";
import { type CollectContext } from "./shared.js";

/** Active polymorph form (live state). */
export function collectPolymorphForm(ctx: CollectContext): void {
  const { doc, out } = ctx;
  // `live.activeForm` (set by `model/polymorph.ts` — Wild Shape or a Beast
  // Shape/Elemental Body/Plant Shape spell) records the player's chosen
  // tier + creature type/size/element; the ability-score and natural-armor
  // adjustments for that specific row (`@pf1/engine` `polymorphFormOption`)
  // are injected here as ordinary `str`/`dex`/`con`/`nac` modifiers so they
  // ride the SAME typed-bonus stacker as every other ability/AC source — see
  // `polymorph.ts`'s file doc comment for why "size" and "base" (natural
  // armor) are the correct RAW types to reuse here, rather than a bespoke
  // polymorph-only stacking rule. An unresolved tier/creatureType/size/
  // element combination (stale, or simply never valid) contributes nothing,
  // same soft posture as every other live-state lookup above. The form's
  // SIZE itself (independent of whether this lookup resolves) is applied
  // directly by `compute.ts`, which overrides the size-ladder size outright.
  const activeForm = doc.live.activeForm;
  if (activeForm) {
    const option = polymorphFormOption(
      activeForm.tier,
      activeForm.creatureType,
      activeForm.size,
      activeForm.element,
    );
    if (option) {
      const source = `${activeForm.formName} (form)`;
      for (const adj of option.abilityAdjustments) {
        out.push({
          target: adj.ability,
          type: adj.type,
          value: adj.value,
          source,
          sourceId: "activeForm",
        });
      }
      if (option.naturalArmor) {
        out.push({
          target: "nac",
          type: "base",
          value: option.naturalArmor,
          source,
          sourceId: "activeForm",
        });
      }
    }
  }
}
