/**
 * Clean-room PF1 cavalier/samurai order reference table (DESIGN §6):
 * hand-authored from the published rules (Advanced Player's Guide for the six
 * core cavalier orders, Ultimate Combat for the samurai's own Warrior/Ronin
 * orders; verified against public SRD text/AoN), mirroring
 * `oracle-revelations.ts`'s posture. Like revelations, orders are NOT
 * structured data anywhere in the vendored Foundry pack — the Cavalier and
 * Samurai class defs only link the generic "Order"/"Order (SAM)" stub
 * `ClassFeature` (confirmed: `class-features.json` carries no per-order
 * entries at all), so there is no upstream JSON to normalize.
 *
 * Scope: the six APG cavalier orders (Cockatrice, Dragon, Lion, Shield,
 * Star, Sword) plus the two UC samurai-specific orders (Warrior, Ronin), in
 * `CAVALIER_ORDERS`/`SAMURAI_ORDERS`, PLUS the 30 other published orders (from
 * Ultimate Combat, the Advanced Class Guide, and regional splatbooks) in
 * `SPLATBOOK_ORDERS`. A samurai may also choose any of these cavalier orders
 * instead of Warrior/Ronin (RAW) — `forClasses` on every cavalier-eligible
 * entry includes `"samurai"` for that reason; Warrior/Ronin and the two
 * samurai-specific splatbook orders (Eclipse, Songbird — their own text names
 * only "samurai", unlike every cavalier-worded order) are cavalier-ineligible.
 * All three tables share the same `OrderDef` chassis and `build()` helper;
 * `orderByTag` (the live `compute.ts` wiring path) and `mergedOrderCatalog`
 * both consult all three.
 *
 * Every order grants three things, each with a different modeling posture:
 *
 * 1. **Order skills** — two (or occasionally three) bonus class skills,
 *    wired into `compute.ts`'s `classSkillSet` (gated on the character
 *    having cavalier or samurai levels), the same pathway
 *    `oracle-mysteries.ts`'s `classSkills` and `kineticist-elements.ts`'s
 *    `classSkills` use. The only piece of any order's chassis that's a real,
 *    unconditional number — every other order-granted number below is
 *    target-scoped, activated, or conditioned on a trigger the engine can't
 *    check automatically.
 * 2. **Challenge rider** — the specific numeric bonus/rider the order grants
 *    to the base Challenge ability (base Challenge itself is order- agnostic:
 *    it just lets the cavalier/samurai designate a target and draws from the
 *    `uses.maxFormula`-derived pool already wired in `resources.ts` — see that
 *    pool's `detail`). Most riders scale `+1 per 4 cavalier/samurai levels`
 *    starting at +1 (same "Table: Cavalier's Order" progression,
 *    `1 + floor((level - 1) / 4)`, verified per-order against AoN text, not
 *    assumed) but the bonus TYPE and WHAT it applies to differs per order
 *    (melee damage vs. AC vs. saves vs. an ally's attack rolls vs. damage
 *    reduction,...), a handful replace the standard rider with a flat,
 *    non-scaling number or a bespoke mechanic entirely (Flame's chained
 *    "glorious challenge", Hammer's and Seal's free combat maneuver, Tome's
 *    flat +2), and several are additionally scoped to "while threatening the
 *    target" / "while mounted" / benefiting allies rather than the cavalier —
 *    squarely the same "target-scoped, can't check automatically" territory
 *    as Smite Evil's target-vs-alignment gate or a Favored Enemy bonus.
 *    `challengeRiderAt(order, level)` computes the live "+1 per 4 levels"
 *    number for a template that uses it; `DeedsPanel`/`OrderPicker`-adjacent
 *    UI surfaces the substituted text, never as an automatic Change.
 * 3. **Order abilities at 2nd/8th/15th level** — every one of the 114 (38
 *    orders x 3 tiers) is either purely narrative (a bonus feat grant with
 *    conditions, an aid-another/attack-of-opportunity trigger, a reroll) or
 *    a self-buff conditioned on a specific action/trigger the engine has no
 *    hook for (demoralize, aid another, charge, a specific saving-throw
 *    category). None is a flat always-on number. Per this project's honesty
 *    bar (see oracle-revelations.ts / arcanist-exploits.ts), every ability
 *    here is prose summary only, `changes: []` — same `displayOnly: true`
 *    convention.
 *
 * No `doc.build.*` picker field lives in this module — `build.cavalierOrder`
 * (schema, shared by both classes — see its doc comment) is a plain string
 * tag set by `apps/web/src/model/doc.ts`'s `setCavalierOrder`, same
 * free-choice/soft-warning posture as `setOracleMystery`.
 */

import type { CavalierOrder, ContextNote, RefData, SkillId, SourceRef } from "@pf1/schema";

export interface OrderAbility {
  level: 2 | 8 | 15;
  name: string;
  /** Short paraphrased rules summary (not verbatim SRD text). */
  summary: string;
}

export interface OrderDef {
  /** Order tag — key into `CAVALIER_ORDERS`/`SAMURAI_ORDERS`, and the value stored in `doc.build.cavalierOrder`. */
  id: string;
  name: string;
  /** Which class(es) can select this order. */
  forClasses: readonly ("cavalier" | "samurai")[];
  /** Two bonus class skills the order grants, wired into `compute.ts`'s `classSkillSet` (see file doc comment). */
  orderSkills: readonly SkillId[];
  /** One-line paraphrase of the order's edicts. */
  edicts: string;
  /**
   * Paraphrase of what the Challenge ability's rider does for this order,
   * with `{n}` as a placeholder for the current numeric value (see
   * `challengeRiderAt`) — e.g. "+{n} morale bonus to melee damage rolls
   * against the challenge target while no one else threatens it."
   */
  challengeTemplate: string;
  /** The order's 2nd/8th/15th-level abilities, in level order. */
  abilities: readonly OrderAbility[];
  contextNotes?: ContextNote[];
  /** Always true — no order ability here has a flat always-on numeric Change (see file doc comment). */
  displayOnly: true;
}

interface RawOrder {
  id: string;
  name: string;
  forClasses: readonly ("cavalier" | "samurai")[];
  orderSkills: readonly SkillId[];
  edicts: string;
  challengeTemplate: string;
  abilities: readonly OrderAbility[];
  contextNotes?: ContextNote[];
}

function build(entries: RawOrder[]): Record<string, OrderDef> {
  return Object.fromEntries(
    entries.map((e) => [
      e.id,
      {
        id: e.id,
        name: e.name,
        forClasses: e.forClasses,
        orderSkills: e.orderSkills,
        edicts: e.edicts,
        challengeTemplate: e.challengeTemplate,
        abilities: e.abilities,
        contextNotes: e.contextNotes,
        displayOnly: true as const,
      },
    ]),
  );
}

const CAVALIER_SAMURAI: readonly ("cavalier" | "samurai")[] = ["cavalier", "samurai"];

