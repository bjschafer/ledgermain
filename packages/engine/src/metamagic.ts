/**
 * Clean-room PF1 Metamagic feat table: hand-authored from the published rules
 * (cross-checked against aonprd.com's metamagic-feat pages — no Foundry system
 * code consulted, per CLAUDE.md). The vendored Foundry data pack tags 84
 * feats `"Metamagic"` but carries no structured slot-level adjustment (it
 * lives only in each feat's prose), so this registry supplies the one number
 * the tracker actually needs to model: how many spell-slot levels applying the
 * feat raises the prepared/cast slot.
 *
 * Keyed by name slug (see `featNameSlug`), for the same reason `feat-effects.ts`
 * is: Foundry feat ids are opaque UUIDs that may change between data versions,
 * so a slug from the canonical name is the stable, human-authorable key.
 * Lookup path: `doc.build.feats` → `refData.feats[id].name` → slug.
 *
 * Honesty bar: the SLOT-LEVEL accounting is the modeled part. The feat's
 * numeric effect on the spell itself (Empower's +50%, Maximize's maximized
 * dice, Widen's doubled area, …) is a display-only `note`, never a sheet
 * number — the engine does not, and deliberately will not, recompute a spell's
 * damage/area/duration. The one exception is that a metamagic feat's slot
 * increase does NOT change the spell's EFFECTIVE level for save-DC /
 * concentration purposes — RAW, those still use the spell's actual level —
 * EXCEPT Heighten Spell, which genuinely raises the spell's effective level
 * ("all effects dependent on spell level are calculated according to the
 * heightened level"). `raisesEffectiveLevel` flags that single case so callers
 * can keep the save DC honest.
 */

/** Normalize a feat name to its slug key. Re-exported from `feat-effects.ts` to avoid a cycle at call sites. */
import { featNameSlug } from "./feat-effects.js";

export interface MetamagicDef {
  /** Name slug (see `featNameSlug`) — the map key. */
  slug: string;
  /** Feat display name. */
  name: string;
  /**
   * Spell-slot levels this feat adds to the prepared/cast slot. For a
   * `variable` feat this is the minimum (and default) increase; the player
   * may choose more, up to `maxIncrease` (Reach) or `9 - spellLevel` (Heighten).
   */
  slotIncrease: number;
  /**
   * True when the level increase is player-chosen rather than fixed: Reach
   * Spell (+1 per range-category step, 1–3) and Heighten Spell (raise to any
   * higher level). Fixed feats omit this.
   */
  variable?: boolean;
  /** Maximum chosen increase for a `variable` feat with a hard cap (Reach = 3). Heighten is capped per-spell (`9 - spellLevel`) at the call site instead. */
  maxIncrease?: number;
  /**
   * True ONLY for Heighten Spell: the slot increase also raises the spell's
   * effective level for every level-dependent effect (save DC, concentration
   * DC, dispel checks, …). Every other metamagic leaves the effective level —
   * and therefore the save DC — unchanged.
   */
  raisesEffectiveLevel?: boolean;
  /** At-table reminder of the feat's mechanical effect. Display-only context, never a sheet number. */
  note: string;
}

/**
 * The 84 metamagic feats in the vendored slice, by name slug. Values verified
 * against each feat's published Benefits text (see the feat's `description`
 * in `packages/data-pipeline/data/feats.json`); the Core Rulebook ten were
 * additionally cross-checked against aonprd.com's metamagic-feat pages.
 */
