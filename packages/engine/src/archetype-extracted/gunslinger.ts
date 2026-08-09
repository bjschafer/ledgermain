/**
 * Gunslinger's slice of the pipeline (2026-08-08): every vendored archetype
 * feature whose id starts with `gunslinger:` (82 features across 25
 * archetypes) read individually and bucketed `numeric` / `situational` /
 * `subsystem` / `blocked`, following the exact methodology `magus.ts`/
 * `fighter.ts` established. Per the per-class file convention (`index.ts`'s
 * doc comment), this file owns BOTH of gunslinger's pipeline artifacts —
 * `GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on
 * a different class never has a reason to touch this file; only `index.ts`
 * (the aggregator, a later integration step not done here) needs a new
 * import + spread line.
 *
 * ── Gunslinger-specific mechanical facts this pass relies on ──────────────
 *
 * 1. **Grit** (base L1 feature, `uses.maxFormula: "max(1, @abilities.wis.mod)"`,
 *    per day) is a real vendored resource pool. Any archetype feature that
 *    changes the pool's daily SIZE — including swapping the governing ability
 *    score (Wis -> Cha) or subtracting a flat penalty from the vendored
 *    formula — is left unextracted: resource-pool sizing is never a `Change`
 *    target in this engine (it lives in `uses.maxFormula`, not `changes`),
 *    so there is nothing this pipeline could emit for it either way. A
 *    feature that only changes WHEN grit is regained mid-combat (a live-play
 *    trigger swap, e.g. "on a crossbow crit" instead of "on a firearm crit")
 *    is the same story: grit regain triggers were never `Change`-modeled to
 *    begin with. Both shapes are bucketed `subsystem`.
 * 2. **Deeds** (base L1 feature, plus every archetype's own deed swaps/
 *    additions) are an entirely unmodeled activated subsystem — no schema
 *    field, no picker, no per-deed `Change` exists at all, and every deed
 *    either costs a grit point, requires at least 1 grit point banked, or
 *    both. Any feature that adds, swaps, or reflavors deeds is `subsystem`.
 * 3. **Gun Training** (5th level and every 4 levels thereafter) grants a
 *    Dex-mod damage bonus and a reduced misfire value, but ONLY with a
 *    single firearm TYPE the player freely picks each tier (axe musket,
 *    blunderbuss, musket, pistol, ...) — the vendored feature itself carries
 *    `changes: []` (confirmed via `class-features.json`), matching the
 *    engine's general stance that per-weapon-type player choices are a
 *    deferred, unmodeled area (no schema field tracks "which firearm type is
 *    Gun Training'd"). Every archetype reflavor of Gun Training (crossbows,
 *    two-handed-firearms-as-a-whole, one-handed-firearms-as-a-whole,
 *    advanced-tech firearms, light siege engines) is `situational` for the
 *    single-type variants (weapon-choice-scoped, same as the base) or
 *    `blocked` for the two whole-category variants (see fact 4).
 * 4. **Musket Training** (Musket Master) and **Pistol Training** (Pistolero)
 *    depart from Gun Training's per-type-choice shape: they grant their
 *    Dex-mod damage bonus to an entire HANDEDNESS CATEGORY of firearms (all
 *    two-handed, or all one-handed) with no player choice involved. That's
 *    exactly the shape `damage.weapon.<group>` (Weapon Training's semantic
 *    weapon-group target) exists for — except `WEAPON_GROUPS`
 *    (`weapon-groups.ts`) only carries a single undifferentiated `"firearms"`
 *    tag; the vendored weapon data draws no line between one-handed and
 *    two-handed firearms. A `damage.weapon.firearms` Change would therefore
 *    over-apply to the wrong handedness half of the category. Both entries
 *    are `blocked` on this missing split — see the classification notes for
 *    specifics; worth escalating as a target gap two independent features
 *    want.
 * 5. **Nimble** (base L2 feature) carries a real vendored Change:
 *    `1 + floor((@class.unlevel - 2) / 4)` dodge AC, gated in prose (but NOT
 *    in the vendored formula itself) on light-or-no armor. Ten archetype
 *    features across this table structurally replace Nimble (verified via
 *    each feature's own `pairedBaseFeatureUuid` pointing at Nimble's
 *    compendium uuid, `BTkYdjVLcQMfFsv9` — the replacement-suppression
 *    mechanism `archetypes.ts` uses) — those are flagged as a pure loss of
 *    Nimble's dodge AC in their classification notes, per the standard
 *    "replacement suppression carried by vendored feature pairing" rule.
 * 6. **Bonus Feats (GUN)** (base L4 feature, `floor(@class.unlevel / 4)`
 *    `bonusFeats`, untyped) is ALSO a real vendored Change. Several
 *    archetype features claim in prose to replace this progression (Gun
 *    Tank's Armor Training, Siege Gunner's Bonus Feat, Bushwhacker's Sneak
 *    Shot) but — verified via the same `pairedBaseFeatureUuid` check — none
 *    of them are structurally paired to the Bonus Feats (GUN) compendium
 *    uuid (`c1DXh24tF5vQFLaI`). That means the vendored replacement
 *    suppression the prose promises doesn't actually fire: a character with
 *    any of these archetypes keeps gaining the unmodified
 *    `floor(@class.unlevel / 4)` bonus feats from the base progression
 *    regardless. This is a vendoring/wiring gap outside this file's scope
 *    (fixing it would mean editing `archetypes.ts`'s pairing data, which
 *    this pass doesn't touch) — but it directly blocks extracting any
 *    ADDITIONAL `bonusFeats` Change for Siege Gunner's Bonus Feat (would
 *    double-count against the still-active base progression) and Gun Tank's
 *    own level-20 Bonus Feat restatement (same risk, see that entry's note).
 *    It does NOT block Gun Tank's Armor Training, which grants a different,
 *    unclaimed target (`mDexA`/`acpA`) — nothing else in this table touches
 *    that target, so no double-count risk exists for it specifically.
 *
 * Every `numeric` and `blocked` entry below carries its own reasoning either
 * inline (classification `note`) or in
 * `GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED`'s `provenance`. Only 4 of
 * gunslinger's 82 features cleared the `numeric` bar — gunslinger's kit
 * leans almost entirely on grit-spend deeds, weapon-choice-scoped Gun
 * Training reflavors, and named/fixed bonus-feat grants, none of which this
 * engine models as an always-on number today.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── gunslinger:black-powder-vaulter ──
  "gunslinger:black-powder-vaulter:deeds:1": {
    archetypeId: "gunslinger:black-powder-vaulter",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds (Mobile Reload, Daring Vault, Shot on the Run, Art of the Gun, Dual Shot on the Run) for grit-spend movement/attack abilities — deeds are an unmodeled activated subsystem (class note 2)",
  },

  // ── gunslinger:blatherskite ──
  "gunslinger:blatherskite:deeds:1": {
    archetypeId: "gunslinger:blatherskite",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds for grit-gated reaction/initiative/precision-damage abilities, including one (Blatherskite's Initiative) whose +2 initiative bonus is itself explicitly framed as lasting only 'as long as he has at least 1 grit point' — no unconditional clause to peel off, unlike Thronewarden's Hair-Trigger Reflexes below (class note 2)",
  },

  // ── gunslinger:bolt-ace ──
  "gunslinger:bolt-ace:crossbow-maven:1": {
    archetypeId: "gunslinger:bolt-ace",
    name: "Crossbow Maven",
    level: 1,
    bucket: "subsystem",
    note: "swaps firearm proficiency for all-crossbow proficiency plus a starting masterwork crossbow — proficiency grant, no Change target",
  },
  "gunslinger:bolt-ace:crossbow-training:5": {
    archetypeId: "gunslinger:bolt-ace",
    name: "Crossbow Training",
    level: 5,
    bucket: "situational",
    note: "Gun Training's exact shape (Dex-mod damage + reduced misfire-equivalent, plus a crit-multiplier bump) ported to a player-chosen crossbow type each tier — weapon-choice-scoped, same as base Gun Training (class note 3)",
  },
  "gunslinger:bolt-ace:deeds:1": {
    archetypeId: "gunslinger:bolt-ace",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "retargets several deeds at crossbows and swaps six others (Sharp Shoot, Vigilant Loading, Shooter's Resolve, Distracting Shot, Vigilant Shooter, Inexplicable Reload, Pinning Shot) for grit-gated crossbow abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:bolt-ace:grit:1": {
    archetypeId: "gunslinger:bolt-ace",
    name: "Grit",
    level: 1,
    bucket: "subsystem",
    note: "swaps the grit-regain trigger from firearm crits/kills to crossbow crits/kills — the daily pool size (max(1, @abilities.wis.mod)) is untouched, and regain triggers were never a Change target to begin with (class note 1)",
  },

  // ── gunslinger:buccaneer ──
  "gunslinger:buccaneer:bonus-feat:4": {
    archetypeId: "gunslinger:buccaneer",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "restates the base Bonus Feats (GUN) progression's exact count/cadence (4th and every 4 levels thereafter), only widening the eligible feat list (Expert Driver, Master Siege Engineer, Siege Engineer, Skilled Driver) — matches the already-vendored floor(@class.unlevel/4) baseline exactly, nothing new to extract",
  },
  "gunslinger:buccaneer:deeds:1": {
    archetypeId: "gunslinger:buccaneer",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds for grit-gated terrain/social/spell-like abilities (Seadog's Gait, Pirate's Jargon, Rope Swing, Captain's Curse) — deeds subsystem (class note 2)",
  },
  "gunslinger:buccaneer:exotic-pet:5": {
    archetypeId: "gunslinger:buccaneer",
    name: "Exotic Pet",
    level: 5,
    bucket: "subsystem",
    note: "grants a familiar (with conditional evasion while it's nearby) in place of Gun Training 1 — familiar subsystem plus a proximity-conditional evasion grant, neither a flat number; the vendored Gun Training slot it replaces carries changes: [] (class note 3), so no baseline is lost either",
  },
  "gunslinger:buccaneer:grit:1": {
    archetypeId: "gunslinger:buccaneer",
    name: "Grit",
    level: 1,
    bucket: "subsystem",
    note: "swaps grit's governing ability score from Wisdom to Charisma — resource-pool sizing is never a Change target in this engine regardless of which ability drives it (class note 1)",
  },
  // NOTE: this vendored archetype's remaining features (Hilt Bash replacing
  // "bardic knowledge", Knock Out replacing "lore master", Song of Surrender/
  // Mass Song of Surrender replacing bard suggestion spells) describe bard
  // class features and spells, not anything a gunslinger has — a vendored-data
  // mislabeling (this "Buccaneer" archetype's mechanics read as a bard
  // archetype filed under the gunslinger class tag). Classified below purely
  // on what the prose actually says, since the pipeline's job is to bucket
  // the vendored text as given, not to second-guess its class tag.
  "gunslinger:buccaneer:gun-training:13": {
    archetypeId: "gunslinger:buccaneer",
    name: "Gun Training",
    level: 13,
    bucket: "situational",
    note: "Gun Training's exact weapon-choice-scoped shape, delayed to 13th level with no further stated scaling — still weapon-choice-scoped (class note 3)",
  },
  "gunslinger:buccaneer:hilt-bash:1": {
    archetypeId: "gunslinger:buccaneer",
    name: "Hilt Bash",
    level: 1,
    bucket: "subsystem",
    note: "removes the nonlethal-attack penalty for lethal weapons (replacing 'bardic knowledge' per the vendored text — a bard feature, see the archetype-wide note above) — a rules permission, no Change target for it",
  },
  "gunslinger:buccaneer:knock-out:5": {
    archetypeId: "gunslinger:buccaneer",
    name: "Knock Out",
    level: 5,
    bucket: "situational",
    note: "real Cha-to-attack / level-to-nonlethal-damage bonus, but a 1-3/day swift-action ability scoped to one chosen target until it changes (replacing 'lore master', a bard feature — see the archetype-wide note above)",
  },
  "gunslinger:buccaneer:liquid-courage:2": {
    archetypeId: "gunslinger:buccaneer",
    name: "Liquid Courage",
    level: 2,
    bucket: "subsystem",
    note: "replaces nimble (pure loss of its dodge AC scaling, per class note 5) with an entirely new 'grog point' resource — a fluctuating, drink-fueled pool with no engine field to track it, granting a save/AC bonus equal to its CURRENT value each round",
  },
  "gunslinger:buccaneer:mass-song-of-surrender:18": {
    archetypeId: "gunslinger:buccaneer",
    name: "Mass Song of Surrender",
    level: 18,
    bucket: "subsystem",
    note: "an enchantment (compulsion) spell-like ability replacing 'mass suggestion' (a bard spell — see the archetype-wide note above) — enemy-effect subsystem, no player number",
  },
  "gunslinger:buccaneer:raider-s-riposte:17": {
    archetypeId: "gunslinger:buccaneer",
    name: "Raider's Riposte",
    level: 17,
    bucket: "subsystem",
    note: "grants a triggered attack of opportunity when an enemy misses one with an AoO, replacing Gun Training 4 — an action-economy permission, no flat number",
  },
  "gunslinger:buccaneer:song-of-surrender:4": {
    archetypeId: "gunslinger:buccaneer",
    name: "Song of Surrender",
    level: 4,
    bucket: "subsystem",
    note: "an enchantment (compulsion) spell-like ability replacing 'suggestion' (a bard spell — see the archetype-wide note above) — enemy-effect subsystem, no player number",
  },
  "gunslinger:buccaneer:sword-and-pistol:9": {
    archetypeId: "gunslinger:buccaneer",
    name: "Sword and Pistol",
    level: 9,
    bucket: "subsystem",
    note: "grants a single named feat (Sword and Pistol) in place of Gun Training 2 — a fixed feat grant, not the generic bonusFeats budget",
  },

  // ── gunslinger:bushwhacker ──
  "gunslinger:bushwhacker:craven-deeds:1": {
    archetypeId: "gunslinger:bushwhacker",
    name: "Craven Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Shifty Shot, Long Range Shifty Shot) for grit-gated rogue-sneak-attack-style precision damage on denied-Dex targets — deeds subsystem, and precision damage conditional on a per-attack target state is never auto-applied even for the rogue's own sneak attack (tables.ts's sneakAttackDice is display-only)",
  },
  "gunslinger:bushwhacker:sneak-shot:4": {
    archetypeId: "gunslinger:bushwhacker",
    name: "Sneak Shot",
    level: 4,
    bucket: "situational",
    note: "real, level-scaling precision damage dice (1d6 per 4 levels) on firearm attacks against opponents denied their Dex to AC, unconditional on grit — but scoped to a per-attack target-defense state the static sheet can't check, same posture as rogue sneak attack itself (never an auto-applied damage Change)",
  },
  "gunslinger:bushwhacker:trembling-grit:1": {
    archetypeId: "gunslinger:bushwhacker",
    name: "Trembling Grit",
    level: 1,
    bucket: "subsystem",
    note: "reduces the grit pool's daily size to Wis modifier minus 1 (minimum 1) — a genuine divergence from the vendored max(1, @abilities.wis.mod) formula, but resource-pool sizing is never a Change target in this pipeline either way (class note 1)",
  },

  // ── gunslinger:commando ──
  "gunslinger:commando:deeds:1": {
    archetypeId: "gunslinger:commando",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds for grit-gated trap-triggering and ranger-class-feature (camouflage, hide in plain sight) grants — deeds subsystem (class note 2)",
  },
  "gunslinger:commando:favored-terrain:2": {
    archetypeId: "gunslinger:commando",
    name: "Favored Terrain",
    level: 2,
    bucket: "subsystem",
    note: "grants the ranger favored-terrain class feature (replacing Nimble, pure loss per class note 5) — favored terrain is a terrain-conditional, player-picked bonus that `ranger.ts`'s computeRanger only ever surfaces as a display list (DerivedRanger.favoredTerrains), never an applied Change, so there is no numeric hook for an archetype-extracted entry to plug into",
  },
  "gunslinger:commando:track:4": {
    archetypeId: "gunslinger:commando",
    name: "Track",
    level: 4,
    bucket: "situational",
    note: "real half-level bonus, but scoped to Survival checks specifically to follow tracks, not all Survival uses — a blanket skill.sur Change would over-apply to non-tracking Survival checks (foraging, weather, etc.)",
  },
  "gunslinger:commando:trapsmith:5": {
    archetypeId: "gunslinger:commando",
    name: "Trapsmith",
    level: 5,
    bucket: "subsystem",
    note: "grants a ranger-trap-crafting subsystem in place of the next Gun Training tier — trap mechanics aren't modeled, and the replaced Gun Training tier carries changes: [] (class note 3)",
  },

  // ── gunslinger:experimental-gunsmith ──
  "gunslinger:experimental-gunsmith:experimental-firearm:1": {
    archetypeId: "gunslinger:experimental-gunsmith",
    name: "Experimental Firearm",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear reflavor of Gunsmith plus a conditional Gunsmithing-feat treatment — no Change target",
  },
  "gunslinger:experimental-gunsmith:innovations:5": {
    archetypeId: "gunslinger:experimental-gunsmith",
    name: "Innovations",
    level: 5,
    bucket: "subsystem",
    note: "a weapon-modification choice-list (expanded capacity, expanded chamber, grapple launcher, recoilless, vial launcher) in place of Gun Training — each innovation is itself a mixed bag of niche weapon-property changes with no engine target, and the replaced Gun Training tier carries changes: [] (class note 3)",
  },

  // ── gunslinger:firebrand ──
  "gunslinger:firebrand:bombs:5": {
    archetypeId: "gunslinger:firebrand",
    name: "Bombs",
    level: 5,
    bucket: "subsystem",
    note: "grants the alchemist bombs class feature (Cha-based) in place of Gun Training — bomb mechanics are a distinct subsystem (alchemist-discoveries.ts territory, not wired to archetype-extracted), and the replaced Gun Training tier carries changes: [] (class note 3)",
  },
  "gunslinger:firebrand:gunsmith:1": {
    archetypeId: "gunslinger:firebrand",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear reflavor (dragon pistol) plus Gunsmithing bonus feat — no Change target",
  },
  "gunslinger:firebrand:scorched-earth:4": {
    archetypeId: "gunslinger:firebrand",
    name: "Scorched Earth",
    level: 4,
    bucket: "situational",
    note: "real, level-scaling fire-damage dice increase, but scoped to the first dragon's breath cartridge fired each round — a specific-ammunition, per-round condition",
  },
  "gunslinger:firebrand:wild-card:1": {
    archetypeId: "gunslinger:firebrand",
    name: "Wild Card",
    level: 1,
    bucket: "subsystem",
    note: "swaps grit's governing ability score from Wisdom to Charisma and adds bomb-hit as a grit-regain trigger — pool basis and regain triggers are both outside this pipeline's scope (class note 1)",
  },

  // ── gunslinger:graveslinger ──
  "gunslinger:graveslinger:deeds:1": {
    archetypeId: "gunslinger:graveslinger",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants four new deeds (Ghostbane Shot, Ectoplasmic Anchor, Undead Hunter, Staggering Shot), all conditional undead-targeting attack properties or enemy-effect DCs — deeds subsystem (class note 2)",
  },
  "gunslinger:graveslinger:supernatural-awareness:4": {
    archetypeId: "gunslinger:graveslinger",
    name: "Supernatural Awareness",
    level: 4,
    bucket: "subsystem",
    note: "grants Blind-Fight (a fixed named feat) plus a grit-gated surprise-round permission vs. haunts/incorporeal undead — neither is a flat number",
  },

  // ── gunslinger:gulch-gunner ──
  "gunslinger:gulch-gunner:belly-shot:9": {
    archetypeId: "gunslinger:gulch-gunner",
    name: "Belly Shot",
    level: 9,
    bucket: "situational",
    note: "real, level-scaling precision damage dice, but scoped to adjacent-target ranged firearm hits — a per-attack positioning condition, same posture as Bushwhacker's Sneak Shot",
  },
  "gunslinger:gulch-gunner:deeds:1": {
    archetypeId: "gunslinger:gulch-gunner",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps three deeds (Flash and Shock, Powder Burns, Staggering Shot) for grit-gated close-range AC/fire-damage/enemy-effect abilities — deeds subsystem (class note 2)",
  },

  // ── gunslinger:gun-scavenger ──
  "gunslinger:gun-scavenger:arbitrary-aim:2": {
    archetypeId: "gunslinger:gun-scavenger",
    name: "Arbitrary Aim",
    level: 2,
    bucket: "blocked",
    note: "real, level-scaling number, but it reduces an ENEMY's effective dodge/insight AC bonus when the gunslinger shoots at them — this engine's Change targets only ever modify the player character's own sheet, so there is no target that can express 'lower the target's AC component'; also replaces Nimble (pure loss, class note 5)",
  },
  "gunslinger:gun-scavenger:deeds:1": {
    archetypeId: "gunslinger:gun-scavenger",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants two new deeds (Change Out, Jury-Rig) that repair/reconfigure a firearm's properties or grant it temporary weapon enhancements — grit-gated equipment mechanics, deeds subsystem (class note 2)",
  },
  "gunslinger:gun-scavenger:go-by-feel:1": {
    archetypeId: "gunslinger:gun-scavenger",
    name: "Go By Feel",
    level: 1,
    bucket: "subsystem",
    note: "a drawback (misfire chance can never drop below a natural 1) — misfire isn't modeled at all in this engine, so there's no number to adjust either way",
  },

  // ── gunslinger:gun-tank ──
  "gunslinger:gun-tank:armor-training:4": {
    archetypeId: "gunslinger:gun-tank",
    name: "Armor Training",
    level: 4,
    bucket: "numeric",
    note: "a clean, unconditional -ACP/+max-Dex scaling grant while wearing armor, on the same 4-level cadence as the fighter ability it stacks with; claims to replace the Bonus Feats (GUN) progression but isn't structurally paired to it (class note 6) — that's a separate wiring gap, not a reason to withhold THIS feature's own mDexA/acpA number, since nothing else in this table claims that target",
  },
  "gunslinger:gun-tank:bonus-feat:20": {
    archetypeId: "gunslinger:gun-tank",
    name: "Bonus Feat",
    level: 20,
    bucket: "blocked",
    note: "restates 'a gunslinger gains a bonus feat in addition to those gained by normal advancement' at 20th level — the exact framing the base Bonus Feats (GUN) progression already uses for every one of its tiers, which already grants a feat at 20th (floor(20/4)=5) and, per class note 6, is NOT suppressed by this archetype (paired instead to True Grit). Ambiguous whether this is a genuine extra feat or a duplicate transcription of the base tier; extracting either a flat +1 or the base-matching count risks double-counting the L20 slot",
  },
  "gunslinger:gun-tank:bullet-defection:2": {
    archetypeId: "gunslinger:gun-tank",
    name: "Bullet Defection",
    level: 2,
    bucket: "situational",
    note: "real deflection bonus (half armor AC bonus + enhancement bonus), but scoped to non-siege firearm/splash-weapon attacks specifically while wearing medium/heavy armor, and its size depends on the specific armor's own dynamic AC value — no formula input for either the attack-type scoping or an individual item's stats; replaces Nimble (pure loss, class note 5)",
  },
  "gunslinger:gun-tank:deeds:1": {
    archetypeId: "gunslinger:gun-tank",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Gun Tank's Resolve, Gun Tank's Resilience) for grit-gated crit/sneak-attack-negation and Fortitude-save-negation abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:gun-tank:weapon-and-armor-proficiency:1": {
    archetypeId: "gunslinger:gun-tank",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "grants proficiency with all armors/shields including tower shields — proficiency grant, no Change target",
  },

  // ── gunslinger:gunner-squire ──
  "gunslinger:gunner-squire:deeds:1": {
    archetypeId: "gunslinger:gunner-squire",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Spotter, Side Arm) for grit-gated ally-targeting and reload-assistance abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:gunner-squire:safe-handling:2": {
    archetypeId: "gunslinger:gunner-squire",
    name: "Safe Handling",
    level: 2,
    bucket: "subsystem",
    note: "reduces a firearm's misfire chance by 1 on the next attack — misfire isn't modeled at all; replaces Nimble (structurally paired to the whole feature, pure loss per class note 5, despite the 'nimble +1' phrasing suggesting only a partial tier)",
  },

  // ── gunslinger:maverick ──
  "gunslinger:maverick:deeds:1": {
    archetypeId: "gunslinger:maverick",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants three new deeds (Stacked Deck, Fist Fighter, Gun Twirl) — a grit-spent reroll mechanic and two grit-gated feat-effect grants (Improved Unarmed Strike, Dazzling Display) — deeds subsystem (class note 2)",
  },

  // ── gunslinger:musket-master ──
  "gunslinger:musket-master:deeds:1": {
    archetypeId: "gunslinger:musket-master",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Steady Aim, Fast Musket) for grit-gated range-increment and reload-time abilities — deeds subsystem (class note 2), and range increment isn't a modeled target either way",
  },
  "gunslinger:musket-master:gunsmith:1": {
    archetypeId: "gunslinger:musket-master",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear restriction (must be a musket) plus Gunsmithing bonus feat — no Change target",
  },
  "gunslinger:musket-master:musket-training:5": {
    archetypeId: "gunslinger:musket-master",
    name: "Musket Training",
    level: 5,
    bucket: "blocked",
    note: "a real, level-scaling Dex-mod damage bonus, but to ALL two-handed firearms as a category (no player choice, unlike Gun Training) — WEAPON_GROUPS's single undifferentiated 'firearms' tag can't distinguish handedness, so a damage.weapon.firearms Change would over-apply to one-handed firearms too (class note 4)",
  },
  "gunslinger:musket-master:rapid-reloader:1": {
    archetypeId: "gunslinger:musket-master",
    name: "Rapid Reloader",
    level: 1,
    bucket: "subsystem",
    note: "grants a single named feat (Rapid Reload, muskets) — fixed feat grant, not the generic bonusFeats budget",
  },
  "gunslinger:musket-master:weapon-and-armor-proficiency:1": {
    archetypeId: "gunslinger:musket-master",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "narrows firearm proficiency to two-handed firearms only — proficiency restriction, no Change target",
  },

  // ── gunslinger:mysterious-stranger ──
  "gunslinger:mysterious-stranger:deeds:1": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Focused Aim, Clipping Shot) for grit-gated Cha-scaled damage and miss-mitigation abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:mysterious-stranger:grit:1": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Grit",
    level: 1,
    bucket: "subsystem",
    note: "swaps grit's governing ability score from Wisdom to Charisma — resource-pool sizing is never a Change target regardless of which ability drives it (class note 1)",
  },
  "gunslinger:mysterious-stranger:gun-training:9": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Gun Training",
    level: 9,
    bucket: "situational",
    note: "Gun Training's exact weapon-choice-scoped shape, delayed to a 9th/13th/17th cadence — still weapon-choice-scoped (class note 3)",
  },
  "gunslinger:mysterious-stranger:gunsmith:1": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear choice (blunderbuss/musket/pistol) plus Gunsmithing bonus feat — no Change target",
  },
  "gunslinger:mysterious-stranger:lucky:2": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Lucky",
    level: 2,
    bucket: "numeric",
    note: "a clean, unconditional scaling luck bonus to Will saves, replacing Nimble (pure loss of its dodge AC, class note 5) — no dropped conditions, single clear sentence",
  },
  "gunslinger:mysterious-stranger:stranger-s-fortune:5": {
    archetypeId: "gunslinger:mysterious-stranger",
    name: "Stranger's Fortune",
    level: 5,
    bucket: "subsystem",
    note: "lets the gunslinger ignore a misfire a limited number of times per day, in place of Gun Training 1 — misfire isn't modeled, and the replaced Gun Training tier carries changes: [] (class note 3)",
  },

  // ── gunslinger:pistolero ──
  "gunslinger:pistolero:deeds:1": {
    archetypeId: "gunslinger:pistolero",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps three deeds (Up Close and Deadly, Deadeye, Twin Shot Knockdown) for grit-gated precision-damage and prone-on-hit abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:pistolero:gunsmith:1": {
    archetypeId: "gunslinger:pistolero",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear restriction (must be a pistol) plus Gunsmithing bonus feat — no Change target",
  },
  "gunslinger:pistolero:pistol-training:5": {
    archetypeId: "gunslinger:pistolero",
    name: "Pistol Training",
    level: 5,
    bucket: "blocked",
    note: "a real, level-scaling Dex-mod damage bonus, but to ALL one-handed firearms as a category (no player choice, unlike Gun Training) — WEAPON_GROUPS's single undifferentiated 'firearms' tag can't distinguish handedness, so a damage.weapon.firearms Change would over-apply to two-handed firearms too (class note 4)",
  },
  "gunslinger:pistolero:weapon-and-armor-proficiency:1": {
    archetypeId: "gunslinger:pistolero",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "narrows firearm proficiency to one-handed firearms only — proficiency restriction, no Change target",
  },

  // ── gunslinger:planar-rifter ──
  "gunslinger:planar-rifter:deeds:1": {
    archetypeId: "gunslinger:planar-rifter",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants four new deeds (Infused Bullet, Planar Surge, Breaching Shot, Banishing Shot) — all grit-gated and tied to a swappable planar attunement — deeds subsystem (class note 2)",
  },
  "gunslinger:planar-rifter:gunsmith:1": {
    archetypeId: "gunslinger:planar-rifter",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear choice (blunderbuss/musket/pistol) plus Gunsmithing bonus feat — no Change target",
  },
  "gunslinger:planar-rifter:planar-resistance:2": {
    archetypeId: "gunslinger:planar-rifter",
    name: "Planar Resistance",
    level: 2,
    bucket: "situational",
    note: "a real, level-scaling (2/level) energy resistance or alignment-damage reduction, but the protected type is chosen daily and re-attunable via a swift action (Planar Surge, 7th) — too dynamic for a static eres.<type> Change with no build-time field tracking the current attunement; replaces Nimble (pure loss, class note 5)",
  },
  "gunslinger:planar-rifter:planar-strike:5": {
    archetypeId: "gunslinger:planar-rifter",
    name: "Planar Strike",
    level: 5,
    bucket: "situational",
    note: "real bonus damage dice (1d6, 2d6 at 13th) on weapon attacks, but gated on at least 1 grit point and typed to whatever the grit pool's current planar attunement is — resource- and attunement-scoped, not a flat modifier",
  },
  "gunslinger:planar-rifter:weapon-and-armor-proficiency:1": {
    archetypeId: "gunslinger:planar-rifter",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base gunslinger proficiency list verbatim — no Change",
  },

  // ── gunslinger:scatter-gunner ──
  "gunslinger:scatter-gunner:deeds:1": {
    archetypeId: "gunslinger:scatter-gunner",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants three new deeds (Careful Shot, Scatter Artist, Overload, Satchel Shot), all scoped to scattering-shot attacks and grit-gated — deeds subsystem (class note 2)",
  },
  "gunslinger:scatter-gunner:gunsmith:1": {
    archetypeId: "gunslinger:scatter-gunner",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "starting-gear restriction (blunderbuss or dragon pistol) plus Gunsmithing bonus feat — no Change target",
  },

  // ── gunslinger:siege-gunner ──
  "gunslinger:siege-gunner:bonus-feat:4": {
    archetypeId: "gunslinger:siege-gunner",
    name: "Bonus Feat",
    level: 4,
    bucket: "blocked",
    note: "grants two fixed named feats (Siege Engineer at 4th, Master Siege Engineer at 8th, no Change either way) plus a generic bonus-feat count from 12th onward (every 4 levels) — but per class note 6, this feature isn't structurally paired to suppress the base Bonus Feats (GUN) progression despite claiming to replace it, so extracting the 12th+ count would double-count against the still-active floor(@class.unlevel/4) baseline",
  },
  "gunslinger:siege-gunner:deeds:1": {
    archetypeId: "gunslinger:siege-gunner",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Targeted Blast, Scattershot) for grit-gated area-attack precision-damage and cone-size abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:siege-gunner:engineer-training:2": {
    archetypeId: "gunslinger:siege-gunner",
    name: "Engineer Training",
    level: 2,
    bucket: "numeric",
    note: "a clean, unconditional half-level bonus to Knowledge (engineering) checks (not scoped to a narrower use, unlike Commando's Track above), replacing Nimble (pure loss, class note 5)",
  },

  // ── gunslinger:techslinger ──
  "gunslinger:techslinger:bonus-feat:4": {
    archetypeId: "gunslinger:techslinger",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "restates the base Bonus Feats (GUN) progression's exact count/cadence, only adding Technologist to the eligible list — matches the already-vendored floor(@class.unlevel/4) baseline exactly, nothing new to extract",
  },
  "gunslinger:techslinger:deeds:1": {
    archetypeId: "gunslinger:techslinger",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps two deeds (Covet Charge, Reliable) and adds two more (Charge Recycling, Heavy Weaponry Deeds), all tied to technological-firearm charges — deeds subsystem (class note 2)",
  },
  "gunslinger:techslinger:technic-training:5": {
    archetypeId: "gunslinger:techslinger",
    name: "Technic Training",
    level: 5,
    bucket: "situational",
    note: "Gun Training's exact weapon-choice-scoped shape ported to advanced technology firearms — weapon-choice-scoped (class note 3)",
  },

  // ── gunslinger:thronewarden ──
  "gunslinger:thronewarden:deeds:1": {
    archetypeId: "gunslinger:thronewarden",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "grants two new deeds (Warning Shot, Opening Shot), both grit-gated surprise-round action-economy abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:thronewarden:eye-for-trouble:4": {
    archetypeId: "gunslinger:thronewarden",
    name: "Eye for Trouble",
    level: 4,
    bucket: "situational",
    note: "real bonus (1d6, rolled and revealed after the check), but a grit-spent, single-check reroll-style add on Perception or Sense Motive, not a flat modifier",
  },
  "gunslinger:thronewarden:hair-trigger-reflexes:2": {
    archetypeId: "gunslinger:thronewarden",
    name: "Hair-Trigger Reflexes",
    level: 2,
    bucket: "numeric",
    note: "the '+1 bonus on initiative checks... increases by 1 for every 4 gunslinger levels beyond 2nd' clause reads as a separate, unconditional sentence, distinct from the immediately preceding grit-gated surprise-round permission it's paired with in the same paragraph (contrast Blatherskite's Initiative above, which explicitly frames its whole paragraph as grit-conditional) — replaces Nimble (pure loss, class note 5)",
  },

  // ── gunslinger:wyrm-sniper ──
  "gunslinger:wyrm-sniper:deeds:1": {
    archetypeId: "gunslinger:wyrm-sniper",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps three deeds (Munitions Master, Skeleton Crew, Anti-Air Targeting) for grit-gated siege-engine-crewing and flight-disabling abilities — deeds subsystem (class note 2)",
  },
  "gunslinger:wyrm-sniper:heavy-gunner:5": {
    archetypeId: "gunslinger:wyrm-sniper",
    name: "Heavy Gunner",
    level: 5,
    bucket: "situational",
    note: "Gun Training's exact weapon-choice-scoped shape, letting the chosen 'type' be a light siege weapon instead of a firearm — still weapon-choice-scoped (class note 3)",
  },
  "gunslinger:wyrm-sniper:master-siege-engineer:12": {
    archetypeId: "gunslinger:wyrm-sniper",
    name: "Master Siege Engineer",
    level: 12,
    bucket: "subsystem",
    note: "grants a single named feat (Master Siege Engineer) as a bonus feat — fixed feat grant, not the generic bonusFeats budget",
  },
  "gunslinger:wyrm-sniper:siege-commander:4": {
    archetypeId: "gunslinger:wyrm-sniper",
    name: "Siege Commander",
    level: 4,
    bucket: "subsystem",
    note: "grants a single named feat (Siege Commander) as a bonus feat — fixed feat grant, not the generic bonusFeats budget",
  },
  "gunslinger:wyrm-sniper:weapon-and-armor-proficiency:1": {
    archetypeId: "gunslinger:wyrm-sniper",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base proficiency list and adds light siege engine proficiency — proficiency grant, no Change target",
  },
};

/**
 * ── GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────
 *
 * Machine-extracted mechanical effects for gunslinger archetype class
 * features (the prose->Change extraction pipeline, gunslinger slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 4 of gunslinger's 82
 * features cleared the `numeric` bar (see
 * `GUNSLINGER_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit).
 *
 * Confidence rubric (identical to magus.ts's/fighter.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose (an irregular schedule, a delayed onset), or a clause had to be
 *    read as separable from a neighboring resource-gated condition.
 *  - "low": not used in this pass.
 */
