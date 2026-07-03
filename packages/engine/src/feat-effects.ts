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

/**
 * A situational feat effect for the saved-rolls UI (attack/damage tweaks that
 * only apply under a condition the player judges at the table — range, full
 * attack, grip). These are NEVER emitted by `collect.ts` / `compute()`: they
 * are surfaced only through the separate {@link SITUATIONAL_FEAT_EFFECTS} map
 * and folded in by `apps/web/src/model/savedRolls.ts` at resolve time, never
 * as unconditional `Change`s. Keeping the map separate (rather than adding a
 * third case to `FEAT_EFFECTS`) makes it structurally impossible for one of
 * these to leak into the always-on derived sheet.
 */
export interface SituationalFeatEffect {
  /** Delta applied to every attack in the sequence. */
  attack?: number;
  /** Delta applied to the damage bonus. */
  damage?: number;
  /** Extra attack entries at the (adjusted) highest bonus. */
  extraAttacks?: number;
  /** At-table reminder, e.g. "within 30 ft". */
  note?: string;
}

export interface SituationalFeatEntry {
  type: "situational";
  /** Which saved-roll sources this sensibly attaches to (picker filter, not enforcement). */
  appliesTo: "melee" | "ranged" | "any";
  /** Variant selector, e.g. Power Attack grip. When present the UI renders a small select. */
  options?: { id: string; label: string }[];
  effect(ctx: { bab: number }, option?: string): SituationalFeatEffect;
}

export type FeatEntry = StaticFeatEntry | ChoiceFeatEntry | SituationalFeatEntry;

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

  // Weapon Focus: +1 untyped attack bonus with the chosen weapon type (PF1 CRB p. 136).
  // The target `attack.weapon.<group>` is consumed by computeWeaponAttacks in compute.ts,
  // which runs forTarget for the weapon's group when building each per-weapon attack line.
  "weapon-focus": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string): FeatChange[] {
      return [{ target: `attack.weapon.${choiceId}`, type: "untyped", formula: "1" }];
    },
  },

  // Weapon Specialization: +2 untyped damage bonus with the chosen weapon type (PF1 CRB p. 137).
  // NOTE: Requires Fighter 4 — not hard-enforced here (soft-prereq policy applies).
  // The target `damage.weapon.<group>` is consumed by computeWeaponAttacks in compute.ts.
  "weapon-specialization": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string): FeatChange[] {
      return [{ target: `damage.weapon.${choiceId}`, type: "untyped", formula: "2" }];
    },
  },
};

/**
 * Situational feat effects for the saved-rolls attachment feature (see the
 * `SituationalFeatEntry` doc comment above). Deliberately kept OUT of
 * `FEAT_EFFECTS` — `compute()` must never read from this map. Each entry's
 * `effect()` is pure and takes the character's current BAB (for the
 * BAB-tiered feats) plus an optional variant `option` id.
 */
export const SITUATIONAL_FEAT_EFFECTS: Readonly<Record<string, SituationalFeatEntry>> = {
  // Point-Blank Shot: +1 attack and +1 damage with ranged weapons within 30 ft
  // (PF1 CRB p. 131).
  "point-blank-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ attack: 1, damage: 1, note: "within 30 ft" }),
  },

  // Precise Shot: no -4 penalty on ranged attacks against a target engaged in
  // melee (PF1 CRB p. 131). No numeric effect here — the -4 it removes is
  // never modeled as an active penalty, so this is a reminder-only note.
  "precise-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ note: "no −4 for firing into melee" }),
  },

  // Rapid Shot: one extra ranged attack at the highest bonus, all ranged
  // attacks that round take a -2 penalty; full attack only (PF1 CRB p. 131).
  "rapid-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ attack: -2, extraAttacks: 1, note: "full attack only" }),
  },

  // Manyshot: the first attack of a full attack fires two arrows, dealing
  // double the ability/precision-independent damage once but rolling
  // precision damage (e.g. sneak attack) only once (PF1 CRB p. 130).
  // Not numerically modeled — reminder only.
  manyshot: {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ note: "first attack: 2 arrows (precision damage once)" }),
  },

  // Deadly Aim: trade ranged attack bonus for damage, scaling with BAB
  // (PF1 CRB p. 119). p = 1 + floor(BAB / 4): -1/+2 at BAB 1-3, -2/+4 at
  // BAB 4-7, -3/+6 at BAB 8-11, -4/+8 at BAB 12-15, ...
  "deadly-aim": {
    type: "situational",
    appliesTo: "ranged",
    effect: (ctx) => {
      const p = 1 + Math.floor(ctx.bab / 4);
      return { attack: -p, damage: 2 * p };
    },
  },

  // Power Attack: trade melee attack bonus for damage, scaling with BAB
  // (PF1 CRB p. 131). p = 1 + floor(BAB / 4); attack penalty is always -p.
  // Damage bonus is 2p one-handed (default; also covers light/off-hand here
  // for simplicity -- two options only) or 3p two-handed.
  "power-attack": {
    type: "situational",
    appliesTo: "melee",
    options: [
      { id: "one-handed", label: "One-handed" },
      { id: "two-handed", label: "Two-handed" },
    ],
    effect: (ctx, option) => {
      const p = 1 + Math.floor(ctx.bab / 4);
      const damage = option === "two-handed" ? 3 * p : 2 * p;
      return { attack: -p, damage };
    },
  },

  // Furious Focus: ignore the Power Attack penalty on the first attack of a
  // full-attack action, or on a single attack made as a standard action
  // (PF1 CRB p. 124, Advanced Player's Guide). Reminder only — the saved-roll
  // model doesn't split "first attack" from the rest of the sequence.
  "furious-focus": {
    type: "situational",
    appliesTo: "melee",
    effect: () => ({ note: "ignore Power Attack penalty on first attack each turn" }),
  },
};
