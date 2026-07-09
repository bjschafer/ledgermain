/**
 * Magus's slice of the issue #45 batch-extraction pipeline (2026-07-06).
 * Magus is a BRAND NEW class in this repo as of this same date — there is no
 * prior hand-authored or extracted content for it anywhere, and no existing
 * ids to avoid duplicating. This file establishes magus's slice from
 * scratch, repeating the exact methodology the fighter pilot
 * (`fighter.ts`) already validated: every vendored archetype feature for the
 * class (31 magus archetypes, 150 features) is read in full and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked`, and the `numeric`
 * ones get a real `Change`-shaped extraction. Per the per-class file
 * convention (`index.ts`'s doc comment), this file owns BOTH of magus's
 * pipeline artifacts — `MAGUS_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Magus-specific mechanical facts this pass relies on ───────────────────
 *
 * 1. **Arcane Pool** (base L1 feature) rides a real vendored
 *    `uses.maxFormula: "max(1, floor(@class.unlevel / 2)) + @abilities.int.mod"`,
 *    already applied generically via `deriveResourcePools`/`resources.ts`.
 *    Any archetype feature that changes the pool's SIZE/formula/cadence is
 *    `blocked` (would double-count or conflict with the vendored formula).
 *    An archetype that only changes what the pool can be SPENT ON (a new
 *    choice-list of weapon/armor/shield abilities, or an activated
 *    conversion of pool points into some other effect) is `subsystem` — no
 *    baseline number to model, it's a spend-option list.
 * 2. **Magus Arcana** (3rd level and every 3 levels thereafter) are entirely
 *    deferred in this engine — no schema field, no picker, no per-arcana
 *    Change modeling exists at all. Any feature that adds/restricts/swaps
 *    arcana is `subsystem`.
 * 3. **Spell Combat** and **Spellstrike** (and their Improved/Greater/etc.
 *    upgrades, plus Counterstrike) are prose-only display features — no
 *    numeric Change models any of them today. Any archetype modifying one is
 *    `subsystem`.
 * 4. **Fighter Training** (the magus's virtual-fighter-levels-for-feat-
 *    -prereqs feature) carries no Change either — reflavors of it are
 *    `subsystem` for the same reason.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in `MAGUS_ARCHETYPE_EFFECTS_EXTRACTED`'s
 * `provenance`. The `situational`/`subsystem` split for the bulk was done by
 * reading every one of the 150 features individually (small enough to do
 * exhaustively, unlike fighter's 383) rather than a heuristic pass — see each
 * entry's `note` for the specific reason it didn't clear the `numeric` bar.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── magus:armored-battlemage ──
  "magus:armored-battlemage:arcane-pool:1": {
    archetypeId: "magus:armored-battlemage",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "redirects arcane pool spend-options to armor enhancement instead of weapon enhancement; pool size/cadence unchanged — see class note 1 (spend-option changes are subsystem), no baseline number to extract",
  },
  "magus:armored-battlemage:armor-training:3": {
    archetypeId: "magus:armored-battlemage",
    name: "Armor Training",
    level: 3,
    bucket: "numeric",
    note: "grants fighter Armor Training (as the fighter ability) on its own 5-level cadence (3rd/8th/13th/18th), replacing the magus arcana gained at 3rd/18th (no vendored changes to suppress) and improved spell combat (prose-only) — clean grant, no double-count risk",
  },
  "magus:armored-battlemage:expanded-arcane-pool:14": {
    archetypeId: "magus:armored-battlemage",
    name: "Expanded Arcane Pool",
    level: 14,
    bucket: "subsystem",
    note: "adds armor-enhancement choice-list options to the pool spend — no flat number",
  },
  "magus:armored-battlemage:heavy-armor:7": {
    archetypeId: "magus:armored-battlemage",
    name: "Heavy Armor",
    level: 7,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },
  "magus:armored-battlemage:medium-armor:1": {
    archetypeId: "magus:armored-battlemage",
    name: "Medium Armor",
    level: 1,
    bucket: "subsystem",
    note: "early proficiency grant plus a concentration-check bonus; 'concentration' isn't an applied target (targets.ts) so nothing to extract",
  },

  // ── magus:beastblade ──
  "magus:beastblade:familiar-pool:7": {
    archetypeId: "magus:beastblade",
    name: "Familiar Pool",
    level: 7,
    bucket: "subsystem",
    note: "arcane-pool-to-familiar-spell conversion, a resource mechanic; replaces knowledge pool (itself subsystem)",
  },
  "magus:beastblade:familiar-spellstrike:11": {
    archetypeId: "magus:beastblade",
    name: "Familiar Spellstrike",
    level: 11,
    bucket: "subsystem",
    note: "grants an attack-of-opportunity trigger tied to the familiar's touch delivery — unrelated ability, no number",
  },
  "magus:beastblade:familiar:3": {
    archetypeId: "magus:beastblade",
    name: "Familiar",
    level: 3,
    bucket: "subsystem",
    note: "grants the familiar magus arcana — arcana list modification, deferred (class note 2)",
  },
  "magus:beastblade:tandem-touch:4": {
    archetypeId: "magus:beastblade",
    name: "Tandem Touch",
    level: 4,
    bucket: "subsystem",
    note: "lets the familiar hold a charge while the magus casts again — unrelated mechanic, replaces spell recall (prose-only, class note 4)",
  },

  // ── magus:bladebound ──
  "magus:bladebound:arcane-pool:1": {
    archetypeId: "magus:bladebound",
    name: "Arcane Pool",
    level: 1,
    bucket: "blocked",
    note: "restates the arcane pool as '1/3 his level (minimum 1) plus his Intelligence bonus' instead of the vendored 1/2-level formula — suspected vendored-data copy-paste error (see report); a genuine size/formula divergence would double-count or conflict with the vendored Arcane Pool uses.maxFormula if backfilled, so recorded rather than guessed at",
  },
  "magus:bladebound:black-blade:3": {
    archetypeId: "magus:bladebound",
    name: "Black Blade",
    level: 3,
    bucket: "subsystem",
    note: "grants a sentient weapon (black blade) — unrelated subsystem; also forecloses the familiar arcana (arcana-list interaction, class note 2)",
  },

  // ── magus:card-caster ──
  "magus:card-caster:arcane-pool-focus:1": {
    archetypeId: "magus:card-caster",
    name: "Arcane Pool Focus",
    level: 1,
    bucket: "subsystem",
    note: "restricts arcane pool spend to ranged weapons plus a different special-ability choice-list — pool size unchanged, no flat number",
  },
  "magus:card-caster:deadly-dealer:1": {
    archetypeId: "magus:card-caster",
    name: "Deadly Dealer",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat grant",
  },
  "magus:card-caster:harrowed-spellstrike:2": {
    archetypeId: "magus:card-caster",
    name: "Harrowed Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "reflavor of spellstrike restricted to thrown weapons — spellstrike itself is prose-only (class note 3)",
  },
  "magus:card-caster:role-dealer:3": {
    archetypeId: "magus:card-caster",
    name: "Role Dealer",
    level: 3,
    bucket: "situational",
    note: "real crit-range/confirmation bonus, but conditional on drawing and throwing a harrow card matching the magus's alignment — a specific-action condition the engine can't check",
  },

  // ── magus:deep-marshal ──
  "magus:deep-marshal:bound-by-tradition:1": {
    archetypeId: "magus:deep-marshal",
    name: "Bound by Tradition",
    level: 1,
    bucket: "blocked",
    note: "explicitly resizes the arcane pool to 1/3 magus level (vs. the vendored 1/2-level formula) and restricts spend/spell-combat/spellstrike to specific weapons — a genuine formula change; extracting it would double-count or conflict with the vendored Arcane Pool uses.maxFormula",
  },
  "magus:deep-marshal:deep-spellcasting:1": {
    archetypeId: "magus:deep-marshal",
    name: "Deep Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "spell-list additions/restrictions, no Change-shaped number",
  },
  "magus:deep-marshal:miner-s-focus:3": {
    archetypeId: "magus:deep-marshal",
    name: "Miner's Focus",
    level: 3,
    bucket: "situational",
    note: "real caster-level/skill-rank bonuses, but conditioned on wielding a specific magic weapon type — no 'cl' engine target exists (targets.ts unapplied list) and 'treated as having ranks equal to level' isn't a flat modifier a Change can express",
  },
  "magus:deep-marshal:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:deep-marshal",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency plus a spell-failure exemption, no Change",
  },

  // ── magus:eldritch-archer ──
  "magus:eldritch-archer:arcane-pool:1": {
    archetypeId: "magus:eldritch-archer",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "restricts arcane pool weapon-ability choices to ranged-friendly options; formula matches the vendored 1/2-level+Int baseline exactly, no size change — no flat number beyond the unmodified pool",
  },
  "magus:eldritch-archer:focusing-spellstrike:16": {
    archetypeId: "magus:eldritch-archer",
    name: "Focusing Spellstrike",
    level: 16,
    bucket: "subsystem",
    note: "delivers cone/line spells as a ray via spellstrike, replaces counterstrike — spellstrike/counterstrike are prose-only (class note 3/4)",
  },
  "magus:eldritch-archer:ranged-spell-combat:1": {
    archetypeId: "magus:eldritch-archer",
    name: "Ranged Spell Combat",
    level: 1,
    bucket: "subsystem",
    note: "alters spell combat to use a ranged weapon — spell combat is a prose-only display feature (class note 3)",
  },
  "magus:eldritch-archer:ranged-spellstrike:2": {
    archetypeId: "magus:eldritch-archer",
    name: "Ranged Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "alters spellstrike for ranged touch spells — prose-only (class note 3)",
  },
  "magus:eldritch-archer:ranged-weapon-bond:1": {
    archetypeId: "magus:eldritch-archer",
    name: "Ranged Weapon Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonded ranged weapon — unrelated subsystem",
  },

  // ── magus:eldritch-scion ──
  "magus:eldritch-scion:bloodline:1": {
    archetypeId: "magus:eldritch-scion",
    name: "Bloodline",
    level: 1,
    bucket: "subsystem",
    note: "grants a bloodrager bloodline — no bloodrager-bloodline modeling exists in this engine (bloodlines.ts is sorcerer-only), deferred",
  },
  "magus:eldritch-scion:bonus-spells:7": {
    archetypeId: "magus:eldritch-scion",
    name: "Bonus Spells",
    level: 7,
    bucket: "subsystem",
    note: "bloodline bonus-spell schedule — bloodline mechanics not modeled for magus (see bloodline:1 above), replaces knowledge pool",
  },
  "magus:eldritch-scion:eldritch-pool:1": {
    archetypeId: "magus:eldritch-scion",
    name: "Eldritch Pool",
    level: 1,
    bucket: "subsystem",
    note: "replaces arcane pool with a Charisma-based pool of the same shape — the Int-to-Cha stat-basis swap isn't expressible as a Change (resource-pool sizing is a vendored uses.maxFormula, not a Change target), so nothing to extract; a known resource-formula gap, not a double-count risk since this pipeline never touches pool sizing",
  },
  "magus:eldritch-scion:greater-spell-combat:18": {
    archetypeId: "magus:eldritch-scion",
    name: "Greater Spell Combat",
    level: 18,
    bucket: "subsystem",
    note: "delayed reflavor of Greater Spell Combat's doubled-concentration-bonus text — spell combat family is prose-only (class note 3)",
  },
  "magus:eldritch-scion:improved-spell-combat:14": {
    archetypeId: "magus:eldritch-scion",
    name: "Improved Spell Combat",
    level: 14,
    bucket: "subsystem",
    note: "delayed reflavor of Improved Spell Combat's text, paired to Greater Spell Combat's base-feature slot (the L14 slot she gets instead of Greater Spell Combat) — prose-only regardless (class note 3)",
  },
  "magus:eldritch-scion:spell-combat:1": {
    archetypeId: "magus:eldritch-scion",
    name: "Spell Combat",
    level: 1,
    bucket: "subsystem",
    note: "restricts spell combat to mystic-focus state until 8th — prose-only (class note 3)",
  },
  "magus:eldritch-scion:spells:1": {
    archetypeId: "magus:eldritch-scion",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "replaces magus spellcasting with a bard-style spells-known/Cha-based progression — no Change-shaped number (spells-known/slots aren't Change targets)",
  },

  // ── magus:elemental-knight ──
  "magus:elemental-knight:elemental-arcana:3": {
    archetypeId: "magus:elemental-knight",
    name: "Elemental Arcana",
    level: 3,
    bucket: "subsystem",
    note: "arcana list addition (elemental-themed arcana) — deferred (class note 2)",
  },
  "magus:elemental-knight:elemental-matrix:4": {
    archetypeId: "magus:elemental-knight",
    name: "Elemental Matrix",
    level: 4,
    bucket: "subsystem",
    note: "bonus feat plus a rounds-to-arcane-pool-points conversion — resource mechanic, replaces spell recall (prose-only)",
  },

  // ── magus:esoteric ──
  "magus:esoteric:ac-bonus:7": {
    archetypeId: "magus:esoteric",
    name: "AC Bonus",
    level: 7,
    bucket: "numeric",
    note: "+1/+2 dodge bonus to AC and CMD while wearing light or no armor — @armor.type is checkable; the shield/immobilized/overloaded exclusions are a second condition the engine can't check and are dropped (flagged in detail)",
  },
  "magus:esoteric:arcane-pool:1": {
    archetypeId: "magus:esoteric",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "extends pool-spend to unarmed strikes plus a special-ability choice-list; formula matches the vendored 1/2-level+Int baseline exactly",
  },
  "magus:esoteric:diminished-spellcasting:1": {
    archetypeId: "magus:esoteric",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target for spell-slot counts",
  },
  "magus:esoteric:improved-tattooed-spell:11": {
    archetypeId: "magus:esoteric",
    name: "Improved Tattooed Spell",
    level: 11,
    bucket: "subsystem",
    note: "extra daily use of a spell-like ability — resource mechanic",
  },
  "magus:esoteric:ki-arcana:4": {
    archetypeId: "magus:esoteric",
    name: "Ki Arcana",
    level: 4,
    bucket: "subsystem",
    note: "pool/ki interoperability — resource mechanic, no flat number",
  },
  "magus:esoteric:tattooed-spell:5": {
    archetypeId: "magus:esoteric",
    name: "Tattooed Spell",
    level: 5,
    bucket: "subsystem",
    note: "grants spell-like abilities from tattooed spells, replaces bonus feats — resource mechanic",
  },
  "magus:esoteric:unarmed-spellstrike:2": {
    archetypeId: "magus:esoteric",
    name: "Unarmed Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "restricts spellstrike to unarmed strikes — prose-only (class note 3)",
  },
  "magus:esoteric:unarmed-strike:1": {
    archetypeId: "magus:esoteric",
    name: "Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat plus monk-level unarmed damage progression — no engine target for unarmed-strike damage dice",
  },
  "magus:esoteric:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:esoteric",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts proficiency to simple weapons only — no Change",
  },

  // ── magus:fiend-flayer ──
  "magus:fiend-flayer:infernal-mortification:1": {
    archetypeId: "magus:fiend-flayer",
    name: "Infernal Mortification",
    level: 1,
    bucket: "subsystem",
    note: "sacrifices Constitution for temporary arcane pool points — activated resource mechanic, no flat number",
  },

  // ── magus:greensting-slayer ──
  "magus:greensting-slayer:arcane-pool:1": {
    archetypeId: "magus:greensting-slayer",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "redirects arcane pool spend into sneak-attack dice on a melee attack — an activated, sneak-attack-conditional dice bonus (not a flat modifier), same posture as other activated/resource-gated abilities this pipeline leaves unmodeled",
  },
  "magus:greensting-slayer:evasion:7": {
    archetypeId: "magus:greensting-slayer",
    name: "Evasion",
    level: 7,
    bucket: "subsystem",
    note: "grants rogue evasion, replaces the medium armor ability — unrelated ability",
  },
  "magus:greensting-slayer:improved-evasion:13": {
    archetypeId: "magus:greensting-slayer",
    name: "Improved Evasion",
    level: 13,
    bucket: "subsystem",
    note: "grants rogue improved evasion, replaces the heavy armor ability — unrelated ability",
  },

  // ── magus:hexbreaker ──
  "magus:hexbreaker:counter-curse:11": {
    archetypeId: "magus:hexbreaker",
    name: "Counter Curse",
    level: 11,
    bucket: "subsystem",
    note: "spell-turning trigger on a successful repel-curse dispel — unrelated ability",
  },
  "magus:hexbreaker:hexbreaker-arcana:3": {
    archetypeId: "magus:hexbreaker",
    name: "Hexbreaker Arcana",
    level: 3,
    bucket: "subsystem",
    note: "arcana list addition — deferred (class note 2)",
  },
  "magus:hexbreaker:repel-curse:4": {
    archetypeId: "magus:hexbreaker",
    name: "Repel Curse",
    level: 4,
    bucket: "subsystem",
    note: "immediate-action dispel ability plus spell-list additions — no flat number",
  },

  // ── magus:hexcrafter ──
  "magus:hexcrafter:hex-arcana:3": {
    archetypeId: "magus:hexcrafter",
    name: "Hex Arcana",
    level: 3,
    bucket: "subsystem",
    note: "arcana/hex list access — deferred (class note 2)",
  },
  "magus:hexcrafter:hex-magus:4": {
    archetypeId: "magus:hexcrafter",
    name: "Hex Magus",
    level: 4,
    bucket: "subsystem",
    note: "grants a witch hex, replaces spell recall — unrelated ability",
  },
  "magus:hexcrafter:spells:1": {
    archetypeId: "magus:hexcrafter",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "adds curse-descriptor spells to the magus spell list — no Change-shaped number",
  },

  // ── magus:iron-ring-striker ──
  "magus:iron-ring-striker:arcane-pool:1": {
    archetypeId: "magus:iron-ring-striker",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "extends pool-spend to unarmed strikes plus a special-ability choice-list; formula matches the vendored 1/2-level+Int baseline exactly",
  },
  "magus:iron-ring-striker:bonus-feat:5": {
    archetypeId: "magus:iron-ring-striker",
    name: "Bonus Feat",
    level: 5,
    bucket: "numeric",
    note: "flat bonus-feat count (5th level, then every 6 levels), restricted to a maneuver-feat list at 5th — the restriction isn't modeled, only the count, same posture as the hand-verified ranger/cleric bonus-feat entries",
  },
  "magus:iron-ring-striker:diminished-spellcasting:1": {
    archetypeId: "magus:iron-ring-striker",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:iron-ring-striker:empower-combat:7": {
    archetypeId: "magus:iron-ring-striker",
    name: "Empower Combat",
    level: 7,
    bucket: "subsystem",
    note: "activated, spell-slot-sacrifice size-increase ability — resource-gated, not a baseline modifier",
  },
  "magus:iron-ring-striker:reflexive-spell-maneuver:16": {
    archetypeId: "magus:iron-ring-striker",
    name: "Reflexive Spell Maneuver",
    level: 16,
    bucket: "subsystem",
    note: "immediate-action combat-maneuver-as-spell-delivery ability, replaces counterstrike — unrelated mechanic",
  },
  "magus:iron-ring-striker:spell-maneuvers:7": {
    archetypeId: "magus:iron-ring-striker",
    name: "Spell Maneuvers",
    level: 7,
    bucket: "subsystem",
    note: "lets unarmed spellstrike be used as part of a combat maneuver — unrelated mechanic",
  },
  "magus:iron-ring-striker:unarmed-spellstrike:2": {
    archetypeId: "magus:iron-ring-striker",
    name: "Unarmed Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "restricts spellstrike to unarmed strikes — prose-only (class note 3)",
  },
  "magus:iron-ring-striker:unarmed-strike:1": {
    archetypeId: "magus:iron-ring-striker",
    name: "Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat plus monk-level unarmed damage — no engine target for unarmed-strike damage dice",
  },
  "magus:iron-ring-striker:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:iron-ring-striker",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base weapon/armor proficiency text verbatim — no Change",
  },

  // ── magus:jistkan-artificer ──
  "magus:jistkan-artificer:empowered-arm:3": {
    archetypeId: "magus:jistkan-artificer",
    name: "Empowered Arm",
    level: 3,
    bucket: "situational",
    note: "real, scaling enhancement bonus (+1 at 3rd, +1 every 4 levels to +5 at 19th) on the golem-arm unarmed strike, but scoped to that single unique per-character weapon — no engine target exists for natural/unarmed attacks (nattack/ndamage aren't applied, see targets.ts) and it isn't a WEAPON_GROUPS category",
  },
  "magus:jistkan-artificer:golem-arm:1": {
    archetypeId: "magus:jistkan-artificer",
    name: "Golem Arm",
    level: 1,
    bucket: "subsystem",
    note: "grants a masterwork golem-arm unarmed strike with monk-level damage — no engine target for unarmed-strike damage dice; also extends arcane-pool spend options",
  },
  "magus:jistkan-artificer:improved-unarmed-strike:1": {
    archetypeId: "magus:jistkan-artificer",
    name: "Improved Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat grant",
  },
  "magus:jistkan-artificer:unarmed-spellstrike:2": {
    archetypeId: "magus:jistkan-artificer",
    name: "Unarmed Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "restricts spellstrike to unarmed strikes — prose-only (class note 3)",
  },

  // ── magus:kapenia-dancer ──
  "magus:kapenia-dancer:canny-defense:1": {
    archetypeId: "magus:kapenia-dancer",
    name: "Canny Defense",
    level: 1,
    bucket: "situational",
    note: "real Int-to-AC/CMD bonus (duelist's Canny Defense), but conditioned on wielding a bladed scarf specifically — no formula input for 'is this weapon in hand', and AC/CMD targets aren't weapon-scoped",
  },
  "magus:kapenia-dancer:diminished-spellcasting:1": {
    archetypeId: "magus:kapenia-dancer",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:kapenia-dancer:kapenia-dancer-arcana:3": {
    archetypeId: "magus:kapenia-dancer",
    name: "Kapenia Dancer Arcana",
    level: 3,
    bucket: "subsystem",
    note: "arcana list addition — deferred (class note 2)",
  },
  "magus:kapenia-dancer:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:kapenia-dancer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },
  "magus:kapenia-dancer:weapon-focus:1": {
    archetypeId: "magus:kapenia-dancer",
    name: "Weapon Focus",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Weapon Focus) grant",
  },

  // ── magus:kensai ──
  "magus:kensai:canny-defense:1": {
    archetypeId: "magus:kensai",
    name: "Canny Defense",
    level: 1,
    bucket: "situational",
    note: "same Canny Defense pattern as Kapenia Dancer above, conditioned on wielding the kensai's chosen weapon — not checkable",
  },
  "magus:kensai:critical-perfection:9": {
    archetypeId: "magus:kensai",
    name: "Critical Perfection",
    level: 9,
    bucket: "subsystem",
    note: "crit-confirmation bonus plus BAB-substitution for Critical Focus feats — 'critConfirm' isn't an applied target (targets.ts unapplied list)",
  },
  "magus:kensai:diminished-spellcasting:1": {
    archetypeId: "magus:kensai",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:kensai:fighter-training:7": {
    archetypeId: "magus:kensai",
    name: "Fighter Training",
    level: 7,
    bucket: "subsystem",
    note: "virtual fighter levels for feat prerequisites — matches the base Fighter Training treatment (class note 4), no Change",
  },
  "magus:kensai:iaijutsu-focus:13": {
    archetypeId: "magus:kensai",
    name: "Iaijutsu Focus",
    level: 13,
    bucket: "situational",
    note: "real Int-mod-to-damage bonus, but conditioned on a surprise round or an already-flat-footed target — a specific-action/enemy-state condition the engine can't check",
  },
  "magus:kensai:iaijutsu-master:19": {
    archetypeId: "magus:kensai",
    name: "Iaijutsu Master",
    level: 19,
    bucket: "subsystem",
    note: "auto-20 initiative plus surprise immunity, replaces greater spell access — absolute effects with no engine target (not a modifier)",
  },
  "magus:kensai:iaijutsu:7": {
    archetypeId: "magus:kensai",
    name: "Iaijutsu",
    level: 7,
    bucket: "numeric",
    note: "adds Int modifier (minimum 0) to initiative rolls, unconditional — the accompanying flat-footed-AoO/free-action-draw ability is dropped (not a number)",
  },
  "magus:kensai:perfect-strike:4": {
    archetypeId: "magus:kensai",
    name: "Perfect Strike",
    level: 4,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent damage-maximizing/crit-multiplier ability, replaces spell recall — resource-gated, no flat number",
  },
  "magus:kensai:superior-reflexes:11": {
    archetypeId: "magus:kensai",
    name: "Superior Reflexes",
    level: 11,
    bucket: "subsystem",
    note: "extra attacks-of-opportunity per round equal to Int modifier, replaces improved spell recall — no engine target for AoO count",
  },
  "magus:kensai:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:kensai",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts proficiency to simple plus one chosen weapon — no Change",
  },
  "magus:kensai:weapon-focus:1": {
    archetypeId: "magus:kensai",
    name: "Weapon Focus",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Weapon Focus) grant",
  },
  "magus:kensai:weapon-mastery:20": {
    archetypeId: "magus:kensai",
    name: "Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "auto-confirm-crit-on-favored-weapon ability, replaces true magus — no engine target for crit auto-confirm (same pattern as fighter's Weapon Mastery reflavors)",
  },

  // ── magus:magic-warrior ──
  "magus:magic-warrior:improved-spell-combat:14": {
    archetypeId: "magus:magic-warrior",
    name: "Improved Spell Combat",
    level: 14,
    bucket: "subsystem",
    note: "delayed reflavor of Improved Spell Combat's text — prose-only (class note 3)",
  },
  "magus:magic-warrior:magaambya-spell-access:19": {
    archetypeId: "magus:magic-warrior",
    name: "Magaambya Spell Access",
    level: 19,
    bucket: "subsystem",
    note: "adds druid spells to the spell list, replaces greater spell access — no Change-shaped number",
  },
  "magus:magic-warrior:magic-warrior-s-aspect:3": {
    archetypeId: "magus:magic-warrior",
    name: "Magic Warrior's Aspect",
    level: 3,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent beast-shape-ability grant, replaces the magus arcana gained at 3rd — resource-gated (arcana list, class note 2)",
  },
  "magus:magic-warrior:nameless-anonymity:8": {
    archetypeId: "magus:magic-warrior",
    name: "Nameless Anonymity",
    level: 8,
    bucket: "subsystem",
    note: "1/day self-nondetection plus notes the improved-spell-combat delay — limited-use activated ability",
  },
  "magus:magic-warrior:nameless-mask:1": {
    archetypeId: "magus:magic-warrior",
    name: "Nameless Mask",
    level: 1,
    bucket: "situational",
    note: "real +2 save bonus, but scoped to a specific spell subschool (divination/scrying) — saving throws aren't modeled per-school, only fort/ref/will as a whole, so applying it would over-apply to all Will saves",
  },

  // ── magus:mindblade ──
  "magus:mindblade:dual-manifest:13": {
    archetypeId: "magus:mindblade",
    name: "Dual Manifest",
    level: 13,
    bucket: "subsystem",
    note: "manifests two psychic weapons at once plus a two-handed spell-combat exception, replaces heavy armor — unrelated mechanic",
  },
  "magus:mindblade:dual-weapons:7": {
    archetypeId: "magus:mindblade",
    name: "Dual Weapons",
    level: 7,
    bucket: "subsystem",
    note: "governs the homebrew psychic-weapon enhancement-bonus penalty when dual-wielding — that resource isn't modeled at all (see psychic-pool below), replaces medium armor",
  },
  "magus:mindblade:psychic-access:4": {
    archetypeId: "magus:mindblade",
    name: "Psychic Access",
    level: 4,
    bucket: "subsystem",
    note: "adds psychic-class spells to the spell list — no Change-shaped number",
  },
  "magus:mindblade:psychic-pool:1": {
    archetypeId: "magus:mindblade",
    name: "Psychic Pool",
    level: 1,
    bucket: "situational",
    note: "a real, scaling enhancement bonus (+1 at 1st to +5 by 12th, plus more at 15th/18th) on a manifested psychic weapon, but the weapon's category is freely re-chosen each use (light/one-handed/two-handed, any type) — no stable weapon-group target to scope it to; replaces arcane pool entirely",
  },
  "magus:mindblade:rapid-manifest:8": {
    archetypeId: "magus:mindblade",
    name: "Rapid Manifest",
    level: 8,
    bucket: "subsystem",
    note: "lets the psychic weapon be manifested as a swift action, replaces improved spell combat — unrelated mechanic",
  },
  "magus:mindblade:spells:1": {
    archetypeId: "magus:mindblade",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "replaces magus spellcasting with a bard-style psychic-spell progression — no Change-shaped number",
  },

  // ── magus:myrmidarch ──
  "magus:myrmidarch:armor-mastery:20": {
    archetypeId: "magus:myrmidarch",
    name: "Armor Mastery",
    level: 20,
    bucket: "numeric",
    note: "DR 5/— while wearing any armor, replaces true magus — a clean @armor.type>=1 check, safe now that zero-value DR qualifiers are dropped before rendering (see the dr-at-0 fix note)",
  },
  "magus:myrmidarch:armor-training:8": {
    archetypeId: "magus:myrmidarch",
    name: "Armor Training",
    level: 8,
    bucket: "numeric",
    note: "grants fighter Armor Training on a 2-tier cadence (8th/14th), replacing improved spell combat and greater spell combat (both prose-only, no vendored numbers to double-count) — the vendored pairing only linked the Improved Spell Combat half of the claimed double replacement; issue #47 fixed the classFeatures display by adding Greater Spell Combat's uuid to `ADDITIONAL_SWAP_TARGETS` in `archetypes.ts` (no numeric impact either way, since neither replaced feature carries a vendored number)",
  },
  "magus:myrmidarch:diminished-spellcasting:1": {
    archetypeId: "magus:myrmidarch",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:myrmidarch:fighter-training:7": {
    archetypeId: "magus:myrmidarch",
    name: "Fighter Training",
    level: 7,
    bucket: "subsystem",
    note: "virtual fighter levels for feat prerequisites, replaces knowledge pool and the magus's own 10th-level fighter-training bump — matches the base Fighter Training treatment (class note 4), no Change",
  },
  "magus:myrmidarch:ranged-spellstrike:4": {
    archetypeId: "magus:myrmidarch",
    name: "Ranged Spellstrike",
    level: 4,
    bucket: "subsystem",
    note: "alters spellstrike for ranged touch spells — prose-only (class note 3)",
  },
  "magus:myrmidarch:weapon-training:6": {
    archetypeId: "magus:myrmidarch",
    name: "Weapon Training",
    level: 6,
    bucket: "situational",
    note: "a real, scaling multi-weapon-group Weapon Training grant (as the fighter ability, up to 3 player-chosen groups by 18th), but unlike the single-fixed-group archetype reflavors this pipeline extracts elsewhere, there's no build field tracking WHICH weapon groups a myrmidarch chose — a blanket bonus to every weapon group a character owns would over-apply",
  },

  // ── magus:nature-bonded-magus ──
  "magus:nature-bonded-magus:familiar-symbiosis:4": {
    archetypeId: "magus:nature-bonded-magus",
    name: "Familiar Symbiosis",
    level: 4,
    bucket: "situational",
    note: "real half-familiar's-natural-armor AC bonus, but conditioned on being merged with the familiar and dependent on that specific familiar's own stat block, replaces spell recall",
  },
  "magus:nature-bonded-magus:improved-familiar-symbiosis:11": {
    archetypeId: "magus:nature-bonded-magus",
    name: "Improved Familiar Symbiosis",
    level: 11,
    bucket: "situational",
    note: "real +4 enhancement Str/Con bonus, but conditioned on the same merged-familiar state as above",
  },
  "magus:nature-bonded-magus:natural-magic:1": {
    archetypeId: "magus:nature-bonded-magus",
    name: "Natural Magic",
    level: 1,
    bucket: "subsystem",
    note: "adds druid spells to the spell list — no Change-shaped number",
  },
  "magus:nature-bonded-magus:plant-familiar:1": {
    archetypeId: "magus:nature-bonded-magus",
    name: "Plant Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants the familiar magus arcana (restricted to a plant familiar) — arcana list modification, deferred (class note 2)",
  },
  "magus:nature-bonded-magus:woodland-stride:7": {
    archetypeId: "magus:nature-bonded-magus",
    name: "Woodland Stride",
    level: 7,
    bucket: "subsystem",
    note: "terrain-movement rule, no engine target, replaces knowledge pool",
  },

  // ── magus:puppetmaster ──
  "magus:puppetmaster:arcane-pool:1": {
    archetypeId: "magus:puppetmaster",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "redirects arcane pool spend into a save-DC/caster-level bump for enchantment/illusion spells cast — activated, and neither a spell-DC nor a 'cl' target exists (targets.ts unapplied list)",
  },
  "magus:puppetmaster:charmstrike:2": {
    archetypeId: "magus:puppetmaster",
    name: "Charmstrike",
    level: 2,
    bucket: "subsystem",
    note: "triggered, prepared-spell-expending enchantment ability, replaces spellstrike/fighter training/counterstrike — all prose-only or no-Change (class notes 3/4)",
  },
  "magus:puppetmaster:puppet-combat:1": {
    archetypeId: "magus:puppetmaster",
    name: "Puppet Combat",
    level: 1,
    bucket: "subsystem",
    note: "restricts spell combat/improved spell combat/greater spell combat to enchantment/illusion spells — the whole family is prose-only (class note 3)",
  },
  "magus:puppetmaster:scene-stealer:20": {
    archetypeId: "magus:puppetmaster",
    name: "Scene Stealer",
    level: 20,
    bucket: "subsystem",
    note: "activated illusion-stealing ability, replaces true magus — unrelated mechanic",
  },
  "magus:puppetmaster:spells:1": {
    archetypeId: "magus:puppetmaster",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "casts bard spells as magus spells, replaces knowledge pool and greater spell access — no Change-shaped number",
  },
  "magus:puppetmaster:the-show-must-go-on:1": {
    archetypeId: "magus:puppetmaster",
    name: "The Show Must Go On",
    level: 1,
    bucket: "subsystem",
    note: "links an illusion to an enchanted target, replaces medium armor and heavy armor — unrelated mechanic",
  },

  // ── magus:sigilus ──
  "magus:sigilus:inscribe-rune:2": {
    archetypeId: "magus:sigilus",
    name: "Inscribe Rune",
    level: 2,
    bucket: "situational",
    note: "real spell-combat-penalty adjustments (-1/+2), but conditioned on matching the school of a rune the player chose to inscribe — a specific condition the engine can't check; replaces spellstrike",
  },
  "magus:sigilus:inscribe-sihedron:7": {
    archetypeId: "magus:sigilus",
    name: "Inscribe Sihedron",
    level: 7,
    bucket: "subsystem",
    note: "grants a player-chosen pair of energy resistances plus an armor-bonus increase on a specific inscribed suit of light armor — a daily choice-list, same posture as the arcane-pool weapon-ability choice-lists elsewhere in this table",
  },

  // ── magus:skirnir ──
  "magus:skirnir:arcane-bond:1": {
    archetypeId: "magus:skirnir",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonded shield item — unrelated subsystem",
  },
  "magus:skirnir:arcane-pool:1": {
    archetypeId: "magus:skirnir",
    name: "Arcane Pool",
    level: 1,
    bucket: "subsystem",
    note: "extends pool-spend to shield enhancement plus a shield-ability choice-list; formula matches the vendored 1/2-level+Int baseline exactly",
  },
  "magus:skirnir:diminished-spellcasting:1": {
    archetypeId: "magus:skirnir",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:skirnir:greater-spellshield:16": {
    archetypeId: "magus:skirnir",
    name: "Greater Spellshield",
    level: 16,
    bucket: "subsystem",
    note: "activated stored-spell-redirect ability, replaces counterstrike — unrelated mechanic",
  },
  "magus:skirnir:shield-pool:4": {
    archetypeId: "magus:skirnir",
    name: "Shield Pool",
    level: 4,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent concentration-check bonus, replaces spell recall — 'concentration' isn't an applied target",
  },
  "magus:skirnir:shielded-spell-combat:8": {
    archetypeId: "magus:skirnir",
    name: "Shielded Spell Combat",
    level: 8,
    bucket: "subsystem",
    note: "restricts spell combat to the bonded shield — prose-only (class note 3)",
  },
  "magus:skirnir:sorcerous-shield:1": {
    archetypeId: "magus:skirnir",
    name: "Sorcerous Shield",
    level: 1,
    bucket: "subsystem",
    note: "shield proficiency plus a fighter-level tie-in for feats, replaces spell combat — prose-only (class note 3)",
  },
  "magus:skirnir:spell-recall:11": {
    archetypeId: "magus:skirnir",
    name: "Spell Recall",
    level: 11,
    bucket: "subsystem",
    note: "reflavor of spell recall — resource/action mechanic, no flat number",
  },
  "magus:skirnir:spellshield:7": {
    archetypeId: "magus:skirnir",
    name: "Spellshield",
    level: 7,
    bucket: "subsystem",
    note: "stores a spell in the shield (spell-storing analog), replaces knowledge pool — unrelated mechanic",
  },
  "magus:skirnir:spellstrike:2": {
    archetypeId: "magus:skirnir",
    name: "Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "alters spellstrike to work with a shield bash — prose-only (class note 3)",
  },

  // ── magus:sorrowblade ──
  "magus:sorrowblade:cruel-weapon:5": {
    archetypeId: "magus:sorrowblade",
    name: "Cruel Weapon",
    level: 5,
    bucket: "subsystem",
    note: "swaps one arcane-pool weapon-ability choice for another — choice-list, no flat number",
  },
  "magus:sorrowblade:despairing-strike:3": {
    archetypeId: "magus:sorrowblade",
    name: "Despairing Strike",
    level: 3,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent Will-save-or-shaken ability — resource-gated, DC formula isn't a Change target",
  },
  "magus:sorrowblade:wretched-strike:12": {
    archetypeId: "magus:sorrowblade",
    name: "Wretched Strike",
    level: 12,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent debuff-on-hit ability — resource-gated, no flat number",
  },

  // ── magus:soul-forger ──
  "magus:soul-forger:arcane-bond:1": {
    archetypeId: "magus:soul-forger",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonded weapon item — unrelated subsystem",
  },
  "magus:soul-forger:destructive-counterstrike:16": {
    archetypeId: "magus:soul-forger",
    name: "Destructive Counterstrike",
    level: 16,
    bucket: "subsystem",
    note: "AoO trigger against item activation, replaces counterstrike — unrelated mechanic (class note 4)",
  },
  "magus:soul-forger:diminished-spellcasting:1": {
    archetypeId: "magus:soul-forger",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell slots by one per level — no Change target",
  },
  "magus:soul-forger:fortify-bond:4": {
    archetypeId: "magus:soul-forger",
    name: "Fortify Bond",
    level: 4,
    bucket: "subsystem",
    note: "activated hardness/hp boost to the bonded item, replaces spell recall — resource mechanic",
  },
  "magus:soul-forger:instantaneous-reconstruction:19": {
    archetypeId: "magus:soul-forger",
    name: "Instantaneous Reconstruction",
    level: 19,
    bucket: "subsystem",
    note: "activated item-reforging ability, replaces greater spell access — unrelated mechanic",
  },
  "magus:soul-forger:master-smith:1": {
    archetypeId: "magus:soul-forger",
    name: "Master Smith",
    level: 1,
    bucket: "situational",
    note: "real, unconditional Craft-check bonus equal to magus level, but scoped to specific Craft specializations (armor/shields/weapons) — those are freeform player-slugged skill instances (crf.<slug>, see tables.ts), not a fixed convention like Pesh Expert's well-established crf.alchemy; guessing a slug would silently miss most characters",
  },
  "magus:soul-forger:reforge:11": {
    archetypeId: "magus:soul-forger",
    name: "Reforge",
    level: 11,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent object-repair ability, replaces improved spell recall — resource mechanic",
  },
  "magus:soul-forger:spell-combat:1": {
    archetypeId: "magus:soul-forger",
    name: "Spell Combat",
    level: 1,
    bucket: "subsystem",
    note: "restricts spell combat to the bonded weapon — prose-only (class note 3)",
  },
  "magus:soul-forger:spellstrike:2": {
    archetypeId: "magus:soul-forger",
    name: "Spellstrike",
    level: 2,
    bucket: "subsystem",
    note: "restricts spellstrike to the bonded weapon — prose-only (class note 3)",
  },

  // ── magus:spell-dancer ──
  "magus:spell-dancer:arcane-movement:5": {
    archetypeId: "magus:spell-dancer",
    name: "Arcane Movement",
    level: 5,
    bucket: "situational",
    note: "real competence bonus on four skills equal to the spell's level, but only until the start of the dancer's next turn after casting a spell — a per-round conditional buff state, replaces the 5th-level bonus feat",
  },
  "magus:spell-dancer:dance-of-avoidance:7": {
    archetypeId: "magus:spell-dancer",
    name: "Dance of Avoidance",
    level: 7,
    bucket: "numeric",
    note: "+2 insight AC bonus while wearing light or no armor — @armor.type is checkable, replaces the medium armor class feature",
  },
  "magus:spell-dancer:greater-dance-of-avoidance:13": {
    archetypeId: "magus:spell-dancer",
    name: "Greater Dance of Avoidance",
    level: 13,
    bucket: "numeric",
    note: "same condition, insight bonus increases to +4 — typed-bonus stacking (highest-within-type) means adding this alongside the L7 entry naturally yields the 'increases to +4' text without double-counting; replaces the heavy armor class feature",
  },
  "magus:spell-dancer:spell-dance:1": {
    archetypeId: "magus:spell-dancer",
    name: "Spell Dance",
    level: 1,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent movement/AC buff (and later fly/haste/blur/dimension-door/freedom-of-movement uses), replaces the magus's normal pool-to-weapon-enhancement use — resource-gated, not a passive number",
  },

  // ── magus:spell-trapper ──
  "magus:spell-trapper:diminished-arcana:3": {
    archetypeId: "magus:spell-trapper",
    name: "Diminished Arcana",
    level: 3,
    bucket: "subsystem",
    note: "shifts effective level for arcana selection, trades arcana for traps — arcana mechanics deferred (class note 2)",
  },
  "magus:spell-trapper:distant-trapping:10": {
    archetypeId: "magus:spell-trapper",
    name: "Distant Trapping",
    level: 10,
    bucket: "subsystem",
    note: "increases spell-trap creation range — trap subsystem, no engine target",
  },
  "magus:spell-trapper:spell-traps:4": {
    archetypeId: "magus:spell-trapper",
    name: "Spell Traps",
    level: 4,
    bucket: "subsystem",
    note: "trap-crafting subsystem (ranger-trap analog) — no Change-shaped number",
  },

  // ── magus:spellblade ──
  "magus:spellblade:force-athame:2": {
    archetypeId: "magus:spellblade",
    name: "Force Athame",
    level: 2,
    bucket: "subsystem",
    note: "activated, sacrificed-spell-level-scaled force-weapon conjuration, replaces spellstrike — resource-gated, variable per use, not a baseline number",
  },
  "magus:spellblade:spellblade-arcana:2": {
    archetypeId: "magus:spellblade",
    name: "Spellblade Arcana",
    level: 2,
    bucket: "subsystem",
    note: "arcana list addition — deferred (class note 2)",
  },

  // ── magus:spire-defender ──
  "magus:spire-defender:arcane-augmentation:4": {
    archetypeId: "magus:spire-defender",
    name: "Arcane Augmentation",
    level: 4,
    bucket: "subsystem",
    note: "activated, arcane-pool-spent competence bonus to a player-chosen skill each use, replaces spell recall — not a passive number",
  },
  "magus:spire-defender:bonus-feat:1": {
    archetypeId: "magus:spire-defender",
    name: "Bonus Feat",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat grant (Combat Expertise, Dodge)",
  },
  "magus:spire-defender:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:spire-defender",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts proficiency — no Change",
  },

  // ── magus:staff-magus ──
  "magus:staff-magus:quarterstaff-defense:7": {
    archetypeId: "magus:staff-magus",
    name: "Quarterstaff Defense",
    level: 7,
    bucket: "situational",
    note: "real shield-AC bonus equal to the wielded quarterstaff's current enhancement bonus, but that enhancement bonus is a dynamic property of a specific item (including arcane-pool top-ups) with no formula input — replaces medium armor and heavy armor",
  },
  "magus:staff-magus:quarterstaff-master:1": {
    archetypeId: "magus:staff-magus",
    name: "Quarterstaff Master",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat (Quarterstaff Master), restricted to light/no armor for its benefit — feat grant, no Change",
  },
  "magus:staff-magus:staff-weapon:10": {
    archetypeId: "magus:staff-magus",
    name: "Staff Weapon",
    level: 10,
    bucket: "situational",
    note: "real enhancement bonus on a wielded magic staff treated as a quarterstaff, but scaled off that specific staff's caster level — no formula input for an individual item's caster level, replaces fighter training",
  },
  "magus:staff-magus:weapon-and-armor-proficiency:1": {
    archetypeId: "magus:staff-magus",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts proficiency to simple weapons only — no Change",
  },
};

/**
 * ── MAGUS_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────────
 *
 * Machine-extracted mechanical effects for magus archetype class features
 * (issue #45 — the prose→Change extraction pipeline, magus slice). Clean-room
 * from the published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 8 of magus's 150 features
 * cleared the `numeric` bar (see `MAGUS_ARCHETYPE_FEATURE_CLASSIFICATION`
 * above for the full per-feature audit) — magus's kit leans heavily on
 * arcane-pool spend-options, magus arcana, and prose-only spell-combat/
 * spellstrike upgrades, all of which are deferred subsystems in this engine
 * today (see this file's header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose (an irregular schedule, a delayed onset), or the bonus is gated
 *    on a real-but-partial condition this engine CAN check (`@armor.type`)
 *    while a second, textually-present condition (a shield, encumbrance,
 *    immobilization) can't be checked and is dropped — partial honesty,
 *    flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const MAGUS_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Armored Battlemage's own "Armor Training" (Weapon Master's Handbook)
  // grants the fighter's Armor Training ability wholesale, but on its own
  // 5-level cadence (3rd/8th/13th/18th) rather than fighter's usual 4-level
  // one — replaces the magus arcana gained at 3rd/18th (no vendored changes
  // to suppress) and improved spell combat (prose-only either way).
  "magus:armored-battlemage:armor-training:3": {
    changes: [
      c("clamp(1 + floor((@class.unlevel - 3) / 5), 0, 4)", "mDexA"),
      c("-clamp(1 + floor((@class.unlevel - 3) / 5), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, 1 + Math.floor((level - 3) / 5))} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "At 3rd level, an armored battlemage gains armor training, as per the fighter ability. " +
      "At 8th level, he gains armor training 2. At 13th level, he gains armor training 3. At " +
      "18th level, he gains armor training 4.",
  },

  // Esoteric's "AC Bonus" (Ultimate Magic-era supplement) is a straight
  // dodge bonus while lightly armored or unarmored — @armor.type<=1 is
  // checkable; the shield/immobilized/helpless/overloaded exclusions are a
  // second condition the engine can't check and are dropped here (flagged
  // in detail, same posture as Free-Hand Fighter's Elusive in the fighter
  // pilot). Dodge-type AC bonuses auto-flow into CMD too (compute.ts's
  // CMD_AC_TYPES includes "dodge"), so a single "ac" Change covers both
  // halves of the prose ("+1 dodge bonus to AC and CMD") without a
  // duplicate "cmd" entry.
  "magus:esoteric:ac-bonus:7": {
    changes: [c("if(lte(@armor.type, 1), if(gte(@class.unlevel, 13), 2, 1), 0)", "ac", "dodge")],
    detail: (level) =>
      `+${level >= 13 ? 2 : 1} dodge AC/CMD (light/no armor; shield/load not checked)`,
    confidence: "medium",
    provenance:
      "At 7th level when an esoteric wears light or no armor, he gains a +1 dodge bonus to AC " +
      "and CMD. This bonus increases by 1 at 13th level. He loses these bonuses while " +
      "immobilized or helpless, or while wearing medium or heavy armor, using a shield, or " +
      "carrying a medium or heavy load.",
  },

  // Iron-Ring Striker's "Bonus Feat" (5th level, then every 6 levels) has no
  // paired base-feature slot — magus has no baseline bonus-feat progression
  // to swap out, so this is a pure additive grant, same posture as the
  // hand-verified table's Cleric (Crusader) and Ranger (combat-style-feat
  // reflavors) bonus-feat entries. The restriction to a maneuver-feat list
  // at 5th isn't modeled, only the count.
  "magus:iron-ring-striker:bonus-feat:5": {
    changes: [c("1 + floor((@class.unlevel - 5) / 6)", "bonusFeats")],
    detail: (level) => `${1 + Math.floor((level - 5) / 6)} bonus feat(s) (restricted at 5th)`,
    confidence: "high",
    provenance:
      "At 5th level, and every six levels thereafter, a magus gains a bonus feat in addition " +
      "to those gained from normal advancement.",
  },

  // Kensai's "Iaijutsu" adds the Intelligence modifier (minimum 0) to
  // initiative rolls, unconditionally, on top of the normal Dexterity
  // modifier the sheet already applies — a clean, always-on addition to the
  // "init" target. The accompanying "may make attacks of opportunity when
  // flat-footed, and may draw as a free action" half is a distinct ability
  // grant (not a number) and is dropped, same posture as the fighter
  // pilot's "eldritch-armor-training" entry (a clean number kept at "high"
  // confidence despite a secondary non-numeric grant being noted, not
  // modeled).
  "magus:kensai:iaijutsu:7": {
    changes: [c("max(0, @abilities.int.mod)", "init")],
    detail: () => "+Int modifier to initiative (AoO-while-flat-footed not modeled)",
    confidence: "high",
    provenance:
      "At 7th level, a kensai applies his Intelligence modifier as well as his Dexterity " +
      "modifier on initiative rolls (minimum 0).",
  },

  // Myrmidarch's "Armor Mastery" (replacing true magus at 20th) grants a
  // flat DR 5/— whenever the myrmidarch is wearing any armor — a single,
  // checkable @armor.type>=1 condition, safe to author as a conditional dr
  // Change now that zero-value dr/eres/spellResist qualifiers are dropped
  // before rendering (2026-07-06 defenses.ts fix, see the fighter pilot's
  // Warlord/Sun-Bronzed Skin entry for the precedent).
  "magus:myrmidarch:armor-mastery:20": {
    changes: [c("if(gte(@armor.type, 1), 5, 0)", "dr")],
    detail: () => "DR 5/— (while wearing armor)",
    confidence: "high",
    provenance: "At 20th level, a myrmidarch gains DR 5/- when wearing armor.",
  },

  // Myrmidarch's own "Armor Training" (replacing improved spell combat and
  // greater spell combat, both prose-only) grants the fighter ability on a
  // reduced 2-tier cadence: tier 1 at 8th, tier 2 at 14th, with no further
  // scaling stated — same shape as the fighter pilot's Cyber-Soldier/
  // Mobile-Fighter/Tactician 2-tier Armor Training reflavors.
  "magus:myrmidarch:armor-training:8": {
    changes: [
      c("if(gte(@class.unlevel, 14), 2, 1)", "mDexA"),
      c("-if(gte(@class.unlevel, 14), 2, 1)", "acpA"),
    ],
    detail: (level) => `+${level >= 14 ? 2 : 1} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "At 8th level, a myrmidarch gains armor training, as the fighter ability. At 14th " +
      "level, he gains armor training 2. This ability replaces improved spell combat and " +
      "greater spell combat.",
  },

  // Spell Dancer's "Dance of Avoidance" grants a flat insight AC bonus while
  // wearing light or no armor — @armor.type<=1 is checkable and the bonus is
  // otherwise unconditional. Replaces the medium armor class feature
  // (proficiency only, nothing to double-count).
  "magus:spell-dancer:dance-of-avoidance:7": {
    changes: [c("if(lte(@armor.type, 1), 2, 0)", "ac", "insight")],
    detail: () => "+2 insight AC (light/no armor)",
    confidence: "high",
    provenance:
      "At 7th level, while wearing light armor or no armor, a spell dancer gains a +2 insight " +
      "bonus to Armor Class.",
  },

  // Greater Dance of Avoidance is a SEPARATE archetype feature (13th level,
  // replacing the heavy armor class feature) that raises the same insight
  // bonus to +4 under the identical condition. Because both entries use
  // type "insight" and the engine's typed-bonus stacking keeps only the
  // highest value within a type, adding this as its own flat +4 alongside
  // the L7 entry's +2 naturally reproduces the prose's "increases to +4"
  // without any extra arithmetic or double-counting.
  "magus:spell-dancer:greater-dance-of-avoidance:13": {
    changes: [c("if(lte(@armor.type, 1), 4, 0)", "ac", "insight")],
    detail: () => "+4 insight AC (light/no armor)",
    confidence: "high",
    provenance:
      "At 13th level, while wearing light armor or no armor, a spell dancer's insight bonus " +
      "to Armor Class increases to +4.",
  },
};