/** The six Advanced Player's Guide cavalier orders — also selectable by a samurai in place of Warrior/Ronin (RAW). */
export const CAVALIER_ORDERS: Record<string, OrderDef> = build([
  {
    id: "cockatrice",
    name: "Order of the Cockatrice",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["apr", "prf"],
    edicts:
      "Serves only himself — prioritizes personal gain, claims an equal or greater share of loot, and pursues prestige and power.",
    challengeTemplate:
      "+{n} morale bonus to melee damage rolls against the challenge target, as long as he's the only one threatening it.",
    abilities: [
      {
        level: 2,
        name: "Braggart",
        summary:
          "Gains Dazzling Display as a bonus feat (usable without a weapon as a standard action); +2 morale bonus on melee attacks vs. demoralized foes.",
      },
      {
        level: 8,
        name: "Steal Glory",
        summary:
          "When another creature confirms a crit against a foe he's threatening, he gets an AoO against that foe.",
      },
      {
        level: 15,
        name: "Moment of Triumph",
        summary:
          "Once/day, free action: for 1 round, gains a competence bonus equal to his Cha modifier on ability checks, attacks, damage, saves, skill checks, and AC, and automatically confirms critical threats.",
      },
    ],
  },
  {
    id: "dragon",
    name: "Order of the Dragon",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["per", "sur"],
    edicts:
      "Stays loyal to his allies, furthers the group's aims, protects allies from harm, and defends their honor.",
    challengeTemplate:
      "Allies gain a +{n} circumstance bonus on melee attack rolls against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Aid Allies",
        summary:
          "Aid another grants +3 (instead of +2) to AC, attack, save, or skill check; the bonus grows +1 more at 8th and every 6 levels after.",
      },
      {
        level: 8,
        name: "Strategy",
        summary:
          "Standard action: grant every ally within 30 ft. one of +2 dodge AC, +2 morale to attack, or a free move — for 1 round, once per ally per combat.",
      },
      {
        level: 15,
        name: "Act as One",
        summary:
          "Once/combat, standard action: move and melee-attack, then every ally within 30 ft. may do the same as an immediate action, all with +2 to the attack and +2 dodge AC for 1 round.",
      },
    ],
  },
  {
    id: "lion",
    name: "Order of the Lion",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "kno"],
    edicts:
      "Protects his sovereign's life and lands, obeys commands without question, and expands the realm's power.",
    challengeTemplate: "+{n} dodge bonus to AC against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Lion's Call",
        summary:
          "Standard action: allies within 60 ft. gain a Cha-mod bonus on fear saves and +1 competence on attacks for a number of rounds equal to his level; frightened/panicked allies get an immediate re-save.",
      },
      {
        level: 8,
        name: "For the King",
        summary:
          "Once/combat, swift action: allies within 30 ft. gain a Cha-mod competence bonus on attack and damage rolls for 1 round.",
      },
      {
        level: 15,
        name: "Shield of the Liege",
        summary:
          "Adjacent allies gain +2 shield AC; as an immediate action before the roll, he can redirect an attack against an adjacent ally onto himself instead.",
      },
    ],
  },
  {
    id: "shield",
    name: "Order of the Shield",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["hea", "klo"],
    edicts:
      "Protects commoners from harm and exploitation, gives charity, and never harms those who can't defend themselves.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls against the challenge target for 1 minute when it attacks someone other than him.",
    abilities: [
      {
        level: 2,
        name: "Resolute",
        summary:
          "While wearing heavy armor, converts 1 point of a lethal hit to nonlethal (once per hit); the amount grows by 1 at 6th and every 4 levels after.",
      },
      {
        level: 8,
        name: "Stem the Tide",
        summary:
          "Gains Stand Still as a bonus feat; a normal damaging attack (instead of a maneuver check) can stop a moving target in its tracks.",
      },
      {
        level: 15,
        name: "Protect the Meek",
        summary:
          "Immediate action: move up to speed and make one melee attack, ending adjacent to a foe; becomes staggered next turn, 1-round recharge.",
      },
    ],
  },
  {
    id: "star",
    name: "Order of the Star",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["hea", "kre"],
    edicts:
      "Protects the faith and its followers, upholds its strictures, promotes its cause, and serves its divine agents.",
    challengeTemplate:
      "+{n} morale bonus on all his saving throws while threatening the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Calling",
        summary:
          "Standard action to pray, up to 4/day: gain a Cha-mod competence bonus on one ability check/attack/save/skill check within the next minute; his cavalier levels stack with paladin/cleric levels for channel energy and lay on hands.",
      },
      {
        level: 8,
        name: "For the Faith",
        summary:
          "Once/day (plus more at 12th and every 4 levels after), free action: +Cha-mod morale bonus on his own attacks for 1 round, half that (min +1) for co-religionist allies within 30 ft.",
      },
      {
        level: 15,
        name: "Retribution",
        summary:
          "A successful melee hit against him or an adjacent co-religionist ally provokes an AoO with a +2 morale bonus; on a crit, he may treat the attacker as his challenge target for that AoO.",
      },
    ],
  },
  {
    id: "sword",
    name: "Order of the Sword",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kno", "kre"],
    edicts:
      "Lives by the code of chivalry: courage, mercy to the defeated, charity to the poor, and defense of honor.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls against the challenge target while mounted.",
    abilities: [
      {
        level: 2,
        name: "By My Honor",
        summary:
          "Chooses one alignment component; while he maintains it, gains a +2 morale bonus on one chosen saving throw.",
      },
      {
        level: 8,
        name: "Mounted Mastery",
        summary:
          "Ignores armor check penalty on Ride checks, gains +4 dodge AC vs. attacks set against his charge, adds the mount's Str modifier to charge damage, and a bonus feat from a mounted-combat list.",
      },
      {
        level: 15,
        name: "Knight's Challenge",
        summary:
          "Once/day, a special challenge adds his Cha bonus to attack and damage rolls against the target and grants +4 on checks to confirm critical hits against it.",
      },
    ],
  },
]);

