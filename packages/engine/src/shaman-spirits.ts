/**
 * Clean-room PF1 shaman spirit table (Advanced Class Guide, DESIGN §6):
 * hand-authored, mirroring `oracle-mysteries.ts`'s posture closely — a
 * shaman's Spirit class feature is structurally the oracle's Mystery under a
 * different name (per the vendored `spirit.yaml` class feature: "If the shaman
 * takes levels in another class that grants a mystery (such as the oracle),
 * the spirit and mystery must match"), but its SPIRIT MAGIC spell list is NOT
 * byte-identical to the matching oracle mystery's bonus-spell list (verified
 * during authoring — e.g. Waves' 1st spirit-magic spell is Hydraulic Push, not
 * the Waves mystery's Touch of the Sea), so it is hand-copied from the
 * shaman-specific vendored YAML rather than reused from `ORACLE_MYSTERIES`.
 *
 * Scope: all 18 published shaman spirits — the 8 Advanced Class Guide "core"
 * spirits (Battle, Bones, Flame, Heavens, Life, Nature, Stone, Waves) plus 10
 * from later splatbooks (Ancestors, Dark Tapestry, Frost, Lore, Mammoth,
 * Restoration, Slums, Tribe, Wind, Wood — see `packs/class-abilities/shaman-
 * spirits/`), each verified against its own aonprd.com `ShamanSpiritDisplay.
 * aspx?ItemName=<Spirit>` page (Restoration excepted — see its own entry's
 * citation for why d20pfsrd.com stands in). The vendored catalog overlay
 * below stays in place for any future spirit added to a later splatbook pack
 * this table hasn't caught up to yet.
 *
 * Data provenance:
 *   - `spiritMagicSpells` ids are copied VERBATIM from the `@UUID[Compendium.
 *     pf1.spells.<id>]` references embedded in each spirit's OWN vendored
 *     prose (`packs/class-abilities/shaman-spirits/<spirit>.*.yaml` —
 *     individually vendored, like oracle mysteries, but NOT linked from the
 *     Shaman class def, which only links the generic "Spirit" stub — same
 *     "hand-author from the cached-but-unlinked YAML" shape `oracle-
 *     mysteries.ts`/`psychic-disciplines.ts` already use). `level` here is the
 *     SPELL's own level (1st-9th), NOT a shaman class-level threshold — unlike
 *     `OracleMysteryBonusSpell.level`, because the vendored prose itself
 *     labels each entry "1st -", "2nd -",... "9th -" by spell level directly
 *     (RAW: "she has one spell slot per day of each shaman spell level she can
 *     cast" — availability is gated by
 *     `accessibleSpellLevels(CASTER_MODELS.shaman, shamanLevel)`, evaluated in
 *     `apps/web/src/model/spellcasting.ts`'s `shamanSpiritSpellsKnown`, not a
 *     fixed per-spell unlock level baked into this table).
 *   - `ability` (the spirit's 1st-level Spirit Ability, e.g. Battle's "Battle
 *     Spirit") is note-tier/prose ONLY (`summary`, no `Change[]`) — same
 *     posture as `oracle-revelations.ts`'s entries and for the same reason:
 *     each ability is either an activated melee-touch-attack power (Bones'
 *     Touch of the Grave, Flame's Touch of Flame, Stone's Touch of Acid,
 *     Waves' Wave Strike — situational, no baseline sheet number), a
 *     party-buff (Battle Spirit's ally aura), or a save-forcing debuff
 *     (Heavens' Stardust, Nature's Storm Burst, Life's Channel) — none of
 *     which has a flat always-on number this engine's `changes[]` pipeline
 *     could apply. Verified against aonprd.com's per-spirit pages during
 *     authoring (Battle's ability additionally matches the vendored
 *     `battle-spirit-ability.QGEEtV5NqZbomKE6.yaml`'s `uses.maxFormula: "3 +
 *     @abilities.cha.mod"` — cited in `summary` as prose only, since the
 *     other 7 spirits' per-day formulas aren't independently vendored and
 *     wiring a REAL resource pool for one spirit but not the other seven
 *     would be an inconsistent, confusing half-measure).
 *   - `hexes`: each spirit grants access to 5 exclusive hexes (Slums genuinely
 *     has only 4 — confirmed on aonprd.com directly, not a vendoring gap) via
 *     the shaman's Hex/Wandering Hex class features (see `model/
 *     shamanHexes.ts` for the pick-level budget). The core 8 were verified
 *     against a legacy.aonprd.com mirror of the published Advanced Class
 *     Guide per-spirit text (paizo.com's own PRD page redirects there); the
 *     splatbook 10 against each spirit's own aonprd.com page directly. Almost
 *     every hex is a foe/ally-targeted, activated, or limited-duration
 *     ability with no flat always-on number on the shaman's OWN sheet, so
 *     stays `displayOnly: true` (`changes: []`) — same bar `shaman-hexes.ts`
 *     (the general catalog) applies. Two promotions (same
 *     bar as `oracle-revelations.ts`'s promoted set): `flame:cinderDance`
 *     grants a genuine unconditional +10 ft. to base land speed (Ex, no
 *     action, no per-day limit — see its entry's citation); its two
 *     bonus-feat grants (Nimble Moves, Acrobatic Steps) have no Change target
 *     for a specific named feat, so stay prose-only. `dark_tapestry:
 *     pierceTheVeil` grants additive darkvision plus a level-8-gated
 *     see-in-darkness flag (see its entry's citation for how the level gate
 *     is wired, since a hex's `changes[]` has no gate mechanism of its own).
 *     Two close near-misses, deliberately left blocked:
 *     `bones:deathlyBeing` (a living shaman's bonus is scoped to "saves
 *     against death effects and effects that drain energy" — a save-
 *     CATEGORY, not a whole save type, same shape as `oracle-
 *     revelations.ts`'s `bones:nearDeath`) and `stone:stoneStability` (its
 *     +4 CMD vs. bull rush/trip only applies "as long as she is standing on
 *     the ground" — a situational condition this table has no state for,
 *     so an unconditional Change would overstate it while flying/swimming/
 *     prone). A prior authoring pass had gotten five Battle hexes, one
 *     Bones hex, and one Heavens hex factually wrong (describing mechanics
 *     that don't match the published text at all, e.g. Battle Master's
 *     "grant an ally a bonus feat" vs. RAW's actual extra attack of
 *     opportunity) — corrected in place; see each entry's inline citation.
 *   - `spiritAnimalNote` is the spirit's "Spirit Animal" flavor bonus prose
 *     (display-only — the shaman's "spirit animal" is a familiar-like
 *     conduit for preparing spells, not a trackable creature this app models
 *     as a stat block, unlike `@pf1/engine` `companion.ts`'s animal
 *     companion).
 *   - `greaterAbility` / `trueAbility` / `manifestation` — the spirit's
 *     higher-tier abilities, gained at class-level thresholds verified
 *     against aonprd.com's Shaman class page
 *     (`ClassDisplay.aspx?ItemName=Shaman`): "At 8th level, the shaman gains
 *     the abilities listed in the greater version of her selected spirit,"
 *     "At 16th level, the shaman gains the abilities listed for the true
 *     version," "Upon reaching 20th level, a shaman undergoes a
 *     transformation as she manifests as a pinnacle of her main spirit" —
 *     `SHAMAN_GREATER_SPIRIT_LEVEL`/`SHAMAN_TRUE_SPIRIT_LEVEL`/
 *     `SHAMAN_MANIFESTATION_LEVEL` below. Each spirit's own page
 *     (`ShamanSpiritDisplay.aspx?ItemName=<Spirit>`) was fetched and
 *     cross-checked against the vendored prose to verify these three
 *     sections; per-spirit citations sit on the entries below. Same
 *     promotion bar as `ability`/`hexes` above: only a piece that's
 *     unconditional, always-on, and a flat number on the shaman's own sheet
 *     earns a `Change` (see `collect.ts`'s shaman-spirit block for where
 *     these apply, level-gated at the thresholds above). Most of these 54
 *     entries (18 spirits × 3 tiers) are activated (swift/standard action,
 *     per-day limited) or conditional on a trigger state (reduced below 0 hp,
 *     standing on the ground, an urban environment) and stay prose-only, same
 *     as the bulk of `hexes`; the handful that do promote are noted per
 *     entry. Core 8: Heavens' Void Adaptation (darkvision 60 ft., the same
 *     shape as `oracle-revelations.ts`'s `dark_tapestry:pierceTheVeil`) and
 *     Manifestation (a flat bonus to all saves equal to Wisdom modifier, plus
 *     fear immunity); Bones' Shard Soul and Stone's Body of Earth (both a
 *     scaling DR, the ability's own attack piece stays prose-only); Flame's
 *     Fiery Soul/Manifestation and Stone's and Waves' Manifestation (flat
 *     energy resistance, same "same qualifier doesn't stack, highest wins"
 *     resolution `defenses.ts` already gives `eres.*`, so a tier-1 resistance
 *     and a later tier-3 one coexist for free); and Life's Healer's Touch (a
 *     flat Heal-check bonus) and Manifestation (death-effect immunity only —
 *     RAW also grants bleed and negative-energy immunity, but neither has an
 *     `immEffect.*` slug in `defenses.ts`'s closed vocabulary, so those two
 *     stay prose-only rather than inventing one). Splatbook 10, same
 *     "passive half of a mixed ability promotes, the activated half doesn't"
 *     posture the core 8 already establish: Frost's Frigid Blast and Wind's
 *     Spark Soul (each a flat energy resistance 10 bundled with an activated
 *     blast); Wind's Manifestation (resistance 30, same highest-wins
 *     coexistence with Spark Soul as Flame's own two-tier fire resistance);
 *     Lore's Perfect Knowledge (a flat +10 competence bonus on Knowledge/
 *     Linguistics/Spellcraft); Mammoth's Strength of the Beast (a scaling Str
 *     enhancement bonus — spirit-primary track only, see its entry's note on
 *     why the engine can't key off a "wandering spirit" alternate track);
 *     Ancestors' Manifestation (a Will save bonus plus blindsense 60 ft.; its
 *     divination-only caster-level bonus has no per-school CL target
 *     anywhere in this engine and stays prose); Dark Tapestry's Manifestation
 *     (DR 5/-, acid immunity, critical-hit immunity; sneak-attack immunity
 *     has no slug of its own and using the closest one, `immEffect.
 *     precisionDamage`, would overstate it, so it stays prose); Slums'
 *     Manifestation (disease and poison immunity; its urban-only AC/Reflex
 *     bonus is conditional on a location this engine has no state for and
 *     stays prose); Tribe's Manifestation (a flat bonus to all saves equal to
 *     Cha modifier, plus compulsion immunity); Wood's Manifestation (+4
 *     natural armor plus paralysis/poison/sleep/stunned immunity; polymorph
 *     immunity has no slug and stays prose); and Restoration's Healer's Touch
 *     and Manifestation, promoted identically to Life's own (see its entry's
 *     citation for the verification history).
 */

import type { Change, RefData, ShamanSpirit, SourceRef } from "@pf1/schema";

export interface ShamanSpiritMagicSpell {
  /** The spell's own level, 1-9 (see file doc comment — NOT a shaman class-level threshold). */
  level: number;
  /** Vendored Foundry spell id (`RefData.spells` key). */
  id: string;
  /** Display name, for readability here and as a display fallback. */
  name: string;
}

export interface ShamanSpiritAbility {
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Typed modifiers granted by the ability. Absent (the common case) means display-only, prose-only. */
  changes?: Change[];
}

/** Class level at which a shaman gains her chosen spirit's Greater Spirit Ability (aonprd.com, Shaman class, "Spirit" feature). */
export const SHAMAN_GREATER_SPIRIT_LEVEL = 8;
/** Class level at which a shaman gains her chosen spirit's True Spirit Ability. */
export const SHAMAN_TRUE_SPIRIT_LEVEL = 16;
/** Class level at which a shaman gains her chosen spirit's Manifestation. */
export const SHAMAN_MANIFESTATION_LEVEL = 20;

