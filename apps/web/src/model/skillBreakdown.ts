/**
 * Skill provenance breakdown — the one derived number that historically had
 * no expand-to-see-why reveal. `DerivedSkill.components` only carries the
 * misc-modifier pool (armor/items/feats/…); ranks, ability mod, the class
 * skill +3, and armor check penalty are separate scalar fields on the type
 * (see `packages/schema/src/character.ts`'s `DerivedSkill`), so this stitches
 * all of it into one `ModifierComponent[]` the shared `Provenance` panel
 * already knows how to render — same reveal AC/saves/attacks use, just fed a
 * synthesized list instead of one straight off `compute()`.
 *
 * Order mirrors how a player actually checks a skill total: ranks, then
 * ability (naming which one, since that's not otherwise visible per-skill),
 * then class skill status, then armor check penalty, then whatever misc
 * bonuses/penalties apply. Ranks and ability always appear (even at +0) since
 * both answer a real question about the skill; class skill and ACP only
 * appear when they actually say something (an ACP row on a Knowledge skill
 * would just be noise) — though a class skill still gets its row even before
 * its first rank, so its status stays visible either way.
 */
import type { DerivedSkill, ModifierComponent } from "@pf1/schema";

import { ABILITY_ABBR } from "./names.js";

export function skillBreakdownComponents(skill: DerivedSkill): ModifierComponent[] {
  const components: ModifierComponent[] = [
    { source: "Ranks", type: "ranks", value: skill.ranks, applied: true },
    {
      source: `Ability (${ABILITY_ABBR[skill.ability]})`,
      type: "ability",
      value: skill.abilityMod,
      applied: true,
    },
  ];
  if (skill.classSkill) {
    components.push({
      source: "Class skill",
      type: "class",
      value: skill.classSkillBonus,
      applied: true,
    });
  }
  if (skill.acp !== 0) {
    components.push({
      source: "Armor check penalty",
      type: "acp",
      value: skill.acp,
      applied: true,
    });
  }
  components.push(...skill.components);
  return components;
}