/** The samurai's own Ultimate Combat orders — Warrior/Ronin are cavalier-ineligible (a samurai may pick a cavalier order instead, see `CAVALIER_ORDERS`). */
export const SAMURAI_ORDERS: Record<string, OrderDef> = build([
  {
    id: "warrior",
    name: "Order of the Warrior",
    forClasses: ["samurai"],
    orderSkills: ["khi", "kno"],
    edicts:
      "Protects his lord's life and lands, is truthful and courageous, respects elders/masters, and acts with honor.",
    challengeTemplate: "DR {n}/— against attacks made by the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Honor in All Things",
        summary:
          "Free action, up to 1/day at 2nd (plus 1 more per 4 levels, max 5/day at 18th): +4 morale bonus on a skill check or saving throw.",
      },
      {
        level: 8,
        name: "Way of the Samurai",
        summary:
          "Standard action, spends a Resolve use: for the next minute, once, roll an attack/skill check/save three times and take the best result.",
      },
      {
        level: 15,
        name: "Strike True",
        summary:
          "Once/day: an attack automatically threatens a critical if it hits, deals maximum damage (extra dice roll normally), ignores DR, and inflicts a chosen condition (blinded/deafened/sickened/staggered) for 1d4 rounds.",
      },
    ],
  },
  {
    id: "ronin",
    name: "Order of the Ronin",
    forClasses: ["samurai"],
    orderSkills: ["klo", "sur"],
    edicts:
      "Follows his own personal code of at least three provisions (subject to GM approval) rather than a lord's.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls and +{n} dodge bonus to AC against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Self Reliant",
        summary:
          "A failed Will save against an effect lasting more than 1 round gets a second attempt at the end of round 2; rolls stabilization twice (best result) at negative hp.",
      },
      {
        level: 8,
        name: "Without Master",
        summary:
          "Once/combat, immediate action: avoid dropping below 0 hp (to 1 instead), reroll a crit confirmation, or take 10 on a skill check in combat.",
      },
      {
        level: 15,
        name: "Chosen Destiny",
        summary:
          "Rolls twice (best result) on saves vs. charm/compulsion; once/day, may declare a d20 roll a natural 20 before rolling it.",
      },
    ],
  },
]);

/**
 * The 30 published orders beyond the six APG cavalier orders and the two UC
 * samurai orders — Ultimate Combat, the Advanced Class Guide, and regional
 * splatbooks. `id` matches the vendored `cavalier-orders.json` key directly
 * (no wording-drift alias needed, unlike Ronin) so `mergedOrderCatalog`'s
 * name-normalized match finds it and `doc.build.cavalierOrder` round-trips
 * through the merge unchanged. Every entry here grants the full chassis
 * (skills, Challenge rider, three leveled abilities), same as
 * `CAVALIER_ORDERS`/`SAMURAI_ORDERS` — but per this file's honesty bar, only
 * `orderSkills` is a real always-on number; `challengeTemplate`/`abilities`
 * are prose same as every other order (see file doc comment point 2/3).
 * Eclipse and Songbird are the two whose own text names only "samurai"
 * (Kaoling hobgoblin darkvision culture; poet-duelist geisha tradition), so
 * unlike the rest they're not offered to a pure cavalier.
 */
