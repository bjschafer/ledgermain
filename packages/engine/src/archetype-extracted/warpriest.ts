/**
 * Warpriest's slice of the pipeline (2026-08-08). 16 archetypes, 78 features
 * — small enough that every feature was read individually rather than
 * heuristically, same posture as the magus pilot.
 *
 * ── Warpriest-specific mechanical facts this pass relies on ────────────────
 *
 * 1. **Fervor** (base 2nd-level feature, `Rzexvt4z8taA8dCu`) rides a real
 *    vendored `uses.maxFormula: "floor(@class.unlevel / 2) + @abilities.wis.mod"`,
 *    already applied generically via `deriveResourcePools`/`resources.ts`. Any
 *    archetype feature that changes fervor's pool SIZE/formula is `blocked`
 *    (double-count risk); a feature that only changes what fervor can be
 *    SPENT ON (an alternate use, an activated conversion) is `subsystem`.
 * 2. **Sacred Weapon** (base 1st-level feature, `YGbFrqaGvnCbAKKV`) and
 *    **Sacred Armor** (base 7th-level feature, `UBv1y1h93jrnhWxO`) both carry
 *    `changes: []` upstream — the weapon/armor enhancement-bonus scaling they
 *    describe is never modeled as a Change at all (no engine target exists
 *    for "temporarily add an enhancement bonus to a specific carried item");
 *    only their `uses.maxFormula` resource is applied generically. Every
 *    archetype feature that reflavors, delays, or adds enhancement-option
 *    choices to either ability is therefore `subsystem` — there is no
 *    baseline number anywhere to double-count OR to extract, regardless of
 *    how the reflavor scopes it (a specific weapon, shields, claws, a
 *    different cadence). The weapon-damage-by-level table Sacred Weapon also
 *    grants is likewise never Change-modeled (no per-weapon damage-die
 *    override target exists).
 * 3. **Channel Energy (WAR)** (base 4th-level feature, `Ktda1hno3geFi4j8`)
 *    spends fervor uses to deal/heal a d6 pool via its own `actions[]` array,
 *    not `changes[]` — this engine's Change pipeline doesn't touch it at all.
 *    Reflavors of channel energy (shape, damage type, doubling, alternate
 *    spend) are `subsystem`.
 * 4. **Blessings** (base 1st-level feature, `4QeavCZeba7ApFD2`) is an
 *    activated pick-list subsystem (choose two, each with its own minor/major
 *    power) with a real vendored `uses.maxFormula` of its own
 *    (`3 + floor(@class.unlevel / 2)`) — restricting or substituting which
 *    blessings can be chosen is `subsystem`, same reasoning as class note 1.
 * 5. **Bonus Feats (WAR)** (base 3rd-level feature, `HL0mn3TDEKQWeF03`)
 *    carries a real vendored `changes: [{formula: "floor(@class.unlevel / 3)",
 *    target: "bonusFeats"}]`. An archetype feature that only restricts WHICH
 *    feats can fill an existing slot (a list swap) is `subsystem` — the count
 *    is untouched, nothing to extract. A feature that grants a completely
 *    unpaired, ADDITIONAL bonus-feat count (its own cadence, not tied to the
 *    class's slot progression) is `numeric` — no warpriest archetype feature
 *    in this audit does this (all touches to bonus feats here either restrict
 *    the list or divert a specific numbered slot to a different ability).
 *    **Focus Weapon** (base 1st-level feature, `bXznpN0piipekXTH`) is a
 *    second, separate bonus-feat source — it grants the single, specific,
 *    named feat Weapon Focus via its own `changes: [{formula: "1", target:
 *    "bonusFeats"}]`. Archetype features that replace Focus Weapon with a
 *    DIFFERENT single named feat grant (Shield Focus, Improved Unarmed
 *    Strike, Improved Shield Bash) are `subsystem`, not `numeric`: granting
 *    one fixed feat outright is a different shape than the open "pick a
 *    combat feat" slots `bonusFeats` represents, and the vendored data's own
 *    choice to model Focus Weapon's fixed grant via `bonusFeats` doesn't
 *    change that — same posture the magus pilot used for Kensai/Kapenia
 *    Dancer's "bonus feat (Weapon Focus) grant" entries.
 * 6. **Sneak attack** and **flurry of blows** grants (Cult Leader, Mantis
 *    Zealot, Sacred Fist) have no Change target in this engine (sneak attack
 *    dice are hardcoded per-class in `tables.ts`, not vendored-Change-driven;
 *    flurry's extra-attack mechanic has no target at all) — `subsystem`,
 *    matching the magus pilot's unarmed-strike-damage precedent.
 * 7. **AC Bonus** (Sacred Fist, replacing Channel Energy) is a near-verbatim
 *    restatement of the vendored Monk "AC Bonus (MNK)" class feature
 *    (`4zVndIJ8NMWWzl1T`), which itself carries a real `changes[]` gated on
 *    `lt(@shield.type, 1)` / `lt(@armor.type, 1)` /
 *    `lt(@attributes.encumbrance.level, 1)` (unarmored, unencumbered, no
 *    shield — all three checkable formula inputs; see also
 *    `psychic-disciplines.ts`'s Self-Perfection "AC Bonus" power, which reuses
 *    the identical gate). Sacred Fist's own wording adds an explicit "(minimum
 *    0)" clamp on the Wisdom modifier that the vendored Monk formula doesn't
 *    state, and separately types its scaling increment as a "dodge" bonus
 *    (vendored Monk folds everything into one untyped number) — both honored
 *    literally from Sacred Fist's own text. The "stacks with monk levels"
 *    clause (relevant only to a true monk/sacred-fist multiclass) isn't
 *    modeled — this Change is scoped to the warpriest's own level only, per
 *    class note 5's `@class.unlevel` convention, and is flagged in `detail`.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in `WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * `provenance`. Only 4 of warpriest's 78 features cleared the `numeric` bar —
 * the kit leans heavily on fervor/blessing/sacred-weapon/sacred-armor spend
 * options and activated, resource-gated, or target-scoped abilities, all of
 * which are deferred subsystems or situational in this engine today (see this
 * file's header doc comment).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── warpriest:calamity-caller ──
  "warpriest:calamity-caller:aspect-of-disaster:20": {
    archetypeId: "warpriest:calamity-caller",
    name: "Aspect of Disaster",
    level: 20,
    bucket: "subsystem",
    note: "removes the save from an enhanced calamity while aspect of war is active — modifies the (subsystem) calamity attack, no number of its own; replaces aspect of war (itself gated 1/day, class note 3-style activated ability with no Change target)",
  },
  "warpriest:calamity-caller:calamity:0": {
    archetypeId: "warpriest:calamity-caller",
    name: "Calamity",
    level: 4,
    bucket: "subsystem",
    note: "a new at-will (later enhanced 1/2 levels/day) area-damage attack action with its own save DC — a wholly new attack form, not a modifier to the character's existing attacks/saves/AC; no Change target models a standalone attack action. Replaces focus weapon, sacred weapon, and bonus feats (all of which carry their own separate accounting elsewhere in this table — see class notes 2 and 5)",
  },
  "warpriest:calamity-caller:catastrophic-blessing:0": {
    archetypeId: "warpriest:calamity-caller",
    name: "Catastrophic Blessing",
    level: 0,
    bucket: "subsystem",
    note: "forces one of the two blessing picks to a specific domain — blessings pick-list restriction (class note 4)",
  },

  // ── warpriest:champion-of-the-faith ──
  "warpriest:champion-of-the-faith:chosen-alignment:1": {
    archetypeId: "warpriest:champion-of-the-faith",
    name: "Chosen Alignment",
    level: 1,
    bucket: "subsystem",
    note: "a roleplay/blessing-pick restriction (must select the matching alignment blessing) — no number",
  },
  "warpriest:champion-of-the-faith:detect-alignment:3": {
    archetypeId: "warpriest:champion-of-the-faith",
    name: "Detect Alignment",
    level: 3,
    bucket: "subsystem",
    note: "grants a detect-alignment move action, replacing the 3rd-level bonus feat (unpaired — the base Bonus Feats (WAR) count is untouched by this pass either way, class note 5) — no Change-shaped number",
  },
  "warpriest:champion-of-the-faith:sacred-weapon:1": {
    archetypeId: "warpriest:champion-of-the-faith",
    name: "Sacred Weapon",
    level: 1,
    bucket: "subsystem",
    note: "removes sacred weapon's enhancement-bonus scaling and replaces it with an alignment-vs-DR property at 4th, plus a swift-action special-ability grant at 12th+ — sacred weapon carries no vendored changes to begin with (class note 2), and neither replacement clause has a Change target (DR-bypass-by-alignment and a temporary weapon special ability aren't applied targets)",
  },
  "warpriest:champion-of-the-faith:smite:4": {
    archetypeId: "warpriest:champion-of-the-faith",
    name: "Smite",
    level: 4,
    bucket: "situational",
    note: "real Cha-to-attack / warpriest-level-to-damage / Cha-to-AC bonuses, but all scoped to a single swift-action-chosen target of the champion's opposed alignment — a per-target activated condition the engine can't check; replaces channel energy (class note 3, no double-count risk)",
  },

  // ── warpriest:cult-leader ──
  "warpriest:cult-leader:class-skills:0": {
    archetypeId: "warpriest:cult-leader",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "swaps the class-skill list — no Change target for a per-archetype class-skill list",
  },
  "warpriest:cult-leader:enthrall:4": {
    archetypeId: "warpriest:cult-leader",
    name: "Enthrall",
    level: 4,
    bucket: "subsystem",
    note: "enthrall, but metered by spending 2 uses of the fervor pool rather than its own N/day counter — this table can't reference another feature's pool, so left as prose; replaces channel energy (class note 3)",
  },
  "warpriest:cult-leader:hide-in-plain-sight:12": {
    archetypeId: "warpriest:cult-leader",
    name: "Hide in Plain Sight",
    level: 12,
    bucket: "subsystem",
    note: "grants a Stealth-while-observed ability, replacing the 12th-level bonus feat (unpaired, class note 5) — an absolute capability, not a modifier",
  },
  "warpriest:cult-leader:skill-ranks-per-level:0": {
    archetypeId: "warpriest:cult-leader",
    name: "Skill Ranks per Level",
    level: 0,
    bucket: "numeric",
    note: "replaces the base warpriest's 2 + Int skill ranks/level (classes.json: skillsPerLevel 2) with 4 + Int — a flat +2/level bonusSkillRanks delta, same shape as the hand-verified cleric (Cardinal)/paladin (Faithful Wanderer, Tortured Crusader) 2-to-4 doublings",
  },
  "warpriest:cult-leader:sneak-attack:3": {
    archetypeId: "warpriest:cult-leader",
    name: "Sneak Attack",
    level: 3,
    bucket: "subsystem",
    note: "grants rogue-style sneak attack dice (stacking with other sneak-attack sources), replacing the bonus feats gained at 3rd/9th/15th (unpaired — the base Bonus Feats (WAR) count is unaffected by this pass either way, class note 5) — sneak attack dice have no Change target (class note 6)",
  },
  "warpriest:cult-leader:weapon-and-armor-proficiency:0": {
    archetypeId: "warpriest:cult-leader",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency swap; also drops the Focus Weapon bonus-feat grant explicitly — no Change (proficiency isn't a target)",
  },
  "warpriest:cult-leader:well-hidden:0": {
    archetypeId: "warpriest:cult-leader",
    name: "Well-Hidden",
    level: 0,
    bucket: "numeric",
    note: "flat, unconditional +2 to Disguise and Stealth, replacing Focus Weapon (which itself only grants the fixed Weapon Focus feat, class note 5 — no double-count risk since well-hidden restates no feat count)",
  },

  // ── warpriest:disenchanter ──
  "warpriest:disenchanter:banish-enchantment:6": {
    archetypeId: "warpriest:disenchanter",
    name: "Banish Enchantment",
    level: 6,
    bucket: "subsystem",
    note: "fervor-spend targeted dispel magic, replacing the 6th-level bonus feat (unpaired, class note 5) — no flat number",
  },
  "warpriest:disenchanter:bonus-feats:0": {
    archetypeId: "warpriest:disenchanter",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "restricts the Bonus Feats (WAR) list to specific anti-magic feats at 1st/6th/12th — count unchanged (class note 5), nothing to extract",
  },
  "warpriest:disenchanter:mystic-interference:4": {
    archetypeId: "warpriest:disenchanter",
    name: "Mystic Interference",
    level: 4,
    bucket: "situational",
    note: "real +1 (scaling to +5 at 20th) save bonus vs. spells/SLAs, but activated (fervor spend, 30-ft burst), duration-limited, and applies to self AND allies in the burst — an activated/resource/AoE-scoped bonus, replacing channel energy (class note 3)",
  },

  // ── warpriest:divine-champion ──
  "warpriest:divine-champion:devotion:0": {
    archetypeId: "warpriest:divine-champion",
    name: "Devotion",
    level: 0,
    bucket: "subsystem",
    note: "a roleplay restriction (must worship a deity, match its alignment) — no number",
  },
  "warpriest:divine-champion:fervent-boon:0": {
    archetypeId: "warpriest:divine-champion",
    name: "Fervent Boon",
    level: 9,
    bucket: "subsystem",
    note: "spends fervor uses to cast a spell-like ability from the character's deity-specific sentinel boon, which isn't stored anywhere in the doc — choice-gated; replaces the 9th-level bonus feat (unpaired, class note 5)",
  },
  "warpriest:divine-champion:know-the-infidel:6": {
    archetypeId: "warpriest:divine-champion",
    name: "Know the Infidel",
    level: 6,
    bucket: "situational",
    note: "real +2 (scaling +2/6 levels, stacking per-deity) bonus on five skills plus weapon attack/damage rolls, but entirely scoped to a specific chosen enemy deity's followers — a target-identity condition the engine can't check; replaces the bonus feats gained at 6th/12th/18th (unpaired, class note 5)",
  },
  "warpriest:divine-champion:obedient-champion:3": {
    archetypeId: "warpriest:divine-champion",
    name: "Obedient Champion",
    level: 3,
    bucket: "subsystem",
    note: "grants Deific Obedience as a bonus feat (a fixed named feat, class note 5), replacing the 3rd-level bonus feat — no Change",
  },

  // ── warpriest:divine-commander ──
  "warpriest:divine-commander:battle-tactician:3": {
    archetypeId: "warpriest:divine-commander",
    name: "Battle Tactician",
    level: 3,
    bucket: "subsystem",
    note: "grants a teamwork feat that can be extended to nearby allies, replacing the 3rd-level bonus feat (unpaired, class note 5) — an ally-facing activated grant, no flat number for the character",
  },
  "warpriest:divine-commander:bless-army:15": {
    archetypeId: "warpriest:divine-commander",
    name: "Bless Army",
    level: 15,
    bucket: "subsystem",
    note: "a mass-combat (Ultimate Campaign) OM/DV bonus — mass combat isn't modeled in this engine at all; replaces the 15th-level bonus feat (unpaired, class note 5)",
  },
  "warpriest:divine-commander:blessed-mount:6": {
    archetypeId: "warpriest:divine-commander",
    name: "Blessed Mount",
    level: 6,
    bucket: "subsystem",
    note: "grants the mount a template/SR/energy resistance — the mount's own stats, not the character's (ally/mount-only bonuses are never extracted); replaces the 6th-level bonus feat (unpaired, class note 5)",
  },
  "warpriest:divine-commander:greater-battle-tactician:12": {
    archetypeId: "warpriest:divine-commander",
    name: "Greater Battle Tactician",
    level: 12,
    bucket: "subsystem",
    note: "adds a second teamwork feat to the battle tactician grant and makes it a swift action, replacing the 12th-level bonus feat (unpaired, class note 5) — same posture as Battle Tactician above",
  },
  "warpriest:divine-commander:mount:0": {
    archetypeId: "warpriest:divine-commander",
    name: "Mount",
    level: 0,
    bucket: "subsystem",
    note: "grants a druid-style animal companion mount (warpriest level 1:1) — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block; replaces blessings (class note 4, itself a resource with no Change target)",
  },

  // ── warpriest:feral-champion ──
  "warpriest:feral-champion:feral-blessing:0": {
    archetypeId: "warpriest:feral-champion",
    name: "Feral Blessing",
    level: 0,
    bucket: "subsystem",
    note: "forces the Animal blessing and drops the second pick — blessings restriction (class note 4)",
  },
  "warpriest:feral-champion:sacred-claws:0": {
    archetypeId: "warpriest:feral-champion",
    name: "Sacred Claws",
    level: 0,
    bucket: "subsystem",
    note: "redirects sacred weapon's damage-by-level table onto natural claw attacks instead of a wielded weapon — sacred weapon carries no vendored changes to begin with (class note 2), so there's still no baseline number to redirect, even though nattack/ndamage are real targets now",
  },
  "warpriest:feral-champion:wild-shape:7": {
    archetypeId: "warpriest:feral-champion",
    name: "Wild Shape",
    level: 7,
    bucket: "subsystem",
    note: "grants druid wild shape (at warpriest level - 3, no elemental/plant forms), replacing sacred armor (class note 2) — a transformation ability, no Change target",
  },

  // ── warpriest:fist-of-the-godclaw ──
  "warpriest:fist-of-the-godclaw:alignment-channel:6": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Alignment Channel",
    level: 6,
    bucket: "subsystem",
    note: "grants Alignment Channel as a bonus feat (fixed named feat, class note 5) plus a fervor-cost/move-action tweak to channel energy (class note 3), replacing the bonus feats gained at 6th/12th (unpaired, class note 5) — no Change",
  },
  "warpriest:fist-of-the-godclaw:alignment:0": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "an alignment restriction (must be lawful) — no number",
  },
  "warpriest:fist-of-the-godclaw:aspect-of-law:20": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Aspect of Law",
    level: 20,
    bucket: "situational",
    note: "real BAB-equals-level / DR 20/chaotic / mind-affecting immunity / average-die-roll effects, but a 1/day, swift-action-activated, 1-minute-duration package — an activated-ability condition, not always-on; replaces aspect of war (itself the same shape, gated 1/day with no Change target)",
  },
  "warpriest:fist-of-the-godclaw:blessings-of-the-godclaw:0": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Blessings of the Godclaw",
    level: 0,
    bucket: "subsystem",
    note: "forces the Law and Godclaw blessing picks — blessings restriction (class note 4)",
  },
  "warpriest:fist-of-the-godclaw:deities:0": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Deities",
    level: 0,
    bucket: "subsystem",
    note: "a deity-worship restriction — no number",
  },
  "warpriest:fist-of-the-godclaw:detect-chaos:3": {
    archetypeId: "warpriest:fist-of-the-godclaw",
    name: "Detect Chaos",
    level: 3,
    bucket: "subsystem",
    note: "detect chaos, wired via the spell-like-abilities route (the at-will upgrade if he has detect chaos from elsewhere isn't modeled); replaces the 3rd-level bonus feat (unpaired, class note 5)",
  },

  // ── warpriest:forgepriest ──
  "warpriest:forgepriest:blessings:0": {
    archetypeId: "warpriest:forgepriest",
    name: "Blessings",
    level: 0,
    bucket: "subsystem",
    note: "restricts the forgepriest to a single blessing pick instead of two — blessings restriction (class note 4)",
  },
  "warpriest:forgepriest:bonus-feats:0": {
    archetypeId: "warpriest:forgepriest",
    name: "Bonus Feats",
    level: 0,
    bucket: "subsystem",
    note: "adds item-creation feats to the Bonus Feats (WAR) list — count unchanged (class note 5), nothing to extract",
  },
  "warpriest:forgepriest:craft-magic-arms-and-armor:3": {
    archetypeId: "warpriest:forgepriest",
    name: "Craft Magic Arms and Armor",
    level: 3,
    bucket: "subsystem",
    note: "grants a fixed named feat (class note 5), replacing the 3rd-level bonus feat — no Change",
  },
  "warpriest:forgepriest:creator-s-bond:4": {
    archetypeId: "warpriest:forgepriest",
    name: "Creator’s Bond",
    level: 4,
    bucket: "subsystem",
    note: "spends fervor to increase sacred weapon/armor's enhancement bonus on self-made items — sacred weapon/armor carry no vendored changes to begin with (class note 2); replaces channel energy (class note 3)",
  },
  "warpriest:forgepriest:forge-mastery:0": {
    archetypeId: "warpriest:forgepriest",
    name: "Forge Mastery",
    level: 0,
    bucket: "situational",
    note: "real, unconditional half-level bonus to Craft checks, but scoped to 'metal items, armor, and weapons' — spans multiple freeform Craft skill instances (crf.<slug>) with no single fixed-convention slug, same posture as the hand-verified table's Soul Forger (magus) Master Smith entry; guessing one slug would silently miss most characters",
  },
  "warpriest:forgepriest:heat-of-the-forge:6": {
    archetypeId: "warpriest:forgepriest",
    name: "Heat of the Forge",
    level: 6,
    bucket: "numeric",
    note: "flat, unconditional fire resistance 5 at 6th, 10 at 13th, replacing the 6th-level bonus feat (unpaired — the base Bonus Feats (WAR) count is unaffected either way, class note 5)",
  },
  "warpriest:forgepriest:smith-s-spells:0": {
    archetypeId: "warpriest:forgepriest",
    name: "Smith’s Spells",
    level: 0,
    bucket: "subsystem",
    note: "adds named spells to the warpriest spell list — no Change-shaped number",
  },

  // ── warpriest:liberty-s-blade ──
  "warpriest:liberty-s-blade:channel-liberty:4": {
    archetypeId: "warpriest:liberty-s-blade",
    name: "Channel Liberty",
    level: 4,
    bucket: "subsystem",
    note: "alters channel energy's heal/harm effects (halved healing plus a liberating-command effect; doubled devil-targeted harm) — channel energy has no Change target to begin with (class note 3)",
  },
  "warpriest:liberty-s-blade:devilslayer:4": {
    archetypeId: "warpriest:liberty-s-blade",
    name: "Devilslayer",
    level: 4,
    bucket: "subsystem",
    note: "adds a weapon special ability (devilbane) to sacred weapon's enhancement choice-list — sacred weapon carries no vendored changes to begin with (class note 2)",
  },
  "warpriest:liberty-s-blade:freedom-s-focus:0": {
    archetypeId: "warpriest:liberty-s-blade",
    name: "Freedom’s Focus",
    level: 0,
    bucket: "subsystem",
    note: "forces the Liberation blessing pick and drops the second — blessings restriction (class note 4)",
  },
  "warpriest:liberty-s-blade:shield-against-hellspawn:7": {
    archetypeId: "warpriest:liberty-s-blade",
    name: "Shield Against Hellspawn",
    level: 7,
    bucket: "subsystem",
    note: "adds an armor special ability (devil-defiant) to sacred armor's enhancement choice-list — sacred armor carries no vendored changes to begin with (class note 2)",
  },

  // ── warpriest:mantis-zealot ──
  "warpriest:mantis-zealot:aspect-of-the-mantis:20": {
    archetypeId: "warpriest:mantis-zealot",
    name: "Aspect of the Mantis",
    level: 20,
    bucket: "situational",
    note: "real Dex-mod bleed damage per attack, but only while using aspect of war — itself a 1/day, swift-action-activated, short-duration ability (no Change target) — an activation-gated add-on",
  },
  "warpriest:mantis-zealot:mantis-sworn:0": {
    archetypeId: "warpriest:mantis-zealot",
    name: "Mantis Sworn",
    level: 0,
    bucket: "subsystem",
    note: "a deity/alignment restriction — no number",
  },
  "warpriest:mantis-zealot:sacred-reflexes:7": {
    archetypeId: "warpriest:mantis-zealot",
    name: "Sacred Reflexes",
    level: 7,
    bucket: "subsystem",
    note: "grants uncanny dodge/evasion (and their improved tiers) while lightly/unarmored, for a limited minutes/day pool, replacing sacred armor (class note 2) — evasion/uncanny dodge have no Change target",
  },
  "warpriest:mantis-zealot:sneak-attack:4": {
    archetypeId: "warpriest:mantis-zealot",
    name: "Sneak Attack",
    level: 4,
    bucket: "subsystem",
    note: "grants rogue-style sneak attack dice, stacking with other sources, replacing sacred weapon (which carries no vendored changes to begin with, class note 2) — sneak attack dice have no Change target (class note 6)",
  },
  "warpriest:mantis-zealot:weapon-and-armor-proficiency:0": {
    archetypeId: "warpriest:mantis-zealot",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency swap — no Change",
  },

  // ── warpriest:molthuni-arsenal-chaplain ──
  "warpriest:molthuni-arsenal-chaplain:sacred-weapon:0": {
    archetypeId: "warpriest:molthuni-arsenal-chaplain",
    name: "Sacred Weapon",
    level: 0,
    bucket: "subsystem",
    note: "caps sacred weapon's damage-by-level table at 1d6 — the table it caps was never Change-modeled to begin with (class note 2), nothing to adjust",
  },
  "warpriest:molthuni-arsenal-chaplain:war-blessing:0": {
    archetypeId: "warpriest:molthuni-arsenal-chaplain",
    name: "War Blessing",
    level: 7,
    bucket: "subsystem",
    note: "forces the War blessing pick, grants Quicken Blessing (War) as a fixed bonus feat (class note 5, gated to 10th for self-use), and expands the blessing's targets/range at 13th/16th/19th, replacing sacred armor (class note 2) — entirely blessings/feat-grant mechanics, no number",
  },
  "warpriest:molthuni-arsenal-chaplain:weapon-training:5": {
    archetypeId: "warpriest:molthuni-arsenal-chaplain",
    name: "Weapon Training",
    level: 5,
    bucket: "situational",
    note: "a real fighter Weapon Training grant, but 'sacred weapons' here is defined by the vendored text as 'weapons with which the warpriest has taken Weapon Focus' — an open, potentially-plural set driven by the player's own feat picks, not a weapon group or a single named weapon. PickChoice only supports a small fixed option list, so this doesn't fit it any more than Myrmidarch's (magus) multi-slot Weapon Training does; replaces channel energy (class note 3)",
  },

  // ── warpriest:proclaimer ──
  "warpriest:proclaimer:cleanser-of-evil:2": {
    archetypeId: "warpriest:proclaimer",
    name: "Cleanser of Evil",
    level: 2,
    bucket: "subsystem",
    note: "a new fervor-spend area-damage attack vs. evil outsiders, altering fervor's normal heal/harm use and replacing sacred armor (class note 2) — a new attack form, not a modifier (same posture as Calamity above)",
  },
  "warpriest:proclaimer:righteous-oath:0": {
    archetypeId: "warpriest:proclaimer",
    name: "Righteous Oath",
    level: 0,
    bucket: "subsystem",
    note: "an alignment/spontaneous-casting restriction — no number",
  },
  "warpriest:proclaimer:zone-of-sanctification:4": {
    archetypeId: "warpriest:proclaimer",
    name: "Zone of Sanctification",
    level: 4,
    bucket: "subsystem",
    note: "a fervor-spend push/damage zone built on cleanser of evil (itself subsystem), replacing channel energy (class note 3) — no flat number",
  },

  // ── warpriest:sacred-fist ──
  "warpriest:sacred-fist:ac-bonus:0": {
    archetypeId: "warpriest:sacred-fist",
    name: "AC Bonus",
    level: 4,
    bucket: "numeric",
    note: "Wisdom-modifier (minimum 0) plus a scaling dodge bonus to AC/CMD while unarmored, unencumbered, and shieldless — a near-verbatim restatement of the vendored Monk AC Bonus (MNK) gate (see class note 7); the 'stacks with monk levels' multiclass clause isn't modeled",
  },
  "warpriest:sacred-fist:blessed-fortitude:3": {
    archetypeId: "warpriest:sacred-fist",
    name: "Blessed Fortitude",
    level: 3,
    bucket: "subsystem",
    note: "negates an effect entirely on a successful Fortitude save, replacing the 3rd-level bonus feat (unpaired, class note 5) — no Change target for 'avoid on save success' (an evasion-shaped effect)",
  },
  "warpriest:sacred-fist:bonus-style-feat:6": {
    archetypeId: "warpriest:sacred-fist",
    name: "Bonus Style Feat",
    level: 6,
    bucket: "subsystem",
    note: "restricts the bonus feats gained at 6th/12th/18th to style feats — count unchanged (class note 5), nothing to extract",
  },
  "warpriest:sacred-fist:class-skills:0": {
    archetypeId: "warpriest:sacred-fist",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "swaps the class-skill list — no Change target for a per-archetype class-skill list",
  },
  "warpriest:sacred-fist:flurry-of-blows:1": {
    archetypeId: "warpriest:sacred-fist",
    name: "Flurry of Blows",
    level: 1,
    bucket: "subsystem",
    note: "grants monk flurry of blows, replacing sacred weapon (which carries no vendored changes to begin with, class note 2) — flurry's extra-attack mechanic has no Change target (class note 6)",
  },
  "warpriest:sacred-fist:ki-pool:7": {
    archetypeId: "warpriest:sacred-fist",
    name: "Ki Pool",
    level: 7,
    bucket: "situational",
    note: "a real, scaling insight AC bonus (+1 at 7th to +5 at 19th), but spent from a ki pool as a swift action — a resource-gated activated bonus, on top of the ki pool grant itself (a resource mechanic); replaces sacred armor (class note 2)",
  },
  "warpriest:sacred-fist:miraculous-fortitude:9": {
    archetypeId: "warpriest:sacred-fist",
    name: "Miraculous Fortitude",
    level: 9,
    bucket: "subsystem",
    note: "halves damage on a failed Fortitude save (upgrading blessed fortitude), replacing the 9th-level bonus feat (unpaired, class note 5) — no Change target for a save-conditional damage halving",
  },
  "warpriest:sacred-fist:unarmed-strike:1": {
    archetypeId: "warpriest:sacred-fist",
    name: "Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants Improved Unarmed Strike (fixed feat, class note 5) plus monk-level unarmed damage, replacing Focus Weapon — no Change target for unarmed-strike damage dice",
  },
  "warpriest:sacred-fist:weapon-and-armor-proficiency:0": {
    archetypeId: "warpriest:sacred-fist",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency swap; restates the AC-bonus/flurry loss condition already captured in the AC Bonus entry above — no separate number",
  },

  // ── warpriest:shieldbearer ──
  "warpriest:shieldbearer:channel-energy:0": {
    archetypeId: "warpriest:shieldbearer",
    name: "Channel Energy",
    level: 0,
    bucket: "subsystem",
    note: "restricts channel energy to while carrying a shield and reshapes its burst into a cone — channel energy has no Change target to begin with (class note 3)",
  },
  "warpriest:shieldbearer:sacred-shield:4": {
    archetypeId: "warpriest:shieldbearer",
    name: "Sacred Shield",
    level: 4,
    bucket: "subsystem",
    note: "a sacred-armor-shaped enhancement bonus applied to a shield instead of armor — no Change target for an item's temporary enhancement bonus (class note 2); vendored pairing points at Channel Energy (WAR) rather than Sacred Armor, a data oddity worth flagging but not one that changes this entry's outcome either way",
  },
  "warpriest:shieldbearer:sacred-weapon:0": {
    archetypeId: "warpriest:shieldbearer",
    name: "Sacred Weapon",
    level: 19,
    bucket: "subsystem",
    note: "redefines sacred weapon to apply to shields instead of a favored/Focus weapon, with its own delayed (7th-level) enhancement cadence — sacred weapon carries no vendored changes to begin with (class note 2); the vendored level field (19, the enhancement's cap level) doesn't match the ability's actual earlier onset, a data oddity that doesn't matter here since there's no number to gate regardless",
  },
  "warpriest:shieldbearer:shield-adept:1": {
    archetypeId: "warpriest:shieldbearer",
    name: "Shield Adept",
    level: 1,
    bucket: "subsystem",
    note: "grants Improved Shield Bash (fixed feat, class note 5) plus a shield-bonus-to-concentration-checks perk, replacing Focus Weapon — 'concentration' isn't an applied target",
  },

  // ── warpriest:sixth-wing-bulwark ──
  "warpriest:sixth-wing-bulwark:focus-shield:0": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Focus Shield",
    level: 0,
    bucket: "subsystem",
    note: "grants Shield Focus (fixed feat, class note 5), replacing Focus Weapon — no Change",
  },
  "warpriest:sixth-wing-bulwark:intercession:12": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Intercession",
    level: 12,
    bucket: "subsystem",
    note: "a fervor-spend teleport-swap-with-an-ally ability, replacing the 12th-level bonus feat (unpaired, class note 5) — no flat number",
  },
  "warpriest:sixth-wing-bulwark:reflexive-fortification:18": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Reflexive Fortification",
    level: 18,
    bucket: "subsystem",
    note: "lets sacred shield (itself subsystem below) be activated as an immediate action, replacing the 18th-level bonus feat (unpaired, class note 5) — no number",
  },
  "warpriest:sixth-wing-bulwark:sacred-fortification:7": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Sacred Fortification",
    level: 7,
    bucket: "subsystem",
    note: "links activating sacred armor to also activating sacred shield (itself subsystem below) via a fervor spend — sacred armor carries no vendored changes to begin with (class note 2)",
  },
  "warpriest:sixth-wing-bulwark:sacred-shield:0": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Sacred Shield",
    level: 20,
    bucket: "blocked",
    note: "the ACP-reduction-while-wielding-a-shield clause would otherwise be a clean numeric acpA Change (armor.type/shield.type/encumbrance are all checkable), but the vendored level field is 20 — this replaces sacred weapon (a 1st-level ability) and the prose describes effects starting well before 20th, so the level field is internally inconsistent with its own pairing and text (a vendored-data defect, not a copy-paste-able correction); gating a Change on it would suppress the real effect for 19 levels while implying a 20th-level onset that isn't in the text. The companion DR/fire-resistance-while-shield-blessed clause is separately activated (swift action, rounds/day resource) and partly redirectable to an ally, so it wouldn't clear the bar even with a correct level",
  },
  "warpriest:sixth-wing-bulwark:shield-of-grace:6": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Shield of Grace",
    level: 6,
    bucket: "subsystem",
    note: "lets blessings/fervor healing/touch spells be delivered through sacred shield (itself subsystem above), replacing the 6th-level bonus feat (unpaired, class note 5) — no number",
  },
  "warpriest:sixth-wing-bulwark:sixth-wing-sworn:0": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Sixth Wing Sworn",
    level: 0,
    bucket: "subsystem",
    note: "a deity-worship restriction — no number",
  },
  "warpriest:sixth-wing-bulwark:weapon-and-armor-proficiency:0": {
    archetypeId: "warpriest:sixth-wing-bulwark",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "adds tower shield proficiency — no Change",
  },
};

/**
 * ── WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────
 *
 * Machine-extracted mechanical effects for warpriest archetype class
 * features (the prose→Change extraction pipeline, warpriest slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 4 of warpriest's 78
 * features cleared the `numeric` bar (see
 * `WARPRIEST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit).
 *
 * Confidence rubric (identical to the magus pilot's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required composing a fact not stated in the
 *    quoted provenance itself (e.g. the base class's skill-ranks-per-level
 *    value, from `classes.json`), or the entry required deriving more than
 *    one Change from a single passage.
 *  - "low": not used in this pass.
 */
