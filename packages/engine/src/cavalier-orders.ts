/**
 * Clean-room PF1 cavalier/samurai order reference table (DESIGN §6, issue
 * #65): hand-authored from the published rules (Advanced Player's Guide for
 * the six core cavalier orders, Ultimate Combat for the samurai's own
 * Warrior/Ronin orders; verified against public SRD text/AoN), mirroring
 * `oracle-revelations.ts`'s posture. Like revelations, orders are NOT
 * structured data anywhere in the vendored Foundry pack — the Cavalier and
 * Samurai class defs only link the generic "Order"/"Order (SAM)" stub
 * `ClassFeature` (confirmed: `class-features.json` carries no per-order
 * entries at all), so there is no upstream JSON to normalize.
 *
 * Scope: the six APG cavalier orders (Cockatrice, Dragon, Lion, Shield,
 * Star, Sword) plus the two UC samurai-specific orders (Warrior, Ronin). A
 * samurai may also choose any of the six cavalier orders instead of
 * Warrior/Ronin (RAW) — `forClasses` on the six cavalier entries includes
 * `"samurai"` for that reason; Warrior/Ronin are cavalier-ineligible.
 *
 * Every order grants three things, each with a different modeling posture:
 *
 * 1. **Order skills** — two bonus class skills. Display-only, same
 *    documented gap `oracle-mysteries.ts`'s `classSkills` already carries:
 *    `compute.ts`'s `classSkillSet` only unions `RefData.classes[].
 *    classSkills` + race, with no hook for a sub-choice (mystery, curse,
 *    domain-adjacent order) to add more. Not new machinery here — the
 *    existing gap, not a regression.
 * 2. **Challenge rider** — the specific numeric bonus/rider the order grants
 *    to the base Challenge ability (base Challenge itself is order-
 *    agnostic: it just lets the cavalier/samurai designate a target and
 *    draws from the `uses.maxFormula`-derived pool already wired in
 *    `resources.ts` — see that pool's `detail`). Every one of the eight
 *    riders scales `+1 per 4 cavalier/samurai levels` starting at +1 (same
 *    "Table: Cavalier's Order" progression, `1 + floor((level - 1) / 4)`),
 *    but the bonus TYPE and WHAT it applies to differs per order (melee
 *    damage vs. AC vs. saves vs. an ally's attack rolls vs. damage
 *    reduction, ...) and several are additionally scoped to "while
 *    threatening the target" / "while mounted" / benefiting allies rather
 *    than the cavalier — squarely the same "target-scoped, can't check
 *    automatically" territory as Smite Evil's target-vs-alignment gate or a
 *    Favored Enemy bonus. `challengeRiderAt(order, level)` computes the
 *    live number; `DeedsPanel`/`OrderPicker`-adjacent UI surfaces it as text,
 *    never as an automatic Change.
 * 3. **Order abilities at 2nd/8th/15th level** — every one of the 24 (8
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

import type { ContextNote, SkillId } from "@pf1/schema";

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
  /** Two bonus class skills the order grants (display-only — see file doc comment). */
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

/** Look up an order by tag across BOTH tables (a samurai's `cavalierOrder` may point at either). */
export function orderByTag(tag: string): OrderDef | undefined {
  return CAVALIER_ORDERS[tag] ?? SAMURAI_ORDERS[tag];
}

/** Every order a given class may select — the six APG orders for cavalier; the six APG orders plus Warrior/Ronin for samurai. */
export function ordersForClass(classTag: "cavalier" | "samurai"): OrderDef[] {
  const all = { ...CAVALIER_ORDERS, ...SAMURAI_ORDERS };
  return Object.values(all).filter((o) => o.forClasses.includes(classTag));
}

/**
 * The Challenge rider's current numeric value for `order` at `classLevel`:
 * `1 + floor((classLevel - 1) / 4)` — every one of the 8 orders' riders
 * follows this identical "Table: Cavalier's Order" progression (verified
 * against AoN per-order text, not assumed). Returns 0 for `classLevel < 1`.
 */
export function challengeRiderAt(classLevel: number): number {
  if (classLevel < 1) return 0;
  return 1 + Math.floor((classLevel - 1) / 4);
}

/** Substitutes the live `challengeRiderAt` value into an order's `challengeTemplate` (replaces every `{n}`). */
export function challengeRiderText(order: OrderDef, classLevel: number): string {
  const n = challengeRiderAt(classLevel);
  return order.challengeTemplate.replaceAll("{n}", String(n));
}