export const SPLATBOOK_ORDERS: Record<string, OrderDef> = build([
  {
    id: "order_of_the_asp",
    name: "Order of the Asp",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "slt"],
    edicts:
      "Serves the order's cutthroat hierarchy: maximizes her own and her patrons' prestige, wealth, and profit, directing (and sacrificing) hirelings as needed.",
    challengeTemplate:
      "+{n} morale bonus on attack and damage rolls against the challenge target while it's entangled, exhausted, fatigued, flanked, nauseated, prone, shaken, staggered, or denied its Dex bonus to AC.",
    abilities: [
      {
        level: 2,
        name: "Indiscriminate",
        summary:
          "Demoralizing a foe lets her demoralize an equal number of nearby allies as a free action; gains a scaling morale bonus on saves while near a shaken ally, and can dirty-trick a shaken creature without provoking.",
      },
      {
        level: 8,
        name: "Command the Meek",
        summary:
          "Shaken allies count as having her teamwork feats when determining whether she gets their bonus; tactician's duration doubles for low-HD or shaken allies.",
      },
      {
        level: 15,
        name: "Better You Than Me",
        summary:
          "Immediate action: interposes an adjacent shaken (or lower-HD) ally between herself and an incoming attack, splitting the damage unless the ally fails a Reflex save.",
      },
    ],
  },
  {
    id: "order_of_the_beast_acg",
    name: "Order of the Beast (ACG)",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kna", "sur"],
    edicts:
      "Protects animals and magical beasts from civilization's encroachment, resorting to lethal force against a beast only after attempts to calm it fail.",
    challengeTemplate:
      "His mount gains a +{n} circumstance bonus on melee attack rolls against the challenge target while he's threatening it.",
    abilities: [
      {
        level: 2,
        name: "Wild Empathy",
        summary:
          "Gains wild empathy as the druid ability, using his cavalier level as his effective druid level.",
      },
      {
        level: 8,
        name: "Wild Mount Shape",
        summary:
          "Once/day (more at higher levels), can reshape his mount into a different Medium or Large animal for 1 hour/level, as beast shape II; at 15th level the option extends to Medium or Large dragons, as form of the dragon I.",
      },
      {
        level: 15,
        name: "Ferocious Charge",
        summary:
          "When he charges a creature, can attempt a free Intimidate check to demoralize it.",
      },
    ],
  },
  {
    id: "order_of_the_beast_isc",
    name: "Order of the Beast (ISC)",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["dev", "ste"],
    edicts:
      "Shows no mercy, seeks out conflict at every turn, and destroys or desecrates whatever he can't steal, pillage, or claim.",
    challengeTemplate:
      "+{n} morale bonus on damage rolls while using Cleave or Great Cleave, as long as the challenge target was the first creature attacked.",
    abilities: [
      {
        level: 2,
        name: "Vandal",
        summary:
          "Gains Improved Sunder as a bonus feat, adds half his level to damage against objects, and gains a +2 morale bonus on attacks after breaking one.",
      },
      {
        level: 8,
        name: "Havoc",
        summary:
          "His mount gains trample (or its trample damage increases as if one size larger); a creature that Reflex-saves against the mount's trample provokes an attack of opportunity from him.",
      },
      {
        level: 15,
        name: "Unstoppable Ravager",
        summary:
          "Below 0 hp, keeps acting instead of falling unconscious as long as he deals enough damage each round, at the cost of losing access to magical healing and dying once he can no longer act.",
      },
    ],
  },
  {
    id: "order_of_the_blossom",
    name: "Order of the Blossom",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["dis", "kna"],
    edicts:
      "Can't refuse a fey's request for aid absent a conflicting duty, and must protect First World gates and destroy corrupted fey.",
    challengeTemplate:
      "-{n} penalty on the challenge target's saves against spells and spell-like abilities from fey or from him.",
    abilities: [
      {
        level: 2,
        name: "Sneak Attack",
        summary:
          "Gains rogue sneak attack, +1d6 at 2nd level and another 1d6 every 6 levels after, stacking with sneak attack from other sources.",
      },
      {
        level: 8,
        name: "Fey Enchantments",
        summary:
          "Gains animal messenger, enthrall, hideous laughter, and suggestion as spell-like abilities (3/day combined, CL = cavalier level; 7/day plus charm monster and terrible remorse at 16th).",
      },
      {
        level: 15,
        name: "Curse of the First World",
        summary:
          "Melee attacks count as chaotic-aligned for DR; confirming a crit against an enchanted target confuses it for 1d6 rounds.",
      },
    ],
  },
  {
    id: "order_of_the_blue_rose",
    name: "Order of the Blue Rose",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["khi", "kno"],
    edicts:
      "Guards against needless violence, favors peaceful resolutions, and honors quarter given to a surrendered foe.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls against the challenge target, if it's an intelligent creature he offered the chance to surrender.",
    abilities: [
      {
        level: 2,
        name: "Flat of the Blade",
        summary:
          "No longer takes the -4 penalty to deal nonlethal damage with a lethal weapon, and gains +2 on nonlethal damage rolls.",
      },
      {
        level: 8,
        name: "Inner Peace",
        summary:
          "Once/day (more at higher levels), immediate action: ignores hit point damage from a single source equal to his level plus Charisma modifier.",
      },
      {
        level: 15,
        name: "Shield of Blades",
        summary:
          "While taking total defense, extends a +2 circumstance AC bonus to adjacent allies and can attempt to deflect an incoming attack with an opposed attack roll.",
      },
    ],
  },
  {
    id: "order_of_the_eastern_star",
    name: "Order of the Eastern Star",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kar", "kpl"],
    edicts:
      "Preserves the order's secrets while protecting civilization from occult threats, reporting any threat he learns of.",
    challengeTemplate:
      "+{n} dodge bonus to AC and +{n} insight bonus on saves against the challenge target's attacks, while lightly armored or unarmored and lightly loaded.",
    abilities: [
      {
        level: 2,
        name: "Guarded",
        summary:
          "Gains DR 1/- (scaling) and a +2 morale bonus on saves while fighting defensively or using Combat Expertise in light or no armor.",
      },
      {
        level: 8,
        name: "Pierce the Guard",
        summary:
          "Ignores the fighting-defensively/Combat-Expertise penalty on his first light or one-handed melee attack each round (both weapons if fighting with two).",
      },
      {
        level: 15,
        name: "One Purpose",
        summary:
          "His mount shares his Guarded benefits while both are lightly armored/loaded, and gains his challenge bonuses regardless of barding.",
      },
    ],
  },
  {
    id: "order_of_the_eclipse",
    name: "Order of the Eclipse",
    forClasses: ["samurai"],
    orderSkills: ["per", "sur"],
    edicts:
      "Avoids creating unnecessary light, answers to a military chain of command, and works to extinguish his foes' light sources.",
    challengeTemplate: "+{n} bonus on Intimidate checks against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Dark Rider",
        summary:
          "While mounted, he and his mount share the better of either's darkvision, low-light vision, scent, and see in darkness.",
      },
      {
        level: 8,
        name: "Eclipsing Blade",
        summary:
          "Once/day (more at higher levels), casts darkness on a held weapon; the darkness doesn't blind order members or their mounts.",
      },
      {
        level: 15,
        name: "See in Darkness",
        summary:
          "Sees perfectly in darkness, even magical darkness, as the universal monster ability.",
      },
    ],
  },
  {
    id: "order_of_the_eel",
    name: "Order of the Eel",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "per"],
    edicts:
      "Greets strangers openly, never refuses a fair alliance or bargain, and punishes those who renege on one.",
    challengeTemplate:
      "Allies of a different race than him gain a +{n} circumstance bonus on attack rolls against the challenge target while he's threatening it.",
    abilities: [
      {
        level: 2,
        name: "Temporary Alliance",
        summary:
          "Full-round action: forms an alliance with a willing, Int 4+ creature, granting it +1 competence on attacks against his threatened targets and on saves against their effects for 1 hour/2 levels.",
      },
      {
        level: 8,
        name: "Rally Allies",
        summary:
          "Swift action: grants allies within 30 ft. a competence bonus on damage rolls for 1 round equal to the number of distinct races present (up to his Charisma modifier), usable a limited number of times per day.",
      },
      {
        level: 15,
        name: "Share the Danger",
        summary:
          "Full-round action: pacts with a willing, Int 4+ creature so both gain a Charisma-based deflection bonus to AC and split incoming hit point damage evenly.",
      },
    ],
  },
  {
    id: "order_of_the_ennead_star",
    name: "Order of the Ennead Star",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "per"],
    edicts:
      "Serves as the law's merciless enforcer, bringing lawbreakers to justice (or acting as executioner) and upholding his Hellknight order.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls (and on Intimidate checks to demoralize) against a challenge target that's chaotic-aligned or witnessed committing a crime in the last hour.",
    abilities: [
      {
        level: 2,
        name: "Oppress",
        summary:
          "Dealing damage with his Hellknight order's favored weapon reveals as a swift action whether the target is chaotic (as detect chaos); learning this grants a +1 morale bonus on attacks against it.",
      },
      {
        level: 8,
        name: "Subjugate",
        summary:
          "Confirming a crit against a chaotic or recently-witnessed-criminal target adds his Charisma modifier to the damage, and can demoralize nearby foes as an immediate action if it drops or kills the target (once/combat).",
      },
      {
        level: 15,
        name: "Hand of the Law",
        summary:
          "Swift action, limited rounds: ignores difficult terrain, gains +2 on charge attacks, and extends the shaken duration (and penalty) of foes he demoralizes.",
      },
    ],
  },
  {
    id: "order_of_the_first_law",
    name: "Order of the First Law",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["hea", "kre"],
    edicts:
      "Protects atheists and irreligious folk, refuses any patron deity or divine service, and shields commoners from divine agents' actions.",
    challengeTemplate:
      "Gains {n} temporary hit points (lasting up to 1 hour) each round he attacks the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Rejection of Faith",
        summary:
          "As long as he's refused all divine magic (including beneficial effects) in the last 24 hours, gains a +2 morale bonus on one saving throw of his choice, reassignable daily.",
      },
      {
        level: 8,
        name: "Threat of Reason",
        summary:
          "Threatening a divine spellcaster's space adds 4 to the DC of her concentration, dispel, and caster level checks.",
      },
      {
        level: 15,
        name: "Godslayer",
        summary:
          "Melee attacks against his challenge target, if it's a divine spellcaster, gain a Charisma-modifier bonus on attack and damage rolls (multiplied on a crit).",
      },
    ],
  },
  {
    id: "order_of_the_flame",
    name: "Order of the Flame",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "sur"],
    edicts:
      "Pursues glory relentlessly for himself and his companions, no matter the cost, seeking out ever greater rivals.",
    challengeTemplate:
      "After dropping the challenge target, can chain an immediate glorious challenge onto a new foe within 15 ft. for a stacking morale bonus on melee damage (and a stacking AC penalty) that grows with each consecutive victory.",
    abilities: [
      {
        level: 2,
        name: "Foolhardy Rush",
        summary:
          "On an initiative roll of 11+, can move up to his speed as an immediate action without being flat-footed, deducting that distance from his next turn's movement.",
      },
      {
        level: 8,
        name: "Daunting Success",
        summary:
          "Confirming a melee crit lets him demoralize all foes within 15 ft. who can see him, as an immediate action (once/combat).",
      },
      {
        level: 15,
        name: "Blaze of Glory",
        summary:
          "Standard action, limited rounds/day: +10 ft. speed, ignores difficult terrain while charging, and a +4 (instead of +2) bonus on attack rolls.",
      },
    ],
  },
  {
    id: "order_of_the_green",
    name: "Order of the Green",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kna", "sur"],
    edicts:
      "Defends the balance of nature, tolerates neither aberrations, undead, nor wasteful exploitation, and resorts to force only when needed.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls against the challenge target (he can't challenge animals or plants); against an aberration or undead target, he can roll his first attack twice and take the better result.",
    abilities: [
      {
        level: 2,
        name: "Favored Terrain",
        summary:
          "Gains a ranger favored terrain, adding another (and improving one) at 8th level and every 6 levels after.",
      },
      {
        level: 8,
        name: "Cut the Corruption",
        summary:
          "Once/day (twice at 16th), free action: a touched weapon deals +1d6 damage to aberrations and undead for 1 minute (doesn't stack with a bane weapon's bonus).",
      },
      {
        level: 15,
        name: "End of the Cycle",
        summary:
          "Creatures he kills are treated as slain by a death effect for restoration purposes and are placed under a permanent sanctify corpse effect.",
      },
    ],
  },
  {
    id: "order_of_the_guard",
    name: "Order of the Guard",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kge", "per"],
    edicts:
      "Protects his declared ward at all costs, always accepts payment for his service, and carries out his employer's lawful orders.",
    challengeTemplate:
      "+{n} morale bonus to AC against the challenge target while he's positioned between it and his declared ward.",
    abilities: [
      {
        level: 2,
        name: "Prepared for the Journey",
        summary:
          "48 hours of study grants a scaling bonus on initiative and Knowledge (geography)/Perception/Stealth/Survival checks in a chosen ranger favored terrain, plus faster overland travel there.",
      },
      {
        level: 8,
        name: "Close at Hand",
        summary:
          "Within 30 ft. of his ward, gains a scaling morale bonus on attacks, damage, and saves (or, if the ward is lost, a locate object/status effect on it and a speed boost when moving toward it).",
      },
      {
        level: 15,
        name: "Quick Retort",
        summary:
          "A creature that attacks, steals, or sunders his ward provokes an attack of opportunity from him, with a +2 bonus on that attack.",
      },
    ],
  },
  {
    id: "order_of_the_hammer",
    name: "Order of the Hammer",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["acr", "klo"],
    edicts:
      "Continually proves her own strength and her allies', especially against those who'd challenge it.",
    challengeTemplate:
      "A free grapple or sunder combat maneuver (no attack of opportunity) whenever she full-attacks the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Mighty Bash",
        summary:
          "Doesn't provoke when unarmed-striking for nonlethal damage, and deals nonlethal unarmed damage as a monk of her cavalier level.",
      },
      {
        level: 8,
        name: "Crushing Grapple",
        summary:
          "Gains Chokehold as a bonus feat without meeting its prerequisites, and no longer takes the -5 penalty to put a foe in a chokehold.",
      },
      {
        level: 15,
        name: "Inspiring Flex",
        summary:
          "Standard action, limited rounds/day: grants herself and allies within 30 ft. a +4 morale bonus on melee attacks, combat maneuver checks, Fortitude saves, and Strength checks.",
      },
    ],
  },
  {
    id: "order_of_the_hero",
    name: "Order of the Hero",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kar", "kna"],
    edicts:
      "Vows to slay any monster threatening his chosen domain, seeing every pledge through, without lasting collateral damage.",
    challengeTemplate:
      "+{n} morale bonus on melee damage rolls against the challenge target if it's at least one size category larger than him.",
    abilities: [
      {
        level: 2,
        name: "Monster Expert",
        summary:
          "Gains a Charisma-bonus bonus on Fortitude and Reflex saves against area spells and abilities.",
      },
      {
        level: 8,
        name: "Resist Energy",
        summary:
          "Once/day (more at higher levels), move action: gains scaling energy resistance against a chosen energy type for 1 minute.",
      },
      {
        level: 15,
        name: "Counterstriking Challenge",
        summary:
          "Once/day against a Large-or-larger challenge target, gets up to three attacks of opportunity when it activates an Ex/Su special attack, and a successful hit can force a Will save or negate the action.",
      },
    ],
  },
  {
    id: "order_of_the_land",
    name: "Order of the Land",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "sur"],
    edicts:
      "Protects commoners from oppressive regimes and never refuses a mission for lack of equipment.",
    challengeTemplate: "+{n} morale bonus on ranged attack rolls against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Adaptive Strike",
        summary:
          "Gains Catch Off-Guard as a bonus feat, and can flat-foot an armed foe against improvised-weapon attacks for a round (once/combat).",
      },
      {
        level: 8,
        name: "Terrain Training",
        summary:
          "Standard action: grants allies within 60 ft. a Charisma-based competence bonus on initiative and Knowledge (geography)/Perception/Survival checks in a chosen ranger favored terrain, for a scaling duration.",
      },
      {
        level: 15,
        name: "Wild Charge",
        summary:
          "He and his mount ignore difficult terrain while charging, and gain +2 on a mighty-charge maneuver when both combatants occupy difficult terrain.",
      },
    ],
  },
  {
    id: "order_of_the_monument",
    name: "Order of the Monument",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "kre"],
    edicts:
      "Protects his settlement and its people, upholds its laws even abroad, and promotes its ideals.",
    challengeTemplate:
      "+{n} dodge bonus to AC against the challenge target while flanked, and +{n} morale bonus on saves against fear and mind-affecting effects.",
    abilities: [
      {
        level: 2,
        name: "Sworn Defender",
        summary:
          "Gains a scaling morale bonus on saves against effects from creatures whose alignment is at least two steps from his settlement's.",
      },
      {
        level: 8,
        name: "Protector of the People",
        summary:
          "Swift action, limited times/day: grants a Charisma-based morale bonus on saves for 1 round to nearby residents or ideologically-aligned creatures (doubled if both apply).",
      },
      {
        level: 15,
        name: "Bastion of the Monument",
        summary:
          "Swift action, limited rounds/day: declares an enemy of his settlement, granting himself and allies +4 on attacks, damage, ability/skill checks, and saves against that foe.",
      },
    ],
  },
  {
    id: "order_of_the_paw",
    name: "Order of the Paw",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kna", "sur"],
    edicts:
      "Protects his community (halflings foremost) from monsters and conquerors, and must ride a wolf or dog mount.",
    challengeTemplate:
      "His mount gains a +{n} dodge bonus to AC while threatening the challenge target and he's riding it.",
    abilities: [
      {
        level: 2,
        name: "Danger Ward",
        summary:
          "Standard action, up to 3/day: readies allies within 30 ft. against one save type, letting them reroll a failed save of that type with +4 within the next minute.",
      },
      {
        level: 8,
        name: "Canine Ferocity",
        summary:
          "His wolf/dog mount counts as one size larger for bull rush/overrun maneuvers, and he gains a qualifying mounted-combat bonus feat.",
      },
      {
        level: 15,
        name: "Giant Slayer",
        summary:
          "Melee hits against a challenge target two or more sizes larger gain a damage bonus equal to half his level (multiplied on a crit).",
      },
    ],
  },
  {
    id: "order_of_the_penitent",
    name: "Order of the Penitent",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["esc", "sen"],
    edicts:
      "Shows mercy and fairness to wrongdoers, presumes only the worst monsters irredeemable, and hands capable foes to lawful authorities.",
    challengeTemplate:
      "+{n} morale bonus to CMD against combat maneuvers from the challenge target while he's threatening it.",
    abilities: [
      {
        level: 2,
        name: "Expert Captor",
        summary:
          "Can tie up a grappled (even unpinned, conscious) foe without the usual -10 penalty, and the DC to escape his bonds scales with half his level.",
      },
      {
        level: 8,
        name: "Adept Disarmer",
        summary:
          "Gains Improved Disarm as a bonus feat, and a successful disarm lets him catch the dropped item in a free hand.",
      },
      {
        level: 15,
        name: "Saving Grace",
        summary:
          "Free action, once/round: converts a lethal melee hit that would drop a creature below 0 hp into nonlethal damage.",
      },
    ],
  },
  {
    id: "order_of_the_reins",
    name: "Order of the Reins",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["apr", "per"],
    edicts:
      "Keeps a protected caravan or group safe, ensures injured allied animals are healed or mercifully ended, and never lets an animal suffer needlessly.",
    challengeTemplate:
      "Allied animals, companions, familiars, and mounts within 60 ft. gain a bonus on attack rolls and to AC against the challenge target, both scaling with his level (the AC bonus starts one point higher).",
    abilities: [
      {
        level: 2,
        name: "Control the Herd",
        summary:
          "A single Handle Animal use can command a number of non-hostile riderless animals up to his level, so long as they can see or hear him.",
      },
      {
        level: 8,
        name: "Teamwork Tricks",
        summary:
          "As a free action, commanded animals and companions are treated as knowing any trick his mount knows.",
      },
      {
        level: 15,
        name: "Stampede",
        summary:
          "Standard action: incites nearby riderless and non-hostile animals to stampede, granting them +4 AC, the trample special attack, and a damage bonus for 1 round.",
      },
    ],
  },
  {
    id: "order_of_the_saddle",
    name: "Order of the Saddle",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kna", "per"],
    edicts:
      "Puts her mount's needs before her own, shows mercy to the helpless, and keeps her community's animals humanely treated.",
    challengeTemplate:
      "While mounted, can charge and Ride-By-Attack the challenge target in one move, gaining a scaling dodge bonus to AC against the resulting attacks of opportunity (doubled with the Ride-By Attack feat).",
    abilities: [
      {
        level: 2,
        name: "Mounted Synergy",
        summary:
          "Gains Mounted Combat as a bonus feat and a +2 bonus on initiative checks while mounted on a conscious, mobile mount.",
      },
      {
        level: 8,
        name: "Stalwart Mount",
        summary:
          "Her mount gains Toughness as a bonus feat (doubled hit points if it already has it) and a +2 bonus on saves.",
      },
      {
        level: 15,
        name: "Protective Partner",
        summary:
          "An attack against her mount provokes an attack of opportunity from her, with a +2 bonus on attack and damage rolls.",
      },
    ],
  },
  {
    id: "order_of_the_scales",
    name: "Order of the Scales",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "lin"],
    edicts:
      "Honors every bargain he makes, judges impartially or recuses himself, and enforces agreements he's tasked with upholding.",
    challengeTemplate:
      "+{n} morale bonus on combat maneuvers and attacks of opportunity against the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Mobile Wall",
        summary:
          "Gains Step Up as a bonus feat (usable mounted via a Ride check), and a scaling bonus to CMD against tumbling through his threatened squares.",
      },
      {
        level: 8,
        name: "Seek Retribution",
        summary:
          "Once/day, when he encounters a creature that broke a witnessed oath, swift action grants a Charisma-based competence bonus on attacks, damage, and opposed checks against it for a number of rounds equal to his level.",
      },
      {
        level: 15,
        name: "Sworn Oathkeeper",
        summary:
          "Can formally witness an oath; breaking it grants him his Seek Retribution bonuses against the oathbreaker at all times, for a Charisma-modifier number of active oaths.",
      },
    ],
  },
  {
    id: "order_of_the_seal",
    name: "Order of the Seal",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["dev", "lin"],
    edicts:
      "Guards his sworn charge with his life, keeping intruders out or a stolen item safe until recovered.",
    challengeTemplate:
      "A free bull rush or trip combat maneuver (no attack of opportunity) whenever he full-attacks the challenge target.",
    abilities: [
      {
        level: 2,
        name: "Keeper",
        summary:
          "Once/day, chooses a location or secret to protect, gaining a +2 morale bonus on attacks defending it (or on saves and opposed checks resisting its exposure) until he picks a new one.",
      },
      {
        level: 8,
        name: "I Shall Not Be Moved",
        summary:
          "Gains a +2 dodge bonus to CMD against bull rush, overrun, reposition, and trip whenever he doesn't move more than a 5-foot step.",
      },
      {
        level: 15,
        name: "Staggering Assault",
        summary:
          "Full-round action: a single attack at his best bonus, followed by a bull rush with a bonus equal to half the damage dealt.",
      },
    ],
  },
  {
    id: "order_of_the_shroud",
    name: "Order of the Shroud",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "kre"],
    edicts:
      "Protects commoners from the undead, seeks out and destroys the restless dead, and roots out sources of undeath.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls for 1 minute against an undead challenge target.",
    abilities: [
      {
        level: 2,
        name: "Spiritual Shield",
        summary:
          "Once/day, immediate action when attacked by an undead challenge target: gains a Charisma-based deflection bonus to AC against that attack.",
      },
      {
        level: 8,
        name: "Destroyer of the Undead",
        summary:
          "His weapons count as his alignment for overcoming undead DR, and automatically overcome all DR an undead challenge target has.",
      },
      {
        level: 15,
        name: "Stand Against Darkness",
        summary:
          "An undead challenge target that hits him or an adjacent ally provokes an attack of opportunity (with a +2 morale bonus); a threatened crit against him grants a Charisma-based deflection bonus on its confirmation roll.",
      },
    ],
  },
  {
    id: "order_of_the_songbird",
    name: "Order of the Songbird",
    forClasses: ["samurai"],
    orderSkills: ["kre", "prf"],
    edicts:
      "Never destroys art outside her own performance, respects a defeated foe's skill, and memorializes any sapient life she takes.",
    challengeTemplate:
      "+{n} dodge bonus to AC and +{n} sacred bonus on saves against the challenge target's attacks, while lightly armored or unarmored, shieldless, and lightly loaded.",
    abilities: [
      {
        level: 2,
        name: "Versatile Performance",
        summary: "Gains the bard's versatile performance benefit for one Perform skill.",
      },
      {
        level: 8,
        name: "Poetic Inspiration",
        summary:
          "Swift action, once/combat: allies within 30 ft. who can hear her gain a Charisma-based competence bonus on attack and damage rolls for 1 round.",
      },
      {
        level: 15,
        name: "Beautiful Strike",
        summary:
          "Once/day, confirming a crit against her challenge target lets her declare a beautiful strike: the damage becomes nonlethal, and a failed Will save charms the target as charm monster.",
      },
    ],
  },
  {
    id: "order_of_the_staff",
    name: "Order of the Staff",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kar", "kna"],
    edicts:
      "Can't refuse a spellcaster's request for aid unless it conflicts with his existing duties or opposes his own goals.",
    challengeTemplate:
      "-{n} penalty on the challenge target's saves against spells and spell-like abilities for 1 round after he damages it.",
    abilities: [
      {
        level: 2,
        name: "Spell Aid",
        summary:
          "Aiding an ally grants a scaling competence bonus on her next concentration, dispel, or caster level check.",
      },
      {
        level: 8,
        name: "Arcane Vessel",
        summary:
          "Gaining a bonus from an ally's spell also grants temporary hit points equal to the spell's level (stacking across sources up to his level, lasting 10 minutes).",
      },
      {
        level: 15,
        name: "Synchronized Smash",
        summary:
          "Adjacent to a foe caught in an ally's spell, can make an attack of opportunity against it, and automatically confirms crits against it for the rest of the round if he shares the spell's effect.",
      },
    ],
  },
  {
    id: "order_of_the_tome",
    name: "Order of the Tome",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kar", "kre", "lin"],
    edicts:
      "Protects written (or approved) knowledge above nearly all else, some equally devoted to destroying proscribed works.",
    // Flat, non-scaling — unlike most riders, the source text never says "increases by level."
    challengeTemplate:
      "+2 bonus on saves against spells and spell-like abilities from the challenge target, and +2 on Bluff and Sense Motive checks involving it.",
    abilities: [
      {
        level: 2,
        name: "Specialized Knowledge",
        summary:
          "Chooses Knowledge (arcana) or (religion) permanently; can use it untrained, with a scaling bonus on checks involving written knowledge.",
      },
      {
        level: 8,
        name: "Powerful Knowledge",
        summary:
          "Can read and cast scrolls of the matching (arcane or divine) type at caster level -4, deciphering them with Linguistics, with a scaling bonus to the governing ability score for determining the highest spell level castable.",
      },
      {
        level: 15,
        name: "Defensive Knowledge",
        summary:
          "Adjacent allies share his +2 save bonus against the challenge target's spells, and a limited number of times per day he can grant an adjacent ally a reroll on a failed save against it.",
      },
    ],
  },
  {
    id: "order_of_the_waves",
    name: "Order of the Waves",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["kge", "per"],
    edicts:
      "Perpetually explores undersea secrets, fighting only to protect his discoveries and people from undersea threats.",
    challengeTemplate: "+{n} morale bonus on saving throws while underwater.",
    abilities: [
      {
        level: 2,
        name: "Waverider",
        summary:
          "Gains a swim speed equal to his base land speed (or +10 ft. if he already has one, extending to his mount too), plus a +1 morale bonus on damage rolls underwater.",
      },
      {
        level: 8,
        name: "Current's Rush",
        summary:
          "Gains +2 on attack rolls charging with a current, plus a bonus on damage rolls scaling with the current's speed.",
      },
      {
        level: 15,
        name: "Explore the Seas",
        summary:
          "Gains Pressure Adept as a bonus feat, an extra native oceanic zone, and a scaling morale bonus on initiative/Perception checks (always acting in a surprise round) when exploring somewhere new underwater.",
      },
    ],
  },
  {
    id: "order_of_the_whip",
    name: "Order of the Whip",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "kno"],
    edicts:
      "Seeks out the weaker to punish, demands unquestioning obedience, and must be evil-aligned.",
    challengeTemplate:
      "+{n} morale bonus on melee damage rolls against the challenge target, as long as he damaged it the previous round.",
    abilities: [
      {
        level: 2,
        name: "Whip Crack",
        summary:
          "Gains whip proficiency and Whip Mastery as a bonus feat; a low-HD creature he deals nonlethal whip damage to is shaken for 1 round.",
      },
      {
        level: 8,
        name: "Inspiring Pain",
        summary:
          "Swift action, limited use: lets allies within 30 ft. deal nonlethal damage without the usual penalty, with a +2 bonus on nonlethal damage rolls, for 1 round.",
      },
      {
        level: 15,
        name: "Assert Authority",
        summary:
          "A melee attack against him or an adjacent slave/servant provokes an attack of opportunity from him (with a +2 morale bonus); a confirmed crit against him lets him treat the attacker as his challenge target.",
      },
    ],
  },
  {
    id: "order_of_vengeance",
    name: "Order of Vengeance",
    forClasses: CAVALIER_SAMURAI,
    orderSkills: ["klo", "kno"],
    edicts: "Seeks retaliation for any harm to her person or property, and forgives no insult.",
    challengeTemplate:
      "+{n} morale bonus on attack rolls against a challenge target of a kind she's encountered in the past 24 hours.",
    abilities: [
      {
        level: 2,
        name: "Air Grievances",
        summary:
          "Gains a scaling bonus on Intimidate checks to demoralize, and the shaken penalty her demoralized targets take grows every 6 levels after 8th.",
      },
      {
        level: 8,
        name: "Eye for an Eye",
        summary:
          "Gains Critical Focus as a bonus feat, and can grant allies a critical feat (instead of a teamwork feat) via tactician.",
      },
      {
        level: 15,
        name: "Retribution",
        summary:
          "A melee crit against her or an adjacent co-religionist ally provokes an attack of opportunity (with a +2 morale bonus), treating the attacker as her challenge target.",
      },
    ],
  },
]);

