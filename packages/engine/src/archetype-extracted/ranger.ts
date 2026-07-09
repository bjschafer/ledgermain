/**
 * Ranger's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns BOTH of
 * ranger's pipeline artifacts — `RANGER_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `RANGER_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) — so
 * a future wave working on a different class never has a reason to touch this
 * file; only `index.ts` (the aggregator) needs one new import + one new
 * spread per class.
 *
 * ── RANGER_ARCHETYPE_FEATURE_CLASSIFICATION ───────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored ranger archetype (62
 * archetypes, 266 features), individually read against
 * `packages/data-pipeline/data/archetype-features.json` and bucketed
 * `numeric` / `situational` / `subsystem` / `blocked` — see
 * IMPLEMENTATION_PLAN.md's dated #45 pipeline sections for the full bucket
 * rubric (shared with fighter's pilot). Unlike fighter's pilot (67
 * archetypes, 383 features, which needed a heuristic-assisted pass for the
 * `situational`/`subsystem` split), ranger's 266 features were small enough
 * for this wave to individually read and reason about every single one —
 * no heuristic shortcut bucket was used here.
 *
 * Ranger-specific classification notes (also flagged per-entry below):
 *
 * - **Favored Enemy / Favored Terrain modifications** (restricting to one
 *   type, adding/removing slots, reflavoring the bonus name, doubling it in
 *   a sub-context) are uniformly `situational`, never `numeric` — per
 *   `ranger.ts`'s own doc comment, `doc.build.favoredEnemies`/
 *   `favoredTerrains` are free-form `{type, bonus}[]` lists with NO hard
 *   slot-count enforcement (`favoredBonusBudget` is a soft UI hint only), so
 *   a player can already encode any custom schedule an archetype describes
 *   by hand — there is nothing to extract, and applicability against a given
 *   creature/terrain remains GM-judged exactly like the base ability.
 * - **Hunter's Bond / companion-modifying features** are uniformly
 *   `subsystem` — the companion system has no archetype hooks (confirmed:
 *   the base Hunter's Bond, Favored Enemy, Favored Terrain, Wild Empathy,
 *   Track, Endurance, Woodland Stride, Camouflage, Swift Tracker, Hide in
 *   Plain Sight, Quarry, Improved Quarry, Evasion, Improved Evasion, and
 *   Master Hunter class features all carry `changes: []` upstream — see
 *   `packages/data-pipeline/data/class-features.json` — so swapping any of
 *   them out never creates a fighter-style partial-tier atomicity trap:
 *   there is no numeric formula to double-count or under-count either way).
 * - **Combat Style Feat is the ONE atomic, multi-tier ranger base feature**
 *   with a real formula (`floor((@class.unlevel + 2) / 4)` on `bonusFeats`,
 *   covering ALL of 2nd/6th/10th/14th/18th in one Change) — the only source
 *   of `blocked`-bucket partial-tier-atomicity traps in this class, same
 *   shape as fighter's Armor Training/Bonus Feats (FGT). Of the 15 ranger
 *   archetype features paired to its base-feature uuid (6 already
 *   hand-verified in `archetype-effects.ts` — Bow Nomad, Horse Lord, Ilsurian
 *   Archer, Shapeshifter, Stormwalker, Toxophilite — plus 9 read fresh by
 *   this wave): 3 more are full same-schedule restricted-list reflavors
 *   (promoted to `numeric`, extracted below: Elemental Envoy, Hooded
 *   Champion, Wave Warden), 3 fully replace the schedule with an unrelated
 *   resource (`subsystem`: Poison Darter's rogue talents/discoveries,
 *   Trophy Hunter's grit/deeds, Warden's Survival ability), 1 is a real but
 *   heavily activation-gated number (`situational`: Summit Sentinel's
 *   Toughness + defensive stance), and 2 are genuine composition traps
 *   (`blocked`, see below).
 * - **Two `blocked` composition traps, both UNPAIRED partial-tier swaps of
 *   Combat Style Feat** (Beast Master's Improved Empathic Link claims to
 *   replace only "the 6th-level combat style feat"; Falconer's Swoop for the
 *   Kill claims the same) — same trap shape as fighter's Unbreakable
 *   (Armor Training). Neither is paired to the base uuid, so the base
 *   `bonusFeats` formula keeps applying in full for the OTHER four tiers;
 *   recorded rather than guessed at. (Wild Stalker's Uncanny Dodge, which
 *   ALSO only claims to replace "the ranger's 2nd-level combat style feat,"
 *   is NOT classified `blocked` — its own Wild Talent (6th level) feature
 *   separately claims the 6th/10th/14th/18th tiers too, so between the two
 *   features the WHOLE atomic schedule is covered and the paired-swap
 *   suppression correctly zeroes the base formula with nothing to backfill,
 *   matching RAW's "replaced entirely" intent rather than an ambiguous
 *   partial case — see that entry's note for the full reasoning.)
 * - **One suspected vendored-data/engine-interaction bug, `blocked`**:
 *   Sable Company Marine's Hippogriff Companion is paired to Combat Style
 *   Feat's base-feature uuid, but its own prose is purely ADDITIVE ("adds
 *   Monstrous Mount to the list of bonus feats... regardless of the style
 *   chosen") — it does not itself replace the bonus-feat count or schedule.
 *   Because the generic paired-swap suppression (`activeArchetypeSwaps`)
 *   keys off the pairing alone, an active Sable Company Marine character
 *   would have the ENTIRE base Combat Style Feat formula suppressed with
 *   nothing backfilled — a real, pre-existing bug, same shape as fighter's
 *   Brawler/Armor-Training mispair (IMPLEMENTATION_PLAN.md). Flagged here,
 *   not fixed (would need a hand-curated exclusion mirroring
 *   `WEAPON_TRAINING_REPLACEMENTS`, out of this wave's file-scope).
 * - **Spell-less ranger variants** (Skirmisher's Hunter's Tricks, Trapper's
 *   Trap, Ilsurian Archer's Vicious Aim) and other spellcasting-model
 *   modifications are uniformly `subsystem` — no engine hook exists for a
 *   per-archetype caster-model swap.
 * - **Two minor suspected vendored-data quirks** (not fixed, noted at their
 *   entries): Hooded Champion's own "Favored Enemy" feature at 5th level
 *   restates the base Favored Enemy text verbatim with no additional
 *   modification, even though Hooded Champion already fully replaces
 *   Favored Enemy at 1st level via its Panache feature — likely a leftover
 *   reference-text duplicate. Realm Wanderer's Queen's Bond feature is
 *   vendored at level 0 even though its own prose says "At 4th level."
 *
 * Confidence rubric for the extracted table below is identical to fighter's
 * (`archetype-extracted/fighter.ts`): "high" = literal/near-literal reflavor
 * of an already-modeled mechanism or a single clearly-worded unconditional
 * bonus; "medium" = a schedule derived from prose that required resolving an
 * ambiguity (see Wild Stalker's Strong Senses below), or a bonus with a
 * second, unmodeled condition disclosed in `detail`; "low" unused.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const RANGER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "ranger:abendego-diver:deep-diver:1": {
    archetypeId: "ranger:abendego-diver",
    name: "Deep Diver",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility ability with no numeric or Change-shaped effect.",
  },
  "ranger:abendego-diver:ocean-s-blessing:1": {
    archetypeId: "ranger:abendego-diver",
    name: "Ocean's Blessing",
    level: 1,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes.",
  },
  "ranger:abendego-diver:aquatic-terrain:3": {
    archetypeId: "ranger:abendego-diver",
    name: "Aquatic Terrain",
    level: 3,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself.",
  },
  "ranger:abendego-diver:aquatic-adaptation:7": {
    archetypeId: "ranger:abendego-diver",
    name: "Aquatic Adaptation",
    level: 7,
    bucket: "subsystem",
    note: "grants a speed/stat equal to another of the character's own already-computed stats (e.g. 'a swim speed equal to base land speed') — the formula evaluator's rollData has no path exposing that input to a Change formula, so this can't be authored without guessing a fixed number.",
  },
  "ranger:abendego-diver:shark-sense:8": {
    archetypeId: "ranger:abendego-diver",
    name: "Shark Sense",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:abendego-diver:killer-of-the-deep:20": {
    archetypeId: "ranger:abendego-diver",
    name: "Killer of the Deep",
    level: 20,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:battle-scout:advantageous-terrain:5": {
    archetypeId: "ranger:battle-scout",
    name: "Advantageous Terrain",
    level: 5,
    bucket: "situational",
    note: "activated ability with a per-day/resource cost and duration (a stance, surge, or similar) — same posture as an unmodeled buff/stance, not an always-on Change. also terrain-scoped (favorite terrain only)",
  },
  "ranger:battle-scout:infiltration:10": {
    archetypeId: "ranger:battle-scout",
    name: "Infiltration",
    level: 10,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants a terrain-swap ability rather than a fixed number; the base FE/FT free-form fields already let a player encode a temporary terrain if desired",
  },
  "ranger:battle-scout:superior-tactics:15": {
    archetypeId: "ranger:battle-scout",
    name: "Superior Tactics",
    level: 15,
    bucket: "situational",
    note: "activated ability with a per-day/resource cost and duration (a stance, surge, or similar) — same posture as an unmodeled buff/stance, not an always-on Change. +2 initiative, gated on a prior 3-round setup and only usable once/day",
  },
  "ranger:battle-scout:perfect-advantage:20": {
    archetypeId: "ranger:battle-scout",
    name: "Perfect Advantage",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. reduces advantageous terrain's activation cost/area; no new number of its own",
  },
  "ranger:beast-master:animal-companion:1": {
    archetypeId: "ranger:beast-master",
    name: "Animal Companion",
    level: 1,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:beast-master:improved-empathic-link:6": {
    archetypeId: "ranger:beast-master",
    name: "Improved Empathic Link",
    level: 6,
    bucket: "blocked",
    note: "claims to replace only ONE tier of Combat Style Feat's atomic, single-formula bonus-feat schedule (2nd/6th/10th/14th/18th are ONE Change, not discrete per-tier grants) and is UNPAIRED (no pairedBaseFeatureUuid to the base feature) — same partial-tier-atomicity trap as fighter's Armor Training/Bonus Feats (IMPLEMENTATION_PLAN.md). The base bonus-feat formula keeps applying in full; recorded rather than guessed at.",
  },
  "ranger:beast-master:strong-bond:12": {
    archetypeId: "ranger:beast-master",
    name: "Strong Bond",
    level: 12,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:blightwarden:emulate-taint:1": {
    archetypeId: "ranger:blightwarden",
    name: "Emulate Taint",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows a template's Ex/Su/Sp ability for a duration; not Change-shaped",
  },
  "ranger:blightwarden:hunt-the-blighted:1": {
    archetypeId: "ranger:blightwarden",
    name: "Hunt the Blighted",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:blightwarden:blightwalker:3": {
    archetypeId: "ranger:blightwarden",
    name: "Blightwalker",
    level: 3,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself.",
  },
  "ranger:blightwarden:resist-corruption:3": {
    archetypeId: "ranger:blightwarden",
    name: "Resist Corruption",
    level: 3,
    bucket: "situational",
    note: "save bonus scoped to a specific effect type (poison, divination, curses, fear, etc.) — no qualified-save target exists (fort/ref/will are the only save targets this engine applies).",
  },
  "ranger:bow-nomad:twin-bows:1": {
    archetypeId: "ranger:bow-nomad",
    name: "Twin Bows",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants permission to dual-wield two bows; the resulting TWF penalties/bonuses are already handled by the engine's normal two-weapon-fighting math, nothing archetype-specific to extract",
  },
  "ranger:bow-nomad:combat-style-feat:2": {
    archetypeId: "ranger:bow-nomad",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:bow-nomad:agile-maneuvers:3": {
    archetypeId: "ranger:bow-nomad",
    name: "Agile Maneuvers",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Agile Maneuvers as a bonus feat",
  },
  "ranger:bow-nomad:deflecting-arrow:3": {
    archetypeId: "ranger:bow-nomad",
    name: "Deflecting Arrow",
    level: 3,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:bow-nomad:trick-shot:3": {
    archetypeId: "ranger:bow-nomad",
    name: "Trick Shot",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants a per-day 'trick shot' resource, no baseline bonus itself",
  },
  "ranger:bow-nomad:focused-fire:6": {
    archetypeId: "ranger:bow-nomad",
    name: "Focused Fire",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. narrates a required Manyshot pick at the 6th-level tier; the schedule itself is already fully covered by this archetype's own combat-style-feat:2 entry (hand-verified), so no separate number to extract and no atomicity gap",
  },
  "ranger:bow-nomad:hampering-strike:8": {
    archetypeId: "ranger:bow-nomad",
    name: "Hampering Strike",
    level: 8,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:bow-nomad:pinning-strike:13": {
    archetypeId: "ranger:bow-nomad",
    name: "Pinning Strike",
    level: 13,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:bow-nomad:exploit-the-gap:18": {
    archetypeId: "ranger:bow-nomad",
    name: "Exploit the Gap",
    level: 18,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:cinderwalker:born-to-the-fire:3": {
    archetypeId: "ranger:cinderwalker",
    name: "Born to the Fire",
    level: 3,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself.",
  },
  "ranger:cinderwalker:inured:4": {
    archetypeId: "ranger:cinderwalker",
    name: "Inured",
    level: 4,
    bucket: "numeric",
    note: "fire resistance progression (10/20/30 at 8th/12th/16th) is unconditional and level-gated; true immunity at 20th is not modeled (capped at 30), noted in detail",
  },
  "ranger:cinderwalker:cinderwalk:7": {
    archetypeId: "ranger:cinderwalker",
    name: "Cinderwalk",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. terrain movement + immunity to touching heated surfaces, no Change target",
  },
  "ranger:code-runner:mnemonic-genius:1": {
    archetypeId: "ranger:code-runner",
    name: "Mnemonic Genius",
    level: 1,
    bucket: "subsystem",
    note: "narrative/utility ability with no numeric or Change-shaped effect.",
  },
  "ranger:code-runner:resist-interrogation:4": {
    archetypeId: "ranger:code-runner",
    name: "Resist Interrogation",
    level: 4,
    bucket: "situational",
    note: "save bonus scoped to a specific effect type (poison, divination, curses, fear, etc.) — no qualified-save target exists (fort/ref/will are the only save targets this engine applies).",
  },
  "ranger:corpse-hunter:undead-exterminator:1": {
    archetypeId: "ranger:corpse-hunter",
    name: "Undead Exterminator",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:corpse-hunter:disrupt-control:5": {
    archetypeId: "ranger:corpse-hunter",
    name: "Disrupt Control",
    level: 5,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts.",
  },
  "ranger:corpse-hunter:graveyard-stride:7": {
    archetypeId: "ranger:corpse-hunter",
    name: "Graveyard Stride",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. terrain movement, replaces woodland stride",
  },
  "ranger:corpse-hunter:incorporeal-armament:8": {
    archetypeId: "ranger:corpse-hunter",
    name: "Incorporeal Armament",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants ghost touch on a wielded weapon, resource-gated",
  },
  "ranger:dandy:favored-nation:1": {
    archetypeId: "ranger:dandy",
    name: "Favored Nation",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:dandy:rumor-empathy:1": {
    archetypeId: "ranger:dandy",
    name: "Rumor Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. wild-empathy-style social mechanic, replaces wild empathy",
  },
  "ranger:dandy:favored-terrain:3": {
    archetypeId: "ranger:dandy",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability.",
  },
  "ranger:dandy:dandy-spells:4": {
    archetypeId: "ranger:dandy",
    name: "Dandy Spells",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes.",
  },
  "ranger:dandy:hobnob:4": {
    archetypeId: "ranger:dandy",
    name: "Hobnob",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped.",
  },
  "ranger:dandy:party-crasher:7": {
    archetypeId: "ranger:dandy",
    name: "Party Crasher",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:darklands-sailor:skilled-pilot:1": {
    archetypeId: "ranger:darklands-sailor",
    name: "Skilled Pilot",
    level: 1,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. scoped to subterranean waterways",
  },
  "ranger:darklands-sailor:keen-ear:3": {
    archetypeId: "ranger:darklands-sailor",
    name: "Keen Ear",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows uncanny/improved uncanny dodge, environment-gated",
  },
  "ranger:darklands-sailor:quick-swim:7": {
    archetypeId: "ranger:darklands-sailor",
    name: "Quick Swim",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. action-economy change (full swim speed as a move action), no bonus number",
  },
  "ranger:darklands-sailor:subsonic-warning:8": {
    archetypeId: "ranger:darklands-sailor",
    name: "Subsonic Warning",
    level: 8,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped. shares an ability with the hunter's bond target, resource-gated",
  },
  "ranger:darklands-sailor:hidden-depths:12": {
    archetypeId: "ranger:darklands-sailor",
    name: "Hidden Depths",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. Stealth usable without cover/concealment, no bonus number",
  },
  "ranger:deep-walker:deep-knowledge:3": {
    archetypeId: "ranger:deep-walker",
    name: "Deep Knowledge",
    level: 3,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. replaces favored terrain with a fixed underground-only bonus",
  },
  "ranger:deep-walker:rock-hopper:7": {
    archetypeId: "ranger:deep-walker",
    name: "Rock Hopper",
    level: 7,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. +5 Acrobatics/Climb, scoped to underground terrain",
  },
  "ranger:deep-walker:deep-walker-camouflage:12": {
    archetypeId: "ranger:deep-walker",
    name: "Deep Walker Camouflage",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. Stealth without cover/concealment underground, replaces camouflage",
  },
  "ranger:deep-walker:one-with-the-stone:17": {
    archetypeId: "ranger:deep-walker",
    name: "One with the Stone",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. Stealth while observed underground, replaces hide in plain sight",
  },
  "ranger:divine-tracker:favored-weapon:1": {
    archetypeId: "ranger:divine-tracker",
    name: "Favored Weapon",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. proficiency grant",
  },
  "ranger:divine-tracker:blessings:4": {
    archetypeId: "ranger:divine-tracker",
    name: "Blessings",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. warpriest-blessing subsystem, replaces hunter's bond",
  },
  "ranger:dragon-hunter:predatory-deduction:1": {
    archetypeId: "ranger:dragon-hunter",
    name: "Predatory Deduction",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. triggers a Knowledge check rather than granting a bonus; replaces Track",
  },
  "ranger:dragon-hunter:wyrm-hatred:1": {
    archetypeId: "ranger:dragon-hunter",
    name: "Wyrm Hatred",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. dragon-only favored enemy, fixed",
  },
  "ranger:dragon-hunter:dragoncrafting:5": {
    archetypeId: "ranger:dragon-hunter",
    name: "Dragoncrafting",
    level: 5,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Dragoncrafting as a bonus feat",
  },
  "ranger:dragon-hunter:undaunted:10": {
    archetypeId: "ranger:dragon-hunter",
    name: "Undaunted",
    level: 10,
    bucket: "situational",
    note: "save bonus scoped to a specific effect type (poison, divination, curses, fear, etc.) — no qualified-save target exists (fort/ref/will are the only save targets this engine applies).",
  },
  "ranger:dragon-hunter:expert-dragoncrafter:15": {
    archetypeId: "ranger:dragon-hunter",
    name: "Expert Dragoncrafter",
    level: 15,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:dragon-hunter:elemental-resilience:20": {
    archetypeId: "ranger:dragon-hunter",
    name: "Elemental Resilience",
    level: 20,
    bucket: "situational",
    note: "activated ability with a per-day/resource cost and duration (a stance, surge, or similar) — same posture as an unmodeled buff/stance, not an always-on Change. player-chosen energy type each use, 1/day, 1 hour duration",
  },
  "ranger:drake-warden:young-drake:4": {
    archetypeId: "ranger:drake-warden",
    name: "Young Drake",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:dungeon-rover:stone-scouting:1": {
    archetypeId: "ranger:dungeon-rover",
    name: "Stone Scouting",
    level: 1,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. replaces track",
  },
  "ranger:dungeon-rover:vermin-affinity:1": {
    archetypeId: "ranger:dungeon-rover",
    name: "Vermin Affinity",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. wild-empathy-style mechanic for vermin, replaces wild empathy",
  },
  "ranger:dungeon-rover:dungeon-ally:4": {
    archetypeId: "ranger:dungeon-rover",
    name: "Dungeon Ally",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:dungeon-rover:subterranean-stride:7": {
    archetypeId: "ranger:dungeon-rover",
    name: "Subterranean Stride",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. terrain movement, no bonus number",
  },
  "ranger:dungeon-rover:improved-stone-scouting:8": {
    archetypeId: "ranger:dungeon-rover",
    name: "Improved Stone Scouting",
    level: 8,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. replaces swift tracker",
  },
  "ranger:dusk-stalker:shadow-guide:3": {
    archetypeId: "ranger:dusk-stalker",
    name: "Shadow Guide",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. plane-conditional bonus schedule change",
  },
  "ranger:dusk-stalker:shadow-bond:4": {
    archetypeId: "ranger:dusk-stalker",
    name: "Shadow Bond",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped. shadow-manipulation debuff ability, light-conditional",
  },
  "ranger:dusk-stalker:dark-sight:12": {
    archetypeId: "ranger:dusk-stalker",
    name: "Dark Sight",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. see in darkness, replaces camouflage",
  },
  "ranger:elemental-envoy:combat-style-feat:2": {
    archetypeId: "ranger:elemental-envoy",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "restricts the ranger's Combat Style Feat to one style/list but preserves the identical 2nd/6th/10th/14th/18th bonus-feat schedule — same reflavor shape as the hand-verified table's 6 entries (archetype-effects.ts).",
  },
  "ranger:elemental-envoy:elemental-explorer:3": {
    archetypeId: "ranger:elemental-envoy",
    name: "Elemental Explorer",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. planar favored-terrain reflavor",
  },
  "ranger:falconer:feathered-companion:1": {
    archetypeId: "ranger:falconer",
    name: "Feathered Companion",
    level: 1,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:falconer:hunter-s-bond:4": {
    archetypeId: "ranger:falconer",
    name: "Hunter's Bond",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:falconer:swoop-for-the-kill:6": {
    archetypeId: "ranger:falconer",
    name: "Swoop for the Kill",
    level: 6,
    bucket: "blocked",
    note: "claims to replace only ONE tier of Combat Style Feat's atomic, single-formula bonus-feat schedule (2nd/6th/10th/14th/18th are ONE Change, not discrete per-tier grants) and is UNPAIRED (no pairedBaseFeatureUuid to the base feature) — same partial-tier-atomicity trap as fighter's Armor Training/Bonus Feats (IMPLEMENTATION_PLAN.md). The base bonus-feat formula keeps applying in full; recorded rather than guessed at.",
  },
  "ranger:flamewarden:touch-of-flame:4": {
    archetypeId: "ranger:flamewarden",
    name: "Touch of Flame",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. weapon flaming property, activated/resource-gated",
  },
  "ranger:flamewarden:stoking-the-embers:9": {
    archetypeId: "ranger:flamewarden",
    name: "Stoking the Embers",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. breath of life 1/day, replaces evasion",
  },
  "ranger:flamewarden:burning-renewal:12": {
    archetypeId: "ranger:flamewarden",
    name: "Burning Renewal",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. condition-removal ability, triggered by taking fire damage",
  },
  "ranger:flamewarden:phoenix-rising:16": {
    archetypeId: "ranger:flamewarden",
    name: "Phoenix Rising",
    level: 16,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. death-triggered explosion/resurrection effect",
  },
  "ranger:fortune-finder:hinterlander:1": {
    archetypeId: "ranger:fortune-finder",
    name: "Hinterlander",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 level (min 1) on Climb and Swim checks",
  },
  "ranger:fortune-finder:adaptable-study:4": {
    archetypeId: "ranger:fortune-finder",
    name: "Adaptable Study",
    level: 4,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. studied-opponent bonus derived from favored enemy, action-gated to a single studied target",
  },
  "ranger:fortune-finder:trailblazer:7": {
    archetypeId: "ranger:fortune-finder",
    name: "Trailblazer",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. difficult-terrain movement, no bonus number",
  },
  "ranger:fortune-finder:fast-study:11": {
    archetypeId: "ranger:fortune-finder",
    name: "Fast Study",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. action-economy upgrade to adaptable study",
  },
  "ranger:fortune-finder:master-explorer:20": {
    archetypeId: "ranger:fortune-finder",
    name: "Master Explorer",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:freebooter:freebooter-s-bane:1": {
    archetypeId: "ranger:freebooter",
    name: "Freebooter's Bane",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. attack/damage bonus vs. one marked target, action-activated, replaces favored enemy",
  },
  "ranger:freebooter:freebooter-s-bond:4": {
    archetypeId: "ranger:freebooter",
    name: "Freebooter's Bond",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped. flanking-bonus team ability",
  },
  "ranger:freebooter:fast-swimmer:7": {
    archetypeId: "ranger:freebooter",
    name: "Fast Swimmer",
    level: 7,
    bucket: "numeric",
    note: "unconditional flat +2 bonus on Swim checks (the move/full-round swim-action change alongside it isn't Change-shaped and isn't modeled)",
  },
  "ranger:galvanic-saboteur:reprogram:1": {
    archetypeId: "ranger:galvanic-saboteur",
    name: "Reprogram",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. wild-empathy-style mechanic vs. constructs, replaces wild empathy",
  },
  "ranger:galvanic-saboteur:lucky-dodge:3": {
    archetypeId: "ranger:galvanic-saboteur",
    name: "Lucky Dodge",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. luck AC bonus vs. touch attacks, gated on a favored-enemy type match",
  },
  "ranger:galvanic-saboteur:technological-trapsmith:7": {
    archetypeId: "ranger:galvanic-saboteur",
    name: "Technological Trapsmith",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:galvanic-saboteur:static-strike:8": {
    archetypeId: "ranger:galvanic-saboteur",
    name: "Static Strike",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated cleave-like attack, resource-gated",
  },
  "ranger:galvanic-saboteur:sensor-evasion:17": {
    archetypeId: "ranger:galvanic-saboteur",
    name: "Sensor Evasion",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:groom:hide-the-horses:1": {
    archetypeId: "ranger:groom",
    name: "Hide the Horses",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Stealth bonus while concealing mounts",
  },
  "ranger:groom:horse-whisperer:3": {
    archetypeId: "ranger:groom",
    name: "Horse Whisperer",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. speak with animals at will, restricted to certain animals",
  },
  "ranger:groom:scout-the-area:3": {
    archetypeId: "ranger:groom",
    name: "Scout the Area",
    level: 3,
    bucket: "numeric",
    note: "unconditional +4 Knowledge (local) (skill.klo); the 'always knows where to find a nearby expert' addendum isn't Change-shaped and isn't modeled",
  },
  "ranger:guide:ranger-s-focus:1": {
    archetypeId: "ranger:guide",
    name: "Ranger's Focus",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. attack/damage bonus vs. a single designated focus target, replaces favored enemy",
  },
  "ranger:guide:terrain-bond:4": {
    archetypeId: "ranger:guide",
    name: "Terrain Bond",
    level: 4,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. ally buff conditioned on being in favored terrain, replaces hunter's bond",
  },
  "ranger:guide:ranger-s-luck:9": {
    archetypeId: "ranger:guide",
    name: "Ranger's Luck",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. reroll ability, replaces evasion",
  },
  "ranger:guide:inspired-moment:11": {
    archetypeId: "ranger:guide",
    name: "Inspired Moment",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. multi-stat activated buff, replaces quarry and improved quarry",
  },
  "ranger:guide:improved-ranger-s-luck:16": {
    archetypeId: "ranger:guide",
    name: "Improved Ranger's Luck",
    level: 16,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. modifies ranger's luck's reroll magnitude, replaces improved evasion",
  },
  "ranger:guildbreaker:favored-organization:1": {
    archetypeId: "ranger:guildbreaker",
    name: "Favored Organization",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:guildbreaker:read-the-city:1": {
    archetypeId: "ranger:guildbreaker",
    name: "Read the City",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. urban gather-information reflavor, no bonus number",
  },
  "ranger:guildbreaker:deep-cover:4": {
    archetypeId: "ranger:guildbreaker",
    name: "Deep Cover",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. circumstance bonus to impersonation checks, derived from favored-organization bonus",
  },
  "ranger:guildbreaker:crowd-stride:7": {
    archetypeId: "ranger:guildbreaker",
    name: "Crowd Stride",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. movement through crowds, no bonus number",
  },
  "ranger:hooded-champion:deeds:1": {
    archetypeId: "ranger:hooded-champion",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. swashbuckler deeds, panache-gated",
  },
  "ranger:hooded-champion:panache:1": {
    archetypeId: "ranger:hooded-champion",
    name: "Panache",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. panache resource, replaces favored enemy",
  },
  "ranger:hooded-champion:combat-style-feat:2": {
    archetypeId: "ranger:hooded-champion",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "restricts the ranger's Combat Style Feat to one style/list but preserves the identical 2nd/6th/10th/14th/18th bonus-feat schedule — same reflavor shape as the hand-verified table's 6 entries (archetype-effects.ts). also grants swashbuckler grace/evasive deeds at 9th and edge/cheat death deeds at 16th — not modeled, noted in detail",
  },
  "ranger:hooded-champion:favored-enemy:5": {
    archetypeId: "ranger:hooded-champion",
    name: "Favored Enemy",
    level: 5,
    bucket: "situational",
    note: "prose duplicates the base Favored Enemy description near-verbatim with no additional archetype-specific modification stated at this level — likely a vendoring artifact (see report); treated the same as the base, unmodeled ability. hooded champion's own favored enemy replacement already happens at 1st level via panache:1; this level-5 entry restates the base Favored Enemy text with no additional archetype-specific change stated",
  },
  "ranger:horse-lord:combat-style-feat:2": {
    archetypeId: "ranger:horse-lord",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:horse-lord:mounted-bond:4": {
    archetypeId: "ranger:horse-lord",
    name: "Mounted Bond",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:horse-lord:strong-bond:12": {
    archetypeId: "ranger:horse-lord",
    name: "Strong Bond",
    level: 12,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:horse-lord:spiritual-bond:17": {
    archetypeId: "ranger:horse-lord",
    name: "Spiritual Bond",
    level: 17,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:ilsurian-archer:bullseye-shot:1": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Bullseye Shot",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Bullseye Shot as a bonus feat",
  },
  "ranger:ilsurian-archer:combat-style-feat:2": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:ilsurian-archer:vicious-aim:4": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Vicious Aim",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes. replaces all spellcasting (spell-less variant); the FE-derived attack/damage bonus also has no @data path for 'highest favored enemy bonus' to reference",
  },
  "ranger:ilsurian-archer:iomedae-s-influence:8": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Iomedae's Influence",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Weapon Focus (longsword) as a bonus feat",
  },
  "ranger:ilsurian-archer:pinpoint-targeting:11": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Pinpoint Targeting",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Pinpoint Targeting as a bonus feat, replaces quarry",
  },
  "ranger:ilsurian-archer:quarry:19": {
    archetypeId: "ranger:ilsurian-archer",
    name: "Quarry",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. restates base Quarry's own (already unmodeled, changes:[]) text",
  },
  "ranger:infiltrator:adaptation:3": {
    archetypeId: "ranger:infiltrator",
    name: "Adaptation",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated ability-copy mechanic, favored-enemy-gated, replaces favored terrain",
  },
  "ranger:jungle-lord:animal-focus:1": {
    archetypeId: "ranger:jungle-lord",
    name: "Animal Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated stat/ability grant depending on chosen animal, no fixed Change target",
  },
  "ranger:jungle-lord:bonus-language:1": {
    archetypeId: "ranger:jungle-lord",
    name: "Bonus Language",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:jungle-lord:weapon-and-armor-proficiency:1": {
    archetypeId: "ranger:jungle-lord",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. proficiency swap",
  },
  "ranger:jungle-lord:favored-terrain:3": {
    archetypeId: "ranger:jungle-lord",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. fixed jungle terrain, standard mechanic otherwise",
  },
  "ranger:jungle-lord:hardened-by-nature:4": {
    archetypeId: "ranger:jungle-lord",
    name: "Hardened by Nature",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Wis-to-AC/CMB and scaling dodge AC, gated on unarmored+unencumbered+no-shield compound state the engine can't jointly check",
  },
  "ranger:jungle-lord:hunter-s-bond:4": {
    archetypeId: "ranger:jungle-lord",
    name: "Hunter's Bond",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:jungle-lord:brachiation:5": {
    archetypeId: "ranger:jungle-lord",
    name: "Brachiation",
    level: 5,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated climb-speed/Acrobatics grant, per-day resource",
  },
  "ranger:jungle-lord:inspired-moment:11": {
    archetypeId: "ranger:jungle-lord",
    name: "Inspired Moment",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. multi-stat activated buff",
  },
  "ranger:jungle-lord:strong-bond:12": {
    archetypeId: "ranger:jungle-lord",
    name: "Strong Bond",
    level: 12,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:jungle-lord:victory-cry:20": {
    archetypeId: "ranger:jungle-lord",
    name: "Victory Cry",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated ally buff",
  },
  "ranger:lantern-lighter:daylight:1": {
    archetypeId: "ranger:lantern-lighter",
    name: "Daylight",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. spell-like ability, not Change-shaped",
  },
  "ranger:lantern-lighter:enhanced-vision:1": {
    archetypeId: "ranger:lantern-lighter",
    name: "Enhanced Vision",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. low-light vision grant",
  },
  "ranger:lantern-lighter:favored-terrain:3": {
    archetypeId: "ranger:lantern-lighter",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. restates the standard favored-terrain scaling (+2 every 5 levels) applied to one terrain — not an archetype-specific change",
  },
  "ranger:lantern-lighter:poison-resistance:3": {
    archetypeId: "ranger:lantern-lighter",
    name: "Poison Resistance",
    level: 3,
    bucket: "situational",
    note: "save bonus scoped to a specific effect type (poison, divination, curses, fear, etc.) — no qualified-save target exists (fort/ref/will are the only save targets this engine applies).",
  },
  "ranger:lantern-lighter:cavern-stride:7": {
    archetypeId: "ranger:lantern-lighter",
    name: "Cavern Stride",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. terrain movement, replaces woodland stride",
  },
  "ranger:lantern-lighter:darkvision:8": {
    archetypeId: "ranger:lantern-lighter",
    name: "Darkvision",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:lantern-lighter:poison-immunity:12": {
    archetypeId: "ranger:lantern-lighter",
    name: "Poison Immunity",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. immunity, no qualified-save target to express it against",
  },
  "ranger:lantern-lighter:stunning-light:13": {
    archetypeId: "ranger:lantern-lighter",
    name: "Stunning Light",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:lantern-lighter:camouflage:17": {
    archetypeId: "ranger:lantern-lighter",
    name: "Camouflage",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants base Camouflage (itself changes:[] upstream)",
  },
  "ranger:lantern-lighter:paralyzing-light:18": {
    archetypeId: "ranger:lantern-lighter",
    name: "Paralyzing Light",
    level: 18,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:nirmathi-irregular:focused-enemy:1": {
    archetypeId: "ranger:nirmathi-irregular",
    name: "Focused Enemy",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:nirmathi-irregular:forest-ghost:1": {
    archetypeId: "ranger:nirmathi-irregular",
    name: "Forest Ghost",
    level: 1,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. forest-scoped Perception/Survival bonus, replaces wild empathy",
  },
  "ranger:nirmathi-irregular:weapon-and-armor-proficiency:1": {
    archetypeId: "ranger:nirmathi-irregular",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. proficiency swap",
  },
  "ranger:nirmathi-irregular:focused-terrain:3": {
    archetypeId: "ranger:nirmathi-irregular",
    name: "Focused Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability.",
  },
  "ranger:nirmathi-irregular:spells:4": {
    archetypeId: "ranger:nirmathi-irregular",
    name: "Spells",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes.",
  },
  "ranger:planar-scout:planar-empathy:1": {
    archetypeId: "ranger:planar-scout",
    name: "Planar Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. wild-empathy variant restricted to extraplanar creatures",
  },
  "ranger:planar-scout:planar-terrains:3": {
    archetypeId: "ranger:planar-scout",
    name: "Planar Terrains",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. planar favored-terrain variant",
  },
  "ranger:planar-scout:planar-bond:4": {
    archetypeId: "ranger:planar-scout",
    name: "Planar Bond",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. one of several plane-dependent abilities chosen by the player, no schema field records which plane, replaces hunter's bond",
  },
  "ranger:planar-scout:planar-adaptation:9": {
    archetypeId: "ranger:planar-scout",
    name: "Planar Adaptation",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:poison-darter:debilitating-venom:1": {
    archetypeId: "ranger:poison-darter",
    name: "Debilitating Venom",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. poison mechanic, resource-gated, not Change-shaped",
  },
  "ranger:poison-darter:poison-use:1": {
    archetypeId: "ranger:poison-darter",
    name: "Poison Use",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. immunity to self-poisoning",
  },
  "ranger:poison-darter:poison-style:2": {
    archetypeId: "ranger:poison-darter",
    name: "Poison Style",
    level: 2,
    bucket: "subsystem",
    note: "replaces Combat Style Feat's entire bonus-feat schedule with a different resource (rogue talents/alchemist discoveries, gunslinger grit/deeds, a Survival ability, uncanny dodge/rage/rage powers, etc.) — a full 1:1 swap, but not a feat-count reflavor, and the substitute resource has no engine hook either.",
  },
  "ranger:poison-darter:precise-dart:4": {
    archetypeId: "ranger:poison-darter",
    name: "Precise Dart",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. sneak-attack-style bonus damage, restricted to blowgun attacks",
  },
  "ranger:raven-master:avian-empathy:1": {
    archetypeId: "ranger:raven-master",
    name: "Avian Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. restricts wild empathy's scope to birds; no separate number",
  },
  "ranger:raven-master:argent-magic:4": {
    archetypeId: "ranger:raven-master",
    name: "Argent Magic",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes.",
  },
  "ranger:raven-master:raven-companion:4": {
    archetypeId: "ranger:raven-master",
    name: "Raven Companion",
    level: 4,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:raven-master:silver-champion:7": {
    archetypeId: "ranger:raven-master",
    name: "Silver Champion",
    level: 7,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:raven-master:mimic-figurine:8": {
    archetypeId: "ranger:raven-master",
    name: "Mimic Figurine",
    level: 8,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:raven-master:cheat-death:12": {
    archetypeId: "ranger:raven-master",
    name: "Cheat Death",
    level: 12,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes).",
  },
  "ranger:realm-wanderer:queen-s-bond:0": {
    archetypeId: "ranger:realm-wanderer",
    name: "Queen's Bond",
    level: 0,
    bucket: "subsystem",
    note: "modifies/replaces Hunter's Bond (or grants an animal companion/mount/familiar-like ally) — the companion system has no archetype hooks (per project notes). vendored level read 0 but the prose says 'At 4th level' — issue #47 fixed the actual gating level to 4 via `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL` in `packages/data-pipeline/src/supplements.ts` (id/uuid intentionally left as-is)",
  },
  "ranger:realm-wanderer:deceptive-subtlety:1": {
    archetypeId: "ranger:realm-wanderer",
    name: "Deceptive Subtlety",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 level (min 1) on Diplomacy and Bluff checks; dual-master (L8) doubling this bonus in 2 favored terrains is environment-conditional and not modeled",
  },
  "ranger:realm-wanderer:dual-master:8": {
    archetypeId: "ranger:realm-wanderer",
    name: "Dual Master",
    level: 8,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. doubles deceptive-subtlety's bonus, but only within 2 specific favored terrains",
  },
  "ranger:realm-wanderer:shrewdest-monarch:20": {
    archetypeId: "ranger:realm-wanderer",
    name: "Shrewdest Monarch",
    level: 20,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. save-or-die attack, terrain-gated, once/day-style",
  },
  "ranger:sable-company-marine:hippogriff-companion:2": {
    archetypeId: "ranger:sable-company-marine",
    name: "Hippogriff Companion",
    level: 2,
    bucket: "blocked",
    note: "PAIRED to Combat Style Feat's base-feature uuid, but the archetype's own prose is purely ADDITIVE (adds one more selectable bonus-feat option, 'regardless of the style chosen') — it does not itself replace the bonus-feat count or schedule. Because the generic paired-swap suppression (activeArchetypeSwaps) keys off the pairing alone, an active character with this archetype would have the ENTIRE base Combat Style Feat formula suppressed with nothing backfilled, incorrectly zeroing their bonus feats. This is a real, pre-existing engine/vendored-data interaction bug (same shape as fighter's Brawler/Armor-Training mispair, IMPLEMENTATION_PLAN.md) — recorded here, not fixed (out of this wave's scope; would need a hand-curated exclusion mirroring WEAPON_TRAINING_REPLACEMENTS).",
  },
  "ranger:sentinel:mugshot:1": {
    archetypeId: "ranger:sentinel",
    name: "Mugshot",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Perception bonus vs. a specific memorized target — no schema field tracks memorized targets",
  },
  "ranger:sentinel:uncanny-alertness:4": {
    archetypeId: "ranger:sentinel",
    name: "Uncanny Alertness",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. initiative bonus conditioned on 'would already act in the surprise round, or there is none'",
  },
  "ranger:sentinel:sense-intruder:6": {
    archetypeId: "ranger:sentinel",
    name: "Sense Intruder",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated perception-zone ability",
  },
  "ranger:sentinel:mugshot-quarry:11": {
    archetypeId: "ranger:sentinel",
    name: "Mugshot Quarry",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. modifies quarry's activation requirements, no new number",
  },
  "ranger:shapeshifter:combat-style-feat:2": {
    archetypeId: "ranger:shapeshifter",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:shapeshifter:shifter-s-blessing:3": {
    archetypeId: "ranger:shapeshifter",
    name: "Shifter's Blessing",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. polymorph-like activated forms, replaces favored terrain",
  },
  "ranger:shapeshifter:dual-form-shifter:12": {
    archetypeId: "ranger:shapeshifter",
    name: "Dual Form Shifter",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:shapeshifter:master-shifter:20": {
    archetypeId: "ranger:shapeshifter",
    name: "Master Shifter",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:skirmisher:hunter-s-tricks:5": {
    archetypeId: "ranger:skirmisher",
    name: "Hunter's Tricks",
    level: 5,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes. spell-less variant, replaces the ranger's spells class feature entirely",
  },
  "ranger:spirit-ranger:spirit-bond:4": {
    archetypeId: "ranger:spirit-ranger",
    name: "Spirit Bond",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. augury spell-like ability, replaces hunter's bond",
  },
  "ranger:spirit-ranger:wisdom-of-the-spirits:12": {
    archetypeId: "ranger:spirit-ranger",
    name: "Wisdom of the Spirits",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:stormwalker:combat-style-feat:2": {
    archetypeId: "ranger:stormwalker",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:stormwalker:thundershot:4": {
    archetypeId: "ranger:stormwalker",
    name: "Thundershot",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. weapon shock property, activated",
  },
  "ranger:stormwalker:wind-treader:8": {
    archetypeId: "ranger:stormwalker",
    name: "Wind Treader",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. wind immunity",
  },
  "ranger:stormwalker:flash-step:11": {
    archetypeId: "ranger:stormwalker",
    name: "Flash Step",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. teleport-like movement",
  },
  "ranger:stormwalker:control-weather:16": {
    archetypeId: "ranger:stormwalker",
    name: "Control Weather",
    level: 16,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. spell-like ability",
  },
  "ranger:stormwalker:flash-shot:19": {
    archetypeId: "ranger:stormwalker",
    name: "Flash Shot",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:summit-sentinel:roots-of-the-mountain:2": {
    archetypeId: "ranger:summit-sentinel",
    name: "Roots of the Mountain",
    level: 2,
    bucket: "situational",
    note: "activated ability with a per-day/resource cost and duration (a stance, surge, or similar) — same posture as an unmodeled buff/stance, not an always-on Change. full Combat Style Feat swap (Toughness feat + a defensive stance with scaling natural armor/CMD); the stance's scaling numbers are real but require an active-stance toggle this engine doesn't track",
  },
  "ranger:summit-sentinel:mountain-mastery:3": {
    archetypeId: "ranger:summit-sentinel",
    name: "Mountain Mastery",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. fixed mountains terrain plus an attack/damage bonus conditioned on both combatants touching the ground",
  },
  "ranger:summit-sentinel:rockslide:8": {
    archetypeId: "ranger:summit-sentinel",
    name: "Rockslide",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated AoE damage ability",
  },
  "ranger:summit-sentinel:invincible:17": {
    archetypeId: "ranger:summit-sentinel",
    name: "Invincible",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. crit immunity while in the roots-of-the-mountain stance",
  },
  "ranger:sword-devil:death-vow:1": {
    archetypeId: "ranger:sword-devil",
    name: "Death Vow",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. reflavored Favored Enemy ('Death Vow')",
  },
  "ranger:sword-devil:slashing-fury:3": {
    archetypeId: "ranger:sword-devil",
    name: "Slashing Fury",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. Weapon-Finesse-like swap, restricted to a chosen slashing weapon type",
  },
  "ranger:sword-devil:inspiring-example:4": {
    archetypeId: "ranger:sword-devil",
    name: "Inspiring Example",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. ally buff derived from death vow's bonus vs. a single target",
  },
  "ranger:sword-devil:untouchable:4": {
    archetypeId: "ranger:sword-devil",
    name: "Untouchable",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Cha-to-AC/CMB and scaling dodge AC, gated on unarmored+unencumbered+no-shield compound state",
  },
  "ranger:sword-devil:second-combat-style:11": {
    archetypeId: "ranger:sword-devil",
    name: "Second Combat Style",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. adds a second style's feat LIST to choose from; doesn't change the bonus-feat count",
  },
  "ranger:sword-devil:seething-fury:19": {
    archetypeId: "ranger:sword-devil",
    name: "Seething Fury",
    level: 19,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Cha bonus to attack/damage vs. death vow target + auto-confirmed crits",
  },
  "ranger:sword-devil:avatar-of-vengeance:20": {
    archetypeId: "ranger:sword-devil",
    name: "Avatar of Vengeance",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated transformation ability",
  },
  "ranger:tanglebriar-demonslayer:favored-enemy:1": {
    archetypeId: "ranger:tanglebriar-demonslayer",
    name: "Favored Enemy",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment.",
  },
  "ranger:tanglebriar-demonslayer:demonologist:3": {
    archetypeId: "ranger:tanglebriar-demonslayer",
    name: "Demonologist",
    level: 3,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. bonus scoped to demons specifically",
  },
  "ranger:tanglebriar-demonslayer:expanded-spell-list:4": {
    archetypeId: "ranger:tanglebriar-demonslayer",
    name: "Expanded Spell List",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes.",
  },
  "ranger:tanglebriar-demonslayer:fiendish-quarry:11": {
    archetypeId: "ranger:tanglebriar-demonslayer",
    name: "Fiendish Quarry",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. modifies quarry's weapon-property grant, no new bonus number",
  },
  "ranger:tanglebriar-demonslayer:improved-fiendish-quarry:19": {
    archetypeId: "ranger:tanglebriar-demonslayer",
    name: "Improved Fiendish Quarry",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:tidal-hunter:keen-scent:1": {
    archetypeId: "ranger:tidal-hunter",
    name: "Keen Scent",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. scent ability",
  },
  "ranger:tidal-hunter:waterborn:1": {
    archetypeId: "ranger:tidal-hunter",
    name: "Waterborn",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. breathe-water duration",
  },
  "ranger:tidal-hunter:aquatic-mastery:3": {
    archetypeId: "ranger:tidal-hunter",
    name: "Aquatic Mastery",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. fixed water terrain, standard mechanic otherwise",
  },
  "ranger:tidal-hunter:wave-rush:7": {
    archetypeId: "ranger:tidal-hunter",
    name: "Wave Rush",
    level: 7,
    bucket: "subsystem",
    note: "grants a speed/stat equal to another of the character's own already-computed stats (e.g. 'a swim speed equal to base land speed') — the formula evaluator's rollData has no path exposing that input to a Change formula, so this can't be authored without guessing a fixed number.",
  },
  "ranger:tidal-hunter:tidal-surge:16": {
    archetypeId: "ranger:tidal-hunter",
    name: "Tidal Surge",
    level: 16,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. spell-like ability, once/day",
  },
  "ranger:toxic-herbalist:toxic-touch:1": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Toxic Touch",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. immunity to self-poisoning",
  },
  "ranger:toxic-herbalist:nature-s-mercy:3": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Nature's Mercy",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. healing-poultice resource, not Change-shaped",
  },
  "ranger:toxic-herbalist:sudden-onset:4": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Sudden Onset",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes. spell-list additions + an action-economy change",
  },
  "ranger:toxic-herbalist:grim-harvest:8": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Grim Harvest",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. poison-crafting mechanic, terrain-gated",
  },
  "ranger:toxic-herbalist:potent-venom:11": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Potent Venom",
    level: 11,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. poison save DC increase vs. favored enemy",
  },
  "ranger:toxic-herbalist:poisonous-reaper:19": {
    archetypeId: "ranger:toxic-herbalist",
    name: "Poisonous Reaper",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:toxophilite:arrow-splitter:1": {
    archetypeId: "ranger:toxophilite",
    name: "Arrow-Splitter",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. ranged attack bonus vs. size-scoped targets, replaces wild empathy",
  },
  "ranger:toxophilite:combat-style-feat:2": {
    archetypeId: "ranger:toxophilite",
    name: "Combat Style Feat",
    level: 2,
    bucket: "numeric",
    note: "same restricted-list/same-schedule Combat Style Feat reflavor as the hand-verified table's 6 entries — already covered there (archetype-effects.ts), not duplicated into this file's extracted table.",
  },
  "ranger:transporter:trailbreaker:1": {
    archetypeId: "ranger:transporter",
    name: "Trailbreaker",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. raises the DC for OTHERS tracking the ranger; no bonus-to-self target exists for that",
  },
  "ranger:transporter:plot-course:3": {
    archetypeId: "ranger:transporter",
    name: "Plot Course",
    level: 3,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. bonus tied to one specific plotted travel course",
  },
  "ranger:transporter:smuggler-s-bond:4": {
    archetypeId: "ranger:transporter",
    name: "Smuggler's Bond",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped.",
  },
  "ranger:transporter:hideaway:7": {
    archetypeId: "ranger:transporter",
    name: "Hideaway",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. crafted hideout mechanic",
  },
  "ranger:trapper:trapfinding:1": {
    archetypeId: "ranger:trapper",
    name: "Trapfinding",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. trap-related Perception/Disable Device bonus; the Disable Device half may be broader but is left unmodeled per the honesty bar (ambiguous scope)",
  },
  "ranger:trapper:trap:5": {
    archetypeId: "ranger:trapper",
    name: "Trap",
    level: 5,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes. spell-less variant, replaces the ranger's spells class feature with a traps resource",
  },
  "ranger:trapper:launch-trap:10": {
    archetypeId: "ranger:trapper",
    name: "Launch Trap",
    level: 10,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:trophy-hunter:improved-tracking:1": {
    archetypeId: "ranger:trophy-hunter",
    name: "Improved Tracking",
    level: 1,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. +2 Survival, scoped to tracking specifically, replaces wild empathy",
  },
  "ranger:trophy-hunter:firearm-style-feat:2": {
    archetypeId: "ranger:trophy-hunter",
    name: "Firearm Style Feat",
    level: 2,
    bucket: "subsystem",
    note: "replaces Combat Style Feat's entire bonus-feat schedule with a different resource (rogue talents/alchemist discoveries, gunslinger grit/deeds, a Survival ability, uncanny dodge/rage/rage powers, etc.) — a full 1:1 swap, but not a feat-count reflavor, and the substitute resource has no engine hook either.",
  },
  "ranger:trophy-hunter:hunter-s-aim:4": {
    archetypeId: "ranger:trophy-hunter",
    name: "Hunter's Aim",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped. touch-AC targeting with firearms vs. favored enemy",
  },
  "ranger:urban-ranger:favored-community:3": {
    archetypeId: "ranger:urban-ranger",
    name: "Favored Community",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. community-as-terrain variant",
  },
  "ranger:urban-ranger:trapfinding:3": {
    archetypeId: "ranger:urban-ranger",
    name: "Trapfinding",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows rogue trapfinding, replaces endurance",
  },
  "ranger:urban-ranger:push-through:7": {
    archetypeId: "ranger:urban-ranger",
    name: "Push Through",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. movement through crowds in favored communities",
  },
  "ranger:urban-ranger:blend-in:12": {
    archetypeId: "ranger:urban-ranger",
    name: "Blend In",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. Stealth-as-Disguise, replaces camouflage",
  },
  "ranger:urban-ranger:invisibility-trick:17": {
    archetypeId: "ranger:urban-ranger",
    name: "Invisibility Trick",
    level: 17,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. spell-like ability, replaces hide in plain sight",
  },
  "ranger:warden:master-of-terrain:1": {
    archetypeId: "ranger:warden",
    name: "Master of Terrain",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. extra favored-terrain slots (schedule change), replaces the first favored enemy",
  },
  "ranger:warden:live-in-comfort:2": {
    archetypeId: "ranger:warden",
    name: "Live in Comfort",
    level: 2,
    bucket: "subsystem",
    note: "replaces Combat Style Feat's entire bonus-feat schedule with a different resource (rogue talents/alchemist discoveries, gunslinger grit/deeds, a Survival ability, uncanny dodge/rage/rage powers, etc.) — a full 1:1 swap, but not a feat-count reflavor, and the substitute resource has no engine hook either.",
  },
  "ranger:warden:terrain-bond:4": {
    archetypeId: "ranger:warden",
    name: "Terrain Bond",
    level: 4,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. ally buff conditioned on being in favored terrain, replaces hunter's bond",
  },
  "ranger:warden:able-explorer:5": {
    archetypeId: "ranger:warden",
    name: "Able Explorer",
    level: 5,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. roll-twice-take-higher mechanic; not expressible as a flat Change",
  },
  "ranger:warden:wilderness-whispers:20": {
    archetypeId: "ranger:warden",
    name: "Wilderness Whispers",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. auto-max initiative + unhindered tracking speed, no flat bonus number",
  },
  "ranger:wave-warden:deep-sentinel:1": {
    archetypeId: "ranger:wave-warden",
    name: "Deep Sentinel",
    level: 1,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. Perception bonus scoped to noticing creatures underwater, replaces track",
  },
  "ranger:wave-warden:aquatic-prowess-feat:2": {
    archetypeId: "ranger:wave-warden",
    name: "Aquatic Prowess Feat",
    level: 2,
    bucket: "numeric",
    note: "restricts the ranger's Combat Style Feat to one style/list but preserves the identical 2nd/6th/10th/14th/18th bonus-feat schedule — same reflavor shape as the hand-verified table's 6 entries (archetype-effects.ts). explicitly 'functions like and replaces the standard ranger's combat style bonus feats'",
  },
  "ranger:wave-warden:favored-terrain:3": {
    archetypeId: "ranger:wave-warden",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability.",
  },
  "ranger:wave-warden:seaborn:7": {
    archetypeId: "ranger:wave-warden",
    name: "Seaborn",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. terrain movement, replaces woodland stride",
  },
  "ranger:wave-warden:watery-summons:8": {
    archetypeId: "ranger:wave-warden",
    name: "Watery Summons",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. summon-monster-style spell-like ability, replaces swift tracker",
  },
  "ranger:wild-hunter:animal-focus:1": {
    archetypeId: "ranger:wild-hunter",
    name: "Animal Focus",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated ability grant depending on chosen animal, replaces favored enemy",
  },
  "ranger:wild-hunter:shared-focus:7": {
    archetypeId: "ranger:wild-hunter",
    name: "Shared Focus",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number.",
  },
  "ranger:wild-shadow:wild-at-heart:1": {
    archetypeId: "ranger:wild-shadow",
    name: "Wild at Heart",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. context-dependent (urban vs. non-urban) fractional-level multipliers on two abilities, too compound for a flat Change",
  },
  "ranger:wild-shadow:favored-terrain:3": {
    archetypeId: "ranger:wild-shadow",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "modifies Favored Terrain's target/schedule the same way — free-form doc.build.favoredTerrains already covers arbitrary custom schedules, applicability is GM-judged same as the base ability. urban excluded from the terrain choice, standard mechanic otherwise",
  },
  "ranger:wild-shadow:woodland-stride:4": {
    archetypeId: "ranger:wild-shadow",
    name: "Woodland Stride",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. restates base Woodland Stride's own (changes:[]) grant",
  },
  "ranger:wild-shadow:unfettered-step:7": {
    archetypeId: "ranger:wild-shadow",
    name: "Unfettered Step",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. upgrades woodland stride's scope, no bonus number",
  },
  "ranger:wild-shadow:harrying-attack:11": {
    archetypeId: "ranger:wild-shadow",
    name: "Harrying Attack",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. applies an entangled status on hit; not a bonus-value Change, replaces quarry",
  },
  "ranger:wild-shadow:wild-stalker:14": {
    archetypeId: "ranger:wild-shadow",
    name: "Wild Stalker",
    level: 14,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. cover/concealment improvement, gated on favored terrain + existing cover/concealment state",
  },
  "ranger:wild-shadow:master-of-terrain:19": {
    archetypeId: "ranger:wild-shadow",
    name: "Master of Terrain",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. extends harrying attack's targeting, no separate number",
  },
  "ranger:wild-soul:nemesis:1": {
    archetypeId: "ranger:wild-soul",
    name: "Nemesis",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. tech/arcane-caster-scoped bonus, favored-enemy-style",
  },
  "ranger:wild-soul:unfettered-soul:1": {
    archetypeId: "ranger:wild-soul",
    name: "Unfettered Soul",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. roleplay/oath restriction, no number",
  },
  "ranger:wild-soul:nemesis-defense:8": {
    archetypeId: "ranger:wild-soul",
    name: "Nemesis Defense",
    level: 8,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. extends nemesis's bonus to saves/AC vs. those same categories",
  },
  "ranger:wild-soul:break-the-interloper:11": {
    archetypeId: "ranger:wild-soul",
    name: "Break the Interloper",
    level: 11,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. on-hit resource-drain effect vs. specific caster/grit-user types",
  },
  "ranger:wild-soul:dizzying-onslaught:19": {
    archetypeId: "ranger:wild-soul",
    name: "Dizzying Onslaught",
    level: 19,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. on-crit debuff, situational trigger, no flat additive Change",
  },
  "ranger:wild-soul:nemesis-slayer:20": {
    archetypeId: "ranger:wild-soul",
    name: "Nemesis Slayer",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. activated save-or-die attack",
  },
  "ranger:wild-stalker:strong-senses:1": {
    archetypeId: "ranger:wild-stalker",
    name: "Strong Senses",
    level: 1,
    bucket: "numeric",
    note: "unconditional Perception bonus progression (+1 at 1st, +1/4 levels, max +6 at 20th); the 'already has low-light vision elsewhere' +1 variant (max +7) is not modeled since the engine has no signal for a race's own low-light vision",
  },
  "ranger:wild-stalker:uncanny-dodge:2": {
    archetypeId: "ranger:wild-stalker",
    name: "Uncanny Dodge",
    level: 2,
    bucket: "subsystem",
    note: "replaces Combat Style Feat's entire bonus-feat schedule with a different resource (rogue talents/alchemist discoveries, gunslinger grit/deeds, a Survival ability, uncanny dodge/rage/rage powers, etc.) — a full 1:1 swap, but not a feat-count reflavor, and the substitute resource has no engine hook either. together with wild-talent:6 (which covers the 6th/10th/14th/18th tiers), this fully replaces ALL FIVE Combat Style Feat tiers with uncanny dodge + rage/rage-power/skill-bonus choices — a full swap in aggregate, so the paired-swap suppression correctly zeroing the base bonus-feat formula matches RAW's 'nothing from Combat Style Feat' outcome; not a blocked partial case",
  },
  "ranger:wild-stalker:rage-of-the-wild:4": {
    archetypeId: "ranger:wild-stalker",
    name: "Rage of the Wild",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows the barbarian rage class feature (itself deferred, IMPLEMENTATION_PLAN.md), replaces hunter's bond",
  },
  "ranger:wild-stalker:rage-power:5": {
    archetypeId: "ranger:wild-stalker",
    name: "Rage Power",
    level: 5,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. rage powers have no schema field (deferred, IMPLEMENTATION_PLAN.md)",
  },
  "ranger:wild-stalker:wild-talent:6": {
    archetypeId: "ranger:wild-stalker",
    name: "Wild Talent",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. player choice each time between a rage power or +2 to one of several named skills — no schema field records which",
  },
  "ranger:wilderness-explorer:cultural-contact:1": {
    archetypeId: "ranger:wilderness-explorer",
    name: "Cultural Contact",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. communication ability + wild-empathy variant for humanoids",
  },
  "ranger:wilderness-explorer:hazard-sense:4": {
    archetypeId: "ranger:wilderness-explorer",
    name: "Hazard Sense",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. Reflex/AC bonus scoped to natural hazards and wilderness traps specifically",
  },
  "ranger:wilderness-explorer:indigenous-spirit:8": {
    archetypeId: "ranger:wilderness-explorer",
    name: "Indigenous Spirit",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows uncanny dodge, terrain-gated",
  },
  "ranger:wilderness-explorer:guardian-spirit:11": {
    archetypeId: "ranger:wilderness-explorer",
    name: "Guardian Spirit",
    level: 11,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. borrows improved uncanny dodge, terrain-gated",
  },
  "ranger:wilderness-explorer:manifest-spirit:19": {
    archetypeId: "ranger:wilderness-explorer",
    name: "Manifest Spirit",
    level: 19,
    bucket: "situational",
    note: "environment/location-conditional bonus (e.g. underwater, underground, volcanic, a favored community) — no engine signal for location state, same honesty bar as favored terrain itself. spell resistance formula is clean but conditioned on being within favored terrain, an environment-state the engine can't check",
  },
  "ranger:wilderness-medic:herbalist-training:1": {
    archetypeId: "ranger:wilderness-medic",
    name: "Herbalist Training",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 level (min 1) on Heal and Profession (herbalism) checks",
  },
  "ranger:wilderness-medic:herbal-medicine:3": {
    archetypeId: "ranger:wilderness-medic",
    name: "Herbal Medicine",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. healing/condition-reduction ability, resource-gated",
  },
  "ranger:wilderness-medic:rallying-bond:4": {
    archetypeId: "ranger:wilderness-medic",
    name: "Rallying Bond",
    level: 4,
    bucket: "subsystem",
    note: "replaces Hunter's Bond with an unrelated ability/resource — companion system has no archetype hooks and the replacement itself isn't Change-shaped. ally-buff variant of hunter's bond, favored-enemy-derived + action-gated",
  },
  "ranger:witchguard:bodyguard:3": {
    archetypeId: "ranger:witchguard",
    name: "Bodyguard",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants Bodyguard as a bonus feat",
  },
  "ranger:witchguard:defend-charge:4": {
    archetypeId: "ranger:witchguard",
    name: "Defend Charge",
    level: 4,
    bucket: "situational",
    note: "real number scoped to a specific action, maneuver, marked/memorized target, or narrow context the engine can't check without over-applying — same honesty bar as traits.ts/feat-effects.ts. AC/concentration buff to one adjacent ally, action-gated, replaces hunter's bond",
  },
  "ranger:witchguard:patron:4": {
    archetypeId: "ranger:witchguard",
    name: "Patron",
    level: 4,
    bucket: "subsystem",
    note: "modifies the ranger's spellcasting model (spell list additions, casting-stat swap, or a spell-less variant) — no engine hook for per-archetype spell-list/caster-model changes. witch-patron spell-list addition",
  },
  "ranger:witchguard:sworn-defender:7": {
    archetypeId: "ranger:witchguard",
    name: "Sworn Defender",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. grants In Harm's Way as a bonus feat",
  },
  "ranger:yokai-hunter:favored-yokai:1": {
    archetypeId: "ranger:yokai-hunter",
    name: "Favored Yokai",
    level: 1,
    bucket: "situational",
    note: "modifies Favored Enemy's target/schedule (restricts to one type, adds/changes bonus increments, or reflavors it) — real number, but the base machinery (doc.build.favoredEnemies, a free-form {type,bonus}[] list) already lets the player encode any custom schedule by hand, and applicability is GM-judged same as the base ability. See ranger.ts's own doc comment. yokai-type-scoped bonus, favored-enemy-style",
  },
  "ranger:yokai-hunter:yokai-sense:7": {
    archetypeId: "ranger:yokai-hunter",
    name: "Yokai Sense",
    level: 7,
    bucket: "subsystem",
    note: "grants an unrelated named feat, proficiency, borrowed class feature (uncanny dodge, rage, rogue talent, evasion, etc.), or other subsystem the engine doesn't model — no exploitable number. blindsense, replaces woodland stride",
  },
  "ranger:yokai-hunter:resist-yokai:12": {
    archetypeId: "ranger:yokai-hunter",
    name: "Resist Yokai",
    level: 12,
    bucket: "situational",
    note: "save bonus scoped to a specific effect type (poison, divination, curses, fear, etc.) — no qualified-save target exists (fort/ref/will are the only save targets this engine applies).",
  },
};

/**
 * ── RANGER_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for ranger archetype class features
 * (issue #45, wave 2). Clean-room from the published PF1 rules — the
 * vendored prose this was extracted from (`archetype-features.json`) is OGL,
 * so reading it is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * Only `numeric`-bucketed features get an entry here (10 total: 3 Combat
 * Style Feat restricted-list reflavors beyond the 6 already hand-verified in
 * `archetype-effects.ts`, plus 7 unconditional skill/save/resistance
 * bonuses). This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table); `collect.ts` and
 * `archetypes.ts` both resolve through `resolveArchetypeFeatureEffect`
 * (`archetype-effects-resolve.ts`), which always checks the hand-verified
 * table first, so an id present in both can never double-apply. (No ranger id
 * is present in both tables today.)
 */
