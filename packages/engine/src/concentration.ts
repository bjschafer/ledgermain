/**
 * Concentration check bonuses, one per casting class: caster level + that
 * class's casting ability modifier + every `concentration` modifier (PF1 CRB
 * p. 206). Per class because both terms are per class; a cleric/wizard rolls
 * two different numbers.
 *
 * Target vocabulary (registered in `targets.ts`):
 *
 *  - `concentration` — every concentration check (Focused Mind, Industrious).
 *  - `concentration.defensive` — only checks to cast defensively or while
 *    grappled (Combat Casting). Held out of the headline and shown as a
 *    conditional total, since casting defensively is a choice made per cast.
 *
 * Alchemist and investigator are skipped: extracts are drunk, not cast.
 */

import type { AbilityId, CharacterDoc, DerivedConcentration, RefData } from "@pf1/schema";

import { ABILITY_LABEL } from "./ability-substitution.js";
import {
  CASTING_ABILITY,
  EXTRACT_CASTER_TAGS,
  casterLevelForClass,
  effectiveCasterClassLevel,
} from "./caster-level.js";
import { forTarget, type CollectedModifier } from "./collect.js";
import { classByTag } from "./refdata-index.js";
import { resolveStack, synthetic, toComponents } from "./stacking.js";

export const CONCENTRATION_TARGET = "concentration";
export const CONCENTRATION_DEFENSIVE_TARGET = "concentration.defensive";

export function computeConcentration(
  doc: CharacterDoc,
  refData: RefData,
  abilityMods: Readonly<Record<AbilityId, number>>,
  collected: CollectedModifier[],
): DerivedConcentration[] {
  const general = forTarget(collected, CONCENTRATION_TARGET);
  const defensive = forTarget(collected, CONCENTRATION_DEFENSIVE_TARGET);
  const stack = resolveStack(general);
  const out: DerivedConcentration[] = [];
  for (const c of doc.identity.classes) {
    const ability = CASTING_ABILITY[c.tag];
    if (!ability || EXTRACT_CASTER_TAGS.has(c.tag)) continue;
    const casterLevel = casterLevelForClass(c.tag, effectiveCasterClassLevel(doc, refData, c.tag));
    if (casterLevel <= 0) continue;
    const floor = casterLevel + abilityMods[ability];
    const total = floor + stack.total;
    const entry: DerivedConcentration = {
      classTag: c.tag,
      className: classByTag(refData, c.tag)?.name ?? c.tag,
      casterLevel,
      ability,
      total,
      components: [
        synthetic("Caster level", "base", casterLevel),
        synthetic(ABILITY_LABEL[ability], "ability", abilityMods[ability]),
        ...toComponents(stack.modifiers),
      ],
    };
    if (defensive.length > 0) {
      // Re-stacked with the general modifiers so same-type bonuses across the
      // two scopes still collide instead of double-applying.
      const defensiveTotal = floor + resolveStack([...general, ...defensive]).total;
      if (defensiveTotal !== total) {
        entry.conditionals = [
          {
            total: defensiveTotal,
            categories: ["defensive", "grappled"],
            labels: ["defensive", "grappled"],
          },
        ];
      }
    }
    out.push(entry);
  }
  return out;
}
