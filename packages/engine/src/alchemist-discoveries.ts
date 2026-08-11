/**
 * Clean-room PF1 alchemist discovery table (Advanced Player's Guide + selected
 * Ultimate Magic/Ultimate Combat entries): hand-authored from the published
 * rules (verified against the book-scoped legacy AoN mirror pages, which let
 * discoveries be split by exact source book), mirroring `magus-arcana.ts`'s
 * posture — discoveries are NOT part of the vendored Foundry data pack (the
 * Alchemist class def only links the generic "Discovery"/"Grand Discovery"
 * stub `ClassFeature`s, no per-discovery breakdown — confirmed:
 * `class-features.json` carries no per-discovery entries), so there is no
 * upstream JSON to normalize.
 *
 * Scope: FULL vendored parity as of the Phase 5 extension — all 168 entries of
 * the vendored prose catalog (`RefData.alchemistDiscoveries`, the pfdata slice
 * the overlay section below merges against): the Advanced Player's Guide core
 * list, the Ultimate Magic/Ultimate Combat additions, every splatbook bomb
 * rider and mutagen variant, and the grand discoveries (soft-gated `minLevel:
 * 20`).
 *
 * Base Mutagen class feature (NOT a discovery — the Alchemist's own 1st-level
 * class feature): +4 alchemical bonus to one chosen physical ability score
 * (Str/Dex/Con), -2 penalty to the linked mental score (Str→Int, Dex→Wis,
 * Con→Cha), +2 natural armor, 10 min/level duration — RAW confirmed. This
 * table does NOT re-model it; see `apps/web`'s `ResourcesPanel`/`resources.ts`
 * `resolveGrantsBuffs`, which already surfaces it as a toggleable buff for
 * free (the vendored Mutagen `ClassFeature`'s `grantsBuffs` UUIDs resolve
 * against 3 real vendored buffs — "Mutagen, Str"/"Mutagen, Dex"/"Mutagen,
 * Con" — audited before writing this file; no new mechanism needed).
 *
 * Cognatogen (Ultimate Magic) shares Mutagen's EXACT numeric shape (+4/-2/+2
 * natural armor, same duration, "only one mutagen-family effect active at a
 * time" rule) but boosts a MENTAL score instead (Int/Wis/Cha) at the cost of
 * the linked physical score. It has no vendored buff data at all (`buffs.json`
 * has zero "Cognatogen" hits, unlike Mutagen's three), so its three buffs are
 * hand-authored in `cognatogen.ts` and appended to the Mutagen resource pool's
 * `linkedBuffIds` when this discovery is taken — the base entry below is
 * therefore a real toggle, not display-only. Greater/Grand Cognatogen remain
 * display-only, matching the vendored Mutagen buffs, which likewise don't
 * model Greater/Grand Mutagen.
 *
 * Modelling posture (mirrors magus-arcana.ts/oracle-revelations.ts's honesty
 * bar): almost every discovery here is a bomb-type rider (mutually exclusive
 * with other bomb-type riders per RAW — Paizo's own "don't stack, one per
 * bomb" rule, worth noting but not enforced by this table), an activated/
 * limited-use ability, or a passive prose ability with no flat always-on
 * number this engine's Change system can safely target (e.g. Feral Mutagen's
 * extra natural attacks require a natural-attack builder this engine doesn't
 * have; mutagen-conditional numbers like Bone-Spike Mutagen's ride an
 * untoggleable variant, not the sheet). Those entries have `changes: []` and
 * a `contextNotes` reminder carrying the mechanic's numbers/prerequisite
 * instead. The exceptions that cleared the bar (consumed by `collect.ts`'s
 * alchemist-discovery loop): Awakened Intellect's permanent +2 Int, Chameleon's
 * +4/+8 enhancement to Stealth, Pheromones' +3 competence to Bluff/Diplomacy/
 * Intimidate, Webbed Extremities' +4 alchemical to Swim, and Mummification's
 * cold/paralysis/sleep immunities (imm./immEffect. targets). Cognatogen is
 * the one entry modeled WITHOUT `changes` — its mechanics ride three
 * toggleable buffs instead (see above).
 */

import type { AlchemistDiscovery, Change, ContextNote, RefData, SourceRef } from "@pf1/schema";

export interface AlchemistDiscoveryDef {
  id: string;
  name: string;
  /** Short rules summary shown in the UI (paraphrased, not verbatim SRD text). */
  summary: string;
  /**
   * Earliest alchemist level this discovery can be selected at — 2 (the
   * earliest any discovery is available) unless the source book states a
   * higher minimum. Soft-filtered only (see file doc comment); never blocks
   * selection.
   */
  minLevel: number;
  /** Typed modifiers granted by the discovery (empty for all but the five always-on promotions — see file doc comment). */
  changes: Change[];
  /** Non-mechanical reminders (bomb-rider exclusivity, prerequisite discovery, activation cost/count, ...). */
  contextNotes?: ContextNote[];
  /**
   * True for every discovery whose effect this engine can't apply — all but
   * Cognatogen (three toggleable buffs, see `cognatogen.ts`) and the five
   * `changes[]` promotions (see file doc comment). Drives the picker's "M"
   * badge.
   */
  displayOnly: boolean;
  /** This entry's numbers flow through a dedicated engine path it never serializes as its own `changes[]` — name the route in a comment at each use. */
  wiredElsewhere?: boolean;
}

const note = (text: string, target = "allChecks"): ContextNote => ({ target, text });
const bombRiderNote = note(
  "Bomb-type rider — RAW mutually exclusive with other bomb-type discoveries per bomb thrown.",
);

interface RawDiscovery {
  id: string;
  name: string;
  summary: string;
  minLevel?: number;
  /** Always-on typed modifiers, for the handful of discoveries that honestly carry one — see {@link AlchemistDiscoveryDef.displayOnly}. */
  changes?: Change[];
  contextNotes?: ContextNote[];
  /** Set only on Cognatogen — see {@link AlchemistDiscoveryDef.displayOnly}. */
  modeled?: true;
  /** Set only on Cognatogen — see {@link AlchemistDiscoveryDef.wiredElsewhere}. */
  wiredElsewhere?: boolean;
}

function build(entries: RawDiscovery[]): AlchemistDiscoveryDef[] {
  return entries.map((e) => ({
    id: e.id,
    name: e.name,
    summary: e.summary,
    minLevel: e.minLevel ?? 2,
    changes: e.changes ?? [],
    contextNotes: e.contextNotes,
    displayOnly: !e.modeled && (e.changes?.length ?? 0) === 0,
    wiredElsewhere: e.wiredElsewhere,
  }));
}