export interface ShamanSpiritHex {
  /** `<spiritTag>:<camelCaseName>` — unique across every spirit. */
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /** Typed modifiers granted by the hex (empty for every entry except Flame's Cinder Dance — see file doc comment). */
  changes: Change[];
  /** True when `changes` is empty (mirrors `RagePowerDef`/`ShamanGeneralHexDef`'s convention). */
  displayOnly: boolean;
}

export interface ShamanSpiritDef {
  /** Matches `doc.build.shamanSpirit` keys. */
  tag: string;
  name: string;
  spiritMagicSpells: ShamanSpiritMagicSpell[];
  /** 1st-level Spirit Ability — note-tier, see file doc comment. */
  ability: ShamanSpiritAbility;
  /** Gained at `SHAMAN_GREATER_SPIRIT_LEVEL` (8th) — see file doc comment. */
  greaterAbility: ShamanSpiritAbility;
  /** Gained at `SHAMAN_TRUE_SPIRIT_LEVEL` (16th) — see file doc comment. */
  trueAbility: ShamanSpiritAbility;
  /** Gained at `SHAMAN_MANIFESTATION_LEVEL` (20th) — see file doc comment. */
  manifestation: ShamanSpiritAbility;
  /** The 5 hexes this spirit grants access to (see `model/shamanHexes.ts`). */
  hexes: ShamanSpiritHex[];
  /** "Spirit Animal" flavor bonus — display-only prose (see file doc comment). */
  spiritAnimalNote: string;
}

function hex(
  spiritTag: string,
  id: string,
  name: string,
  summary: string,
  changes: Change[] = [],
): ShamanSpiritHex {
  return { id: `${spiritTag}:${id}`, name, summary, changes, displayOnly: changes.length === 0 };
}

/** `c()` mirrors `oracle-revelations.ts`'s helper — a terse Change literal for the handful of promotions below. */
const c = (
  formula: string,
  target: string,
  type = "untyped",
  operator?: "add" | "set",
): Change => ({
  formula,
  target,
  type,
  ...(operator ? { operator } : {}),
});

