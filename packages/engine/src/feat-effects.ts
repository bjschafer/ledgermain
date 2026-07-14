/**
 * Hand-authored mechanical effects for feats.
 * Clean-room from the published PF1 rules — no Foundry source was consulted.
 *
 * Map key: normalized name slug (see `featNameSlug`).
 * Rationale: feat ids in RefData are opaque Foundry UUIDs that may change between
 * data versions. Slugging from the canonical human-readable name is stable and
 * human-authorable. Lookup path: doc.build.feats → refData.feats[id].name → slug.
 *
 * Target strings follow the same conventions as collect.ts / compute.ts:
 *   - saves:      "fort" | "ref" | "will" | "allSavingThrows"
 *   - AC:         "ac"  (type "dodge" routes to the dodge bucket in computeAc)
 *   - initiative: "init"
 *   - HP:         "hp"  (consumed by computeHp in compute.ts)
 *   - skills:     "skill.<id>"  (e.g. "skill.per", "skill.sen")
 *
 * Two entry shapes:
 *   StaticFeatEntry  — unconditional changes, no player selection required.
 *   ChoiceFeatEntry  — player picks a target (skill, weapon, …); collect.ts reads
 *                      `doc.build.featChoices[featId]` and calls `build(choiceId)`.
 *                      The UI renders a picker for these feats (FeatsSection.tsx).
 */

import type { ContextNote } from "@pf1/schema";

export interface FeatChange {
  target: string;
  type: string;
  formula: string;
}

/** A feat that unconditionally applies a fixed set of typed modifiers. */
export interface StaticFeatEntry {
  type: "static";
  changes: FeatChange[];
  /**
   * Non-mechanical reminders for a feat whose real benefit targets something
   * this engine doesn't put on the PC's own derived sheet — most commonly a
   * summoned creature, an eidolon/companion/familiar for a brief window, or a
   * spell-casting-time/list change (e.g. Augment Summoning's +4 Str/+4 Con to
   * summoned creatures, Sacred Summons' standard-action cast). Mirrors
   * `AlchemistDiscoveryDef.contextNotes` (`alchemist-discoveries.ts`) exactly:
   * these are read directly by the UI (see `apps/web/src/model/feats.ts`'s
   * `featContextNotes`) and never flow through `collect.ts`/`compute()` — a
   * feat with `changes: []` and only `contextNotes` contributes nothing to
   * the derived sheet, by construction, so there's no risk of inventing a
   * number for an off-sheet target. Absent for the overwhelming majority of
   * entries (a real Change is preferred whenever one honestly applies).
   */
  contextNotes?: ContextNote[];
}

/**
 * A feat that requires a player selection before it has mechanical effect.
 * `choice.type` drives the UI picker ("skill" → skill list, "weapon" → weapon list).
 * `build(choiceId)` produces the changes to emit once a choice is stored in
 * `doc.build.featChoices[featId]`.
 */
export interface ChoiceFeatEntry {
  type: "choice";
  /** Descriptor consumed by the UI to render a picker. */
  choice: { type: "skill" | "weapon"; label: string };
  /** Produces the typed changes for the given player choice id. */
  build(choiceId: string): FeatChange[];
}

/**
 * A situational feat effect for the saved-rolls UI (attack/damage tweaks that
 * only apply under a condition the player judges at the table — range, full
 * attack, grip). These are NEVER emitted by `collect.ts` / `compute()`: they
 * are surfaced only through the separate {@link SITUATIONAL_FEAT_EFFECTS} map
 * and folded in by `apps/web/src/model/savedRolls.ts` at resolve time, never
 * as unconditional `Change`s. Keeping the map separate (rather than adding a
 * third case to `FEAT_EFFECTS`) makes it structurally impossible for one of
 * these to leak into the always-on derived sheet.
 */
export interface SituationalFeatEffect {
  /** Delta applied to every attack in the sequence. */
  attack?: number;
  /** Delta applied to the damage bonus. */
  damage?: number;
  /** Extra attack entries at the (adjusted) highest bonus. */
  extraAttacks?: number;
  /**
   * Dodge-type AC delta (issue #62) — e.g. Combat Expertise's attack-for-AC
   * trade. Display-only: unlike `attack`/`damage`, this never folds into a
   * saved roll's number (AC isn't itself a saved-roll source), so
   * `apps/web/src/model/savedRolls.ts` only ever surfaces it as a formatted
   * note (`foldAttachments`), the same "player judges applicability, chip is
   * a reminder" posture as `note` below.
   */
  acDelta?: number;
  /** At-table reminder, e.g. "within 30 ft". */
  note?: string;
}

export interface SituationalFeatEntry {
  type: "situational";
  /** Which saved-roll sources this sensibly attaches to (picker filter, not enforcement). */
  appliesTo: "melee" | "ranged" | "any";
  /** Variant selector, e.g. Power Attack grip. When present the UI renders a small select. */
  options?: { id: string; label: string }[];
  effect(ctx: { bab: number }, option?: string): SituationalFeatEffect;
}

