/**
 * Inquisitor's slice of the pipeline. Every vendored archetype feature whose
 * id starts with `inquisitor:` (37 archetypes, 143 features) is read in full
 * and bucketed as `numeric` / `situational` / `subsystem` / `blocked`, and the
 * `numeric` ones get a real `Change`-shaped extraction. Same methodology as
 * the fighter/magus pilots (see those files' header comments for the general
 * shape).
 *
 * ── Inquisitor-specific mechanical facts this pass relies on ──────────────
 *
 * 1. **Judgment** (the swift-action stance + its uses/day pool) is fully
 *    vendored and hand-authored on top in `judgments.ts` — the seven
 *    individual judgment types are a toggle subsystem, not per-feature
 *    Changes. Any archetype feature that adds, swaps, or reflavors a
 *    judgment (including "functions as bane/greater bane" weapon-ability
 *    reskins of Second/Third Judgment) is `subsystem`.
 * 2. **Bane** rides a resource pool (`uses.maxFormula: "@class.unlevel"`,
 *    rounds/day) and is activated, per-weapon, per-creature-type — the
 *    vendored `Bane` class feature itself carries `changes: []` (no bonus
 *    modeled numerically at all; its bonus-damage dice aren't a Change
 *    target). Every feature that modifies, restricts, or reflavors Bane
 *    (including features that "function as and replace bane") is
 *    `situational`.
 * 3. **Solo Tactics** and the **Teamwork Feat** cadence (base features, both
 *    `changes: []` upstream) are deferred subsystems — no teamwork-feat
 *    picker or ally-positioning model exists in this engine. Any feature
 *    that delays, replaces, or spends these slots is `subsystem`.
 * 4. **Stern Gaze**, **Track**, and **Monster Lore** are the base features
 *    most often swapped out at 1st/2nd level. Checked against
 *    `class-features.json`: Track and Monster Lore carry `changes: []`
 *    (nothing to double-count against), but **Stern Gaze carries a real
 *    vendored Change** — `max(1, floor(@class.unlevel / 2))` morale to
 *    `skill.int` (Intimidate) and `skill.sen` (Sense Motive). No archetype
 *    feature below adds a number that reproduces Stern Gaze's own
 *    Intimidate/Sense Motive grant, so replacing it is a pure loss with
 *    nothing here to suppress or double-count.
 * 5. Several 1st-level features ("Guileful Lore", "Deceitful Lore", "Lore of
 *    Escape", "Wild Lore", "Spell Sage", "Disarming Discernment", etc.) share
 *    a clean, recurring shape: "adds her Wisdom [or Charisma] modifier to
 *    [named skill(s)] in addition to the normal ability modifier" — the same
 *    shape as the base class's own vendored Cunning Initiative (`@abilities.
 *    wis.mod` untyped onto `init`, stacking with the existing Dex term). When
 *    the named skill(s) are stated with no further scoping ("on Bluff and
 *    Diplomacy skill checks", full stop), this is extracted as `numeric`
 *    (untyped, formula `@abilities.<mod>.mod`, one `Change` per named skill).
 *    When the same shape instead scopes the bonus to a specific sub-use of
 *    the skill (e.g. Spell Sage's "when attempting to identify a spell ...,
 *    or decipher a scroll" — narrower than Spellcraft as a whole, and would
 *    over-apply to e.g. item-crafting Spellcraft checks), it stays
 *    `situational` instead.
 * 6. A parallel, equally common shape grants a flat **morale** bonus "equal
 *    to half her inquisitor level (minimum +1)" on named skill(s) — same
 *    formula Stern Gaze itself uses. Extracted `numeric` only when the text
 *    states it applies generally ("on all Diplomacy checks"); several
 *    archetypes instead scope this to an *opposed* check against a specific
 *    other skill, or to a narrow creature-type/circumstance, which stays
 *    `situational` (a flat skill Change can't express "only when opposing
 *    Disguise/Stealth" without over-applying to every other Perception use).
 * 7. A handful of features promise a real, unconditional number with no
 *    corresponding target anywhere in `targets.ts` — extra sneak attack
 *    dice, a bonus to *other creatures'* DC to track/detect the inquisitor,
 *    a caster-level bump restricted to domain powers, or a save bonus scoped
 *    to a source/category (magic items, "confusion and insanity effects",
 *    fey spell-like abilities specifically) that doesn't match any
 *    `SAVE_CATEGORIES` key without being either too broad or fabricated.
 *    These are `blocked`, not `situational` — the gap is a missing target,
 *    not an uncheckable condition.
 * 8. `inquisitor:infiltrator:adaptation:3` is a vendored copy-paste error:
 *    its full text is the *ranger* Infiltrator archetype's "Adaptation"
 *    ability verbatim ("The ranger selects...", "This class ability
 *    replaces favored terrain") pasted under the inquisitor Infiltrator
 *    archetype's id. `blocked` — no real inquisitor ability to extract from.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

const HALF_LEVEL_MIN_1 = "max(1, floor(@class.unlevel / 2))";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── inquisitor:abolisher ──
  "inquisitor:abolisher:escape-corruption-s-grasp:5": {
    archetypeId: "inquisitor:abolisher",
    name: "Escape Corruption's Grasp",
    level: 5,
    bucket: "subsystem",
    note: "immediate-action, rounds/day (=level) freedom-of-movement-as-needed grant — a resource-gated immunity, no Change target for 'ignore movement impediments'",
  },
  "inquisitor:abolisher:expose-aberration:2": {
    archetypeId: "inquisitor:abolisher",
    name: "Expose Aberration",
    level: 2,
    bucket: "subsystem",
    note: "at-will detect aberration plus auto-ID-on-hit and a bane activation-timing tweak — detection/utility, no number",
  },
  "inquisitor:abolisher:revealing-gaze:1": {
    archetypeId: "inquisitor:abolisher",
    name: "Revealing Gaze",
    level: 1,
    bucket: "situational",
    note: "real morale bonus (half level, min +1), but scoped to OPPOSED Perception checks specifically against Disguise/Stealth (not general Perception) and additionally granted to adjacent allies — neither scope is expressible without over-applying to unrelated Perception uses",
  },
  "inquisitor:abolisher:sworn-to-purity:1": {
    archetypeId: "inquisitor:abolisher",
    name: "Sworn to Purity",
    level: 1,
    bucket: "subsystem",
    note: "restricts domain choice to a fixed list — domain pick constraint, no number",
  },

  // ── inquisitor:cloaked-wolf ──
  "inquisitor:cloaked-wolf:always-wary:1": {
    archetypeId: "inquisitor:cloaked-wolf",
    name: "Always Wary",
    level: 1,
    bucket: "situational",
    note: "real Wis-mod-to-initiative addition (2nd level), but only 'during any such encounter' (a surprise round involving a Bluff-concealed attack) — a specific-encounter condition the engine can't check",
  },
  "inquisitor:cloaked-wolf:lure-prey:1": {
    archetypeId: "inquisitor:cloaked-wolf",
    name: "Lure Prey",
    level: 1,
    bucket: "numeric",
    note: "morale bonus (half level, min +1) on ALL Disguise and Sleight of Hand checks, unconditional and unscoped — the 'doubles when drawing a hidden weapon via Sleight of Hand' clause is a separate situational rider, dropped",
  },
  "inquisitor:cloaked-wolf:unleashed-fury:3": {
    archetypeId: "inquisitor:cloaked-wolf",
    name: "Unleashed Fury",
    level: 3,
    bucket: "subsystem",
    note: "Quick Draw plus a rotating bonus-feat list from a fixed menu — feat-grant mechanism, no Change",
  },

  // ── inquisitor:cold-iron-warden ──
  "inquisitor:cold-iron-warden:abyssal-scourge:3": {
    archetypeId: "inquisitor:cold-iron-warden",
    name: "Abyssal Scourge",
    level: 3,
    bucket: "subsystem",
    note: "Alignment Channel bonus feat plus a channel-energy-vs-outsiders mechanic, replacing solo tactics and two teamwork-feat slots (class notes 2/3) — channel energy damage isn't a modeled Change target anywhere in this engine",
  },
  "inquisitor:cold-iron-warden:bane:5": {
    archetypeId: "inquisitor:cold-iron-warden",
    name: "Bane",
    level: 5,
    bucket: "situational",
    note: "modifies bane's bonus-damage die count by creature type — bane is activated/pool-gated (class note 2)",
  },
  "inquisitor:cold-iron-warden:favored-judgment:3": {
    archetypeId: "inquisitor:cold-iron-warden",
    name: "Favored Judgment",
    level: 3,
    bucket: "subsystem",
    note: "bonus-feat grant (Favored Judgment, twice), replacing two teamwork-feat slots — feat grant, no Change",
  },
  "inquisitor:cold-iron-warden:track-teleportation:2": {
    archetypeId: "inquisitor:cold-iron-warden",
    name: "Track Teleportation",
    level: 2,
    bucket: "subsystem",
    note: "Survival-check-based teleport-tracing ability, replacing track (base Track carries no vendored changes, so no loss to account for) — one-off skill-check use, not a persistent bonus",
  },
  "inquisitor:cold-iron-warden:translate-telepathy:5": {
    archetypeId: "inquisitor:cold-iron-warden",
    name: "Translate Telepathy",
    level: 5,
    bucket: "subsystem",
    note: "detection-range utility (eavesdrop on telepathy within a scaling radius), replacing discern lies — no Change target for a detection range",
  },

  // ── inquisitor:exarch ──
  "inquisitor:exarch:aura-of-repetition:8": {
    archetypeId: "inquisitor:exarch",
    name: "Aura of Repetition",
    level: 8,
    bucket: "subsystem",
    note: "replaces second judgment with a domain-power-riding enemy debuff aura — judgment swap (class note 1)",
  },
  "inquisitor:exarch:aura-of-reversion:16": {
    archetypeId: "inquisitor:exarch",
    name: "Aura of Reversion",
    level: 16,
    bucket: "subsystem",
    note: "replaces third judgment with an enemy-targeted sicken/nauseate aura — judgment swap (class note 1)",
  },
  "inquisitor:exarch:detect-chaos:2": {
    archetypeId: "inquisitor:exarch",
    name: "Detect Chaos",
    level: 2,
    bucket: "subsystem",
    note: "reflavor of detect alignment (detect chaos at will) — detection utility, no number",
  },
  "inquisitor:exarch:double-jeopardy:12": {
    archetypeId: "inquisitor:exarch",
    name: "Double Jeopardy",
    level: 12,
    bucket: "situational",
    note: "extends fearsome jurist (replaces greater bane) to imbue a second weapon — bane-family weapon ability, activated (class note 2)",
  },
  "inquisitor:exarch:fearsome-jurist:5": {
    archetypeId: "inquisitor:exarch",
    name: "Fearsome Jurist",
    level: 5,
    bucket: "situational",
    note: "'functions as and replaces bane' with a chaotic-crit-range weapon ability — bane-family, activated (class note 2)",
  },
  "inquisitor:exarch:inflexible-will:1": {
    archetypeId: "inquisitor:exarch",
    name: "Inflexible Will",
    level: 1,
    bucket: "blocked",
    note: "+2 save bonus vs. 'confusion and insanity effects and effects with the chaotic descriptor', replacing monster lore (no vendored number to double-count) — no SAVE_CATEGORIES key matches this scope; 'compulsion' is broader (covers dominate/hold person etc., which aren't confusion/insanity effects) and would over-apply, and no category models alignment descriptors at all",
  },

  // ── inquisitor:exorcist ──
  "inquisitor:exorcist:closed-mind:17": {
    archetypeId: "inquisitor:exorcist",
    name: "Closed Mind",
    level: 17,
    bucket: "subsystem",
    note: "immunity to compulsion and possession, replacing slayer (base Slayer carries no vendored changes) — binary immunity, no Change target",
  },
  "inquisitor:exorcist:verdict-of-anathema:20": {
    archetypeId: "inquisitor:exorcist",
    name: "Verdict of Anathema",
    level: 20,
    bucket: "subsystem",
    note: "replaces true judgment with an enemy-targeted exorcism-verdict trigger — judgment swap, enemy effect only",
  },
  "inquisitor:exorcist:verdict-of-exile:16": {
    archetypeId: "inquisitor:exorcist",
    name: "Verdict of Exile",
    level: 16,
    bucket: "subsystem",
    note: "replaces third judgment with an enemy-targeted daze/dismissal trigger — judgment swap, enemy effect only",
  },
  "inquisitor:exorcist:verdict-of-exorcism:8": {
    archetypeId: "inquisitor:exorcist",
    name: "Verdict of Exorcism",
    level: 8,
    bucket: "subsystem",
    note: "replaces second judgment with an enemy-targeted daze/exorcism trigger — judgment swap, enemy effect only",
  },

  // ── inquisitor:expulsionist ──
  "inquisitor:expulsionist:expel-spirit:1": {
    archetypeId: "inquisitor:expulsionist",
    name: "Expel Spirit",
    level: 1,
    bucket: "subsystem",
    note: "Alignment Channel/Turn Undead bonus feats plus a channel-energy pool — channel energy isn't a modeled Change target",
  },
  "inquisitor:expulsionist:expulsionist-lore:1": {
    archetypeId: "inquisitor:expulsionist",
    name: "Expulsionist Lore",
    level: 1,
    bucket: "situational",
    note: "real half-level (min +1) bonus, but split across three narrow sub-uses ('skill checks to notice haunts/incorporeal', Knowledge (religion) to identify them specifically, Sense Motive to detect possession/curses specifically) — none is a general skill bonus, same posture as Monster Lore's own unmodeled shape",
  },
  "inquisitor:expulsionist:spirit-sleuth:5": {
    archetypeId: "inquisitor:expulsionist",
    name: "Spirit Sleuth",
    level: 5,
    bucket: "subsystem",
    note: "a one-off free-action Sense Motive check to divine a neutralization method — no bonus granted, just an available check",
  },

  // ── inquisitor:faith-hunter ──
  "inquisitor:faith-hunter:enemy-revealed:2": {
    archetypeId: "inquisitor:faith-hunter",
    name: "Enemy Revealed",
    level: 2,
    bucket: "subsystem",
    note: "makes a detected sworn enemy's alignment aura visibly glow — a detection rider, no number",
  },
  "inquisitor:faith-hunter:sworn-enemy:1": {
    archetypeId: "inquisitor:faith-hunter",
    name: "Sworn Enemy",
    level: 1,
    bucket: "situational",
    note: "at-will detect-evil-style detection (no number) plus a real +4 sacred attack / +1/2 level sacred damage smite, but the smite is a limited-use (1-4/day) swift action scoped to one chosen alignment target — activated and enemy-scoped",
  },

  // ── inquisitor:green-faith-marshal ──
  "inquisitor:green-faith-marshal:nature-s-ally:5": {
    archetypeId: "inquisitor:green-faith-marshal",
    name: "Nature's Ally",
    level: 5,
    bucket: "subsystem",
    note: "commune with nature 1/week — spell-like ability grant, no number",
  },
  "inquisitor:green-faith-marshal:power-of-nature:1": {
    archetypeId: "inquisitor:green-faith-marshal",
    name: "Power of Nature",
    level: 1,
    bucket: "subsystem",
    note: "domain restricted to a nature-themed list, replacing stern gaze — the character loses Stern Gaze's vendored Intimidate/Sense Motive morale bonus, but nothing here replaces it with a number to double-count",
  },
  "inquisitor:green-faith-marshal:wild-lore:1": {
    archetypeId: "inquisitor:green-faith-marshal",
    name: "Wild Lore",
    level: 1,
    bucket: "numeric",
    note: "adds Wis modifier to Knowledge (nature), unconditional and unscoped, in addition to the normal Int modifier — clean Cunning-Initiative-shaped grant (class note 5)",
  },
  "inquisitor:green-faith-marshal:wild-step:11": {
    archetypeId: "inquisitor:green-faith-marshal",
    name: "Wild Step",
    level: 11,
    bucket: "subsystem",
    note: "ignore natural difficult terrain, replacing Stalwart (vendored changes: []) — movement rule, no Change target",
  },

  // ── inquisitor:heretic ──
  "inquisitor:heretic:hide-tracks:1": {
    archetypeId: "inquisitor:heretic",
    name: "Hide Tracks",
    level: 1,
    bucket: "blocked",
    note: "-5 penalty on OTHER creatures' rolls to track the heretic — a real, unconditional number, but no target in targets.ts expresses 'the DC/penalty for others tracking you'",
  },
  "inquisitor:heretic:lore-of-escape:1": {
    archetypeId: "inquisitor:heretic",
    name: "Lore of Escape",
    level: 1,
    bucket: "numeric",
    note: "adds Wis modifier to Bluff and Stealth, unconditional and unscoped, replacing monster lore (vendored changes: [], nothing to double-count) — class note 5",
  },

  // ── inquisitor:hexenhammer ──
  "inquisitor:hexenhammer:dark-trade:3": {
    archetypeId: "inquisitor:hexenhammer",
    name: "Dark Trade",
    level: 3,
    bucket: "subsystem",
    note: "trades a judgment use for a hex use — resource-conversion mechanic, no flat number",
  },
  "inquisitor:hexenhammer:hexcrafter:3": {
    archetypeId: "inquisitor:hexenhammer",
    name: "Hexcrafter",
    level: 3,
    bucket: "subsystem",
    note: "grants witch hexes from a fixed list, scaling in count — hex subsystem, not modeled for inquisitor",
  },
  "inquisitor:hexenhammer:pride-and-penance:1": {
    archetypeId: "inquisitor:hexenhammer",
    name: "Pride and Penance",
    level: 1,
    bucket: "subsystem",
    note: "a drawback (temporary loss of domain powers/cunning mind after using witch magic) rather than a bonus — no number granted",
  },
  "inquisitor:hexenhammer:witchcraft:5": {
    archetypeId: "inquisitor:hexenhammer",
    name: "Witchcraft",
    level: 5,
    bucket: "subsystem",
    note: "spell-swap mechanic (witch spell in place of a known spell) — spells-known aren't a Change target",
  },
  "inquisitor:hexenhammer:withering-gaze:1": {
    archetypeId: "inquisitor:hexenhammer",
    name: "Withering Gaze",
    level: 1,
    bucket: "subsystem",
    note: "replaces a successful demoralize's shaken condition with the witch evil eye hex effect — swaps WHICH effect triggers, adds no new number",
  },

  // ── inquisitor:iconoclast ──
  "inquisitor:iconoclast:destroy-artifact:20": {
    archetypeId: "inquisitor:iconoclast",
    name: "Destroy Artifact",
    level: 20,
    bucket: "subsystem",
    note: "week-long ritual plus a DC 30 Spellcraft check to destroy a minor artifact, replacing true judgment — unique utility, no number",
  },
  "inquisitor:iconoclast:detect-magic:2": {
    archetypeId: "inquisitor:iconoclast",
    name: "Detect Magic",
    level: 2,
    bucket: "subsystem",
    note: "reflavor of detect alignment (detect magic at will) — detection utility, no number",
  },
  "inquisitor:iconoclast:dispelling-attack:5": {
    archetypeId: "inquisitor:iconoclast",
    name: "Dispelling Attack",
    level: 5,
    bucket: "subsystem",
    note: "1/day dispel-on-hit, replacing discern lies — activated ability, no flat number",
  },
  "inquisitor:iconoclast:negating-critical:14": {
    archetypeId: "inquisitor:iconoclast",
    name: "Negating Critical",
    level: 14,
    bucket: "subsystem",
    note: "crit rider forcing a save on the TARGET to keep using magic items, replacing exploit weakness — enemy-targeted effect, not the character's own number",
  },
  "inquisitor:iconoclast:shake-effects:1": {
    archetypeId: "inquisitor:iconoclast",
    name: "Shake Effects",
    level: 1,
    bucket: "blocked",
    note: "+2 save bonus vs. 'effects that come from a magic item', replacing monster lore (nothing to double-count) — no SAVE_CATEGORIES key models a bonus scoped by SOURCE-is-a-magic-item; none of spell/sla/su fit (those are caster-sourced, not item-sourced)",
  },

  // ── inquisitor:immolator ──
  "inquisitor:immolator:burnt-offering:5": {
    archetypeId: "inquisitor:immolator",
    name: "Burnt Offering",
    level: 5,
    bucket: "situational",
    note: "imbues a weapon with flaming (later flaming burst), replacing bane and greater bane — bane-family weapon ability, activated (class note 2)",
  },
  "inquisitor:immolator:judgment-by-fire:20": {
    archetypeId: "inquisitor:immolator",
    name: "Judgment by Fire",
    level: 20,
    bucket: "subsystem",
    note: "modifies true judgment into a fire-damage save-or-die attack — judgment swap, enemy-targeted effect",
  },
  "inquisitor:immolator:servant-of-the-flame:1": {
    archetypeId: "inquisitor:immolator",
    name: "Servant of the Flame",
    level: 1,
    bucket: "blocked",
    note: "+1 caster level to domain powers specifically (conditioned on choosing the Fire domain) — 'cl' has no applied target anywhere in this engine (targets.ts unapplied list), and this is narrower still (domain powers only, not overall CL)",
  },

  // ── inquisitor:infiltrator ──
  "inquisitor:infiltrator:adaptation:3": {
    archetypeId: "inquisitor:infiltrator",
    name: "Adaptation",
    level: 3,
    bucket: "blocked",
    note: "vendored copy-paste error: the description is verbatim the RANGER Infiltrator archetype's 'Adaptation' ability ('The ranger selects...', 'replaces favored terrain') pasted under the inquisitor Infiltrator archetype's id — not a real inquisitor ability to extract from (class note 8)",
  },
  "inquisitor:infiltrator:forbidden-lore:2": {
    archetypeId: "inquisitor:infiltrator",
    name: "Forbidden Lore",
    level: 2,
    bucket: "subsystem",
    note: "lifts the opposed-alignment spell restriction, replacing track (vendored changes: [], nothing lost) — spell-list rule, no number",
  },
  "inquisitor:infiltrator:guileful-lore:1": {
    archetypeId: "inquisitor:infiltrator",
    name: "Guileful Lore",
    level: 1,
    bucket: "numeric",
    note: "adds Wis modifier to Bluff and Diplomacy, unconditional and unscoped, replacing monster lore (nothing to double-count) — class note 5",
  },
  "inquisitor:infiltrator:master-of-disguise:1": {
    archetypeId: "inquisitor:infiltrator",
    name: "Master of Disguise",
    level: 1,
    bucket: "situational",
    note: "reduces specific Disguise-check penalties (gender/race/age/size mismatch) by 2 and speeds up disguising, replacing trapfinding — a per-circumstance penalty adjustment, not a flat skill bonus",
  },
  "inquisitor:infiltrator:mimic-mastery:2": {
    archetypeId: "inquisitor:infiltrator",
    name: "Mimic Mastery",
    level: 2,
    bucket: "situational",
    note: "+10 Disguise bonus, but scoped to using disguise self or a polymorph extract specifically, replacing poison resistance — a chosen-spell condition the engine can't check",
  },
  "inquisitor:infiltrator:misdirection:1": {
    archetypeId: "inquisitor:infiltrator",
    name: "Misdirection",
    level: 1,
    bucket: "subsystem",
    note: "detects as a chosen alignment (misdirection-as-prepared), replacing stern gaze (loses its vendored Intimidate/Sense Motive bonus, nothing here to double-count) — detection spoof, no number",
  },
  "inquisitor:infiltrator:necessary-lies:5": {
    archetypeId: "inquisitor:infiltrator",
    name: "Necessary Lies",
    level: 5,
    bucket: "blocked",
    note: "adds class level to saves vs. 'abilities that detect lies or reveal or force the truth', replacing discern lies — no SAVE_CATEGORIES key models truth-detection/compulsion-to-honesty as a category",
  },
  "inquisitor:infiltrator:voice-mimicry:2": {
    archetypeId: "inquisitor:infiltrator",
    name: "Voice Mimicry",
    level: 2,
    bucket: "situational",
    note: "a whole modifier table for a special voice-mimicry Disguise check, replacing poison lore — table-based mechanic, not a flat stat bonus",
  },

  // ── inquisitor:keeper-of-construct ──
  "inquisitor:keeper-of-construct:construct-influence:1": {
    archetypeId: "inquisitor:keeper-of-construct",
    name: "Construct Influence",
    level: 1,
    bucket: "situational",
    note: "real Intimidate bonus (half level, min +1), but scoped to demoralizing constructs specifically — an enemy-type condition the engine can't check",
  },
  "inquisitor:keeper-of-construct:construct-lore:1": {
    archetypeId: "inquisitor:keeper-of-construct",
    name: "Construct Lore",
    level: 1,
    bucket: "situational",
    note: "2xWis+Int bonus on Knowledge checks to identify constructs specifically — same shape and same gap as the base Monster Lore feature it doesn't even replace (ambiguous which Knowledge skill, scoped to one creature type)",
  },
  "inquisitor:keeper-of-construct:penetrating-blows:1": {
    archetypeId: "inquisitor:keeper-of-construct",
    name: "Penetrating Blows",
    level: 1,
    bucket: "situational",
    note: "treats weapons as adamantine (later ignoring flat DR/hardness) vs. constructs specifically — an enemy-type-scoped DR-bypass effect, not the character's own stat",
  },
  "inquisitor:keeper-of-construct:wrest-control:14": {
    archetypeId: "inquisitor:keeper-of-construct",
    name: "Wrest Control",
    level: 14,
    bucket: "subsystem",
    note: "suggestion-as-command against a construct, replacing exploit weakness — enemy-targeted effect, no character number",
  },

  // ── inquisitor:keeper-of-the-current ──
  "inquisitor:keeper-of-the-current:marine-magic:5": {
    archetypeId: "inquisitor:keeper-of-the-current",
    name: "Marine Magic",
    level: 5,
    bucket: "subsystem",
    note: "spell-swap mechanic (water-descriptor spells) — spells-known aren't a Change target",
  },
  "inquisitor:keeper-of-the-current:rudderless-attack:5": {
    archetypeId: "inquisitor:keeper-of-the-current",
    name: "Rudderless Attack",
    level: 5,
    bucket: "subsystem",
    note: "halves a bane-damaged target's swim speed — an enemy debuff, not the character's own stat",
  },
  "inquisitor:keeper-of-the-current:underwater-hunter:2": {
    archetypeId: "inquisitor:keeper-of-the-current",
    name: "Underwater Hunter",
    level: 2,
    bucket: "situational",
    note: "adds level to Survival checks to track underwater specifically — the text explicitly denies the bonus out of the water, a state the engine can't check",
  },

  // ── inquisitor:kinslayer ──
  "inquisitor:kinslayer:greater-brand:1": {
    archetypeId: "inquisitor:kinslayer",
    name: "Greater Brand",
    level: 1,
    bucket: "subsystem",
    note: "modifies the slayer's brand judgment via a menu of upgrades, spending teamwork-feat slots to do so — judgment modification (class note 1)",
  },
  "inquisitor:kinslayer:undead-sense:2": {
    archetypeId: "inquisitor:kinslayer",
    name: "Undead Sense",
    level: 2,
    bucket: "subsystem",
    note: "at-will detect undead plus a monster-lore synergy vs. vampires — detection utility, no flat number",
  },

  // ── inquisitor:living-grimoire ──
  "inquisitor:living-grimoire:blessed-script:5": {
    archetypeId: "inquisitor:living-grimoire",
    name: "Blessed Script",
    level: 5,
    bucket: "subsystem",
    note: "tattoos spells for spell-like-ability use — spell-access mechanic, no number",
  },
  "inquisitor:living-grimoire:holy-book:1": {
    archetypeId: "inquisitor:living-grimoire",
    name: "Holy Book",
    level: 1,
    bucket: "subsystem",
    note: "bonds a specific book as a weapon (base damage as a light mace, +1 attack, proficiency) — a bonded-item grant like magus's arcane-bond entries; the embedded +1 attack rides one specific item instance, not extracted",
  },
  "inquisitor:living-grimoire:sacred-word:1": {
    archetypeId: "inquisitor:living-grimoire",
    name: "Sacred Word",
    level: 1,
    bucket: "subsystem",
    note: "warpriest sacred-weapon mechanic applied to the bonded holy book (scaling enhancement bonus, special abilities) — rides the same one-item bonded mechanic as Holy Book above, resource-gated (rounds/day)",
  },
  "inquisitor:living-grimoire:spells:1": {
    archetypeId: "inquisitor:living-grimoire",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "swaps spellcasting to Int-based, warpriest-style slots — spells known/slots aren't a Change target",
  },
  "inquisitor:living-grimoire:word-of-god:20": {
    archetypeId: "inquisitor:living-grimoire",
    name: "Word of God",
    level: 20,
    bucket: "subsystem",
    note: "limited-use attack-plus-save-or-die effect — enemy-targeted activated ability, no character number",
  },

  // ── inquisitor:monster-tactician ──
  "inquisitor:monster-tactician:summon-monster:1": {
    archetypeId: "inquisitor:monster-tactician",
    name: "Summon Monster",
    level: 1,
    bucket: "subsystem",
    note: "summon monster as a scaling spell-like ability — summoning subsystem, no Change target",
  },
  "inquisitor:monster-tactician:summon-tactics:5": {
    archetypeId: "inquisitor:monster-tactician",
    name: "Summon Tactics",
    level: 5,
    bucket: "subsystem",
    note: "grants teamwork feats to summoned creatures, replacing several judgment/slayer slots — teamwork-feat mechanic (class note 3)",
  },

  // ── inquisitor:oathkeeper ──
  "inquisitor:oathkeeper:divine-witness:1": {
    archetypeId: "inquisitor:oathkeeper",
    name: "Divine Witness",
    level: 1,
    bucket: "subsystem",
    note: "a unique contract-sealing curse mechanic — no Change target for any part of it",
  },
  "inquisitor:oathkeeper:oathbreaker-s-scourge:2": {
    archetypeId: "inquisitor:oathkeeper",
    name: "Oathbreaker's Scourge",
    level: 2,
    bucket: "situational",
    note: "real +4 sacred/profane bonus on Diplomacy/Survival plus an effective-level bump to a judgment, replacing track, but scoped to hunting one evidence-backed contract-breaker specifically — a per-target condition the engine can't check",
  },

  // ── inquisitor:preacher ──
  "inquisitor:preacher:determination:3": {
    archetypeId: "inquisitor:preacher",
    name: "Determination",
    level: 3,
    bucket: "subsystem",
    note: "1+/day reroll/AC-boost/ally-warn menu, replacing solo tactics and spending teamwork-feat slots for extra uses — activated ability suite (class note 3)",
  },

  // ── inquisitor:ravener-hunter ──
  "inquisitor:ravener-hunter:charged-by-nature:1": {
    archetypeId: "inquisitor:ravener-hunter",
    name: "Charged by Nature",
    level: 1,
    bucket: "subsystem",
    note: "grants oracle mystery revelations — oracle-mystery subsystem not modeled for inquisitor",
  },
  "inquisitor:ravener-hunter:demon-hunter:3": {
    archetypeId: "inquisitor:ravener-hunter",
    name: "Demon Hunter",
    level: 3,
    bucket: "situational",
    note: "bonus feat plus real Knowledge/attack/SR-check bonuses, but all scoped to creatures recognized as demon-subdomain worshipers specifically — an enemy-category condition the engine can't check",
  },
  "inquisitor:ravener-hunter:holy-magic:1": {
    archetypeId: "inquisitor:ravener-hunter",
    name: "Holy Magic",
    level: 1,
    bucket: "subsystem",
    note: "adds good-descriptor cleric spells to the spell list — spell-list addition, no Change-shaped number",
  },
  "inquisitor:ravener-hunter:solo-tactics:6": {
    archetypeId: "inquisitor:ravener-hunter",
    name: "Solo tactics",
    level: 6,
    bucket: "subsystem",
    note: "delays solo tactics from 3rd to 6th level — solo tactics itself is a deferred subsystem (class note 3)",
  },

  // ── inquisitor:reaper-of-secrets ──
  "inquisitor:reaper-of-secrets:bound-by-secrecy:1": {
    archetypeId: "inquisitor:reaper-of-secrets",
    name: "Bound by Secrecy",
    level: 1,
    bucket: "subsystem",
    note: "fixes the deity to Norgorber — deity restriction, no number",
  },
  "inquisitor:reaper-of-secrets:deceitful-lore:1": {
    archetypeId: "inquisitor:reaper-of-secrets",
    name: "Deceitful Lore",
    level: 1,
    bucket: "numeric",
    note: "adds Wis modifier to Bluff and Disguise, unconditional and unscoped, replacing monster lore (nothing to double-count) — class note 5",
  },
  "inquisitor:reaper-of-secrets:mind-game-tactics:3": {
    archetypeId: "inquisitor:reaper-of-secrets",
    name: "Mind-Game Tactics",
    level: 3,
    bucket: "subsystem",
    note: "treats a gazed-upon creature as an ally for teamwork-feat purposes — teamwork-feat mechanic, no Change",
  },
  "inquisitor:reaper-of-secrets:soul-piercing-gaze:1": {
    archetypeId: "inquisitor:reaper-of-secrets",
    name: "Soul-Piercing Gaze",
    level: 1,
    bucket: "situational",
    note: "real insight bonus (half level, min +1) on Perception/Sense Motive, but only vs. a single creature focused via swift action, replacing stern gaze — an activated, single-target condition",
  },

  // ── inquisitor:relic-hunter ──
  "inquisitor:relic-hunter:deific-focus:1": {
    archetypeId: "inquisitor:relic-hunter",
    name: "Deific Focus",
    level: 1,
    bucket: "subsystem",
    note: "occultist focus-power resource mechanic — deferred subsystem, no flat number",
  },
  "inquisitor:relic-hunter:relics:1": {
    archetypeId: "inquisitor:relic-hunter",
    name: "Relics",
    level: 1,
    bucket: "subsystem",
    note: "occultist implement/relic-school access — pick-list subsystem, not modeled",
  },
  "inquisitor:relic-hunter:spells:1": {
    archetypeId: "inquisitor:relic-hunter",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "restricts spellcasting to chosen relic schools — spell-list mechanic, no Change-shaped number",
  },

  // ── inquisitor:royal-accuser ──
  "inquisitor:royal-accuser:detect-monsters-and-secrets:2": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Detect Monsters and Secrets",
    level: 2,
    bucket: "subsystem",
    note: "at-will detect aberration/secret doors/undead — detection utility, no number",
  },
  "inquisitor:royal-accuser:favored-enemy:3": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Favored Enemy",
    level: 3,
    bucket: "subsystem",
    note: "grants ranger favored enemy from a fixed list — enemy-type-scoped attack/damage/skill bonuses aren't modeled by any Change target in this engine",
  },
  "inquisitor:royal-accuser:final-sway:18": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Final Sway",
    level: 18,
    bucket: "subsystem",
    note: "Ultimate Intrigue influence-system interaction — that subsystem isn't modeled at all",
  },
  "inquisitor:royal-accuser:greater-detect-magic:12": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Greater Detect Magic",
    level: 12,
    bucket: "subsystem",
    note: "at-will greater detect magic — detection utility, no number",
  },
  "inquisitor:royal-accuser:informed-hunch:6": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Informed Hunch",
    level: 6,
    bucket: "subsystem",
    note: "1/day augury-style investigation check — no bonus to the character's own numbers",
  },
  "inquisitor:royal-accuser:meticulous-inspection:1": {
    archetypeId: "inquisitor:royal-accuser",
    name: "Meticulous Inspection",
    level: 1,
    bucket: "numeric",
    note: "morale bonus (half level, min +1) on ALL Perception checks, unconditional and unscoped — same shape as Stern Gaze's own formula, class note 6",
  },

  // ── inquisitor:sacred-huntsmaster ──
  "inquisitor:sacred-huntsmaster:animal-companion:1": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Animal Companion",
    level: 1,
    bucket: "subsystem",
    note: "hunter-style animal companion, replacing judgment 1/day — companion subsystem, no character-facing Change",
  },
  "inquisitor:sacred-huntsmaster:animal-focus:4": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Animal Focus",
    level: 4,
    bucket: "subsystem",
    note: "hunter's animal focus, replacing later judgment iterations — activated ability suite, no flat number",
  },
  "inquisitor:sacred-huntsmaster:greater-empathic-link:20": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Greater Empathic Link",
    level: 20,
    bucket: "subsystem",
    note: "extends companion empathic-link range, replacing true judgment — companion utility, no number",
  },
  "inquisitor:sacred-huntsmaster:hunter-tactics:3": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Hunter Tactics",
    level: 3,
    bucket: "subsystem",
    note: "shares teamwork feats with the companion, replacing solo tactics — teamwork-feat mechanic (class note 3)",
  },
  "inquisitor:sacred-huntsmaster:improved-empathic-link:8": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Improved Empathic Link",
    level: 8,
    bucket: "subsystem",
    note: "empathic link plus see-through-companion's-eyes, replacing second judgment — companion utility, no number",
  },
  "inquisitor:sacred-huntsmaster:raise-animal-companion:16": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Raise Animal Companion",
    level: 16,
    bucket: "subsystem",
    note: "raise-dead-style spell-like ability, replacing third judgment — companion utility, no number",
  },
  "inquisitor:sacred-huntsmaster:second-animal-focus:17": {
    archetypeId: "inquisitor:sacred-huntsmaster",
    name: "Second Animal Focus",
    level: 17,
    bucket: "subsystem",
    note: "doubles the animal-focus aspect count, replacing slayer — companion/self-buff mechanic, no flat number",
  },

  // ── inquisitor:sanctified-slayer ──
  "inquisitor:sanctified-slayer:sneak-attack:4": {
    archetypeId: "inquisitor:sanctified-slayer",
    name: "Sneak Attack",
    level: 4,
    bucket: "blocked",
    note: "real, scaling sneak-attack dice (1d6, +1d6/3 levels), replacing later judgment iterations — extra precision-damage dice aren't a `Change` target anywhere in this engine (sneak attack dice are a separate hardcoded tables.ts/DerivedClassFeature mechanism this pipeline can't hook into)",
  },
  "inquisitor:sanctified-slayer:studied-target:1": {
    archetypeId: "inquisitor:sanctified-slayer",
    name: "Studied Target",
    level: 1,
    bucket: "subsystem",
    note: "grants the slayer's studied target ability, replacing judgment 1/day — slayer subsystem, not modeled",
  },
  "inquisitor:sanctified-slayer:talented-slayer:8": {
    archetypeId: "inquisitor:sanctified-slayer",
    name: "Talented Slayer",
    level: 8,
    bucket: "subsystem",
    note: "grants slayer/rogue talents from a pick-list, replacing several judgment/slayer slots — talent subsystem",
  },

  // ── inquisitor:secret-seeker ──
  "inquisitor:secret-seeker:detect-mind:5": {
    archetypeId: "inquisitor:secret-seeker",
    name: "Detect Mind",
    level: 5,
    bucket: "subsystem",
    note: "detect-thoughts-family ability, rounds/day — detection resource, no flat number",
  },
  "inquisitor:secret-seeker:occult-lore:1": {
    archetypeId: "inquisitor:secret-seeker",
    name: "Occult Lore",
    level: 1,
    bucket: "subsystem",
    note: "grants two occult skill unlocks — occult-adventures subsystem not modeled",
  },
  "inquisitor:secret-seeker:seek-mind:14": {
    archetypeId: "inquisitor:secret-seeker",
    name: "Seek Mind",
    level: 14,
    bucket: "subsystem",
    note: "seek-thoughts-style ability built on detect mind — detection utility, no number",
  },

  // ── inquisitor:sin-eater ──
  "inquisitor:sin-eater:burden-of-sin:14": {
    archetypeId: "inquisitor:sin-eater",
    name: "Burden of Sin",
    level: 14,
    bucket: "subsystem",
    note: "transfers an affliction/condition to herself, replacing exploit weakness — unique transfer mechanic, no Change target",
  },
  "inquisitor:sin-eater:eat-sin:1": {
    archetypeId: "inquisitor:sin-eater",
    name: "Eat Sin",
    level: 1,
    bucket: "subsystem",
    note: "scaling on-kill healing (1d8+level, capped) — an event-triggered heal, no 'healing on kill' Change target",
  },
  "inquisitor:sin-eater:speak-with-dead:6": {
    archetypeId: "inquisitor:sin-eater",
    name: "Speak with Dead",
    level: 6,
    bucket: "subsystem",
    note: "speak with dead off an eaten sin, replacing a bonus teamwork feat — spell-like ability, no flat number",
  },
  "inquisitor:sin-eater:teamwork-feat:3": {
    archetypeId: "inquisitor:sin-eater",
    name: "Teamwork feat",
    level: 3,
    bucket: "subsystem",
    note: "reflavor of the base Teamwork Feat cadence (itself vendored changes: []) — feat-grant mechanism, no Change",
  },

  // ── inquisitor:spellbreaker ──
  "inquisitor:spellbreaker:defense-against-magic:3": {
    archetypeId: "inquisitor:spellbreaker",
    name: "Defense against Magic",
    level: 3,
    bucket: "situational",
    note: "real, scaling save bonus vs. arcane spells of chosen wizard schools, replacing all bonus teamwork feats, but there's no build field tracking WHICH schools were chosen (same posture as Myrmidarch's multi-group Weapon Training in the magus pass) — a blanket bonus would over-apply",
  },
  "inquisitor:spellbreaker:foil-casting:3": {
    archetypeId: "inquisitor:spellbreaker",
    name: "Foil Casting",
    level: 3,
    bucket: "subsystem",
    note: "raises an OPPONENT's cast-defensively/concentration DC, replacing solo tactics — the number belongs to an enemy's check, not the character's own stat",
  },
  "inquisitor:spellbreaker:impervious:20": {
    archetypeId: "inquisitor:spellbreaker",
    name: "Impervious",
    level: 20,
    bucket: "subsystem",
    note: "immunity to one arcane school, replacing final judgment — binary immunity, no Change target",
  },
  "inquisitor:spellbreaker:strong-willed:1": {
    archetypeId: "inquisitor:spellbreaker",
    name: "Strong-Willed",
    level: 1,
    bucket: "subsystem",
    note: "roll-twice-take-best on Will vs. mind-affecting, replacing monster lore — no Change target for a reroll mechanic",
  },

  // ── inquisitor:suit-seeker ──
  "inquisitor:suit-seeker:domain:1": {
    archetypeId: "inquisitor:suit-seeker",
    name: "Domain",
    level: 1,
    bucket: "subsystem",
    note: "restricts domain/inquisition choice to a fixed list — domain pick constraint, no number",
  },
  "inquisitor:suit-seeker:eye-of-the-harrow:2": {
    archetypeId: "inquisitor:suit-seeker",
    name: "Eye of the Harrow",
    level: 2,
    bucket: "situational",
    note: "real +1 sacred attack/damage bonus, but conditioned on a drawn harrow card matching an enemy's alignment — a card-draw and enemy-alignment condition the engine can't check",
  },
  "inquisitor:suit-seeker:improvised-array:1": {
    archetypeId: "inquisitor:suit-seeker",
    name: "Improvised Array",
    level: 1,
    bucket: "subsystem",
    note: "reworks judgment activation around drawn harrow cards (effective-level boosts, ability-damage immunity) — judgment modification (class note 1)",
  },
  "inquisitor:suit-seeker:unravel-array:20": {
    archetypeId: "inquisitor:suit-seeker",
    name: "Unravel Array",
    level: 20,
    bucket: "subsystem",
    note: "limited-use ability-score-to-0 effect on a target, replacing the last judgment slot — enemy-targeted, no character number",
  },

  // ── inquisitor:sworn-of-the-eldest ──
  "inquisitor:sworn-of-the-eldest:disarming-discernment:1": {
    archetypeId: "inquisitor:sworn-of-the-eldest",
    name: "Disarming Discernment",
    level: 1,
    bucket: "numeric",
    note: "adds Cha modifier to Sense Motive, unconditional and unscoped, in addition to the normal Wis modifier — class note 5",
  },
  "inquisitor:sworn-of-the-eldest:domain:1": {
    archetypeId: "inquisitor:sworn-of-the-eldest",
    name: "Domain",
    level: 1,
    bucket: "subsystem",
    note: "restricts deity/domain choice to the Eldest — domain pick constraint, no number",
  },
  "inquisitor:sworn-of-the-eldest:feytongue:1": {
    archetypeId: "inquisitor:sworn-of-the-eldest",
    name: "Feytongue",
    level: 1,
    bucket: "numeric",
    note: "morale bonus (half level, min +1) on Bluff and Diplomacy, unconditional and unscoped — class note 6",
  },
  "inquisitor:sworn-of-the-eldest:feywatcher:3": {
    archetypeId: "inquisitor:sworn-of-the-eldest",
    name: "Feywatcher",
    level: 3,
    bucket: "blocked",
    note: "grants the druid's Resist Nature's Lure (+4 vs. spell-like abilities of fey specifically) — no SAVE_CATEGORIES key matches a source-plus-creature-type scope this narrow; 'sla' alone is every spell-like ability regardless of source and would badly over-apply",
  },
  "inquisitor:sworn-of-the-eldest:magic-of-the-eldest:3": {
    archetypeId: "inquisitor:sworn-of-the-eldest",
    name: "Magic of the Eldest",
    level: 3,
    bucket: "subsystem",
    note: "bonus domain spell slot plus its known spell — spells-known/slots aren't a Change target",
  },

  // ── inquisitor:tactical-leader ──
  "inquisitor:tactical-leader:battle-acumen:14": {
    archetypeId: "inquisitor:tactical-leader",
    name: "Battle Acumen",
    level: 14,
    bucket: "subsystem",
    note: "shares judgment benefits with one ally — judgment-sharing mechanic (class note 1)",
  },
  "inquisitor:tactical-leader:leader-s-words:1": {
    archetypeId: "inquisitor:tactical-leader",
    name: "Leader's Words",
    level: 1,
    bucket: "numeric",
    note: "morale bonus (half level, min +1) on ALL Diplomacy checks, unconditional and unscoped — class note 6",
  },
  "inquisitor:tactical-leader:tactician:3": {
    archetypeId: "inquisitor:tactical-leader",
    name: "Tactician",
    level: 3,
    bucket: "subsystem",
    note: "shares teamwork feats with allies in a radius — teamwork-feat mechanic, no Change",
  },

  // ── inquisitor:traceless-operative ──
  "inquisitor:traceless-operative:conceal-evidence:1": {
    archetypeId: "inquisitor:traceless-operative",
    name: "Conceal Evidence",
    level: 1,
    bucket: "subsystem",
    note: "a Disguise/Stealth-based scene-evidence-altering use-case — situational skill USE, not a flat bonus to a skill",
  },
  "inquisitor:traceless-operative:improved-uncanny-dodge:12": {
    archetypeId: "inquisitor:traceless-operative",
    name: "Improved Uncanny Dodge",
    level: 12,
    bucket: "subsystem",
    note: "rogue's improved uncanny dodge (can't be flanked below a level threshold) — binary defensive ability, no Change target",
  },
  "inquisitor:traceless-operative:trackless:2": {
    archetypeId: "inquisitor:traceless-operative",
    name: "Trackless",
    level: 2,
    bucket: "blocked",
    note: "raises the DC for OTHERS to track the operative by half her level — a real, unconditional number, but no target expresses 'DC for others tracking you' (same gap as Hide Tracks)",
  },
  "inquisitor:traceless-operative:uncanny-dodge:5": {
    archetypeId: "inquisitor:traceless-operative",
    name: "Uncanny Dodge",
    level: 5,
    bucket: "subsystem",
    note: "rogue's uncanny dodge (can't be flat-footed / lose Dex to invisible attackers) — binary defensive ability, no Change target",
  },

  // ── inquisitor:umbral-stalker ──
  "inquisitor:umbral-stalker:dark-descent:1": {
    archetypeId: "inquisitor:umbral-stalker",
    name: "Dark Descent",
    level: 1,
    bucket: "subsystem",
    note: "grants the Darkness domain with the Night subdomain — domain grant, no number",
  },
  "inquisitor:umbral-stalker:deadly-efficiency:14": {
    archetypeId: "inquisitor:umbral-stalker",
    name: "Deadly Efficiency",
    level: 14,
    bucket: "situational",
    note: "real DR-ignoring / Wis-to-damage / regeneration-suppression effects, but only on a confirmed critical hit against an unaware foe — a per-attack, enemy-state condition the engine can't check",
  },
  "inquisitor:umbral-stalker:swift-and-silent:1": {
    archetypeId: "inquisitor:umbral-stalker",
    name: "Swift and Silent",
    level: 1,
    bucket: "numeric",
    note: "morale bonus (half level, min +1) on ALL Acrobatics and Stealth checks, unconditional and unscoped — class note 6",
  },

  // ── inquisitor:urban-infiltrator ──
  "inquisitor:urban-infiltrator:a-thousand-faces:11": {
    archetypeId: "inquisitor:urban-infiltrator",
    name: "A Thousand Faces",
    level: 11,
    bucket: "subsystem",
    note: "at-will alter self, replacing Stalwart (vendored changes: []) — ability grant, no Change-shaped number",
  },
  "inquisitor:urban-infiltrator:gifted-detective:1": {
    archetypeId: "inquisitor:urban-infiltrator",
    name: "Gifted Detective",
    level: 1,
    bucket: "numeric",
    note: "adds Wis modifier to Bluff and Disguise unconditionally, but the accompanying Diplomacy grant is scoped to 'checks to gather information' specifically — extract the unscoped Bluff/Disguise clause only (class note 5, mixed-feature precedent)",
  },

  // ── inquisitor:vampire-hunter ──
  "inquisitor:vampire-hunter:bane:5": {
    archetypeId: "inquisitor:vampire-hunter",
    name: "Bane",
    level: 5,
    bucket: "situational",
    note: "restricts bane to the undead subtype only, letting it persist off-hand — bane is activated/pool-gated (class note 2)",
  },
  "inquisitor:vampire-hunter:silversmith:2": {
    archetypeId: "inquisitor:vampire-hunter",
    name: "Silversmith",
    level: 2,
    bucket: "situational",
    note: "class-level bonus on Craft/Spellcraft checks to make silver items — Craft is a freeform player-slugged skill instance (crf.<slug>), same gap as Master Smith in the magus pass",
  },
  "inquisitor:vampire-hunter:sun-strike:5": {
    archetypeId: "inquisitor:vampire-hunter",
    name: "Sun Strike",
    level: 5,
    bucket: "situational",
    note: "+1d6 damage vs. sunlight-vulnerable creatures, but a swift-action, rounds/day weapon infusion — activated and enemy-type-scoped",
  },

  // ── inquisitor:vigilant-defender ──
  "inquisitor:vigilant-defender:bolster-the-wounded:14": {
    archetypeId: "inquisitor:vigilant-defender",
    name: "Bolster the Wounded",
    level: 14,
    bucket: "subsystem",
    note: "shifts a crit's damage from an ally onto herself — ally-focused defensive mechanic, no character-facing number",
  },
  "inquisitor:vigilant-defender:protect-the-faithful:1": {
    archetypeId: "inquisitor:vigilant-defender",
    name: "Protect the Faithful",
    level: 1,
    bucket: "situational",
    note: "real morale bonus (1/4 level, min +1) on four skills, but a limited-use/day, 10-minute-duration coaching activation affecting herself and allies out of combat — activated and temporary",
  },
  "inquisitor:vigilant-defender:shared-judgments:1": {
    archetypeId: "inquisitor:vigilant-defender",
    name: "Shared Judgments",
    level: 1,
    bucket: "subsystem",
    note: "extends judgment benefits to allies for 1 round — judgment-sharing mechanic (class note 1)",
  },
  "inquisitor:vigilant-defender:true-vengeance:20": {
    archetypeId: "inquisitor:vigilant-defender",
    name: "True Vengeance",
    level: 20,
    bucket: "subsystem",
    note: "shifts true judgment's save DC by +/-2 depending on the target's history with the party — judgment modification, enemy-facing DC",
  },

  // ── inquisitor:witch-hunter ──
  "inquisitor:witch-hunter:knowledgeable-defense:2": {
    archetypeId: "inquisitor:witch-hunter",
    name: "Knowledgeable Defense",
    level: 2,
    bucket: "situational",
    note: "real, scaling save-or-dodge bonus, but only vs. a spell just identified via Spellcraft — a per-spell, per-identification condition the engine can't check",
  },
  "inquisitor:witch-hunter:spell-sage:1": {
    archetypeId: "inquisitor:witch-hunter",
    name: "Spell Sage",
    level: 1,
    bucket: "situational",
    note: "adds Wis modifier to Spellcraft, but scoped to identifying a spell being cast, ID'ing a magic item via detect magic, or deciphering a scroll — narrower than Spellcraft as a whole (excludes crafting checks), replacing monster lore, class note 5",
  },
  "inquisitor:witch-hunter:spell-scent:6": {
    archetypeId: "inquisitor:witch-hunter",
    name: "Spell Scent",
    level: 6,
    bucket: "subsystem",
    note: "locate-creature-style tracing of a spell's caster, replacing track (nothing to double-count) — detection utility, no number",
  },
  "inquisitor:witch-hunter:witch-s-bane-judgment:14": {
    archetypeId: "inquisitor:witch-hunter",
    name: "Witch's Bane Judgment",
    level: 14,
    bucket: "subsystem",
    note: "adds a new judgment type, replacing exploit weakness — judgment addition (class note 1)",
  },
};

/**
 * ── INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────
 *
 * Machine-extracted mechanical effects for inquisitor archetype class
 * features (the prose->Change extraction pipeline, inquisitor slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * Only 11 of inquisitor's 143 features cleared the `numeric` bar (see
 * `INQUISITOR_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — inquisitor's kit leans heavily on judgment/bane
 * reflavors, detection spell-likes, and enemy-scoped or per-target
 * conditional bonuses, all of which stay classification-only. Ten of the
 * eleven are 1st-level "add an ability modifier / a Stern-Gaze-shaped morale
 * bonus to named skills, unconditionally" grants (class notes 5/6); the
 * eleventh (Gifted Detective) is the same shape with one clause dropped.
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal, single, fully general (no scope restriction) skill
 *    bonus.
 *  - "medium": a mixed feature where one clause is unconditional and
 *    extracted while a second, textually-present clause is scoped/activated
 *    and dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const INQUISITOR_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Cloaked Wolf's "Lure Prey": a flat, unconditional morale bonus on the
  // whole of Disguise and Sleight of Hand, matching Stern Gaze's own
  // half-level-minimum-1 formula. The "doubles when drawing a hidden weapon
  // via Sleight of Hand" clause is a separate, activated rider — dropped.
  "inquisitor:cloaked-wolf:lure-prey:1": {
    changes: [
      c(HALF_LEVEL_MIN_1, "skill.dis", "morale"),
      c(HALF_LEVEL_MIN_1, "skill.slt", "morale"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} morale Disguise/Sleight of Hand (doubles when drawing a hidden weapon, not modeled)`,
    confidence: "high",
    provenance:
      "Starting at 1st level, a cloaked wolf receives a morale bonus on all Disguise and Sleight " +
      "of Hand checks equal to half her inquisitor level (minimum +1).",
  },

  // Green Faith Marshal's "Wild Lore": the Cunning-Initiative-shaped
  // additive grant — Wis modifier added to Knowledge (nature), unconditional
  // and unscoped, stacking untyped alongside the normal Int modifier.
  "inquisitor:green-faith-marshal:wild-lore:1": {
    changes: [c("@abilities.wis.mod", "skill.kna", "untyped")],
    detail: () => "+Wis modifier to Knowledge (nature) (additional to Int)",
    confidence: "high",
    provenance:
      "A Green Faith marshal adds her Wisdom modifier to her Knowledge (nature) skill checks, in " +
      "addition to her Intelligence modifier.",
  },

  // Heretic's "Lore of Escape" replaces monster lore (vendored changes: [],
  // nothing to double-count) with the same additive-Wis-modifier shape,
  // unscoped, on Bluff and Stealth.
  "inquisitor:heretic:lore-of-escape:1": {
    changes: [
      c("@abilities.wis.mod", "skill.blf", "untyped"),
      c("@abilities.wis.mod", "skill.ste", "untyped"),
    ],
    detail: () => "+Wis modifier to Bluff/Stealth (additional to normal ability modifier)",
    confidence: "high",
    provenance:
      "She adds her Wisdom modifier on Bluff and Stealth skill checks in addition to the normal " +
      "ability score modifiers.",
  },

  // Infiltrator's "Guileful Lore" — same shape, Bluff and Diplomacy,
  // replacing monster lore.
  "inquisitor:infiltrator:guileful-lore:1": {
    changes: [
      c("@abilities.wis.mod", "skill.blf", "untyped"),
      c("@abilities.wis.mod", "skill.dip", "untyped"),
    ],
    detail: () => "+Wis modifier to Bluff/Diplomacy (additional to normal ability modifier)",
    confidence: "high",
    provenance:
      "She adds her Wisdom modifier on Bluff and Diplomacy skill checks in addition to the " +
      "normal ability score modifiers.",
  },

  // Reaper of Secrets' "Deceitful Lore" — same shape, Bluff and Disguise
  // (stacking with Charisma this time, not Intelligence), replacing monster
  // lore.
  "inquisitor:reaper-of-secrets:deceitful-lore:1": {
    changes: [
      c("@abilities.wis.mod", "skill.blf", "untyped"),
      c("@abilities.wis.mod", "skill.dis", "untyped"),
    ],
    detail: () => "+Wis modifier to Bluff/Disguise (additional to Cha)",
    confidence: "high",
    provenance:
      "a reaper of secrets adds her Wisdom modifier on Bluff and Disguise skill checks in " +
      "addition to her Charisma modifier.",
  },

  // Royal Accuser's "Meticulous Inspection": the general-Perception sibling
  // of Stern Gaze's own formula — unconditional, unscoped, half level
  // (minimum +1) morale bonus on the whole Perception skill.
  "inquisitor:royal-accuser:meticulous-inspection:1": {
    changes: [c(HALF_LEVEL_MIN_1, "skill.per", "morale")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} morale Perception`,
    confidence: "high",
    provenance:
      "A royal accuser gains a morale bonus equal to 1/2 his inquisitor level on all Perception " +
      "checks (minimum +1).",
  },

  // Sworn of the Eldest's "Disarming Discernment" — the additive shape
  // again, this time Cha modifier stacking with the normal Wis modifier on
  // Sense Motive (unpaired; doesn't replace anything).
  "inquisitor:sworn-of-the-eldest:disarming-discernment:1": {
    changes: [c("@abilities.cha.mod", "skill.sen", "untyped")],
    detail: () => "+Cha modifier to Sense Motive (additional to Wis)",
    confidence: "high",
    provenance:
      "A sworn of the Eldest adds her Charisma modifier on Sense Motive skill checks, in addition " +
      "to her Wisdom modifier.",
  },

  // Sworn of the Eldest's "Feytongue" — the general-morale shape,
  // unconditional and unscoped, on Bluff and Diplomacy.
  "inquisitor:sworn-of-the-eldest:feytongue:1": {
    changes: [
      c(HALF_LEVEL_MIN_1, "skill.blf", "morale"),
      c(HALF_LEVEL_MIN_1, "skill.dip", "morale"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} morale Bluff/Diplomacy`,
    confidence: "high",
    provenance:
      "A sworn of the Eldest receives a morale bonus equal to half her inquisitor level (minimum " +
      "+1) on Bluff and Diplomacy checks.",
  },

  // Tactical Leader's "Leader's Words" — same shape, all of Diplomacy.
  "inquisitor:tactical-leader:leader-s-words:1": {
    changes: [c(HALF_LEVEL_MIN_1, "skill.dip", "morale")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} morale Diplomacy`,
    confidence: "high",
    provenance:
      "A tactical leader receives a morale bonus on all Diplomacy checks equal to half his " +
      "inquisitor level (minimum +1).",
  },

  // Umbral Stalker's "Swift and Silent" — same shape, all of Acrobatics and
  // Stealth.
  "inquisitor:umbral-stalker:swift-and-silent:1": {
    changes: [
      c(HALF_LEVEL_MIN_1, "skill.acr", "morale"),
      c(HALF_LEVEL_MIN_1, "skill.ste", "morale"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} morale Acrobatics/Stealth`,
    confidence: "high",
    provenance:
      "An umbral stalker gains a morale bonus on all Acrobatics and Stealth checks equal to half " +
      "her inquisitor level (minimum +1).",
  },

  // Urban Infiltrator's "Gifted Detective": the additive-Wis shape on Bluff
  // and Disguise, both stated with no scoping clause — extracted. The same
  // sentence also grants Wis-to-Diplomacy, but ONLY "on Diplomacy checks to
  // gather information" — a narrower sub-use than the whole skill, so that
  // clause is left unmodeled (mixed-feature precedent, dropped at "medium").
  "inquisitor:urban-infiltrator:gifted-detective:1": {
    changes: [
      c("@abilities.wis.mod", "skill.blf", "untyped"),
      c("@abilities.wis.mod", "skill.dis", "untyped"),
    ],
    detail: () =>
      "+Wis modifier to Bluff/Disguise (additional to Cha; Diplomacy-to-gather-information clause not modeled)",
    confidence: "medium",
    provenance:
      "An urban infiltrator adds her Wisdom modifier as well as her Charisma modifier on Bluff " +
      "and Disguise skill checks and on Diplomacy checks to gather information.",
  },
};
