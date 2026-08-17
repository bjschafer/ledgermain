/**
 * Cavalier's slice of the pipeline. Every vendored cavalier archetype (37
 * archetypes, 190 features) was read in full and bucketed as `numeric` /
 * `situational` / `subsystem` / `blocked`, following the exact methodology
 * the fighter pilot (`fighter.ts`) and magus pass (`magus.ts`) already
 * validated. Per the per-class file convention (`index.ts`'s doc comment),
 * this file owns BOTH of cavalier's pipeline artifacts —
 * `CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on
 * a different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Cavalier-specific mechanical facts this pass relies on ────────────────
 *
 * 1. **Mount** (base L1 feature) and every archetype's own mount/companion
 *    reflavor (drake, plant, vermin, dinosaur, ghost phantom, ...) are
 *    companion-scoped: nothing about a mount's own stats, attacks, or
 *    abilities is the CAVALIER's number, so these are always `subsystem` or
 *    `situational`, never extracted — the same posture familiars/animal
 *    companions get elsewhere in this engine.
 * 2. **Order** is a modeled pick-list subsystem (`cavalier-orders.ts`),
 *    deliberately display-only per a prior audit (order skills, the
 *    Challenge rider, and the 2nd/8th/15th order abilities are all prose
 *    summaries, `displayOnly: true`, no Change anywhere). Any archetype
 *    feature that swaps, restricts, or modifies an order (or its abilities)
 *    is `subsystem`.
 * 3. **Challenge** (base L1 feature) is per-target and per-use: the
 *    cavalier-level extra damage only applies against the designated
 *    target, and the -2 AC penalty only applies against everyone else. No
 *    Change models base Challenge itself anywhere in this engine, so an
 *    archetype's challenge-rider reflavor (a different extra-damage amount,
 *    an AC-penalty waiver, an ally-facing bonus while challenging, an
 *    enemy-facing debuff) stays `situational` when it carries a real number
 *    in that same per-target/per-use shape, and `subsystem` when it swaps
 *    the mechanism entirely (inquisitor judgments, a challenge-type switch).
 * 4. **Tactician** (and Greater/Master Tactician) carry a real vendored
 *    `uses.maxFormula` resource (`1 + floor(@class.unlevel / 5)`) but no
 *    `changes` — teamwork-feat sharing itself has no Change shape. An
 *    archetype that only changes WHO benefits (hunting pack only) or WHAT
 *    named feats are shared is `subsystem`; one that reschedules the
 *    resource's own daily-use cadence is `blocked` (same double-count-risk
 *    class as Arcane Pool's size — see the known traps list) since there is
 *    no Change target for a resource pool's own use-count.
 * 5. **Banner** / **Greater Banner** are ally-only per the project's
 *    standing ruling (`class-feature-effects.ts`'s "Deliberately NOT
 *    promoted" list) — every archetype's banner reflavor (badge, crest,
 *    hat, standard, mindlink, ...) stays `subsystem` for the same reason,
 *    even when the archetype renames or relocates the banner item itself.
 * 6. **Bonus Feat (CAV)** (6th level, then every 6 levels) DOES carry a real
 *    vendored `bonusFeats` Change (`floor(@class.unlevel / 6)`, confirmed in
 *    `class-features.json`) — unlike magus, cavalier has a live baseline to
 *    double-count against. Any archetype "Bonus feat" reflavor that restates
 *    the identical 6th-level/every-6-levels cadence, or otherwise claims to
 *    replace "the cavalier's normal bonus feats" without a
 *    `pairedBaseFeatureUuid` to suppress the base grant, is `blocked` (the
 *    base's `floor(@class.unlevel / 6)` stays live either way, so a second
 *    formula would double it). A reflavor that grants NAMED feats instead of
 *    a count stays `subsystem` regardless (a fixed feat isn't a `bonusFeats`
 *    number), and a genuinely additive schedule at different levels with no
 *    replacement language is safe to extract.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning in its
 * classification `note` (and, for `numeric`, in `CAVALIER_ARCHETYPE_EFFECTS_
 * EXTRACTED`'s `provenance`/inline comment). The `situational`/`subsystem`
 * split for the bulk was done by reading every one of the 190 features
 * individually — cavalier's kit leans heavily on mount/order/banner/
 * challenge/tactician reflavors, all deliberately unmodeled subsystems in
 * this engine today (see the class notes above), which is why only 8 of 190
 * features clear the `numeric` bar.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── cavalier:beast-rider ──
  "cavalier:beast-rider:exotic-mount:1": {
    archetypeId: "cavalier:beast-rider",
    name: "Exotic Mount",
    level: 1,
    bucket: "subsystem",
    note: "expands the mount pick-list to exotic/larger companions — mount-scoped (class note 1), no Change",
  },
  "cavalier:beast-rider:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:beast-rider",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:castellan ──
  "cavalier:castellan:castle-defender:1": {
    archetypeId: "cavalier:castellan",
    name: "Castle Defender",
    level: 1,
    bucket: "situational",
    note: "real AC/attack/Reflex bonuses, but conditioned on higher ground or cover the engine can't check; evasion/improved evasion at 6th/16th have no matching target either",
  },
  "cavalier:castellan:castle-lore:3": {
    archetypeId: "cavalier:castellan",
    name: "Castle Lore",
    level: 3,
    bucket: "situational",
    note: "real init/skill bonuses, but scoped to urban terrain — a location condition the engine can't check; the surprise-round grant is an absolute effect, not a number",
  },
  "cavalier:castellan:defending-challenge:12": {
    archetypeId: "cavalier:castellan",
    name: "Defending Challenge",
    level: 12,
    bucket: "situational",
    note: "waives challenge's own -2 AC penalty while challenging — per-use, challenge-scoped (class note 3)",
  },
  "cavalier:castellan:guard-companion:4": {
    archetypeId: "cavalier:castellan",
    name: "Guard Companion",
    level: 4,
    bucket: "subsystem",
    note: "animal-companion grant — companion-scoped (class note 1), no Change",
  },
  "cavalier:castellan:mighty-defense:11": {
    archetypeId: "cavalier:castellan",
    name: "Mighty Defense",
    level: 11,
    bucket: "situational",
    note: "readied-action combat-maneuver ability — per-action condition",
  },
  "cavalier:castellan:supreme-defense:20": {
    archetypeId: "cavalier:castellan",
    name: "Supreme Defense",
    level: 20,
    bucket: "situational",
    note: "readied-action double/triple-damage ability — per-action condition",
  },

  // ── cavalier:charger ──
  "cavalier:charger:courser:4": {
    archetypeId: "cavalier:charger",
    name: "Courser",
    level: 4,
    bucket: "numeric",
    note: "flat +10 land speed while no/light/medium armor and not carrying a heavy load — @armor.type/@attributes.encumbrance.level are both checkable (the exact vendored barbarian Fast Movement condition); replaces expert trainer, which carries no vendored changes to suppress",
  },
  "cavalier:charger:natural-mount:1": {
    archetypeId: "cavalier:charger",
    name: "Natural Mount",
    level: 1,
    bucket: "situational",
    note: "feat-equivalence (counts as Mounted Combat for prereqs) plus double lance damage while charging — the double-damage half is real but charge-scoped; replaces mount (the charger has no separate mount)",
  },
  "cavalier:charger:ride-down:11": {
    archetypeId: "cavalier:charger",
    name: "Ride Down",
    level: 11,
    bucket: "situational",
    note: "free overrun-chain ability during a charge — per-charge condition",
  },
  "cavalier:charger:thundering-hooves:3": {
    archetypeId: "cavalier:charger",
    name: "Thundering Hooves",
    level: 3,
    bucket: "situational",
    note: "the charger's own hoof natural attack gains bonus damage and an expanded crit range, plus an extra attack while charging — natural-attack damage/crit-range have no applied target (nattack/ndamage, targets.ts) and the extra attack is charge-scoped anyway",
  },
  "cavalier:charger:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:charger",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant plus a fighter-level-stacking rule for feat prereqs, no Change",
  },

  // ── cavalier:circuit-judge ──
  "cavalier:circuit-judge:circuit:1": {
    archetypeId: "cavalier:circuit-judge",
    name: "Circuit",
    level: 1,
    bucket: "situational",
    note: "real half-level skill bonus, but scoped to a chosen community and its surrounding radius — a location condition the engine can't check",
  },
  "cavalier:circuit-judge:double-jeopardy:12": {
    archetypeId: "cavalier:circuit-judge",
    name: "Double Jeopardy",
    level: 12,
    bucket: "subsystem",
    note: "stacks two inquisitor judgments from sentence — judgments subsystem, not modeled",
  },
  "cavalier:circuit-judge:sentence:1": {
    archetypeId: "cavalier:circuit-judge",
    name: "Sentence",
    level: 1,
    bucket: "subsystem",
    note: "replaces challenge with an inquisitor-judgment grant (destruction/justice/protection/purity/smiting) — judgments are a deferred subsystem, not a Change-shaped number",
  },

  // ── cavalier:constable ──
  "cavalier:constable:apprehend:1": {
    archetypeId: "cavalier:constable",
    name: "Apprehend",
    level: 1,
    bucket: "numeric",
    note: "the +1/2/5-levels Perception bonus is unconditional and extracted; the paired combat-maneuver-check bonus is scoped to disarm/grapple/trip specifically (no per-maneuver CMB target) and is dropped, matching the mixed-feature precedent",
  },
  "cavalier:constable:badge:5": {
    archetypeId: "cavalier:constable",
    name: "Badge",
    level: 5,
    bucket: "subsystem",
    note: "ally-only banner reflavor — banner ruling applies (class note 5), replaces banner",
  },
  "cavalier:constable:greater-badge:14": {
    archetypeId: "cavalier:constable",
    name: "Greater Badge",
    level: 14,
    bucket: "subsystem",
    note: "ally-only temp-HP banner reflavor — banner ruling applies (class note 5), replaces greater banner",
  },
  "cavalier:constable:instant-order:11": {
    archetypeId: "cavalier:constable",
    name: "Instant Order",
    level: 11,
    bucket: "subsystem",
    note: "grants an ally a free action — ally-targeted ability, not a number on the constable's own sheet",
  },
  "cavalier:constable:quick-interrogator:4": {
    archetypeId: "cavalier:constable",
    name: "Quick Interrogator",
    level: 4,
    bucket: "subsystem",
    note: "reduces the time cost of Diplomacy/Intimidate checks — no Change target for check duration",
  },
  "cavalier:constable:squad-commander:3": {
    archetypeId: "cavalier:constable",
    name: "Squad Commander",
    level: 3,
    bucket: "subsystem",
    note: "lets tactician be pre-planned without spending a daily use — resource-mechanic change, not a number",
  },

  // ── cavalier:courtly-knight ──
  "cavalier:courtly-knight:grand-boast:17": {
    archetypeId: "cavalier:courtly-knight",
    name: "Grand Boast",
    level: 17,
    bucket: "situational",
    note: "conditional challenge variant (full-health, unafflicted target; retroactive benefit only if the target is defeated within a minute) — per-use, challenge-scoped (class note 3)",
  },
  "cavalier:courtly-knight:imperious-attitude:9": {
    archetypeId: "cavalier:courtly-knight",
    name: "Imperious Attitude",
    level: 9,
    bucket: "situational",
    note: "+5 Diplomacy bonus, but conditioned on a prior successful Intimidate check against the same target — a specific-action condition the engine can't check",
  },
  "cavalier:courtly-knight:social-presence:1": {
    archetypeId: "cavalier:courtly-knight",
    name: "Social Presence",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/4-levels bonus on Bluff/Diplomacy/Intimidate/Sense Motive, capped at +6 — the verbal-duel presence-tactic edge it also grants has no Change shape and is dropped",
  },

  // ── cavalier:daring-champion ──
  "cavalier:daring-champion:advanced-deeds:11": {
    archetypeId: "cavalier:daring-champion",
    name: "Advanced Deeds",
    level: 11,
    bucket: "subsystem",
    note: "grants swashbuckler deeds — deeds subsystem, no Change",
  },
  "cavalier:daring-champion:champion-s-finesse:1": {
    archetypeId: "cavalier:daring-champion",
    name: "Champion's Finesse",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse feat-equivalence plus a Cha-for-Int prereq swap — feat-equivalence grant, no Change",
  },
  "cavalier:daring-champion:champion-s-weapon-mastery:20": {
    archetypeId: "cavalier:daring-champion",
    name: "Champion's Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit plus a crit-multiplier increase — no engine target for crit auto-confirm or multiplier (same pattern as magus Kensai's Weapon Mastery)",
  },
  "cavalier:daring-champion:nimble:3": {
    archetypeId: "cavalier:daring-champion",
    name: "Nimble",
    level: 3,
    bucket: "numeric",
    note: "scaling dodge AC bonus while light/no armor and no more than a light load — @armor.type/@attributes.encumbrance.level are both checkable",
  },
  "cavalier:daring-champion:panache-and-deeds:4": {
    archetypeId: "cavalier:daring-champion",
    name: "Panache and Deeds",
    level: 4,
    bucket: "subsystem",
    note: "grants the swashbuckler panache pool plus deeds — resource/deeds subsystem",
  },
  "cavalier:daring-champion:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:daring-champion",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:daring-general ──
  "cavalier:daring-general:aides-de-camp:6": {
    archetypeId: "cavalier:daring-general",
    name: "Aides-de-Camp",
    level: 6,
    bucket: "subsystem",
    note: "a modified Leadership feat plus mass-combat army rules — followers/cohorts subsystem, no Change",
  },
  "cavalier:daring-general:shared-challenge:12": {
    archetypeId: "cavalier:daring-general",
    name: "Shared Challenge",
    level: 12,
    bucket: "situational",
    note: "extends challenge's attack bonus to followers/cohorts — per-use, challenge-scoped (class note 3), and ally-facing",
  },
  "cavalier:daring-general:supreme-tactician:20": {
    archetypeId: "cavalier:daring-general",
    name: "Supreme Tactician",
    level: 20,
    bucket: "subsystem",
    note: "expands tactician's feat grant and waives its daily-use cost in combat — resource/mechanic change, no number",
  },

  // ── cavalier:disciple-of-the-pike ──
  "cavalier:disciple-of-the-pike:agile-charger:11": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Agile Charger",
    level: 11,
    bucket: "situational",
    note: "ignores difficult terrain while charging — per-charge condition",
  },
  "cavalier:disciple-of-the-pike:bigger-they-are:1": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Bigger They Are",
    level: 1,
    bucket: "situational",
    note: "real scaling dodge AC bonus, but scoped to the size of the opponent — a property of the enemy the static sheet can't check",
  },
  "cavalier:disciple-of-the-pike:deadly-charge:20": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Deadly Charge",
    level: 20,
    bucket: "situational",
    note: "double-damage-on-charge with a polearm/spear plus a crit stun rider — per-charge, per-weapon condition",
  },
  "cavalier:disciple-of-the-pike:monster-hunter:4": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Monster Hunter",
    level: 4,
    bucket: "situational",
    note: "half-level Knowledge bonus scoped to identifying monsters specifically — a narrow use-case, not a general Knowledge-check bonus (same posture as the hand-verified table's Shifter's Aspect entries)",
  },
  "cavalier:disciple-of-the-pike:pike-charge:3": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Pike Charge",
    level: 3,
    bucket: "situational",
    note: "+4 (instead of +2) charge attack bonus and no post-charge AC penalty, but scoped to polearms/spears while charging",
  },
  "cavalier:disciple-of-the-pike:weapon-training:5": {
    archetypeId: "cavalier:disciple-of-the-pike",
    name: "Weapon Training",
    level: 5,
    bucket: "numeric",
    note: "polearms-or-spears weapon group is wired via the archetypeFeature PickChoice mechanism, mirroring fighter's own Weapon Training target idiom (attack.weapon.<group>/damage.weapon.<group>)",
  },

  // ── cavalier:drakerider ──
  "cavalier:drakerider:approved-order:1": {
    archetypeId: "cavalier:drakerider",
    name: "Approved Order",
    level: 1,
    bucket: "subsystem",
    note: "restricts eligible orders to ones the mount approves of — orders are a display-only pick-list (class note 2), no Change",
  },
  "cavalier:drakerider:cavalier-s-charge:9": {
    archetypeId: "cavalier:drakerider",
    name: "Cavalier's charge",
    level: 9,
    bucket: "situational",
    note: "delayed grant of the base +4-charge-attack/no-AC-penalty ability — per-charge, mounted condition; the vendored description text still says \"At 3rd level\" despite this id's own level being 9 (drake-mount's own text confirms the delay to 9th), an internally inconsistent copy-paste this pass records rather than guesses around",
  },
  "cavalier:drakerider:drake-mount:1": {
    archetypeId: "cavalier:drakerider",
    name: "Drake Mount",
    level: 1,
    bucket: "subsystem",
    note: "grants a drake companion instead of a mount, and delays cavalier's charge to 9th — mount-scoped (class note 1), no Change",
  },

  // ── cavalier:emissary ──
  "cavalier:emissary:battlefield-agility:5": {
    archetypeId: "cavalier:emissary",
    name: "Battlefield Agility",
    level: 5,
    bucket: "subsystem",
    note: "Mobility as a named bonus feat for both emissary and mount — a specific feat grant isn't a bonusFeats count; replaces banner (class note 5)",
  },
  "cavalier:emissary:bonus-feat:6": {
    archetypeId: "cavalier:emissary",
    name: "Bonus feat",
    level: 6,
    bucket: "blocked",
    note: "restates the identical 6th-level/every-6-levels cadence as the base Bonus Feat (CAV), just widening the eligible feat list — unpaired (no pairedBaseFeatureUuid), so the base's own floor(@class.unlevel/6) bonusFeats Change stays live; extracting a duplicate would double the count (class note 6)",
  },
  "cavalier:emissary:erratic-charge:20": {
    archetypeId: "cavalier:emissary",
    name: "Erratic Charge",
    level: 20,
    bucket: "situational",
    note: "modifies the charge action itself (a pre-move, non-charge attack) — per-charge condition",
  },
  "cavalier:emissary:in-or-out-of-the-saddle:1": {
    archetypeId: "cavalier:emissary",
    name: "In or Out of the Saddle",
    level: 1,
    bucket: "subsystem",
    note: "Mounted Combat named feat plus full speed in medium armor — the armor-speed-penalty removal has no Change shape (same posture as vigilante-talents.ts's Armor Skin, display-only); replaces tactician",
  },
  "cavalier:emissary:mounted-acrobatics:9": {
    archetypeId: "cavalier:emissary",
    name: "Mounted Acrobatics",
    level: 9,
    bucket: "subsystem",
    note: "Trick Riding named bonus feat, usable in medium armor — named-feat grant, replaces greater tactician",
  },
  "cavalier:emissary:mounted-dervish:14": {
    archetypeId: "cavalier:emissary",
    name: "Mounted Dervish",
    level: 14,
    bucket: "subsystem",
    note: "Mounted Skirmisher named bonus feat plus a mount-speed bonus while charging — named feat/mount-scoped (class note 1), replaces greater banner",
  },

  // ── cavalier:esquire ──
  "cavalier:esquire:aide-de-camp:3": {
    archetypeId: "cavalier:esquire",
    name: "Aide-De-Camp",
    level: 3,
    bucket: "subsystem",
    note: "grants a cohort-like NPC ally — cohort subsystem, no Change; replaces mount",
  },
  "cavalier:esquire:avenge-me:11": {
    archetypeId: "cavalier:esquire",
    name: "Avenge Me",
    level: 11,
    bucket: "subsystem",
    note: "transfers challenge/order benefits to the aide-de-camp when the esquire is incapacitated — ally-targeted contingency, no self number",
  },
  "cavalier:esquire:banner:5": {
    archetypeId: "cavalier:esquire",
    name: "Banner",
    level: 5,
    bucket: "subsystem",
    note: "banner reflavor (the aide-de-camp can carry it, doubling its bonuses) — banner ruling applies (class note 5)",
  },
  "cavalier:esquire:fight-as-one:20": {
    archetypeId: "cavalier:esquire",
    name: "Fight As One",
    level: 20,
    bucket: "subsystem",
    note: "expands shared-challenge to full benefit plus a joint-crit stun rider — ally-targeted, resource/mechanic change",
  },
  "cavalier:esquire:shared-challenge:4": {
    archetypeId: "cavalier:esquire",
    name: "Shared Challenge",
    level: 4,
    bucket: "situational",
    note: "grants the aide-de-camp half of challenge's bonuses — per-use, challenge-scoped (class note 3), ally-facing",
  },
  "cavalier:esquire:teamwork:3": {
    archetypeId: "cavalier:esquire",
    name: "Teamwork",
    level: 3,
    bucket: "subsystem",
    note: "shares teamwork feats with the aide-de-camp — teamwork-feat subsystem, no Change",
  },

  // ── cavalier:fell-rider ──
  "cavalier:fell-rider:brute-steed:1": {
    archetypeId: "cavalier:fell-rider",
    name: "Brute Steed",
    level: 1,
    bucket: "subsystem",
    note: "mount +2 Str / -2 Dex — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked mount's own stat block",
  },
  "cavalier:fell-rider:deadly-rampage:11": {
    archetypeId: "cavalier:fell-rider",
    name: "Deadly Rampage",
    level: 11,
    bucket: "situational",
    note: "free melee attack on a successful mounted overrun — per-maneuver condition",
  },
  "cavalier:fell-rider:dread-rider:4": {
    archetypeId: "cavalier:fell-rider",
    name: "Dread Rider",
    level: 4,
    bucket: "situational",
    note: "half-level Intimidate bonus and a free demoralize check, but conditioned on being mounted (no @mounted rollData input) and on a preceding trample/charge",
  },
  "cavalier:fell-rider:fell-presence:5": {
    archetypeId: "cavalier:fell-rider",
    name: "Fell Presence",
    level: 5,
    bucket: "situational",
    note: "imposes a fear-save PENALTY on nearby enemies (not a bonus to the fell rider) while mounted — enemy-facing and mount-state-conditioned, replaces banner",
  },
  "cavalier:fell-rider:rampage:3": {
    archetypeId: "cavalier:fell-rider",
    name: "Rampage",
    level: 3,
    bucket: "situational",
    note: "Trample named feat, a mounted-overrun attack bonus, and a mount damage bonus — maneuver/mount-scoped mix",
  },
  "cavalier:fell-rider:terror:14": {
    archetypeId: "cavalier:fell-rider",
    name: "Terror",
    level: 14,
    bucket: "subsystem",
    note: "activated fear-effect ability targeting enemies — not a bonus to the fell rider's own sheet",
  },
  "cavalier:fell-rider:unstoppable-rampage:20": {
    archetypeId: "cavalier:fell-rider",
    name: "Unstoppable Rampage",
    level: 20,
    bucket: "situational",
    note: "multi-target overrun with escalating penalties/bonuses — per-maneuver condition",
  },

  // ── cavalier:first-mother-s-fang ──
  "cavalier:first-mother-s-fang:honored-warrior-bonus-feat:2": {
    archetypeId: "cavalier:first-mother-s-fang",
    name: "Honored Warrior Bonus Feat",
    level: 2,
    bucket: "blocked",
    note: "carries the exact same merged description text as honored-warrior:1 below (both ids bundle the Combat-Expertise grant AND the 2nd/8th/15th vigilante-talent/bonus-feat track) — a vendored duplication that makes it unclear which id the countable bonus-feat schedule belongs to; extracting from either risks double-counting the other, so recorded rather than guessed",
  },
  "cavalier:first-mother-s-fang:honored-warrior:1": {
    archetypeId: "cavalier:first-mother-s-fang",
    name: "Honored Warrior",
    level: 1,
    bucket: "subsystem",
    note: "grants Combat Expertise as a named bonus feat (with an Int-13 prereq override) plus a vigilante social-talent/bonus-feat track — named-feat/talent grants, not a bonusFeats count; see honored-warrior-bonus-feat:2's note on the shared-text duplication",
  },
  "cavalier:first-mother-s-fang:serpent-mount:2": {
    archetypeId: "cavalier:first-mother-s-fang",
    name: "Serpent Mount",
    level: 2,
    bucket: "subsystem",
    note: "swaps the mount for a giant riding constrictor stat block — mount-scoped (class note 1), no Change",
  },
  "cavalier:first-mother-s-fang:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:first-mother-s-fang",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:gallant ──
  "cavalier:gallant:code-of-gallantry:1": {
    archetypeId: "cavalier:gallant",
    name: "Code of Gallantry",
    level: 1,
    bucket: "subsystem",
    note: "restricts eligible orders and alignment — order/alignment restriction, no Change",
  },
  "cavalier:gallant:symbol-of-inspiration:5": {
    archetypeId: "cavalier:gallant",
    name: "Symbol of Inspiration",
    level: 5,
    bucket: "subsystem",
    note: "ally-only banner-shaped bonus tied to a displayed crest — banner ruling applies (class note 5)",
  },
  "cavalier:gallant:symbol-of-resilience:14": {
    archetypeId: "cavalier:gallant",
    name: "Symbol of Resilience",
    level: 14,
    bucket: "subsystem",
    note: "ally-only DR grant, once/day per ally — banner-shaped ally aura, not the gallant's own number",
  },

  // ── cavalier:gendarme ──
  "cavalier:gendarme:bonus-feat:1": {
    archetypeId: "cavalier:gendarme",
    name: "Bonus Feat",
    level: 1,
    bucket: "blocked",
    note: "a new 1st/5th/every-3-levels bonus-feat schedule that explicitly replaces tactician, greater tactician, master tactician, AND the standard cavalier's bonus feats — but carries no pairedBaseFeatureUuid, so the base Bonus Feat (CAV)'s own floor(@class.unlevel/6) Change isn't suppressed; extracting a second schedule would double-count (class note 6)",
  },
  "cavalier:gendarme:transfixing-charge:20": {
    archetypeId: "cavalier:gendarme",
    name: "Transfixing Charge",
    level: 20,
    bucket: "situational",
    note: "triple/quadruple mounted charge damage plus a max-damage crit rider — per-charge condition",
  },

  // ── cavalier:ghost-rider ──
  "cavalier:ghost-rider:fearless:3": {
    archetypeId: "cavalier:ghost-rider",
    name: "Fearless",
    level: 3,
    bucket: "numeric",
    note: "unconditional immunity to fear while conscious — the ally +4 fear-save aura is dropped (ally-facing, banner-shaped)",
  },
  "cavalier:ghost-rider:frightful-gaze:1": {
    archetypeId: "cavalier:ghost-rider",
    name: "Frightful Gaze",
    level: 1,
    bucket: "subsystem",
    note: "limited-use activated gaze attack targeting enemies — not a bonus to the ghost rider's own sheet",
  },
  "cavalier:ghost-rider:ghost-mount:1": {
    archetypeId: "cavalier:ghost-rider",
    name: "Ghost Mount",
    level: 1,
    bucket: "subsystem",
    note: "phantom-companion mount reflavor — mount-scoped (class note 1), no Change",
  },
  "cavalier:ghost-rider:ghost-wind:11": {
    archetypeId: "cavalier:ghost-rider",
    name: "Ghost Wind",
    level: 11,
    bucket: "subsystem",
    note: "grants the ghost mount at-will air walk/flight — mount-scoped (class note 1)",
  },
  "cavalier:ghost-rider:spirited-mount:5": {
    archetypeId: "cavalier:ghost-rider",
    name: "Spirited Mount",
    level: 5,
    bucket: "subsystem",
    note: "mount terrain/water-walk abilities — mount-scoped (class note 1)",
  },

  // ── cavalier:green-knight ──
  "cavalier:green-knight:beast-tongue:1": {
    archetypeId: "cavalier:green-knight",
    name: "Beast Tongue",
    level: 1,
    bucket: "subsystem",
    note: "wild-empathy analog for animal Diplomacy checks — narrow-use-case ability, no general Change",
  },
  "cavalier:green-knight:ferocious:3": {
    archetypeId: "cavalier:green-knight",
    name: "Ferocious",
    level: 3,
    bucket: "subsystem",
    note: "removes the standard staggered/hp-loss penalties for acting below 0 hp — condition-rule removal, no matching target",
  },
  "cavalier:green-knight:implacable-knight:1": {
    archetypeId: "cavalier:green-knight",
    name: "Implacable Knight",
    level: 1,
    bucket: "subsystem",
    note: "Endurance and Diehard as named bonus feats",
  },
  "cavalier:green-knight:indestructible:20": {
    archetypeId: "cavalier:green-knight",
    name: "Indestructible",
    level: 20,
    bucket: "numeric",
    note: "+6 Constitution score and immunity to death effects are both unconditional and extracted; the broader 'immune to effects that would kill without reducing to 0 hp' clause and the decapitation/reattachment rule have no matching target and are dropped",
  },
  "cavalier:green-knight:nature-s-servant:1": {
    archetypeId: "cavalier:green-knight",
    name: "Nature's Servant",
    level: 1,
    bucket: "subsystem",
    note: "forces selection of the order of the Green — order restriction, no Change",
  },
  "cavalier:green-knight:oaken-vitality:11": {
    archetypeId: "cavalier:green-knight",
    name: "Oaken Vitality",
    level: 11,
    bucket: "numeric",
    note: "unconditional immunity to disease and poison, extracted via immEffect.disease/immEffect.poison; the accompanying infestation immunity has no matching target and is dropped",
  },
  "cavalier:green-knight:stalwart:9": {
    archetypeId: "cavalier:green-knight",
    name: "Stalwart",
    level: 9,
    bucket: "subsystem",
    note: "upgrades a successful partial-effect Fort/Will save to a full negate — evasion-for-saves, no matching target",
  },
  "cavalier:green-knight:take-their-heads:17": {
    archetypeId: "cavalier:green-knight",
    name: "Take Their Heads",
    level: 17,
    bucket: "subsystem",
    note: "grants the vorpal weapon special ability to any slashing weapon wielded — an item-ability grant, not a character Change",
  },
  "cavalier:green-knight:woodland-stride:4": {
    archetypeId: "cavalier:green-knight",
    name: "Woodland Stride",
    level: 4,
    bucket: "subsystem",
    note: "terrain-movement rule, no matching target",
  },

  // ── cavalier:herald-squire ──
  "cavalier:herald-squire:fleet-of-foot:2": {
    archetypeId: "cavalier:herald-squire",
    name: "Fleet of Foot",
    level: 2,
    bucket: "numeric",
    note: "grants the barbarian's Fast Movement wholesale (its own vendored @armor.type/@attributes.encumbrance.level-gated +10 land speed formula) — a clean, checkable reflavor; the overland-journey-distance clause has no matching target and is dropped",
  },
  "cavalier:herald-squire:introduction:1": {
    archetypeId: "cavalier:herald-squire",
    name: "Introduction",
    level: 1,
    bucket: "subsystem",
    note: "roll-twice Diplomacy reroll ability — no Change target for a reroll; replaces tactician",
  },
  "cavalier:herald-squire:transcend-language:3": {
    archetypeId: "cavalier:herald-squire",
    name: "Transcend Language",
    level: 3,
    bucket: "subsystem",
    note: "tongues 3/day, wired via the spell-like-abilities route; replaces cavalier's charge",
  },

  // ── cavalier:honor-guard ──
  "cavalier:honor-guard:defensive-challenge:12": {
    archetypeId: "cavalier:honor-guard",
    name: "Defensive Challenge",
    level: 12,
    bucket: "situational",
    note: "imposes an attack-roll penalty on the challenge target for attacking anyone but the honor guard — enemy-facing, per-use, challenge-scoped (class note 3)",
  },
  "cavalier:honor-guard:intercept:3": {
    archetypeId: "cavalier:honor-guard",
    name: "Intercept",
    level: 3,
    bucket: "situational",
    note: "Bodyguard named feat plus a +1 aid-another AC bonus increase — the bonus is scoped to the aid-another action specifically",
  },
  "cavalier:honor-guard:sworn-defense:1": {
    archetypeId: "cavalier:honor-guard",
    name: "Sworn Defense",
    level: 1,
    bucket: "situational",
    note: "self -1 AC / ward +1 dodge AC while adjacent — modifies challenge (class note 3), gated on designating a ward and staying adjacent",
  },
  "cavalier:honor-guard:warding-charge:11": {
    archetypeId: "cavalier:honor-guard",
    name: "Warding Charge",
    level: 11,
    bucket: "situational",
    note: "immediate-action move-and-attack triggered by an attack on the ward — per-trigger condition",
  },

  // ── cavalier:hooded-knight ──
  "cavalier:hooded-knight:champion-of-the-roads:9": {
    archetypeId: "cavalier:hooded-knight",
    name: "Champion of the Roads",
    level: 9,
    bucket: "subsystem",
    note: "dimension door (scaling 1-3/day), wired via the spell-like-abilities route",
  },
  "cavalier:hooded-knight:feytouched-mount:1": {
    archetypeId: "cavalier:hooded-knight",
    name: "Feytouched Mount",
    level: 1,
    bucket: "subsystem",
    note: "applies the feytouched template to the mount while ridden — mount-scoped (class note 1)",
  },
  "cavalier:hooded-knight:paragon-of-the-roads:17": {
    archetypeId: "cavalier:hooded-knight",
    name: "Paragon of the Roads",
    level: 17,
    bucket: "subsystem",
    note: "upgrades champion of the roads to greater teleport — resource mechanic, no Change",
  },

  // ── cavalier:huntmaster ──
  "cavalier:huntmaster:animal-trainer:4": {
    archetypeId: "cavalier:huntmaster",
    name: "Animal Trainer",
    level: 4,
    bucket: "subsystem",
    note: "retargets expert trainer to birds/dogs instead of mounts — companion-scoped (class note 1), no Change",
  },
  "cavalier:huntmaster:bestial-challenge:1": {
    archetypeId: "cavalier:huntmaster",
    name: "Bestial Challenge",
    level: 1,
    bucket: "situational",
    note: "extends challenge's damage bonus to the hunting pack — per-use, challenge-scoped (class note 3), companion-inclusive",
  },
  "cavalier:huntmaster:bonus-feat:6": {
    archetypeId: "cavalier:huntmaster",
    name: "Bonus feat",
    level: 6,
    bucket: "subsystem",
    note: "grants named feats (Step Up, then Following Step, then Step Up and Strike) to the huntmaster and hunting pack at fixed levels — named-feat grants, not a bonusFeats count (class note 6)",
  },
  "cavalier:huntmaster:hunting-pack:1": {
    archetypeId: "cavalier:huntmaster",
    name: "Hunting Pack",
    level: 1,
    bucket: "subsystem",
    note: "animal-companion grant (possibly multiple) — companion-scoped (class note 1), replaces mount",
  },
  "cavalier:huntmaster:improved-quarry:20": {
    archetypeId: "cavalier:huntmaster",
    name: "Improved Quarry",
    level: 20,
    bucket: "situational",
    note: "grants the ranger's Improved Quarry ability, extended to the hunting pack — a designated-target-scoped bonus, same shape as challenge",
  },
  "cavalier:huntmaster:pack-attack:11": {
    archetypeId: "cavalier:huntmaster",
    name: "Pack Attack",
    level: 11,
    bucket: "situational",
    note: "grants flanking-as-if-adjacent with the hunting pack — a positioning condition the engine can't check",
  },
  "cavalier:huntmaster:quarry:14": {
    archetypeId: "cavalier:huntmaster",
    name: "Quarry",
    level: 14,
    bucket: "situational",
    note: "grants the ranger's Quarry ability, extended to the hunting pack — a designated-target-scoped bonus, same shape as challenge",
  },
  "cavalier:huntmaster:swift-tracker:5": {
    archetypeId: "cavalier:huntmaster",
    name: "Swift Tracker",
    level: 5,
    bucket: "subsystem",
    note: "removes the Survival tracking-speed penalty — a narrow use-case, not a general skill bonus",
  },
  "cavalier:huntmaster:tactician:1": {
    archetypeId: "cavalier:huntmaster",
    name: "Tactician",
    level: 1,
    bucket: "subsystem",
    note: "restricts tactician's beneficiaries to the hunting pack only — changes WHO benefits, not the resource formula itself (class note 4)",
  },
  "cavalier:huntmaster:takedown:3": {
    archetypeId: "cavalier:huntmaster",
    name: "Takedown",
    level: 3,
    bucket: "situational",
    note: "free combat-maneuver trigger after a companion's successful melee attack — per-attack condition",
  },
  "cavalier:huntmaster:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:huntmaster",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant (and a heavy-armor exclusion), no Change",
  },

  // ── cavalier:hussar ──
  "cavalier:hussar:agile-warrior:1": {
    archetypeId: "cavalier:hussar",
    name: "Agile Warrior",
    level: 1,
    bucket: "subsystem",
    note: "grants class skills — not a Change-shaped bonus in this pipeline's target vocabulary",
  },
  "cavalier:hussar:fast-mount:1": {
    archetypeId: "cavalier:hussar",
    name: "Fast Mount",
    level: 1,
    bucket: "subsystem",
    note: "increases the MOUNT's speed, not the hussar's own — mount-scoped (class note 1), never extracted",
  },
  "cavalier:hussar:maneuverable-mount:9": {
    archetypeId: "cavalier:hussar",
    name: "Maneuverable Mount",
    level: 9,
    bucket: "subsystem",
    note: "lets the mount squeeze through tight spaces — mount-scoped (class note 1)",
  },
  "cavalier:hussar:skillful-rider:6": {
    archetypeId: "cavalier:hussar",
    name: "Skillful Rider",
    level: 6,
    bucket: "situational",
    note: "real scaling bonus, but scoped to the chase subsystem (\"to overcome obstacles as part of a chase\"), which this engine doesn't model at all (same posture as vigilante-talents.ts's Chase Master)",
  },
  "cavalier:hussar:sudden-swerve:17": {
    archetypeId: "cavalier:hussar",
    name: "Sudden Swerve",
    level: 17,
    bucket: "situational",
    note: "lets a mounted charge/run turn up to 90 degrees mid-movement — per-movement condition",
  },
  "cavalier:hussar:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:hussar",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency restriction, no Change",
  },

  // ── cavalier:knight-of-arnisant ──
  "cavalier:knight-of-arnisant:defensive-challenge:12": {
    archetypeId: "cavalier:knight-of-arnisant",
    name: "Defensive Challenge",
    level: 12,
    bucket: "situational",
    note: "imposes an attack-roll penalty on the challenge target for attacking anyone else — enemy-facing, per-use, challenge-scoped (class note 3)",
  },
  "cavalier:knight-of-arnisant:deflective-shield:1": {
    archetypeId: "cavalier:knight-of-arnisant",
    name: "Deflective Shield",
    level: 1,
    bucket: "situational",
    note: "real touch AC/CMD bonus equal to the wielded shield's AC bonus (capped by level), but that bonus is a dynamic property of a specific item with no rollData input, same posture as Staff Magus's Quarterstaff Defense",
  },
  "cavalier:knight-of-arnisant:heart-shield:17": {
    archetypeId: "cavalier:knight-of-arnisant",
    name: "Heart Shield",
    level: 17,
    bucket: "situational",
    note: "same shield-AC-bonus-dependent save bonus as deflective-shield, scoped to death effects/spells specifically",
  },
  "cavalier:knight-of-arnisant:heraldic-banner:5": {
    archetypeId: "cavalier:knight-of-arnisant",
    name: "Heraldic Banner",
    level: 5,
    bucket: "subsystem",
    note: "shield-as-banner reflavor — banner ruling applies (class note 5)",
  },
  "cavalier:knight-of-arnisant:soul-shield:9": {
    archetypeId: "cavalier:knight-of-arnisant",
    name: "Soul Shield",
    level: 9,
    bucket: "situational",
    note: "same shield-AC-bonus-dependent save bonus as deflective-shield, scoped to curse spells/effects specifically",
  },

  // ── cavalier:luring-cavalier ──
  "cavalier:luring-cavalier:careful-aim:3": {
    archetypeId: "cavalier:luring-cavalier",
    name: "Careful Aim",
    level: 3,
    bucket: "situational",
    note: "ignores range-increment penalties out to 3 increments — no engine target for ranged range-increment penalties (attack rolls don't model range at all)",
  },
  "cavalier:luring-cavalier:far-challenge:1": {
    archetypeId: "cavalier:luring-cavalier",
    name: "Far Challenge",
    level: 1,
    bucket: "situational",
    note: "replaces challenge with a ranged-attack version of the identical per-target extra-damage shape (class note 3); the +4 attack-roll penalty it imposes is enemy-facing",
  },
  "cavalier:luring-cavalier:infuriating-aim:11": {
    archetypeId: "cavalier:luring-cavalier",
    name: "Infuriating Aim",
    level: 11,
    bucket: "situational",
    note: "forces a mind-affecting compulsion on a confirmed crit against the far-challenge target — enemy-facing, per-crit condition",
  },
  "cavalier:luring-cavalier:supreme-aim:20": {
    archetypeId: "cavalier:luring-cavalier",
    name: "Supreme Aim",
    level: 20,
    bucket: "situational",
    note: "extends careful aim/infuriating aim to all ranged attacks — same per-attack scoping as its component abilities",
  },
  "cavalier:luring-cavalier:versatile-challenge:12": {
    archetypeId: "cavalier:luring-cavalier",
    name: "Versatile Challenge",
    level: 12,
    bucket: "subsystem",
    note: "lets the challenge type be switched mid-use — a mechanism swap, not a new number",
  },

  // ── cavalier:musketeer ──
  "cavalier:musketeer:deeds:3": {
    archetypeId: "cavalier:musketeer",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps in the Quick Clear gunslinger deed — deeds subsystem, no Change",
  },
  "cavalier:musketeer:gifted-firearm:1": {
    archetypeId: "cavalier:musketeer",
    name: "Gifted Firearm",
    level: 1,
    bucket: "subsystem",
    note: "grants a signature firearm plus Gunsmithing and a suite of limited-use activated bonuses (Improved Critical, reduced misfire, doubled range, a bonus attack) — item grant plus resource-gated abilities, no always-on number",
  },
  "cavalier:musketeer:musketeer-instruction:1": {
    archetypeId: "cavalier:musketeer",
    name: "Musketeer Instruction",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse feat-equivalence (rapier) plus named bonus feats (Rapid Reload, Gunsmithing) — feat-equivalence/named-feat grants, no Change",
  },
  "cavalier:musketeer:swift-powder:4": {
    archetypeId: "cavalier:musketeer",
    name: "Swift Powder",
    level: 4,
    bucket: "subsystem",
    note: "Rapid Reload named bonus feat plus a free-action reload tied to challenge — named feat/resource mechanic",
  },
  "cavalier:musketeer:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:musketeer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant plus a fighter-level-stacking rule for feat prereqs, no Change",
  },
  "cavalier:musketeer:weapon-proficiency:1": {
    archetypeId: "cavalier:musketeer",
    name: "Weapon Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:oceanrider ──
  "cavalier:oceanrider:mount:1": {
    archetypeId: "cavalier:oceanrider",
    name: "Mount",
    level: 1,
    bucket: "subsystem",
    note: "restricts the mount pick-list to aquatic mounts — mount-scoped (class note 1), no Change",
  },
  "cavalier:oceanrider:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:oceanrider",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:qabarat-outrider ──
  "cavalier:qabarat-outrider:maneuver-tactics-greater-overrun:9": {
    archetypeId: "cavalier:qabarat-outrider",
    name: "Maneuver Tactics (Greater Overrun)",
    level: 9,
    bucket: "subsystem",
    note: "named combat-maneuver bonus feat, shareable via maneuver tactics — named-feat grant, no Change",
  },
  "cavalier:qabarat-outrider:maneuver-tactics-improved-feint:1": {
    archetypeId: "cavalier:qabarat-outrider",
    name: "Maneuver Tactics (Improved Feint)",
    level: 1,
    bucket: "subsystem",
    note: "named combat-maneuver bonus feat, shareable with allies — named-feat grant, no Change",
  },
  "cavalier:qabarat-outrider:maneuver-tactics-tripping-strike:17": {
    archetypeId: "cavalier:qabarat-outrider",
    name: "Maneuver Tactics (Tripping Strike)",
    level: 17,
    bucket: "subsystem",
    note: "named combat-maneuver bonus feat, shareable via maneuver tactics — named-feat grant, no Change",
  },
  "cavalier:qabarat-outrider:mindlink-pulse:14": {
    archetypeId: "cavalier:qabarat-outrider",
    name: "Mindlink Pulse",
    level: 14,
    bucket: "subsystem",
    note: "grants allies surprise-round action/flat-footed removal — ally-targeted action-economy ability, no self number",
  },
  "cavalier:qabarat-outrider:mindlink:5": {
    archetypeId: "cavalier:qabarat-outrider",
    name: "Mindlink",
    level: 5,
    bucket: "subsystem",
    note: "ally-only save/attack bonus via telepathy — banner-shaped ally aura, replaces banner",
  },

  // ── cavalier:qadiran-horselord ──
  "cavalier:qadiran-horselord:as-one:9": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "As One",
    level: 9,
    bucket: "situational",
    note: "Spring Attack feat-equivalence plus bonus damage dice, but only while mounted and with a one-handed slashing weapon — no @mounted rollData input, and dice damage isn't a flat Change",
  },
  "cavalier:qadiran-horselord:desert-mastery:3": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Desert Mastery",
    level: 3,
    bucket: "situational",
    note: "real ranger-favored-terrain init/skill bonuses, but scoped to desert terrain — a location condition the engine can't check",
  },
  "cavalier:qadiran-horselord:desert-wind:1": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Desert Wind",
    level: 1,
    bucket: "subsystem",
    note: "increases the MOUNT's speed, not the horselord's own — mount-scoped (class note 1), never extracted",
  },
  "cavalier:qadiran-horselord:mount:1": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Mount",
    level: 1,
    bucket: "subsystem",
    note: "restricts the mount pick-list to horses/ponies — mount-scoped (class note 1), no Change",
  },
  "cavalier:qadiran-horselord:sand-scourge:17": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Sand Scourge",
    level: 17,
    bucket: "situational",
    note: "full-round mounted attack-run ability — per-action condition",
  },
  "cavalier:qadiran-horselord:sand-storm:6": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Sand Storm",
    level: 6,
    bucket: "situational",
    note: "Mobility feat-equivalence plus double weapon damage while mounted and charging with a one-handed slashing weapon — mounted/charge-scoped",
  },
  "cavalier:qadiran-horselord:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:qadiran-horselord",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── cavalier:saurian-champion ──
  "cavalier:saurian-champion:dinosaur-mount:1": {
    archetypeId: "cavalier:saurian-champion",
    name: "Dinosaur Mount",
    level: 1,
    bucket: "subsystem",
    note: "restricts the mount pick-list to dinosaurs — mount-scoped (class note 1), no Change",
  },
  "cavalier:saurian-champion:fierce-devotion:5": {
    archetypeId: "cavalier:saurian-champion",
    name: "Fierce Devotion",
    level: 5,
    bucket: "subsystem",
    note: "expands the mount's devotion ability — mount-scoped (class note 1)",
  },
  "cavalier:saurian-champion:nimble-rider:2": {
    archetypeId: "cavalier:saurian-champion",
    name: "Nimble Rider",
    level: 2,
    bucket: "situational",
    note: "real scaling dodge AC bonus, but conditioned on being mounted — no @mounted rollData input",
  },
  "cavalier:saurian-champion:primeval-devotion:14": {
    archetypeId: "cavalier:saurian-champion",
    name: "Primeval Devotion",
    level: 14,
    bucket: "subsystem",
    note: "increases the mount's devotion save bonus — mount-scoped (class note 1)",
  },
  "cavalier:saurian-champion:quick-rider:8": {
    archetypeId: "cavalier:saurian-champion",
    name: "Quick Rider",
    level: 8,
    bucket: "subsystem",
    note: "lets Ride checks fast-mount/dismount a larger mount — narrow use-case, no Change",
  },
  "cavalier:saurian-champion:savage-combatant:1": {
    archetypeId: "cavalier:saurian-champion",
    name: "Savage Combatant",
    level: 1,
    bucket: "subsystem",
    note: "removes the lance-charge damage doubling and restricts ranged weapons while mounted — a restriction, not a bonus",
  },
  "cavalier:saurian-champion:titanic-challenge:1": {
    archetypeId: "cavalier:saurian-champion",
    name: "Titanic Challenge",
    level: 1,
    bucket: "situational",
    note: "modifies challenge's damage/attack bonuses based on the target's size relative to the champion — per-target, challenge-scoped (class note 3), and enemy-size-dependent",
  },
  "cavalier:saurian-champion:titanic-mount:10": {
    archetypeId: "cavalier:saurian-champion",
    name: "Titanic Mount",
    level: 10,
    bucket: "subsystem",
    note: "grows the mount by a size category with scaling stat adjustments — mount-scoped (class note 1)",
  },
  "cavalier:saurian-champion:wild-warrior:1": {
    archetypeId: "cavalier:saurian-champion",
    name: "Wild Warrior",
    level: 1,
    bucket: "subsystem",
    note: "forgoes selecting an order — order restriction, no Change",
  },

  // ── cavalier:sister-in-arms ──
  "cavalier:sister-in-arms:dedicated-commander:11": {
    archetypeId: "cavalier:sister-in-arms",
    name: "Dedicated Commander",
    level: 11,
    bucket: "subsystem",
    note: "reduces the action cost of order/challenge-adjacent abilities — action-economy change, no number",
  },
  "cavalier:sister-in-arms:devoted-defender:3": {
    archetypeId: "cavalier:sister-in-arms",
    name: "Devoted Defender",
    level: 3,
    bucket: "subsystem",
    note: "Bodyguard named bonus feat (prereq waived)",
  },
  "cavalier:sister-in-arms:halfhearted-challenge:1": {
    archetypeId: "cavalier:sister-in-arms",
    name: "Halfhearted Challenge",
    level: 1,
    bucket: "situational",
    note: "halves challenge's own damage bonus — per-target, challenge-scoped (class note 3)",
  },
  "cavalier:sister-in-arms:maiden-s-loyalty:4": {
    archetypeId: "cavalier:sister-in-arms",
    name: "Maiden's Loyalty",
    level: 4,
    bucket: "situational",
    note: "real scaling Will save bonus, but scoped to effects that compel attacking/betraying allies specifically — narrower than the 'compulsion' SAVE_CATEGORIES entry, which would overstate it to every compulsion effect",
  },
  "cavalier:sister-in-arms:maiden-s-order:1": {
    archetypeId: "cavalier:sister-in-arms",
    name: "Maiden's Order",
    level: 1,
    bucket: "subsystem",
    note: "grants membership in both the order of the dragon and the order of the lion at once — order-selection override, orders are display-only (class note 2)",
  },

  // ── cavalier:spellscar-drifter ──
  "cavalier:spellscar-drifter:bonus-feat:6": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Bonus feat",
    level: 6,
    bucket: "blocked",
    note: "restates the identical 6th-level/every-6-levels cadence as the base Bonus Feat (CAV) (just a combat-or-grit-feat list) and explicitly claims to replace it — but carries no pairedBaseFeatureUuid, so the base's own bonusFeats Change stays live; extracting would double-count (class note 6)",
  },
  "cavalier:spellscar-drifter:daring-deeds:3": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Daring Deeds",
    level: 3,
    bucket: "subsystem",
    note: "Rapid Reload named bonus feat plus an extra gunslinger deed — named feat/deeds subsystem",
  },
  "cavalier:spellscar-drifter:have-gun:1": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Have Gun",
    level: 1,
    bucket: "subsystem",
    note: "Amateur Gunslinger/Gunsmithing named feats plus a Cha-for-Wis grit swap and a starting firearm — feat-equivalence/item grants, no Change",
  },
  "cavalier:spellscar-drifter:infamous-deeds:17": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Infamous Deeds",
    level: 17,
    bucket: "subsystem",
    note: "grants additional gunslinger deeds — deeds subsystem",
  },
  "cavalier:spellscar-drifter:notorious-deeds:9": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Notorious Deeds",
    level: 9,
    bucket: "subsystem",
    note: "grants additional gunslinger deeds — deeds subsystem",
  },
  "cavalier:spellscar-drifter:old-reliable:11": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Old Reliable",
    level: 11,
    bucket: "situational",
    note: "doubles the challenge target's threat range with the drifter's firearm plus a grit-spend misfire reroll — per-target, challenge-scoped (class note 3) and resource-gated",
  },
  "cavalier:spellscar-drifter:spell-severed:12": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Spell Severed",
    level: 12,
    bucket: "numeric",
    note: "10 + character level (@attributes.hd.total, not just cavalier level) spell resistance is unconditional and spellResist is a real applied target; the voluntary drop-for-1-round/grit-spend-swift-action toggle isn't modeled",
  },
  "cavalier:spellscar-drifter:tough-as-nails:20": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Tough as Nails",
    level: 20,
    bucket: "subsystem",
    note: "grants additional gunslinger deeds plus a firearm-crit stun rider — deeds subsystem, crit-stun has no matching target",
  },
  "cavalier:spellscar-drifter:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },
  "cavalier:spellscar-drifter:worn-banner:5": {
    archetypeId: "cavalier:spellscar-drifter",
    name: "Worn Banner",
    level: 5,
    bucket: "subsystem",
    note: "banner reflavor (a hat or other accessory) — banner ruling applies (class note 5)",
  },

  // ── cavalier:standard-bearer ──
  "cavalier:standard-bearer:awesome-pennon:20": {
    archetypeId: "cavalier:standard-bearer",
    name: "Awesome Pennon",
    level: 20,
    bucket: "subsystem",
    note: "ally-only banner-shaped bonus — banner ruling applies (class note 5)",
  },
  "cavalier:standard-bearer:banner-of-solace:11": {
    archetypeId: "cavalier:standard-bearer",
    name: "Banner of Solace",
    level: 11,
    bucket: "subsystem",
    note: "ally-only temp-HP/damage-bonus banner reflavor — banner ruling applies (class note 5)",
  },
  "cavalier:standard-bearer:banner:1": {
    archetypeId: "cavalier:standard-bearer",
    name: "Banner",
    level: 1,
    bucket: "subsystem",
    note: "early-grant banner reflavor with a faster scaling cadence — banner ruling applies (class note 5)",
  },
  "cavalier:standard-bearer:mount:5": {
    archetypeId: "cavalier:standard-bearer",
    name: "Mount",
    level: 5,
    bucket: "subsystem",
    note: "delayed grant of the standard mount ability — mount-scoped (class note 1)",
  },

  // ── cavalier:strategist ──
  "cavalier:strategist:drill-instructor:4": {
    archetypeId: "cavalier:strategist",
    name: "Drill Instructor",
    level: 4,
    bucket: "subsystem",
    note: "grants a teamwork feat via challenge expenditure instead of tactician — mechanism swap, no new number",
  },
  "cavalier:strategist:strategic-supremacy:18": {
    archetypeId: "cavalier:strategist",
    name: "Strategic Supremacy",
    level: 18,
    bucket: "subsystem",
    note: "cancels an enemy's teamwork feat instead of granting one — enemy-facing disruption, not a bonus to self",
  },
  "cavalier:strategist:tactical-advantage:14": {
    archetypeId: "cavalier:strategist",
    name: "Tactical Advantage",
    level: 14,
    bucket: "subsystem",
    note: "free movement tied to using tactician — action-economy change, no number",
  },
  "cavalier:strategist:tactician:1": {
    archetypeId: "cavalier:strategist",
    name: "Tactician",
    level: 1,
    bucket: "blocked",
    note: "restates tactician with a different daily-use cadence (1st/5th/every-4-levels, capped at 5) than the base's own vendored uses.maxFormula (1 + floor(@class.unlevel/5)) — a resource pool use-count change with no Change target (same trap as Arcane Pool sizing, class note 4)",
  },

  // ── cavalier:verdivant ──
  "cavalier:verdivant:ambrosia:14": {
    archetypeId: "cavalier:verdivant",
    name: "Ambrosia",
    level: 14,
    bucket: "subsystem",
    note: "break-enchantment-shaped dispel for self and allies, tied to the effloresce resource — activated/resource-gated, no baseline number",
  },
  "cavalier:verdivant:bolsterbloom:5": {
    archetypeId: "cavalier:verdivant",
    name: "Bolsterbloom",
    level: 5,
    bucket: "blocked",
    note: "unconditional fast healing for the verdivant and allies within range — a real, self-inclusive number, but this engine has no fast-healing/regeneration target in targets.ts to express it",
  },
  "cavalier:verdivant:charged-blossoms:9": {
    archetypeId: "cavalier:verdivant",
    name: "Charged Blossoms",
    level: 9,
    bucket: "situational",
    note: "self-inclusive energy resistance 10/20 (eres.<energy> is a real target), but the energy type is a free player choice with no tracked build field — needs a player choice this table can't record",
  },
  "cavalier:verdivant:effloresce:2": {
    archetypeId: "cavalier:verdivant",
    name: "Effloresce",
    level: 2,
    bucket: "subsystem",
    note: "the resource-activation mechanism underlying the verdivant's other efflorescence abilities — no number of its own",
  },
  "cavalier:verdivant:floatflower:2": {
    archetypeId: "cavalier:verdivant",
    name: "Floatflower",
    level: 2,
    bucket: "subsystem",
    note: "ally-only terrain/air-walk aura (verdivant himself not included in the grant) — ally-facing, no self number",
  },
  "cavalier:verdivant:innervating-pollen:5": {
    archetypeId: "cavalier:verdivant",
    name: "Innervating Pollen",
    level: 5,
    bucket: "situational",
    note: "self-inclusive competence bonus on attack rolls or saves, but tied to an active efflorescence (a resource/duration the engine doesn't toggle) and the attack-vs-save split is chosen per activation",
  },
  "cavalier:verdivant:luckleaf:14": {
    archetypeId: "cavalier:verdivant",
    name: "Luckleaf",
    level: 14,
    bucket: "subsystem",
    note: "ally-only roll-twice ability (verdivant himself not included) tied to an active efflorescence — ally-facing, resource-gated",
  },
  "cavalier:verdivant:plant-mount:1": {
    archetypeId: "cavalier:verdivant",
    name: "Plant Mount",
    level: 1,
    bucket: "subsystem",
    note: "plant-type mount reflavor — mount-scoped (class note 1)",
  },
  "cavalier:verdivant:shieldvines:2": {
    archetypeId: "cavalier:verdivant",
    name: "Shieldvines",
    level: 2,
    bucket: "subsystem",
    note: "ally-only attack-of-opportunity immunity (verdivant himself not included) — ally-facing, no self number",
  },
  "cavalier:verdivant:sinuous-steps:3": {
    archetypeId: "cavalier:verdivant",
    name: "Sinuous Steps",
    level: 3,
    bucket: "situational",
    note: "woodland stride (no matching target) plus no AC penalty after a charge — charge-scoped",
  },
  "cavalier:verdivant:slipstrands:9": {
    archetypeId: "cavalier:verdivant",
    name: "Slipstrands",
    level: 9,
    bucket: "blocked",
    note: "self-inclusive freedom of movement for the verdivant and allies in range — a real, unconditional grant, but freedom of movement's paralysis/grapple/entangle/impeded-movement immunity bundle has no single applied target this engine can express without misrepresenting partial coverage",
  },

  // ── cavalier:vermin-tamer ──
  "cavalier:vermin-tamer:darklands-mount:1": {
    archetypeId: "cavalier:vermin-tamer",
    name: "Darklands Mount",
    level: 1,
    bucket: "subsystem",
    note: "restricts the mount pick-list to Darklands vermin — mount-scoped (class note 1)",
  },
  "cavalier:vermin-tamer:disorienting-challenge:12": {
    archetypeId: "cavalier:vermin-tamer",
    name: "Disorienting Challenge",
    level: 12,
    bucket: "situational",
    note: "imposes an AC penalty on the challenge target while mounted above it — enemy-facing, per-use, challenge-scoped (class note 3) and mount-position-conditioned",
  },
  "cavalier:vermin-tamer:stuck-in-the-saddle:4": {
    archetypeId: "cavalier:vermin-tamer",
    name: "Stuck in the Saddle",
    level: 4,
    bucket: "situational",
    note: "real scaling bonus, but scoped to the narrow use-case of staying in the saddle on a climbing/flying mount — not a general Ride bonus",
  },

  // ── cavalier:wave-rider ──
  "cavalier:wave-rider:seafaring-companion:1": {
    archetypeId: "cavalier:wave-rider",
    name: "Seafaring Companion",
    level: 1,
    bucket: "subsystem",
    note: "Monstrous Mount named feat restricted to a hippocampus — mount-scoped (class note 1)",
  },
  "cavalier:wave-rider:weapon-and-armor-proficiency:1": {
    archetypeId: "cavalier:wave-rider",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },
};

/**
 * ── CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────
 *
 * Machine-extracted mechanical effects for cavalier archetype class features
 * (the prose→Change extraction pipeline, cavalier slice). Clean-room from
 * the published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 9 of cavalier's 190
 * features cleared the `numeric` bar (see
 * `CAVALIER_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — cavalier's kit is dominated by mount/order/banner/challenge/
 * tactician reflavors, all deliberately unmodeled subsystems in this engine
 * today (see this file's header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or the bonus is gated on a real-but-partial condition this
 *    engine CAN check (`@armor.type`/`@attributes.encumbrance.level`) while
 *    a second, textually-present clause can't be checked and is dropped —
 *    partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const CAVALIER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Charger's "Courser" (Ultimate Combat) grants a flat +10 land speed under
  // the exact same @armor.type<=2 / @attributes.encumbrance.level<2 gate the
  // vendored barbarian Fast Movement class feature itself uses — both are
  // checkable rollData inputs. The "ignore up to 10 ft. of difficult terrain"
  // half has no matching target and is dropped.
  "cavalier:charger:courser:4": {
    changes: [
      c(
        "if(and(lte(@armor.type, 2), lt(@attributes.encumbrance.level, 2)), 10, 0)",
        "landSpeed",
        "base",
      ),
    ],
    detail: () => "+10 land speed (no/light/medium armor, no heavy load)",
    confidence: "high",
    provenance:
      "At 4th level, a charger's constant training increases his land speed by 10 feet. A " +
      "charger can also move through up to 10 feet of difficult terrain each round as if it " +
      "were normal terrain. These benefits apply only when he is wearing no armor, light armor, " +
      "or medium armor, and not carrying a heavy load.",
  },

  // Constable's "Apprehend" (Ultimate Intrigue) mixes an unconditional
  // Perception bonus with a combat-maneuver-check bonus scoped to disarm/
  // grapple/trip specifically — only the Perception half is extracted (no
  // per-maneuver CMB target exists, same mixed-feature posture the fighter
  // pilot and magus pass both used).
  "cavalier:constable:apprehend:1": {
    changes: [c("if(gte(@class.unlevel, 2), 1 + floor((@class.unlevel - 2) / 5), 0)", "skill.per")],
    detail: (level) =>
      level >= 2
        ? `+${1 + Math.floor((level - 2) / 5)} Perception (maneuver-specific CMB half not modeled)`
        : "no bonus yet (2nd level required)",
    confidence: "medium",
    provenance:
      "At 2nd level, the constable receives a +1 bonus on Perception checks and combat " +
      "maneuver checks to disarm, grapple, or trip opponents. At 7th level and every 5 levels " +
      "thereafter, this bonus improves by 1.",
  },

  // Courtly Knight's "Social Presence" (Ultimate Intrigue) is a clean,
  // unconditional scaling bonus on four named skills, capped at +6 — the
  // "extra edge... for only the presence tactic" verbal-duel clause has no
  // Change shape and is dropped.
  "cavalier:courtly-knight:social-presence:1": {
    changes: [
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.blf"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.dip"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.int"),
      c("min(6, 1 + floor(@class.unlevel / 4))", "skill.sen"),
    ],
    detail: (level) =>
      `+${Math.min(6, 1 + Math.floor(level / 4))} Bluff/Diplomacy/Intimidate/Sense Motive ` +
      `(verbal-duel presence-tactic edge not modeled)`,
    confidence: "high",
    provenance:
      "A courtly knight gains a +1 bonus on all Bluff, Diplomacy, Intimidate, and Sense Motive " +
      "checks. At 4th level and every 4 cavalier levels thereafter, this bonus increases by 1 " +
      "(to a maximum of +6 at 20th level).",
  },

  // Daring Champion's "Nimble" (Ultimate Intrigue) grants a scaling dodge
  // bonus while light/unarmored and no more than lightly loaded — both
  // conditions are checkable (@armor.type / @attributes.encumbrance.level).
  // The "loses Dex bonus, loses this bonus too" clause is already how dodge
  // bonuses behave when Dex-to-AC is lost elsewhere in this engine, so it
  // isn't a separate thing to model.
  "cavalier:daring-champion:nimble:3": {
    changes: [
      c(
        "if(and(lte(@armor.type, 1), lte(@attributes.encumbrance.level, 0)), " +
          "min(5, 1 + floor((@class.unlevel - 3) / 4)), 0)",
        "ac",
        "dodge",
      ),
    ],
    detail: (level) =>
      `+${Math.min(5, 1 + Math.floor((level - 3) / 4))} dodge AC (light/no armor, light load or less)`,
    confidence: "medium",
    provenance:
      "At 3rd level, a daring champion gains a +1 dodge bonus to AC when wearing light or no " +
      "armor and carrying no more than a light load. Anything that causes the daring champion " +
      "to lose his Dexterity bonus to AC also causes him to lose this dodge bonus. This bonus " +
      "increases by 1 for every 4 levels beyond 3rd (to a maximum of +5 at 19th level).",
  },

  // Ghost Rider's "Fearless" (Horror Adventures) is an unconditional fear
  // immunity from 3rd level on — immEffect.fear is this engine's own
  // convention for a blanket fear immunity (see bloodlines.ts/shaman-
  // spirits.ts precedent). The ally +4 fear-save aura is ally-facing and
  // dropped.
  "cavalier:ghost-rider:fearless:3": {
    changes: [c("1", "immEffect.fear")],
    detail: () => "immune to fear (ally +4 fear-save aura not modeled)",
    confidence: "high",
    provenance: "At 3rd level, a ghost rider becomes immune to fear.",
  },

  // Green Knight's "Indestructible" (Ultimate Wilderness) grants a flat +6
  // Constitution score and immunity to death effects, both unconditional at
  // 20th level. The broader "immune to effects that would kill without
  // reducing to 0 hp" clause and the decapitation/reattachment rule have no
  // matching target and are dropped.
  "cavalier:green-knight:indestructible:20": {
    changes: [c("6", "con"), c("1", "immEffect.deathEffects")],
    detail: () =>
      "+6 Con; immune to death effects (decapitation/kill-without-0-hp clause not modeled)",
    confidence: "high",
    provenance:
      "At 20th level, a green knight is virtually impervious to death. She gains a +6 bonus to " +
      "her Constitution score. In addition, the green knight becomes immune to death effects " +
      "and to effects that would kill her without reducing her to 0 hit points, unless the " +
      "effect involves decapitation.",
  },

  // Green Knight's "Oaken Vitality" grants unconditional immunity to disease
  // and poison at 11th level — immEffect.disease/immEffect.poison are both
  // established conventions (bloodlines.ts/bloodrager-bloodlines.ts). The
  // accompanying infestation immunity has no matching target and is dropped.
  "cavalier:green-knight:oaken-vitality:11": {
    changes: [c("1", "immEffect.disease"), c("1", "immEffect.poison")],
    detail: () => "immune to disease and poison (infestation immunity not modeled)",
    confidence: "medium",
    provenance:
      "At 11th level, nature protects a green knight from many afflictions. The green knight " +
      "becomes immune to disease, infestations, and poison.",
  },

  // Herald Squire's "Fleet of Foot" (Ultimate Intrigue) grants the
  // barbarian's Fast Movement wholesale — reusing that class feature's own
  // vendored formula/condition verbatim (see class-features.json), the same
  // "as the X class feature" pattern Kensai's Iaijutsu and Myrmidarch's
  // Armor Mastery already established. The long-overland-journey-distance
  // clause has no matching target and is dropped.
  "cavalier:herald-squire:fleet-of-foot:2": {
    changes: [
      c(
        "if(and(lte(@armor.type, 2), lt(@attributes.encumbrance.level, 2)), 10, 0)",
        "landSpeed",
        "base",
      ),
    ],
    detail: () => "+10 land speed (no/light/medium armor, no heavy load)",
    confidence: "high",
    provenance:
      "At 2nd level, a herald squire gains fast movement, as the barbarian class feature of " +
      "the same name. If the herald squire gains fast movement from another class, the bonuses " +
      "to her speed do not stack.",
  },

  // Spellscar Drifter's "Spell Severed" (Pathfinder Society, Spellscar
  // Desert) grants unconditional spell resistance equal to 10 + character
  // level (NOT cavalier level — the only cavalier archetype feature in this
  // slice keyed off overall character level rather than class level).
  // spellResist is a real applied target; the voluntary drop-for-1-round/
  // grit-spend-swift-action toggle has no Change shape and is dropped.
  "cavalier:spellscar-drifter:spell-severed:12": {
    changes: [c("10 + @attributes.hd.total", "spellResist")],
    detail: () => "SR 10 + character level (can be voluntarily dropped, not modeled)",
    confidence: "medium",
    provenance:
      "At 12th level, a Spellscar drifter becomes permanently marked by long exposure to the " +
      "Spellscar Desert. The Spellscar drifter gains spell resistance equal to 10 + his " +
      "character level.",
  },

  // Disciple of the Pike's "Weapon Training" is a single-slot fighter-style
  // Weapon Training restricted to ONE of two weapon groups (polearms or
  // spears — both real vendored weapon-group tags, weapon-groups.ts),
  // "progress[ing] as though his fighter level were equal to his cavalier
  // level." Fighter's own tier-1 Weapon Training starts at 5th level
  // (WEAPON_TRAINING_LEVELS[0] in tables.ts) — matching this feature's own
  // 5th-level gate exactly, so the tier-1 formula transfers unchanged.
  "cavalier:disciple-of-the-pike:weapon-training:5": {
    changes: [],
    choice: {
      label: "Weapon group",
      options: [
        { id: "polearms", label: "Polearms" },
        { id: "spears", label: "Spears" },
      ],
    },
    choiceChanges: {
      polearms: [
        c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.polearms"),
        c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.polearms"),
      ],
      spears: [
        c("1 + floor((@class.unlevel - 5) / 4)", "attack.weapon.spears"),
        c("1 + floor((@class.unlevel - 5) / 4)", "damage.weapon.spears"),
      ],
    },
    detail: (level) => `+${1 + Math.floor((level - 5) / 4)} attack/damage (chosen weapon group)`,
    confidence: "high",
    provenance:
      "At 5th level, a disciple of the pike gains weapon training, just like a fighter. He " +
      "must select polearms or spears as his weapon group, and never gains another weapon " +
      "group. His bonuses with the selected group otherwise progress as though his fighter " +
      "level were equal to his cavalier level.",
  },
};
