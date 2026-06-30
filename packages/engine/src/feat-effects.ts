/**
 * Hand-authored mechanical effects for curated "always-on, no-parameter" feats.
 * Clean-room from the published PF1 rules — no Foundry source was consulted.
 *
 * Map key: normalized name slug (see `featNameSlug`).
 * Rationale: feat ids in RefData are opaque Foundry UUIDs that may change between
 * data versions. Slugging from the canonical human-readable name is stable and
 * human-authorable. Lookup path: doc.build.feats → refData.feats[id].name → slug.
 *
 * Target strings follow the same conventions as collect.ts / compute.ts:
 *   - saves:      "fort" | "ref" | "will" | "allSavingThrows"
 *   - AC:         "ac"  (type "dodge" routes to the dodge bucket in computeAc)
 *   - initiative: "init"
 *   - HP:         "hp"  (consumed by computeHp in compute.ts)
 *   - skills:     "skill.<id>"  (e.g. "skill.per", "skill.sen")
 *
 * Feats that require a player choice are intentionally omitted — no feat-choice
 * mechanism exists in the doc/model yet. Add them here once that lands.
 * Omitted (needs feat-choice mechanism, future):
 *   - Weapon Focus (per weapon)
 *   - Weapon Specialization (per weapon)
 *   - Greater Weapon Focus (per weapon)
 *   - Skill Focus (per skill)
 */

export interface FeatChange {
  target: string;
  type: string;
  formula: string;
}

/**
 * Normalize a feat name to a stable slug for use as a map key.
 * e.g. "Improved Initiative" → "improved-initiative"
 *      "Iron Will"           → "iron-will"
 */
export function featNameSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Always-on, no-parameter feat effects, keyed by name slug.
 * Evaluated through the same evalChange path in collect.ts as class features.
 */
export const FEAT_EFFECTS: Readonly<Record<string, FeatChange[]>> = {
  // Toughness: +3 HP; +1 per HD beyond 3 (PF1 CRB p. 135).
  // Formula: max(3, @attributes.hd.total) → 3 at HD ≤ 3, then equals HD thereafter.
  toughness: [
    { target: "hp", type: "untyped", formula: "max(3, @attributes.hd.total)" },
  ],

  // Iron Will: +2 bonus on Will saving throws (PF1 CRB p. 127). Untyped = stacks.
  "iron-will": [
    { target: "will", type: "untyped", formula: "2" },
  ],

  // Lightning Reflexes: +2 bonus on Reflex saving throws (PF1 CRB p. 129). Untyped.
  "lightning-reflexes": [
    { target: "ref", type: "untyped", formula: "2" },
  ],

  // Great Fortitude: +2 bonus on Fortitude saving throws (PF1 CRB p. 124). Untyped.
  "great-fortitude": [
    { target: "fort", type: "untyped", formula: "2" },
  ],

  // Dodge: +1 dodge bonus to AC (PF1 CRB p. 122). Dodge type stacks with all other
  // dodge bonuses per the stacking engine (stacking.ts: STACKING_TYPES includes "dodge").
  dodge: [
    { target: "ac", type: "dodge", formula: "1" },
  ],

  // Improved Initiative: +4 bonus on initiative checks (PF1 CRB p. 127). Untyped.
  "improved-initiative": [
    { target: "init", type: "untyped", formula: "4" },
  ],

  // Alertness: +2 bonus on Perception (skill.per) and Sense Motive (skill.sen)
  // (PF1 CRB p. 118). Skill targets are supported via "skill.*" in computeSkills.
  alertness: [
    { target: "skill.per", type: "untyped", formula: "2" },
    { target: "skill.sen", type: "untyped", formula: "2" },
  ],
};
