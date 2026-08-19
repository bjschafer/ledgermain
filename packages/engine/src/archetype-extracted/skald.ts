/**
 * Skald's slice of the pipeline. Scope: all 26 vendored skald archetypes, 100
 * features (confirmed against the real vendored slice via `loadRefData()` —
 * `ref.archetypeFeatures` filtered to `skald:` ids is exactly 100, so unlike
 * some earlier waves this file's audit is the FULL set, not a partial one).
 * Every feature was read individually against its full prose. Per the
 * per-class file convention (`index.ts`'s doc comment), this file owns BOTH
 * of skald's pipeline artifacts.
 *
 * ── Skald-specific mechanical facts this pass relies on ───────────────────
 *
 * 1. **Raging Song** (base L1 feature) is skald's bardic-performance analog:
 *    an activated, rounds-per-day performance (`Raging Song`'s vendored
 *    `uses.maxFormula: "3 + @abilities.cha.mod + (floor(@class.unlevel - 1) *
 *    2)"`) whose Inspired Rage buff (Str/Con/Will morale bonuses, -1 AC) is
 *    ALREADY hand-authored outside this pipeline (`raging-song.ts`,
 *    `resources.ts`). Every skald archetype in this dataset restates the
 *    entire Raging Song ability text as its own `<archetype>:raging-song:1`
 *    row (sometimes with a sub-song swapped, sometimes byte-identical to the
 *    base with no archetype-specific edit at all — see Augur below). Because
 *    the restatement's own numbers (the Str/Con/Will progression) are already
 *    modeled elsewhere, and because the ability is activated + ally-facing
 *    regardless, every one of these restatement rows is `situational` —
 *    extracting from them would double-count the existing implementation.
 * 2. **Any feature that adds, restricts, or otherwise modifies a specific
 *    raging-song sub-performance** (a new "Song of X", a change to Inspired
 *    Rage's own bonuses, a rage-power grant tied to raging song, etc.) is
 *    `subsystem` — same posture as bard's bardic-performance rule
 *    (`bard.ts`'s rule 1). All five base raging-song performance types
 *    (Inspired Rage, Song of Marching, Song of Strength, Dirge of Doom, Song
 *    of the Fallen) carry a hand-authored toggle on the Raging Song pool's
 *    `tableOptions` (`raging-song.ts`), but that mechanism covers only those
 *    five: an archetype feature that grants a genuinely new sub-song, or
 *    otherwise modifies one of the five, still has no buff of its own to
 *    hang a Change on in THIS table. A sibling mechanism
 *    (`raging-song-variants.ts`) now hand-authors that swap for ten
 *    archetypes whose raging song replaces or adds a sub-song (bacchanal,
 *    battle-scion, boaster, court-poet, dragon-skald, instigator,
 *    spell-warrior, twilight-speaker, undying-word, wyrm-singer) as a
 *    level-gated toggle on the same Raging Song pool, some with real
 *    `Change`s — flagged per entry below. The `subsystem`/`situational`
 *    bucket here still holds regardless, since it tracks this
 *    prose-to-`Change` extraction table specifically, not that toggle
 *    system.
 * 3. **Rage Powers** (`rage-power:6` and its 3-level cadence) are a modeled
 *    pick-list shared with barbarian (`rage-powers.ts`) — any feature that
 *    grants, restricts, or swaps a rage power (including "totem" rage-power
 *    sub-groups) is `subsystem`.
 * 4. **Versatile Performance** (base skald ability, `Versatile Performance
 *    (SKA)`, id `KQeYLQvYh1QgS0XI`) carries zero vendored `changes` — a
 *    Perform-substitution choice-list, same shape as bard's. Any archetype
 *    feature touching it is `subsystem`; no double-count risk either way
 *    since there's nothing numeric to double-count.
 * 5. **Skald's knowledge-adjacent base feature is actually named "Well-
 *    Versed"** (a save bonus vs. bardic-performance/sonic/language-dependent
 *    effects), not "Bardic Knowledge" — skald never gets Bardic Knowledge at
 *    all. `Well-Versed` (id `wew6ophJrcab24m6`) carries zero vendored
 *    `changes`. Several archetype features' prose nonetheless says "replaces
 *    bardic knowledge" (reusing bard boilerplate — a vendored copy-paste
 *    artifact) while others correctly say "replaces well-versed"; flagged
 *    per-entry below. No double-count risk regardless, since the real base
 *    ability carries no numbers either way.
 * 6. **Spell Kenning** (skald's unique cast-any-spell-from-the-list-by-
 *    burning-a-higher-level-slot ability) is a spell-list subsystem, not
 *    modeled here. Any feature that alters its mechanics (which spells
 *    qualify, how many daily uses, what level slot is spent) is `subsystem`.
 * 7. **`Lore Master (SKA)`** (id `ptw7bHU3Z7HNj2qz`) carries a resource
 *    `uses.maxFormula` but zero `changes`, and **`Damage Reduction (SKA)`**
 *    (id `kMjMAG6Gjs7unAz5`) carries neither `changes` nor `uses` — skald's
 *    base DR progression isn't modeled by this engine at all today. Neither
 *    fact changes any bucket below (nothing here restates a DR or Lore
 *    Master number to double-count), but it's why Elegist's own "Somber
 *    Damage Reduction" (which states no number of its own, just extends the
 *    unmodeled base DR to a summoned phantom) has nothing to extract.
 * 8. **`@shield.type`** (0 none, else the worn shield's armor-type tier — see
 *    `rolldata.ts`) is a real, checkable roll-data field alongside
 *    `@armor.type`/`@attributes.encumbrance.level`. Several skald archetype
 *    features gate a bonus on "unarmored and unencumbered" and ALSO "no
 *    shield" — all three conditions are checkable and none are dropped here
 *    (an explicit corrective lesson for this wave: earlier waves sometimes
 *    demoted a fully-checkable multi-condition bonus to `situational`).
 *
 * Two vendored-data oddities surfaced (reported, not fixed, per the task's
 * "report suspects, don't fix" instruction):
 *  - `skald:augur:raging-song:1` is Augur's ONLY listed feature, and its text
 *    is byte-identical to the base Raging Song ability with no augur-specific
 *    edit at all — reads like an incomplete vendoring of this archetype
 *    (Augur presumably has other published abilities not captured here).
 *  - Several archetypes' prose says a feature "replaces bardic knowledge"
 *    (Battle Scion's Courtly Presence, Belkzen War Drummer's Fearsome Mien,
 *    Dragon Skald's Sea Legs) even though skald has no Bardic Knowledge
 *    ability at all (see fact 5) — most likely reused bard boilerplate in
 *    the source text, since other skald archetypes correctly say "replaces
 *    well-versed" for the same kind of feature.
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a literal or near-literal translation of a single, clearly-
 *    worded, fully general (no scope restriction) bonus.
 *  - "medium": composed from two or more facts (stacking several Change
 *    entries from one paragraph), or a mild reading is required.
 *  - "low": not used in this pass.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SKALD_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── skald:augur ──
  "skald:augur:raging-song:1": {
    archetypeId: "skald:augur",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); byte-identical to the base Raging Song text with no augur-specific edit at all — likely an incomplete vendoring of this archetype (flagged in file header), but nothing to extract regardless since the Inspired Rage numbers are already modeled elsewhere",
  },

  // ── skald:bacchanal ──
  "skald:bacchanal:drunken-dancer:2": {
    archetypeId: "skald:bacchanal",
    name: "Drunken Dancer",
    level: 2,
    bucket: "subsystem",
    note: "lets the bacchanal consume alcohol/goodberry during raging song to sustain it or gain scaling buffs (cure light wounds -> heroism -> persistent vigor by level) instead of expending a round — modifies raging song's action economy (class note 2), and references the internal fortitude rage power",
  },
  "skald:bacchanal:fermented-fruit:1": {
    archetypeId: "skald:bacchanal",
    name: "Fermented Fruit",
    level: 1,
    bucket: "subsystem",
    note: "goodberry, wired via the spell-like-abilities route; the spell-list addition and the fermented-berry rider (1 hp cure, +1 vs. fear) aren't modeled",
  },
  "skald:bacchanal:raging-song:1": {
    archetypeId: "skald:bacchanal",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Song of Urging in place of song of marching and Maddening Dance in place of dirge of doom, both now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts) — nothing to extract here regardless, neither carries a Change-shaped number of its own",
  },

  // ── skald:battle-scion ──
  "skald:battle-scion:battle-prowess:3": {
    archetypeId: "skald:battle-scion",
    name: "Battle Prowess",
    level: 3,
    bucket: "subsystem",
    note: "lets the battle scion choose a combat/teamwork feat instead of a rage power, and grant it to raging allies — rage-power-slot substitution (class note 3), no flat number",
  },
  "skald:battle-scion:courtly-presence:1": {
    archetypeId: "skald:battle-scion",
    name: "Courtly Presence",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 character level to Intimidate checks (uses 'character level', not skald level — see extracted formula using @attributes.hd.total, cavalier.ts's Spellscar Drifter precedent); the verbal-duel-edge grant (Ultimate Intrigue subsystem) and the 'bardic knowledge applies to only...' restriction (skald has no Bardic Knowledge at all — vendored-data artifact, see file header) are dropped, neither has a Change target or a real base ability to restrict",
  },
  "skald:battle-scion:once-and-future-scion:20": {
    archetypeId: "skald:battle-scion",
    name: "Once and Future Scion",
    level: 20,
    bucket: "subsystem",
    note: "an absolute death/revival effect (returns via raise dead after a 3-day deathlike sleep) — not a modifier, no Change target; paired to Master Skald (itself changes: [])",
  },
  "skald:battle-scion:raging-song:1": {
    archetypeId: "skald:battle-scion",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Song of Questing (a geas/quest-like binding) in place of both the 10th-level dirge of doom and 14th-level song of the fallen slots, now modeled as a level-gated toggle on the Raging Song pool (raging-song-variants.ts) — nothing to extract here regardless, no Change-shaped number",
  },

  // ── skald:bekyar-demon-dancer ──
  "skald:bekyar-demon-dancer:abyssal-wrath:6": {
    archetypeId: "skald:bekyar-demon-dancer",
    name: "Abyssal Wrath",
    level: 6,
    bucket: "subsystem",
    note: "grants the fiend totem and greater fiend totem rage powers, ignoring prerequisites — rage-power grant (class note 3); paired to Song of Strength for bookkeeping only",
  },
  "skald:bekyar-demon-dancer:demonic-conquest:7": {
    archetypeId: "skald:bekyar-demon-dancer",
    name: "Demonic Conquest",
    level: 7,
    bucket: "subsystem",
    note: "modifies inspired rage with a Will-save-triggered forced-attack/branding effect on raging allies — modifies raging song (class note 2), no flat number",
  },
  "skald:bekyar-demon-dancer:fiendish-maw:3": {
    archetypeId: "skald:bekyar-demon-dancer",
    name: "Fiendish Maw",
    level: 3,
    bucket: "subsystem",
    note: "grants raging allies a scaling bite attack, replacing the 3rd-level rage power — natural-attack damage isn't an applied target (ndamage, targets.ts unapplied list) and it's ally-facing/raging-song-conditioned regardless (class note 2)",
  },
  "skald:bekyar-demon-dancer:raging-song:1": {
    archetypeId: "skald:bekyar-demon-dancer",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); no sub-song swap at this level — nothing to extract regardless",
  },
  "skald:bekyar-demon-dancer:versatile-performance:2": {
    archetypeId: "skald:bekyar-demon-dancer",
    name: "Versatile Performance",
    level: 2,
    bucket: "subsystem",
    note: "restricts the versatile performance substitution to Perform (dance) -> Acrobatics/Fly — Perform-substitution choice-list (class note 4), base ability carries zero vendored changes so no double-count risk regardless",
  },

  // ── skald:belkzen-war-drummer ──
  "skald:belkzen-war-drummer:deadly-rhythm:1": {
    archetypeId: "skald:belkzen-war-drummer",
    name: "Deadly Rhythm",
    level: 1,
    bucket: "situational",
    note: "a real, scaling damage bonus (+1 at 3rd, +1 every 4 levels to +5 at 19th) but scoped only to clubs and greatclubs specifically — the vendored weapon-group tag that contains both ('hammers') also contains ordinary hammers/warhammers, so damage.weapon.hammers would over-apply beyond the two named weapons; the free-action-draw-during-raging-song clause and the 6th-level Improved Critical bonus feat are also dropped (activated/named-feat, no Change shape)",
  },
  "skald:belkzen-war-drummer:fearsome-mien:1": {
    archetypeId: "skald:belkzen-war-drummer",
    name: "Fearsome Mien",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 class level (minimum 1) to Intimidate and Bluff; text says 'replaces bardic knowledge' but skald's real ability there is Well-Versed (no vendored changes, see file header) — no double-count risk either way",
  },
  "skald:belkzen-war-drummer:raging-song:1": {
    archetypeId: "skald:belkzen-war-drummer",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Siege Drums (a shatter-like ability) replacing the 7th-level versatile performance benefit — nothing to extract regardless",
  },
  "skald:belkzen-war-drummer:weapon-and-armor-proficiency:1": {
    archetypeId: "skald:belkzen-war-drummer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant plus the standard skald arcane-spell-failure exemption text — no Change target",
  },
  "skald:belkzen-war-drummer:weapon-master:7": {
    archetypeId: "skald:belkzen-war-drummer",
    name: "Weapon Master",
    level: 7,
    bucket: "subsystem",
    note: "grants Craft Magic Arms and Armor as a named bonus feat (not a bonusFeats count) — feat grant, no Change target; paired to Lore Master (uses.maxFormula only, no changes) for bookkeeping",
  },

  // ── skald:boaster ──
  "skald:boaster:greater-endurance:6": {
    archetypeId: "skald:boaster",
    name: "Greater Endurance",
    level: 6,
    bucket: "subsystem",
    note: "grants a bonus feat restricted to an Endurance-prerequisite list (Diehard, Fast Healer, ...) — a named/restricted feat grant, not a bonusFeats count; paired to Song of Strength only for archetype-swap bookkeeping, unrelated to raging song itself",
  },
  "skald:boaster:raging-song:1": {
    archetypeId: "skald:boaster",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Song of Endurance and Song of Surmounting (scaling terrain-movement bonus) alongside the base songs, and Frightful Boast in place of song of the fallen, all three now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts) — nothing to extract here regardless, none carry a Change-shaped number",
  },

  // ── skald:bold-schemer ──
  "skald:bold-schemer:bold-strategy:10": {
    archetypeId: "skald:bold-schemer",
    name: "Bold Strategy",
    level: 10,
    bucket: "subsystem",
    note: "shares half of the (itself situational, location-scoped) Skald of Twists and Turns bonus with allies — ally-facing, derived from an unmodeled source value, no independent formula of its own; paired to Dirge of Doom for bookkeeping",
  },
  "skald:bold-schemer:raging-song:1": {
    archetypeId: "skald:bold-schemer",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); no sub-song swap at this level — nothing to extract regardless",
  },
  "skald:bold-schemer:skald-of-twists-and-turns:4": {
    archetypeId: "skald:bold-schemer",
    name: "Skald of Twists and Turns",
    level: 4,
    bucket: "situational",
    note: "a real, scaling insight bonus (+2 at 4th, +2 every 4 levels to +10 at 20th) on five skills, but only after an 8-hour observation ritual and only while physically in that same observed location — a location-bound state the engine can't check; paired to Uncanny Dodge for bookkeeping",
  },

  // ── skald:court-poet ──
  "skald:court-poet:handling-the-crowd:2": {
    archetypeId: "skald:court-poet",
    name: "Handling the Crowd",
    level: 2,
    bucket: "situational",
    note: "a real +1 AC/Perform bonus but conditioned on being adjacent to 2+ creatures (not checkable), plus a Diplomacy bonus scoped to 'influence crowds' specifically rather than Diplomacy checks generally",
  },
  "skald:court-poet:raging-song:1": {
    archetypeId: "skald:court-poet",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Insightful Contemplation (Int/Cha morale bonus) in place of Inspired Rage and Song of Inspiration (Wisdom-skill version of Song of Strength) in place of Song of Strength, both now modeled as level-gated toggles with real Changes on the Raging Song pool (raging-song-variants.ts) — nothing to extract here in this table regardless, that modeling lives in the toggle system, not the Change-extraction table",
  },

  // ── skald:dragon-skald ──
  "skald:dragon-skald:fearless-raider:2": {
    archetypeId: "skald:dragon-skald",
    name: "Fearless Raider",
    level: 2,
    bucket: "numeric",
    note: "unconditional +4 save vs. fear effects (Change.saveCategories); the 'DCs to affect the dragon skald with Intimidate increase by 4' clause is a defender-side DC modifier for someone ELSE's check, not a target this character's own Change can express — dropped. Replaces well-versed (no vendored changes)",
  },
  "skald:dragon-skald:raging-song:1": {
    archetypeId: "skald:dragon-skald",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Glorious Epic (a Diplomacy/Intimidate circumstance-bonus grant) in place of song of marching, now modeled as a level-gated toggle on the Raging Song pool (raging-song-variants.ts) — nothing to extract here regardless, no Change-shaped number of its own",
  },
  "skald:dragon-skald:sea-legs:1": {
    archetypeId: "skald:dragon-skald",
    name: "Sea Legs",
    level: 1,
    bucket: "numeric",
    note: "mixed feature: the Swim clause and the Profession (sailor) clause are both unconditional and extracted (Profession (sailor) is a fixed instance, using the established skill.pro.<slug> convention); Survival-at-sea and Acrobatics/Climb-aboard-a-boat are location-conditional and dropped. Text says 'replaces bardic knowledge' but skald's real ability there is Well-Versed (no vendored changes, see file header)",
  },
  "skald:dragon-skald:wind-whistler:1": {
    archetypeId: "skald:dragon-skald",
    name: "Wind Whistler",
    level: 1,
    bucket: "subsystem",
    note: "adds three spells to the class spell list — spell-list addition, replaces Scribe Scroll (a bonus feat, no vendored changes either way)",
  },

  // ── skald:elegist ──
  "skald:elegist:master-elegist:20": {
    archetypeId: "skald:elegist",
    name: "Master Elegist",
    level: 20,
    bucket: "subsystem",
    note: "lets the melancholic apparition be re-manifested as a swift action with no expenditure — modifies an already-subsystem ally/summon ability, no flat number; paired to Master Skald",
  },
  "skald:elegist:melancholic-apparition:1": {
    archetypeId: "skald:elegist",
    name: "Melancholic Apparition",
    level: 1,
    bucket: "subsystem",
    note: "summons a spiritualist-style phantom companion, activated via raging-song-style rounds/day — companion/subsystem mechanic (replaces nothing this engine models), no flat number on the skald's own sheet",
  },
  "skald:elegist:somber-damage-reduction:9": {
    archetypeId: "skald:elegist",
    name: "Somber Damage Reduction",
    level: 9,
    bucket: "subsystem",
    note: "states no number of its own — it only extends the (unmodeled, see file header fact 7) base skald Damage Reduction to the melancholic apparition when manifested; nothing to extract",
  },
  "skald:elegist:steady-hearted:2": {
    archetypeId: "skald:elegist",
    name: "Steady Hearted",
    level: 2,
    bucket: "numeric",
    note: "unconditional +4 save vs. emotion effects (Change.saveCategories) — single clean sentence",
  },

  // ── skald:fated-champion ──
  "skald:fated-champion:far-seer:5": {
    archetypeId: "skald:fated-champion",
    name: "Far Seer",
    level: 5,
    bucket: "subsystem",
    note: "reweights spell-level cost for divination vs. damage spells cast via spell kenning — spell-kenning subsystem (class note 6), no flat number",
  },
  "skald:fated-champion:not-this-day:20": {
    archetypeId: "skald:fated-champion",
    name: "Not This Day",
    level: 20,
    bucket: "subsystem",
    note: "an activated, raging-song-rounds-spent reroll (saving throw or forced enemy reroll) — a discrete triggered ability, not a persistent modifier; paired to Master Skald",
  },
  "skald:fated-champion:raging-song:1": {
    archetypeId: "skald:fated-champion",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); no sub-song swap at this level — nothing to extract regardless",
  },
  "skald:fated-champion:shield-of-foresight:10": {
    archetypeId: "skald:fated-champion",
    name: "Shield of Foresight",
    level: 10,
    bucket: "subsystem",
    note: "grants fear immunity while performing plus a +5 ally save bonus vs. fear, replacing dirge of doom — modifies raging song (class note 2)",
  },
  "skald:fated-champion:watcher-of-the-weave:2": {
    archetypeId: "skald:fated-champion",
    name: "Watcher of the Weave",
    level: 2,
    bucket: "numeric",
    note: "unconditional insight bonus on initiative equal to 1/2 skald level — single clean sentence. Replaces well-versed (no vendored changes)",
  },

  // ── skald:herald-of-the-horn ──
  "skald:herald-of-the-horn:arcane-bond:1": {
    archetypeId: "skald:herald-of-the-horn",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonded horn (sorcerer-bloodline-style object bond) — unrelated subsystem, replaces Scribe Scroll",
  },
  "skald:herald-of-the-horn:crumbling-blast:11": {
    archetypeId: "skald:herald-of-the-horn",
    name: "Crumbling Blast",
    level: 11,
    bucket: "subsystem",
    note: "a limited-use horn-of-blasting-style attack ability with its own save DC — activated, no baseline modifier; replaces spell kenning's 2nd/3rd daily uses (class note 6)",
  },
  "skald:herald-of-the-horn:horn-call:7": {
    archetypeId: "skald:herald-of-the-horn",
    name: "Horn Call",
    level: 7,
    bucket: "blocked",
    note: "spellDC exists but has no descriptor axis, and this scaling +1/+1/+1 DC increase only applies to sonic-descriptor spells cast using the bonded horn specifically — a descriptor-plus-item condition no target expresses. Paired to Lore Master for bookkeeping",
  },
  "skald:herald-of-the-horn:raging-song:1": {
    archetypeId: "skald:herald-of-the-horn",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); no sub-song swap at this level — nothing to extract regardless",
  },
  "skald:herald-of-the-horn:rousing-retort:5": {
    archetypeId: "skald:herald-of-the-horn",
    name: "Rousing Retort",
    level: 5,
    bucket: "subsystem",
    note: "an activated, raging-song-rounds-spent grant of a fresh save (with a +2) against an ongoing enchantment/fear effect — a discrete triggered grant, not a persistent modifier; replaces spell kenning's 1st daily use",
  },

  // ── skald:hunt-caller ──
  "skald:hunt-caller:call-of-the-wild:6": {
    archetypeId: "skald:hunt-caller",
    name: "Call of the Wild",
    level: 6,
    bucket: "subsystem",
    note: "a raging-song variant that polymorphs the skald and allies into animal shapes — modifies raging song (class note 2); paired to Song of Strength",
  },
  "skald:hunt-caller:inspire-scent:6": {
    archetypeId: "skald:hunt-caller",
    name: "Inspire Scent",
    level: 6,
    bucket: "subsystem",
    note: "grants the scent rage power to the skald and, via raging song, to allies — rage-power grant (class note 3); paired to Song of Strength",
  },
  "skald:hunt-caller:raging-song:1": {
    archetypeId: "skald:hunt-caller",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Song of the Senses in place of well-versed and Call of the Wild in place of song of strength/song of the fallen — nothing to extract regardless",
  },
  "skald:hunt-caller:song-of-the-senses:2": {
    archetypeId: "skald:hunt-caller",
    name: "Song of the Senses",
    level: 2,
    bucket: "subsystem",
    note: "a raging-song variant granting low-light vision and a Perception/Survival bonus to allies for an hour — modifies raging song (class note 2), replaces well-versed",
  },
  "skald:hunt-caller:wilderness-magic:5": {
    archetypeId: "skald:hunt-caller",
    name: "Wilderness Magic",
    level: 5,
    bucket: "subsystem",
    note: "adds druid spells to the class spell list at 5th/11th/17th — spell-list addition, no Change-shaped number",
  },

  // ── skald:instigator ──
  "skald:instigator:raging-song:1": {
    archetypeId: "skald:instigator",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Song of Rabble-Rousing (enthrall) alongside the base songs and Song of Riot (a foster-hatred-like compulsion) in place of dirge of doom, both now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts) — nothing to extract here regardless; song of the fallen itself is an unmodified restatement",
  },
  "skald:instigator:revolutionary-heart:7": {
    archetypeId: "skald:instigator",
    name: "Revolutionary Heart",
    level: 7,
    bucket: "subsystem",
    note: "a limited-use daily reroll vs. compulsion effects — resource-gated activated ability, no persistent modifier; paired to Lore Master",
  },

  // ── skald:red-tongue ──
  "skald:red-tongue:duplicitous-rhetoric:7": {
    archetypeId: "skald:red-tongue",
    name: "Duplicitous Rhetoric",
    level: 7,
    bucket: "subsystem",
    note: "grants a chosen rogue talent to raging allies — rogue-talent pick-list plus raging-song modification (class notes 2/3 both apply); paired to Lore Master",
  },
  "skald:red-tongue:great-orator:2": {
    archetypeId: "skald:red-tongue",
    name: "Great Orator",
    level: 2,
    bucket: "subsystem",
    note: "restricts raging song activation to Perform (oratory) and forces that versatile-performance pick — restriction, no Change-shaped number",
  },
  "skald:red-tongue:rile:1": {
    archetypeId: "skald:red-tongue",
    name: "Rile",
    level: 1,
    bucket: "situational",
    note: "a real +1/2 level bonus, but scoped to specific USES of the skills (Bluff 'to deceive or conceal motives', Intimidate 'to improve a creature's attitude' — the attitude-change use, not the demoralize-in-combat use) rather than the skills wholesale; the engine's skill target has no per-use granularity, so applying it would over-apply to demoralize checks too",
  },
  "skald:red-tongue:rogue-talent:7": {
    archetypeId: "skald:red-tongue",
    name: "Rogue Talent",
    level: 7,
    bucket: "subsystem",
    note: "grants the red tongue his own rogue talent, treating skald level as rogue level, every 5 levels — rogue-talent pick-list, deferred subsystem; paired to Lore Master",
  },
  "skald:red-tongue:seed-of-discord:1": {
    archetypeId: "skald:red-tongue",
    name: "Seed of Discord",
    level: 1,
    bucket: "subsystem",
    note: "wired via the casting-economy tables (a fixed schedule of bonus spells known as he reaches the level to cast each)",
  },

  // ── skald:serpent-herald ──
  "skald:serpent-herald:serpent-shape:5": {
    archetypeId: "skald:serpent-herald",
    name: "Serpent Shape",
    level: 5,
    bucket: "subsystem",
    note: "a limited-use, druid-style self wild shape into reptile/aquatic forms — discrete activated SLA, no baseline modifier",
  },
  "skald:serpent-herald:serpentine-rage:3": {
    archetypeId: "skald:serpent-herald",
    name: "Serpentine Rage",
    level: 3,
    bucket: "subsystem",
    note: "grants raging allies a chosen serpentine aspect (natural armor, senses, a bite attack, or a movement bonus) — modifies raging song's ally effects (class note 2), and requires inspired rage specifically",
  },

  // ── skald:spell-warrior ──
  "skald:spell-warrior:greater-counterspell:5": {
    archetypeId: "skald:spell-warrior",
    name: "Greater Counterspell",
    level: 5,
    bucket: "subsystem",
    note: "modifies counterspelling mechanics and, at 17th, grants Parry Spell as a named bonus feat without its prerequisites — counterspell subsystem plus a feat grant, no Change target",
  },
  "skald:spell-warrior:improved-counterspell:1": {
    archetypeId: "skald:spell-warrior",
    name: "Improved Counterspell",
    level: 1,
    bucket: "subsystem",
    note: "grants Improved Counterspell as a named bonus feat, replacing Scribe Scroll — feat grant, no Change target",
  },
  "skald:spell-warrior:raging-song:1": {
    archetypeId: "skald:spell-warrior",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Enhance Weapons (a scaling weapon-enhancement grant to allies) in place of inspired rage and Song of Arcane Manipulation in place of dirge of doom, both now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts, note-tier: no Change entries) — nothing to extract here regardless (the Enhance Weapons numbers are ally-equipment-facing, not the skald's own stat block, and activated/resource-gated either way)",
  },
  "skald:spell-warrior:spell-tamper:20": {
    archetypeId: "skald:spell-warrior",
    name: "Spell Tamper",
    level: 20,
    bucket: "subsystem",
    note: "deals backlash damage to a target on a successful counterspell — an attack-style triggered effect, not a persistent modifier; paired to Master Skald",
  },
  "skald:spell-warrior:weapon-song:1": {
    archetypeId: "skald:spell-warrior",
    name: "Weapon Song",
    level: 1,
    bucket: "subsystem",
    note: "a one-sentence stub introducing the Enhance Weapons raging song detailed in the sibling raging-song:1 entry (now modeled there as a toggle, raging-song-variants.ts) — modifies raging song (class note 2), nothing of its own to extract",
  },

  // ── skald:sunsinger ──
  "skald:sunsinger:channel-solar-energy:5": {
    archetypeId: "skald:sunsinger",
    name: "Channel Solar Energy",
    level: 5,
    bucket: "subsystem",
    note: "a limited-use-per-day channel-energy-as-cleric ability with an undead save penalty — resource-gated activated ability, no persistent modifier",
  },
  "skald:sunsinger:pillar-of-light:3": {
    archetypeId: "skald:sunsinger",
    name: "Pillar of Light",
    level: 3,
    bucket: "subsystem",
    note: "makes raging song function as the fascinate bardic performance while casting a light effect — modifies raging song (class note 2)",
  },
  "skald:sunsinger:raging-song:1": {
    archetypeId: "skald:sunsinger",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); no sub-song swap at this level — nothing to extract regardless",
  },

  // ── skald:totem-channeler ──
  "skald:totem-channeler:tandem-totems:5": {
    archetypeId: "skald:totem-channeler",
    name: "Tandem Totems",
    level: 5,
    bucket: "subsystem",
    note: "lets multiple totem rage-power groups be active at once, at an extra raging-song-round cost per group — rage-power/raging-song modification (class notes 2/3)",
  },
  "skald:totem-channeler:totem-s-guidance:9": {
    archetypeId: "skald:totem-channeler",
    name: "Totem's Guidance",
    level: 9,
    bucket: "subsystem",
    note: "grants the skald and raging allies a +1 (then +2 at 14th) insight bonus to AC/saves while a totem rage power is active — conditioned on the rage-power/raging-song state (class notes 2/3); paired to Damage Reduction (SKA) for bookkeeping",
  },
  "skald:totem-channeler:totemic-versatility:1": {
    archetypeId: "skald:totem-channeler",
    name: "Totemic Versatility",
    level: 1,
    bucket: "subsystem",
    note: "lets totem rage powers be drawn from more than one totem group — rage-power pick-list flexibility (class note 3), no number",
  },

  // ── skald:totemic-skald ──
  "skald:totemic-skald:rage-power:6": {
    archetypeId: "skald:totemic-skald",
    name: "Rage Power",
    level: 6,
    bucket: "subsystem",
    note: "the totemic skald's own rage-power-every-3-levels progression, shareable with raging allies — rage-power pick-list (class note 3); paired to Song of Strength",
  },
  "skald:totemic-skald:totem-empathy:4": {
    archetypeId: "skald:totemic-skald",
    name: "Totem Empathy",
    level: 4,
    bucket: "subsystem",
    note: "a Diplomacy-style check to improve an animal's attitude plus a limited-use charm animal SLA — unrelated ability, no flat number; paired to Uncanny Dodge for bookkeeping",
  },
  "skald:totemic-skald:totem:3": {
    archetypeId: "skald:totemic-skald",
    name: "Totem",
    level: 3,
    bucket: "subsystem",
    note: "grants the 'Song of the Beast' rage power, sharing the hunter animal-focus abilities of a chosen totem with raging allies — rage-power grant (class note 3)",
  },
  "skald:totemic-skald:wild-shape:5": {
    archetypeId: "skald:totemic-skald",
    name: "Wild Shape",
    level: 5,
    bucket: "subsystem",
    note: "a limited-use, druid-style self wild shape into the chosen totem animal — discrete activated ability, no baseline modifier; replaces spell kenning (class note 6)",
  },

  // ── skald:twilight-speaker ──
  "skald:twilight-speaker:community-domain:2": {
    archetypeId: "skald:twilight-speaker",
    name: "Community Domain",
    level: 2,
    bucket: "subsystem",
    note: "grants a cleric domain's powers and spells (Cha in place of Wis) — domain-power subsystem, no Change-shaped number stated in this feature's own text",
  },
  "skald:twilight-speaker:devout:1": {
    archetypeId: "skald:twilight-speaker",
    name: "Devout",
    level: 1,
    bucket: "subsystem",
    note: "a deity/alignment restriction gate on other twilight-speaker abilities — no number",
  },
  "skald:twilight-speaker:findeladlara-s-blessing:7": {
    archetypeId: "skald:twilight-speaker",
    name: "Findeladlara's Blessing",
    level: 7,
    bucket: "subsystem",
    note: "a limited-use-per-day UMD-bypass ability (activate any spell trigger/completion item as a skald spell) — resource-gated activated ability; paired to Lore Master",
  },
  "skald:twilight-speaker:findeladlara-s-hand:20": {
    archetypeId: "skald:twilight-speaker",
    name: "Findeladlara's Hand",
    level: 20,
    bucket: "subsystem",
    note: "makes Findeladlara's Blessing usable at will — modifies an already-subsystem ability; paired to Master Skald",
  },
  "skald:twilight-speaker:raging-song:1": {
    archetypeId: "skald:twilight-speaker",
    name: "Raging Song",
    level: 1,
    bucket: "situational",
    note: "activated, ally-facing performance (class note 1); embeds Inspired Devotion (attack/save bonus) in place of inspired rage, Song of Understanding in place of song of strength, and Song of Secrecy (Stealth bonus) in place of dirge of doom, all now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts) — nothing to extract here in this table regardless, that modeling lives in the toggle system with its own Changes for Inspired Devotion and Song of Secrecy",
  },
  "skald:twilight-speaker:twilight-envoy:1": {
    archetypeId: "skald:twilight-speaker",
    name: "Twilight Envoy",
    level: 1,
    bucket: "numeric",
    note: "unconditional +1/2 skald level on Bluff, Diplomacy, and Sense Motive — single clean sentence, purely additive (no replaces-clause)",
  },

  // ── skald:undying-word ──
  "skald:undying-word:bonus-feat:1": {
    archetypeId: "skald:undying-word",
    name: "Bonus Feat",
    level: 1,
    bucket: "numeric",
    note: "flat bonus-feat count (1st level, then every 6 levels), unpaired — skald has no baseline bonus-feat progression of its own, so this is a pure additive grant (same posture as magus Iron-Ring Striker's Bonus Feat). The Endurance-family prerequisite restriction isn't modeled, only the count",
  },
  "skald:undying-word:endurance-power:5": {
    archetypeId: "skald:undying-word",
    name: "Endurance Power",
    level: 5,
    bucket: "subsystem",
    note: "grants an additional rage power from a fixed defensive list, shareable with raging allies — rage-power grant (class note 3)",
  },
  "skald:undying-word:undying-song:1": {
    archetypeId: "skald:undying-word",
    name: "Undying Song",
    level: 1,
    bucket: "situational",
    note: "a full raging-song restatement (class note 1): Inspire Resilience replaces inspired rage (keeps the Con and Will progression, drops the Str bonus and the AC penalty — verified against d20pfsrd's Undying Word page, 2026-08-16; the vendored text only states Str/AC are dropped), plus Song of Defiance (endure elements) in place of song of strength and Dirge of Determination (reduces ability damage/drain) in place of dirge of doom, all now modeled as level-gated toggles on the Raging Song pool (raging-song-variants.ts) with a real Change for Inspire Resilience's Con/Will bonuses — nothing to extract here in this table regardless, that modeling lives in the toggle system",
  },

  // ── skald:urban-skald ──
  "skald:urban-skald:back-of-the-crowd:3": {
    archetypeId: "skald:urban-skald",
    name: "Back of the Crowd",
    level: 3,
    bucket: "situational",
    note: "a real, scaling dodge AC bonus (+1 at 3rd, +2 at 9th, +3 at 15th) but conditioned on being adjacent to 2+ allies — an ally-count condition the engine doesn't track, unlike armor/encumbrance",
  },
  "skald:urban-skald:weapon-and-armor-proficiency:1": {
    archetypeId: "skald:urban-skald",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant plus the standard skald arcane-spell-failure exemption text — no Change target",
  },

  // ── skald:war-painter ──
  "skald:war-painter:arcane-flourish:7": {
    archetypeId: "skald:war-painter",
    name: "Arcane Flourish",
    level: 7,
    bucket: "subsystem",
    note: "a limited-use-per-day ability to infuse a cast spell into furious paint for later use — resource-gated activated ability; paired to Lore Master",
  },
  "skald:war-painter:furious-paint:1": {
    archetypeId: "skald:war-painter",
    name: "Furious Paint",
    level: 1,
    bucket: "subsystem",
    note: "stores a raging-song activation in paint for an ally to trigger later — modifies raging song's delivery mechanism (class note 2)",
  },
  "skald:war-painter:thousand-totems:5": {
    archetypeId: "skald:war-painter",
    name: "Thousand Totems",
    level: 5,
    bucket: "subsystem",
    note: "grants a chosen blood-rage or totem rage power via the furious paint, ignoring prerequisites — rage-power grant (class note 3)",
  },

  // ── skald:warlord ──
  "skald:warlord:battle-bravado:3": {
    archetypeId: "skald:warlord",
    name: "Battle Bravado",
    level: 3,
    bucket: "numeric",
    note: "an untyped Charisma-bonus-to-AC/CMD (same shape as a duelist's Canny Defense, but 'unarmored and unencumbered and no shield' are ALL checkable via @armor.type/@shield.type/@attributes.encumbrance.level — unlike Canny Defense's unchecked 'specific weapon' condition — see file header fact 8) plus a stacking +1 dodge bonus at 7th/11th/15th, same three-condition gate",
  },
  "skald:warlord:evasive-dueling:1": {
    archetypeId: "skald:warlord",
    name: "Evasive Dueling",
    level: 1,
    bucket: "subsystem",
    note: "at every even level, the warlord may take +1 dodge AC INSTEAD OF a bonus feat — a per-level build trade-off with no schema field tracking which levels chose which option, so no default count is safe to assume",
  },
  "skald:warlord:fear-me:5": {
    archetypeId: "skald:warlord",
    name: "Fear Me",
    level: 5,
    bucket: "subsystem",
    note: "a raging-song variant working like distraction against fear saves via an Intimidate check — modifies raging song (class note 2)",
  },
  "skald:warlord:intimidated-push:8": {
    archetypeId: "skald:warlord",
    name: "Intimidated Push",
    level: 8,
    bucket: "subsystem",
    note: "increases a cohort's/followers' Will-save bonus from the warlord's inspired rage — ally/cohort-only number, not the warlord's own stat block; paired to Improved Uncanny Dodge",
  },
  "skald:warlord:intimidating-prowess:1": {
    archetypeId: "skald:warlord",
    name: "Intimidating Prowess",
    level: 1,
    bucket: "subsystem",
    note: "grants Intimidating Prowess as a named bonus feat — feat grant, no Change target",
  },
  "skald:warlord:minions:7": {
    archetypeId: "skald:warlord",
    name: "Minions",
    level: 7,
    bucket: "subsystem",
    note: "grants Leadership as a named bonus feat — feat grant, no Change target; paired to Lore Master",
  },
  "skald:warlord:sun-bronzed-skin:19": {
    archetypeId: "skald:warlord",
    name: "Sun-Bronzed Skin",
    level: 19,
    bucket: "numeric",
    note: "DR 5/- while wearing no armor AND using no shield — both conditions are checkable (@armor.type, @shield.type; see file header fact 8), so unlike the fighter pilot's parallel entry (authored before @shield.type existed in roll data) neither condition needs to be dropped here",
  },
  "skald:warlord:unshakable:2": {
    archetypeId: "skald:warlord",
    name: "Unshakable",
    level: 2,
    bucket: "numeric",
    note: "unconditional +2 save vs. fear effects (Change.saveCategories) — single clean sentence",
  },
  "skald:warlord:weapon-and-armor-proficiency:1": {
    archetypeId: "skald:warlord",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "a fixed, non-standard weapon list (Barsoomian sci-fi crossover gear) and explicitly no armor/shield proficiency — proficiency-only, no Change target",
  },
  "skald:warlord:weapon-training:5": {
    archetypeId: "skald:warlord",
    name: "Weapon Training",
    level: 5,
    bucket: "situational",
    note: "grants fighter-style Weapon Training (skald has no native version to modify) with an extra 'Barsoomian' homebrew group option among the normal free choices at each tier — the group actually picked at each tier is an unknowable, untracked player choice (same posture as magus Myrmidarch's Weapon Training entry), and Barsoomian itself isn't a real WEAPON_GROUPS entry either way",
  },

  // ── skald:wyrm-singer ──
  "skald:wyrm-singer:breath-weapon:12": {
    archetypeId: "skald:wyrm-singer",
    name: "Breath Weapon",
    level: 12,
    bucket: "subsystem",
    note: "a 1/day breath-weapon attack with its own save DC, usable on self or a raging ally — activated attack ability, not a persistent modifier",
  },
  "skald:wyrm-singer:draconic-rage:1": {
    archetypeId: "skald:wyrm-singer",
    name: "Draconic Rage",
    level: 1,
    bucket: "subsystem",
    note: "a raging-song variant with different Inspired Rage bonuses (melee attack/damage and paralysis/sleep saves instead of Str/Con), now modeled as a level-gated toggle with real Changes on the Raging Song pool (raging-song-variants.ts) — nothing to extract here in this table regardless, that modeling lives in the toggle system, not the Change-extraction table",
  },
  "skald:wyrm-singer:wyrm-saga:14": {
    archetypeId: "skald:wyrm-singer",
    name: "Wyrm Saga",
    level: 14,
    bucket: "subsystem",
    note: "grants a single raging ally a form-of-the-dragon-style draconic aspect, raging-song-rounds-gated — ally-facing activated ability; paired to Song of the Fallen",
  },
  "skald:wyrm-singer:wyrm-song:1": {
    archetypeId: "skald:wyrm-singer",
    name: "Wyrm Song",
    level: 1,
    bucket: "subsystem",
    note: "a one-sentence stub introducing the Draconic Rage/Wyrm Saga raging-song reflavors detailed in their own sibling entries (Draconic Rage now modeled as a toggle, raging-song-variants.ts) — modifies raging song (class note 2), nothing of its own to extract",
  },
};

/**
 * ── SKALD_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────────
 *
 * Machine-extracted mechanical effects for skald archetype class features
 * (the prose->Change extraction pipeline, skald slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from any hand-verified table — every
 * entry here additionally carries `confidence`/`provenance` so a reviewer
 * (or the UI) can never confuse "a human read the rulebook and checked this"
 * with "an extraction pass inferred this from prose." Only 11 of skald's 100
 * features cleared the `numeric` bar (see `SKALD_ARCHETYPE_FEATURE_
 * CLASSIFICATION` above for the full per-feature audit) — skald's kit leans
 * heavily on raging song (an already-modeled activated ally-facing
 * performance) and rage powers (a deferred pick-list), both of which are
 * `subsystem`/`situational` by the class-specific rules documented in this
 * file's header.
 */