export const RANGER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── Combat Style Feat reflavors (restricted list, identical schedule) ────

  "ranger:elemental-envoy:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} elemental combat style bonus feat(s)`,
    confidence: "high",
    provenance:
      "At 2nd level, an elemental envoy must choose the elemental combat style on this page, " +
      "choosing his combat style feats from that list. [Base Combat Style Feat schedule, " +
      "unmodified: bonus feats at 2nd, 6th, 10th, 14th, and 18th level.]",
  },
  "ranger:hooded-champion:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) =>
      `${Math.floor((level + 2) / 4)} archery bonus feat(s); swashbuckler grace/evasive deeds ` +
      `(9th) and edge/cheat death deeds (16th) not modeled`,
    confidence: "medium",
    provenance:
      "At 2nd level, the hooded champion must select the archery combat style. At 9th level, " +
      "the hooded champion gains the swashbuckler's grace and evasive deeds. At 16th level, the " +
      "hooded champion gains the swashbuckler's edge and cheat death deeds. [Base Combat Style " +
      "Feat schedule, unmodified: bonus feats at 2nd, 6th, 10th, 14th, and 18th level.]",
  },
  "ranger:wave-warden:aquatic-prowess-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} aquatic combat style bonus feat(s)`,
    confidence: "high",
    provenance:
      "This ability otherwise functions like and replaces the standard ranger's combat style " +
      "bonus feats, including the limitations on armor worn.",
  },

  // ── Unconditional skill/save/resistance bonuses ───────────────────────────

  "ranger:fortune-finder:hinterlander:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.clm"),
      c("max(1, floor(@class.unlevel / 2))", "skill.swm"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Climb/Swim`,
    confidence: "high",
    provenance: "A fortune-finder adds 1/2 his level (minimum 1) on all Climb and Swim checks.",
  },
  "ranger:freebooter:fast-swimmer:7": {
    changes: [c("2", "skill.swm")],
    detail: () => "+2 Swim",
    confidence: "high",
    provenance:
      "Starting at 7th level, a freebooter may swim half her speed as a move action or her " +
      "normal speed as a full-round action with a successful Swim check. The freebooter gains " +
      "a +2 bonus on Swim checks. [The move/full-round swim-action change is not Change-shaped " +
      "and is not modeled.]",
  },
  "ranger:groom:scout-the-area:3": {
    changes: [c("4", "skill.klo")],
    detail: () => "+4 Knowledge (local)",
    confidence: "high",
    provenance:
      "At 3rd level, a groom gains a +4 bonus on Knowledge (local) checks. [The 'always knows " +
      "where to find the nearest expert' addendum is not Change-shaped and is not modeled.]",
  },
  "ranger:realm-wanderer:deceptive-subtlety:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.dip"),
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Diplomacy/Bluff`,
    confidence: "high",
    provenance:
      "A realm wanderer adds half his level (minimum 1) to Diplomacy checks to influence a " +
      "creature's attitude, to make requests of creatures, and for similar uses of the skill. " +
      "He also adds half his level (minimum 1) to Bluff checks to deceive, lie, or convey " +
      "secret messages. [Dual Master's L8 doubling of this bonus in 2 favored terrains is " +
      "environment-conditional and not modeled.]",
  },
  "ranger:cinderwalker:inured:4": {
    changes: [
      c(
        "if(gte(@class.unlevel, 16), 30, if(gte(@class.unlevel, 12), 20, if(gte(@class.unlevel, 8), 10, 0)))",
        "eres.fire",
      ),
    ],
    detail: (level) =>
      level >= 20
        ? "fire resistance 30 (immunity not modeled)"
        : level >= 16
          ? "fire resistance 30"
          : level >= 12
            ? "fire resistance 20"
            : level >= 8
              ? "fire resistance 10"
              : "no fire resistance yet (endure elements vs. heat only, not modeled)",
    confidence: "medium",
    provenance:
      "At 4th level, a cinderwalker gains the benefits of endure elements against hot " +
      "environments. At 8th level, the cinderwalker gains fire resistance 10, which improves " +
      "to fire resistance 20 at 12th level, fire resistance 30 at 16th level, and immunity to " +
      "fire at 20th level. [True immunity at 20th is not modeled — capped at resistance 30 — " +
      "and 4th level's endure elements benefit isn't Change-shaped.]",
  },
  "ranger:wild-stalker:strong-senses:1": {
    changes: [c("min(6, 1 + floor(@class.unlevel / 4))", "skill.per")],
    detail: (level) => `+${Math.min(6, 1 + Math.floor(level / 4))} Perception`,
    confidence: "medium",
    provenance:
      "At 1st level, a wild stalker's life among the wild has sharpened his senses. He gains " +
      "low-light vision and a +1 bonus on Perception checks. If he already has low-light " +
      "vision, he gains a +2 bonus on Perception checks instead. This bonus increases by +1 " +
      "for every four levels after 1st (to a maximum of +6 at 20th level, or +7 if the " +
      "character did not gain low-light vision from this ability). [Modeled as the +1-at-1st- " +
      "level variant with breakpoints at 4th/8th/12th/16th/20th, which reconciles exactly with " +
      "the stated +6-at-20th cap; the alternate +2-base/+7-cap line for characters with " +
      "independent low-light vision is not modeled — the engine has no signal for a race's own " +
      "low-light vision.]",
  },
  "ranger:wilderness-medic:herbalist-training:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.hea"),
      c("max(1, floor(@class.unlevel / 2))", "skill.pro.herbalism"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Heal/Profession (herbalism)`,
    confidence: "high",
    provenance:
      "At 1st level, a wilderness medic can attempt Profession (herbalism) checks untrained " +
      "and the wilderness medic gains a bonus equal to 1/2 his ranger level (minimum +1) on " +
      "Heal checks and Profession (herbalism) checks. [Only applies once the player has added " +
      "a 'Profession (herbalism)' skill entry with id skill.pro.herbalism, same convention as " +
      "the hand-verified table's skill.crf.alchemy.]",
  },
};
