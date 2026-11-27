/**
 * The one-line summary shown under a search result. These are baked into the
 * index at build time so the results list never has to touch a shard — the whole
 * point of the split is that you can scan matches before committing to a fetch.
 *
 * Kept short and scannable rather than complete: the detail page is one click
 * away and carries everything.
 */

import type { ConditionDef } from "@pf1/engine";
import type {
  ArmorRef,
  Feat,
  Item,
  Monster,
  MonsterTemplate,
  RuleEntry,
  Spell,
  WeaponRef,
} from "@pf1/schema";

import {
  classLevels,
  formatCrit,
  formatPrice,
  joinDot,
  proficiencyLabel,
  schoolName,
  signed,
} from "./format.js";

/** How many per-class levels a spell facet lists before giving up on room. */
const MAX_CLASS_LEVELS = 4;

/** e.g. `Evocation 3 · sorcerer 3, wizard 3`. */
export function spellFacet(spell: Spell, classNames: Record<string, string>): string {
  const school = schoolName(spell.school);
  const head = school ? `${school} ${spell.level}` : `Level ${spell.level}`;
  const classes = classLevels(spell.learnedAt.class, classNames);
  const shown = classes.slice(0, MAX_CLASS_LEVELS);
  if (classes.length > MAX_CLASS_LEVELS) shown.push("…");
  return joinDot([head, shown.length > 0 ? shown.join(", ") : null]);
}

/** e.g. `Combat` — the feat's tags, which are what players filter on by eye. */
export function featFacet(feat: Feat): string {
  return feat.tags.length > 0 ? feat.tags.join(", ") : "Feat";
}

/** e.g. `1d8 19–20/×2 · martial melee`. */
export function weaponFacet(weapon: WeaponRef): string {
  const dice = weapon.damageDice
    ? `${weapon.damageDice} ${formatCrit(weapon.critRange, weapon.critMult)}`
    : formatCrit(weapon.critRange, weapon.critMult);
  const kind = [proficiencyLabel(weapon.proficiency), weapon.category].filter(Boolean).join(" ");
  return joinDot([dice, kind || null]);
}

/** e.g. `+4 AC · max Dex +4 · ACP -6`. */
export function armorFacet(armor: ArmorRef): string {
  return joinDot([
    `${signed(armor.ac)} AC`,
    armor.maxDex !== undefined ? `max Dex ${signed(armor.maxDex)}` : null,
    armor.acp ? `ACP ${signed(-armor.acp)}` : null,
  ]);
}

/** e.g. `8,000 gp · ring · magic`. */
export function itemFacet(item: Item): string {
  // An item is magic iff it carries an aura and/or a caster level — the vendored
  // `subType` has no "magic" value to test (it's "wondrous", "gear", "potion", …).
  const magic = item.aura !== undefined || item.cl !== undefined;
  return (
    joinDot([formatPrice(item.price), item.slot ?? item.subType, magic ? "magic" : null]) || "Item"
  );
}

export function conditionFacet(_condition: ConditionDef): string {
  return "Condition";
}

/** e.g. `CR 5 · Large magical beast` — kept short: the facet column is the index's biggest string cost. */
export function monsterFacet(monster: Monster): string {
  const kind = [monster.size, monster.creatureType].filter(Boolean).join(" ");
  return joinDot([
    monster.cr
      ? `CR ${monster.cr}${monster.mythicRank !== undefined ? `/MR ${monster.mythicRank}` : ""}`
      : null,
    kind || null,
  ]);
}

/** e.g. `CR +1 · simple template`. */
export function monsterTemplateFacet(template: MonsterTemplate): string {
  const kind = template.simple
    ? "simple"
    : template.inherited
      ? "inherited"
      : template.acquired
        ? "acquired"
        : null;
  return joinDot([
    template.cr ? `CR ${template.cr}` : null,
    kind ? `${kind} template` : "template",
  ]);
}

/** e.g. `Combat Rules · Miscellaneous Actions`: the chapter, then the section it sits in. */
export function ruleFacet(rule: RuleEntry): string {
  const chapter = rule.path[0]?.name;
  const parent = rule.path.length > 1 ? rule.path[rule.path.length - 1]?.name : null;
  return joinDot([chapter ?? "Rules", parent]);
}
