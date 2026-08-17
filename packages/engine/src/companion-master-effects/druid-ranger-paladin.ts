/**
 * Druid + ranger + paladin + antipaladin archetype features that modify the
 * tracked companion/mount — one wave shard of
 * `COMPANION_EFFECT_ARCHETYPE_FEATURES` (see `index.ts`). Keys are
 * archetype-feature classification keys; verify every number against the
 * vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const DRUID_RANGER_PALADIN_COMPANION_EFFECTS: Readonly<
  Record<string, ArchetypeCompanionEffect>
> = {
  // "The ranger's effective druid level for his animal companions is now
  // equal to his ranger level" — +3 undoes hunters-bond's −3 offset exactly,
  // so it needs (and only applies on top of) the hunters-bond source.
  "ranger:beast-master:strong-bond:12": {
    archetypeId: "ranger:beast-master",
    minLevel: 12,
    source: "Strong Bond",
    level: { grants: false, mode: "flat", amount: 3 },
  },
  // "The ranger's effective druid level for his mount is now equal to his
  // ranger level" — identical shape to beast-master's Strong Bond, applied
  // on top of horse-lord's own Mounted Bond (which uses the same
  // "hunters-bond" source tag/−3 offset as base Hunter's Bond).
  "ranger:horse-lord:strong-bond:12": {
    archetypeId: "ranger:horse-lord",
    minLevel: 12,
    source: "Strong Bond",
    level: { grants: false, mode: "flat", amount: 3 },
  },
  // "The jungle lord's effective druid level for his animal companions is
  // now equal to his ranger level" — same Strong Bond shape again.
  "ranger:jungle-lord:strong-bond:12": {
    archetypeId: "ranger:jungle-lord",
    minLevel: 12,
    source: "Strong Bond",
    level: { grants: false, mode: "flat", amount: 3 },
  },
  // "This ability functions like the druid animal companion ability... the
  // falconer must take the bird... companion, and that companion has only
  // half the normal hit points." Unlike every other ranger companion
  // variant in this file, the vendored text never restates hunter's bond's
  // usual "ranger level − 3" offset — and Hunter's Bond at 4th level
  // explicitly grants no new companion or levels for a falconer ("he does
  // not gain a new companion at 4th level; rather, his feathered companion
  // gains full hit points"), which only makes sense if Feathered Companion
  // already tracks the falconer's full ranger level from 1st on. Grants
  // (not boosts) since it creates a companion 3 levels before the normal
  // hunter's-bond gate, independent of any "hunters-bond" source tag.
  "ranger:falconer:feathered-companion:1": {
    archetypeId: "ranger:falconer",
    minLevel: 1,
    source: "Feathered Companion",
    level: { grants: true, mode: "classLevel", classTag: "ranger", offset: 0 },
    note: "This companion has only half its normal hit points until 4th level. Hit points are not adjustable through this table, so the reduction is not reflected on the sheet.",
  },
  // "This ability functions like the druid animal companion ability, using
  // the scion's paladin level as her effective druid level" — a 1:1 grant
  // (no offset at all) via the Divine Bond slot.
  "paladin:scion-of-talmandor:bonded-eagle:5": {
    archetypeId: "paladin:scion-of-talmandor",
    minLevel: 5,
    source: "Bonded Eagle",
    level: { grants: true, mode: "classLevel", classTag: "paladin", offset: 0 },
    note: "Spending an extra use of smite evil extends its bonuses to this eagle. That action is not tracked here.",
  },
  // "Any mount she is riding gains the benefit of her divine grace class
  // feature, adding her Charisma bonus (if any) to its saving throws" —
  // the exact same Change the vendored Divine Grace class feature itself
  // carries (`@abilities.cha.mod` untyped on `allSavingThrows`), extended
  // to the mount.
  "paladin:shining-knight:skilled-rider:3": {
    archetypeId: "paladin:shining-knight",
    minLevel: 3,
    source: "Skilled Rider",
    changes: [{ target: "allSavingThrows", type: "untyped", formula: "@abilities.cha.mod" }],
  },
  // "This corpse mount functions as a druid's animal companion using the
  // seal-breaker's level as his effective druid level" — a 1:1 grant of an
  // undead mount (heavy horse/pony/boar/camel/dog base stats). The
  // accompanying undead-type swap (good Will/poor Fort+Ref in place of the
  // standard companion's good Fort+Ref/poor Will, and Charisma used where
  // the base creature used Constitution) has no matching stat surface.
  "antipaladin:seal-breaker:corpse-rider:5": {
    archetypeId: "antipaladin:seal-breaker",
    minLevel: 5,
    source: "Corpse Rider",
    level: { grants: true, mode: "classLevel", classTag: "antipaladin", offset: 0 },
    note: "This mount is undead: it uses Charisma where the base creature would use Constitution, and its saving throws follow the undead array (good Will, poor Fortitude and Reflex) rather than the standard companion one. Neither swap is reflected here.",
  },
};
