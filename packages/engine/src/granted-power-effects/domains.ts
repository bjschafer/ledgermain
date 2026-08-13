/**
 * Hand-authored `Change[]` for cleric/inquisitor domain and subdomain
 * granted powers whose published text promises a numeric effect the
 * vendored `RefData.domains[*].features` / `RefData.subdomains[*].features`
 * entry doesn't carry (`RefData.classFeatures[featureId].changes` is empty).
 * Keyed by the granted power's `name`, same rationale as
 * `CLASS_FEATURE_CHANGE_PATCHES`: the vendored `classFeatures` id is a
 * content hash that can shift across a data-pipeline rebuild.
 *
 * Also covers a druid's nature-bond domain pick: `collectGrantedFeatures`
 * tags that grant `origin.kind: "domain"` too (see `schools.ts`'s doc
 * comment for the disambiguation from wizard arcane schools), and it reads
 * from the same `RefData.domains`/`RefData.subdomains` tables.
 *
 * See `granted-power-effects/index.ts` for the collection-loop wiring and
 * the cross-catalog name-collision discipline every key here must satisfy.
 */

import type { Change } from "@pf1/schema";

export const DOMAIN_POWER_PATCHES: Readonly<Record<string, readonly Change[]>> = {
  /**
   * Guarded Mind (Void domain, and its Isolation/Stars subdomains):
   * "You gain a +2 insight bonus on saving throws against all
   * mind-affecting effects." (Advanced Player's Guide p. 182). Scoped with
   * `saveCategories: ["mind"]` rather than an unconditional Will bonus, so
   * it surfaces as a situational total rather than inflating every Will
   * save.
   */
  "Guarded Mind": [
    { formula: "2", target: "allSavingThrows", type: "insight", saveCategories: ["mind"] },
  ],

  /**
   * Eyes of the Hawk (Feather subdomain, Animal domain): "You gain a racial
   * bonus on Perception checks equal to 1/2 your cleric level (minimum +1).
   * In addition, if you can act during a surprise round, you receive a +2
   * racial bonus on your Initiative check." (Advanced Player's Guide p. 90).
   * Only the Perception line is a self-facing unconditional number; the
   * surprise-round Initiative clause is conditional on a fight state this
   * static sheet can't detect and stays unmodeled.
   */
  "Eyes of the Hawk": [
    { formula: "max(1, floor(@class.unlevel / 2))", target: "skill.per", type: "racial" },
  ],

  /**
   * Perfected Form: "You gain a +1 sacred (if your patron is good or
   * neutral) or profane (if your patron is evil) bonus on saving throws
   * against polymorph, petrification, and transmutation effects. This bonus
   * increases by 1 for every 5 cleric levels you have (maximum +5)."
   * (Pathfinder Society Field Guide p. 26). Granted by the Self-Realization
   * subdomain of either the Liberation or the Strength domain (both require
   * the Acolyte of Apocrypha trait) — not a "Purity" subdomain, despite the
   * power's protective flavor. Typed "sacred" unconditionally: the profane
   * variant is the same number, and the doc records no patron alignment to
   * pick between them, so only cross-stacking against another sacred bonus
   * on the same categories could ever diverge. The once/day temp-HP-and-
   * morale surge on a successful save stays unmodeled (resource-gated).
   */
  "Perfected Form": [
    {
      formula: "min(5, 1 + floor(@class.unlevel / 5))",
      target: "allSavingThrows",
      type: "sacred",
      saveCategories: ["polymorph", "petrification", "transmutation"],
    },
  ],

  /**
   * Fire Hardened (Plane of Fire nature-bond domain, druid): "You ignore
   * fire damage from the fire-dominant planar trait, and you gain fire
   * resistance 5. If you have natural fire resistance, it increases by 5
   * instead..." (Faiths of Purity p. 7). `defenses.ts`'s `groupByQualifier`
   * takes the single highest `eres.fire` source rather than summing, so a
   * character who also has natural fire resistance sees the engine's usual
   * highest-wins behavior, not the +5 stack RAW promises there — a known,
   * documented divergence rather than a fabricated stacking mechanism. For
   * everyone else this is a faithful flat 5. The fire-dominant-plane
   * immunity, touch-share uses/day, and planar clauses stay unmodeled.
   */
  "Fire Hardened": [{ formula: "5", target: "eres.fire", type: "untyped" }],

  /**
   * Trap Sense (Jungle nature-bond domain, druid): "At 3rd level, you gain
   * the trap sense ability. This is identical to the rogue class ability.
   * Your effective rogue level is equal to your druid level for the purpose
   * of determining your trap sense bonus." Both halves of the rogue ability:
   * the Reflex-vs-traps bonus (`saveCategories`) and the dodge-AC-vs-traps
   * bonus (`acCategories`). This is the only granted power named "Trap
   * Sense" reachable through this table (the class-feature-granted copies
   * live in `class-feature-effects.ts` under per-class and bare keys — see
   * its header for the key grammar their differing progressions need).
   */
  "Trap Sense": [
    {
      formula: "floor(@class.unlevel / 3)",
      target: "ref",
      type: "untyped",
      saveCategories: ["traps"],
    },
    {
      formula: "floor(@class.unlevel / 3)",
      target: "ac",
      type: "dodge",
      acCategories: ["traps"],
    },
  ],
};
