/**
 * Samurai's slice of the pipeline. Every vendored samurai archetype (6
 * archetypes, 26 features) was read in full and bucketed as `numeric` /
 * `situational` / `subsystem` / `blocked`, following the exact methodology
 * the fighter pilot (`fighter.ts`) and the cavalier pass (`cavalier.ts` —
 * samurai's sibling class, whose challenge/order/mount/banner rulings carry
 * over nearly one-for-one) already validated. Per the per-class file
 * convention (`index.ts`'s doc comment), this file owns BOTH of samurai's
 * pipeline artifacts — `SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Samurai-specific mechanical facts this pass relies on ─────────────────
 *
 * 1. **Challenge** (base L1 feature) is per-target and per-use, exactly as
 *    for cavalier (cavalier.ts class note 3): the samurai-level extra damage
 *    only applies against the designated target, and the -2 AC penalty only
 *    against everyone else. No Change models base Challenge anywhere in this
 *    engine, so any archetype rider that adjusts a number inside that
 *    per-target/per-use shape (a penalty waiver, an extra save bonus while a
 *    challenge is active, a damage-application restriction) stays
 *    `situational`.
 * 2. **Resolve** (base L1 feature) carries a real vendored `uses.maxFormula`
 *    (`ceil(@class.unlevel / 2)`) and no `changes`. A feature that changes
 *    the pool's SIZE would be `blocked` (double-count with the vendored
 *    formula — none of the 6 archetypes do); one that only retargets or
 *    substitutes WHAT a resolve use is spent on (Yojimbo's ward retarget,
 *    Ward Speaker's propitiation-for-resolve swap) is `subsystem` — a
 *    spend-option change with no baseline number.
 * 3. **Mount / Banner / Greater Banner** follow the cavalier rulings
 *    wholesale: mount abilities are the mount's numbers, never the
 *    samurai's, and banner is ally-only per the standing ruling
 *    (`class-feature-effects.ts`'s "Deliberately NOT promoted" list). The
 *    vendored Banner (SAM) / Greater Banner (SAM) / Mounted Archer / Weapon
 *    Expertise / Honorable Stand base features all carry zero `changes`, so
 *    every replacement pairing in this slice suppresses nothing numeric.
 * 4. **Iaijutsu Strike** (Sword Saint's replacement kit) is a per-use,
 *    challenge-scoped attack (sheathed-weapon setup, once per foe per day,
 *    dice damage, a temporary AC penalty) — no Change shape at all, so its
 *    upgrade features (Brutal Slash, Terrifying/Roaring Iaijutsu) stay
 *    `situational` regardless of the real numbers they carry.
 * 5. **Named-feat grants** (Two-Weapon Fighting, Improved Unarmed Strike,
 *    Weapon Finesse, Bodyguard, the Spring Attack chain) are `subsystem` —
 *    a fixed feat isn't a `bonusFeats` count.
 *
 * Every `numeric` entry below carries its own reasoning in its
 * classification `note` and in `SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * `provenance`/inline comment. The `situational`/`subsystem` split was done
 * by reading every one of the 26 features individually — samurai's small
 * archetype set leans on challenge riders, resolve spend-options, and
 * named-feat grants, which is why only 2 of 26 features clear the `numeric`
 * bar.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── samurai:brawling-blademaster ──
  "samurai:brawling-blademaster:dual-expertise:3": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Dual Expertise",
    level: 3,
    bucket: "subsystem",
    note: "Two-Weapon Fighting as a named bonus feat plus a Dex-prereq waiver for later bonus-feat picks — named-feat/prereq grants, no Change; replaces weapon expertise (zero vendored changes)",
  },
  "samurai:brawling-blademaster:empty-hand:1": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Empty Hand",
    level: 1,
    bucket: "subsystem",
    note: "Improved Unarmed Strike as a named bonus feat plus monk-level unarmed damage progression — no engine target for unarmed-strike damage dice (same posture as magus Esoteric's Unarmed Strike)",
  },
  "samurai:brawling-blademaster:harmonious-flow:4": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Harmonious Flow",
    level: 4,
    bucket: "situational",
    note: "waives the two-weapon-fighting -2 attack penalty, but only against the challenge target and only with a specific weapon/unarmed-strike pairing — per-attack, challenge-scoped (class note 1)",
  },
  "samurai:brawling-blademaster:nimble:2": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Nimble",
    level: 2,
    bucket: "numeric",
    note: "grants the gunslinger's Nimble class feature at samurai level — a scaling dodge AC bonus while wearing light or no armor, both checkable via @armor.type; unpaired, and samurai has no base AC-bonus feature to double-count",
  },
  "samurai:brawling-blademaster:perfect-clarity:5": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Perfect Clarity",
    level: 5,
    bucket: "situational",
    note: "waives challenge's own -2 AC penalty while challenging — per-use, challenge-scoped (class note 1; base challenge's penalty isn't modeled, so there's also nothing to remove), same shape as cavalier Castellan's Defending Challenge",
  },
  "samurai:brawling-blademaster:superior-focus:14": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Superior Focus",
    level: 14,
    bucket: "situational",
    note: "real +2 save bonus, but only during a challenge — an activated per-use state the static sheet can't check (class note 1); replaces greater banner (zero vendored changes)",
  },
  "samurai:brawling-blademaster:weapon-and-armor-proficiency:1": {
    archetypeId: "samurai:brawling-blademaster",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant (light armor only, no shields), no Change",
  },

  // ── samurai:ironbound-sword ──
  "samurai:ironbound-sword:blade-reversal:14": {
    archetypeId: "samurai:ironbound-sword",
    name: "Blade Reversal",
    level: 14,
    bucket: "situational",
    note: "full-defense counterattack that expends an attack of opportunity, plus a resolve-spent free disarm on nonlethal hits — per-trigger action mechanics and a resolve spend-option (class note 2), no always-on number",
  },
  "samurai:ironbound-sword:merciful-combatant:3": {
    archetypeId: "samurai:ironbound-sword",
    name: "Merciful Combatant",
    level: 3,
    bucket: "situational",
    note: "waives the -4 nonlethal attack penalty (a per-attack choice the sheet can't check) and grants +2 on combat maneuvers conditioned on the last successful attack having been nonlethal — both per-attack-state conditions; the fighter-level-stacking clause is a prereq rule with no Change shape",
  },
  "samurai:ironbound-sword:subduing-knockout:5": {
    archetypeId: "samurai:ironbound-sword",
    name: "Subduing Knockout",
    level: 5,
    bucket: "subsystem",
    note: "1/day (scaling to 3/day) announced save-or-unconscious strike — limited-use activated ability targeting enemies, no number on the ironbound sword's own sheet",
  },

  // ── samurai:sword-saint ──
  "samurai:sword-saint:brutal-slash:3": {
    archetypeId: "samurai:sword-saint",
    name: "Brutal Slash",
    level: 3,
    bucket: "situational",
    note: "real half-level crit-confirmation bonus, but scoped to the iaijutsu strike specifically (class note 4) — and 'critConfirm' isn't an applied target anyway (targets.ts unapplied list)",
  },
  "samurai:sword-saint:iaijutsu-strike:1": {
    archetypeId: "samurai:sword-saint",
    name: "Iaijutsu Strike",
    level: 1,
    bucket: "situational",
    note: "per-use, challenge-scoped full-round attack with scaling bonus dice (+1d6 to +10d6), a sheathed-weapon precondition, a once-per-foe-per-day limit, and a temporary AC penalty — dice damage in a per-use shape, nothing always-on (class note 4)",
  },
  "samurai:sword-saint:roaring-iaijutsu:14": {
    archetypeId: "samurai:sword-saint",
    name: "Roaring Iaijutsu",
    level: 14,
    bucket: "situational",
    note: "save-or-deafened rider on a successful iaijutsu strike — enemy-facing, per-use (class note 4); replaces greater banner (zero vendored changes)",
  },
  "samurai:sword-saint:terrifying-iaijutsu:5": {
    archetypeId: "samurai:sword-saint",
    name: "Terrifying Iaijutsu",
    level: 5,
    bucket: "situational",
    note: "save-or-shaken rider on a successful iaijutsu strike — enemy-facing, per-use (class note 4); replaces banner (zero vendored changes)",
  },

  // ── samurai:ward-speaker ──
  "samurai:ward-speaker:propitiation:1": {
    archetypeId: "samurai:ward-speaker",
    name: "Propitiation",
    level: 1,
    bucket: "subsystem",
    note: "daily-use ritual granting a dismissible fortune (a reroll, or a kami-specific benefit from a choice list) — a limited-use resource plus a pick-list, no always-on number",
  },
  "samurai:ward-speaker:resilient-stand:11": {
    archetypeId: "samurai:ward-speaker",
    name: "Resilient Stand",
    level: 11,
    bucket: "subsystem",
    note: "substitutes a propitiation use for a resolve use on honorable-stand save rerolls — a resource spend-option interop (class note 2), no number",
  },

  // ── samurai:warrior-poet ──
  "samurai:warrior-poet:battle-dance:6": {
    archetypeId: "samurai:warrior-poet",
    name: "Battle Dance",
    level: 6,
    bucket: "subsystem",
    note: "Spring Attack / Improved Spring Attack / Greater Spring Attack as named bonus feats at fixed levels — named-feat grants, not a bonusFeats count (class note 5)",
  },
  "samurai:warrior-poet:dancer-s-grace:1": {
    archetypeId: "samurai:warrior-poet",
    name: "Dancer's Grace",
    level: 1,
    bucket: "numeric",
    note: "Cha bonus to AC (capped at samurai level) while wearing no armor and using no shield — both conditions checkable (@armor.type / @shield.type, the vendored monk AC Bonus gating idiom); the flat-footed/Dex-denied loss clause can't be checked and is dropped (flagged in detail)",
  },
  "samurai:warrior-poet:flourish:1": {
    archetypeId: "samurai:warrior-poet",
    name: "Flourish",
    level: 1,
    bucket: "subsystem",
    note: "a pick-list of player-chosen flourishes (feats, speed, blindsense, uncanny dodge, AoO movement) gained on a fixed schedule — every benefit is contingent on WHICH flourish is picked, and no build field tracks the picks",
  },
  "samurai:warrior-poet:graceful-strike:4": {
    archetypeId: "samurai:warrior-poet",
    name: "Graceful Strike",
    level: 4,
    bucket: "situational",
    note: "real half-level damage bonus, but scoped to melee attacks made in the Weapon Finesse Dex-to-attack/Str-to-damage configuration — a per-attack style condition with no weapon-scoped damage target; replaces mounted archer (zero vendored changes)",
  },
  "samurai:warrior-poet:graceful-warrior:1": {
    archetypeId: "samurai:warrior-poet",
    name: "Graceful Warrior",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse as a named bonus feat plus a treat-as-light-weapon rule for glaives/katanas/naginatas — named-feat grant and a weapon-property rule, no Change (class note 5)",
  },
  "samurai:warrior-poet:skirmisher-s-challenge:1": {
    archetypeId: "samurai:warrior-poet",
    name: "Skirmisher's Challenge",
    level: 1,
    bucket: "situational",
    note: "restricts challenge's level-to-damage to the first successful attack each round — a modification inside challenge's own per-target/per-use shape (class note 1), and base challenge damage isn't modeled anyway",
  },
  "samurai:warrior-poet:weapon-and-armor-proficiency:1": {
    archetypeId: "samurai:warrior-poet",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── samurai:yojimbo ──
  "samurai:yojimbo:armor-expertise:3": {
    archetypeId: "samurai:yojimbo",
    name: "Armor Expertise",
    level: 3,
    bucket: "situational",
    note: "real fighter Armor Training progression, but only while wearing ONE player-selected armor type (chain shirt, scale mail, ...) — no build field tracks which armor was chosen, so a blanket mDexA/acpA bonus would over-apply (same bar as cavalier Disciple of the Pike's chosen-group Weapon Training); replaces weapon expertise (zero vendored changes)",
  },
  "samurai:yojimbo:intercept:4": {
    archetypeId: "samurai:yojimbo",
    name: "Intercept",
    level: 4,
    bucket: "situational",
    note: "Bodyguard as a named bonus feat plus a +1 increase to the aid-another AC bonus — the bonus is scoped to the aid-another action specifically (same shape as cavalier Honor Guard's Intercept)",
  },
  "samurai:yojimbo:resolute-defense:1": {
    archetypeId: "samurai:yojimbo",
    name: "Resolute Defense",
    level: 1,
    bucket: "subsystem",
    note: "retargets resolve / greater resolve / true resolve uses onto a designated ward while adjacent — a resolve spend-option change (class note 2), ally-facing, no self number",
  },
};

/**
 * ── SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for samurai archetype class features
 * (the prose→Change extraction pipeline, samurai slice). Clean-room from
 * the published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 2 of samurai's 26
 * features cleared the `numeric` bar (see
 * `SAMURAI_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — samurai's archetypes lean on challenge riders, resolve
 * spend-options, iaijutsu-strike upgrades, and named-feat grants, all
 * per-use/per-target shapes or unmodeled subsystems (see this file's header
 * doc comment).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's/cavalier.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose or a second source feature, or the bonus is gated on a
 *    real-but-partial condition this engine CAN check (`@armor.type`/
 *    `@shield.type`) while a second, textually-present clause can't be
 *    checked and is dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const SAMURAI_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Brawling Blademaster's "Nimble" grants the gunslinger's Nimble class
  // feature wholesale at samurai level — the same "as the X class feature"
  // pattern Herald Squire's Fleet of Foot established in the cavalier slice.
  // Gunslinger's Nimble is a +1 dodge bonus to AC while wearing light or no
  // armor, +1 for every four levels beyond 2nd (+5 at 18th); the vendored
  // gunslinger class feature carries the identical scaling formula
  // (`1 + floor((@class.unlevel - 2) / 4)`) but omits the printed light/no-
  // armor gate, which this extraction includes (@armor.type is checkable) —
  // that reconstruction from the published condition is why this is "medium"
  // rather than "high". The published "loses Dex bonus, loses this bonus
  // too" clause is already how dodge bonuses behave when Dex-to-AC is lost,
  // so it isn't a separate thing to model (daring-champion precedent), and
  // dodge-type AC auto-flows into CMD (compute.ts).
  "samurai:brawling-blademaster:nimble:2": {
    changes: [c("if(lte(@armor.type, 1), 1 + floor((@class.unlevel - 2) / 4), 0)", "ac", "dodge")],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} dodge AC (light/no armor)`,
    confidence: "medium",
    provenance:
      "At 2nd level, a brawling blademaster gains the gunslinger's nimble class feature, using " +
      "her samurai level as his gunslinger level.",
  },

  // Warrior Poet's "Dancer's Grace" (Martial Arts Handbook) is a Cha-to-AC
  // bonus in the monk AC Bonus shape: capped at samurai level, active only
  // with no armor AND no shield — both gates use the vendored monk AC Bonus
  // feature's own checkable idiom (lt(@armor.type, 1) / lt(@shield.type, 1);
  // no encumbrance clause is printed here, so none is added). "Charisma
  // bonus" is read as positive-only (max 0), the same reading Kensai's
  // Iaijutsu used for its Int-to-initiative bonus. The flat-footed/
  // Dex-denied loss clause can't be checked by the static sheet and is
  // dropped (flagged in detail) — the untyped bonus does not auto-drop with
  // Dex the way a dodge bonus would, hence "medium".
  "samurai:warrior-poet:dancer-s-grace:1": {
    changes: [
      c(
        "if(and(lt(@armor.type, 1), lt(@shield.type, 1)), " +
          "max(0, min(@abilities.cha.mod, @class.unlevel)), 0)",
        "ac",
      ),
    ],
    detail: (level) =>
      `+Cha bonus to AC, max +${level} (no armor/shield; flat-footed loss not modeled)`,
    confidence: "medium",
    provenance:
      "When wearing no armor and not using a shield, the warrior poet gains a bonus to Armor " +
      "Class equal to her Charisma bonus (to a maximum of her samurai level). A warrior poet " +
      "loses this bonus while flatfooted or otherwise denied her Dexterity bonus.",
  },
};