export const GUNSLINGER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Gun Tank's own "Armor Training" grants the same -ACP/+max-Dex shape as
  // the fighter (and base gunslinger archetype-wide) Armor Training family,
  // on a 4-level cadence starting at 4th (1 at 4th, capping at 4 by 16th).
  // The vendored text also claims to replace the Bonus Feats (GUN)
  // progression, but per this file's header note 6 that replacement isn't
  // structurally wired — a wiring gap that doesn't affect THIS Change, since
  // mDexA/acpA is an unclaimed target elsewhere in gunslinger's table.
  "gunslinger:gun-tank:armor-training:4": {
    changes: [
      c("clamp(1 + floor((@class.unlevel - 4) / 4), 0, 4)", "mDexA"),
      c("-clamp(1 + floor((@class.unlevel - 4) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, 1 + Math.floor((level - 4) / 4))} max Dex / -ACP (armor)`,
    confidence: "medium",
    provenance:
      "Whenever she is wearing armor, the armor check penalty is reduced by 1 (to a minimum " +
      "of 0) and the maximum Dexterity bonus allowed by her armor increases by 1. Every four " +
      "levels thereafter (8th, 12th, and 16th), the bonus increases by 1, to a maximum of a -4 " +
      "reduction of the armor check penalty and a +4 increase to the maximum Dexterity bonus " +
      "allowed.",
  },

  // Mysterious Stranger's "Lucky" (replacing Nimble) is a clean, unconditional
  // scaling luck bonus to Will saves — no dropped conditions, a single clear
  // sentence.
  "gunslinger:mysterious-stranger:lucky:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "will", "luck")],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} luck Will save`,
    confidence: "high",
    provenance:
      "Starting at 2nd level, a mysterious stranger gains a +1 luck bonus on Will saving " +
      "throws. This bonus increases by +1 for every four levels beyond 2nd level (to a maximum " +
      "of +5 at 20th level).",
  },

  // Siege Gunner's "Engineer Training" (replacing Nimble) is a flat,
  // unconditional half-level bonus to a single named Knowledge skill, with no
  // narrower "only while doing X" scoping (contrast Commando's Track above,
  // which IS scoped to a specific use of Survival).
  "gunslinger:siege-gunner:engineer-training:2": {
    changes: [c("floor(@class.unlevel / 2)", "skill.ken")],
    detail: (level) => `+${Math.floor(level / 2)} Knowledge (engineering)`,
    confidence: "high",
    provenance:
      "Starting at 2nd level, a siege gunner gains a bonus on Knowledge (engineering) checks " +
      "equal to 1/2 her gunslinger level.",
  },

  // Thronewarden's "Hair-Trigger Reflexes" (replacing Nimble) grants a flat,
  // scaling initiative bonus. The sentence "In addition, she gains a +1
  // bonus on initiative checks. This bonus increases by 1 for every 4
  // gunslinger levels beyond 2nd." is grammatically separate from the
  // immediately preceding grit-gated surprise-round permission — it doesn't
  // repeat or reference the "as long as she has at least 1 grit point"
  // condition the way Blatherskite's own Initiative reflavor explicitly
  // does for its whole paragraph, so it's read as unconditional here.
  "gunslinger:thronewarden:hair-trigger-reflexes:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "init")],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} initiative`,
    confidence: "medium",
    provenance:
      "In addition, she gains a +1 bonus on initiative checks. This bonus increases by 1 for " +
      "every 4 gunslinger levels beyond 2nd.",
  },
};