export type FeatEntry = StaticFeatEntry | ChoiceFeatEntry | SituationalFeatEntry;

/** Build a `StaticFeatEntry.contextNotes` entry. Mirrors `alchemist-discoveries.ts`'s local `note` helper. */
const note = (text: string): ContextNote => ({ target: "allChecks", text });

/**
 * Normalize a feat name to a stable slug for use as a map key.
 * e.g. "Improved Initiative" → "improved-initiative"
 *      "Iron Will"           → "iron-will"
 */
export function featNameSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/**
 * Feat effects, keyed by name slug. Entries are either always-on (static) or
 * choice-based (player picks a target, engine emits changes after selection).
 */
export const FEAT_EFFECTS: Readonly<Record<string, FeatEntry>> = {
  // ── Static feats ───────────────────────────────────────────────────────────

  // Toughness: +3 HP; +1 per HD beyond 3 (PF1 CRB p. 135).
  // Formula: max(3, @attributes.hd.total) → 3 at HD ≤ 3, then equals HD thereafter.
  toughness: {
    type: "static",
    changes: [{ target: "hp", type: "untyped", formula: "max(3, @attributes.hd.total)" }],
  },

  // Iron Will: +2 bonus on Will saving throws (PF1 CRB p. 127). Untyped = stacks.
  "iron-will": {
    type: "static",
    changes: [{ target: "will", type: "untyped", formula: "2" }],
  },

  // Lightning Reflexes: +2 bonus on Reflex saving throws (PF1 CRB p. 129). Untyped.
  "lightning-reflexes": {
    type: "static",
    changes: [{ target: "ref", type: "untyped", formula: "2" }],
  },

  // Great Fortitude: +2 bonus on Fortitude saving throws (PF1 CRB p. 124). Untyped.
  "great-fortitude": {
    type: "static",
    changes: [{ target: "fort", type: "untyped", formula: "2" }],
  },

  // Dodge: +1 dodge bonus to AC (PF1 CRB p. 122). Dodge type stacks with all other
  // dodge bonuses per the stacking engine (stacking.ts: STACKING_TYPES includes "dodge").
  dodge: {
    type: "static",
    changes: [{ target: "ac", type: "dodge", formula: "1" }],
  },

  // Improved Initiative: +4 bonus on initiative checks (PF1 CRB p. 127). Untyped.
  "improved-initiative": {
    type: "static",
    changes: [{ target: "init", type: "untyped", formula: "4" }],
  },

  // Alertness: +2 bonus on Perception (skill.per) and Sense Motive (skill.sen)
  // (PF1 CRB p. 118). Skill targets are supported via "skill.*" in computeSkills.
  alertness: {
    type: "static",
    changes: [
      { target: "skill.per", type: "untyped", formula: "2" },
      { target: "skill.sen", type: "untyped", formula: "2" },
    ],
  },

  // ── Choice feats ───────────────────────────────────────────────────────────

  // Skill Focus: +3 competence bonus on the chosen skill (PF1 CRB p. 134).
  // If the character has 10+ ranks in the chosen skill the bonus increases to +6.
  // Formula uses the rollData path @skills.<id>.rank (see rolldata.ts). Missing
  // rank entries resolve to 0, so an unchosen/unranked skill safely returns +3.
  "skill-focus": {
    type: "choice",
    choice: { type: "skill", label: "Skill" },
    build(choiceId: string): FeatChange[] {
      return [
        {
          target: `skill.${choiceId}`,
          type: "untyped",
          formula: `if(gte(@skills.${choiceId}.rank, 10), 6, 3)`,
        },
      ];
    },
  },

  // Weapon Focus: +1 untyped attack bonus with the chosen weapon type (PF1 CRB p. 136).
  // The target `attack.weapon.<group>` is consumed by computeWeaponAttacks in compute.ts,
  // which runs forTarget for the weapon's group when building each per-weapon attack line.
  "weapon-focus": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string): FeatChange[] {
      return [{ target: `attack.weapon.${choiceId}`, type: "untyped", formula: "1" }];
    },
  },

  // Weapon Specialization: +2 untyped damage bonus with the chosen weapon type (PF1 CRB p. 137).
  // NOTE: Requires Fighter 4 — not hard-enforced here (soft-prereq policy applies).
  // The target `damage.weapon.<group>` is consumed by computeWeaponAttacks in compute.ts.
  "weapon-specialization": {
    type: "choice",
    choice: { type: "weapon", label: "Weapon Type" },
    build(choiceId: string): FeatChange[] {
      return [{ target: `damage.weapon.${choiceId}`, type: "untyped", formula: "2" }];
    },
  },

  // ── Summoning feats (community pf1-content pack) ────────────────────────
  //
  // None of these carry vendored `changes[]` (confirmed for every name-matched
  // "summon" feat against the vendored feats.json). Almost every one of them
  // buffs a SUMMONED CREATURE, an eidolon for a brief window, or the
  // summoning spell's casting time/available creature list — none of which is
  // a PC-sheet stat this engine tracks (this engine only models the PC, its
  // eidolon/companion/familiar, and its buffs — never an ad hoc summon-spell
  // creature). So every entry below is `changes: []` with the concrete
  // numbers spelled out in `contextNotes` — the same "no invented sheet
  // number, an honest reminder instead" posture as `alchemist-discoveries.ts`'s
  // Cognatogen/Wings/Feral Mutagen entries. `note()` mirrors that file's own
  // local helper.
  //
  // "Extra Summons" is the one exception — see FEAT_POOL_EFFECTS below,
  // since it raises an existing class-feature pool's max rather than
  // needing a contextNote.

  // Augment Summoning (PF1 CRB, prereq Spell Focus (conjuration)): every
  // creature summoned by ANY summon spell gets +4 enhancement to Str and Con
  // for the spell's duration.
  "augment-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Every creature you conjure with a summon spell gains a +4 enhancement bonus to Strength and Constitution for the spell's duration.",
      ),
    ],
  },

  // Augment Summoning (Mythic) (prereq Augment Summoning): mythic tiers
  // aren't modeled by this engine at all (no mythic-tier field anywhere on
  // CharacterDoc/DerivedSheet) — display-only, flagged explicitly rather than
  // silently doing nothing.
  "augment-summoning-mythic": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Mythic tier isn't modeled by this engine — summoned creatures count as 1st-tier mythic for interacting with other mythic effects, and their DR (if any) becomes DR/epic. No PC-sheet number to apply.",
      ),
    ],
  },

  // Superior Summoning (prereq Augment Summoning, CL 3rd): +1 creature
  // whenever a summoning spell conjures more than one.
  "superior-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Each time a summoning spell you cast conjures more than one creature, add one more to the total number summoned.",
      ),
    ],
  },

  // Sacred Summons (prereq an Aura class feature + ability to cast summon
  // monster): cast summon monster as a standard action instead of 1 round
  // when the summoned creatures' alignment subtype matches your aura.
  "sacred-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Cast summon monster as a standard action (instead of 1 round) when every creature summoned has an alignment subtype matching your aura.",
      ),
    ],
  },

  // Blackfire Summoning (prereq Sacred Summons): a single summoned evil
  // outsider arrives in a blast of blackfire — 2x its CR in damage to
  // adjacent nonevil creatures (Will half, DC = the summon spell's DC); costs
  // a spell slot 1 level higher (waived while using the blackfire pact class
  // feature on a matching outsider type).
  "blackfire-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Summoning a single evil outsider: it arrives in blackfire, dealing 2x its CR in damage to adjacent nonevil creatures (Will half, DC = the summon spell's save DC). Uses a spell slot 1 level higher (waived for a blackfire pact's chosen outsider type).",
      ),
    ],
  },

  // Summon Good Monster (prereq Good alignment): unlocks a good-aligned
  // summon monster list; creatures summoned from it gain Diehard (standard
  // list summons don't).
  "summon-good-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds a good-aligned creature list to summon monster; creatures summoned from that list gain the Diehard feat (standard-list summons don't).",
      ),
    ],
  },

  // Summon Evil Monster (prereq Evil alignment): unlocks an evil-aligned
  // summon monster list, cast as a standard action; the summoned creature
  // can't act until your next turn but isn't flat-footed and can still take
  // AoOs.
  "summon-evil-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds an evil-aligned creature list to summon monster, cast as a standard action; the summoned creature can't act until your next turn (not flat-footed, can still make AoOs). Sacred Summons can apply to a creature from this list whose alignment matches your aura.",
      ),
    ],
  },

  // Summon Neutral Monster (prereq a Neutral alignment): unlocks a
  // neutral-aligned summon monster list + a "counterpoised creature" template
  // option for standard-list summons; either way, the summoned creature gets
  // a +2 resistance bonus on Will saves.
  "summon-neutral-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds a neutral-aligned creature list to summon monster (or apply the counterpoised-creature template to a standard-list summon in place of celestial/fiendish); either way the summoned creature gains a +2 resistance bonus on Will saves.",
      ),
    ],
  },

  // Summon Plant Ally (prereq Knowledge (nature) 1 rank + summon nature's
  // ally): unlocks a list of plant creatures summonable via summon nature's
  // ally I-IX. Pure list-expansion, no numeric rider.
  "summon-plant-ally": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds a list of plant creatures (leshys, assassin vine, treant, jinmenju, ...) summonable via summon nature's ally I-IX.",
      ),
    ],
  },

  // Expanded Summon Monster (prereq ability to cast a summon monster spell):
  // permanently add 2 chosen creatures per spell level (1st-9th) to your
  // summon monster tables; repeatable for +2 more each time.
  "expanded-summon-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds 2 chosen creatures per summon monster spell level (1st-9th) to your summon monster tables, permanently. Repeatable — each additional instance adds 2 more per level.",
      ),
    ],
  },

  // Evolved Summoned Monster (prereq Augment Summoning, Spell Focus
  // (conjuration), ability to cast summon monster I): each summon monster
  // casting grants the (one) summoned creature a 1-point eidolon evolution
  // (not pounce/reach); repeatable, one additional evolution per instance,
  // splittable across multiple summoned creatures.
  "evolved-summoned-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Each summon monster casting grants a 1-point eidolon evolution (not pounce/reach) to the creature summoned (attack/limb-count evolutions require Medium+). Repeatable — each instance adds one more evolution, splittable across multiple summoned creatures.",
      ),
    ],
  },

  // Ferocious Summons (prereq Augment Summoning, Spell Focus (conjuration),
  // half-orc/orc): creatures you summon gain the ferocity universal monster
  // ability (fight while below 0 hp/staggered).
  "ferocious-summons": {
    type: "static",
    changes: [],
    contextNotes: [note("Creatures you summon gain the ferocity universal monster ability.")],
  },

  // Putrid Summons (prereq Spell Focus (conjuration), ability to cast summon
  // monster or summon nature's ally): summon a single creature with the
  // stench universal monster ability instead — sickened for (spell level)
  // rounds; the creature is drawn from the NEXT LOWER summon list.
  "putrid-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Summon a single creature with the stench universal monster ability (sickened for a number of rounds = the spell's level) — drawn from the next lower summon monster/summon nature's ally list than the spell cast.",
      ),
    ],
  },

  // Retributive Summoning (prereq Spell Focus (conjuration) or the
  // counter-summons class feature): countering a summoning spell with dispel
  // magic or your own summon monster immediately summons nonevil creatures
  // as if from a summon monster spell 2 levels lower than the countered one.
  "retributive-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "When you counter a summoning spell with dispel magic or your own summon monster, immediately summon nonevil creatures as if casting summon monster 2 levels lower than the countered spell.",
      ),
    ],
  },

  // Harrowed Summoning (prereq the Harrowed trait/feat): draw 2 harrow cards
  // for a summoning spell — summoned creatures gain +4 enhancement to the
  // ability score(s) matching the drawn suits (+6 if both cards share a
  // suit); the spell's duration doubles/halves on an alignment match/mismatch
  // (unchanged if both occur).
  "harrowed-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Draw 2 harrow cards when casting a summoning spell: summoned creatures gain +4 enhancement to the ability score(s) of the drawn suits (+6 if both cards share a suit). Duration doubles on an alignment match, halves on a mismatch (unchanged if both occur).",
      ),
    ],
  },

  // Sunlight Summons (prereq Spell Focus (conjuration), summon nature's
  // ally): summoned creatures shed light as light, are immune to
  // blinding/dazzling, and their natural weapons count as magic for DR.
  "sunlight-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Creatures you summon shed light as the light spell, are immune to blinding/dazzling effects, and their natural weapons count as magic for overcoming DR.",
      ),
    ],
  },

  // Moonlight Summons (prereq Spell Focus (conjuration), summon nature's
  // ally): summoned creatures shed light as light, are immune to
  // confusion/sleep, and their natural weapons count as silver for DR.
  "moonlight-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Creatures you summon shed light as the light spell, are immune to confusion/sleep effects, and their natural weapons count as silver for overcoming DR.",
      ),
    ],
  },

  // Starlight Summons (prereq Spell Focus (conjuration), summon nature's
  // ally): summoned creatures gain Blind-Fight, +5 Perception/Stealth in dim
  // light or darkness, and their natural weapons count as cold iron for DR.
  "starlight-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Creatures you summon gain the Blind-Fight feat, a +5 bonus on Perception/Stealth checks in dim light or darkness, and their natural weapons count as cold iron for overcoming DR.",
      ),
    ],
  },

  // Scouting Summons (prereq Spell Focus (conjuration), ability to cast
  // magic jar): possess a single summoned creature as magic jar (no
  // receptacle needed); taking damage while possessing it forces a
  // concentration check (DC = damage taken) or ejection; reduced to <=0 hp
  // ejects you and deals 2x the summon spell's level in damage. Uses a spell
  // slot 2 levels higher.
  "scouting-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Possess a single summoned creature as magic jar (no receptacle). Damage to it forces a concentration check (DC = damage taken) or you're ejected; dropping it to 0 hp or lower ejects you and deals damage equal to 2x the summon spell's level. Uses a spell slot 2 levels higher.",
      ),
    ],
  },

  // Proxy Summoning (prereq ability to cast conjuration (summoning) spells,
  // CL 5th): while adjacent to a summoned creature (including an eidolon), a
  // touch spell you cast can be delivered through it, and you + the creature
  // gain the share spells ability for that purpose (doesn't itself qualify
  // you for companion/familiar-only feats).
  "proxy-summoning": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "While adjacent to a creature you summoned (or your eidolon), a touch spell you cast can be carried and delivered by it; you and it gain the share spells ability for this purpose only (doesn't qualify you for feats requiring an animal companion/familiar).",
      ),
    ],
  },

  // Summoner's Call (prereq the Eidolon class feature): summoning your
  // eidolon grants it a +2 enhancement bonus to Str, Dex, or Con for 10
  // minutes after the summoning ritual completes.
  "summoner-s-call": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Whenever you summon your eidolon, it may gain a +2 enhancement bonus to Strength, Dexterity, or Constitution for 10 minutes after the summoning ritual completes.",
      ),
    ],
  },

  // Summon Guardian Spirit (prereq ability to cast summon monster III or
  // summon nature's ally III): a chosen improved-familiar-eligible creature
  // becomes a persistent, nameable summon on your SM III/SNA III list (1
  // min/level duration, unkillable-permanently — a 24h cooldown after it
  // dies while summoned). Subsystem-shaped; no flat number beyond the
  // duration.
  "summon-guardian-spirit": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Apply the guardian spirit template to one improved-familiar-eligible creature; it joins your summon monster III/summon nature's ally III list with a 1 minute/level duration when summoned. It's always the same creature (retains memory); if it dies while summoned it can't be summoned again for 24 hours.",
      ),
    ],
  },

  // Skeleton Summoner (prereq Spell Focus (necromancy), ability to cast
  // summon monster): adds 'human skeleton' to your summon monster I list and
  // 'human skeletal champion' to summon monster III; once/day you may instead
  // summon a skeleton-template version of any creature already on the list
  // for the summon monster spell you're casting.
  "skeleton-summoner": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds 'human skeleton' to your summon monster I list and 'human skeletal champion' to summon monster III. Once per day, casting summon monster may instead summon a skeleton-template version of any creature already on that spell's list.",
      ),
    ],
  },

  // Spider Summoner (prereq drow, ability to cast summon monster or summon
  // nature's ally): adds specific spiders by spell level to both summon
  // lists; summoned spiders' poison/web save DCs increase by +2.
  "spider-summoner": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Adds specific spiders (giant crab spider, giant black widow, ogre spider, giant tarantula, by level) to your summon monster and summon nature's ally lists; summoned spiders' poison and web save DCs increase by +2.",
      ),
    ],
  },

  // Nimble Natural Summons (prereq Augment Summoning, Spell Focus
  // (conjuration), summon nature's ally CL 6th, worshiper of Erastil):
  // creatures you summon with summon nature's ally move through natural
  // undergrowth at full speed, unimpeded.
  "nimble-natural-summons": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Creatures you summon with summon nature's ally move through natural undergrowth (thorns, briars, and similar terrain) at their normal speed, unimpeded (magically-manipulated undergrowth still affects them).",
      ),
    ],
  },

  // Versatile Summon Monster (prereq Knowledge (arcana)/Knowledge (planes) 1
  // rank each): pick 2 templates (Aerial/Aqueous/Chthonic/Dark/Fiery/
  // Primordial); apply one per creature in place of celestial/entropic/
  // fiendish/resolute when casting summon monster. Repeatable, +2 templates
  // each time. Already classified `subsystem` in feat-classification.ts's
  // frozen audit (no numeric target) — this contextNote is the "spell out the
  // mechanic" companion to that classification.
  "versatile-summon-monster": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Choose 2 templates (Aerial, Aqueous, Chthonic, Dark, Fiery, or Primordial); when summon monster would apply celestial/entropic/fiendish/resolute, apply one of your chosen templates instead (a different one per creature, if summoning several). Repeatable — each instance adds 2 more templates to choose from.",
      ),
    ],
  },

  // Versatile Summon Nature's Ally (prereq Augment Summoning, Spell Focus
  // (conjuration), Knowledge (nature)/Knowledge (planes) 1 rank each): when
  // summoning animals/humanoids/vermin via summon nature's ally, apply one of
  // 5 templates instead of Augment Summoning's +4 Str/Con (same template for
  // every creature in one casting). Already classified `subsystem` in
  // feat-classification.ts's frozen audit; same companion-note posture as
  // Versatile Summon Monster above.
  "versatile-summon-nature-s-ally": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "When summon nature's ally would summon an animal, humanoid, or vermin, you may apply one template (Aerial, Aqueous, Chthonic, Fiery, or Primordial) instead of Augment Summoning's bonus. Every creature summoned by the same casting gets the same template.",
      ),
    ],
  },

  // ── Sweep: feats found via a description scan for "summon(ed/ing)" that
  // don't have "summon" in their own name, but genuinely modify the
  // caster's own summon-monster/summon-nature's-ally mechanic (or, for the
  // Dimensional Awareness/Banishing Critical/Dimensional Disruption chain and
  // Painful Anchor, an opponent's) with a concrete rider. Excluded from this
  // sweep: feats whose description only mentions a summoned creature in
  // passing as an example (Cunning Caster/Subtle Devices's "obvious effect"
  // concealment checks), or that touch an unrelated mechanic entirely
  // (Tattoo Attunement/Conversion/Transformation, Damned, Ancient Tradition,
  // Blood Drinker, Blood Vengeance, Expanded Studies, Companion Figurine,
  // Beast Rider, Planar Infusion, Esoteric Conjuration, Enemy Cult,
  // Atheist Abjurations, Improved Planar Mentor, Spirit Symbiosis,
  // Spontaneous Nature's Ally, Planar Preservationist, Planar Sensitivity,
  // Triton Portal) — none of those change what summon monster/summon
  // nature's ally itself does.

  // Spiritualist's Call (prereq the Phantom class feature): the spiritualist
  // analog of Summoner's Call above — same +2/10-minutes shape, targeting
  // the phantom's Str, Dex, or Cha instead of the eidolon's Str, Dex, or Con.
  "spiritualist-s-call": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Whenever you summon your phantom, it may gain a +2 enhancement bonus to Strength, Dexterity, or Charisma for 10 minutes after the summoning ritual completes.",
      ),
    ],
  },

  // Fire Music (prereq Spellcraft 5 ranks, bard spells + an arcane fire
  // spell from another class): casting summon monster as a bard spell can
  // give the summoned creature a fiery appearance — fire resistance 5 and
  // +1 fire damage on its natural attacks (no effect if it already has the
  // fire subtype).
  "fire-music": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Casting summon monster as a bard spell, you may give the summoned creature a fiery appearance: fire resistance 5 and +1 fire damage on its natural attacks (no effect if it already has the fire subtype).",
      ),
    ],
  },

  // Fire Music (Mythic) (prereq Fire Music): the fiery-summon rider's fire
  // resistance improves to +5 more (10 total) and its natural-attack bonus
  // becomes 1d4 fire instead of +1. Mythic tier itself isn't modeled (see
  // Augment Summoning (Mythic) above), but this rider's own numbers are
  // plain and worth surfacing regardless.
  "fire-music-mythic": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Fire Music's fiery summoned creature instead gains fire resistance 10 total and 1d4 fire damage (instead of +1) on its natural attacks; the fire damage it deals also ignores resistance up to your mythic tier (mythic tier itself isn't tracked by this engine).",
      ),
    ],
  },

  // Profane Studies (prereq Int 13, Knowledge (planes) 4 ranks, ability to
  // cast a summon monster spell): summoning an evil outsider with summon
  // monster treats your caster level as 2 higher for the spell's DURATION
  // only (not other CL-dependent effects of the spell).
  "profane-studies": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Casting summon monster to summon an evil outsider: treat your caster level as 2 higher for determining the spell's duration only.",
      ),
    ],
  },

  // Ally Caller (prereq Triton, summon nature's ally II spell-like ability,
  // character level 3rd): +2 uses/day of the Triton's racial summon nature's
  // ally II SLA. No engine-modeled pool exists for a racial SLA like this
  // (deriveResourcePools only reads granted CLASS features' uses.maxFormula)
  // — display-only, same posture as several alchemist discoveries with no
  // pool to hook into.
  "ally-caller": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "+2 uses/day of the Triton racial summon nature's ally II spell-like ability. Repeatable — each instance adds 2 more. Not wired as a tracked resource pool here (no racial-SLA pool exists in this engine); track manually.",
      ),
    ],
  },

  // Aquatic Squires (prereq Triton, summon nature's ally II spell-like
  // ability, character level 5th): the Triton's racial SNA II SLA duration
  // becomes 1 minute/level (normally 1 round/level). Same "no racial-SLA pool
  // to hook into" posture as Ally Caller above.
  "aquatic-squires": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "The Triton racial summon nature's ally II spell-like ability's duration becomes 1 minute/level (normally 1 round/level).",
      ),
    ],
  },

  // Dimensional Awareness (prereq Arcane Strike or Disruptive, Combat
  // Reflexes, Spellcraft 8 ranks, an arcane pool class feature): an attack of
  // opportunity against a creature materializing (via summon/calling) in a
  // square you threaten — normally impossible — with a +2 circumstance bonus
  // if you identified the summoning spell via Spellcraft.
  "dimensional-awareness": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "You may make an attack of opportunity against a creature summoned or called into a square you threaten (normally impossible), gaining a +2 circumstance bonus on that attack if you identified the summoning spell via Spellcraft.",
      ),
    ],
  },

  // Banishing Critical (prereq Arcane Strike or Disruptive, Spellcraft 8
  // ranks, an arcane pool class feature): confirming a crit (via Arcane
  // Strike or an arcane-pool-enhanced weapon) against a summoned creature you
  // identified forces a Will save (DC = 10 + 1/2 character level + Int mod)
  // or the target is banished home as dismissal.
  "banishing-critical": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Confirming a critical hit (using Arcane Strike or a weapon enhanced by your arcane pool) against a summoned creature you identified via Spellcraft: it must succeed at a Will save (DC = 10 + 1/2 character level + Int modifier) or be sent home as dismissal.",
      ),
    ],
  },

  // Dimensional Disruption (prereq Arcane Strike or Disruptive, Banishing
  // Critical, Combat Reflexes, Dimensional Awareness, Spellcraft 8 ranks, an
  // arcane pool class feature): using Dimensional Awareness's AoO, spend an
  // immediate action + a Spellcraft check (DC = 15 + creature's CR [min 1] +
  // the summoning spell's level) to banish the creature before it acts.
  "dimensional-disruption": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "Using Dimensional Awareness's attack of opportunity against a materializing creature, spend an immediate action and succeed at a Spellcraft check (DC = 15 + the creature's CR [minimum 1] + the summoning spell's level) to send it home before it acts.",
      ),
    ],
  },

  // Painful Anchor (prereq the Anchoring Aura class feature): an evil
  // outsider that's summoned, called, or planar-teleports within your aura
  // takes 4d8 + Cha mod damage (unresisted by DR/energy immunity/resistance
  // — it's holy power), Will half (DC = your aura's/anchoring class
  // feature's normal save DC — see that class feature for the exact DC
  // formula, not duplicated here).
  "painful-anchor": {
    type: "static",
    changes: [],
    contextNotes: [
      note(
        "An evil outsider that summons, calls, or plane-shifts within your anchoring aura takes 4d8 + your Charisma modifier damage (holy power — bypasses DR, energy immunity, and energy resistance); Will half.",
      ),
    ],
  },
};