export const METAMAGIC_FEATS: Readonly<Record<string, MetamagicDef>> = {
  "apocalyptic-spell": {
    slug: "apocalyptic-spell",
    name: "Apocalyptic Spell",
    slotIncrease: 1,
    note: "Instantaneous area spells only. The area becomes difficult terrain and imposes a penalty on Climb, Fly, and Swim checks equal to the spell's original level, lasting that many rounds. Gains the evil descriptor: can't be applied to spells with the good descriptor.",
  },
  "aquatic-spell": {
    slug: "aquatic-spell",
    name: "Aquatic Spell",
    slotIncrease: 1,
    note: "Functions normally underwater with no caster level check, and can be cast from the surface into water.",
  },
  "ascendant-spell": {
    slug: "ascendant-spell",
    name: "Ascendant Spell",
    slotIncrease: 5,
    note: "Uses the mythic version of the spell, but doesn't count as mythic for effects that key off that, and can't use the mythic augment or spend mythic power.",
  },
  "authoritative-spell": {
    slug: "authoritative-spell",
    name: "Authoritative Spell",
    slotIncrease: 2,
    note: "Single-target spells only. On a failed save, the target can't perform one action type you chose (move closer, move away, melee attack, ranged attack, or cast an offensive or nonoffensive spell) on its next turn. Gains the lawful descriptor and is mind-affecting: can't be applied to spells with the chaotic descriptor.",
  },
  "benthic-spell": {
    slug: "benthic-spell",
    name: "Benthic Spell",
    slotIncrease: 1,
    note: "Acid, cold, electricity, or fire spells only. Replaces or splits the spell's damage with bludgeoning damage delivered through pressurized water, gaining the water descriptor; the bludgeoning portion still counts as magic for bypassing damage reduction.",
  },
  "blissful-spell": {
    slug: "blissful-spell",
    name: "Blissful Spell",
    slotIncrease: 1,
    note: "Single-target spells only. On a failed save, an offensive spell gives a 1 round penalty to attack and damage rolls; a beneficial spell instead grants a 1 round morale bonus to skill checks and saves. Gains the good descriptor and is mind-affecting: can't be applied to spells with the evil descriptor.",
  },
  "bouncing-spell": {
    slug: "bouncing-spell",
    name: "Bouncing Spell",
    slotIncrease: 1,
    note: "Single-target spells only. If the spell fails against its target (spell resistance or a successful save), you may redirect it as a swift action to another eligible target in range.",
  },
  "brackish-spell": {
    slug: "brackish-spell",
    name: "Brackish Spell",
    slotIncrease: 0,
    note: "Water descriptor spells only. Surrounds you with a sheath of salt water that grants DR against piercing equal to the spell's level, for 1 round after casting.",
  },
  "brisk-spell": {
    slug: "brisk-spell",
    name: "Brisk Spell",
    slotIncrease: 0,
    note: "Spells that grant a new movement type only. Increases the speed of that movement type by 10 feet.",
  },
  "burning-spell": {
    slug: "burning-spell",
    name: "Burning Spell",
    slotIncrease: 2,
    note: "Acid or fire spells only. A creature damaged by the spell takes the same damage type again, equal to twice the spell's actual level, at the start of its next turn.",
  },
  "centered-spell": {
    slug: "centered-spell",
    name: "Centered Spell",
    slotIncrease: 0,
    note: "Instantaneous area spells only. Excludes you, and an adjacent, smaller familiar, from the spell's own area.",
  },
  "cherry-blossom-spell": {
    slug: "cherry-blossom-spell",
    name: "Cherry Blossom Spell",
    slotIncrease: 3,
    note: "Damaging spells only. A creature damaged by the spell also takes 2 points of damage to a chosen physical or mental ability trio, with a Fortitude save to negate if the spell doesn't normally allow one. Ageless or immortal creatures are immune.",
  },
  "coaxing-spell": {
    slug: "coaxing-spell",
    name: "Coaxing Spell",
    slotIncrease: 2,
    note: "Mind-affecting spells only. Affects mindless oozes and vermin as though they weren't immune to mind-affecting effects; no effect on other creatures.",
  },
  "concussive-spell": {
    slug: "concussive-spell",
    name: "Concussive Spell",
    slotIncrease: 2,
    note: "Sonic descriptor spells only. A creature damaged by the spell takes a penalty to attack rolls, saves, skill checks, and ability checks for a number of rounds equal to the spell's actual level.",
  },
  "conditional-spell": {
    slug: "conditional-spell",
    name: "Conditional Spell",
    slotIncrease: 1,
    note: "Lets you set a condition on the spell's benefit when you cast it, per the conditional favor rules. State the condition at casting time.",
  },
  "consecrate-spell": {
    slug: "consecrate-spell",
    name: "Consecrate Spell",
    slotIncrease: 2,
    note: "Treated as a maximized spell against evil creatures and creatures with the evil subtype; no change against anyone else. Doesn't stack with Maximize Spell.",
  },
  "contagious-spell": {
    slug: "contagious-spell",
    name: "Contagious Spell",
    slotIncrease: 2,
    note: "Targeted, harmful spells only, not personal range. If a caster fails a dispel check against the spell by 5 or more, the spell spreads to that caster instead, as though newly cast on them.",
  },
  "contingent-spell": {
    slug: "contingent-spell",
    name: "Contingent Spell",
    slotIncrease: 2,
    note: "Cure spells, breath of life, and other harmless restorative spells only. Infuses the target with a dormant copy that triggers later under a condition you set at casting.",
  },
  "crypt-spell": {
    slug: "crypt-spell",
    name: "Crypt Spell",
    slotIncrease: 1,
    note: "Damaging spells only. A creature that dies within 1 round of taking damage counts as killed by a death effect for raising purposes; undead damaged by it are sickened. Gains the death descriptor.",
  },
  "dazing-spell": {
    slug: "dazing-spell",
    name: "Dazing Spell",
    slotIncrease: 3,
    note: "Damaging spells only. A creature damaged by the spell becomes dazed for a number of rounds equal to the spell's original level, negated by the spell's own save if it has one.",
  },
  "delayed-spell": {
    slug: "delayed-spell",
    name: "Delayed Spell",
    slotIncrease: 1,
    note: "Spells that target a square or intersection only. Can be triggered as a standard action any time within 1 minute per spell level of casting; the target can't be changed once cast.",
  },
  "disruptive-spell": {
    slug: "disruptive-spell",
    name: "Disruptive Spell",
    slotIncrease: 1,
    note: "Targets must make a concentration check to cast spells or spell-like abilities for 1 round, DC equal to this spell's save DC plus the level of the spell they're casting.",
  },
  "echoing-spell": {
    slug: "echoing-spell",
    name: "Echoing Spell",
    slotIncrease: 3,
    note: "Lets you cast the spell a second time that day without spending another slot or preparation.",
  },
  "eclipsed-spell": {
    slug: "eclipsed-spell",
    name: "Eclipsed Spell",
    slotIncrease: 0,
    note: "Spells that create light or darkness only. Lets you shift the spell's illumination effect up or down by the corresponding number of light level steps, instead of its normal effect.",
  },
  "ectoplasmic-spell": {
    slug: "ectoplasmic-spell",
    name: "Ectoplasmic Spell",
    slotIncrease: 1,
    note: "Has full effect against incorporeal or ethereal creatures.",
  },
  "elemental-spell": {
    slug: "elemental-spell",
    name: "Elemental Spell",
    slotIncrease: 1,
    note: "Replaces or splits the spell's damage with a chosen energy type: acid, cold, electricity, or fire. Can be taken more than once for different energy types.",
  },
  "empower-spell": {
    slug: "empower-spell",
    name: "Empower Spell",
    slotIncrease: 2,
    note: "Variable, numeric effects (damage, healing, ability drain, etc.) increased by half (+50%). Does not affect the spell's save DC.",
  },
  "encouraging-spell": {
    slug: "encouraging-spell",
    name: "Encouraging Spell",
    slotIncrease: 1,
    note: "Increases any morale bonus the spell grants by 1.",
  },
  "enlarge-spell": {
    slug: "enlarge-spell",
    name: "Enlarge Spell",
    slotIncrease: 1,
    note: "Range doubled (close/medium/long only).",
  },
  "extend-spell": {
    slug: "extend-spell",
    name: "Extend Spell",
    slotIncrease: 1,
    note: "Duration doubled (only for spells with a duration measured in rounds/minutes/hours).",
  },
  "familiar-spell": {
    slug: "familiar-spell",
    name: "Familiar Spell",
    slotIncrease: 3,
    note: "Transfers a prepared spell to your familiar for it to cast later at your caster level, using the familiar's own ability scores for attack rolls. Storage is capped by your caster level.",
  },
  "fearsome-spell": {
    slug: "fearsome-spell",
    name: "Fearsome Spell",
    slotIncrease: 2,
    note: "A creature that fails its save against the spell, or, for spells without a save, fails a Will save, becomes shaken for rounds equal to the spell's original level. Can't cause frightened.",
  },
  "flaring-spell": {
    slug: "flaring-spell",
    name: "Flaring Spell",
    slotIncrease: 1,
    note: "Fire, light, or electricity descriptor spells only. A creature that takes fire or electricity damage from the spell becomes dazzled for rounds equal to the spell's actual level.",
  },
  "fleeting-spell": {
    slug: "fleeting-spell",
    name: "Fleeting Spell",
    slotIncrease: 0,
    note: "Spells lasting at least 2 rounds only, not instantaneous or permanent. Becomes dismissible as a swift action, harder to detect once dismissed, easier to dispel, and lasts only half as long.",
  },
  "focused-spell": {
    slug: "focused-spell",
    name: "Focused Spell",
    slotIncrease: 1,
    note: "Multi-target spells only. Increases the save DC by 2 against one target you choose before casting.",
  },
  "furious-spell": {
    slug: "furious-spell",
    name: "Furious Spell",
    slotIncrease: 1,
    note: "Damaging spells only. Adds twice the spell's original level to the damage dealt, once per target. Can be cast while raging, even with an emotion component.",
  },
  "heighten-spell": {
    slug: "heighten-spell",
    name: "Heighten Spell",
    slotIncrease: 1,
    variable: true,
    raisesEffectiveLevel: true,
    note: "Treated as a higher-level spell for ALL level-dependent effects, including save DC. Choose how many levels to raise it (up to 9th).",
  },
  "intensified-spell": {
    slug: "intensified-spell",
    name: "Intensified Spell",
    slotIncrease: 1,
    note: "Raises the spell's maximum number of damage dice by 5 caster levels' worth, if you have the caster level to exceed the normal cap.",
  },
  "intuitive-spell": {
    slug: "intuitive-spell",
    name: "Intuitive Spell",
    slotIncrease: 1,
    note: "Cast with no thought component.",
  },
  "jinxed-spell": {
    slug: "jinxed-spell",
    name: "Jinxed Spell",
    slotIncrease: 1,
    note: "A creature that fails its save against the spell also suffers your jinx. No effect on spells without a saving throw.",
  },
  "latent-curse": {
    slug: "latent-curse",
    name: "Latent Curse",
    slotIncrease: 1,
    note: "Curse descriptor spells only. Instead of targeting a creature, imbues an object; the curse takes effect on the next creature to handle it. Recovering the spent slot requires dispelling the latent curse.",
  },
  "lingering-spell": {
    slug: "lingering-spell",
    name: "Lingering Spell",
    slotIncrease: 1,
    note: "Instantaneous area spells only. The area persists until the start of your next turn, affecting creatures or objects that enter it; a visible lingering spell also obscures vision.",
  },
  "logical-spell": {
    slug: "logical-spell",
    name: "Logical Spell",
    slotIncrease: 1,
    note: "Cast with no emotion component.",
  },
  "maximize-spell": {
    slug: "maximize-spell",
    name: "Maximize Spell",
    slotIncrease: 3,
    note: "Variable, numeric effects maximized (no roll); random variables (e.g. targets hit) still roll. Does not affect the spell's save DC.",
  },
  "merciful-spell": {
    slug: "merciful-spell",
    name: "Merciful Spell",
    slotIncrease: 0,
    note: "Damaging spells only. Deals nonlethal damage instead of lethal, keeping its normal damage type.",
  },
  "murky-spell": {
    slug: "murky-spell",
    name: "Murky Spell",
    slotIncrease: 0,
    note: "Underwater-only mist or fog spells (cloudkill, fog cloud, mind fog, obscuring mist, solid fog, or similar). Clouds the water with sediment at one tenth the spell's normal duration; has no effect above water.",
  },
  "persistent-spell": {
    slug: "persistent-spell",
    name: "Persistent Spell",
    slotIncrease: 2,
    note: "Spells that allow a save only. A creature that succeeds on its save must save again; failing the second save applies the spell's full effect.",
  },
  "piercing-spell": {
    slug: "piercing-spell",
    name: "Piercing Spell",
    slotIncrease: 1,
    note: "Treats a target's spell resistance as 5 lower than actual.",
  },
  "quicken-spell": {
    slug: "quicken-spell",
    name: "Quicken Spell",
    slotIncrease: 4,
    note: "Cast as a swift action (one quickened spell per turn); does not provoke.",
  },
  "reach-spell": {
    slug: "reach-spell",
    name: "Reach Spell",
    slotIncrease: 1,
    variable: true,
    maxIncrease: 3,
    note: "Range increased one category per +1 slot level (touch → close → medium → long).",
  },
  "rime-spell": {
    slug: "rime-spell",
    name: "Rime Spell",
    slotIncrease: 1,
    note: "Cold descriptor spells only. A creature that takes cold damage from the spell becomes entangled for rounds equal to the spell's original level.",
  },
  "scarring-spell": {
    slug: "scarring-spell",
    name: "Scarring Spell",
    slotIncrease: 1,
    note: "Emotion or fear descriptor spells only. A creature that fails its save takes a saving throw penalty against emotion and fear effects for the next 24 hours: 2 against effects you create, 1 against others. Penalties from multiple castings don't stack.",
  },
  "scouting-summons": {
    slug: "scouting-summons",
    name: "Scouting Summons",
    slotIncrease: 2,
    note: "Single-creature summoning spells only. Lets you possess the summoned creature as per magic jar, with no receptacle needed; taking damage while possessing it risks ejection.",
  },
  "seeking-spell": {
    slug: "seeking-spell",
    name: "Seeking Spell",
    slotIncrease: 2,
    note: "Spells that target a creature or require a ranged touch attack, with more than touch range. The spell's path bends around obstacles to reach its target and ignores cover and concealment, but still fails if it would travel farther than its maximum range.",
  },
  "selective-spell": {
    slug: "selective-spell",
    name: "Selective Spell",
    slotIncrease: 1,
    note: "Instantaneous area spells only. Lets you exclude a number of targets in the area equal to your bonus spell ability modifier.",
  },
  "shadow-grasp": {
    slug: "shadow-grasp",
    name: "Shadow Grasp",
    slotIncrease: 1,
    note: "Area spells with the darkness descriptor only. Creatures in the area become entangled while they remain there and for 1 round after leaving, negated by a save if the spell allows one or a Reflex save otherwise. Never impedes you.",
  },
  "sickening-spell": {
    slug: "sickening-spell",
    name: "Sickening Spell",
    slotIncrease: 2,
    note: "Damaging spells only. A creature damaged by the spell becomes sickened for rounds equal to the spell's original level, negated by the spell's own save if it has one.",
  },
  "silent-spell": {
    slug: "silent-spell",
    name: "Silent Spell",
    slotIncrease: 1,
    note: "Cast with no verbal component.",
  },
  "snuffing-spell": {
    slug: "snuffing-spell",
    name: "Snuffing Spell",
    slotIncrease: 2,
    note: "Spells that target a creature only. The first time the target is damaged by or fails its save against the spell, its nonmagical light sources are extinguished, and you may attempt to dispel light descriptor spells affecting it.",
  },
  "solar-spell": {
    slug: "solar-spell",
    name: "Solar Spell",
    slotIncrease: 1,
    note: "Light descriptor spells only. Dazzles creatures in the spell's area of light; oozes, fungal creatures, Shadow Plane natives, and undead also risk a stacking combat penalty. Extends the spell's own dazzle or blind duration and adds bonus damage against sunlight-vulnerable creatures.",
  },
  "solid-shadows": {
    slug: "solid-shadows",
    name: "Solid Shadows",
    slotIncrease: 1,
    note: "Shadow conjuration and shadow evocation, and their greater versions, only. Makes the illusion 20 percent more real.",
  },
  "stable-spell": {
    slug: "stable-spell",
    name: "Stable Spell",
    slotIncrease: 1,
    note: "Reduces the chance of triggering a primal magic event by 25 percent in areas of primal magic, and grants a bonus on the concentration check if one triggers anyway.",
  },
  "steam-spell": {
    slug: "steam-spell",
    name: "Steam Spell",
    slotIncrease: 0,
    note: "Fire descriptor spells only. Works underwater without a caster level check; requires one to work above water instead.",
  },
  "still-spell": {
    slug: "still-spell",
    name: "Still Spell",
    slotIncrease: 1,
    note: "Cast with no somatic component (no arcane spell failure from that component).",
  },
  "studied-spell": {
    slug: "studied-spell",
    name: "Studied Spell",
    slotIncrease: 2,
    note: "Requires a Knowledge check based on one target's creature type as you cast. On success, ignores that target's racial energy resistance, damage reduction, and racial saving throw bonuses against the spell; other sources of those defenses still apply.",
  },
  "stygian-spell": {
    slug: "stygian-spell",
    name: "Stygian Spell",
    slotIncrease: 2,
    note: "Water descriptor spells that target a creature only. On a failed save, or a confirmed critical hit, or a natural 1 on the original save, the target risks a lasting madness. Gains the evil descriptor: can't be applied to spells with the good descriptor.",
  },
  "stylized-spell": {
    slug: "stylized-spell",
    name: "Stylized Spell",
    slotIncrease: 1,
    note: "Raises the DC to identify the spell as it's cast by 10, and can disguise it as another spell of the same school, subschool, and descriptors.",
  },
  "tenacious-spell": {
    slug: "tenacious-spell",
    name: "Tenacious Spell",
    slotIncrease: 1,
    note: "Raises the DC to dispel or counter the spell by 2. If dispelled or dismissed, it lingers 1d4 more rounds, capped at its normal duration, before ending, and its detect magic aura lasts twice as long afterward.",
  },
  "tenebrous-spell": {
    slug: "tenebrous-spell",
    name: "Tenebrous Spell",
    slotIncrease: 1,
    note: "Cast in darkness or dim light, raises the spell's effective caster level (and its save DCs) by 1 and makes it harder to dispel there, at the cost of an extra concentration check to cast in bright light. No effect on spells with the light descriptor. Spells with the darkness or shadow descriptor, or of the illusion (shadow) subschool, use no higher slot but still count as metamagicked.",
  },
  "thanatopic-spell": {
    slug: "thanatopic-spell",
    name: "Thanatopic Spell",
    slotIncrease: 2,
    note: "Pierces defenses against death effects, negative levels, and energy drain, including on undead targets; other saves and spell resistance still apply. A thanatopic spell that would kill a living creature destroys an undead instead.",
  },
  "threatening-illusion": {
    slug: "threatening-illusion",
    name: "Threatening Illusion",
    slotIncrease: 1,
    note: "Illusion (figment) spells only. One 5 foot square of the illusion threatens an adjacent target for flanking purposes, until the target succeeds on a Will save to disbelieve.",
  },
  "threnodic-spell": {
    slug: "threnodic-spell",
    name: "Threnodic Spell",
    slotIncrease: 2,
    note: "Mind-affecting spells only. Affects undead, even mindless undead, as though they weren't immune; no effect on living creatures.",
  },
  "thundering-spell": {
    slug: "thundering-spell",
    name: "Thundering Spell",
    slotIncrease: 2,
    note: "Damaging spells only. A creature damaged by the spell becomes deafened for rounds equal to the spell's original level, negated by the spell's own save if it has one.",
  },
  "toppling-spell": {
    slug: "toppling-spell",
    name: "Toppling Spell",
    slotIncrease: 1,
    note: "Force descriptor spells only. If the target takes damage, fails its save, or is moved by the spell, attempt a trip check against it using your caster level plus casting ability modifier; doesn't provoke.",
  },
  "toxic-spell": {
    slug: "toxic-spell",
    name: "Toxic Spell",
    slotIncrease: 1,
    note: "Lets you add a dose of poison as a material component; a target that fails the spell's save must also save against the poison, which takes effect immediately if that save fails too. Only works on spells negated by a Fortitude save.",
  },
  "traumatic-spell": {
    slug: "traumatic-spell",
    name: "Traumatic Spell",
    slotIncrease: 2,
    note: "Emotion or fear descriptor spells only. A creature that fails its save relives the effect as a nightmare the next time it sleeps, repeating on subsequent nights at a lower DC until it succeeds.",
  },
  "trick-spell": {
    slug: "trick-spell",
    name: "Trick Spell",
    slotIncrease: 1,
    note: "Single-target enchantment spells negated by a Will save only. On a failed save, also attempt a dirty trick combat maneuver against the target.",
  },
  "tumultuous-spell": {
    slug: "tumultuous-spell",
    name: "Tumultuous Spell",
    slotIncrease: 1,
    note: "Single-target spells only. On a hit or failed save, the target is shoved 1d4 x 5 feet in a random direction without provoking. Can't be applied to spells with the lawful descriptor.",
  },
  "umbral-spell": {
    slug: "umbral-spell",
    name: "Umbral Spell",
    slotIncrease: 2,
    note: "Requires Tenebrous Spell. The affected creature or object radiates darkness in a 10 foot radius for the spell's duration, dimming light similarly to the darkness spell. Can't be used on instantaneous spells or ones that don't target a creature or object.",
  },
  "ursurping-spell": {
    slug: "ursurping-spell",
    name: "Ursurping Spell",
    slotIncrease: 1,
    note: "A creature that fails its save against the spell counts as your ally for flanking and can't take attacks of opportunity against you, for the spell's duration or 1 round, whichever is longer.",
  },
  "vast-spell": {
    slug: "vast-spell",
    name: "Vast Spell",
    slotIncrease: 1,
    note: "Spells that target multiple creatures within a maximum distance of each other only. Increases that maximum distance to 60 feet.",
  },
  "verdant-spell": {
    slug: "verdant-spell",
    name: "Verdant Spell",
    slotIncrease: 2,
    note: "Mind-affecting spells only. Affects plant creatures, even mindless ones, as though they weren't immune; no effect on other creature types.",
  },
  "widen-spell": {
    slug: "widen-spell",
    name: "Widen Spell",
    slotIncrease: 3,
    note: "Burst/emanation/spread area increased by 100%. Does not affect the spell's save DC.",
  },
  "yai-mimic-spell": {
    slug: "yai-mimic-spell",
    name: "Yai-Mimic Spell",
    slotIncrease: 3,
    note: "Ray spells only. The spell no longer needs somatic components, and casting it grants you regeneration 1 for a number of rounds equal to the spell's original level; fire or acid damage suppresses it.",
  },
};

/** The metamagic def for `slug`, or `undefined` if it is not a modeled metamagic feat. */
export function metamagicDef(slug: string): MetamagicDef | undefined {
  return METAMAGIC_FEATS[slug];
}

/** True when `slug` (a `featNameSlug`) names a modeled metamagic feat. */
export function isMetamagicFeat(slug: string): boolean {
  return slug in METAMAGIC_FEATS;
}

/** The metamagic def for a feat by its display `name` (slugged internally), or `undefined`. */
export function metamagicDefByName(name: string): MetamagicDef | undefined {
  return METAMAGIC_FEATS[featNameSlug(name)];
}
