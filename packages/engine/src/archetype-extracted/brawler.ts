/**
 * Brawler's slice of the batch-extraction pipeline: every vendored archetype
 * feature for the class (19 brawler archetypes, 62 features) read in full and
 * bucketed as `numeric` / `situational` / `subsystem` / `blocked`, with the
 * `numeric` ones getting a real `Change`-shaped extraction. Per the per-class
 * file convention (`index.ts`'s doc comment), this file owns BOTH of brawler's
 * pipeline artifacts — `BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file.
 *
 * ── Brawler-specific mechanical facts this pass relies on ─────────────────
 *
 * 1. **Martial Flexibility** (base L1 feature) rides a real vendored
 *    `uses.maxFormula: "3 + floor(@class.unlevel / 2)"` per day, applied
 *    generically by the resource-pool pipeline. Any archetype feature that
 *    changes the pool's SIZE/cadence is `blocked` (double-count/conflict with
 *    the vendored formula). Features that only extend what a use can be SPENT
 *    ON (monk moves, hunter's tricks, Call to Arms) are `subsystem` — a
 *    spend-option list, no baseline number.
 * 2. **AC Bonus (BRA)** (base L4 feature) carries REAL vendored `changes`:
 *    dodge-typed `ac` AND `cmd` bonuses gated on `@armor.type < 2` and
 *    `@attributes.encumbrance.level < 1`, tiered 1/2/3/4 at 4th/9th/13th/18th.
 *    An archetype feature that restates that same number WITHOUT a vendored
 *    pairing (no struck-through base row) would coexist with it, and dodge
 *    stacks with dodge — extracting the restatement double-counts, so it's
 *    `blocked` (Living Avalanche's Unyielding is exactly this shape).
 * 3. **Bonus Combat Feats (BRA)** (base L2 feature) carries a vendored
 *    `bonusFeats` change (`floor((@class.unlevel + 1) / 3)`). Archetype text
 *    that restates the full base progression while only really changing the
 *    feat LIST is `subsystem` — re-extracting the count would double-count the
 *    base feature's own vendored change.
 * 4. **Unarmed strike damage** rides `tables.ts`'s hardcoded
 *    `unarmedDamageDie(classLevel, size)` (the monk table, which the brawler
 *    shares). Features that shift the die by an effective size/level offset
 *    are `blocked` — no override hook exists without touching
 *    `tables.ts`/`compute.ts` (out of scope), same as unchained monk's
 *    Softstrike precedent (`./monkUnchained.ts`).
 * 5. **Maneuver Training (BRA)** carries no vendored `changes` — its
 *    per-maneuver bonuses are scoped to player-chosen maneuvers, and the
 *    engine's `cmb`/`cmd` targets are global (a per-maneuver bonus applied
 *    globally would over-apply). Alterations of it are `subsystem`; archetype
 *    variants with FIXED maneuvers (Sunder Training) are still per-maneuver
 *    scoped and stay `situational`.
 * 6. **Brawler's flurry / brawler's strike / close weapon mastery / knockout /
 *    martial training** are prose-only display features or resource abilities
 *    with no numeric Change modeling — features modifying them are
 *    `subsystem`.
 * 7. **Winding Path Renegade's School Focus** grants exactly ONE of the three
 *    L2 "Mystery of ..." features (the player's monastery choice), but the
 *    vendored dataset has no choice mechanism — all three mystery features
 *    ride the archetype. Extracting any mystery's number would apply all
 *    three to every winding path renegade, so each mystery is `situational`
 *    (choice-scoped) and School Focus itself is `subsystem` (the pick).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── brawler:battle-dancer ──
  "brawler:battle-dancer:dancer-s-cunning:1": {
    archetypeId: "brawler:battle-dancer",
    name: "Dancer's Cunning",
    level: 1,
    bucket: "subsystem",
    note: "Cha-for-Int substitution for combat-feat prerequisites, Perform (dance) in place of Bluff to feint, and the performance weapon quality on unarmed strikes — rules substitutions, no number",
  },
  "brawler:battle-dancer:dancing-dodge:4": {
    archetypeId: "brawler:battle-dancer",
    name: "Dancing Dodge",
    level: 4,
    bucket: "situational",
    note: "real Cha-mod dodge bonus, but an immediate-action, AoO-use-expending, uses-per-day defense against a single triggering attack — activated, not a passive number",
  },
  "brawler:battle-dancer:rolling-flurry:2": {
    archetypeId: "brawler:battle-dancer",
    name: "Rolling Flurry",
    level: 2,
    bucket: "subsystem",
    note: "alters brawler's flurry with mandatory 5-foot movement between attacks — flurry is prose-only (class note 6), no number",
  },
  "brawler:battle-dancer:sparring-partners:4": {
    archetypeId: "brawler:battle-dancer",
    name: "Sparring Partners",
    level: 4,
    bucket: "situational",
    note: "real flanking bonus, but once per day, ally-facing, and conditioned on rolling flurry positioning — ally-only bonuses are never extracted",
  },

  // ── brawler:bouncer ──
  "brawler:bouncer:bar-fight-mastery:5": {
    archetypeId: "brawler:bouncer",
    name: "Bar Fight Mastery",
    level: 5,
    bucket: "subsystem",
    note: "crit-triggered crowd-tenacity reduction — the bar-fight/tenacity subsystem isn't modeled at all",
  },
  "brawler:bouncer:crowd-control:1": {
    archetypeId: "brawler:bouncer",
    name: "Crowd Control",
    level: 1,
    bucket: "subsystem",
    note: "tenacity-loss minimization and a mix-it-up tenacity rider — bar-fight subsystem, not modeled",
  },
  "brawler:bouncer:drunk-handler:2": {
    archetypeId: "brawler:bouncer",
    name: "Drunk Handler",
    level: 2,
    bucket: "situational",
    note: "real +2 circumstance bonus on Intimidate/Sense Motive, but only against foes that are tipsy or worse — an enemy-state condition the engine can't check",
  },
  "brawler:bouncer:drunk-knockout:4": {
    archetypeId: "brawler:bouncer",
    name: "Drunk Knockout",
    level: 4,
    bucket: "subsystem",
    note: "knockout-use spend inside the unmodeled bar-fight subsystem — resource-gated, no baseline number",
  },
  "brawler:bouncer:lesser-flexibility:1": {
    archetypeId: "brawler:bouncer",
    name: "Lesser Flexibility",
    level: 1,
    bucket: "blocked",
    note: "resizes the martial flexibility pool to '2 + half her brawler level (minimum 3)' vs. the vendored uses.maxFormula '3 + floor(@class.unlevel / 2)' — a genuine pool-size divergence; backfilling would double-count or conflict with the vendored formula (class note 1)",
  },

  // ── brawler:constructed-pugilist ──
  "brawler:constructed-pugilist:bonus-combat-feat:2": {
    archetypeId: "brawler:constructed-pugilist",
    name: "Bonus Combat Feat",
    level: 2,
    bucket: "subsystem",
    note: "restates the base Bonus Combat Feats progression verbatim and only adds crafting feats to the choice list — the count is already carried by the base feature's vendored bonusFeats change, so re-extracting it would double-count (class note 3); the list expansion itself is a pick-list change",
  },
  "brawler:constructed-pugilist:constructed-limb:1": {
    archetypeId: "brawler:constructed-pugilist",
    name: "Constructed Limb",
    level: 1,
    bucket: "subsystem",
    note: "grants a prosthetic weapon item with its own enhancement/material/enchantment rules — an equipment subsystem, no baseline character number",
  },
  "brawler:constructed-pugilist:limb-modification:1": {
    archetypeId: "brawler:constructed-pugilist",
    name: "Limb Modification",
    level: 1,
    bucket: "subsystem",
    note: "a pick-list of limb modifications (flex limb, grapnel arm, shielding limb, tight grip, ...) chosen at 1st/6th/10th/12th/20th — player-chosen options, several themselves activated or scoped, no baseline number",
  },

  // ── brawler:exemplar ──
  "brawler:exemplar:call-to-arms:1": {
    archetypeId: "brawler:exemplar",
    name: "Call to Arms",
    level: 1,
    bucket: "subsystem",
    note: "martial-flexibility-use spend to un-flat-foot allies — a spend-option (class note 1), ally-facing, no number",
  },
  "brawler:exemplar:field-instruction:5": {
    archetypeId: "brawler:exemplar",
    name: "Field Instruction",
    level: 5,
    bucket: "subsystem",
    note: "uses-per-day teamwork-feat sharing (counts as the cavalier's tactician) — ally-facing feat grant, no number",
  },
  "brawler:exemplar:inspiring-prowess:3": {
    archetypeId: "brawler:exemplar",
    name: "Inspiring Prowess",
    level: 3,
    bucket: "subsystem",
    note: "grants bardic performances (inspire courage/greatness/heroics) on a rounds-per-day resource — the performance subsystem is activated and not modeled as passive numbers; replaces maneuver training and AC bonus",
  },

  // ── brawler:feral-striker ──
  "brawler:feral-striker:feral-aspect:1": {
    archetypeId: "brawler:feral-striker",
    name: "Feral Aspect",
    level: 1,
    bucket: "subsystem",
    note: "grants the shifter's aspect class feature (a minutes-per-day, player-chosen-aspect subsystem this engine doesn't model) — activated pick-list, no baseline number",
  },

  // ── brawler:hinyasi ──
  "brawler:hinyasi:improvisation-mastery:5": {
    archetypeId: "brawler:hinyasi",
    name: "Improvisation Mastery",
    level: 5,
    bucket: "situational",
    note: "real +2 attack/damage, but scoped to one chosen handedness category of improvised weapons — improvised weapons aren't a weapon-group target and the choice isn't tracked",
  },
  "brawler:hinyasi:improvisation-training:2": {
    archetypeId: "brawler:hinyasi",
    name: "Improvisation Training",
    level: 2,
    bucket: "subsystem",
    note: "improvised weapons deal unarmed strike damage and count as the close weapon group — a die-size mapping and weapon-treatment rule with no Change target",
  },
  "brawler:hinyasi:improvised-maneuver:4": {
    archetypeId: "brawler:hinyasi",
    name: "Improvised Maneuver",
    level: 4,
    bucket: "subsystem",
    note: "free-action combat maneuver rider (at -4) on improvised-weapon hits, with a growing chosen-maneuver list — an action-economy ability, no passive number",
  },
  "brawler:hinyasi:weapon-and-armor-proficiency:1": {
    archetypeId: "brawler:hinyasi",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── brawler:living-avalanche ──
  "brawler:living-avalanche:avalanche:16": {
    archetypeId: "brawler:living-avalanche",
    name: "Avalanche",
    level: 16,
    bucket: "subsystem",
    note: "full-round multi-target overrun action — an activated maneuver, no passive number",
  },
  "brawler:living-avalanche:earth-discipline:2": {
    archetypeId: "brawler:living-avalanche",
    name: "Earth Discipline",
    level: 2,
    bucket: "subsystem",
    note: "named bonus feat grants (Improved Overrun at 2nd, Improved Bull Rush at 5th) — specific-feat grants are subsystem, same posture as magus's Weapon Focus grants",
  },
  "brawler:living-avalanche:improved-avalanche:20": {
    archetypeId: "brawler:living-avalanche",
    name: "Improved Avalanche",
    level: 20,
    bucket: "subsystem",
    note: "natural-20 crit-confirm rider on the avalanche ability — event-triggered, no number",
  },
  "brawler:living-avalanche:landslide:3": {
    archetypeId: "brawler:living-avalanche",
    name: "Landslide",
    level: 3,
    bucket: "subsystem",
    note: "fixes the maneuver training choices to overrun/bull rush and adds charge-conditional riders — maneuver training alterations are subsystem (class note 5), the riders are charge-scoped",
  },
  "brawler:living-avalanche:unyielding:4": {
    archetypeId: "brawler:living-avalanche",
    name: "Unyielding",
    level: 4,
    bucket: "blocked",
    note: "restates the base AC Bonus (BRA) number verbatim (dodge +1 at 4th, +1 more at 9th/13th/18th, light/no armor, light load) with only a touch-attack clause added — the base feature already carries these exact vendored dodge ac/cmd changes and this feature has NO vendored pairing to strike the base row, so extracting it would stack dodge on dodge and double-count (class note 2)",
  },

  // ── brawler:mutagenic-mauler ──
  "brawler:mutagenic-mauler:beastmorph:4": {
    archetypeId: "brawler:mutagenic-mauler",
    name: "Beastmorph",
    level: 4,
    bucket: "situational",
    note: "real scaling numbers (+10/+15/+20 enhancement speed, low-light, darkvision 30, climb speed, scent), but every one applies only while the mutagen is active — an activated-state condition the static sheet can't check; replaces AC bonus",
  },
  "brawler:mutagenic-mauler:mutagen:1": {
    archetypeId: "brawler:mutagenic-mauler",
    name: "Mutagen",
    level: 1,
    bucket: "subsystem",
    note: "grants the alchemist mutagen subsystem (plus discoveries at 10th/12th); the +2/+3/+4 melee damage from 6th is mutagenic-form-conditional — activated, not a baseline number",
  },

  // ── brawler:shield-champion ──
  "brawler:shield-champion:champion-defense:15": {
    archetypeId: "brawler:shield-champion",
    name: "Champion Defense",
    level: 15,
    bucket: "subsystem",
    note: "once-per-day save-to-halve-damage reaction — resource-gated, no number",
  },
  "brawler:shield-champion:returning-shield:5": {
    archetypeId: "brawler:shield-champion",
    name: "Returning Shield",
    level: 5,
    bucket: "subsystem",
    note: "thrown-shield ricochet/return mechanics, a Greater Shield Focus feat grant at 9th, and a shield-damage-substitution rule at 12th — attack-mode rules and a named feat grant, no baseline number",
  },
  "brawler:shield-champion:throw-shield:3": {
    archetypeId: "brawler:shield-champion",
    name: "Throw Shield",
    level: 3,
    bucket: "subsystem",
    note: "makes shields throwable (with virtual Far Shot), adds thrown combat maneuvers at 7th and a Shield Master feat grant at 11th — new attack options and a named feat grant, no number",
  },
  "brawler:shield-champion:weapon-and-armor-proficiency:1": {
    archetypeId: "brawler:shield-champion",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant (shields as weapons, heavy shields), no Change",
  },

  // ── brawler:snakebite-striker ──
  "brawler:snakebite-striker:opportunist:11": {
    archetypeId: "brawler:snakebite-striker",
    name: "Opportunist",
    level: 11,
    bucket: "blocked",
    note: "vendored copy-paste error: the description is the base Maneuver Training (BRA) text verbatim ('At 3rd level, a brawler can select one combat maneuver...') on an 11th-level feature named Opportunist — internally inconsistent, so no number is guessed; even the printed text would be per-chosen-maneuver scoped (class note 5)",
  },
  "brawler:snakebite-striker:snake-feint:3": {
    archetypeId: "brawler:snakebite-striker",
    name: "Snake Feint",
    level: 3,
    bucket: "subsystem",
    note: "feint action-economy compression plus flanking-origin-square tricks at 11th/15th — action and positioning rules, no number; replaces maneuver training gained at 3rd and 7th",
  },
  "brawler:snakebite-striker:sneak-attack:1": {
    archetypeId: "brawler:snakebite-striker",
    name: "Sneak Attack",
    level: 1,
    bucket: "subsystem",
    note: "grants rogue-style sneak attack (+1d6, scaling at 6th/10th/12th/20th) — dice-based, condition-gated extra damage isn't modelable as a flat Change (same posture as monkUnchained's boar-styled sneak attack grant); replaces martial flexibility",
  },

  // ── brawler:steel-breaker ──
  "brawler:steel-breaker:exploit-weakness:5": {
    archetypeId: "brawler:steel-breaker",
    name: "Exploit Weakness",
    level: 5,
    bucket: "situational",
    note: "real numbers (+2 attack with DR/hardness bypass, or half-level dodge AC/Sense Motive/Reflex vs. one creature), but every mode is a swift-action activation scoped to one observed target until end of turn — activated, per-target",
  },
  "brawler:steel-breaker:sunder-training:3": {
    archetypeId: "brawler:steel-breaker",
    name: "Sunder Training",
    level: 3,
    bucket: "numeric",
    note: "scaling CMB/CMD bonus vs. sunder (from 3rd) and disarm (from 7th), unconditional — now expressible via Change.maneuverCategories (maneuver-categories.ts), wired in BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED; alters maneuver training",
  },

  // ── brawler:strangler ──
  "brawler:strangler:neckbreaker:16": {
    archetypeId: "brawler:strangler",
    name: "Neckbreaker",
    level: 16,
    bucket: "subsystem",
    note: "standard-action save-or-die grapple maneuver against a pinned opponent — an activated ability, no number",
  },
  "brawler:strangler:practiced-strangler:2": {
    archetypeId: "brawler:strangler",
    name: "Practiced Strangler",
    level: 2,
    bucket: "situational",
    note: "removes the grappled condition's Dexterity penalty and Dex-to-AC loss (and pinned penalties at 9th) — real relief, but it's an exemption to condition-state penalties that only matters while grappled/pinned, and no Change target expresses a condition-penalty exemption; replaces AC bonus",
  },
  "brawler:strangler:sleeper-hold:4": {
    archetypeId: "brawler:strangler",
    name: "Sleeper Hold",
    level: 4,
    bucket: "subsystem",
    note: "knockout alteration (grapple-check-based unconsciousness, uses per day) — resource-gated maneuver, no number (class note 6)",
  },
  "brawler:strangler:strangle:1": {
    archetypeId: "brawler:strangler",
    name: "Strangle",
    level: 1,
    bucket: "situational",
    note: "real scaling sneak-attack dice (+1d6 to +4d6), but only on successful grapple checks to damage or pin — dice-based and grapple-conditional; replaces unarmed strike and brawler's flurry",
  },

  // ── brawler:strong-side-boxer ──
  "brawler:strong-side-boxer:lead-leg:5": {
    archetypeId: "brawler:strong-side-boxer",
    name: "Lead Leg",
    level: 5,
    bucket: "situational",
    note: "while the chain wrap is worn she counts as wearing a chain shirt (a whole armor-state substitution, not a modifier) plus a once-per-round immediate-action trip bonus — state-gated, no flat Change",
  },
  "brawler:strong-side-boxer:shield-hand:1": {
    archetypeId: "brawler:strong-side-boxer",
    name: "Shield-Hand",
    level: 1,
    bucket: "situational",
    note: "real scaling natural armor (+1, +1 per 5 levels to +5), but only while the off hand makes no attacks — a per-round action condition the engine can't check, and dropping it would wrongly buff two-weapon/flurry turns",
  },
  "brawler:strong-side-boxer:strong-side-fist:1": {
    archetypeId: "brawler:strong-side-boxer",
    name: "Strong-Side Fist",
    level: 1,
    bucket: "situational",
    note: "wrapped-hand state grants scaling bleed dice on unarmed strikes (and a -2 Dex-skill penalty while wrapped) — an opted-into prep state with dice-based riders, not a passive number",
  },

  // ── brawler:turfer ──
  "brawler:turfer:favored-turf:3": {
    archetypeId: "brawler:turfer",
    name: "Favored Turf",
    level: 3,
    bucket: "situational",
    note: "real scaling initiative/CMB/CMD bonuses, but only inside player-chosen favored terrains — a terrain condition the engine can't check (same posture as ranger favored-terrain features)",
  },
  "brawler:turfer:terrain-mastery:4": {
    archetypeId: "brawler:turfer",
    name: "Terrain Mastery",
    level: 4,
    bucket: "situational",
    note: "real +10/+20/+30 enhancement speed plus endure elements and difficult-terrain immunity, but all of it only within favored terrains (and lost in medium/heavy armor or load) — terrain-scoped",
  },

  // ── brawler:ulfen-beast-wrestler ──
  "brawler:ulfen-beast-wrestler:beast-defenses:4": {
    archetypeId: "brawler:ulfen-beast-wrestler",
    name: "Beast Defenses",
    level: 4,
    bucket: "situational",
    note: "real AC bonus (half the beast training bonus), but only against the selected creature types — enemy-type scoped; replaces AC bonus",
  },
  "brawler:ulfen-beast-wrestler:beast-training:3": {
    archetypeId: "brawler:ulfen-beast-wrestler",
    name: "Beast Training",
    level: 3,
    bucket: "situational",
    note: "real scaling CMB/CMD bonuses, but only against player-selected favored-enemy creature types — enemy-type scoped, and the picks aren't tracked; replaces maneuver training",
  },

  // ── brawler:venomfist ──
  "brawler:venomfist:venomous-strike:1": {
    archetypeId: "brawler:venomfist",
    name: "Venomous Strike",
    level: 1,
    bucket: "blocked",
    note: "shifts unarmed strike damage to one size category smaller — the die progression is tables.ts's hardcoded unarmedDamageDie(classLevel, size) with no per-feature size-offset hook, so backfilling would require touching tables.ts/compute.ts (out of scope; the softstrike-monk precedent in ./monkUnchained.ts). The Con-mod poison rider is save-based and per-hit anyway",
  },

  // ── brawler:verdant-grappler ──
  "brawler:verdant-grappler:green-grasp:2": {
    archetypeId: "brawler:verdant-grappler",
    name: "Green Grasp",
    level: 2,
    bucket: "subsystem",
    note: "Improved Grapple feat grant, a forced maneuver-training pick, and a ropeless tie-up mechanic on pins — feat grant plus maneuver rules, no number",
  },
  "brawler:verdant-grappler:phytological-anatomy:11": {
    archetypeId: "brawler:verdant-grappler",
    name: "Phytological Anatomy",
    level: 11,
    bucket: "numeric",
    note: "flat, unconditional +2 on saves vs. mind-affecting, paralysis, poison, polymorph, sleep, and stunning effects — the mind/poison/stun save categories carry it (sleep is a child of mind); paralysis and polymorph have no SAVE_CATEGORIES entry and are dropped, flagged in detail",
  },
  "brawler:verdant-grappler:thorny-embrace:5": {
    archetypeId: "brawler:verdant-grappler",
    name: "Thorny Embrace",
    level: 5,
    bucket: "situational",
    note: "automatic thorn damage (a lagged unarmed-die amount) to a creature tied up with green grasp — dice-based and scoped to a maintained grapple state",
  },

  // ── brawler:wild-child ──
  "brawler:wild-child:animal-companion:1": {
    archetypeId: "brawler:wild-child",
    name: "Animal Companion",
    level: 1,
    bucket: "subsystem",
    note: "grants a druid-progression animal companion (brawler level 1:1) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block; replaces the bonus combat feats gained at 2nd/8th/14th/20th",
  },
  "brawler:wild-child:hunter-s-tricks:5": {
    archetypeId: "brawler:wild-child",
    name: "Hunter's Tricks",
    level: 5,
    bucket: "subsystem",
    note: "martial-flexibility-use spend to activate skirmisher tricks — a spend-option list (class note 1); replaces close weapon mastery",
  },
  "brawler:wild-child:maneuver-training:3": {
    archetypeId: "brawler:wild-child",
    name: "Maneuver Training",
    level: 3,
    bucket: "subsystem",
    note: "restates the base Maneuver Training text (player-chosen per-maneuver bonuses the engine can't scope, class note 5); its own bonus companion trick at 3rd level is wired via COMPANION_EFFECT_ARCHETYPE_FEATURES (bonusTricks), but the matching bonus trick each later 7th/11th/15th/19th tier adds isn't scaled for — alters maneuver training",
  },
  "brawler:wild-child:wild-tricks:5": {
    archetypeId: "brawler:wild-child",
    name: "Wild Tricks",
    level: 5,
    bucket: "subsystem",
    note: "grants hunter's tricks on its own uses-per-day resource — an activated trick subsystem; replaces the bonus combat feats gained at 5th/11th/17th",
  },

  // ── brawler:winding-path-renegade ──
  "brawler:winding-path-renegade:monk-moves-evasion-fast-movement-slow-fall:4": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Monk Moves (Evasion, Fast Movement, Slow Fall)",
    level: 4,
    bucket: "subsystem",
    note: "martial-flexibility-use spend to temporarily gain monk abilities — a spend-option list (class note 1), light/no-armor gated on top; replaces AC bonus",
  },
  "brawler:winding-path-renegade:monk-moves-high-jump:5": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Monk Moves (High Jump)",
    level: 5,
    bucket: "subsystem",
    note: "same martial-flexibility spend-option table as the 4th-level Monk Moves entry (the vendored text is the identical shared blurb) — subsystem for the same reason",
  },
  "brawler:winding-path-renegade:monk-moves-improved-evasion:9": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Monk Moves (Improved Evasion)",
    level: 9,
    bucket: "subsystem",
    note: "same martial-flexibility spend-option table as the 4th-level Monk Moves entry (identical shared blurb) — subsystem for the same reason",
  },
  "brawler:winding-path-renegade:mystery-of-unblinking-flame:2": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Mystery of Unblinking Flame",
    level: 2,
    bucket: "subsystem",
    note: "one of three mutually-exclusive mysteries chosen via School Focus; the pick and its wired branch (this mystery's +10 ft. enhancement speed at 2nd) live on the canonical id school-focus:2",
  },
  "brawler:winding-path-renegade:mystery-of-unfolding-wind:2": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Mystery of Unfolding Wind",
    level: 2,
    bucket: "subsystem",
    note: "one of three mutually-exclusive mysteries chosen via School Focus; the pick lives on the canonical id school-focus:2, where this option emits nothing (a range-increment bonus has no Change target, Deflect Arrows is a named feat grant)",
  },
  "brawler:winding-path-renegade:mystery-of-untwisting-iron:2": {
    archetypeId: "brawler:winding-path-renegade",
    name: "Mystery of Untwisting Iron",
    level: 2,
    bucket: "subsystem",
    note: "one of three mutually-exclusive mysteries chosen via School Focus; the pick lives on the canonical id school-focus:2, where this option emits nothing (2nd-level masterwork-equipment is a quality flag with no Change target, and the 8th-level half-level Craft (metal) bonus is scoped to a freeform crf.<slug> skill instance PickChoice's fixed options can't name)",
  },
  "brawler:winding-path-renegade:school-focus:2": {
    archetypeId: "brawler:winding-path-renegade",
    name: "School Focus",
    level: 2,
    bucket: "numeric",
    note: "canonical id: the pick itself, wired via the archetypeFeature PickChoice mechanism. Only Mystery of Unblinking Flame's unconditional +10 ft. enhancement speed carries a Change; the other two mysteries' branches emit nothing (see their own entries)",
  },
};

/**
 * ── BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for brawler archetype class features
 * (the prose→Change extraction pipeline, brawler slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry source
 * was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 1 of brawler's 62 features
 * cleared the `numeric` bar (see `BRAWLER_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — brawler's kit leans almost entirely
 * on martial-flexibility spend-options, maneuver-scoped bonuses, activated
 * states (mutagen, wraps, terrain), and restatements of base features whose
 * numbers the vendored class data already carries (AC Bonus, Bonus Combat
 * Feats), all of which fail the unconditional-numeric bar.
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general scaling bonus.
 *  - "medium": the formula required a mild reading, or a textually-present
 *    sub-scope can't be represented and is dropped — partial honesty, flagged
 *    in `detail`.
 *  - "low": not used in this pass.
 */