/**
 * Feats that raise the maximum of a class-feature-derived resource pool
 * (Rage rounds/day, Ki pool, Arcane Reservoir, …). Kept OUT of `FEAT_EFFECTS`
 * because pools aren't part of the typed-stacking `Change` pipeline
 * (`collect.ts` / `evalChange`) — they're a flat maximum read by
 * `deriveResourcePools` (`resources.ts`) off a class feature's `uses.maxFormula`.
 * `featureTag` matches `RefData.classFeatures[id].tag`; `maxDelta` is added to
 * that pool's derived max once per instance of the feat in `doc.build.feats`
 * (all six of these are RAW "you can take this feat multiple times, effects
 * stack" — `deriveResourcePools` multiplies by the count it finds).
 * Clean-room from d20pfsrd/Archives of Nethys, not transcribed from Foundry.
 *
 * `featureTag` accepts either a single tag or an array of tags (issue #65's
 * multi-target follow-up — see `resources.ts`'s `collectFeatPoolBonuses`
 * doc comment). A multi-tag entry is for a feat whose RAW bonus applies to
 * WHICHEVER of several class features the character actually has (a
 * mutually-exclusive substitution across classes, e.g. antipaladin's Touch
 * of Corruption explicitly substituting for paladin's Lay on Hands — see
 * `extra-lay-on-hands` below), never "both at once": a character with both
 * tags' pools present (an implausible paladin/antipaladin multiclass) would
 * get the bonus applied to both, which is an accepted edge case, not a
 * modeled RAW scenario.
 */