const DISCOVERY_LIST: AlchemistDiscoveryDef[] = build([
  // --- Advanced Player's Guide (29) ------------------------------------
  {
    id: "acidBomb",
    name: "Acid Bomb",
    summary: "Bombs deal acid damage; a direct hit also deals 1d6 acid one round later.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "combineExtracts",
    name: "Combine Extracts",
    minLevel: 8,
    summary: "Combine two prepared extracts into a single dose occupying a slot 2 levels higher.",
    contextNotes: [note("Which two formulae is chosen at preparation time — not tracked here.")],
  },
  {
    id: "concentratePoison",
    name: "Concentrate Poison",
    summary:
      "Merge two doses of the same poison into one stronger dose (+50% frequency duration, +2 save DC).",
  },
  {
    id: "concussiveBomb",
    name: "Concussive Bomb",
    minLevel: 6,
    summary: "Bombs deal sonic damage; a direct hit also deafens the target for 1 minute.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "delayedBomb",
    name: "Delayed Bomb",
    minLevel: 8,
    summary: "A thrown bomb can be set to detonate after a chosen delay of a few rounds.",
  },
  {
    id: "dilution",
    name: "Dilution",
    minLevel: 12,
    summary: "Once per day, split one potion or extract into two weaker doses.",
  },
  {
    id: "dispellingBomb",
    name: "Dispelling Bomb",
    minLevel: 6,
    summary:
      "A bomb triggers a targeted dispel magic against the target instead of dealing damage.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "elixirOfLife",
    name: "Elixir of Life",
    minLevel: 16,
    summary:
      "Once per day, brew an elixir that functions as true resurrection (or a self-only delayed resurrection).",
  },
  {
    id: "enhancePotion",
    name: "Enhance Potion",
    summary:
      "A number of times per day equal to your Intelligence modifier, a potion you drink uses your alchemist level as its caster level.",
    contextNotes: [
      note("Activated, Int-mod uses/day — not wired as a tracked resource pool here."),
    ],
  },
  {
    id: "eternalPotion",
    name: "Eternal Potion",
    minLevel: 16,
    summary: "Make an Extend Potion-affected potion's duration permanent.",
    contextNotes: [note("Requires the Extend Potion discovery.")],
  },
  {
    id: "explosiveBomb",
    name: "Explosive Bomb",
    summary: "Bomb splash radius increases to 10 ft.; a direct hit also sets the target on fire.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "extendPotion",
    name: "Extend Potion",
    summary:
      "A number of times per day equal to your Intelligence modifier, double the duration of a non-instantaneous potion you drink.",
    contextNotes: [
      note("Activated, Int-mod uses/day — not wired as a tracked resource pool here."),
    ],
  },
  {
    id: "fastBombs",
    name: "Fast Bombs",
    minLevel: 8,
    summary:
      "Throw multiple bombs in a single full-round action if your base attack bonus allows extra attacks.",
    contextNotes: [note("Action-economy option only — no numeric sheet effect to model.")],
  },
  {
    id: "feralMutagen",
    name: "Feral Mutagen",
    summary:
      "While a mutagen is active, gain two claw attacks and a bite attack as primary natural attacks at your full base attack bonus, plus +2 on Intimidate checks.",
    contextNotes: [
      note(
        "Natural-attack grant while mutagen active — this engine has no natural-attack builder to wire it into; add the attacks manually.",
      ),
    ],
  },
  {
    id: "forceBomb",
    name: "Force Bomb",
    minLevel: 8,
    summary: "Bombs deal force damage; a direct hit knocks the target prone unless it saves.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "frostBomb",
    name: "Frost Bomb",
    summary:
      "Bombs deal cold damage; a direct hit staggers the target on its next turn unless it saves.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "greaterMutagen",
    name: "Greater Mutagen",
    minLevel: 12,
    summary:
      "Your mutagen instead grants +4 to two chosen physical ability scores and +6 natural armor, with the usual mental penalties.",
    contextNotes: [
      note(
        "Scales the base Mutagen buff's numbers — apply by hand (the toggleable Mutagen buffs surfaced via the resource pool are the base +4/-2/+2 values, not this upgrade).",
      ),
    ],
  },
  {
    id: "grandMutagen",
    name: "Grand Mutagen",
    minLevel: 16,
    summary:
      "Requires Greater Mutagen. Your mutagen instead grants +4/+6/+8 across three chosen physical ability scores and +6 natural armor, with mental penalties to all three linked scores.",
    contextNotes: [
      note(
        "Scales the base Mutagen buff's numbers — apply by hand (the toggleable Mutagen buffs surfaced via the resource pool are the base +4/-2/+2 values, not this upgrade). Requires Greater Mutagen.",
      ),
    ],
  },
  {
    id: "infuseMutagen",
    name: "Infuse Mutagen",
    summary:
      "Costs 2 points of Intelligence damage and 1,000 gp per use. Your mutagen no longer becomes inert when you brew a new one — only the most recently brewed dose applies.",
  },
  {
    id: "infernoBomb",
    name: "Inferno Bomb",
    minLevel: 16,
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as incendiary cloud.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  {
    id: "infusion",
    name: "Infusion",
    summary:
      "Your extracts remain magical after being set down and can be drunk by someone else; still counts against your daily prepared extracts.",
  },
  {
    id: "madnessBomb",
    name: "Madness Bomb",
    minLevel: 12,
    summary:
      "A direct hit deals 1d4 Wisdom damage, but the bomb's normal damage is reduced by 2d6.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "poisonBomb",
    name: "Poison Bomb",
    minLevel: 12,
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as cloudkill.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  {
    id: "preciseBombs",
    name: "Precise Bombs",
    summary:
      "Exclude a number of squares equal to your Intelligence modifier from your bombs' splash damage area.",
    contextNotes: [note("Area-exclusion utility — not a sheet stat this engine tracks.")],
  },
  {
    id: "shockBomb",
    name: "Shock Bomb",
    summary: "Bombs deal electricity damage; a direct hit also dazzles the target for 1d4 rounds.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "smokeBomb",
    name: "Smoke Bomb",
    summary: "A bomb creates a fog-cloud-like smoke cloud instead of dealing damage.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "stickyBomb",
    name: "Sticky Bomb",
    minLevel: 10,
    summary:
      "A bomb's effect persists, dealing splash damage again one round after the initial hit.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "stickyPoison",
    name: "Sticky Poison",
    minLevel: 6,
    summary:
      "A poison applied to a weapon remains active for a number of successful strikes equal to your Intelligence modifier, instead of just one.",
  },
  {
    id: "stinkBomb",
    name: "Stink Bomb",
    summary: "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as stinking cloud.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  // --- Ultimate Magic (10 selected) ------------------------------------
  {
    id: "cognatogen",
    name: "Cognatogen",
    modeled: true,
    // Wired via the Mutagen resource pool's linkedBuffIds (resources.ts /
    // ResourcesPanel.tsx), which append cognatogen.ts's three toggleable
    // buffs when this discovery is taken, rather than this entry's own
    // changes[].
    wiredElsewhere: true,
    summary:
      "As Mutagen, but grants +4 alchemical bonus to a chosen MENTAL ability score (Int, Wis, or Cha), -2 to the linked physical score (Int→Str, Wis→Dex, Cha→Con), +2 natural armor, 10 min/level; deals 2 points of ability damage to the penalized score when it expires.",
    contextNotes: [
      note(
        "Toggle the matching Cognatogen buff from the Mutagen resource pool on the tracker. Only one mutagen or cognatogen can be active at a time.",
      ),
    ],
  },
  {
    id: "greaterCognatogen",
    name: "Greater Cognatogen",
    minLevel: 12,
    summary:
      "Requires Cognatogen. Your cognatogen instead grants +4 to two chosen mental ability scores and +6 natural armor, with the usual physical penalties.",
    contextNotes: [
      note(
        "Scales Cognatogen's numbers past what the Cognatogen buffs model — apply the extra by hand. Requires Cognatogen.",
      ),
    ],
  },
  {
    id: "grandCognatogen",
    name: "Grand Cognatogen",
    minLevel: 16,
    summary:
      "Requires Greater Cognatogen. Your cognatogen instead grants +4/+6/+8 across three chosen mental ability scores and +6 natural armor, with physical penalties to all three linked scores.",
    contextNotes: [
      note("Scales Cognatogen's numbers — apply by hand. Requires Greater Cognatogen."),
    ],
  },
  {
    id: "vestigialArm",
    name: "Vestigial Arm",
    summary:
      "Grow an extra fully-functional arm that can wield a weapon (two-weapon-fighting style) or hold an item; can be taken more than once for additional arms.",
    contextNotes: [
      note(
        "Extra manipulator/attack — this engine has no extra-limb attack builder; add manually.",
      ),
    ],
  },
  {
    id: "preserveOrgans",
    name: "Preserve Organs",
    summary:
      "Gain a 25% chance to negate a confirmed critical hit or sneak attack against you (as if immune), rising to 50%/75% if taken up to three times.",
    contextNotes: [
      note(
        "Percentage chance to negate a crit/sneak — no Change target exists for this; track manually.",
      ),
    ],
  },
  {
    id: "tumorFamiliar",
    name: "Tumor Familiar",
    summary:
      "Grow a detachable tumor that functions as a full familiar (with an animal's abilities) whether attached to you or not.",
    contextNotes: [
      note(
        "Reminder: set up the familiar in the Familiar section of the Classes panel — this entry is informational.",
      ),
    ],
  },
  {
    id: "wings",
    name: "Wings",
    minLevel: 6,
    summary:
      "Grow functional wings, granting flight as the fly spell for a pool of minutes per day equal to your alchemist level; can be taken repeatedly to add more minutes/day.",
    contextNotes: [
      note(
        "Limited-use flight pool, not a permanent fly speed — apply manually while active.",
        "speed.fly",
      ),
    ],
  },
  {
    id: "spontaneousHealing",
    name: "Spontaneous Healing",
    summary:
      "As a free action, once per round, heal 5 hit points from a daily pool of 5 hp per 2 alchemist levels; triggers automatically while unconscious if the pool has points remaining.",
    contextNotes: [
      note("Daily healing pool — not wired as a tracked resource pool here; track manually."),
    ],
  },
  {
    id: "healingTouch",
    name: "Healing Touch",
    minLevel: 6,
    summary:
      "Requires Spontaneous Healing. Channel your Spontaneous Healing into another creature via touch, and your daily healing pool doubles to 5 hp per alchemist level.",
    contextNotes: [note("Requires the Spontaneous Healing discovery.")],
  },
  {
    id: "lingeringSpirit",
    name: "Lingering Spirit",
    minLevel: 4,
    summary:
      "Treat your Constitution score as 10 points higher solely for determining how many negative hit points you can sustain before dying.",
    contextNotes: [
      note(
        "Death-threshold safety net — this engine doesn't model an incapacitation/death threshold stat.",
      ),
    ],
  },
  // --- Ultimate Combat (2 selected) -------------------------------------
  {
    id: "nauseatingFlesh",
    name: "Nauseating Flesh",
    minLevel: 12,
    summary:
      "Any creature that bites, engulfs, or swallows you whole must save or be nauseated for 1d4 rounds.",
  },
  {
    id: "poisonConversion",
    name: "Poison Conversion",
    minLevel: 6,
    summary:
      "Spend 1 minute at an alchemy lab to convert a dose of poison between contact, ingested, inhaled, and injury delivery methods.",
    contextNotes: [note("Target delivery method is chosen per use — not tracked here.")],
  },
  // ---- full-catalog extension (vendored parity) ----
  {
    id: "airLung",
    name: "Air Lung",
    summary:
      "Requires the aquatic subtype. Grants the amphibious special quality, letting the alchemist breathe both air and water.",
    contextNotes: [note("Requires the aquatic subtype.")],
  },
  {
    id: "alchemicalSimulacrum",
    name: "Alchemical Simulacrum",
    minLevel: 8,
    summary:
      "Grow a lesser simulacrum duplicate of a creature (as the lesser simulacrum spell) for 100 gp per Hit Die in materials and 24 hours to mature; it decays into inert flesh rather than ice or snow if destroyed.",
    contextNotes: [
      note(
        "Creates a controllable creature ally, not a buff or stat change — track it outside this sheet.",
      ),
    ],
  },
  {
    id: "alchemicalStrike",
    name: "Alchemical Strike",
    summary: "Gain Alchemical Strike as a bonus feat, without needing to meet its prerequisites.",
    contextNotes: [
      note(
        "Grants a specific bonus feat — add it to doc.build.feats separately; this table doesn't auto-grant it.",
      ),
    ],
  },
  {
    id: "alchemicalZombie",
    name: "Alchemical Zombie",
    minLevel: 8,
    summary:
      "Animate a mostly-intact corpse into an alchemical zombie over 1 hour, costing 100 gp in reagents per Hit Die; it counts toward the alchemist's animate dead undead-control limit.",
    contextNotes: [
      note(
        "Creates a controllable undead creature, not a buff or stat change — track it outside this sheet.",
      ),
    ],
  },
  {
    id: "anarchicBombs",
    name: "Anarchic Bombs",
    minLevel: 8,
    summary:
      "Bombs deal chaotic-aligned divine damage; a direct hit staggers lawful targets that fail a Fortitude save, deals only half damage to neutral targets (and doesn't stagger them), and has no effect on chaotic creatures.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "anguishBomb",
    name: "Anguish Bomb",
    summary:
      "Throw bombs infused with psychic trauma, duplicating the mnemostiller's signature anguish bomb ability.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "aromaticExtract",
    name: "Aromatic Extract",
    minLevel: 10,
    summary:
      "Prepare a touch-range extract as an inhaled aromatic version instead, sharing its effect with every creature in a 10-ft. spread; it takes up an extract slot 2 levels higher than normal.",
    contextNotes: [
      note("Requires the Infusion discovery. Applies only to extracts with a range of touch."),
    ],
  },
  {
    id: "awakenedIntellect",
    name: "Awakened Intellect",
    minLevel: 20,
    summary: "Your Intelligence score permanently increases by 2.",
    changes: [{ formula: "2", target: "int", type: "untyped" }],
  },
  {
    id: "axiomaticBombs",
    name: "Axiomatic Bombs",
    minLevel: 8,
    summary:
      "Bombs deal lawful-aligned divine damage; a direct hit staggers chaotic targets that fail a Fortitude save, deals only half damage to neutral targets (and doesn't stagger them), and has no effect on lawful creatures.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "bitterPill",
    name: "Bitter Pill",
    summary:
      "Your flesh turns bitter: a creature that bites you must save or be sickened for 1 round, and a creature that swallows you whole must save or be nauseated for 1 round, vomiting you back out immediately if it fails while you're in its gullet.",
    contextNotes: [
      note(
        "Save DC = 10 + half alchemist level + Con modifier — a reactive defensive ability, not a sheet stat.",
      ),
    ],
  },
  {
    id: "blackstarBomb",
    name: "Blackstar Bomb",
    summary:
      "Requires the Void Bomb discovery. This bomb crushes the target as a void bomb, then bull rushes every other creature within 5 feet, using your alchemist level and Intelligence modifier in place of CMB and Strength/Dexterity.",
    contextNotes: [bombRiderNote, note("Requires the Void Bomb discovery.")],
  },
  {
    id: "blindingBomb",
    name: "Blinding Bomb",
    minLevel: 8,
    summary:
      "Bombs detonate as a blinding flash; a direct hit blinds the target for 1 minute unless it saves, and creatures in the splash radius that fail their save are dazzled for 1 minute.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "boneSpikeMutagen",
    name: "Bone-Spike Mutagen",
    minLevel: 6,
    summary:
      "While a mutagen is active, your natural armor bonus from it increases by 2 as bone spikes erupt from your joints and spine; the spikes function as masterwork armor spikes you're proficient with.",
    contextNotes: [
      note(
        "Mutagen-conditional natural armor increase — apply the extra +2 by hand while a mutagen buff is active.",
      ),
    ],
  },
  {
    id: "boneshardBomb",
    name: "Boneshard Bomb",
    summary:
      "Requires the Alchemical Zombie discovery. Bombs deal piercing damage instead of fire, and a direct hit also causes 1d4 bleed on a failed Fortitude save; anything killed by the bomb or its bleed rises as an undead skeleton, counting toward your animate dead control limit.",
    contextNotes: [bombRiderNote, note("Requires the Alchemical Zombie discovery.")],
  },
  {
    id: "bottledOoze",
    name: "Bottled Ooze",
    minLevel: 6,
    summary:
      "Prepare an extract as a sealed bottle of ooze; thrown up to 30 ft., it reconstitutes and attacks the nearest creature (uncontrolled) for 1 round per caster level before decaying into powder. Requires an extract level equal to the ooze's CR.",
    contextNotes: [
      note("If you also have Infusion, another character can throw a prepared bottled ooze."),
    ],
  },
  {
    id: "breathWeaponBomb",
    name: "Breath Weapon Bomb",
    minLevel: 6,
    summary:
      "As a standard action, drink your bomb components and exhale them as a 15-ft. cone dealing the bomb's direct-hit damage to everyone caught in it, halved on a successful Reflex save; unlike throwing a bomb, this doesn't provoke attacks of opportunity.",
    contextNotes: [
      note(
        "Alternate delivery for your bomb — replaces the draw/throw action, no ranged attack roll involved.",
      ),
    ],
  },
  {
    id: "celestialPoisons",
    name: "Celestial Poisons",
    minLevel: 8,
    summary:
      "Poisons applied to a weapon can affect undead and evil outsiders, bypassing their normal poison immunity (though effects with no meaning for the creature, like ability damage on an undead, still don't apply).",
  },
  {
    id: "chameleon",
    name: "Chameleon",
    summary:
      "Shift your skin and gear's coloring to match your surroundings for a +4 enhancement bonus on Stealth checks, rising to +8 at 10th level.",
    changes: [
      {
        formula: "if(gte(@classes.alchemist.level, 10), 8, 4)",
        target: "skill.ste",
        type: "enhancement",
      },
    ],
  },
  {
    id: "changeAlignment",
    name: "Change Alignment",
    minLevel: 12,
    summary:
      "Requires the Infusion discovery. Once per day, brew an infusion that shifts the imbiber's alignment to good for 10 minutes per alchemist level; an unwilling target gets a Will save, and you can have only one such infusion prepared at a time.",
    contextNotes: [note("Requires the Infusion discovery.")],
  },
  {
    id: "collectiveMemory",
    name: "Collective Memory",
    summary:
      "Requires the Cognatogen discovery. While a cognatogen is active, add half your alchemist level to Knowledge checks and attempt all Knowledge checks untrained.",
    contextNotes: [
      note(
        "Requires the Cognatogen discovery; doesn't stack with the mindchemist archetype's perfect recall bonus.",
      ),
    ],
  },
  {
    id: "confusionBomb",
    name: "Confusion Bomb",
    minLevel: 8,
    summary:
      "A direct hit inflicts confusion for 1 round per caster level in addition to damage, but the bomb's damage is reduced by 2d6.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "constructiveDyes",
    name: "Constructive Dyes",
    minLevel: 8,
    summary:
      "Requires the Divine Inks discovery. Spend two daily bomb uses to solidify your dyes into a nonmagical object, as the minor creation spell using your alchemist level as caster level.",
    contextNotes: [note("Requires the Divine Inks discovery.")],
  },
  {
    id: "cursedBomb",
    name: "Cursed Bomb",
    minLevel: 12,
    summary: "A direct hit forces a Will save or the target is affected by bestow curse.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "cytilleshBomb",
    name: "Cytillesh Bomb",
    summary:
      "Bombs are infused with cytillesh extract, dealing 1d4 damage per die instead of 1d6 (plus 1d4 per odd alchemist level); a direct hit sickens the target for 1 round per alchemist level unless it saves, and a target rendered unconscious while sickened loses the past hour's memories and can't form new ones for 8 hours.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "darknessBomb",
    name: "Darkness Bomb",
    summary:
      "A direct hit extinguishes the target's nonmagical light sources and dispels its magical ones for 1 round per level, as deeper darkness.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "deadlyExcretions",
    name: "Deadly Excretions",
    minLevel: 8,
    summary:
      "Requires the Grippli race's toxic skin racial trait. Your toxic skin can excrete a Constitution-damage poison instead of the normal Dexterity-damage version.",
    contextNotes: [note("Requires the Grippli toxic skin racial trait.")],
  },
  {
    id: "defoliantBomb",
    name: "Defoliant Bomb",
    summary:
      "Bombs deal 1d8 damage per die (plus 1d8 per odd level) against plant creatures but only 1d4 per die (plus 1d4 per odd level) against everyone else, as a poison effect; the blast also kills normal vegetation and clears plant-based difficult terrain in the area.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "demolitionCharge",
    name: "Demolition Charge",
    minLevel: 8,
    summary:
      "Bombs can target an object as if with a sunder combat maneuver; a worn or held item takes the direct hit while its owner takes splash damage, and an unattended object takes an extra 2d6 damage on a direct hit.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "designerPoison",
    name: "Designer Poison",
    summary:
      "When crafting a poison, choose a creature type (and subtype) from the ranger favored-enemy list: the poison's save DC rises by 4 against that type but drops by 2 against everyone else. The choice is locked in at crafting.",
  },
  {
    id: "directedBomb",
    name: "Directed Bomb",
    summary:
      "Bombs splash in a 15-ft. cone you choose the direction of, instead of a 5-ft.-radius burst; on a miss, roll 1d8 to randomly determine the cone's direction.",
    contextNotes: [note("Can't be combined with the Explosive Bomb discovery.")],
  },
  {
    id: "divineInks",
    name: "Divine Inks",
    summary:
      "Spend two daily bomb uses to paint an illusory image in a space adjacent to you, as silent image using your alchemist level as caster level; the image lasts minutes equal to your level and can be dismissed as a standard action.",
  },
  {
    id: "doppelgangerSimulacrum",
    name: "Doppelganger Simulacrum",
    minLevel: 10,
    summary:
      "Requires the Alchemical Simulacrum discovery. Grow duplicate bodies (1,000 gp and 1 week each) and shift your consciousness into any available one as a full-round action; dying in a simulacrum returns you to your own body, but dying in your own body is final.",
    contextNotes: [note("Requires the Alchemical Simulacrum discovery.")],
  },
  {
    id: "dreadBomb",
    name: "Dread Bomb",
    minLevel: 6,
    summary:
      "Requires the Anguish Bomb discovery. Creatures damaged by your anguish bombs become frightened for 1d6 rounds, or shaken for 1 round on a successful Will save.",
    contextNotes: [bombRiderNote, note("Requires the Anguish Bomb discovery.")],
  },
  {
    id: "ectoplasmicBomb",
    name: "Ectoplasmic Bomb",
    summary:
      "Bombs deal full damage to incorporeal creatures and leave a faerie-fire-like glowing trail for 1 minute marking where undead have moved through (or currently stand in) the blast area, even if normally hidden or ethereal.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "elementalDestabilizers",
    name: "Elemental Destabilizers",
    minLevel: 8,
    summary:
      "Craft poisons that bypass elemental outsiders' normal poison immunity, though effects meaningless to the creature (like ability damage on a fire elemental) still don't apply.",
  },
  {
    id: "elementalMutagen",
    name: "Elemental Mutagen",
    summary:
      "Choose air, earth, fire, or water: while a mutagen is active, gain energy resistance 5 (electricity/acid/fire/cold respectively) and a +2 competence bonus on an associated skill (Fly/Climb/Acrobatics/Swim). Can be taken up to four times for different elements, but only one applies per mutagen; the resistance and bonus scale up with Greater/Grand/True Mutagen.",
    contextNotes: [
      note(
        "Mutagen-conditional resistance/skill bonus — apply by hand while a mutagen buff is active; can be selected multiple times, once per element.",
      ),
    ],
  },
  {
    id: "enduringToxin",
    name: "Enduring Toxin",
    minLevel: 8,
    summary:
      "Spend 1 hour and raw materials worth half a poison dose's price to double that dose's maximum duration; you're exposed to the poison while doing so.",
  },
  {
    id: "eternalYouth",
    name: "Eternal Youth",
    minLevel: 20,
    summary:
      "You no longer take physical ability score penalties from advanced age; any such penalties you already have are removed immediately.",
  },
  {
    id: "explosiveCalligraphy",
    name: "Explosive Calligraphy",
    minLevel: 6,
    summary:
      "Spend a daily bomb use to create volatile pigments that function as explosive runes, dealing damage as one of your bombs; spend a second daily use to apply a compatible bomb discovery (such as Acid Bomb or Dispelling Bomb) to the runes.",
  },
  {
    id: "explosiveMissile",
    name: "Explosive Missile",
    minLevel: 4,
    summary:
      "As a standard action, infuse a single arrow, bolt, or one-handed firearm bullet with a bomb's power and fire it (you must be proficient with the weapon); on a hit it deals normal weapon damage and then detonates as a thrown bomb. A miss doesn't detonate.",
  },
  {
    id: "fastHealing",
    name: "Fast Healing",
    minLevel: 20,
    summary: "You gain fast healing 5.",
    contextNotes: [
      note(
        "No fast-healing tracking in this engine — apply the 5 points of healing each round by hand.",
      ),
    ],
  },
  {
    id: "feyMutagen",
    name: "Fey Mutagen",
    summary:
      "Brew a fey mutagen instead of a standard one: it grants +2 Dexterity and +2 Charisma, -2 Strength, and DR 2/cold iron, otherwise behaving like a normal mutagen.",
    contextNotes: [
      note(
        "Alternate mutagen formula — apply its numbers by hand instead of the default Mutagen buff; only one mutagen-family effect can be active at a time.",
      ),
    ],
  },
  {
    id: "fireBrand",
    name: "Fire Brand",
    summary:
      "Requires the Goblin race. Spend a daily bomb use to coat your weapon with bomb reagents as a swift action, granting it the flaming weapon property (flaming burst at 10th level) for 1 minute or until doused in water; usable on natural weapons, but each one treated deals 1d6 fire damage to you per round.",
    contextNotes: [note("Requires the Goblin race.")],
  },
  {
    id: "fleshEatingBomb",
    name: "Flesh-Eating Bomb",
    summary:
      "Bombs deal damage one die step higher (e.g. d8s become d10s) but only affect organic matter; a creature with at least a +1 armor bonus takes no splash damage on a successful Reflex save and can halve a direct hit's damage with one too.",
    contextNotes: [
      bombRiderNote,
      note(
        "Despite the wording, this cannot be combined with Concussive Bomb under the published rules.",
      ),
    ],
  },
  {
    id: "gills",
    name: "Gills",
    minLevel: 4,
    summary:
      "Grow gills that let you breathe water as well as air; going more than 24 hours on land without bathing them in a half-gallon of water deals 1 point of Constitution damage per hour thereafter.",
    contextNotes: [
      note(
        "Requires periodic care on land (half a gallon of water per 24 hours) to avoid ongoing Constitution damage.",
      ),
    ],
  },
  {
    id: "glassfootBomb",
    name: "Glassfoot Bomb",
    summary:
      "Bombs also scatter volatile crystals like caltrops across the splash area, which dissolve into harmless gas after 2d6 rounds.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "glimmeringInfusion",
    name: "Glimmering Infusion",
    summary:
      "Expend a prepared extract to create a glitterdust effect adjacent to you, covering one 5-ft. square per level of the extract sacrificed and using that extract's level for the save DC.",
    contextNotes: [note("Requires the Infusion discovery.")],
  },
  {
    id: "grandFeyMutagen",
    name: "Grand Fey Mutagen",
    minLevel: 16,
    summary:
      "Requires Fey Mutagen and Greater Fey Mutagen. Your fey mutagen instead grants +6 to Dexterity and Charisma, -2 to Strength, DR 10/cold iron, woodland stride, and optional immunity to effects that couldn't affect both your original and fey creature types.",
    contextNotes: [
      note(
        "Scales the Fey Mutagen line's numbers — apply by hand. Requires Fey Mutagen and Greater Fey Mutagen.",
      ),
    ],
  },
  {
    id: "grandInspiringCognatogen",
    name: "Grand Inspiring Cognatogen",
    minLevel: 16,
    summary:
      "Requires Greater Inspiring Cognatogen. Your inspiring cognatogen instead grants +4 dodge to AC, +4 on Reflex saves, -6 to Strength and Constitution, and the effects of three specific investigator talents.",
    contextNotes: [
      note(
        "Scales the Inspiring Cognatogen line's numbers — apply by hand. Requires Greater Inspiring Cognatogen.",
      ),
    ],
  },
  {
    id: "grandRasugen",
    name: "Grand Rasugen",
    minLevel: 16,
    summary:
      "Requires Greater Rasugen. Your rasugen instead grants +6 alchemical bonus on all saves, 4 temporary hp per alchemist level, and immunity to disease, mind-affecting effects, and poison, at the cost of -6 Intelligence and -2 Charisma and Wisdom.",
    contextNotes: [
      note("Scales the Rasugen line's numbers — apply by hand. Requires Greater Rasugen."),
    ],
  },
  {
    id: "greaseBomb",
    name: "Grease Bomb",
    minLevel: 6,
    summary:
      "Bombs coat their splash area in grease for 1 round per alchemist level instead of dealing damage; the Reflex save to avoid falling uses the standard bomb DC formula.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "greaterAlchemicalSimulacrum",
    name: "Greater Alchemical Simulacrum",
    minLevel: 14,
    summary:
      "Requires Alchemical Simulacrum. Create a simulacrum as the spell, but as a 24-hour alchemical process costing 100 gp per Hit Die, and the creature decays into inert flesh rather than ice or snow if killed.",
    contextNotes: [note("Requires the Alchemical Simulacrum discovery.")],
  },
  {
    id: "greaterChangeAlignment",
    name: "Greater Change Alignment",
    minLevel: 20,
    summary:
      "Requires Change Alignment and Infusion. Your change alignment infusion's forced alignment shift becomes permanent, reversible only by wish or miracle.",
    contextNotes: [note("Requires the Change Alignment and Infusion discoveries.")],
  },
  {
    id: "greaterConstructiveDyes",
    name: "Greater Constructive Dyes",
    minLevel: 10,
    summary:
      "Requires Divine Inks and Constructive Dyes. Spend an extra daily bomb use so Constructive Dyes creates objects as major creation.",
    contextNotes: [note("Requires the Divine Inks and Constructive Dyes discoveries.")],
  },
  {
    id: "greaterDivineInks",
    name: "Greater Divine Inks",
    minLevel: 6,
    summary:
      "Requires Divine Inks and Improved Divine Inks. Spend an extra daily bomb use so a Divine Inks image also produces sound, smell, and heat, as major image.",
    contextNotes: [note("Requires the Divine Inks and Improved Divine Inks discoveries.")],
  },
  {
    id: "greaterFeyMutagen",
    name: "Greater Fey Mutagen",
    minLevel: 12,
    summary:
      "Requires Fey Mutagen. Your fey mutagen instead grants +4 to Dexterity and Charisma, -2 to Strength, DR 5/cold iron, and woodland stride.",
    contextNotes: [
      note("Scales the Fey Mutagen line's numbers — apply by hand. Requires Fey Mutagen."),
    ],
  },
  {
    id: "greaterInspiringCognatogen",
    name: "Greater Inspiring Cognatogen",
    minLevel: 12,
    summary:
      "Requires Inspiring Cognatogen. Your inspiring cognatogen instead grants +2 dodge to AC, +2 on Reflex saves, -4 to Strength and Constitution, and the effects of three specific investigator talents.",
    contextNotes: [
      note(
        "Scales the Inspiring Cognatogen line's numbers — apply by hand. Requires Inspiring Cognatogen (discovery or class feature).",
      ),
    ],
  },
  {
    id: "greaterPlagueBomb",
    name: "Greater Plague Bomb",
    minLevel: 16,
    summary:
      "Requires Smoke Bomb and Plague Bomb. Your smoke-cloud bomb instead functions as greater contagion across twice the normal area for 1 round per level.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb and Plague Bomb discoveries.")],
  },
  {
    id: "greaterRasugen",
    name: "Greater Rasugen",
    minLevel: 12,
    summary:
      "Requires the ability to brew a rasugen (e.g. via the mnemostiller archetype). Your rasugen instead grants +4 alchemical bonus on all saves, 3 temporary hp per alchemist level, and immunity to mind-affecting effects, at the cost of -4 Intelligence.",
    contextNotes: [
      note(
        "Requires an alchemical ability that brews a rasugen (such as the mnemostiller archetype's version of mutagen).",
      ),
    ],
  },
  {
    id: "groundingGoo",
    name: "Grounding Goo",
    summary:
      "A bomb's sticky residue impairs any creature it damages that has a nonmagical fly speed, imposing a penalty equal to your alchemist level on its Fly checks for 1 minute.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "healingBomb",
    name: "Healing Bomb",
    summary:
      "A bomb heals instead of harming: consume a prepared cure extract or potion so a direct hit heals as that effect and splash-radius creatures heal its minimum amount; undead take damage instead.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "hellfireBomb",
    name: "Hellfire Bomb",
    minLevel: 9,
    summary:
      "Tiefling alchemists only. Requires Explosive Bomb. Your explosive bomb instead deals half fire and half unholy damage, with the unholy half bypassing fire resistance and immunity.",
    contextNotes: [
      bombRiderNote,
      note("Tiefling alchemists only. Requires the Explosive Bomb discovery."),
    ],
  },
  {
    id: "holyBombs",
    name: "Holy Bombs",
    minLevel: 8,
    summary:
      "Bombs deal good-aligned divine damage; evil creatures hit directly must save or be staggered on their next turn, neutral creatures take half damage and aren't staggered, and good creatures are unaffected.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "immolationBomb",
    name: "Immolation Bomb",
    minLevel: 3,
    summary:
      "A direct hit burns the target for 1d6 plus your Intelligence modifier each round for a number of rounds equal to the bomb's damage dice, and creatures adjacent to the target when it burns also take splash damage; extinguishing it early costs a full-round action and a Reflex save.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "improvedDivineInks",
    name: "Improved Divine Inks",
    minLevel: 4,
    summary:
      "Requires Divine Inks. Spend an extra daily bomb use so a Divine Inks image also produces minor sounds, as minor image.",
    contextNotes: [note("Requires the Divine Inks discovery.")],
  },
  {
    id: "incendiaryCharge",
    name: "Incendiary Charge",
    minLevel: 4,
    summary:
      "As a full-round action, place a bomb charge that burns an object for normal bomb damage without halving for hardness, ignoring the first 5 points of the object's hardness.",
  },
  {
    id: "inspiredBomb",
    name: "Inspired Bomb",
    summary:
      "Spend two uses of an inspiration pool (from a class feature, feat, or Inspiring Cognatogen) to add 1d6 damage to a thrown bomb without changing its damage type; unlike most bomb discoveries this one can be combined with another bomb-type discovery, just not with itself twice on the same bomb.",
    contextNotes: [
      note(
        "Needs an inspiration pool from elsewhere (class feature, feat, or the Inspiring Cognatogen discovery) — not tracked here. Not mutually exclusive with other bomb-type riders (though it can't stack with itself).",
      ),
    ],
  },
  {
    id: "inspiringCognatogen",
    name: "Inspiring Cognatogen",
    summary:
      "As a mutagen, but grants a pool of inspiration (as the investigator class feature) equal to half your alchemist level plus your Intelligence modifier (minimum 1), a +2 dodge bonus to AC, and -2 penalties to Strength and Constitution; it deals 2 points of Strength and Dexterity damage when it wears off.",
    contextNotes: [
      note(
        "Only one mutagen or cognatogen-family effect (including this one) can be active at a time.",
      ),
      note(
        "Spending at least one use of inspiration while active requires a DC 20 Will save or be dazed for 1 round (inspiration can't augment that save).",
      ),
    ],
  },
  {
    id: "intuitiveUnderstanding",
    name: "Intuitive Understanding",
    minLevel: 4,
    summary:
      "Requires Cognatogen. While a cognatogen is active, divination extracts you drink gain +2 caster level, and you can use augury (or divination at 10th level) once as a spell-like ability at your alchemist level.",
    contextNotes: [
      note(
        "Requires the Cognatogen discovery; conditional caster-level bonus and SLA use — apply manually while a cognatogen is active.",
      ),
    ],
  },
  {
    id: "juryRiggedBomb",
    name: "Jury-Rigged Bomb",
    minLevel: 4,
    summary:
      "Craft and throw an improvised bomb as a swift action (counting against your daily bomb uses) for 1d4 damage plus half your Intelligence modifier on a direct hit, scaling by 1d4 every 2 levels from 3rd; rolling a natural 1 on the attack detonates it in your hand for a direct hit's damage.",
    contextNotes: [
      note(
        "Swift-action bomb craftable from whatever's on hand, with its own separate damage progression from standard bombs.",
      ),
    ],
  },
  {
    id: "lastingTinctures",
    name: "Lasting Tinctures",
    summary:
      "Craft-brewed tinctures you make last twice as long, though they still impose their normal penalties even if another ability would otherwise reduce them; you can still brew tinctures at normal duration.",
    contextNotes: [note("Applies to Craft-brewed tinctures specifically, not prepared extracts.")],
  },
  {
    id: "lingeringPlague",
    name: "Lingering Plague",
    minLevel: 8,
    summary:
      "A creature that saves against a disease from your extract or class ability must save again 1 round later or have the disease's duration doubled; durationless diseases instead get their onset time and frequency halved.",
  },
  {
    id: "livingPigment",
    name: "Living Pigment",
    summary:
      "Requires Divine Inks. Spend a daily bomb use and a prepared extract to summon a creature as summon monster I (or a higher-level summon monster matching a higher-level extract expended), using your alchemist level as caster level; an additional bomb use adds the celestial or fiendish template.",
    contextNotes: [note("Requires the Divine Inks discovery.")],
  },
  {
    id: "malignantPoison",
    name: "Malignant Poison",
    minLevel: 10,
    summary:
      "As a full-round action, boost a poison's save DC by 4 and extend its duration by 2 frequency increments, and make malignant poisons take effect immediately with no onset time, for a number of minutes equal to your alchemist level (or until the poison's extended duration ends, if sooner).",
  },
  {
    id: "materialMastery",
    name: "Material Mastery",
    summary:
      "When crafting a magic item, expending an extract matching a spell prerequisite's school and level reduces the penalty for skipping that requirement from -5 to -2.",
  },
  {
    id: "melancholyBomb",
    name: "Melancholy Bomb",
    minLevel: 10,
    summary:
      "Requires Anguish Bomb. Creatures damaged by your anguish bombs are also affected as crushing despair for 1 round per alchemist level, or just 1 round if they make a Will save.",
    contextNotes: [bombRiderNote, note("Requires the Anguish Bomb class feature or discovery.")],
  },
  {
    id: "methodToTheMadness",
    name: "Method to the Madness",
    summary:
      "Derro alchemists only, channeling the derro's madness ability. Choose bombs or extracts (can be taken twice to cover both): use your Charisma modifier in place of Intelligence for that choice's damage/DC, or for bonus extracts per day.",
    contextNotes: [
      note(
        "Derro alchemists only. Can be taken a second time to cover the other option (bombs and extracts).",
      ),
    ],
  },
  {
    id: "monstrousGraft",
    name: "Monstrous Graft",
    summary:
      "Replace up to four of your own limbs with a monstrous beast's of the same size: an arm grants a 15-ft. climb speed or a 1d6 claw/slam attack (1d4 if Small), a leg grants +5 land speed, a 15-ft. swim speed, or +5 on Acrobatics checks to jump; each replaced limb costs -2 Wisdom (derros are immune).",
    contextNotes: [
      note(
        "Grants a natural attack or movement mode per replaced limb — apply the chosen benefit manually; each limb also costs -2 Wisdom (waived for derros).",
      ),
    ],
  },
  {
    id: "mummification",
    name: "Mummification",
    minLevel: 10,
    summary:
      "Requires Preserve Organs. After a 30-day regimen and a day spent unconscious, you become a living mummy: your creature type stays the same, but you gain immunity to cold, nonlethal damage, paralysis, and sleep.",
    changes: [
      { formula: "1", target: "imm.cold", type: "untyped" },
      { formula: "1", target: "immEffect.paralysis", type: "untyped" },
      { formula: "1", target: "immEffect.sleep", type: "untyped" },
      { formula: "1", target: "immEffect.nonlethalDamage", type: "untyped" },
    ],
    contextNotes: [
      note(
        "Requires the Preserve Organs discovery and a 30-day preparation ritual before the immunities take effect.",
      ),
    ],
  },
  {
    id: "mutagen",
    name: "Mutagen",
    summary:
      "Grants the standard mutagen class ability outright — meant for alchemist archetypes that swap out mutagen for a variant and need a way to learn the standard version.",
    contextNotes: [
      note(
        "Relevant only to archetypes that lack the standard Mutagen class feature; the base Mutagen buffs are already surfaced by the Resources panel once available.",
      ),
    ],
  },
  {
    id: "neutralizingBomb",
    name: "Neutralizing Bomb",
    summary:
      "A bomb lets each creature in its splash area retry a save against poison or an ongoing acid/cold/electricity/fire/sonic condition instead of dealing damage, and neutralizes exposed poison in the area; a direct hit also suppresses the target's own poison abilities for 1d4 rounds unless it saves.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "nostrum",
    name: "Nostrum",
    summary:
      "Requires Infusion. An infusion can mask a delayed ingested poison (at -2 to its save DC) that takes effect a number of hours later, of your choosing, equal to your Intelligence bonus (minimum 0); the extract slot stays occupied until the nostrum is consumed or destroyed.",
    contextNotes: [note("Requires the Infusion discovery.")],
  },
  {
    id: "oozeBlight",
    name: "Ooze Blight",
    summary:
      "A direct hit strips a target's split special quality for 1d4 rounds, and against oozes the bomb deals untyped damage that bypasses all resistances.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "parasiticTwin",
    name: "Parasitic Twin",
    summary:
      "Requires taking Vestigial Arm twice. Your vestigial limbs are part of a helpless parasitic twin you can manifest or hide as a standard action; once per day it can absorb a mental effect that would incapacitate you by rerolling the failed save, though doing so sickens you and disables the twin's limbs until the absorbed effect ends.",
    contextNotes: [note("Requires taking the Vestigial Arm discovery twice.")],
  },
  {
    id: "penetratingCharge",
    name: "Penetrating Charge",
    summary:
      "As a full-round action, place a charge on a lock instead of dealing damage, granting a +5 circumstance bonus on Disable Device checks against it until someone spends 10 minutes and a DC 15 Craft check to repair it.",
  },
  {
    id: "phantomLimb",
    name: "Phantom Limb",
    minLevel: 8,
    summary:
      "As a standard action, make a touch attack with an incorporeal phantom limb dealing 1d4 damage per alchemist level (Fortitude half), bypassing all DR except DR/epic, usable for a pool of 3 plus your Intelligence modifier rounds per day.",
    contextNotes: [
      note(
        "Limited-use rounds/day touch attack — not wired as a tracked resource pool here; track manually.",
      ),
    ],
  },
  {
    id: "pheromones",
    name: "Pheromones",
    summary:
      "The alchemist secretes an imperceptible musk, granting a permanent +3 competence bonus on Bluff, Diplomacy, and Intimidate checks.",
    changes: [
      { formula: "3", target: "skill.blf", type: "competence" },
      { formula: "3", target: "skill.dip", type: "competence" },
      { formula: "3", target: "skill.int", type: "competence" },
    ],
  },
  {
    id: "philosophersStone",
    name: "Philosopher's Stone",
    minLevel: 20,
    summary:
      "Once per month, spend a day of work to craft a philosopher's stone at no material cost.",
  },
  {
    id: "pickledQuasit",
    name: "Pickled Quasit",
    minLevel: 10,
    summary:
      "Prepare a bottled quasit as a 4th-level extract; thrown at a square within 30 ft., it releases an uncontrolled summoned quasit that lasts 1 round per caster level.",
    contextNotes: [
      note("With the Infusion discovery, another character can throw the prepared bottle."),
    ],
  },
  {
    id: "plagueBomb",
    name: "Plague Bomb",
    minLevel: 8,
    summary:
      "Requires Smoke Bomb. Your smoke-cloud bomb instead functions as contagion, filling twice the normal splash area for 1 round per level.",
    contextNotes: [bombRiderNote, note("Requires the Smoke Bomb discovery.")],
  },
  {
    id: "plagueVector",
    name: "Plague Vector",
    minLevel: 14,
    summary:
      "Requires Smoke Bomb and Plague Bomb. Your plague bomb's disease save DC becomes 10 + half your level + your Intelligence modifier, and creatures it sickens become vectors that spread the disease on physical contact for a number of days equal to your Intelligence modifier (minimum 1).",
    contextNotes: [note("Requires the Smoke Bomb and Plague Bomb discoveries.")],
  },
  {
    id: "poisonTouch",
    name: "Poison Touch",
    minLevel: 20,
    summary:
      "Gain a poisonous touch as if permanently under the effect of poison (the spell), toggled on or off as a free action.",
    contextNotes: [
      note(
        "Poison-spell delivery via touch — apply the poison spell's ability-damage numbers by hand.",
      ),
    ],
  },
  {
    id: "poisonedExplosive",
    name: "Poisoned Explosive",
    minLevel: 4,
    summary:
      "Apply a dose of contact or injury poison to a bomb; a direct hit forces the target to save against that poison in addition to the bomb's normal damage.",
    contextNotes: [bombRiderNote, note("Requires the Poison Use class feature.")],
  },
  {
    id: "precisePoison",
    name: "Precise Poison",
    summary:
      "On a confirmed critical hit with a poisoned weapon, increase that poison's save DC by the weapon's critical multiplier.",
  },
  {
    id: "profaneBomb",
    name: "Profane Bomb",
    minLevel: 8,
    summary:
      "Bombs deal evil-aligned divine damage; a direct hit staggers good creatures on their next turn unless they save, deals only half damage to neutral creatures (who aren't staggered), and has no effect on evil creatures.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "prometheanDisciple",
    name: "Promethean Disciple",
    minLevel: 6,
    summary:
      "Gain Craft Construct as a bonus feat without meeting its prerequisites, using your Craft (alchemy) ranks as caster level and extracts in place of spell prerequisites when building constructs.",
    contextNotes: [note("Not auto-applied — add Craft Construct by hand.")],
  },
  {
    id: "psychoactiveBomb",
    name: "Psychoactive Bomb",
    minLevel: 6,
    summary:
      "Bombs deal 1d6 less damage, but a direct hit imposes a -1 penalty on saves against charm, emotion, fear, and pain effects and lowers Intimidate DCs against the target by 2, for 1 hour per level (non-stacking).",
    contextNotes: [bombRiderNote],
  },
  {
    id: "psychokineticTincture",
    name: "Psychokinetic Tincture",
    minLevel: 4,
    summary:
      "Once per day, drink a tincture to surround yourself with spirits (one per 4 alchemist levels), each granting +1 deflection to AC; as a standard action, launch one as a ranged touch attack that frightens the target for 1 round per level (Will negates) and reduces your remaining deflection bonus by 1.",
    contextNotes: [
      note(
        "Once/day activation with a 10 min/level duration — not wired as a tracked resource pool here.",
      ),
    ],
  },
  {
    id: "purgingMutagen",
    name: "Purging Mutagen",
    summary:
      "Brew your mutagen to also purge toxins: a non-alchemist who drinks it is nauseated for 1 round (1 hour on a second dose within 24 hours) but gains an immediate extra saving throw against each ongoing poison and disease, each success counting as two consecutive successful saves.",
    contextNotes: [note("Chosen at the time the mutagen is brewed/drunk — not tracked here.")],
  },
  {
    id: "ragDollMutagen",
    name: "Rag Doll Mutagen",
    summary:
      "Goblin only. While your mutagen is active, gain an Escape Artist bonus equal to your class level, can squeeze through spaces as if one size smaller, and can attempt a Reflex save to halve falling damage; at 10th level all falling damage becomes nonlethal and you squeeze as if two sizes smaller.",
    contextNotes: [
      note(
        "Race-restricted (goblin) and active only while a mutagen is in effect — apply by hand.",
      ),
    ],
  },
  {
    id: "rangedBaptism",
    name: "Ranged Baptism",
    minLevel: 4,
    summary:
      "Holy water thrown as a splash weapon also consecrates affected squares and creatures for a number of rounds equal to your Intelligence modifier; undead struck remain under that effect even after leaving the area.",
  },
  {
    id: "remedyExtract",
    name: "Remedy Extract",
    minLevel: 4,
    summary:
      "Combine a nonmagical alchemical remedy, such as antitoxin, into a prepared extract so both take effect when it's drunk; the extract occupies a slot one level higher and can't be combined with other extract-merging methods.",
  },
  {
    id: "rocketBomb",
    name: "Rocket Bomb",
    minLevel: 6,
    summary:
      "Goblin only. Prepare rocket-delivered bombs that explode in a 20-ft. radius hitting every creature there with your splash damage, with a 50-ft. range increment; can't be combined with Precise Bombs or Fast Bombs.",
    contextNotes: [
      bombRiderNote,
      note("Race-restricted (goblin); incompatible with Precise Bombs and Fast Bombs."),
    ],
  },
  {
    id: "sandBomb",
    name: "Sand Bomb",
    summary:
      "Bombs explode in an abrasive sand cloud; a direct hit blinds the target for 1 round, and creatures in the splash radius are blinded too unless they succeed at a Reflex save (DC 10 + half your level + Intelligence modifier).",
    contextNotes: [bombRiderNote],
  },
  {
    id: "sandstoneSolution",
    name: "Sandstone Solution",
    summary:
      "As a full-round action, convert a potion or extract into a solution that hardens sand or dirt to stone for 1 hour across a radius of 10 ft. per item level, or instead reduces a 5-ft. cube of stone's hardness by double the item's level for 1 minute.",
  },
  {
    id: "scrapBomb",
    name: "Scrap Bomb",
    summary:
      "Goblin only. Bombs explode into piercing shrapnel; a direct hit also deals ongoing bleed damage equal to 1 point per bomb damage die unless the target saves.",
    contextNotes: [bombRiderNote, note("Race-restricted (goblin).")],
  },
  {
    id: "siegeBomb",
    name: "Siege Bomb",
    minLevel: 12,
    summary:
      "Requires Explosive Bomb. As a standard action, infuse a loaded siege engine's ammunition with your bomb; if fired before your next turn, it also deals your bomb's damage in a 20-ft. splash radius, igniting struck creatures for 1d6 fire damage per round until extinguished.",
    contextNotes: [note("Requires the Explosive Bomb discovery.")],
  },
  {
    id: "sleeperAgent",
    name: "Sleeper Agent",
    minLevel: 12,
    summary:
      "In a 1-minute ritual on an unconscious target, plant programming you can later trigger (within a mile, any time in the next year) to dominate them as dominate person at your level when the ritual was performed; you can maintain one active sleeper agent per 6 alchemist levels.",
    contextNotes: [
      note("Agent-count cap and standing duration aren't tracked as a resource — track manually."),
    ],
  },
  {
    id: "solidGround",
    name: "Solid Ground",
    summary:
      "A bomb deals no damage but instead transmutes a 5-ft. cube of dirt, loose soil, or stone into solid, unworkable ground for minutes equal to your alchemist level, blocking burrow, earthmeld, and similar earth-melding abilities there.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "spellKnowledge",
    name: "Spell Knowledge",
    summary:
      "Choose a sorcerer/wizard spell at least 2 levels below your highest-level extract known; prepare and cast it as an arcane spell using an extract slot one level higher, with your alchemist level as caster level and Intelligence-based DCs. Can be taken multiple times for additional spells.",
    contextNotes: [note("Spell choice and slot bookkeeping aren't tracked here — track manually.")],
  },
  {
    id: "splittingMutagen",
    name: "Splitting Mutagen",
    minLevel: 12,
    summary:
      "Once per day while your mutagen is active, split into two identical copies as an immediate action after taking piercing or slashing damage, dividing your current hit points between them and sharing resources and equipment; at the end of your next turn one copy becomes you and the other dissolves, with a permanent negative level if a copy is destroyed early.",
    contextNotes: [
      note("Duplicate-body mechanic with shared resources — not modeled; track manually."),
    ],
  },
  {
    id: "strafeBomb",
    name: "Strafe Bomb",
    summary:
      "Throw a bomb that splashes along a 40-ft. line instead of a radius, rolling your attack against one chosen creature in the line while every other square in the line takes splash damage; the line doubles to 80 ft. if combined with Explosive Bomb.",
  },
  {
    id: "substantiatingBomb",
    name: "Substantiating Bomb",
    minLevel: 10,
    summary:
      "A bomb deals no damage but instead creates a 10-ft.-radius fog cloud (1 round per level) that makes incorporeal creatures passing through it partially solid — taking half damage from nonmagical attacks and full damage from magic — for as long as the cloud lasts even after they leave it, unless they succeed at a Will save.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "subsumedSpirit",
    name: "Subsumed Spirit",
    summary:
      "Requires Parasitic Twin. Your manifested twin can babble as a standard action, a number of times per day equal to 3 + your Intelligence modifier, forcing creatures within 60 ft. to save or suffer confusion for 1 round per alchemist level; you are immune to your own twin's babbling.",
    contextNotes: [note("Requires the Parasitic Twin discovery.")],
  },
  {
    id: "sunlightAcclimation",
    name: "Sunlight Acclimation",
    summary:
      "When your sunlight vulnerability would deal Constitution damage, attempt a DC 11 Fortitude save (increasing by 1 for each additional hour spent in sunlight within the last 24 hours) to negate it.",
    contextNotes: [note("Only relevant to alchemists with a sunlight-vulnerability weakness.")],
  },
  {
    id: "sunlightBomb",
    name: "Sunlight Bomb",
    minLevel: 10,
    summary:
      "Requires Blinding Bomb. Bombs explode with sunlight-equivalent radiance and blind like a blinding bomb; undead, fungi, molds, oozes, slimes, and other sunlight-vulnerable creatures take +2 damage per die, and sunlight-vulnerable undead that fail their save are also staggered for 1 round.",
    contextNotes: [bombRiderNote, note("Requires the Blinding Bomb discovery.")],
  },
  {
    id: "syringeStirge",
    name: "Syringe Stirge",
    minLevel: 6,
    summary:
      "As a full-round action, spend two daily bomb uses to create a syringe stirge (choosing which bomb type it carries) that flocks around you until ordered to attack; on a successful attach it injects your bomb's direct-hit damage plus your Intelligence modifier and then dies. Lasts 1 minute per level or until destroyed or spent.",
    contextNotes: [
      note("Consumes 2 daily bomb uses per creation — not auto-deducted; track manually."),
    ],
  },
  {
    id: "taintedInfusion",
    name: "Tainted Infusion",
    summary:
      "Requires Delayed Bomb and Infusion. When preparing an infused extract with a duration longer than instantaneous, lace it with one of your bombs (optionally shortening its duration to 1 round); when the duration ends, it detonates for 150% of your bomb's damage against the drinker with no splash radius.",
    contextNotes: [
      note(
        "Requires the Delayed Bomb and Infusion discoveries; consumes both an infusion slot and a daily bomb use.",
      ),
    ],
  },
  {
    id: "tanglefootBomb",
    name: "Tanglefoot Bomb",
    summary:
      "A direct hit entangles the target and glues it to the floor as a failed tanglefoot bag save; creatures in the splash radius that fail their save are entangled but not glued down.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "tentacle",
    name: "Tentacle",
    summary:
      "Grow a prehensile, arm-length tentacle that can wield or hold items and make a grab attack (1d4 damage, or 1d3 if Small) without granting extra actions or attacks per round; it has no magic item slot.",
    contextNotes: [
      note(
        "Extra manipulator/attack — this engine has no extra-limb attack builder; add manually.",
      ),
    ],
  },
  {
    id: "thornyBomb",
    name: "Thorny Bomb",
    summary:
      "Bombs deal piercing damage and count as magic weapons for overcoming damage reduction.",
    contextNotes: [bombRiderNote],
  },
  {
    id: "trueMutagen",
    name: "True Mutagen",
    minLevel: 20,
    summary:
      "Requires Grand Mutagen. Your mutagen instead grants +8 natural armor and +8 alchemical bonus to Strength, Dexterity, and Constitution, with a -2 penalty to Intelligence, Wisdom, and Charisma while it lasts.",
    contextNotes: [
      note(
        "Scales the base Mutagen buff's numbers past what the toggleable buffs model — apply by hand. Requires Grand Mutagen.",
      ),
    ],
  },
  {
    id: "underwaterDemolition",
    name: "Underwater Demolition",
    summary:
      "Throw bombs underwater, including from the air into water (normally impossible for thrown weapons); the range increment drops to 5 ft. while the bomb travels through water.",
    contextNotes: [note("Situational range-increment change — not tracked here.")],
  },
  {
    id: "voidBomb",
    name: "Void Bomb",
    minLevel: 6,
    summary:
      "Drow only. Bombs deal 1d4 bludgeoning damage (plus 1d4 per 2 alchemist levels beyond 1st) instead of the usual 1d6; a direct hit knocks the target prone for 1 round unless it saves, and creatures within 5 ft. of the target have their speed reduced to 5 ft. for 1 round unless they save.",
    contextNotes: [bombRiderNote, note("Race-restricted (drow).")],
  },
  {
    id: "volumizer",
    name: "Volumizer",
    summary:
      "Use an extract slot of any level to create a reactive tablet that purifies and doubles a volume of water — up to 1 gallon per alchemist level per extract-slot level, as purify food and drink — growing over about a minute; an unused tablet lasts until you next prepare extracts.",
  },
  {
    id: "webbedExtremities",
    name: "Webbed Extremities",
    summary:
      "Grow webbing between fingers and toes, granting a +4 alchemical bonus on Swim checks and letting you take 10 on Swim checks even while distracted or endangered.",
    changes: [{ formula: "4", target: "skill.swm", type: "alchemical" }],
  },
  {
    id: "wetCoat",
    name: "Wet Coat",
    minLevel: 4,
    summary:
      "Condition your body so it never fully dries out, making you immune to the ill effects of your water dependency.",
    contextNotes: [
      note(
        "Requires the aquatic subtype and a water dependency special quality — narrow applicability.",
      ),
    ],
  },
]);

export const ALCHEMIST_DISCOVERIES: Record<string, AlchemistDiscoveryDef> = Object.fromEntries(
  DISCOVERY_LIST.map((d) => [d.id, d]),
);

export const ALCHEMIST_DISCOVERY_IDS: readonly string[] = DISCOVERY_LIST.map((d) => d.id);

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.alchemistDiscoveries` (see that type's doc comment) is the FULL
 * published discovery catalog (168 entries) — prose only. Same "hand-authored
 * wins on a name collision, vendored catalog is the browsable/fallback source
 * of definitions" pattern `rage-powers.ts`'s `mergedRagePowerCatalog`
 * documents in full.
 *
 * Collision audit (all 168 hand-authored entries, run against the pinned Pf
 * Data 1e slice): every one matched a vendored entry by normalized name — no
 * drift, no alias needed, no orphan, and the vendored-only fallback path
 * only exists for future data bumps. No name collides within the vendored
 * catalog itself either.
 */

/** Empty — see the collision-audit comment above; kept for the same reason `rage-powers.ts`'s alias map is kept empty. */
const ALCHEMIST_DISCOVERY_NAME_ALIASES: Record<string, string> = {};

function normalizeDiscoveryName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/** Cheap HTML->text preview for a vendored-only entry's picker row — see `rage-powers.ts`'s identical helper. */
function plainTextPreview(html: string, max = 200): string {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > max ? `${text.slice(0, max - 1).trimEnd()}…` : text;
}

/** A catalog entry the picker can browse — either the hand-authored def (matched) with vendored prose attached, or a vendored-only entry rendered display-only. */
export interface MergedAlchemistDiscoveryEntry extends AlchemistDiscoveryDef {
  /** Ability-type suffix as published — absent for most entries (see `AlchemistDiscovery.nameSuffix`'s doc comment) and for the hand-authored-only case (none exist here — see the collision audit above). */
  nameSuffix?: string;
  /** Grouping tag from the source, e.g. "Primary Bomb Discoveries", "Grand Discoveries". */
  category?: string;
  /** Full vendored HTML prose, when a vendored catalog entry backs this id. */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
}

function vendoredToDef(entry: AlchemistDiscovery): MergedAlchemistDiscoveryEntry {
  return {
    id: entry.id,
    name: entry.name,
    nameSuffix: entry.nameSuffix,
    category: entry.category,
    // NOT `entry.level` — not a level-gate (see `AlchemistDiscovery.level`'s
    // doc comment). A vendored-only entry gets the same 2nd-level floor
    // every discovery shares, rather than a fabricated per-entry minimum.
    minLevel: 2,
    summary: plainTextPreview(entry.description ?? ""),
    changes: [],
    displayOnly: true,
    description: entry.description,
    sources: entry.sources,
  };
}

/**
 * Resolve a picked discovery id (`doc.build.alchemistDiscoveries` entries)
 * to its definition — hand-authored table first (mechanics-authoritative),
 * falling back to the vendored catalog for an id that only exists there.
 * Used by `collect.ts`/`archetypes.ts` instead of indexing
 * `ALCHEMIST_DISCOVERIES` directly, so a vendored-only pick resolves to a
 * real (display-only) definition rather than being silently dropped.
 */
export function resolveAlchemistDiscovery(
  id: string,
  refData: RefData,
): AlchemistDiscoveryDef | undefined {
  const hand = ALCHEMIST_DISCOVERIES[id];
  if (hand) return hand;
  const vendored = refData.alchemistDiscoveries?.[id];
  return vendored ? vendoredToDef(vendored) : undefined;
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored entry
 * REPLACED by that hand-authored def (keeping its id and real mechanics, but
 * carrying the vendored entry's prose/sources along for display); no
 * hand-authored-only entries exist to append per the collision audit above.
 * `!entry.displayOnly` marks which rows carry real mechanics, for the
 * picker's "M" badge.
 */
export function mergedAlchemistDiscoveryCatalog(refData: RefData): MergedAlchemistDiscoveryEntry[] {
  const handByNormName = new Map<string, AlchemistDiscoveryDef>();
  for (const d of DISCOVERY_LIST) {
    handByNormName.set(normalizeDiscoveryName(ALCHEMIST_DISCOVERY_NAME_ALIASES[d.id] ?? d.name), d);
  }

  const vendored = Object.values(refData.alchemistDiscoveries ?? {});
  const merged: MergedAlchemistDiscoveryEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeDiscoveryName(v.name));
    merged.push(
      handMatch
        ? {
            ...handMatch,
            nameSuffix: v.nameSuffix,
            category: v.category,
            description: v.description,
            sources: v.sources,
          }
        : vendoredToDef(v),
    );
  }
  return merged;
}