export const BRAWLER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Verdant Grappler's "Phytological Anatomy" is a flat, wholly unconditional
  // +2 on saves against a list of effect categories — the Change.saveCategories
  // idiom (same as monkUnchained's Scaled Fist/Draconic Mettle and slayer's
  // Pureblade/Steely Mind). Category mapping: "mind-affecting" -> mind,
  // "poison" -> poison, "stunning" -> stun, "paralysis" -> paralysis,
  // "polymorph" -> polymorph (both added once save-categories.ts grew those
  // entries — the vocabulary now covers every named scope); "sleep" is a
  // child of mind in SAVE_CATEGORIES so mind already covers it (naming it
  // separately would only print a redundant line).
  "brawler:verdant-grappler:phytological-anatomy:11": {
    changes: [
      {
        formula: "2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind", "paralysis", "poison", "polymorph", "stun"],
      },
    ],
    detail: () => "+2 vs. mind-affecting/paralysis/poison/polymorph/stun saves",
    confidence: "high",
    provenance:
      "She gains a +2 bonus on saving throws against mind-affecting, paralysis, poison, " +
      "polymorph, sleep, and stunning effects.",
  },

  // ── Maneuver-scoped cmb/cmd (Change.maneuverCategories) ───────────────────

  "brawler:steel-breaker:sunder-training:3": {
    changes: [
      {
        formula: "2 + floor((@class.unlevel - 3) / 4)",
        target: "cmb",
        type: "untyped",
        maneuverCategories: ["sunder"],
      },
      {
        formula: "2 + floor((@class.unlevel - 3) / 4)",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["sunder"],
      },
      {
        formula: "if(gte(@class.unlevel, 7), 2 + floor((@class.unlevel - 7) / 4), 0)",
        target: "cmb",
        type: "untyped",
        maneuverCategories: ["disarm"],
      },
      {
        formula: "if(gte(@class.unlevel, 7), 2 + floor((@class.unlevel - 7) / 4), 0)",
        target: "cmd",
        type: "untyped",
        maneuverCategories: ["disarm"],
      },
    ],
    detail: (level) => {
      const sunder = 2 + Math.floor((level - 3) / 4);
      const disarm = level >= 7 ? 2 + Math.floor((level - 7) / 4) : 0;
      return disarm > 0
        ? `+${sunder} CMB/CMD vs. sunder, +${disarm} CMB/CMD vs. disarm`
        : `+${sunder} CMB/CMD vs. sunder`;
    },
    confidence: "high",
    provenance:
      "At 3rd level, a steel-breaker receives additional training in sunder combat maneuvers. " +
      "She gains a +2 bonus when attempting a sunder combat maneuver checks and a +2 bonus to " +
      "her CMD when defending against this maneuver. At 7th level, these bonuses increase by " +
      "1, and she gains a +2 bonus on disarm combat maneuver checks and a +2 bonus to her CMD " +
      "when defending against a disarm maneuver. At 11th, 15th, and 19th levels, all of these " +
      "bonuses increase by 1. This ability alters maneuver training.",
  },

  // Winding Path Renegade's "School Focus" grants ONE of three mutually-
  // exclusive mysteries (each its own sibling feature id) taught at her old
  // monastery. Only Mystery of Unblinking Flame's 2nd-level "increases her
  // speed by 10 feet (this is treated as an enhancement bonus)" is
  // unconditional; Unfolding Wind's 2nd-level grant is a range-increment
  // bonus (no target) + a named feat, and Untwisting Iron's is an equipment-
  // quality flag (no target) — both emit nothing. All three mysteries' 8th/
  // 14th-level tiers are activated or freeform-skill-scoped and stay
  // unmodeled regardless of which is picked.
  "brawler:winding-path-renegade:school-focus:2": {
    changes: [],
    choice: {
      label: "Mystery",
      options: [
        { id: "unblinking-flame", label: "Mystery of Unblinking Flame (+10 ft. speed)" },
        { id: "unfolding-wind", label: "Mystery of Unfolding Wind" },
        { id: "untwisting-iron", label: "Mystery of Untwisting Iron" },
      ],
    },
    choiceChanges: {
      "unblinking-flame": [c("10", "landSpeed", "enhancement")],
      "unfolding-wind": [],
      "untwisting-iron": [],
    },
    detail: () =>
      "unblinking flame: +10 ft. enhancement speed · unfolding wind/untwisting iron: no baseline number (choice stored per pick)",
    confidence: "high",
    provenance:
      "At 2nd level, a winding path renegade continues the training she left behind, gaining " +
      "the benefits of the mystery taught at her old monastery.",
  },
};