export interface FeatPoolEffect {
  /** `RefData.classFeatures[...].tag`(s) of the pool(s) this feat's bonus targets. */
  featureTag: string | readonly string[];
  /** Amount added to the pool's max, per instance of the feat taken. */
  maxDelta: number;
}

export const FEAT_POOL_EFFECTS: Readonly<Record<string, FeatPoolEffect>> = {
  // Extra Rage: +6 rounds/day of rage (PF1 CRB p. 122).
  "extra-rage": { featureTag: "rage", maxDelta: 6 },

  // Extra Ki: +2 ki pool points (PF1 CRB p. 122).
  "extra-ki": { featureTag: "kiPool", maxDelta: 2 },

  // Extra Performance: +6 rounds/day of bardic performance (PF1 CRB p. 122).
  "extra-performance": { featureTag: "bardicPerformance", maxDelta: 6 },

  // Extra Channel: +2 uses/day of channel energy (PF1 CRB p. 122).
  "extra-channel": { featureTag: "channelEnergy", maxDelta: 2 },

  // Extra Lay On Hands: +2 uses/day of lay on hands (PF1 CRB p. 122) — AND,
  // per the antipaladin's own vendored Touch of Corruption description
  // (`class-features.json`, verbatim): "This ability is modified by any
  // feat, spell, or effect that specifically works with the lay on hands
  // paladin class feature. For example, the Extra Lay On Hands feat grants
  // an antipaladin 2 additional uses of the touch of corruption class
  // feature." Issue #65's multi-target follow-up (previously a known gap —
  // `FeatPoolEffect` only supported one `featureTag`): unambiguous RAW
  // support confirmed directly in the vendored text above, not just an
  // inference, so both tags are wired here rather than left as a note.
  "extra-lay-on-hands": { featureTag: ["layOnHands", "touchOfCorruption"], maxDelta: 2 },

  // Extra Reservoir: +3 points to the arcane reservoir maximum (Advanced
  // Class Guide p. 12).
  "extra-reservoir": { featureTag: "arcaneReservoir", maxDelta: 3 },

  // Extra Arcane Pool: +2 points to the magus's arcane pool maximum (PF1
  // Ultimate Magic p. 10). Added by issue #45's feat batch-extraction pass
  // (see feat-classification.ts) — the magus's Arcane Pool class feature
  // already carries a vendored `uses.maxFormula` tagged `arcanePool`, so it
  // derives generically via `deriveResourcePools` exactly like the five
  // entries above; no resources.ts change was needed.
  "extra-arcane-pool": { featureTag: "arcanePool", maxDelta: 2 },

  // Extra Summons (community pf1-content pack; Advanced Class Guide): "You
  // gain 1 additional use of your summon monster spell-like ability per
  // day" (verbatim, this repo's vendored feat description — NOT the +2/day
  // this entry might be misremembered as). Repeatable "once for every five
  // summoner levels you possess", same "stacks per instance" shape as the
  // rest of this table. Both the summoner's "Summon Monster" class feature
  // and the unchained summoner's "Summon Monster (UC)" share the vendored
  // tag `summonMonster` (confirmed in class-features.json — both carry
  // `uses.maxFormula: "3 + @abilities.cha.mod"`), so a single tag covers
  // both variants without needing the multi-tag array Extra Lay On Hands
  // uses above.
  "extra-summons": { featureTag: "summonMonster", maxDelta: 1 },
};

