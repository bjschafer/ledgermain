/**
 * Clean-room PF1 shaman spirit table (Advanced Class Guide, DESIGN §6,
 * issue #65): hand-authored, mirroring `oracle-mysteries.ts`'s posture
 * closely — a shaman's Spirit class feature is structurally the oracle's
 * Mystery under a different name (per the vendored `spirit.yaml` class
 * feature: "If the shaman takes levels in another class that grants a
 * mystery (such as the oracle), the spirit and mystery must match"), but its
 * SPIRIT MAGIC spell list is NOT byte-identical to the matching oracle
 * mystery's bonus-spell list (verified during authoring — e.g. Waves' 1st
 * spirit-magic spell is Hydraulic Push, not the Waves mystery's Touch of the
 * Sea), so it is hand-copied from the shaman-specific vendored YAML rather
 * than reused from `ORACLE_MYSTERIES`.
 *
 * Scope: the 8 Advanced Class Guide "core" spirits (Battle, Bones, Flame,
 * Heavens, Life, Nature, Stone, Waves — verified against aonprd.com's
 * "Spirits - Shaman" index). The vendored Foundry pack ships several more
 * from later splatbooks (Ancestors, Dark Tapestry, Frost, Lore, Mammoth,
 * Slums, Tribe, Wind, Wood — see `packs/class-abilities/shaman-spirits/`),
 * out of scope, same posture as `oracle-mysteries.ts`'s 10-of-many scope note.
 *
 * Data provenance:
 *   - `spiritMagicSpells` ids are copied VERBATIM from the `@UUID[Compendium.
 *     pf1.spells.<id>]` references embedded in each spirit's OWN vendored
 *     prose (`packs/class-abilities/shaman-spirits/<spirit>.*.yaml` —
 *     individually vendored, like oracle mysteries, but NOT linked from the
 *     Shaman class def, which only links the generic "Spirit" stub — same
 *     "hand-author from the cached-but-unlinked YAML" shape `oracle-
 *     mysteries.ts`/`psychic-disciplines.ts` already use). `level` here is
 *     the SPELL's own level (1st-9th), NOT a shaman class-level threshold —
 *     unlike `OracleMysteryBonusSpell.level`, because the vendored prose
 *     itself labels each entry "1st -", "2nd -", ... "9th -" by spell level
 *     directly (RAW: "she has one spell slot per day of each shaman spell
 *     level she can cast" — availability is gated by
 *     `accessibleSpellLevels(CASTER_MODELS.shaman, shamanLevel)`, evaluated
 *     in `apps/web/src/model/spellcasting.ts`'s `shamanSpiritSpellsKnown`,
 *     not a fixed per-spell unlock level baked into this table).
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
 *   - `hexes`: each spirit grants access to 5 exclusive hexes via the
 *     shaman's Hex/Wandering Hex class features (see `model/shamanHexes.ts`
 *     for the pick-level budget). Verified against a legacy.aonprd.com mirror
 *     of the published Advanced Class Guide per-spirit text (paizo.com's own
 *     PRD page redirects there). Almost every hex is a foe/ally-targeted,
 *     activated, or limited-duration ability with no flat always-on number
 *     on the shaman's OWN sheet, so stays `displayOnly: true` (`changes:
 *     []`) — same bar `shaman-hexes.ts` (the general catalog) applies. One
 *     promotion (issue #75-style, same bar as `oracle-revelations.ts`'s
 *     promoted set): `flame:cinderDance` grants a genuine unconditional
 *     +10 ft. to base land speed (Ex, no action, no per-day limit — see its
 *     entry's citation); its two bonus-feat grants (Nimble Moves,
 *     Acrobatic Steps) have no Change target for a specific named feat, so
 *     stay prose-only. Two close near-misses, deliberately left blocked:
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
 *     these apply, level-gated at the thresholds above). Most of these 24 entries
 *     are activated (swift/standard action, per-day limited) or conditional
 *     on a trigger state (reduced below 0 hp, standing on the ground) and
 *     stay prose-only, same as the bulk of `hexes`; the handful that do
 *     promote are noted per entry: Heavens' Void Adaptation (darkvision 60
 *     ft., the same shape as `oracle-revelations.ts`'s
 *     `dark_tapestry:pierceTheVeil`) and Manifestation (a flat bonus to all
 *     saves equal to Wisdom modifier, plus fear immunity); Bones' Shard Soul
 *     and Stone's Body of Earth (both a scaling DR, the ability's own attack
 *     piece stays prose-only); Flame's Fiery Soul/Manifestation and Stone's
 *     and Waves' Manifestation (flat energy resistance, same "same qualifier
 *     doesn't stack, highest wins" resolution `defenses.ts` already gives
 *     `eres.*`, so a tier-1 resistance and a later tier-3 one coexist for
 *     free); and Life's Healer's Touch (a flat Heal-check bonus) and
 *     Manifestation (death-effect immunity only — RAW also grants bleed and
 *     negative-energy immunity, but neither has an `immEffect.*` slug in
 *     `defenses.ts`'s closed vocabulary, so those two stay prose-only rather
 *     than inventing one).
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
 * Issue #74: `RefData.shamanSpirits` is the FULL published catalog
 * (18 entries after junk filtering), prose only — same "catalog from data,
 * mechanics as overlay" pattern as `rage-powers.ts`'s
 * `mergedRagePowerCatalog`. The hand-verified 8-core-spirit table above
 * stays authoritative for spirit magic spells/ability/hexes; this section
 * merges the two for browsing.
 *
 * Matching is by NORMALIZED NAME. Collision audit (all 8 hand-authored
 * spirits): all 8 matched a vendored entry by normalized name (the vendored
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