const SPIRIT_LIST: ShamanSpiritDef[] = [
  {
    tag: "battle",
    name: "Battle",
    spiritMagicSpells: [
      { level: 1, id: "jnlr9cuepka1l26e", name: "Enlarge Person" },
      { level: 2, id: "g33euis7yi9pwddy", name: "Fog Cloud" },
      { level: 3, id: "73han2zqxg59u18g", name: "Magic Vestment" },
      { level: 4, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 5, id: "6ax0ythzw8n4bta8", name: "Righteous Might" },
      { level: 6, id: "8xjcrqg79ugxu5qu", name: "Mass Bull's Strength" },
      { level: 7, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 8, id: "a5gcbpwfhu4hh5ic", name: "Earthquake" },
      { level: 9, id: "n4e35m6qu9nmkhgm", name: "Storm of Vengeance" },
    ],
    ability: {
      name: "Battle Spirit",
      summary:
        "Allies within 30 ft. (including the shaman) gain a +1 morale bonus on attack rolls and weapon damage rolls (+2 at 8th level, +3 at 16th). Usable 3 + Cha modifier rounds/day, not necessarily consecutive.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Battle): Greater
    // ("Enemies' Bane") is a swift-action, per-day weapon buff; True
    // ("Paragon of Battle") a per-day activated battle form; Manifestation a
    // full-round-action attack routine plus a critical-hit DR bypass and a
    // below-0-hp death threshold. All four are either activated/per-day or
    // conditional on a trigger state (a hit being a crit, being below 0 hp),
    // and Manifestation's "+4 insight bonus to AC for the purposes of
    // confirming critical hits against her" has no matching engine target
    // (this app models one whole-sheet AC, not a crit-confirmation-only
    // variant, so a flat AC Change would overstate normal AC) - none promote.
    greaterAbility: {
      name: "Enemies' Bane",
      summary:
        "Swift action: imbue a weapon you wield with the bane weapon quality against a creature type of your choice for 1 minute (4d6 bonus damage instead of 2d6 if it already has bane against that type). Usable 3 + Cha modifier times/day.",
    },
    trueAbility: {
      name: "Paragon of Battle",
      summary:
        "Standard action: assume a battle form combining the effects of enlarge person and deadly juggernaut for 1 minute or until dismissed. Usable 3 + Cha modifier times/day.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, as a full-round action, make a full attack and move up to your speed before or after it. Critical hits ignore damage reduction, and you gain a +4 insight bonus to AC against critical hit confirmation rolls. If reduced below 0 hit points, you don't die until your negative hit point total exceeds double your Constitution score.",
    },
    hexes: [
      hex(
        "battle",
        "battleMaster",
        "Battle Master",
        // RAW (aonprd.com/legacy, "Spirits - Shaman" - Battle): "The shaman
        // makes an extra attack of opportunity each round. This ability
        // stacks with the attacks of opportunity granted by the Combat
        // Reflexes feat. At 8th level, the shaman gains the Weapon
        // Specialization feat for a weapon of her choice as a bonus feat. At
        // 16th level, the shaman gains the Greater Weapon Focus feat..." An
        // extra-AoO/round grant has no engine target (not a flat number),
        // and the bonus feats are specific named grants (no Change target
        // for that either, same gap `shaman-hexes.ts` documents for
        // Fetish/Secret). Corrected from a prior description ("grant an
        // ally a bonus combat feat") that didn't match published text at all.
        "Gain an extra attack of opportunity each round (stacks with Combat Reflexes); a bonus Weapon Specialization feat at 8th level, and Greater Weapon Focus (same weapon) at 16th, ignoring prerequisites.",
      ),
      hex(
        "battle",
        "battleWard",
        "Battle Ward",
        // RAW: a touched creature gets a ward that activates on the NEXT
        // attack against it (+3 deflection, dropping by 1 per subsequent hit
        // to +2 then +1; +4/+5 starting bonus at 8th/16th), fading at +0 or
        // after 24 hours - not "for a number of rounds" as previously
        // described. Single-use-per-trigger ward on a touched creature
        // (possibly not the shaman), no unconditional self number.
        "Touch a willing creature (including yourself): the next attack against it gets a +3 deflection bonus to AC, dropping by 1 each subsequent hit (+4 at 8th level, +5 at 16th), until the ward expires or 24 hours pass.",
      ),
      hex(
        "battle",
        "curseOfSuffering",
        "Curse of Suffering",
        // RAW: "the shaman causes a creature within 30 feet to take more
        // damage from bleed effects... an additional 1 point of bleed
        // damage... effects that restore hit points restore only half the
        // normal amount." Not a crit-multiplier reduction - corrected from a
        // prior description that didn't match published text.
        "Curse a creature so it takes an extra point of bleed damage and heals only half as much from any source, for a number of rounds equal to the shaman's level.",
      ),
      hex(
        "battle",
        "eyesOfBattle",
        "Eyes of Battle",
        // RAW: swift action, +10 insight bonus on the SHAMAN's own
        // Perception checks to notice/pinpoint invisible creatures within 30
        // ft. for 1 round, OR ignore cover/partial cover on her next attack;
        // usable a number of times/day equal to shaman level. Not an ally
        // buff on initiative/AoOs - corrected from a prior description that
        // didn't match published text.
        "Swift action: gain a +10 insight bonus on your own Perception checks to spot invisible creatures within 30 ft. for 1 round, or ignore cover on your next attack instead. Usable a number of times/day equal to your shaman level.",
      ),
      hex(
        "battle",
        "hamperingHex",
        "Hampering Hex",
        // RAW: "-2 penalty to AC and CMD for a number of rounds equal to the
        // shaman's level... At 8th level, the penalty becomes -4." AC/CMD,
        // not speed - corrected from a prior description that named the
        // wrong stat entirely.
        "Curse a creature within 30 ft. with a -2 penalty to AC and CMD (-4 at 8th level) for a number of rounds equal to the shaman's level; a Will save shortens this to 1 round.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks fiercer and gains a +2 natural armor bonus to AC (or +2 more if it already has one).",
  },
  {
    tag: "bones",
    name: "Bones",
    spiritMagicSpells: [
      { level: 1, id: "9tww9fc9049h6iqc", name: "Cause Fear" },
      { level: 2, id: "3ze0kso9hxff5u2f", name: "False Life" },
      { level: 3, id: "8uwmrygxgih1fb57", name: "Animate Dead" },
      { level: 4, id: "be88e90guqbi1q1z", name: "Fear" },
      { level: 5, id: "dg3mrasygkm83c3e", name: "Slay Living" },
      { level: 6, id: "3a162m66toj22fpa", name: "Circle of Death" },
      { level: 7, id: "wkp8u7xl1dgpk362", name: "Control Undead" },
      { level: 8, id: "e8zen5nzixnt7bde", name: "Horrid Wilting" },
      { level: 9, id: "wplgawb6aznjx7se", name: "Wail of the Banshee" },
    ],
    ability: {
      name: "Touch of the Grave",
      summary:
        "Standard action melee touch attack infused with negative energy: 1d4 damage + 1 per 2 shaman levels.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Bones): Shard
    // Soul's DR is unconditional (Su, no action, no per-day limit) - the
    // same shape as Cinder Dance's landSpeed promotion, so it promotes; its
    // bone-explosion burst is a separate standard-action, 3/day, 1d4-round-
    // cooldown attack, so that half stays prose-only. True ("Shedding Form")
    // is a per-day activated incorporeal-form power. Manifestation's free-
    // action bleed/stabilize is once/round (a recurring but still activated
    // action, not passive); its own auto-stabilize is conditional on being
    // below 0 hp; at-will animate dead and 1/day power word kill are both
    // spell-like activations. None of the latter three promote.
    greaterAbility: {
      name: "Shard Soul",
      summary:
        "Gain DR 3/magic, increasing by 1 for every 4 shaman levels beyond 8th. As a standard action, explode shards of bone in a 10-foot burst dealing 1d6 piercing damage per 2 shaman levels (Reflex halves); usable 3 times/day, waiting 1d4 rounds between uses.",
      changes: [c("3 + floor((@classes.shaman.level - 8) / 4)", "dr.magic")],
    },
    trueAbility: {
      name: "Shedding Form",
      summary:
        "Standard action: shed your body and become incorporeal, your weapon attacks treated as ghost touch, for a number of rounds per day equal to your shaman level (not necessarily consecutive).",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, once per round, cast bleed or stabilize as a free action, automatically stabilizing if reduced below 0 hit points. Cast animate dead at will with no material cost (still subject to the usual Hit Dice limit), and once per day cast power word kill against a creature with 150 hit points or fewer.",
    },
    hexes: [
      hex(
        "bones",
        "boneLock",
        "Bone Lock",
        // RAW: "the shaman causes a creature within 30 feet to suffer
        // stiffness in its joints and bones, causing the target to be
        // staggered 1 round. A successful Fortitude saving throw negates
        // this effect. At 8th level, the duration increases to a number of
        // rounds equal to her shaman level..." Not an undead-binding
        // ability - corrected from a prior description that didn't match
        // published text at all (no undead-control theme in RAW).
        "Curse a creature within 30 ft. with stiff joints, staggering it for 1 round (Fortitude negates); scales to a save-each-round duration at 8th level and a no-further-saves duration at 16th.",
      ),
      hex(
        "bones",
        "boneWard",
        "Bone Ward",
        // RAW: "+2 deflection bonus to AC for a number of rounds equal to
        // the shaman's level. At 8th level, the bonus increases to +3 and
        // lasts for 1 minute. At 16th level, the bonus increases to +4 and
        // lasts for 1 hour." Deflection, not armor - corrected bonus type.
        "Grant a touched creature a +2 deflection bonus to AC (+3 at 8th level, +4 at 16th) for a number of rounds equal to the shaman's level, extending to 1 minute at 8th and 1 hour at 16th.",
      ),
      hex(
        "bones",
        "deathlyBeing",
        "Deathly Being",
        "Gain a scaling resistance to death effects, energy drain, and similar necromantic hazards.",
      ),
      hex(
        "bones",
        "fearfulGaze",
        "Fearful Gaze",
        "Force a creature within range to make a Will save or become shaken, then frightened at higher levels.",
      ),
      hex(
        "bones",
        "graveSight",
        "Grave Sight",
        "Detect undead within range and sense how a nearby corpse died.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal glows ghostly and is under a constant blur effect at the shaman's caster level.",
  },
  {
    tag: "flame",
    name: "Flame",
    spiritMagicSpells: [
      { level: 1, id: "lndeaqm2j2nvgm6p", name: "Burning Hands" },
      { level: 2, id: "tkjnm3lw7ni82tag", name: "Resist Energy" },
      { level: 3, id: "6oq1wcryviik9ice", name: "Fireball" },
      { level: 4, id: "92hth51cs9oi0nfe", name: "Wall of Fire" },
      { level: 5, id: "hd7ukybisvv7j5r6", name: "Summon Monster V (fire elementals only)" },
      { level: 6, id: "0hknfnoaljc75fj3", name: "Fire Seeds" },
      { level: 7, id: "9wl8ijy6argdvz5f", name: "Fire Storm" },
      { level: 8, id: "iq0as5470o8q9y39", name: "Incendiary Cloud" },
      { level: 9, id: "qk3oeq4awbc1smjw", name: "Fiery Body" },
    ],
    ability: {
      name: "Touch of Flame",
      summary: "Standard action melee touch attack: 1d6 fire damage + 1 per 2 shaman levels.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Flame): Fiery
    // Soul's fire resistance is unconditional, so it promotes; its cone-of-
    // flame breath is a separate standard-action, 3/day, 1d4-round-cooldown
    // attack, so that half stays prose-only. True ("Elemental Form") is a
    // once/day activated polymorph. Manifestation's fire resistance 30 is
    // likewise unconditional and promotes - `defenses.ts`'s `eres.*`
    // resolution takes the single highest same-qualifier source, so this and
    // Fiery Soul's resistance 10 coexist for free (30 wins once both apply).
    // Manifestation's free metamagic-on-a-fire-spell clause has no matching
    // engine target (it changes how a spell is cast, not a flat sheet
    // number), so it stays prose-only.
    greaterAbility: {
      name: "Fiery Soul",
      summary:
        "Gain fire resistance 10. As a standard action, unleash a 15-foot cone dealing 1d4 fire damage per shaman level (Reflex halves); usable 3 times/day, waiting 1d4 rounds between uses.",
      changes: [c("10", "eres.fire")],
    },
    trueAbility: {
      name: "Elemental Form",
      summary:
        "Standard action: assume the form of a Huge or smaller fire elemental (as elemental body IV) for 1 hour per level. Usable once/day.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain fire resistance 30. You may apply Enlarge Spell, Extend Spell, Silent Spell, or Still Spell to any fire spell you cast without increasing its level or casting time, without needing the feat.",
      changes: [c("30", "eres.fire")],
    },
    hexes: [
      hex(
        "flame",
        "cinderDance",
        "Cinder Dance",
        // RAW (aonprd.com/legacy, "Spirits - Shaman" - Flame): "The shaman's
        // base speed increases by 10 feet. At 5th level, the shaman
        // receives Nimble Moves as a bonus feat. At 10th level, the shaman
        // receives Acrobatic Steps as a bonus feat." Constant (Ex), no
        // action to activate, no per-day limit - genuinely unconditional,
        // unlike this file's touch-attack/curse/ward hexes. No bonus type
        // named (not "enhancement" - corrected from a prior description
        // that guessed a type), so `c()` defaults to untyped, same posture
        // as `racial-traits.ts`'s Sylph "Like the Wind" (+5 ft, untyped).
        // The two bonus feats (Nimble Moves, Acrobatic Steps) are specific
        // named grants with no Change target (`targets.ts`'s `bonusFeats`
        // only tracks the free-choice budget count) - left as prose.
        "The shaman's base speed increases by 10 ft.; gains Nimble Moves as a bonus feat at 5th level and Acrobatic Steps at 10th, ignoring prerequisites (feats not modeled here).",
        [c("10", "landSpeed")],
      ),
      hex(
        "flame",
        "fireNimbus",
        "Fire Nimbus",
        "Curse a creature to shed light and take a penalty against fire effects.",
      ),
      hex(
        "flame",
        "flameCurse",
        "Flame Curse",
        "Curse a creature with vulnerability to fire damage for a number of rounds.",
      ),
      hex(
        "flame",
        "gazeOfFlames",
        "Gaze of Flames",
        "See through fire and smoke without penalty; scry through flames at higher levels.",
      ),
      hex(
        "flame",
        "wardOfFlames",
        "Ward of Flames",
        "Grant a touched creature protection that burns melee attackers with fire damage.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal is wreathed in a warm, harmless nimbus of flame, is immune to fire damage, and is vulnerable to cold.",
  },
  {
    tag: "heavens",
    name: "Heavens",
    spiritMagicSpells: [
      { level: 1, id: "qcjskol4ac3eemhy", name: "Color Spray" },
      { level: 2, id: "zyfm6dq35i4hip4u", name: "Hypnotic Pattern" },
      { level: 3, id: "7x2z0i8rcx7s81fk", name: "Daylight" },
      { level: 4, id: "6lebv7569xsypp8u", name: "Rainbow Pattern" },
      { level: 5, id: "wqvy12w1xgk6l9b0", name: "Overland Flight" },
      { level: 6, id: "6vfauefzzmwl4az7", name: "Chain Lightning" },
      { level: 7, id: "mb819hvwpk0zmw53", name: "Prismatic Spray" },
      { level: 8, id: "j2mwv9wfxhqch10g", name: "Sunburst" },
      { level: 9, id: "xhzme0v6tjq95fg6", name: "Meteor Swarm" },
    ],
    ability: {
      name: "Stardust",
      summary:
        "Standard action: stardust materializes around a creature within 30 ft., making it shed light like a candle and denying it the benefit of concealment or invisibility, plus a scaling penalty to attack rolls and sight-based Perception checks for several rounds. Usable a number of times/day tied to Charisma modifier.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Heavens): Void
    // Adaptation is unconditional (darkvision, supernatural-darkness sight,
    // constant endure elements, no need to breathe, Su, no action, no
    // per-day limit); its darkvision grant/rider differ (gain 60 ft., or +30
    // ft. if darkvision is already possessed) - `senses.ts`'s doc comment
    // flags this exact "grant and rider differ" shape (its own Bat/Shadow's
    // Sight examples) as not expressible via the additive `operator: "add"`
    // convention, so this promotes as the flat highest-wins grant that doc
    // comment recommends for that case (same shape as `oracle-
    // revelations.ts`'s `dark_tapestry:pierceTheVeil`, which has no rider at
    // all) - a shaman who already has 60+ ft. darkvision from another source
    // won't see the +30 ft. rider reflected on the sheet. The supernatural-
    // darkness sight/endure elements/no-breathing riders have no matching
    // engine target, so stay prose-only. True ("Phantasmagoric Display") is
    // a per-day activated pair of spell-like abilities. Manifestation's
    // saving-throw bonus and fear immunity are both unconditional and
    // promote; its auto-stabilize is conditional on being below 0 hp, its
    // auto-confirmed critical hits have no matching engine target, and its
    // death/reincarnation clause isn't a sheet number - none of those three
    // promote.
    greaterAbility: {
      name: "Void Adaptation",
      summary:
        "Gain darkvision 60 ft. (or +30 ft. if you already have darkvision). You can see in supernatural darkness, are constantly under the effect of endure elements, and don't need to breathe.",
      changes: [c("60", "sensedv", "untyped", "set")],
    },
    trueAbility: {
      name: "Phantasmagoric Display",
      summary:
        "Cast prismatic wall and prismatic spray, each once/day, at a caster level equal to your shaman level.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain a bonus on all saving throws equal to your Wisdom modifier and immunity to fear effects. You automatically stabilize if reduced below 0 hit points, automatically confirm every critical hit you threaten, and if you die, you're reborn 3 days later as a reincarnated form of yourself.",
      changes: [c("@abilities.wis.mod", "allSavingThrows"), c("1", "immEffect.fear")],
    },
    hexes: [
      hex(
        "heavens",
        "envelopingVoid",
        "Enveloping Void",
        "Curse a creature so its darkvision and low-light vision fail and it takes a penalty on sight-based checks in dim light or darkness.",
      ),
      hex(
        "heavens",
        "guidingStar",
        "Guiding Star",
        // RAW: "Whenever the shaman can see the open sky at night, she can
        // determine her precise location and can add both her Wisdom
        // modifier and her Charisma modifier on all Charisma-based skill
        // checks. In addition, once per night while outdoors, she can cast
        // one spell as if modified by Empower/Extend/Silent/Still Spell..."
        // No Survival-check bonus in RAW at all - corrected from a prior
        // description that didn't match published text. Situationally
        // conditional (open sky at night) and targets an unsupported
        // aggregate ("Cha-based skill checks" has no discrete engine
        // target) - blocked for promotion regardless.
        "Outdoors under open sky at night, add your Wisdom modifier to Charisma-based skill checks and always know your exact location; once per night you can also apply an Empower/Extend/Silent/Still Spell-like boost to a spell you cast.",
      ),
      hex(
        "heavens",
        "heavensLeap",
        "Heaven's Leap",
        "Gain a scaling bonus on Acrobatics checks to jump and take no falling damage from a fall the shaman survives.",
      ),
      hex(
        "heavens",
        "lureOfTheHeavens",
        "Lure of the Heavens",
        "Gain progressively better unassisted movement: untrackable, then hovering, at higher levels.",
      ),
      hex(
        "heavens",
        "starburn",
        "Starburn",
        "Curse a creature so it takes a penalty against death effects and energy drain the shaman herself is resistant to.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal's flesh reflects the visible night sky and can be read as a star map; it gains (or improves) a fly speed.",
  },
  {
    tag: "life",
    name: "Life",
    spiritMagicSpells: [
      { level: 1, id: "aa0w7tk852iqn3ni", name: "Detect Undead" },
      { level: 2, id: "fxz69pwpqt9b6uss", name: "Lesser Restoration" },
      { level: 3, id: "6l904edkt8jv9jor", name: "Neutralize Poison" },
      { level: 4, id: "anya5qwdjhdfyk8u", name: "Restoration" },
      { level: 5, id: "qiiis9ekgy3syu7j", name: "Breath of Life" },
      { level: 6, id: "4re1j2w8wkvsvnsi", name: "Heal" },
      { level: 7, id: "igmb8lisqcnsxd2d", name: "Greater Restoration" },
      { level: 8, id: "klcvk9ct1l7mhjwp", name: "Mass Heal" },
      { level: 9, id: "mxqi375ya2rka7cp", name: "True Resurrection" },
    ],
    ability: {
      name: "Channel",
      summary:
        "Channel positive energy like a cleric, using the shaman's level as her effective cleric level for the amount healed/dealt and the save DC. Usable 1 + Cha modifier times/day.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Life): Healer's
    // Touch's +4 Heal check bonus is unconditional and promotes (same
    // `skill.hea` target `archetype-effects.ts`'s Heal-bonus discovery
    // already uses); its standard-action mass-stabilize is a separate
    // activated ability, so that half stays prose-only. True ("Quick
    // Healing") is a per-day activated swift-action upgrade to channeling/
    // curing. Manifestation grants several immunities and protections:
    // death-effects, fatigue, and exhaustion immunity are unconditional and
    // have `EFFECT_IMMUNITY_LABELS` slugs, so all three promote; bleed,
    // negative-energy, nauseated, and sickened immunity have no matching
    // slug in `defenses.ts`'s closed vocabulary (adding one is out of this
    // table's scope); the ability-damage floor, automatic massive-damage
    // saves, and the raised death threshold aren't expressible as a flat
    // Change on any existing target - none of those promote.
    greaterAbility: {
      name: "Healer's Touch",
      summary:
        "Gain a +4 bonus on Heal checks. As a standard action, move up to half your speed and touch up to six dying creatures, automatically stabilizing each one.",
      changes: [c("4", "skill.hea")],
    },
    trueAbility: {
      name: "Quick Healing",
      summary:
        "Channel positive energy or cast a cure spell as a swift action instead of a standard action. Usable a number of times/day equal to your Charisma modifier.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain immunity to bleed, death attacks, and negative energy, as well as to the exhausted, fatigued, nauseated, and sickened conditions. Ability damage and drain cannot reduce any ability score below 1. You automatically succeed at saving throws against massive damage, and you don't die from negative hit points until they exceed double your Constitution score.",
      changes: [
        c("1", "immEffect.deathEffects"),
        c("1", "immEffect.fatigue"),
        c("1", "immEffect.exhaustion"),
      ],
    },
    hexes: [
      hex(
        "life",
        "curseOfSuffering",
        "Curse of Suffering",
        // RAW: identical text to Battle's own Curse of Suffering hex (see
        // that entry's citation) - extra bleed damage, half-effective
        // healing. Not a crit-multiplier reduction - corrected from a prior
        // description that didn't match published text.
        "Curse a creature so it takes an extra point of bleed damage and heals only half as much from any source, for a number of rounds equal to the shaman's level.",
      ),
      hex(
        "life",
        "denySuccor",
        "Deny Succor",
        "Curse a creature so it heals only half the normal amount from magical healing for a number of rounds.",
      ),
      hex(
        "life",
        "enhancedCures",
        "Enhanced Cures",
        "The shaman's cure spells heal beyond their normal die-roll cap, scaling with her level.",
      ),
      hex(
        "life",
        "lifeLink",
        "Life Link",
        "Bond to a creature: it heals automatically each round it is wounded, at the cost of the shaman's own hit points.",
      ),
      hex(
        "life",
        "lifeSight",
        "Life Sight",
        "Sense living and undead creatures within range as if by blindsight for them.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks unusually healthy and vibrant, and gains (or improves) fast healing 1.",
  },
  {
    tag: "nature",
    name: "Nature",
    spiritMagicSpells: [
      { level: 1, id: "pg7dbmuuaksxhp3v", name: "Charm Animal" },
      { level: 2, id: "la7kuehewu85ybnt", name: "Barkskin" },
      { level: 3, id: "rrsefzpm3nhztvld", name: "Speak with Plants" },
      { level: 4, id: "0sssdtv0tkbns2r3", name: "Grove of Respite" },
      { level: 5, id: "h9qiwo9kx8d1hqrn", name: "Awaken" },
      { level: 6, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 7, id: "f828mjoo5afszqnk", name: "Creeping Doom" },
      { level: 8, id: "3ah9mmg0odateh8l", name: "Animal Shapes" },
      { level: 9, id: "refg1teqkrdtxllg", name: "World Wave" },
    ],
    ability: {
      name: "Storm Burst",
      summary:
        "Standard action: a small storm of swirling wind and rain forms around a creature within 30 ft., granting a 20% miss chance against it for 1 round + 1 round per 4 shaman levels.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Nature): Spirit of
    // Nature's auto-stabilize and fast healing only trigger "whenever the
    // shaman is reduced to below 0 hit points" - a trigger-state condition,
    // the same bar `stoneStability`'s ground-only CMD bonus is rejected
    // under in this file's hex list, so it stays prose-only rather than
    // overstating an always-on fast healing. True ("Companion Animal")
    // upgrades the spirit animal into a full animal companion - a
    // structural creature grant, not a flat number, and this project
    // doesn't model spirit animals as trackable stat blocks at all (see
    // `spiritAnimalNote`'s own doc comment above). Manifestation's cocoon
    // transformation is a once/day, full-round-action activated ability
    // with no flat sheet number. None of the three promote.
    greaterAbility: {
      name: "Spirit of Nature",
      summary:
        "Whenever you're reduced below 0 hit points, automatically stabilize and gain fast healing 1 for 1d4 rounds (fast healing 3 at 15th level).",
    },
    trueAbility: {
      name: "Companion Animal",
      summary:
        "Your spirit animal becomes a full animal companion of your choice, using your shaman level as your effective druid level, while keeping the spirit animal's own special abilities and Intelligence score.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, once per day, as a full-round action, cocoon yourself (helpless while enclosed). Eight hours later you emerge with your creature type changed to plant, animal, or humanoid, cleansed of poisons and diseases, restored to full hit points, and healed of all ability damage. The change lasts until you cocoon again.",
    },
    hexes: [
      hex(
        "nature",
        "entanglingCurse",
        "Entangling Curse",
        "Immobilize a creature within 30 ft. with grasping plants for a number of rounds equal to the shaman's Charisma modifier.",
      ),
      hex(
        "nature",
        "erosionCurse",
        "Erosion Curse",
        "Deal damage to constructs and objects, ignoring hardness and damage reduction.",
      ),
      hex(
        "nature",
        "friendToAnimals",
        "Friend to Animals",
        "Spontaneously cast summon nature's ally spells; nearby animals gain a bonus on their saving throws.",
      ),
      hex(
        "nature",
        "speakWithAnimals",
        "Speak with Animals",
        "Communicate with one type of animal, gaining additional types at higher levels.",
      ),
      hex(
        "nature",
        "stormwalker",
        "Stormwalker",
        "Move unimpeded through fog, rain, snow, and similar environmental effects.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks feral and can move through undergrowth or natural difficult terrain at full speed unimpeded.",
  },
  {
    tag: "stone",
    name: "Stone",
    spiritMagicSpells: [
      { level: 1, id: "fv9mgob508qv99zz", name: "Magic Stone" },
      { level: 2, id: "gqtg9ruv8kkd0knf", name: "Stone Call" },
      { level: 3, id: "dkv9v4verb82fmpx", name: "Meld into Stone" },
      { level: 4, id: "l83djt5019ujasjh", name: "Wall of Stone" },
      { level: 5, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 6, id: "wgm8mm1za909pwch", name: "Stone Tell" },
      { level: 7, id: "g52zx1t1giteg5h1", name: "Statue" },
      { level: 8, id: "oeemcnfjod9zd7my", name: "Repel Metal or Stone" },
      { level: 9, id: "o8jhvddxgunzx94i", name: "Clashing Rocks" },
    ],
    ability: {
      name: "Touch of Acid",
      summary:
        "Standard action melee touch attack: 1d6 acid damage + 1 per 2 shaman levels. Usable 3 + Cha modifier times/day; at 11th level the shaman's weapons are treated as corrosive.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Stone): Body of
    // Earth's DR is unconditional, same shape and same promotion as Bones'
    // Shard Soul above; its stone-explosion burst is a separate standard-
    // action, 3/day, 1d4-round-cooldown attack, so that half stays
    // prose-only. True ("Elemental Form") is a once/day activated
    // polymorph. Manifestation's acid resistance 30 is likewise
    // unconditional and promotes (same `eres.*` highest-wins coexistence
    // with Body of Earth's DR as Flame's fire resistance tiers); its free
    // metamagic-on-a-spell clause has no matching engine target, so stays
    // prose-only.
    greaterAbility: {
      name: "Body of Earth",
      summary:
        "Gain DR 2/adamantine, increasing by 1 for every 4 shaman levels beyond 8th. As a standard action, explode jagged stone in a 10-foot burst dealing 1d6 piercing damage per 2 shaman levels (Reflex halves); usable 3 times/day, waiting 1d4 rounds between uses.",
      changes: [c("2 + floor((@classes.shaman.level - 8) / 4)", "dr.adamantine")],
    },
    trueAbility: {
      name: "Elemental Form",
      summary:
        "Standard action: assume the form of a Huge or smaller earth elemental (as elemental body IV) for 1 hour per level. Usable once/day.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain acid resistance 30. You may apply Enlarge Spell, Extend Spell, Silent Spell, or Still Spell to any acid or earth spell you cast without increasing its level or casting time, without needing the feat.",
      changes: [c("30", "eres.acid")],
    },
    hexes: [
      hex(
        "stone",
        "crystalSight",
        "Crystal Sight",
        "See through stone, earth, or sand as if they were transparent, for a number of rounds/day.",
      ),
      hex(
        "stone",
        "lodestone",
        "Lodestone",
        "Curse a creature to become heavy and lethargic, imposing a penalty to speed and Reflex saves.",
      ),
      hex(
        "stone",
        "metalCurse",
        "Metal Curse",
        "Curse a creature to become slightly magnetic, taking an AC penalty against metal weapons.",
      ),
      hex(
        "stone",
        "stoneStability",
        "Stone Stability",
        "Gain a bonus to CMD against bull rush and trip attempts, plus related bonus feats at higher levels.",
      ),
      hex(
        "stone",
        "wardOfStone",
        "Ward of Stone",
        "Grant a touched creature temporary damage reduction 5/adamantine.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks stony, with gemstones embedded in its flesh, and gains DR 5/adamantine.",
  },
  {
    tag: "waves",
    name: "Waves",
    spiritMagicSpells: [
      { level: 1, id: "ohy0ty2dawfaaqwd", name: "Hydraulic Push" },
      { level: 2, id: "7fvsn0gbv6ynlp63", name: "Slipstream" },
      { level: 3, id: "7m5us8d4a9lwh1ap", name: "Water Breathing" },
      { level: 4, id: "ijui94bv4uzu8awb", name: "Wall of Ice" },
      { level: 5, id: "nll8ip8348eti0ff", name: "Geyser" },
      { level: 6, id: "h4nlrm44ubsyzuhz", name: "Fluid Form" },
      { level: 7, id: "tpid8izzs2rrfxv3", name: "Vortex" },
      { level: 8, id: "o4rwtizvdj7216qd", name: "Seamantle" },
      { level: 9, id: "ltda70etgwje43x6", name: "Tsunami" },
    ],
    ability: {
      name: "Wave Strike",
      summary:
        "Standard action melee touch attack that drenches and shoves a creature: 1d6 nonlethal damage + 1 per 2 shaman levels, pushed 5 ft. directly away from the shaman.",
    },
    // RAW (aonprd.com, ShamanSpiritDisplay.aspx?ItemName=Waves): Fluid
    // Mastery's swim speed equal to base land speed is unconditional in
    // isolation, but `rage-powers.ts`'s Bestial Swimmer entry already
    // rejects this identical shape ("a swimSpeed formula can't see the final
    // post-bonus land speed" - the roll-data land speed a Change formula can
    // read is the PRE-bonus base, per `compute.ts`, so a swimSpeed Change
    // here would miss any other landSpeed bonus the shaman also has), so it
    // stays prose-only for the same reason; its breathe-underwater rider has
    // no matching engine target either, and its ice/water cone is a
    // separate standard-action attack. True ("Elemental Form") is a once/day
    // activated polymorph. Manifestation's cold resistance 30 is
    // unconditional and promotes; its free metamagic-on-a-spell clause has
    // no matching engine target, so stays prose-only.
    greaterAbility: {
      name: "Fluid Mastery",
      summary:
        "Gain a swim speed equal to your base land speed and the ability to breathe underwater. As a standard action, unleash a 15-foot cone dealing 1d4 cold damage per 2 shaman levels and pushing creatures 5 ft. away (Reflex halves damage and negates the push); usable 3 times/day, waiting 1d4 rounds between uses.",
    },
    trueAbility: {
      name: "Elemental Form",
      summary:
        "Standard action: assume the form of a Huge or smaller water elemental (as elemental body IV) for 1 hour per level. Usable once/day.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain cold resistance 30. You may apply Enlarge Spell, Extend Spell, Silent Spell, or Still Spell to any cold or water spell you cast without increasing its level or casting time, without needing the feat.",
      changes: [c("30", "eres.cold")],
    },
    hexes: [
      hex(
        "waves",
        "beckoningChill",
        "Beckoning Chill",
        "Curse a creature within range with a penalty to Fortitude saves against cold and exhaustion/fatigue effects.",
      ),
      hex(
        "waves",
        "crashingWaves",
        "Crashing Waves",
        "Knock a creature within range prone with a wave of force unless it succeeds on a Reflex save.",
      ),
      hex(
        "waves",
        "fluidMagic",
        "Fluid Magic",
        "The shaman's spells with the cold or water descriptor are treated as if empowered a limited number of times/day.",
      ),
      hex(
        "waves",
        "mistsShroud",
        "Mist's Shroud",
        "Conjure a cloud of concealing mist in a radius around the shaman.",
      ),
      hex(
        "waves",
        "waterSight",
        "Water Sight",
        "See through fog without penalty; scry using any pool of water.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal's skin ripples like a disturbed pond; it gains Mobility as a bonus feat (ignoring prerequisites) and can breathe underwater.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Ancestors (Cohorts and Companions)
  {
    tag: "ancestors",
    name: "Ancestors",
    spiritMagicSpells: [
      { level: 1, id: "jhyb2ana8jrk2lut", name: "Unseen Servant" },
      { level: 2, id: "avofn5q2v0f0qxjy", name: "Spiritual Weapon" },
      { level: 3, id: "vqfrp8t0c1lw1jna", name: "Heroism" },
      { level: 4, id: "0lrux8tmaml5fkw6", name: "Spiritual Ally" },
      { level: 5, id: "3lfx1ccxo2hdqrf3", name: "Telekinesis" },
      { level: 6, id: "z0duc2v2n3ioynta", name: "Greater Heroism" },
      { level: 7, id: "btccs4sjo2nog1a0", name: "Ethereal Jaunt" },
      { level: 8, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 9, id: "lnahlmp5mih2ongh", name: "Astral Projection" },
    ],
    ability: {
      name: "Ancestor's Council",
      summary:
        "Standard action: grant an ally within 30 ft. a +2 bonus on the next attack roll, saving throw, ability check, or skill check before the shaman's next turn. Usable 3 + Cha modifier times per day.",
    },
    greaterAbility: {
      name: "Ancestral Weapon",
      summary:
        "Standard action: summon an appropriately sized simple or martial weapon with a +1 enhancement bonus, always wielded proficiently. The bonus improves at 15th and 19th level, and the weapon gains ghost touch at 11th. Usable minutes per day equal to the shaman's level, in 1-minute increments; the weapon vanishes 1 round after leaving her grasp.",
    },
    trueAbility: {
      name: "Ancestral Guardian",
      summary:
        "Once per day as a standard action, cast planar ally as a spell-like ability at no cost to the shaman, though the ally summoned still demands its usual payment.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain a bonus on Will saves equal to the shaman's Charisma modifier, blindsense 60 ft., and a +4 caster level bonus for divination spells (the caster level bonus has no engine target and isn't reflected in Changes below).",
      // RAW (aonprd.com, Ancestors): "She gains a bonus on Will saving
      // throws equal to her Charisma modifier, blindsense out to a range of
      // 60 feet, and a +4 bonus to her caster level for all divination
      // spells." Unconditional, no action, no per-day limit - both the save
      // bonus (`will`, not `allSavingThrows` - RAW names Will specifically)
      // and blindsense (`sensebse`) have clean engine targets; the
      // divination-only caster level bonus doesn't (no per-school CL Change
      // exists anywhere in this engine) and stays prose only.
      changes: [c("@abilities.cha.mod", "will"), c("60", "sensebse")],
    },
    hexes: [
      hex(
        "ancestors",
        "ancestralBlessing",
        "Ancestral Blessing",
        "Grant an ally within 30 ft. a +1 competence bonus on attack and damage rolls until it lands a hit; only one blessing can be active at a time. The bonus improves at 8th and 16th level.",
      ),
      hex(
        "ancestors",
        "ghostBlade",
        "Ghost Blade",
        "Touch a creature to grant all of the shaman's weapons the ghost touch property for a number of rounds equal to her Charisma bonus; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "ancestors",
        "intercessor",
        "Intercessor",
        "Question an intact humanoid or monstrous humanoid corpse as speak with dead, but only a single question, and never on an animated or undead body.",
      ),
      hex(
        "ancestors",
        "mightOfTheFallen",
        "Might of the Fallen",
        "Standard action: cure 1 point of temporary ability damage on a touched creature (1d4 points at 7th level); the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "ancestors",
        "wisdomOfTheAges",
        "Wisdom of the Ages",
        // RAW: "use her Wisdom modifier instead of her Intelligence modifier
        // on all Intelligence-based skill checks." A substitution of which
        // ability score feeds a skill, not an added number - no Change
        // target fits (same gap Lore's Benefit of Wisdom hex has below).
        "Use Wisdom instead of Intelligence for all Intelligence-based skill checks.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal has streaks of gray or silver in its hide, hair, or fur and a wispy mustache or bushy eyebrows of facial hair, and can speak and understand a number of bonus languages equal to the shaman's Charisma bonus.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Dark+Tapestry (Horror Realms)
  {
    tag: "dark_tapestry",
    name: "Dark Tapestry",
    spiritMagicSpells: [
      { level: 1, id: "ja005kj1gh7g0dnk", name: "Entropic Shield" },
      { level: 2, id: "gl524v9qd5jji2ex", name: "Contact Entity I" },
      { level: 3, id: "6g7x08y9nl7vlffv", name: "Contact Entity II" },
      { level: 4, id: "wralcmyi4tdcai24", name: "Black Tentacles" },
      { level: 5, id: "0n789r9rokr1ktd1", name: "Contact Entity III" },
      { level: 6, id: "66vvhyiy5q8yzbq2", name: "Feeblemind" },
      { level: 7, id: "6kn3xjxysd4b3t6a", name: "Contact Entity IV" },
      { level: 8, id: "s6q72tw2zra9sycu", name: "Insanity" },
      { level: 9, id: "4qriqew7d2ot7wr5", name: "Interplanetary Teleport" },
    ],
    ability: {
      name: "Touch of the Void",
      summary:
        "Standard action melee touch attack: 1d6 cold damage + 1 per 2 shaman levels. At 10th level, a struck creature must save or be fatigued for half the shaman's level in rounds. Usable 3 + Cha modifier times per day.",
    },
    greaterAbility: {
      name: "Horrific Glimpse",
      summary:
        "Once per day after an hour of meditation, gain the effect of contact other plane, answered by an alien mind rather than a chosen plane (using the Wisdom save DC 16 instead of Intelligence to avoid the usual mental strain). Once per day afterward, the shaman can also show the vision to another creature as phantasmal killer, except it always deals 1d4+1 Wisdom damage regardless of the save.",
    },
    trueAbility: {
      name: "Unbound Form",
      summary:
        "Assume a variety of forms as greater polymorph for a number of minutes per day equal to the shaman's level, in 1-minute increments; the assumed form always shows some subtly alien tell.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain DR 5/-, immunity to acid, critical hits, and sneak attacks (the sneak-attack immunity has no matching engine target and isn't reflected in Changes below); once per day, cast shapechange as a spell-like ability into a form that never looks natural to the shaman's home world.",
      // RAW (aonprd.com, Dark Tapestry): "She gains damage reduction 5/- and
      // immunity to acid, critical hits, and sneak attacks." DR, acid
      // immunity, and critical-hit immunity all have clean targets (`dr`
      // bare, `imm.acid`, `immEffect.criticalHits`); sneak-attack immunity
      // has no matching slug of its own — `immEffect.precisionDamage` is the
      // closest entry in `defenses.ts`'s closed vocabulary, but it covers
      // ALL precision damage (e.g. a Vital Strike-stacked hit), wider than
      // "sneak attack" alone, so using it would overstate this ability and
      // it stays prose only rather than borrow a broader slug.
      changes: [c("5", "dr"), c("1", "imm.acid"), c("1", "immEffect.criticalHits")],
    },
    hexes: [
      hex(
        "dark_tapestry",
        "alienSummons",
        "Alien Summons",
        "Whenever the shaman calls or summons creatures, one arrives with the advanced simple template, its warped anatomy immune to critical hits and precision damage.",
      ),
      hex(
        "dark_tapestry",
        "brainDrain",
        "Brain Drain",
        "Standard action: probe an intelligent creature's mind within 60 ft. for 1d6 damage per 2 shaman levels (Will negates and reveals the source); on a hit, spend a full-round action to make one Knowledge check using the victim's bonus instead of the shaman's own.",
      ),
      hex(
        "dark_tapestry",
        "cloakOfDarkness",
        "Cloak of Darkness",
        "Conjure a shadowy cloak granting a +4 force-effect armor bonus to AC (increasing every 4 levels from 7th on), usable for 1 hour per shaman level in 1-hour increments.",
      ),
      hex(
        "dark_tapestry",
        "maddeningWhispers",
        "Maddening Whispers",
        "At will as a standard action, whisper incomprehensible words into a target's mind within 30 ft., confusing it for 1 round on a failed Will save (longer at 8th and 16th level); the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "dark_tapestry",
        "pierceTheVeil",
        "Pierce the Veil",
        // RAW (aonprd.com, Dark Tapestry, confirmed via direct fetch): "The
        // shaman gains darkvision to a range of up to 30 feet. If the
        // shaman already has darkvision, its range increases by 30 feet. At
        // 8th level, this ability becomes enhanced, allowing the shaman to
        // see perfectly in darkness of any kind, even that created by
        // deeper darkness." Different range and gate level than the
        // same-named Oracle Dark Tapestry mystery revelation
        // (`oracle-revelations.ts`'s `dark_tapestry:pierceTheVeil`, 60 ft./
        // 11th) - same shape as that file's `shadow:pierceTheShadows`: an
        // additive `sensedv` grant (`operator: "add"`, so no existing
        // darkvision resolves to 0 + 30, not competing with it) plus a
        // level-gated `sensesid` flag. A hex's `changes[]` has no level-gate
        // mechanism of its own in `collect.ts` (a picked hex just applies
        // once its spirit is current) - the 8th-level gate is wired the same
        // way every other level-gated Change in this file that ISN'T one of
        // the three fixed tiers handles it: baked directly into the formula
        // with `if(gte(@classes.shaman.level, 8), 1, 0)`, the exact pattern
        // `oracle-revelations.ts` uses for this same pair of abilities.
        "Gain darkvision 30 ft. (or +30 ft. to darkvision already possessed). At 8th level, see perfectly in any darkness, including that from a deeper darkness spell.",
        [
          c("30", "sensedv", "untyped", "add"),
          c("if(gte(@classes.shaman.level, 8), 1, 0)", "sensesid", "untyped", "set"),
        ],
      ),
    ],
    spiritAnimalNote:
      "The spirit animal has an alien physiology: a swim or climb speed matching its best speed, one natural weapon with 5 ft. more reach (or a new tentacle attack if it had none).",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Frost (Heroes of Golarion)
  {
    tag: "frost",
    name: "Frost",
    spiritMagicSpells: [
      { level: 1, id: "grgpvfexq2dh31fq", name: "Frostbite" },
      { level: 2, id: "jgx8sur7w4k93mql", name: "Elemental Touch (Cold Only)" },
      { level: 3, id: "q35l6m4pggb4y98v", name: "Elemental Aura (Cold Only)" },
      { level: 4, id: "t1uhggjfimtabp4v", name: "Ice Storm" },
      { level: 5, id: "hd7ukybisvv7j5r6", name: "Summon Monster V (Ice Elementals Only)" },
      { level: 6, id: "ol05jfb606v0lzj9", name: "Freezing Sphere" },
      { level: 7, id: "qubzqiz5mqs8tbqr", name: "Ice Body" },
      { level: 8, id: "8jq1atxonnerix55", name: "Polar Ray" },
      { level: 9, id: "ezpm33cvtlq8aswa", name: "Mass Icy Prison" },
    ],
    ability: {
      name: "Ice Splinter",
      summary:
        "Standard action ranged touch attack: shoot icicles for 1d6 piercing damage + 1 per 2 shaman levels. Usable 3 + Cha modifier times per day; at 11th level, the shaman's wielded weapons count as frost weapons.",
    },
    greaterAbility: {
      name: "Frigid Blast",
      summary:
        "Gain cold resistance 10. As a standard action, summon a 20 ft. burst of cold dealing 1d6 damage per shaman level (Reflex halves) up to three times per day, waiting 1d4 rounds between uses.",
      // RAW (aonprd.com, Frost, confirmed via direct fetch): "The shaman
      // gains cold resistance 10." A flat, unconditional, always-on
      // resistance bundled with an activated blast - the same "promote the
      // passive half, leave the activated half prose" posture this file's
      // own Flame's Fiery Soul (fire resistance 10, cone stays prose) and
      // Bones'/Stone's Shard Soul/Body of Earth (DR, burst stays prose)
      // already establish for a mixed ability, so this follows the same
      // precedent rather than staying display-only just because part of the
      // ability is activated. Matches the `eres.cold` convention already
      // used throughout (e.g. `bloodlines.ts`'s draconic bloodline).
      changes: [c("10", "eres.cold")],
    },
    trueAbility: {
      name: "Guardian of the North",
      summary:
        "Once per day as a standard action, assume the form of a dire bear, dire tiger, mastodon, or woolly rhinoceros as beast shape IV, for 1 hour per level.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain immunity to cold, and may apply Enlarge, Extend, Silent, or Still Spell to any cold-descriptor spell without a level increase or the feat itself.",
      // RAW: "The shaman gains immunity to cold." Unconditional, always on;
      // the metamagic-without-the-feat clause has no engine target (not a
      // flat number) and stays prose.
      changes: [c("1", "imm.cold")],
    },
    hexes: [
      hex(
        "frost",
        "bitingFrost",
        "Biting Frost",
        "Chill the air around a target within 30 ft. for a number of rounds equal to the shaman's Charisma modifier; a failed Fortitude save each round deals 1d6 nonlethal cold damage, and a success ends the effect early.",
      ),
      hex(
        "frost",
        "hypothermia",
        "Hypothermia",
        "Afflict a target within 30 ft. with hypothermia, fatiguing it for 2 rounds on a failed Fortitude save (longer at 8th and 16th level); the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "frost",
        "sluggish",
        "Sluggish",
        "Halve a target's speed within 30 ft. for a number of rounds equal to the shaman's character level unless it saves; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "frost",
        "tundraDweller",
        "Tundra Dweller",
        "Touch a willing creature to grant cold resistance 10 for a number of rounds equal to the shaman's Charisma modifier (longer at 8th and 16th level); doesn't stack with other cold resistance.",
      ),
      hex(
        "frost",
        "wildsAttuned",
        "Wilds-Attuned",
        // RAW: Animal Affinity bonus feat, plus "+4 insight bonus on
        // Knowledge (nature) checks when in a cold climate" - conditional
        // on location, so stays display-only.
        "Gain Animal Affinity as a bonus feat and a +4 insight bonus on Knowledge (nature) checks while in a cold climate.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal is dusted with glimmering frost, breathes visible mist regardless of temperature, and gains resistance 5 to cold and electricity.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Lore (Advanced Class Guide)
  {
    tag: "lore",
    name: "Lore",
    spiritMagicSpells: [
      { level: 1, id: "llxrra87kbofmyhl", name: "Identify" },
      { level: 2, id: "m1rmcpcaixcpz9ib", name: "Tongues" },
      { level: 3, id: "tcnirpnzjdaym1fd", name: "Locate Object" },
      { level: 4, id: "b5mz8voksps5g4yq", name: "Legend Lore" },
      { level: 5, id: "68ngvzmzvadhf6vs", name: "Contact Other Plane" },
      { level: 6, id: "14chms7xurvi85x9", name: "Mass Owl's Wisdom" },
      { level: 7, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 8, id: "2vb5orfcy57lrfmc", name: "Moment of Prescience" },
      { level: 9, id: "7mstq5c76h3e6zzx", name: "Time Stop" },
    ],
    ability: {
      name: "Monstrous Insight",
      summary:
        "Standard action: attempt a Knowledge check to identify a creature with an insight bonus equal to the shaman's level; either way, gain a +2 insight bonus for 1 minute on attack rolls against it and to AC against its attacks. Usable 3 + Cha modifier times per day.",
    },
    greaterAbility: {
      name: "Automatic Writing",
      summary:
        "Once per day, spend 10 minutes in meditation to receive an automatic-writing vision functioning as divination at 90% effectiveness; usable an additional time per day at 12th, 16th, and 20th level.",
    },
    trueAbility: {
      name: "Perfect Knowledge",
      summary:
        "Gain the benefit of tongues permanently, plus a +10 competence bonus on all Knowledge, Linguistics, and Spellcraft checks.",
      // RAW (aonprd.com, Lore, confirmed via direct fetch): "She also gains
      // a +10 competence bonus on all Knowledge, Linguistics, and
      // Spellcraft checks." Unconditional, always on. `skill.knowledge` is
      // an existing compound-skill alias (`tables.ts`'s `SKILL_GROUPS`,
      // fanning out to every Knowledge subskill); `lin`/`spl` are their own
      // skill ids.
      changes: [
        c("10", "skill.knowledge", "competence"),
        c("10", "skill.lin", "competence"),
        c("10", "skill.spl", "competence"),
      ],
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, take 20 on all Knowledge checks (even untrained), and cast wish once per day at no material cost, though it can't grant ability score bonuses or replicate spells with a costly material component.",
    },
    hexes: [
      hex(
        "lore",
        "arcaneEnlightenment",
        "Arcane Enlightenment",
        "Add a number of sorcerer/wizard spells equal to the shaman's Charisma modifier (minimum 1) to her preparable spell list, cast as divine using Wisdom-based DCs but requiring the usual Intelligence score to cast; swap one out on each new level.",
      ),
      hex(
        "lore",
        "benefitOfWisdom",
        "Benefit of Wisdom",
        // Same substitution shape as Ancestors' Wisdom of the Ages above -
        // no Change target fits swapping which ability feeds a skill.
        "Use Wisdom instead of Intelligence for all Intelligence-based skill checks.",
      ),
      hex(
        "lore",
        "brainDrain",
        "Brain Drain",
        "Standard action: probe an intelligent enemy's mind within 30 ft. for 1d4 damage per 2 shaman levels on a failed Will save; on a hit, make one Knowledge check the following round using the victim's bonus instead of the shaman's own.",
      ),
      hex(
        "lore",
        "confusionCurse",
        "Confusion Curse",
        "Curse an intelligent target within 30 ft. to become confused for a number of rounds equal to the shaman's Charisma modifier unless it saves; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "lore",
        "shareKnowledge",
        "Share Knowledge",
        "Share the shaman's languages and Knowledge skill bonus with a willing ally within 30 ft. for a number of minutes equal to her Charisma modifier; the same creature can't be affected again for 24 hours.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal seems quiet and unassuming, gaining a +2 bonus on initiative checks and a +4 bonus on Stealth checks.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Mammoth (Adventurer's Guide / Advanced Class Origins)
  {
    tag: "mammoth",
    name: "Mammoth",
    spiritMagicSpells: [
      { level: 1, id: "jnlr9cuepka1l26e", name: "Enlarge Person" },
      { level: 2, id: "05i5rxwim12hwktu", name: "Bull's Strength" },
      { level: 3, id: "8u1xa5javcxc6szk", name: "Rage" },
      { level: 4, id: "knyako6zopc1chrv", name: "Stoneskin" },
      { level: 5, id: "w88ddxpu89qcr5c0", name: "Beast Shape III" },
      { level: 6, id: "hzkaqaa8n6ygwmub", name: "Tar Pool" },
      { level: 7, id: "jjmoi5qbwkbguzbn", name: "Summon Nature's Ally VII" },
      { level: 8, id: "ukacuu0cvdjkqxwu", name: "Frightful Aspect" },
      { level: 9, id: "0mt9mso6wdhfafpo", name: "Polar Midnight" },
    ],
    ability: {
      name: "Powerful Smash",
      summary:
        "Standard action unarmed strike (as though the shaman had Improved Unarmed Strike); a hit forces a Fortitude save or the target is dazed for 1 round. Usable 3 + Cha modifier times per day.",
    },
    greaterAbility: {
      name: "Strength of the Beast",
      summary:
        "Gain a +2 enhancement bonus to Strength, increasing by 2 more at 14th and 20th level (18th level instead, for a wandering spirit).",
      // RAW (aonprd.com, Mammoth, confirmed via direct fetch): "The shaman
      // gains a +2 enhancement bonus to her Strength score. This bonus
      // increases by 2 every 6 shaman levels thereafter (at 14th and 20th
      // levels for her spirit, and at 18th level for her wandering spirit)."
      // Unconditional, always on. The engine has no "wandering spirit"
      // concept at all (grep across packages/engine and the web model turns
      // up nothing), so this Change only encodes the SPIRIT track's 14th/
      // 20th thresholds; a shaman who took Mammoth as a wandering spirit
      // would see the 14th/20th-keyed number here instead of the correct
      // 18th-only bump - flagging rather than guessing at how a future
      // wandering-spirit feature would want this parameterized.
      changes: [
        c(
          "2 + if(gte(@classes.shaman.level, 14), 2, 0) + if(gte(@classes.shaman.level, 20), 2, 0)",
          "str",
          "enhancement",
        ),
      ],
    },
    trueAbility: {
      name: "Megafauna Companion",
      summary:
        "The spirit animal transforms into a megafauna animal companion (arsinoitherium, baluchitherium, mastodon, and similar creatures), using the shaman's level as its effective druid level while keeping its Intelligence and spirit-animal abilities.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, transform into any megafauna or elephant creature as beast shape IV, activating and dismissing the effect at will with permanent duration.",
    },
    hexes: [
      hex(
        "mammoth",
        "burdenOfTheBeast",
        "Burden of the Beast",
        "Make a creature within 30 ft. act as though carrying a heavier load (up to reduced Dex cap, armor check penalty, and a 5 ft. speed) for a number of rounds equal to the shaman's level unless it saves; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "mammoth",
        "mammothsHide",
        "Mammoth's Hide",
        "Touch a willing ally to grant a +2 enhancement bonus to natural armor and cold resistance 5 for 10 minutes (both scaling at 9th and 15th level). Usable 3 + Cha bonus times per day.",
      ),
      hex(
        "mammoth",
        "phantomStampede",
        "Phantom Stampede",
        "Buffet a creature with ghostly herd beasts (no saving throw, no damage) for a number of rounds equal to the shaman's level: a -4 penalty to CMD against bull rush, overrun, and trip, and a -4 penalty on concentration checks; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "mammoth",
        "primalSpeaker",
        "Primal Speaker",
        "Speak with mammoths, other megafauna, and elephants as speak with animals; gain a Handle Animal bonus with them at 5th level and, at 10th, the ability to charm one such creature once per 24 hours.",
      ),
      hex(
        "mammoth",
        "thunderFoot",
        "Thunder Foot",
        // RAW: "For the purpose of the overrun combat maneuver, she treats
        // her shaman level as her base attack bonus when calculating her
        // CMB and CMD." A base-value substitution scoped to one specific
        // maneuver, not an added number - no Change target fits (same gap
        // as the Ancestors/Lore Wisdom-substitution hexes above, just for a
        // combat maneuver instead of a skill).
        "Treat the shaman's level as her base attack bonus for CMB and CMD when overrunning; gain Improved Overrun as a bonus feat at 7th level and Greater Overrun at 11th, ignoring prerequisites.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks more primal and prehistoric, with a +2 inherent bonus to Strength that it loses if it later manifests as a megafauna companion.",
  },
  // Vendored JSON (packages/data-pipeline/data/shaman-spirits.json, key
  // "restoration"), no standalone aonprd.com ShamanSpiritDisplay.aspx page —
  // Restoration is a "spirit specialization" (Advanced Class Guide's generic
  // specialization rules, this one from Healer's Handbook): a narrower
  // variant of the Life spirit, presented as the one worked example inline
  // on aonprd.com's general "Shaman Spirit Specializations" page
  // (ShamanSpirits.aspx) rather than as its own indexed entry, so a direct
  // per-spirit fetch (the verification method used for the other 9 splatbook
  // spirits above) isn't available for this one. Verified instead against
  // d20pfsrd.com/classes/hybrid-classes/shaman/ (this project's established
  // OGL clean-room reference — see NOTICE.md), which corroborates the
  // vendored JSON on every fact: Restoration replaces Curse of Suffering and
  // Deny Succor with Shell of Succor and Spirit Boost, replaces the
  // 1st-level spirit-magic spell (Detect Undead) with Remove Sickness, and
  // its True Spirit Ability is Spirit of Life — keeping the rest of Life's
  // spirit magic list, Enhanced Cures/Life Link/Life Sight hexes, and
  // Channel ability verbatim. Associated spirit: Life. Sources: Advanced
  // Class Guide, Healer's Handbook.
  {
    tag: "restoration",
    name: "Restoration",
    spiritMagicSpells: [
      { level: 1, id: "770nro22rs4fxz7y", name: "Remove Sickness" },
      { level: 2, id: "fxz69pwpqt9b6uss", name: "Lesser Restoration" },
      { level: 3, id: "6l904edkt8jv9jor", name: "Neutralize Poison" },
      { level: 4, id: "anya5qwdjhdfyk8u", name: "Restoration" },
      { level: 5, id: "qiiis9ekgy3syu7j", name: "Breath of Life" },
      { level: 6, id: "4re1j2w8wkvsvnsi", name: "Heal" },
      { level: 7, id: "igmb8lisqcnsxd2d", name: "Greater Restoration" },
      { level: 8, id: "klcvk9ct1l7mhjwp", name: "Mass Heal" },
      { level: 9, id: "mxqi375ya2rka7cp", name: "True Resurrection" },
    ],
    ability: {
      name: "Channel",
      summary:
        "Channel positive energy like a cleric, using the shaman's level as her effective cleric level for the amount healed/dealt and the save DC. Usable 1 + Cha modifier times per day (same ability as the Life spirit's own Channel).",
    },
    // d20pfsrd.com confirms the vendored text verbatim: "The shaman gains a
    // +4 bonus on Heal checks." Same shape and same promotion as Life's own
    // Healer's Touch above (`skill.hea`, untyped, unconditional); the
    // standard-action mass-stabilize half of the ability is a separate
    // activated power and stays prose-only, same split Life's own entry uses.
    greaterAbility: {
      name: "Healer's Touch",
      summary:
        "Gain a +4 bonus on Heal checks. As a standard action, move up to half your speed and touch up to six dying creatures, automatically stabilizing each one.",
      changes: [c("4", "skill.hea")],
    },
    trueAbility: {
      name: "Spirit of Life",
      summary:
        "The spirit animal can cast stabilize at will as a spell-like ability, and the shaman can transfer any cure spell she casts to it as a swift action (as imbue with spell ability) for the animal to hold and later use.",
    },
    // d20pfsrd.com confirms the vendored text verbatim, matching Life's own
    // Manifestation fact-for-fact: death-effects, fatigue, and exhaustion
    // immunity all have `immEffect.*` slugs and promote; bleed,
    // negative-energy, nauseated, and sickened immunity have no matching
    // slug in `defenses.ts`'s closed vocabulary and stay prose, as do the
    // ability-damage floor, the automatic massive-damage saves, and the
    // raised death threshold.
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain immunity to bleed, death attacks, and negative energy, plus immunity to the exhausted, fatigued, nauseated, and sickened conditions; ability damage/drain can't drop any score below 1, massive-damage saves always succeed, and death from negative hit points is delayed until double the shaman's Constitution score.",
      changes: [
        c("1", "immEffect.deathEffects"),
        c("1", "immEffect.fatigue"),
        c("1", "immEffect.exhaustion"),
      ],
    },
    hexes: [
      hex(
        "restoration",
        "enhancedCures",
        "Enhanced Cures",
        "The maximum hit points a cure spell can heal is based on the shaman's level rather than the spell's own cap (same hex as the Life spirit's own Enhanced Cures).",
      ),
      hex(
        "restoration",
        "lifeLink",
        "Life Link",
        "Bond to a creature within 30 ft.: each round it's 5 or more hit points below full, it heals 5 and the shaman takes 5 damage instead. One bond per shaman level (same hex as the Life spirit's own Life Link).",
      ),
      hex(
        "restoration",
        "lifeSight",
        "Life Sight",
        "Sense whether creatures within 30 ft. are living, wounded, dying, dead, or afflicted by a listed condition; at 12th level, sense all nearby living creatures as blindsight. Usable a number of rounds per day equal to the shaman's level (same hex as the Life spirit's own Life Sight).",
      ),
      hex(
        "restoration",
        "shellOfSuccor",
        "Shell of Succor",
        "Touch a creature to grant temporary hit points equal to the shaman's Wisdom bonus plus 1d6 per 2 shaman levels (max 10d6), lasting minutes equal to the shaman's level and always lost before any other temporary hit points. Usable 1 + Cha bonus times per day.",
      ),
      hex(
        "restoration",
        "spiritBoost",
        "Spirit Boost",
        "When a healing spell would heal a target beyond its maximum hit points, the excess persists as temporary hit points for 1 round per shaman level, up to the shaman's level.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks unusually healthy and vibrant, and gains (or improves by 1) fast healing.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Slums (Heroes of the Streets)
  {
    tag: "slums",
    name: "Slums",
    spiritMagicSpells: [
      { level: 1, id: "tjog6bufg5b08lvq", name: "Charm Person" },
      { level: 2, id: "vxi9c3xwa83xthka", name: "Summon Swarm" },
      { level: 3, id: "78kwl5t99j9e8tzh", name: "Hold Person" },
      { level: 4, id: "n0bsyxchnigkkuqo", name: "Confusion" },
      { level: 5, id: "l83djt5019ujasjh", name: "Wall of Stone" },
      { level: 6, id: "446vcsetq4ny904e", name: "Mislead" },
      { level: 7, id: "uddlhatt6uq4e5yf", name: "Mass Hold Person" },
      { level: 8, id: "hi72gh3dlf7a1qyt", name: "Maze" },
      { level: 9, id: "esia6azb5g68tfs7", name: "Imprisonment" },
    ],
    ability: {
      name: "Doors to Everywhere",
      summary:
        "Standard action: step through a door and exit through another, self only (as jester's jaunt, upgrading to dimension door at 9th level and tree stride, treating doors as trees, at 14th). Usable 3 times per day, plus one more at 12th and 20th level.",
    },
    greaterAbility: {
      name: "City's Shroud",
      summary:
        "While in an urban environment, gain the evasion and improved uncanny dodge class features (conditional on location, so not modeled as a Change).",
    },
    trueAbility: {
      name: "Paragon of the City",
      summary:
        "Standard action: assume a paragon form for 1 minute or until dismissed, gaining sneak attack as a rogue of the shaman's level. Usable 3 + Cha modifier times per day.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain immunity to all diseases and poisons; while in an urban environment, also gain a +4 insight bonus to AC and Reflex saves (the location-conditional part isn't modeled as a Change).",
      // RAW (aonprd.com, Slums, confirmed via direct fetch): "She is immune
      // to all diseases and poisons." Unconditional, always on - both
      // `disease` and `poison` are in `defenses.ts`'s closed `immEffect.*`
      // vocabulary. The AC/Reflex bonus is explicitly gated on "in an urban
      // environment," a location this engine has no state for, so it stays
      // prose only.
      changes: [c("1", "immEffect.disease"), c("1", "immEffect.poison")],
    },
    hexes: [
      hex(
        "slums",
        "accident",
        "Accident",
        "Trip a target within 30 ft. with a caster level check against its CMD; a fall deals 1d6 damage, and a target near a pit or drop-off risks falling in.",
      ),
      hex(
        "slums",
        "badPenny",
        "Bad Penny",
        "Curse a coin so its next bearer takes a -2 penalty on saves and skill checks while carrying it (-4 at 8th level); cursing a new coin ends the old curse.",
      ),
      hex(
        "slums",
        "citySpirit",
        "City Spirit",
        "Swift action: gain a +4 bonus on Dexterity- and Wisdom-based skill checks for a number of rounds per day equal to 3 + the shaman's Charisma modifier.",
      ),
      hex(
        "slums",
        "wardOfTheCity",
        "Ward of the City",
        "Touch a creature to grant a fading ward: +5 on saves against disease and poison and +25% to negate critical hits and sneak attacks, dropping each time it triggers (both bonuses scale up at 8th and 16th level); the same creature can't be warded again for 24 hours.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal looks leaner and hungrier than its kind, gaining a +4 bonus on initiative checks.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Tribe (Wilderness Origins)
  {
    tag: "tribe",
    name: "Tribe",
    spiritMagicSpells: [
      { level: 1, id: "wa0zb2pncesmm9lz", name: "Bless" },
      { level: 2, id: "menqakfoa1ftvi3f", name: "Shield Other" },
      { level: 3, id: "qn947hen3wrelxhz", name: "Create Food and Water" },
      { level: 4, id: "0lrux8tmaml5fkw6", name: "Spiritual Ally" },
      { level: 5, id: "f6lqt3ju8m7r5la2", name: "Life Bubble" },
      { level: 6, id: "eg3i21asvo69mbma", name: "Battlemind Link" },
      { level: 7, id: "aqeaxoaozlv9vg35", name: "Vision" },
      { level: 8, id: "gw2sgj93dgarpem8", name: "Discern Location" },
      { level: 9, id: "klcvk9ct1l7mhjwp", name: "Mass Heal" },
    ],
    ability: {
      name: "Tribal Cooperation",
      summary:
        "Gain a teamwork feat as a bonus feat (meeting its prerequisites). As a standard action, share that feat with allies within 30 ft. who can see and hear the shaman for several rounds, ignoring prerequisites. Usable 3 + Cha modifier times per day.",
    },
    greaterAbility: {
      name: "Tribal Bond",
      summary:
        "Once per day, when communing with the spirit animal to regain spells, designate a number of creatures equal to half the shaman's level as an honorary tribe, sharing constant telepathic communication as telepathic bond.",
    },
    trueAbility: {
      name: "Guardian of the Tribe",
      summary:
        "Cast a harmless touch spell at range on a tribal-bond member within 30 ft., a number of times per day equal to the shaman's Charisma modifier (minimum 1); also stay constantly aware of every bonded member's condition, as status.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain a bonus on all saving throws equal to the shaman's Charisma modifier and immunity to compulsion spells and spell-like abilities; once per day, revive a recently deceased tribal-bond member as breath of life at any range on the same plane, restoring 10 hit points per shaman level (max 200).",
      // RAW (aonprd.com, Tribe, confirmed via direct fetch): "She gains a
      // bonus on all of her saving throws equal to her Charisma modifier
      // and becomes immune to compulsion spells and spell-like abilities."
      // No bonus type stated (untyped), unconditional, always on - a real
      // ALL-saves bonus (`allSavingThrows`), unlike Ancestors' Manifestation
      // above which names Will specifically; the once-per-day revive is
      // activated and stays prose.
      changes: [c("@abilities.cha.mod", "allSavingThrows"), c("1", "immEffect.compulsion")],
    },
    hexes: [
      hex(
        "tribe",
        "curseOfFaltering",
        "Curse of Faltering",
        "Immediate action: when an enemy within 30 ft. threatens a critical hit, force it to reroll the attack with a penalty equal to the shaman's Charisma modifier unless it saves; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "tribe",
        "curseOfIsolation",
        "Curse of Isolation",
        "Deny an enemy within 30 ft. the benefit of flanking, aid another, and morale bonuses for a number of rounds equal to the shaman's level unless it saves; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "tribe",
        "steadfastExample",
        "Steadfast Example",
        "Touch a willing creature so its next Will save can use the shaman's Will bonus instead of its own; only one creature can be affected at a time, and the same creature can't be affected again for 24 hours.",
      ),
      hex(
        "tribe",
        "threateningCoordination",
        "Threatening Coordination Hex",
        "Make squares adjacent to the shaman's allies count as difficult terrain for a target within 30 ft., for rounds equal to the shaman's level (just 1 round if it saves); the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "tribe",
        "touchOfSuccor",
        "Touch of Succor",
        "Standard action: touch a willing creature to remove fatigued, shaken, or sickened (adding confused and frightened at 8th level, and dazed/nauseated/panicked at 12th). Usable times per day equal to the shaman's level.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal bears markings resembling the shaman's tribal totem, and its aid another bonus improves by 1.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Wind (Advanced Class Guide)
  {
    tag: "wind",
    name: "Wind",
    spiritMagicSpells: [
      { level: 1, id: "nkd3xocluvt1rovu", name: "Alter Winds" },
      { level: 2, id: "cnuin981hdq7ryit", name: "Gust of Wind" },
      { level: 3, id: "fe8jy0h1l3su2322", name: "Cloak of Winds" },
      { level: 4, id: "4gxx3bodf76e63en", name: "River of Wind" },
      { level: 5, id: "g9koefk7x9szoheo", name: "Control Winds" },
      { level: 6, id: "nk37t5em8q4v1djs", name: "Sirocco" },
      { level: 7, id: "578t0lra5ll3aifs", name: "Control Weather" },
      { level: 8, id: "i9greyz3c0ap32vi", name: "Whirlwind" },
      { level: 9, id: "lun2gymejsmkjg4g", name: "Winds of Vengeance" },
    ],
    ability: {
      name: "Shocking Touch",
      summary:
        "Standard action melee touch attack: 1d6 electricity damage + 1 per 2 shaman levels. Usable 3 + Cha modifier times per day; at 11th level, the shaman's wielded weapons count as shocking weapons.",
    },
    greaterAbility: {
      name: "Spark Soul",
      summary:
        "Gain electricity resistance 10. As a standard action, unleash a 20 ft. line of sparks for 1d4 damage per shaman level (Reflex halves), up to three times per day, waiting 1d4 rounds between uses.",
      // RAW (aonprd.com, Wind, confirmed via direct fetch): "The shaman
      // gains electricity resistance 10." Unconditional, always on, bundled
      // with an activated line-attack - same mixed-ability partial-promotion
      // posture as Frost's Frigid Blast above (and this file's pre-existing
      // Fiery Soul/Shard Soul/Body of Earth precedent).
      changes: [c("10", "eres.electricity")],
    },
    trueAbility: {
      name: "Elemental Form",
      summary:
        "Once per day as a standard action, assume the form of a Huge or smaller lightning elemental, as elemental body IV, for 1 hour per level.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, gain electricity resistance 30, and may apply Enlarge, Extend, Silent, or Still Spell to any air or electricity spell without a level increase or the feat itself.",
      // RAW (aonprd.com, Wind, confirmed via direct fetch): "The shaman
      // gains electricity resistance 30." Unconditional, always on; the
      // metamagic-without-the-feat clause has no engine target and stays
      // prose. Same-type resistance doesn't stack (`defenses.ts`), so this
      // simply supersedes Spark Soul's 10 once a 20th-level shaman has both
      // - no double-counting risk from promoting both.
      changes: [c("30", "eres.electricity")],
    },
    hexes: [
      hex(
        "wind",
        "airBarrier",
        "Air Barrier",
        "Conjure an invisible shell of air granting a +4 armor bonus to AC (increasing every 4 levels from 7th on, and a 50% ranged miss chance at 13th), usable for 1 hour per shaman level in 1-hour increments.",
      ),
      hex(
        "wind",
        "sparkingAura",
        "Sparking Aura",
        "Cause a target within 30 ft. to shed light and spark: it loses the benefit of concealment or invisibility, and takes electricity damage equal to the shaman's Charisma modifier whenever struck by a metal melee weapon, for rounds equal to half the shaman's level.",
      ),
      hex(
        "wind",
        "vortexSpells",
        "Vortex Spells",
        "Confirming a critical hit with a spell staggers the target for 1 round (1d4 rounds at 11th level).",
      ),
      hex(
        "wind",
        "windSight",
        "Wind Sight",
        "Ignore Perception penalties from wind and the first 100 ft. of distance; at 7th level, use clairaudience/clairvoyance along any unobstructed path for air, usable a number of rounds per day equal to the shaman's level.",
      ),
      hex(
        "wind",
        "windWard",
        "Wind Ward",
        "Touch a willing creature (including the shaman) to grant a 20% miss chance against ranged attacks for rounds equal to the shaman's level (a longer duration at 8th, a 50% miss chance at 16th); the same creature can't be warded again for 24 hours.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal crackles harmlessly with electricity, shedding candlelight as it moves, and gains electricity resistance 10.",
  },
  // https://aonprd.com/ShamanSpiritDisplay.aspx?ItemName=Wood (Ultimate Wilderness / Heroes of the Wild)
  {
    tag: "wood",
    name: "Wood",
    spiritMagicSpells: [
      { level: 1, id: "v05u8sl116ab2n9c", name: "Shillelagh" },
      { level: 2, id: "la7kuehewu85ybnt", name: "Barkskin" },
      { level: 3, id: "jsvjsax2eabrlx8g", name: "Minor Creation (Wood Items Only)" },
      { level: 4, id: "818uuekrao87o57u", name: "Thorn Body" },
      { level: 5, id: "6x6epf4g5wgzl1gh", name: "Tree Stride" },
      { level: 6, id: "xmacjpo6tgm1xhnv", name: "Ironwood" },
      { level: 7, id: "3fravqa4vrm4ygkr", name: "Transmute Metal to Wood" },
      { level: 8, id: "cp5m19me647dojha", name: "Changestaff" },
      { level: 9, id: "9fd7mcoint902oyb", name: "Wooden Phalanx" },
    ],
    ability: {
      name: "Tree Limb",
      summary:
        "Swift action: turn an arm into a branch-like limb, dropping anything held and gaining a slam attack (1d8 for a Medium shaman) until the shaman's next turn. Usable 3 + Cha modifier times per day; reach improves at 8th level, and both arms can transform at 16th.",
    },
    greaterAbility: {
      name: "Bloody Roots",
      summary:
        "Standard action: conjure a stationary field of roots as black tentacles (caster level equal to shaman level), harmless to the shaman but difficult terrain for her allies, dismissible as a free action. Usable a number of rounds per day equal to 3 + the shaman's Charisma modifier.",
    },
    trueAbility: {
      name: "Tree Form",
      summary:
        "Once per day as a standard action, assume the form of a plant creature as plant shape III, for 1 hour per level.",
    },
    manifestation: {
      name: "Manifestation",
      summary:
        "At 20th level, become a living creature of wood: treated as a plant creature for spells and effects, +4 natural armor, DR 10/- against wooden weapons and the natural attacks of wooden or wood-like creatures, immunity to paralysis, poison, polymorph, sleep, and stun, and the ability to meld into any wood at will.",
      // RAW (aonprd.com, Wood, confirmed via direct fetch): "she gains a +4
      // natural armor bonus to her Armor Class... She gains immunity to
      // paralysis, poison, polymorph, sleep, and stun." Unconditional,
      // always on. `nac` (natural armor, typed "natural" - same convention
      // as `witch-hexes.ts`'s natural-armor hexes) and four of the five
      // listed immunities (`paralysis`, `poison`, `sleep`, `stunned`) all
      // have clean targets in `defenses.ts`'s closed vocabularies.
      // `polymorph` is NOT in `EFFECT_IMMUNITY_LABELS` (no
      // `immEffect.polymorph` slug exists anywhere in this engine) so it's
      // left prose-only rather than inventing one; the DR against wooden
      // weapons/wood-creature natural attacks is too narrow a bypass
      // qualifier to model and also stays prose.
      changes: [
        c("4", "nac", "natural"),
        c("1", "immEffect.paralysis"),
        c("1", "immEffect.poison"),
        c("1", "immEffect.sleep"),
        c("1", "immEffect.stunned"),
      ],
    },
    hexes: [
      hex(
        "wood",
        "hexOfLignification",
        "Hex of Lignification",
        "Turn a target within 30 ft. into a stiff, tree-like shape for 2 rounds unless it saves: hardness 5, but staggered; the same creature can't be targeted again for 24 hours.",
      ),
      hex(
        "wood",
        "naturesGifts",
        "Nature's Gifts",
        "Once per day, command plants to yield magical berries functioning as goodberry, capped at the shaman's Charisma modifier (minimum 1) in healed hit points per day.",
      ),
      hex(
        "wood",
        "spinesAndBrambles",
        "Spines and Brambles",
        "Conjure light undergrowth in a number of squares within 30 ft. equal to the shaman's Charisma modifier (minimum 1), passable by the shaman alone; using the hex again withers the old undergrowth.",
      ),
      hex(
        "wood",
        "verdantPath",
        "Verdant Path",
        "Gain woodland stride; at 8th level, use air walk at will within 10 ft. of a tree, ending the instant the shaman moves farther away.",
      ),
      hex(
        "wood",
        "whisperingLeaves",
        "Whispering Leaves",
        "Within 10 ft. of a tree or undergrowth, cast whispering wind as a spell-like ability into a leafy area at caster level equal to shaman level; at 8th level, also listen to the target area as clairaudience/clairvoyance for the message's one round.",
      ),
    ],
    spiritAnimalNote:
      "The spirit animal resembles a wooden figurine or tree branch when still, and gains the freeze universal monster ability.",
  },
];

export const SHAMAN_SPIRITS: Record<string, ShamanSpiritDef> = Object.fromEntries(
  SPIRIT_LIST.map((s) => [s.tag, s]),
);

export const SHAMAN_SPIRIT_TAGS: readonly string[] = SPIRIT_LIST.map((s) => s.tag);

/** All hex defs available to a given spirit tag, in table order. */
export function hexesForSpirit(spiritTag: string): ShamanSpiritHex[] {
  return SHAMAN_SPIRITS[spiritTag]?.hexes ?? [];
}

/** Look up a single hex def by its `<spiritTag>:<camelCaseName>` id, across every spirit. */
export function findShamanHex(hexId: string): ShamanSpiritHex | undefined {
  const spiritTag = hexId.split(":")[0];
  if (!spiritTag) return undefined;
  return SHAMAN_SPIRITS[spiritTag]?.hexes.find((h) => h.id === hexId);
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.shamanSpirits` is the FULL published catalog (18 entries after junk
 * filtering), prose only — same "catalog from data, mechanics as overlay"
 * pattern as `rage-powers.ts`'s `mergedRagePowerCatalog`. The hand-verified
 * 18-spirit table above stays authoritative for spirit magic
 * spells/ability/hexes; this section merges the two for browsing (kept in
 * place for any future spirit a later splatbook pack adds that this table
 * hasn't caught up to yet).
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 18 hand-authored
 * spirits): all 18 matched a vendored entry by normalized name (the vendored
 * dictionary keys ARE this table's own `tag`s, verified) — no aliasing
 * needed.
 */

const SHAMAN_SPIRIT_NAME_ALIASES: Record<string, string> = {};

function normalizeSpiritName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** A catalog entry the picker can browse — either the hand-authored def with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedShamanSpiritEntry extends ShamanSpiritDef {
  description?: string;
  sources?: SourceRef[];
  /** True for a vendored-only spirit with no hand-authored spirit magic/ability/hex data — the picker's "M" (modeled) badge convention. */
  displayOnly: boolean;
}

function vendoredSpiritToDef(entry: ShamanSpirit): MergedShamanSpiritEntry {
  return {
    tag: entry.id,
    name: entry.name,
    spiritMagicSpells: [],
    ability: { name: "", summary: "" },
    greaterAbility: { name: "", summary: "" },
    trueAbility: { name: "", summary: "" },
    manifestation: { name: "", summary: "" },
    hexes: [],
    spiritAnimalNote: "",
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/** Resolve a picked spirit tag (`doc.build.shamanSpirit`) to its definition — hand-authored table first, falling back to the vendored catalog for a tag that only exists there. */
export function resolveShamanSpirit(
  tag: string,
  refData: RefData,
): MergedShamanSpiritEntry | undefined {
  const hand = SHAMAN_SPIRITS[tag];
  if (hand) return { ...hand, displayOnly: false };
  const vendored = refData.shamanSpirits?.[tag];
  return vendored ? vendoredSpiritToDef(vendored) : undefined;
}

/** The full picker-browsable catalog: every vendored spirit, with any that collides (by normalized name) against a hand-authored entry replaced by that def, plus any hand-authored entry with no vendored counterpart appended. */
export function mergedShamanSpiritCatalog(refData: RefData): MergedShamanSpiritEntry[] {
  const handByNormName = new Map<string, ShamanSpiritDef>();
  for (const s of SPIRIT_LIST) {
    handByNormName.set(normalizeSpiritName(SHAMAN_SPIRIT_NAME_ALIASES[s.tag] ?? s.name), s);
  }

  const usedHandTags = new Set<string>();
  const merged: MergedShamanSpiritEntry[] = [];
  for (const v of Object.values(refData.shamanSpirits ?? {})) {
    const handMatch = handByNormName.get(normalizeSpiritName(v.name));
    if (handMatch) {
      usedHandTags.add(handMatch.tag);
      merged.push({
        ...handMatch,
        description: v.description,
        sources: v.sources,
        displayOnly: false,
      });
    } else {
      merged.push(vendoredSpiritToDef(v));
    }
  }
  for (const s of SPIRIT_LIST) {
    if (!usedHandTags.has(s.tag)) merged.push({ ...s, displayOnly: false });
  }
  return merged;
}
