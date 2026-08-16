/**
 * Grit (gunslinger) and Panache (swashbuckler) spend toggles — the
 * `tableOptions` counterpart to `bardic-performances.ts` / `raging-song.ts`
 * for these two resource pools (`resources.ts`'s `feature.tag === "grit"` /
 * `"panache"` branches).
 *
 * Deeds are grouped by class-level gate, not by a picker (RAW grants every
 * deed a gunslinger/swashbuckler qualifies for at their level, no selection
 * budget), except for the handful gated behind a specific feat instead of a
 * level (e.g. a gunslinger's Menacing Shot deed requires Startling Shot) —
 * `gritToggleOptions` takes the character's known feat slugs (see
 * `feat-effects.ts`'s `featNameSlug`) for exactly that gate, reusing the same
 * slug computation `resources.ts` already does for `FEAT_POOL_EFFECTS` rather
 * than re-deriving it.
 *
 * Most of both classes' deeds have no flat numeric effect to model (reactive
 * per-attack triggers, weapon-typing gaps, boolean immunity flags with no
 * closed-vocabulary slug — see `deeds.ts`'s own posture) and stay display-only
 * there. This table covers the small number that DO reduce to a real
 * `Change`:
 *
 *   - Gunslinger Initiative (3rd): the vendored `class-features.json` entry
 *     for this deed already carries a real Change
 *     (`if(gt(@resources.grit.value,0),2)` → `init`/`untypedPerm`), but it is
 *     a silent no-op — `buildRollData()` (rolldata.ts) never populates a
 *     `resources` key at all, so `@resources.grit.value` resolves via
 *     Foundry's missing-path convention to 0 and the formula always yields 0.
 *     This toggle is the player-declared substitute, sharing the vendored
 *     Change's own bonus type (`untypedPerm`, not `untyped`) so the two
 *     sources compete rather than stack if the roll-data gap is ever closed —
 *     see `gritPanacheSpends.test.ts`'s drift guard.
 *   - No Name's grit-spent Disguise clause (community feat): the feat's
 *     unconditional +2 Bluff half is already wired in
 *     `feat-classification-community.ts`; this adds the activated
 *     grit-for-Disguise half that entry's note used to disclaim.
 *   - Dizzying Defense (15th): the swashbuckler's improved fighting-
 *     defensively numbers, flat dodge AC and attack-penalty Changes.
 *   - Courser's Swift Target (1st) / Confounding Target (4th): the same
 *     "base speed while at least 1 panache and light/no armor" grant at two
 *     tiers, RAW's own wording ("her base speed increases by 10 feet rather
 *     than 5 feet") makes the 4th-level version supersede rather than stack
 *     with the 1st-level one — modeled as a single option whose formula tier
 *     is picked in TypeScript by level, never both at once.
 *   - Azatariel's Elysian Conviction (2nd): Charisma bonus (clamped to
 *     non-negative, per this project's usual "bonus" reading) to saves vs.
 *     mind-affecting effects while she holds at least 1 panache point.
 */

import type { Change } from "@pf1/schema";

import type { ToggleBuffOption } from "./toggle-buffs.js";

/** Resource-pool `detail` line for Grit — see `resources.ts`'s `feature.tag === "grit"` branch. */
export const GRIT_DETAIL = "grit points · toggle deeds below";

/** Resource-pool `detail` line for Panache — see `resources.ts`'s `feature.tag === "panache"` branch. */
export const PANACHE_DETAIL = "panache points · toggle deeds below";

const GUNSLINGER_INITIATIVE_CHANGES: Change[] = [
  { formula: "2", target: "init", type: "untypedPerm" },
];

/**
 * Gunslinger Initiative (3rd level) — see file doc comment for why this
 * duplicates a vendored-but-dead Change rather than fixing the roll-data gap
 * directly.
 */
