/**
 * Hand-authored mechanical effects for feats.
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
 * Two entry shapes:
 *   StaticFeatEntry  — unconditional changes, no player selection required.
 *   ChoiceFeatEntry  — player picks a target (skill, weapon, …); collect.ts reads
 *                      `doc.build.featChoices[featId]` and calls `build(choiceId)`.
 *                      The UI renders a picker for these feats (FeatsSection.tsx).
 */

export interface FeatChange {
  target: string;
  type: string;
  formula: string;
}

/** A feat that unconditionally applies a fixed set of typed modifiers. */
export interface StaticFeatEntry {
  type: "static";
  changes: FeatChange[];
}

/**
 * A feat that requires a player selection before it has mechanical effect.
 * `choice.type` drives the UI picker ("skill" → skill list, "weapon" → weapon list).
 * `build(choiceId)` produces the changes to emit once a choice is stored in
 * `doc.build.featChoices[featId]`.
 */
export interface ChoiceFeatEntry {
  type: "choice";
  /** Descriptor consumed by the UI to render a picker. */
  choice: { type: "skill" | "weapon"; label: string };
  /** Produces the typed changes for the given player choice id. */
  build(choiceId: string): FeatChange[];
}

export type FeatEntry = StaticFeatEntry | ChoiceFeatEntry;

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
 * Feat effects, keyed by name slug. Entries are either always-on (static) or
 * choice-based (player picks a target, engine emits changes after selection).
 */
export const FEAT_EFFECTS: Readonly<Record<string, FeatEntry>> = {
  // ── Static feats ───────────────────────────────────────────────────────────

  // Toughness: +3 HP; +1 per HD beyond 3 (PF1 CRB p. 135).
  // Formula: max(3, @attributes.hd.total) → 3 at HD ≤ 3, then equals HD thereafter.
  toughness: {
    type: "static",
    changes: [{ target: "hp", type: "untyped", formula: "max(3, @attributes.hd.total)" }],
  },

  // Iron Will: +2 bonus on Will saving throws (PF1 CRB p. 127). Untyped = stacks.
  "iron-will": {
    type: "static",
    changes: [{ target: "will", type: "untyped", formula: "2" }],
  },

  // Lightning Reflexes: +2 bonus on Reflex saving throws (PF1 CRB p. 129). Untyped.
  "lightning-reflexes": {
    type: "static",
    changes: [{ target: "ref", type: "untyped", formula: "2" }],
  },

  // Great Fortitude: +2 bonus on Fortitude saving throws (PF1 CRB p. 124). Untyped.
  "great-fortitude": {
    type: "static",
    changes: [{ target: "fort", type: "untyped", formula: "2" }],
  },

  // Dodge: +1 dodge bonus to AC (PF1 CRB p. 122). Dodge type stacks with all other
  // dodge bonuses per the stacking engine (stacking.ts: STACKING_TYPES includes "dodge").
  dodge: {
    type: "static",
    changes: [{ target: "ac", type: "dodge", formula: "1" }],
  },

  // Improved Initiative: +4 bonus on initiative checks (PF1 CRB p. 127). Untyped.
  "improved-initiative": {
    type: "static",
    changes: [{ target: "init", type: "untyped", formula: "4" }],
  },

  // Alertness: +2 bonus on Perception (skill.per) and Sense Motive (skill.sen)
  // (PF1 CRB p. 118). Skill targets are supported via "skill.*" in computeSkills.
  alertness: {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "2" },
      { target: "skill.sen", type: "untyped", formula: "2" },
    ],
  },

  // ── Choice feats ───────────────────────────────────────────────────────────

  // Skill Focus: +3 competence bonus on the chosen skill (PF1 CRB p. 134).
  // If the character has 10+ ranks in the chosen skill the bonus increases to +6.
  // Formula uses the rollData path @skills.<id>.rank (see rolldata.ts). Missing
  // rank entries resolve to 0, so an unchosen/unranked skill safely returns +3.
  "skill-focus": {
    type: "choice",
    choice: { type: "skill", label: "Skill" },
    build(choiceId: string): FeatChange[] {
      return [
        {
          target: `skill.${choiceId}`,
          type: "untyped",
          formula: `if(gte(@skills.${choiceId}.rank, 10), 6, 3)`,
        },
      ];
    },
  },

  // Weapon Focus / Weapon Specialization — SCAFFOLDED BUT INERT.
  // These are choice feats (player selects a weapon type), but the per-weapon
  // attack-row model that they'd modify does not yet exist (items system, deferred).
  // Declaring them here so the UI can render a weapon picker; `build` returns []
  // until the weapon attack model lands. Do not add weapon targets to computeSkills.
  "weapon-focus": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(_choiceId: string): FeatChange[] {
      // +1 attack with chosen weapon — deferred until per-weapon attack model exists.
      return [];
    },
  },
  "weapon-specialization": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(_choiceId: string): FeatChange[] {
      // +2 damage with chosen weapon — deferred until per-weapon attack model exists.
      return [];
    },
  },
};