/**
 * Situational feat effects for the saved-rolls attachment feature (see the
 * `SituationalFeatEntry` doc comment above). Deliberately kept OUT of
 * `FEAT_EFFECTS` — `compute()` must never read from this map. Each entry's
 * `effect()` is pure and takes the character's current BAB (for the
 * BAB-tiered feats) plus an optional variant `option` id.
 */
export const SITUATIONAL_FEAT_EFFECTS: Readonly<Record<string, SituationalFeatEntry>> = {
  // Point-Blank Shot: +1 attack and +1 damage with ranged weapons within 30 ft
  // (PF1 CRB p. 131).
  "point-blank-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ attack: 1, damage: 1, note: "within 30 ft" }),
  },

  // Precise Shot: no -4 penalty on ranged attacks against a target engaged in
  // melee (PF1 CRB p. 131). No numeric effect here — the -4 it removes is
  // never modeled as an active penalty, so this is a reminder-only note.
  "precise-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ note: "no −4 for firing into melee" }),
  },

  // Rapid Shot: one extra ranged attack at the highest bonus, all ranged
  // attacks that round take a -2 penalty; full attack only (PF1 CRB p. 131).
  "rapid-shot": {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ attack: -2, extraAttacks: 1, note: "full attack only" }),
  },

  // Manyshot: the first attack of a full attack fires two arrows, dealing
  // double the ability/precision-independent damage once but rolling
  // precision damage (e.g. sneak attack) only once (PF1 CRB p. 130).
  // Not numerically modeled — reminder only.
  manyshot: {
    type: "situational",
    appliesTo: "ranged",
    effect: () => ({ note: "first attack: 2 arrows (precision damage once)" }),
  },

  // Deadly Aim: trade ranged attack bonus for damage, scaling with BAB
  // (PF1 CRB p. 119). p = 1 + floor(BAB / 4): -1/+2 at BAB 1-3, -2/+4 at
  // BAB 4-7, -3/+6 at BAB 8-11, -4/+8 at BAB 12-15, ...
  "deadly-aim": {
    type: "situational",
    appliesTo: "ranged",
    effect: (ctx) => {
      const p = 1 + Math.floor(ctx.bab / 4);
      return { attack: -p, damage: 2 * p };
    },
  },

  // Power Attack: trade melee attack bonus for damage, scaling with BAB
  // (PF1 CRB p. 131). p = 1 + floor(BAB / 4); attack penalty is always -p.
  // Damage bonus is 2p one-handed (default; also covers light/off-hand here
  // for simplicity -- two options only) or 3p two-handed.
  "power-attack": {
    type: "situational",
    appliesTo: "melee",
    options: [
      { id: "one-handed", label: "One-handed" },
      { id: "two-handed", label: "Two-handed" },
    ],
    effect: (ctx, option) => {
      const p = 1 + Math.floor(ctx.bab / 4);
      const damage = option === "two-handed" ? 3 * p : 2 * p;
      return { attack: -p, damage };
    },
  },

  // Combat Expertise: trade melee attack bonus for a dodge AC bonus, scaling
  // with BAB (PF1 CRB p. 122) — same p = 1 + floor(BAB / 4) shape as Power
  // Attack/Deadly Aim (RAW technically caps p at 5, reached at BAB 16;
  // left uncapped here to match this file's existing Power Attack/Deadly Aim
  // precedent, which also don't hard-cap at their BAB-16 max). `acDelta` is
  // display-only (issue #62) — it never applies to the sheet's AC, only
  // surfaces as a note when this feat is attached to a saved roll.
  "combat-expertise": {
    type: "situational",
    appliesTo: "melee",
    effect: (ctx) => {
      const p = 1 + Math.floor(ctx.bab / 4);
      return { attack: -p, acDelta: p };
    },
  },

  // Furious Focus: ignore the Power Attack penalty on the first attack of a
  // full-attack action, or on a single attack made as a standard action
  // (PF1 CRB p. 124, Advanced Player's Guide). Reminder only — the saved-roll
  // model doesn't split "first attack" from the rest of the sequence.
  "furious-focus": {
    type: "situational",
    appliesTo: "melee",
    effect: () => ({ note: "ignore Power Attack penalty on first attack each turn" }),
  },
};
