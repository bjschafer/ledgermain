/**
 * Cavalier + hunter archetype features that modify the tracked mount /
 * companion — one wave shard of `COMPANION_EFFECT_ARCHETYPE_FEATURES` (see
 * `index.ts`). Keys are archetype-feature classification keys; verify every
 * number against the vendored description before wiring.
 */

import type { ArchetypeCompanionEffect } from "./types.js";

export const CAVALIER_HUNTER_COMPANION_EFFECTS: Readonly<Record<string, ArchetypeCompanionEffect>> =
  {
    // "It gains a +2 bonus to Strength, but takes a -2 penalty to Dexterity."
    "cavalier:fell-rider:brute-steed:1": {
      archetypeId: "cavalier:fell-rider",
      minLevel: 1,
      source: "Brute Steed",
      changes: [
        { target: "str", type: "untyped", formula: "2" },
        { target: "dex", type: "untyped", formula: "-2" },
      ],
    },

    // "The base speed of any creature that the hussar is riding increases by
    // 10 feet. This applies to all forms of movement that the mount
    // possesses. At 5th level and every 5 cavalier levels thereafter, this
    // bonus increases by an additional 5 feet (to a maximum increase of 30
    // feet at 20th level)." Only the mount's land speed is wired: every
    // tracked companion species has one, but applying the bonus to
    // fly/swim/climb speed would CREATE those movement modes out of nothing
    // for a mount that doesn't have them (`applySharedSpeeds` adds onto
    // `speeds[mode] ?? 0`).
    "cavalier:hussar:fast-mount:1": {
      archetypeId: "cavalier:hussar",
      minLevel: 1,
      source: "Fast Mount",
      changes: [
        {
          target: "landSpeed",
          type: "base",
          formula: "min(30, 10 + 5 * floor(@classes.cavalier.level / 5))",
        },
      ],
      note: "Fast Mount's speed bonus also applies to the mount's fly, swim, and climb speeds if it has them; only land speed is modeled.",
    },

    // "The speed of a Qadiran horselord's mount increases by 5 feet. Its
    // speed increases by an additional 5 feet at 5th level and every 5
    // cavalier levels thereafter." Same land-speed-only posture as Fast
    // Mount above, for the same reason.
    "cavalier:qadiran-horselord:desert-wind:1": {
      archetypeId: "cavalier:qadiran-horselord",
      minLevel: 1,
      source: "Desert Wind",
      changes: [
        {
          target: "landSpeed",
          type: "base",
          formula: "5 + 5 * floor(@classes.cavalier.level / 5)",
        },
      ],
      note: "Desert Wind's speed bonus also applies to the mount's other movement speeds if it has them; only land speed is modeled.",
    },

    // "At 5th level, a saurian champion's mount gains the devotion ability,
    // and its effects also apply against emotion and fear effects. The
    // mount is immune to the effects of unnatural aura." The base companion
    // progression (`companion.ts`) already grants Devotion (+4 morale Will
    // vs. enchantment) at companion level 6 — this feature both advances
    // that by a level (available at cavalier 5, one level before the
    // standard table) and extends its categories to fear/emotion. Listing
    // "enchantment" here too is redundant with the base progression once it
    // catches up at level 6 (same +4 value, highest-within-type), but fills
    // the level-5-only gap where the table hasn't granted Devotion yet.
    "cavalier:saurian-champion:fierce-devotion:5": {
      archetypeId: "cavalier:saurian-champion",
      minLevel: 5,
      source: "Fierce Devotion",
      changes: [
        {
          target: "will",
          type: "morale",
          formula: "4",
          saveCategories: ["enchantment", "fear", "emotion"],
        },
      ],
      note: "The mount is also immune to unnatural aura; no matching target for that immunity here.",
    },

    // "At 14th level, the bonus on saving throws provided by the mount's
    // devotion ability increases by 2." Type "increase" so it sums on top
    // of Fierce Devotion's +4 morale in the same save categories rather
    // than competing highest-wins against it. The paired "the mount adds
    // half this bonus to other saving throws" clause is genuinely ambiguous
    // (half of the +2 increase, or half of the full +6 devotion bonus,
    // applied to Fortitude/Reflex) and is left unmodeled rather than
    // guessed at.
    "cavalier:saurian-champion:primeval-devotion:14": {
      archetypeId: "cavalier:saurian-champion",
      minLevel: 14,
      source: "Primeval Devotion",
      changes: [
        {
          target: "will",
          type: "increase",
          formula: "2",
          saveCategories: ["enchantment", "fear", "emotion"],
        },
      ],
      note: "Also adds half the devotion bonus to the mount's other saving throws; not modeled (ambiguous wording).",
    },

    // "At 10th level, a saurian champion's mount increases in size by one
    // category... It also gains a +2 size bonus to its Strength and
    // Constitution score. At 12th, 14th, 16th, and 18th levels, the bonus
    // to Strength increases by 2 and the mount's natural armor increases by
    // 1. At 14th and 18th levels, the bonus to Constitution increases by
    // 2." Only the flat ability-score/natural-armor bundle is wired; the
    // size increase itself (attack/AC size penalty, -2 Dex, natural-attack
    // damage die size, reach) has no companion Change target.
    "cavalier:saurian-champion:titanic-mount:10": {
      archetypeId: "cavalier:saurian-champion",
      minLevel: 10,
      source: "Titanic Mount",
      changes: [
        {
          target: "str",
          type: "size",
          formula:
            "2 + if(gte(@classes.cavalier.level, 12), 2, 0) + if(gte(@classes.cavalier.level, 14), 2, 0) + " +
            "if(gte(@classes.cavalier.level, 16), 2, 0) + if(gte(@classes.cavalier.level, 18), 2, 0)",
        },
        {
          target: "con",
          type: "size",
          formula:
            "2 + if(gte(@classes.cavalier.level, 14), 2, 0) + if(gte(@classes.cavalier.level, 18), 2, 0)",
        },
        { target: "dex", type: "untyped", formula: "-2" },
        {
          target: "nac",
          type: "increase",
          formula:
            "if(gte(@classes.cavalier.level, 12), 1, 0) + if(gte(@classes.cavalier.level, 14), 1, 0) + " +
            "if(gte(@classes.cavalier.level, 16), 1, 0) + if(gte(@classes.cavalier.level, 18), 1, 0)",
        },
      ],
      note: "The mount also grows to its next size category (attack/AC size penalty, larger natural-attack damage dice, 10 ft. reach, 15 ft. at 15th); no companion target models a size change.",
    },

    // "A 7th-level totem-bonded's animal companion can grow further. If the
    // animal companion's natural size is Large but it is normally available
    // as a Medium animal companion at 7th level (such as a bear)... Size
    // Large; AC +1 natural armor; Ability Scores Str +4, Dex -2, Con +2.
    // Increase the damage of each of the companion's natural attacks by one
    // die size." Bear is the only tracked companion species whose growth
    // table caps at Medium the way the vendored text describes, so the
    // `when` gate reads the chosen species directly rather than guessing.
    "hunter:totem-bonded:primeval-companion:1": {
      archetypeId: "hunter:totem-bonded",
      minLevel: 7,
      source: "Primeval Companion",
      when: (doc) => doc.build.animalCompanion?.speciesId === "bear",
      changes: [
        { target: "str", type: "size", formula: "4" },
        { target: "dex", type: "untyped", formula: "-2" },
        { target: "con", type: "size", formula: "2" },
        { target: "nac", type: "natural", formula: "1" },
      ],
      note: "Also grows the companion to Large and increases its natural attack damage dice by one size; no companion target for either.",
    },

    // "The treestrider's companion gains a +10-foot enhancement bonus to
    // its climb speed. At 8th level... the enhancement bonus to her
    // companion's climb speed increases to +20 feet." Unconditional and
    // passive from 1st level (unlike the treestrider's own brachiation,
    // which is duration-limited) — the master-side extraction
    // (`hunter.ts`'s `HUNTER_ARCHETYPE_EFFECTS_EXTRACTED`) only covers the
    // treestrider's own climb speed and drops this companion-side number.
    "hunter:treestrider:brachiation:1": {
      archetypeId: "hunter:treestrider",
      minLevel: 1,
      source: "Brachiation",
      changes: [
        {
          target: "climbSpeed",
          type: "enhancement",
          formula: "if(gte(@classes.hunter.level, 8), 20, 10)",
        },
      ],
    },
  };