/** Look up an order by tag across all three tables (a samurai's `cavalierOrder` may point at any). */
export function orderByTag(tag: string): OrderDef | undefined {
  return CAVALIER_ORDERS[tag] ?? SAMURAI_ORDERS[tag] ?? SPLATBOOK_ORDERS[tag];
}

/** Every order a given class may select, across all three hand-authored tables. */
export function ordersForClass(classTag: "cavalier" | "samurai"): OrderDef[] {
  const all = { ...CAVALIER_ORDERS, ...SAMURAI_ORDERS, ...SPLATBOOK_ORDERS };
  return Object.values(all).filter((o) => o.forClasses.includes(classTag));
}

/**
 * The Challenge rider's current numeric value for `order` at `classLevel`:
 * `1 + floor((classLevel - 1) / 4)` — the standard "Table: Cavalier's Order"
 * progression every `{n}`-templated rider follows (verified against AoN
 * per-order text, not assumed). A handful of splatbook riders replace the
 * standard rider with a flat or bespoke mechanic and don't use `{n}` at all
 * (see `SPLATBOOK_ORDERS`'s file doc comment); this function is meaningless
 * for those and simply won't be substituted into their `challengeTemplate`.
 * Returns 0 for `classLevel < 1`.
 */
export function challengeRiderAt(classLevel: number): number {
  if (classLevel < 1) return 0;
  return 1 + Math.floor((classLevel - 1) / 4);
}