export const GUNSLINGER_INITIATIVE: ToggleBuffOption = {
  id: "grit:gunslingerInitiative",
  name: "Gunslinger Initiative",
  changes: GUNSLINGER_INITIATIVE_CHANGES,
  contextNotes: [
    {
      target: "init",
      text: "Requires at least 1 grit point. With Quick Draw, draw a single firearm as part of the initiative check.",
    },
  ],
};

/** No Name's grit-spent Disguise clause (community feat, see `feat-classification-community.ts`'s "no-name" entry for the unconditional Bluff half). */
export const NO_NAME_DISGUISE: ToggleBuffOption = {
  id: "grit:noNameDisguise",
  name: "No Name: Disguise",
  changes: [{ formula: "10", target: "skill.dis", type: "untyped" }],
  contextNotes: [
    {
      target: "skill.dis",
      text: "Costs 1 grit point; lasts 10 minutes per gunslinger level (minimum 10 minutes).",
    },
  ],
};

/**
 * Grit's `tableOptions`, filtered to the deeds the character qualifies for by
 * level and known feats.
 */
export function gritToggleOptions(
  classLevel: number,
  featSlugs: ReadonlySet<string>,
): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];
  if (classLevel >= 3) options.push(GUNSLINGER_INITIATIVE);
  if (featSlugs.has("no-name")) options.push(NO_NAME_DISGUISE);
  return options;
}

const COURSER_ARCHETYPE_ID = "swashbuckler:courser";
const AZATARIEL_ARCHETYPE_ID = "swashbuckler:azatariel";

/** Dizzying Defense (15th level, base class deed). */
export const DIZZYING_DEFENSE: ToggleBuffOption = {
  id: "panache:dizzyingDefense",
  name: "Dizzying Defense",
  changes: [
    { formula: "4", target: "ac", type: "dodge" },
    { formula: "-2", target: "mattack", type: "untyped" },
  ],
  contextNotes: [
    {
      target: "allChecks",
      text: "Costs 1 panache point, taken as a swift action while wielding a light or one-handed piercing melee weapon in one hand.",
    },
  ],
};

/**
 * Courser's speed increase, tiered by level per Confounding Target's own
 * wording ("rather than 5 feet") — see file doc comment. `id` is shared
 * across both tiers since only one is ever surfaced for a given level.
 */
function courserStride(bonus: 5 | 10): ToggleBuffOption {
  return {
    id: "panache:courserStride",
    name: "Courser Stride",
    changes: [{ formula: String(bonus), target: "landSpeed", type: "untyped" }],
    contextNotes: [
      {
        target: "allChecks",
        text: "Requires at least 1 panache point and light or no armor.",
      },
    ],
  };
}

/** Azatariel's Elysian Conviction (2nd level). */
export const ELYSIAN_CONVICTION: ToggleBuffOption = {
  id: "panache:elysianConviction",
  name: "Elysian Conviction",
  changes: [
    {
      formula: "max(0, @abilities.cha.mod)",
      target: "allSavingThrows",
      type: "untyped",
      saveCategories: ["mind"],
    },
  ],
  contextNotes: [
    {
      target: "allSavingThrows",
      text: "Applies while she has at least 1 panache point.",
    },
  ],
};

/**
 * Panache's `tableOptions`, filtered to the deeds the character qualifies for
 * by level, with the character's swashbuckler archetypes gating the
 * archetype-specific entries (Courser's speed increase, Azatariel's Elysian
 * Conviction).
 */
export function panacheToggleOptions(
  classLevel: number,
  classArchetypeIds: readonly string[],
): ToggleBuffOption[] {
  const options: ToggleBuffOption[] = [];
  if (classLevel >= 15) options.push(DIZZYING_DEFENSE);
  if (classArchetypeIds.includes(COURSER_ARCHETYPE_ID)) {
    options.push(courserStride(classLevel >= 4 ? 10 : 5));
  }
  if (classArchetypeIds.includes(AZATARIEL_ARCHETYPE_ID) && classLevel >= 2) {
    options.push(ELYSIAN_CONVICTION);
  }
  return options;
}