export const WARPRIEST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Cult Leader's "Well-Hidden" replaces Focus Weapon (which only grants the
  // fixed Weapon Focus feat — class note 5, no count to double against) with
  // a flat, unconditional +2 on two named skills.
  "warpriest:cult-leader:well-hidden:0": {
    changes: [c("2", "skill.dis"), c("2", "skill.ste")],
    detail: () => "+2 Disguise / +2 Stealth",
    confidence: "high",
    provenance: "A cult leader gains a +2 bonus on Disguise and Stealth checks.",
  },

  // Cult Leader's "Skill Ranks per Level" replaces the base warpriest's 2 +
  // Int (classes.json: skillsPerLevel 2) with 4 + Int — a flat +2/level
  // bonusSkillRanks delta, the exact shape (and exact per-level delta, by
  // coincidence) the hand-verified cleric (Cardinal) and paladin (Faithful
  // Wanderer/Tortured Crusader) 2-to-4 doublings already use. The base value
  // itself isn't restated in this feature's own terse one-line description,
  // so composing it from classes.json's `skillsPerLevel` field is what earns
  // this "medium" rather than "high".
  "warpriest:cult-leader:skill-ranks-per-level:0": {
    changes: [c("2 * @class.unlevel", "bonusSkillRanks")],
    detail: () => "4 + Int skill ranks/level (class-skill list swap not modeled)",
    confidence: "medium",
    provenance: "4 + Int modifier.",
  },

  // Forgepriest's "Heat of the Forge" is a flat, unconditional energy
  // resistance grant with no scoping condition at all — 5 at 6th, 10 at
  // 13th. Replaces the 6th-level bonus feat (unpaired; the base Bonus Feats
  // (WAR) count is unaffected by this pass either way, class note 5).
  "warpriest:forgepriest:heat-of-the-forge:6": {
    changes: [c("if(gte(@class.unlevel, 13), 10, 5)", "eres.fire")],
    detail: (level) => `fire resistance ${level >= 13 ? 10 : 5}`,
    confidence: "high",
    provenance:
      "At 6th level, a forgepriest gains fire resistance 5. At 13th level, this resistance " +
      "increases to 10.",
  },

  // Sacred Fist's "AC Bonus" is a near-verbatim restatement of the vendored
  // Monk "AC Bonus (MNK)" class feature's own `changes[]` gate — unarmored
  // AND unencumbered AND shieldless (all three checkable via @armor.type,
  // @attributes.encumbrance.level, and @shield.type; see
  // `psychic-disciplines.ts`'s Self-Perfection "AC Bonus" power for the
  // identical gate reused elsewhere in this engine). Two differences from
  // the vendored Monk formula, both taken literally from Sacred Fist's own
  // text rather than copied from Monk: the Wisdom-modifier half is clamped
  // to a minimum of 0 (Monk's vendored formula doesn't state this clamp),
  // and the scaling half is explicitly typed "dodge" (Monk's vendored
  // formula folds everything into one untyped number instead). Untyped `ac`
  // bonuses do NOT auto-flow to `cmd` (only the eight RAW-named types do,
  // compute.ts's `CMD_AC_TYPES`) — hence a duplicate `cmd`-target Change for
  // the Wisdom-modifier half, matching how the vendored Monk feature itself
  // authors both an `ac` and a `cmd` entry. The dodge-type scaling half only
  // needs the one `ac` Change (dodge auto-flows to CMD). The "stacks with
  // monk levels" clause (only relevant to an actual monk/sacred-fist
  // multiclass) isn't modeled — this Change is scoped to the warpriest's own
  // level only, flagged in `detail`.
  "warpriest:sacred-fist:ac-bonus:0": {
    changes: [
      c(
        "if(and(and(lt(@shield.type, 1), lt(@armor.type, 1)), lt(@attributes.encumbrance.level, 1)), 1) * max(0, @abilities.wis.mod)",
        "ac",
      ),
      c(
        "if(and(and(lt(@shield.type, 1), lt(@armor.type, 1)), lt(@attributes.encumbrance.level, 1)), 1) * max(0, @abilities.wis.mod)",
        "cmd",
      ),
      c(
        "if(and(and(lt(@shield.type, 1), lt(@armor.type, 1)), lt(@attributes.encumbrance.level, 1)), clamp(1 + floor((@class.unlevel - 4) / 4), 0, 5), 0)",
        "ac",
        "dodge",
      ),
    ],
    detail: (level) =>
      `+Wis mod (min 0, untyped) AC/CMD, +${Math.min(5, Math.max(0, 1 + Math.floor((level - 4) / 4)))} dodge AC/CMD ` +
      "(unarmored, unencumbered, shieldless; monk-multiclass level stacking not modeled)",
    confidence: "medium",
    provenance:
      "A deity protects her sacred fist as long as he is unarmored and unencumbered. A sacred " +
      "fist adds his Wisdom modifier (minimum 0) to his AC and his CMD. In addition, a sacred " +
      "fist gains a +1 dodge bonus to AC and CMD at 4th level. This bonus increases by 1 for " +
      "every 4 levels thereafter (to a maximum of +5 at 20th level). These bonuses to AC apply " +
      "even against touch attacks or when the sacred fist is flat-footed. He loses these " +
      "bonuses when he is immobilized or helpless, when he wears any armor, when he carries a " +
      "shield, or when he carries a medium or heavy load.",
  },
};