/**
 * Substitutes the live `challengeRiderAt` value into an order's
 * `challengeTemplate` (replaces every `{n}`). Takes just the template field
 * (not the full `OrderDef`) so it also works for a `MergedOrderEntry`, whose
 * `challengeTemplate` is optional (undefined for a vendored-only order with
 * no hand-authored chassis).
 */
export function challengeRiderText(
  order: { challengeTemplate: string },
  classLevel: number,
): string {
  const n = challengeRiderAt(classLevel);
  return order.challengeTemplate.replaceAll("{n}", String(n));
}

/* -------------------------------------------------- vendored catalog overlay -- */
/*
 * `RefData.cavalierOrders` (see that type's doc comment) is the full published
 * order catalog — 38 entries. Unlike every other catalog imported so far,
 * this ISN'T a flat "prose ability" list — each hand-authored order is a
 * small CHASSIS (two or three bonus skills, a Challenge rider template,
 * three leveled abilities), and the vendored source carries none of that
 * structure: an order's 2nd/8th/15th-level abilities live entirely inside
 * its free-text `description` (headed "### Order Abilities"), not as a
 * parseable `OrderAbility[]`. Every one of the 38 now has a hand-authored
 * chassis (`CAVALIER_ORDERS` / `SAMURAI_ORDERS` / `SPLATBOOK_ORDERS`), so
 * `vendoredToEntry` (the prose-only fallback for an unmatched vendored
 * entry) is currently unreached in practice — kept because there's no
 * guarantee a future refdata bump won't add a 39th order this file hasn't
 * caught up to yet.
 *
 * Collision audit (all 38 hand-authored entries, run against the pinned Pf
 * Data 1e slice): 37 of 38 matched a vendored entry by normalized name
 * directly; the samurai's Ronin order is the one exception — the vendored
 * source names it plainly "Ronin" (its own page even notes "cavaliers can
 * select this order, but they are typically called knights errant instead
 * of ronin"), NOT "Order of the Ronin" like literally every other entry in
 * the file (Warrior included) — a wording-drift alias, not a missing entry.
 * No name collides within the vendored catalog itself.
 */

