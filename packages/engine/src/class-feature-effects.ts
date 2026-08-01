/**
 * Hand-authored extra `Change[]` appended to vendored class features whose own
 * `changes[]` are missing a numeric effect their published description text
 * promises — the class-feature counterpart of `buff-effects.ts`'s
 * `BUFF_CHANGE_PATCHES`, and the same clean-room posture as
 * `feat-effects.ts`/`archetype-effects.ts`.
 *
 * The gap this exists for: a class feature whose benefit is a save bonus
 * against a CATEGORY of effects (fighter Bravery's "+1 on Will saves against
 * fear") carries no vendored `Change`, because the pack has no way to say
 * "against fear". `Change.saveCategories` can now say it, so the bonus becomes
 * a real number instead of description prose nobody reads mid-combat.
 *
 * Keyed by the feature's NAME, not its `RefData.classFeatures` id (a content
 * hash that could shift across a data-pipeline rebuild), matching
 * `BUFF_CHANGE_PATCHES`. Applied in `collect.ts`'s class-feature loop, which
 * means the formulas are evaluated with that granting class's own level in
 * scope: `@class.unlevel` is THIS class's level, which is what a
 * "+1 per four levels after 2nd" progression needs.
 */

import type { Change } from "@pf1/schema";

export const CLASS_FEATURE_CHANGE_PATCHES: Readonly<Record<string, readonly Change[]>> = {};