export const SKALD_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Battle Scion's "Courtly Presence" adds half CHARACTER level (not skald
  // level — the prose is explicit, and cavalier.ts's Spellscar Drifter
  // established the @attributes.hd.total precedent for this exact wording)
  // to Intimidate checks, unconditionally. The verbal-duel-edge grant and the
  // "bardic knowledge" scope restriction (skald has no such ability — see
  // file header) are both dropped: neither has a Change target or a real
  // ability to restrict.
  "skald:battle-scion:courtly-presence:1": {
    changes: [c("floor(@attributes.hd.total / 2)", "skill.int")],
    detail: (level) => `+${Math.floor(level / 2)} Intimidate (verbal-duel edge not modeled)`,
    confidence: "high",
    provenance: "The battle scion adds 1/2 her character level to Intimidate checks",
  },

  // Belkzen War Drummer's "Fearsome Mien" is a clean, unconditional +1/2
  // class level (min 1) bonus on two skills.
  "skald:belkzen-war-drummer:fearsome-mien:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.int"),
      c("max(1, floor(@class.unlevel / 2))", "skill.blf"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Intimidate/Bluff`,
    confidence: "high",
    provenance:
      "A war drummer adds 1/2 his class level (minimum 1) to all Intimidate and Bluff skill checks.",
  },

  // Dragon Skald's "Fearless Raider" grants a flat +4 save vs. fear —
  // Change.saveCategories expresses "vs. fear" without a broad allSavingThrows
  // over-application. The defender-side "DCs to affect the dragon skald with
  // Intimidate increase by 4" clause has no Change target (it modifies
  // someone ELSE's check DC, not a stat on this character's own sheet).
  "skald:dragon-skald:fearless-raider:2": {
    changes: [
      { formula: "4", target: "allSavingThrows", type: "untyped", saveCategories: ["fear"] },
    ],
    detail: () => "+4 vs. fear (Intimidate-DC-to-affect-you bonus not modeled)",
    confidence: "high",
    provenance:
      "The dragon skald gains a +4 bonus on saving throws against fear effects, and DCs to " +
      "affect the dragon skald with the Intimidate skill increase by 4.",
  },

  // Dragon Skald's "Sea Legs" is a mixed feature (per the extraction bar):
  // the Swim and Profession (sailor) clauses are both unconditional and
  // general (Profession (sailor) is a fixed, non-player-chosen instance,
  // using the established skill.pro.<slug> convention); the
  // Survival/Acrobatics/Climb clauses are explicitly location-conditional
  // ("while at sea", "aboard a boat") and dropped.
  "skald:dragon-skald:sea-legs:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.swm"),
      c("max(1, floor(@class.unlevel / 2))", "skill.pro.sailor"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Swim / Profession (sailor) (at-sea/aboard-a-boat clauses not modeled)`,
    confidence: "medium",
    provenance:
      "A dragon skald adds 1/2 his class level (minimum 1) on all Profession (sailor) checks, " +
      "Survival checks while at sea, Acrobatics and Climb checks made while aboard a boat, and " +
      "Swim checks.",
  },

  // Elegist's "Steady Hearted" is a flat, unconditional save bonus against a
  // named category of effects.
  "skald:elegist:steady-hearted:2": {
    changes: [
      { formula: "4", target: "allSavingThrows", type: "untyped", saveCategories: ["emotion"] },
    ],
    detail: () => "+4 vs. emotion effects",
    confidence: "high",
    provenance: "an elegist receives a +4 bonus to saving throws against emotion effects.",
  },

  // Fated Champion's "Watcher of the Weave" is a clean, unconditional insight
  // bonus on initiative equal to half skald level.
  "skald:fated-champion:watcher-of-the-weave:2": {
    changes: [c("floor(@class.unlevel / 2)", "init", "insight")],
    detail: (level) => `+${Math.floor(level / 2)} insight initiative`,
    confidence: "high",
    provenance: "He gains an insight bonus on initiative checks equal to 1/2 his skald level.",
  },

  // Twilight Envoy is a clean, unconditional, purely additive (no
  // replaces-clause) bonus on three skills.
  "skald:twilight-speaker:twilight-envoy:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.blf"),
      c("floor(@class.unlevel / 2)", "skill.dip"),
      c("floor(@class.unlevel / 2)", "skill.sen"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Bluff/Diplomacy/Sense Motive`,
    confidence: "high",
    provenance:
      "A twilight speaker gains a bonus equal to half his skald level on Bluff, Diplomacy, and " +
      "Sense Motive checks.",
  },

  // Undying Word's "Bonus Feat" is an unpaired, additive bonus-feat count —
  // skald has no baseline bonus-feat progression to swap out (same posture as
  // magus Iron-Ring Striker's Bonus Feat in magus.ts). The Endurance-family
  // prerequisite restriction isn't modeled, only the count.
  "skald:undying-word:bonus-feat:1": {
    changes: [c("1 + floor((@class.unlevel - 1) / 6)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor((level - 1) / 6)} bonus feat(s) (Endurance-list restricted)`,
    confidence: "high",
    provenance:
      "At 1st level and every 6 skald levels thereafter, an undying word gains a bonus feat in " +
      "addition to those gained from normal advancement.",
  },

  // Warlord's "Battle Bravado" — an untyped Charisma-bonus-to-AC/CMD (needs
  // two explicit changes since untyped bonuses don't auto-flow to CMD the
  // way dodge bonuses do, see psychic-disciplines.ts's identical AC Bonus
  // gate for precedent) plus a separately-typed, stacking dodge bonus (which
  // DOES auto-flow to CMD via compute.ts, so only an "ac" entry is needed for
  // that half). All three textual conditions (no armor, no shield, no
  // medium/heavy load) are checkable and none are dropped.
  "skald:warlord:battle-bravado:3": {
    changes: [
      c(
        "if(and(lt(@armor.type,1),lt(@shield.type,1),lt(@attributes.encumbrance.level,1)), max(0,@abilities.cha.mod), 0)",
        "ac",
        "untyped",
      ),
      c(
        "if(and(lt(@armor.type,1),lt(@shield.type,1),lt(@attributes.encumbrance.level,1)), max(0,@abilities.cha.mod), 0)",
        "cmd",
        "untyped",
      ),
      c(
        "if(and(lt(@armor.type,1),lt(@shield.type,1),lt(@attributes.encumbrance.level,1)), if(gte(@class.unlevel,15),3,if(gte(@class.unlevel,11),2,if(gte(@class.unlevel,7),1,0))), 0)",
        "ac",
        "dodge",
      ),
    ],
    detail: () =>
      "+Cha bonus to AC/CMD, +1/+2/+3 dodge AC at 7th/11th/15th (unarmored/unencumbered/no shield)",
    confidence: "medium",
    provenance:
      "the warlord adds his Charisma bonus(if any)to his AC and his CMD. In addition, the " +
      "warlord gains a +1 dodge bonus at 7th, 11th, and 15th levels.",
  },

  // Warlord's "Sun-Bronzed Skin" — both textual conditions (no armor, no
  // shield) are checkable via @armor.type/@shield.type; unlike the fighter
  // pilot's parallel entry (authored before @shield.type existed in roll
  // data, per rolldata.ts's own doc comment), neither needs to be dropped.
  "skald:warlord:sun-bronzed-skin:19": {
    changes: [c("if(and(eq(@armor.type,0),eq(@shield.type,0)),5,0)", "dr")],
    detail: () => "DR 5/— (no armor, no shield)",
    confidence: "high",
    provenance: "the warlord gains DR 5/- whenever he is not wearing armor or using a shield.",
  },

  // Warlord's "Unshakable" is a flat, unconditional save bonus against a
  // named category of effects.
  "skald:warlord:unshakable:2": {
    changes: [
      { formula: "2", target: "allSavingThrows", type: "untyped", saveCategories: ["fear"] },
    ],
    detail: () => "+2 vs. fear effects",
    confidence: "high",
    provenance: "gaining a +2 bonus on saving throws against fear effects.",
  },
};