const ORDER_NAME_ALIASES: Record<string, string> = {
  ronin: "Ronin",
};

function normalizeOrderName(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

/**
 * A catalog entry the picker can browse — either a hand-authored order
 * chassis (matched, with vendored prose attached for the "full text" view)
 * or a vendored-only order rendered prose-only (see file doc comment — none
 * exist against the currently pinned data, but the shape stays live for a
 * future refdata bump). `displayOnly: true` marks the latter — no
 * `orderSkills`/`challengeTemplate`/`abilities` exist to show a structured
 * breakdown for it, only `description`.
 */
export interface MergedOrderEntry {
  id: string;
  name: string;
  forClasses: readonly ("cavalier" | "samurai")[];
  /** Present only for a hand-authored chassis match — see `OrderDef.orderSkills`. */
  orderSkills?: readonly SkillId[];
  edicts?: string;
  challengeTemplate?: string;
  abilities?: readonly OrderAbility[];
  contextNotes?: ContextNote[];
  /** Full vendored HTML prose, when a vendored catalog entry backs this id — every entry today (see file doc comment). */
  description?: string;
  /** Vendored source-book attribution, when known. */
  sources?: SourceRef[];
  /** True for a vendored-only order with no hand-authored chassis (see file doc comment). */
  displayOnly: boolean;
}

function vendoredToEntry(entry: CavalierOrder): MergedOrderEntry {
  return {
    id: entry.id,
    name: entry.name,
    // Not tagged by class in the source — every vendored-only order is
    // offered to both, matching this picker's existing free-choice, no-
    // edict-validation posture (see `OrderPicker`'s doc comment).
    forClasses: CAVALIER_SAMURAI,
    description: entry.description,
    sources: entry.sources,
    displayOnly: true,
  };
}

/**
 * The full picker-browsable catalog: every vendored entry, with any that
 * collides (by normalized name, alias-mapped) against a hand-authored order
 * REPLACED by that hand-authored chassis (keeping its id, skills, Challenge
 * template, and ability tiers, but carrying the vendored entry's full prose/
 * sources along). No hand-authored-only entries exist to append — all 38
 * matched (see the collision audit above).
 */
export function mergedOrderCatalog(refData: RefData): MergedOrderEntry[] {
  const all = { ...CAVALIER_ORDERS, ...SAMURAI_ORDERS, ...SPLATBOOK_ORDERS };
  const handByNormName = new Map<string, OrderDef>();
  for (const o of Object.values(all)) {
    handByNormName.set(normalizeOrderName(ORDER_NAME_ALIASES[o.id] ?? o.name), o);
  }

  const vendored = Object.values(refData.cavalierOrders ?? {});
  const merged: MergedOrderEntry[] = [];
  for (const v of vendored) {
    const handMatch = handByNormName.get(normalizeOrderName(v.name));
    merged.push(
      handMatch
        ? {
            id: handMatch.id,
            name: handMatch.name,
            forClasses: handMatch.forClasses,
            orderSkills: handMatch.orderSkills,
            edicts: handMatch.edicts,
            challengeTemplate: handMatch.challengeTemplate,
            abilities: handMatch.abilities,
            contextNotes: handMatch.contextNotes,
            description: v.description,
            sources: v.sources,
            displayOnly: false,
          }
        : vendoredToEntry(v),
    );
  }
  return merged;
}

/** Every merged catalog entry a given class may select — mirrors `ordersForClass`, but over the full vendored-backed catalog. */
export function mergedOrdersForClass(
  refData: RefData,
  classTag: "cavalier" | "samurai",
): MergedOrderEntry[] {
  return mergedOrderCatalog(refData).filter((o) => o.forClasses.includes(classTag));
}

/** Look up a merged catalog entry by tag — mirrors `orderByTag`, but resolves a vendored-only id too. */
export function resolveMergedOrder(id: string, refData: RefData): MergedOrderEntry | undefined {
  return mergedOrderCatalog(refData).find((o) => o.id === id);
}
