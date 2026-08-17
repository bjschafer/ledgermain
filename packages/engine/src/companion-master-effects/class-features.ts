/**
 * BASE-CLASS features that modify (or grant) the tracked companion/mount —
 * `COMPANION_EFFECT_CLASS_FEATURES`, keyed by the vendored `classFeatures`
 * pack id (the `PER_DAY_ACTIVATIONS` convention; the id is what
 * `scripts/mech-coverage.ts` matches). The gate that actually applies an
 * entry is `classTag` + `minLevel` (+ optional `when` for choice-gated
 * features like paladin Divine Bond's mount option — a feature that is a
 * CHOICE in its class must never ride a bare level gate, the standing
 * "choice sub-options vendored as automatic grants" trap). Verify every
 * number against the vendored description before wiring.
 */

import type { ClassFeatureCompanionEffect } from "./types.js";

export const COMPANION_EFFECT_CLASS_FEATURES: Readonly<
  Record<string, ClassFeatureCompanionEffect>
> = {
  // "This mount functions as a druid's animal companion, using the
  // paladin's level as her effective druid level." The base Divine Bond
  // class-feature description in the vendored data truncates before this
  // sentence; confirmed instead via the empyreal-knight archetype's own
  // restatement ("otherwise functions as the paladin ability of the same
  // name"), which quotes it verbatim. The weapon-bond half stays a
  // display-only note (`PaladinBondPicker`), the same restraint the
  // project already gives Divine Bond's numbers.
  z4NJaCcj9VZpBv7d: {
    classTag: "paladin",
    minLevel: 5,
    source: "Divine Bond",
    level: { grants: true, mode: "classLevel", classTag: "paladin", offset: 0 },
    when: (doc) => doc.build.paladinBond === "mount",
  },
  // "The companion's devotion ability increases to a +8 morale bonus on
  // Will saves against enchantment spells and effects." Replaces (not
  // stacks with) the +4 Devotion the companion's own progression table
  // unlocks (`DEVOTION_WILL_MODIFIER`, shared-creature-buffs.ts) via
  // ordinary typed stacking, same "morale" type, highest wins. The
  // scry-on-companion and revive-on-death utility abilities stay out of
  // scope (ritual/live-state action, not a sheet number).
  T8jF1LURViyIo56i: {
    classTag: "natureWarden",
    minLevel: 10,
    source: "Companion Soul",
    changes: [{ target: "will", type: "morale", formula: "8", saveCategories: ["enchantment"] }],
  },
  // Animal Domain: "Your effective druid level for this animal companion is
  // equal to your cleric level – 3." Gated on the Animal domain tag
  // specifically; a druid taking the same domain through Nature Bond uses a
  // different (druid-level) offset, tracked separately and out of scope
  // here.
  "1jMb1iCiNjS5yfwe": {
    classTag: "cleric",
    minLevel: 4,
    source: "Animal Domain",
    level: { grants: true, mode: "classLevel", classTag: "cleric", offset: -3 },
    when: (doc) => (doc.build.clericDomains ?? []).includes("Animal"),
  },
  // "Serpent Companion": "Your effective druid level for this animal
  // companion is equal to your cleric level –2. You may choose either a
  // viper or a constrictor snake." Despite the ability's own name, this is
  // granted by the VENOM subdomain (Scalykind's subdomain) — there is no
  // "Serpent" subdomain in the vendored data; a prior classification note
  // named the wrong subdomain.
  szRzBgTW01Vov922: {
    classTag: "cleric",
    minLevel: 4,
    source: "Serpent Companion",
    level: { grants: true, mode: "classLevel", classTag: "cleric", offset: -2 },
    when: (doc) => (doc.build.clericDomains ?? []).includes("Venom"),
  },
  // Asavir prestige class (Equine Bond): "An asavir gains a horse as a
  // loyal steed. This mount functions as a druid's animal companion, using
  // the asavir's level + 2 as her effective druid level." The vendored
  // stacking clause ("her asavir levels stack with levels from one of
  // these other classes... she does not gain a second companion for having
  // this ability from a different class") matches the standard additive
  // `grantLevels` behavior every other companion source already gets.
  X0tGpISvrvBwb180: {
    classTag: "asavir",
    minLevel: 3,
    source: "Equine Bond",
    level: { grants: true, mode: "classLevel", classTag: "asavir", offset: 2 },
  },
  // Shaitan's Blessing: "her mount receives... a +2 racial bonus on saving
  // throws against all mind-affecting and fear effects. When the asavir
  // reaches 9th level, this bonus increases to +4." Granted at 2nd level,
  // one level before Equine Bond (3rd) creates the mount at all — inert
  // until then, same as every other level-gated master effect that outruns
  // its own companion source.
  "6Ouq3IotfDzfos5z": {
    classTag: "asavir",
    minLevel: 2,
    source: "Shaitan's Blessing",
    changes: [
      {
        target: "will",
        type: "racial",
        formula: "if(gte(@classes.asavir.level, 9), 4, 2)",
        saveCategories: ["mind", "fear"],
      },
    ],
  },
  // Marid's Blessing: "The mount gains a +2 racial bonus on Reflex saves."
  // The no-concentration-check-for-mount-movement clause is a rules
  // exception, not a Change-shaped number, and stays unmodeled.
  UbYjMsQ8DDXRaX84: {
    classTag: "asavir",
    minLevel: 6,
    source: "Marid's Blessing",
    changes: [{ target: "ref", type: "racial", formula: "2" }],
  },
  // Janni's Blessing: "Both the asavir and her mount gain a +1 luck bonus
  // on all saving throws." The asavir's own half is wired via
  // `CLASS_FEATURE_CHANGE_PATCHES` (class-feature-effects.ts); this is the
  // mount's matching copy. The roll-twice-and-choose-better clause stays
  // unmodeled (no reroll mechanic in this engine).
  Got8x5eMbGLgR2lc: {
    classTag: "asavir",
    minLevel: 10,
    source: "Janni's Blessing",
    changes: [{ target: "allSavingThrows", type: "luck", formula: "1" }],
  },
};
