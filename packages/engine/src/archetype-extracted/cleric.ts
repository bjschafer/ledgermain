/**
 * Cleric's slice of the pipeline (2026-08-08). Every vendored cleric
 * archetype feature (137 features, id prefix `cleric:`) was read in full and
 * bucketed as `numeric` / `situational` / `subsystem` / `blocked`, following
 * the same methodology the magus/fighter/barbarian passes already validated.
 * Per the per-class file convention (`index.ts`'s doc comment), this file
 * owns BOTH of cleric's pipeline artifacts.
 *
 * ── Cleric-specific mechanical facts this pass relies on ──────────────────
 *
 * 1. **Domains and domain powers are their own vendored subsystem.** Any
 *    feature that restricts, swaps, adds, or reweights a domain (forcing a
 *    single domain, forcing a specific domain, letting non-domain slots draw
 *    from a domain's list, changing a domain power's effective level, adding
 *    an off-list second domain, etc.) is `subsystem` — domains have no
 *    per-domain `Change` modeling in this engine today, so there is nothing
 *    to extract a number from even when the archetype states one (e.g. "two
 *    domain spell slots instead of one," "her domain's granted powers
 *    function as if two levels higher") — those numbers describe the
 *    subsystem's internal shape, not a Change-shaped character stat.
 * 2. **Channel Energy is activated** — a standard/full-round action spending
 *    a per-day resource (`uses.maxFormula: "3 + @abilities.cha.mod"`,
 *    already vendored and applied generically via `deriveResourcePools`).
 *    Every archetype feature that grants, restates, retargets, or delays the
 *    base Channel Energy ability (several archetypes carry a verbatim
 *    restatement of the SRD text, just gated to a later level than 1st) is
 *    `situational` — there is no always-on baseline number to extract from
 *    an activated ability, regardless of who or what it targets.
 * 3. **Channel-dice/uses changes ride `channel-variants.ts`, not this
 *    table.** The dice count, save DC, and uses/day evaluate the vendored
 *    Channel Energy `classFeatures` formulas generically (1d6 + 1d6 per 2
 *    levels beyond 1st, `10 + 1/2 level + Cha`, `3 + Cha`) — but that path
 *    carries no `Change`-shaped target this table's `numeric` bucket could
 *    populate either way, vendored or overridden. An archetype that promises
 *    a different dice progression, a different die type, a shifted effective
 *    level, or a resized uses-per-day pool is still `blocked`/`subsystem`
 *    here (this table has no override surface for it), but where the
 *    divergence is real `channel-variants.ts` supplies a dedicated formula
 *    override wired into `resources.ts`/`ability-dcs.ts` — see each such
 *    feature's own note for whether it's covered there.
 * 4. **Bardic Performance grafts are `subsystem`.** Evangelist's Sermonic
 *    Performance grants bard performances (Countersong, Fascinate, Inspire
 *    Courage/Greatness/Heroics) wholesale. `bard.ts`'s own extraction pass
 *    already established that bardic performance modifications are always
 *    `subsystem` (no generic activated-performance buff mechanism exists in
 *    this engine); the same posture applies here since these are the
 *    identical vendored abilities, just granted to a cleric.
 * 5. **Ally-only bonuses are never extracted**, per the established ruling
 *    (`class-feature-effects.ts`'s "Deliberately NOT promoted" list): a
 *    feature whose number only ever lands on an ally, a summoned/bonded
 *    creature, or a target other than the cleric herself is `situational` or
 *    `subsystem`, regardless of how clean the formula is. A mixed feature
 *    that grants an ally bonus AND an unconditional self bonus in the same
 *    sentence would be split (self half extracted, ally half noted) — no
 *    cleric archetype feature in this audit needed that split; every
 *    ally-facing number found here is either purely ally-scoped or bundled
 *    with an activation that already disqualifies it on its own.
 * 6. **Two ids are already hand-verified** in `archetype-effects.ts`:
 *    Cloistered Cleric's Breadth of Knowledge and Crusader's Bonus Feat.
 *    Both are classified `numeric` below (they truly are) but are NOT
 *    duplicated into `CLERIC_ARCHETYPE_EFFECTS_EXTRACTED` —
 *    `resolveArchetypeFeatureEffect` always checks the hand-verified table
 *    first, and `archetypeEffectsExtracted.test.ts` asserts no id lives in
 *    both tables, so re-adding them here would trip that invariant once this
 *    file is wired into the aggregator.
 *
 * Confidence rubric (identical to magus.ts's):
 *  - "high": a literal or near-literal single sentence, no interpretation, or
 *    a fully general (no scope restriction) scaling bonus.
 *  - "medium": the formula required composing a cadence across two sentences,
 *    or the extraction keeps only one clause of a multi-clause sentence
 *    (dropping a second, unmodelable half) and that drop takes a small
 *    interpretive step.
 *  - "low": not used in this pass — anything that would rate `low` is
 *    bucketed `blocked` instead.
 */

import type { Change } from "@pf1/schema";

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const CLERIC_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── cleric:angelfire-apostle ──
  "cleric:angelfire-apostle:channel-angelfire:1": {
    archetypeId: "cleric:angelfire-apostle",
    name: "Channel Angelfire",
    level: 1,
    bucket: "situational",
    note: "channel-energy variant that dazzles nongood creatures (no save) on top of the normal effect — channel energy is activated (class note 2), and the dazzled rider isn't a numeric bonus",
  },
  "cleric:angelfire-apostle:cleansing-flames:9": {
    archetypeId: "cleric:angelfire-apostle",
    name: "Cleansing Flames",
    level: 9,
    bucket: "situational",
    note: "swift-action area blast that expends a channel-energy use, triggered by casting a healing-subschool spell — activated and resource-gated, no baseline number",
  },
  "cleric:angelfire-apostle:diminished-spellcasting:1": {
    archetypeId: "cleric:angelfire-apostle",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces non-domain spell slots by one per level — no Change target for spell-slot counts",
  },
  "cleric:angelfire-apostle:extra-channel:1": {
    archetypeId: "cleric:angelfire-apostle",
    name: "Extra Channel",
    level: 1,
    bucket: "subsystem",
    note: "grants Extra Channel as a bonus feat — a fixed named-feat grant, not a player-chosen bonusFeats slot",
  },
  "cleric:angelfire-apostle:versatile-healing-channel:5": {
    archetypeId: "cleric:angelfire-apostle",
    name: "Versatile Healing Channel",
    level: 5,
    bucket: "subsystem",
    note: "each tier costs channel-energy uses, not a day/week counter of its own — cross-pool spend across an escalating spell list",
  },

  // ── cleric:appeaser ──
  "cleric:appeaser:aura:0": {
    archetypeId: "cleric:appeaser",
    name: "Aura",
    level: 0,
    bucket: "subsystem",
    note: "forces an evil alignment aura regardless of actual alignment — alters aura display only, no bonus",
  },
  "cleric:appeaser:channel-utility:0": {
    archetypeId: "cleric:appeaser",
    name: "Channel Utility",
    level: 5,
    bucket: "blocked",
    note: "treats cleric level as 4 lower, but only when channeling the ENERGY OPPOSITE her own alignment's — channel-variants.ts's override hook (class note 3) applies unconditionally to a granting class, so this conditional-on-which-energy divergence still can't be expressed there and stays prose",
  },
  "cleric:appeaser:divine-apologist:0": {
    archetypeId: "cleric:appeaser",
    name: "Divine Apologist",
    level: 0,
    bucket: "subsystem",
    note: "alignment/spell-list restriction (no good- or evil-descriptor spells) — no Change target",
  },
  "cleric:appeaser:mollified-domain:1": {
    archetypeId: "cleric:appeaser",
    name: "Mollified Domain",
    level: 1,
    bucket: "subsystem",
    note: "replaces both domains with a costly, temporary single-domain-at-a-time ritual — domains are their own vendored subsystem (class note 1)",
  },

  // ── cleric:asmodean-advocate ──
  "cleric:asmodean-advocate:devil-in-the-details:1": {
    archetypeId: "cleric:asmodean-advocate",
    name: "Devil in the Details",
    level: 1,
    bucket: "numeric",
    note: "unconditional insight bonus on all Profession (barrister) checks equal to half class level (min +1) — the Linguistics-checks-about-forgeries clause (narrowly scoped) and the extension to her familiar are dropped",
  },
  "cleric:asmodean-advocate:pact-bound:1": {
    archetypeId: "cleric:asmodean-advocate",
    name: "Pact-Bound",
    level: 1,
    bucket: "subsystem",
    note: "forces Asmodeus as deity and Trickery as the sole domain — domain subsystem (class note 1)",
  },
  "cleric:asmodean-advocate:serpent:1": {
    archetypeId: "cleric:asmodean-advocate",
    name: "Serpent",
    level: 1,
    bucket: "subsystem",
    note: "grants a viper familiar (arcane-bond-style) — familiar subsystem",
  },
  "cleric:asmodean-advocate:shoulder-devil:8": {
    archetypeId: "cleric:asmodean-advocate",
    name: "Shoulder Devil",
    level: 8,
    bucket: "subsystem",
    note: "grants an Improved-Familiar-equivalent imp — familiar subsystem",
  },

  // ── cleric:blossoming-light ──
  "cleric:blossoming-light:luminous-font:1": {
    archetypeId: "cleric:blossoming-light",
    name: "Luminous Font",
    level: 1,
    bucket: "subsystem",
    note: "resets channel energy's uses/day to 5 + Cha mod plus a level-scaled bump instead of the vendored flat 3 + Cha mod — a resource-pool SIZE divergence, so no Change target here, but wired via channel-variants.ts's dedicated override (class note 3); the bundled Diplomacy/Intimidate bonus, expanded-target riders, and 10th-level atonement SLA are separately activated/narrowly scoped and add nothing extractable on their own",
  },
  "cleric:blossoming-light:promise-of-faith:1": {
    archetypeId: "cleric:blossoming-light",
    name: "Promise of Faith",
    level: 1,
    bucket: "subsystem",
    note: "loses all class features (including spellcasting) while armored/shielded or for 1 minute after — a restriction, no Change",
  },
  "cleric:blossoming-light:promise-of-purity:1": {
    archetypeId: "cleric:blossoming-light",
    name: "Promise of Purity",
    level: 1,
    bucket: "subsystem",
    note: "alignment restriction; loses all class features on an evil act until atoned — no Change",
  },
  "cleric:blossoming-light:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:blossoming-light",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric's simple-weapons-plus-favored-weapon proficiency verbatim — no divergence",
  },

  // ── cleric:cardinal ──
  "cleric:cardinal:political-skill:1": {
    archetypeId: "cleric:cardinal",
    name: "Political Skill",
    level: 1,
    bucket: "numeric",
    note: "gains 6 + Int modifier skill ranks/level instead of 2 + Int (a flat +4/level delta) — extracted as bonusSkillRanks; the class-skill-list swap, one-domain restriction, halved BAB, and spontaneous-casting replacement are unmodeled (no Change target for a class's BAB progression tier or its class-skill list)",
  },
  "cleric:cardinal:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:cardinal",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric's weapon/armor/shield proficiency verbatim — no divergence",
  },

  // ── cleric:channeler-of-the-unknown ──
  "cleric:channeler-of-the-unknown:channel-entropy:7": {
    archetypeId: "cleric:channeler-of-the-unknown",
    name: "Channel Entropy",
    level: 7,
    bucket: "situational",
    note: "channel-energy variant that damages living, unliving, and undead alike, using the same vendored dice progression (a targeting-scope change, not a dice change) — channel energy is activated (class note 2)",
  },
  "cleric:channeler-of-the-unknown:power-of-the-unknown:1": {
    archetypeId: "cleric:channeler-of-the-unknown",
    name: "Power of the Unknown",
    level: 1,
    bucket: "subsystem",
    note: "restricts to one domain from a fixed list and doubles domain spell slots per level — domains (and spell-slot counts) are subsystem (class note 1)",
  },
  "cleric:channeler-of-the-unknown:spontaneous-casting:1": {
    archetypeId: "cleric:channeler-of-the-unknown",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "redirects spontaneous casting into domain spells instead of cure/inflict — casting-mechanic swap, no Change",
  },
  "cleric:channeler-of-the-unknown:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:channeler-of-the-unknown",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "swaps the deity's favored-weapon proficiency for one player-chosen martial/exotic weapon — proficiency grant, no Change",
  },

  // ── cleric:cloistered-cleric ──
  "cleric:cloistered-cleric:breadth-of-knowledge:1": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Breadth of Knowledge",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts's cleric section; not duplicated here (class note 6)",
  },
  "cleric:cloistered-cleric:diminished-spellcasting:1": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, plus one fewer non-domain spell per level — domain subsystem plus an unmodeled spell-slot count",
  },
  "cleric:cloistered-cleric:scribe-scroll:4": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Scribe Scroll",
    level: 4,
    bucket: "subsystem",
    note: "grants Scribe Scroll as a bonus feat — fixed named-feat grant, not a player-chosen bonusFeats slot",
  },
  "cleric:cloistered-cleric:verbal-instruction:3": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Verbal Instruction",
    level: 3,
    bucket: "situational",
    note: "an aid-another variant that can assist multiple allies at once — the +2 aid-another bonus is real but activated, and lands on the ally being aided, not the cleric",
  },
  "cleric:cloistered-cleric:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts proficiency to light armor and five named weapons, drops shields — proficiency swap, no Change",
  },
  "cleric:cloistered-cleric:well-read:2": {
    archetypeId: "cleric:cloistered-cleric",
    name: "Well-Read",
    level: 2,
    bucket: "situational",
    note: "+2 on skill/caster-level/save checks, but only when the roll pertains to glyphs, runes, scrolls, symbols, or other writings — a per-check subject-matter condition",
  },

  // ── cleric:crashing-wave ──
  "cleric:crashing-wave:balanced-channel:1": {
    archetypeId: "cleric:crashing-wave",
    name: "Balanced Channel",
    level: 1,
    bucket: "situational",
    note: "channel-energy variant scoped to axial alignments, using the same vendored dice progression — channel energy is activated (class note 2)",
  },
  "cleric:crashing-wave:speech-of-the-sea:1": {
    archetypeId: "cleric:crashing-wave",
    name: "Speech of the Sea",
    level: 1,
    bucket: "subsystem",
    note: "swaps bonus-language options — no Change",
  },
  "cleric:crashing-wave:spontaneous-casting:1": {
    archetypeId: "cleric:crashing-wave",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "replaces cure/inflict spontaneous casting with a fixed water-themed spell list — casting-mechanic swap",
  },
  "cleric:crashing-wave:sworn-to-the-sea:1": {
    archetypeId: "cleric:crashing-wave",
    name: "Sworn to the Sea",
    level: 1,
    bucket: "subsystem",
    note: "forces Gozreh as deity — no Change",
  },

  // ── cleric:crusader ──
  "cleric:crusader:bonus-feat:1": {
    archetypeId: "cleric:crusader",
    name: "Bonus Feat",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts's cleric section; not duplicated here (class note 6)",
  },
  "cleric:crusader:diminished-spellcasting:1": {
    archetypeId: "cleric:crusader",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, one fewer spell per level — domain subsystem plus an unmodeled spell-slot count",
  },
  "cleric:crusader:legion-s-blessing:8": {
    archetypeId: "cleric:crusader",
    name: "Legion's Blessing",
    level: 8,
    bucket: "situational",
    note: "full-round action that copies a touch spell onto several allies at the cost of a higher-level prepared spell — activated, resource-gated, ally-targeting",
  },

  // ── cleric:demonic-apostle ──
  "cleric:demonic-apostle:demonic-channel:1": {
    archetypeId: "cleric:demonic-apostle",
    name: "Demonic Channel",
    level: 1,
    bucket: "situational",
    note: "replaces channel energy with an alignment-scoped variant using the identical vendored dice progression — channel energy is activated (class note 2); the 5th-level ally-rage and 9th-level enemy-sicken riders are activated/ally- or debuff-scoped too",
  },
  "cleric:demonic-apostle:demonic-familiar:1": {
    archetypeId: "cleric:demonic-apostle",
    name: "Demonic Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants (and later upgrades) a familiar — familiar subsystem",
  },
  "cleric:demonic-apostle:demonic-magic:1": {
    archetypeId: "cleric:demonic-apostle",
    name: "Demonic Magic",
    level: 1,
    bucket: "subsystem",
    note: "forces negative-energy channeling and a Chaos/Evil/Demon-subdomain-only domain — domain subsystem (class note 1)",
  },

  // ── cleric:divine-paragon ──
  "cleric:divine-paragon:devoted-domain:1": {
    archetypeId: "cleric:divine-paragon",
    name: "Devoted Domain",
    level: 1,
    bucket: "subsystem",
    note: "restructures domains into a devoted domain plus Deific Obedience boons — domain subsystem, boons deferred (class note 1)",
  },
  "cleric:divine-paragon:divine-brand:1": {
    archetypeId: "cleric:divine-paragon",
    name: "Divine Brand",
    level: 1,
    bucket: "subsystem",
    note: "raises the effective cleric level used only when OTHER creatures' detect-alignment spells gauge the strength of her aura — no Change target for how a character's aura reads to an outside observer, and no bonus to her own rolls",
  },

  // ── cleric:divine-scourge ──
  "cleric:divine-scourge:curser:1": {
    archetypeId: "cleric:divine-scourge",
    name: "Curser",
    level: 1,
    bucket: "subsystem",
    note: "forces the Curse subdomain as the sole domain — domain subsystem (class note 1)",
  },
  "cleric:divine-scourge:divine-hexes:3": {
    archetypeId: "cleric:divine-scourge",
    name: "Divine Hexes",
    level: 3,
    bucket: "subsystem",
    note: "grants access to the witch hex list — hex subsystem, deferred the same as witch archetypes",
  },

  // ── cleric:divine-strategist ──
  "cleric:divine-strategist:caster-support:1": {
    archetypeId: "cleric:divine-strategist",
    name: "Caster Support",
    level: 1,
    bucket: "situational",
    note: "an aid-another variant granting a caster-level/concentration bonus to an ADJACENT ally — activated, ally-targeting",
  },
  "cleric:divine-strategist:master-tactician:1": {
    archetypeId: "cleric:divine-strategist",
    name: "Master Tactician",
    level: 1,
    bucket: "numeric",
    note: "unconditional bonus on the strategist's own initiative checks equal to half cleric level — the surprise-round action-economy grant, the ally initiative bonus (ally-only, class note 5), and the 20th-level auto-natural-20 (an absolute effect, not a modifier) are dropped",
  },
  "cleric:divine-strategist:tactical-expertise:8": {
    archetypeId: "cleric:divine-strategist",
    name: "Tactical Expertise",
    level: 8,
    bucket: "situational",
    note: "Int-bonus-to-attack while flanking or on an attack of opportunity, plus a once/day (scaling) swift-action bonus on a readied action — both conditioned on a specific combat state/action the engine can't check",
  },

  // ── cleric:ecclesitheurge ──
  "cleric:ecclesitheurge:blessing-of-the-faithful:1": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Blessing of the Faithful",
    level: 1,
    bucket: "situational",
    note: "a standard-action buff granting +2 to an ALLY's rolls/AC until the caster's next turn — activated and ally-targeting (class note 5)",
  },
  "cleric:ecclesitheurge:bonded-holy-symbol:3": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Bonded Holy Symbol",
    level: 3,
    bucket: "subsystem",
    note: "a wizard-bonded-object-style item mechanic — no Change",
  },
  "cleric:ecclesitheurge:channel-energy:5": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Channel energy",
    level: 5,
    bucket: "situational",
    note: "restates the base Channel Energy ability verbatim, gated to 5th level — channel energy is activated (class note 2)",
  },
  "cleric:ecclesitheurge:domain-mastery:1": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Domain Mastery",
    level: 1,
    bucket: "subsystem",
    note: "lets non-domain slots draw from a primary domain and daily-swaps the secondary domain's spell list — domain subsystem (class note 1)",
  },
  "cleric:ecclesitheurge:ecclesitheurge-s-vow:1": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Ecclesitheurge's Vow",
    level: 1,
    bucket: "subsystem",
    note: "loses all class features while armored/shielded — a restriction, no Change",
  },
  "cleric:ecclesitheurge:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:ecclesitheurge",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "trades all armor/shield proficiency for four specific simple weapons — proficiency swap, no Change",
  },

  // ── cleric:elder-mythos-cultist ──
  "cleric:elder-mythos-cultist:channel-energy:9": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Channel energy",
    level: 9,
    bucket: "situational",
    note: "restates the base Channel Energy ability verbatim, gated to 9th level — channel energy is activated (class note 2)",
  },
  "cleric:elder-mythos-cultist:channel-the-void:1": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Channel the Void",
    level: 1,
    bucket: "situational",
    note: "replaces channel energy with a Fortitude-save void-damage variant (living, fleshy undead, and constructs) — channel energy is activated (class note 2); the 8th-level disintegrate-on-kill rider is an absolute effect, not a modifier",
  },
  "cleric:elder-mythos-cultist:domains:1": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Domains",
    level: 1,
    bucket: "subsystem",
    note: "restricts to a single domain from Chaos/Madness/Void — domain subsystem (class note 1)",
  },
  "cleric:elder-mythos-cultist:forbidden-knowledge:1": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Forbidden Knowledge",
    level: 1,
    bucket: "numeric",
    note: "unconditional +2 profane bonus on five named Knowledge skills (arcana/dungeoneering/history/planes/religion), untrained access included — the doubling for Elder-Mythos-related checks is dropped (mixed-feature, unconditional clause extracted)",
  },
  "cleric:elder-mythos-cultist:maddening-gaze:5": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Maddening Gaze",
    level: 5,
    bucket: "situational",
    note: "a limited-use gaze attack (Wisdom damage, confusion, sickened) — activated, save-or-effect, no baseline number",
  },
  "cleric:elder-mythos-cultist:unhinged-mind:1": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Unhinged Mind",
    level: 1,
    bucket: "numeric",
    note: "unconditional -2 penalty on Will saves to resist mind-affecting effects, expressed via saveCategories — the Charisma-for-Wisdom casting-stat swap and the auto-fail-vs-higher-CL-effects clause are separate, unmodeled abilities",
  },
  "cleric:elder-mythos-cultist:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:elder-mythos-cultist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric proficiency verbatim — no divergence",
  },

  // ── cleric:evangelist ──
  "cleric:evangelist:channel-energy:3": {
    archetypeId: "cleric:evangelist",
    name: "Channel energy",
    level: 3,
    bucket: "situational",
    note: "restates the base Channel Energy ability verbatim, gated to 3rd level — channel energy is activated (class note 2)",
  },
  "cleric:evangelist:countersong:1": {
    archetypeId: "cleric:evangelist",
    name: "Countersong",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance grant (Countersong) via Sermonic Performance — bardic performance modifications are always subsystem (class note 4)",
  },
  "cleric:evangelist:fascinate:1": {
    archetypeId: "cleric:evangelist",
    name: "Fascinate",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance grant (Fascinate) — same posture as Countersong above (class note 4)",
  },
  "cleric:evangelist:inspire-courage:1": {
    archetypeId: "cleric:evangelist",
    name: "Inspire Courage",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance grant (Inspire Courage) — same posture as Countersong above (class note 4)",
  },
  "cleric:evangelist:inspire-greatness:9": {
    archetypeId: "cleric:evangelist",
    name: "Inspire Greatness",
    level: 9,
    bucket: "subsystem",
    note: "bardic-performance grant (Inspire Greatness) — same posture as Countersong above (class note 4)",
  },
  "cleric:evangelist:inspire-heroics:15": {
    archetypeId: "cleric:evangelist",
    name: "Inspire Heroics",
    level: 15,
    bucket: "subsystem",
    note: "bardic-performance grant (Inspire Heroics) — same posture as Countersong above (class note 4)",
  },
  "cleric:evangelist:public-speaker:1": {
    archetypeId: "cleric:evangelist",
    name: "Public Speaker",
    level: 1,
    bucket: "subsystem",
    note: "reduces the DC OTHER creatures need to hear her speak in noisy conditions — changes a listener's check, not a roll the cleric makes, no reciprocal Change target",
  },
  "cleric:evangelist:sermonic-performance:1": {
    archetypeId: "cleric:evangelist",
    name: "Sermonic Performance",
    level: 1,
    bucket: "subsystem",
    note: "grafts bardic performance onto channel energy's 1st/9th/15th-level slots (bardic-performance grant, class note 4) and caps the cleric's channel energy damage at 7d6 — the cap has no Change target of its own, but is wired via channel-variants.ts's dedicated override (class note 3)",
  },
  "cleric:evangelist:single-minded:1": {
    archetypeId: "cleric:evangelist",
    name: "Single-Minded",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, drops Medium Armor/Shield Proficiency — domain subsystem (class note 1) plus proficiency loss",
  },
  "cleric:evangelist:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:evangelist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts to simple weapons and light armor only — proficiency swap, no Change",
  },

  // ── cleric:fiendish-vessel ──
  "cleric:fiendish-vessel:channel-evil:1": {
    archetypeId: "cleric:fiendish-vessel",
    name: "Channel Evil",
    level: 1,
    bucket: "subsystem",
    note: "replaces channel energy with a d4-based progression (1d4, +1d4 every 2 levels to 10d4 at 19th) instead of the vendored 1d6-based one — no Change target for a dice-progression swap, but wired via channel-variants.ts's dedicated override (class note 3), on top of being activated/resource-gated regardless (class note 2)",
  },
  "cleric:fiendish-vessel:fiendish-familiar:3": {
    archetypeId: "cleric:fiendish-vessel",
    name: "Fiendish Familiar",
    level: 3,
    bucket: "subsystem",
    note: "fiendish augury 1/day and fiendish divination 1-3/day (9th, scaling at 13th) wired via the spell-like-abilities route; the familiar grant/mouthpiece rider stays familiar subsystem",
  },

  // ── cleric:forgemaster ──
  "cleric:forgemaster:artificer:1": {
    archetypeId: "cleric:forgemaster",
    name: "Artificer",
    level: 1,
    bucket: "subsystem",
    note: "forces the Artifice domain as the sole domain — domain subsystem (class note 1)",
  },
  "cleric:forgemaster:craft-magic-arms-and-armor:3": {
    archetypeId: "cleric:forgemaster",
    name: "Craft Magic Arms and Armor",
    level: 3,
    bucket: "subsystem",
    note: "grants Craft Magic Arms and Armor as a bonus feat — fixed named-feat grant",
  },
  "cleric:forgemaster:divine-smith:1": {
    archetypeId: "cleric:forgemaster",
    name: "Divine Smith",
    level: 1,
    bucket: "blocked",
    note: "+1 caster level on spells targeting a weapon/shield/armor — 'cl' (caster level) is a listed-but-unapplied target (targets.ts's UNAPPLIED_TARGET_LABELS), so no engine hook consumes it even though the number itself is clean and unconditional",
  },
  "cleric:forgemaster:master-smith:5": {
    archetypeId: "cleric:forgemaster",
    name: "Master Smith",
    level: 5,
    bucket: "subsystem",
    note: "halves crafting time/cost — a downtime-crafting mechanic, no combat/sheet stat",
  },
  "cleric:forgemaster:runeforger:1": {
    archetypeId: "cleric:forgemaster",
    name: "Runeforger",
    level: 1,
    bucket: "subsystem",
    note: "a rune choice-list applied to gear, replacing channel energy — item-enchantment subsystem",
  },
  "cleric:forgemaster:steel-spells:1": {
    archetypeId: "cleric:forgemaster",
    name: "Steel Spells",
    level: 1,
    bucket: "subsystem",
    note: "adds spells to the cleric spell list — no Change",
  },

  // ── cleric:foundation-of-faith ──
  "cleric:foundation-of-faith:bastion:1": {
    archetypeId: "cleric:foundation-of-faith",
    name: "Bastion",
    level: 1,
    bucket: "numeric",
    note: "unconditional Constitution-modifier bonus to CMD — the paired 'DC of Intimidate attempts against her' clause has no reciprocal Change target and is dropped",
  },
  "cleric:foundation-of-faith:granite-focus:1": {
    archetypeId: "cleric:foundation-of-faith",
    name: "Granite Focus",
    level: 1,
    bucket: "situational",
    note: "adds Con modifier to concentration checks for the rest of the turn after a move action — 'concentration' is an unapplied target (targets.ts) and the bonus is activated regardless",
  },
  "cleric:foundation-of-faith:rooted-vitality:5": {
    archetypeId: "cleric:foundation-of-faith",
    name: "Rooted Vitality",
    level: 5,
    bucket: "situational",
    note: "swift-action fast healing while touching natural/worked stone, or a lesser version granted to touched allies — activated, terrain-gated, and partly ally-targeting",
  },

  // ── cleric:herald-caller ──
  "cleric:herald-caller:call-heralds:1": {
    archetypeId: "cleric:herald-caller",
    name: "Call Heralds",
    level: 1,
    bucket: "situational",
    note: "a concentration-check bonus scoped to casting a summon monster spell defensively — 'concentration' is an unapplied target and the bonus only applies to one specific action",
  },
  "cleric:herald-caller:divine-heralds:1": {
    archetypeId: "cleric:herald-caller",
    name: "Divine Heralds",
    level: 1,
    bucket: "subsystem",
    note: "restricts and re-themes summon monster's creature list, plus channel-energy interactions with summoned creatures — summon-list subsystem",
  },
  "cleric:herald-caller:mighty-heralds:4": {
    archetypeId: "cleric:herald-caller",
    name: "Mighty Heralds",
    level: 4,
    bucket: "subsystem",
    note: "grants Augment Summoning and (later) Superior Summoning as bonus feats — fixed named-feat grants",
  },

  // ── cleric:hidden-priest ──
  "cleric:hidden-priest:false-arcanist:1": {
    archetypeId: "cleric:hidden-priest",
    name: "False Arcanist",
    level: 1,
    bucket: "situational",
    note: "the Bluff/Sense Motive/Perception bonus only applies to secret religious messages or recognizing agents of anti-religion laws, not to those skills generally",
  },
  "cleric:hidden-priest:unseen-devotion:8": {
    archetypeId: "cleric:hidden-priest",
    name: "Unseen Devotion",
    level: 8,
    bucket: "subsystem",
    note: "applies Silent Spell and Still Spell to a spell for free, a limited number of times per day — activated resource, no baseline number; replaces a domain granted power",
  },

  // ── cleric:idealist ──
  "cleric:idealist:invoke-realm:1": {
    archetypeId: "cleric:idealist",
    name: "Invoke Realm",
    level: 1,
    bucket: "situational",
    note: "replaces channel energy with an area effect granting a scaling Diplomacy/Intimidate bonus only while active and only against creatures matching/not-matching her deity's worship — activated and narrowly scoped (class note 2)",
  },
  "cleric:idealist:planar-bond:1": {
    archetypeId: "cleric:idealist",
    name: "Planar Bond",
    level: 1,
    bucket: "subsystem",
    note: "adds a fixed plane-themed spell list to spontaneous casting — casting-mechanic subsystem",
  },

  // ── cleric:iron-priest ──
  "cleric:iron-priest:channel-energy:1": {
    archetypeId: "cleric:iron-priest",
    name: "Channel Energy",
    level: 1,
    bucket: "subsystem",
    note: "extends channel energy's healing/harm to constructs (full or half, by subtype) instead of undead — a targeting-scope alteration, no number",
  },

  // ── cleric:lawspeaker ──
  "cleric:lawspeaker:channel-energy:7": {
    archetypeId: "cleric:lawspeaker",
    name: "Channel energy",
    level: 7,
    bucket: "situational",
    note: "restates the base Channel Energy ability verbatim, gated to 7th level — channel energy is activated (class note 2)",
  },
  "cleric:lawspeaker:circumvent-obfuscation:1": {
    archetypeId: "cleric:lawspeaker",
    name: "Circumvent Obfuscation",
    level: 1,
    bucket: "subsystem",
    note: "each tier costs two channel-energy uses, not a day/week counter of its own — cross-pool spend; several tiers also alter the spell's standard scope (self-only true seeing, scoped greater dispel magic)",
  },
  "cleric:lawspeaker:divine-judgment:1": {
    archetypeId: "cleric:lawspeaker",
    name: "Divine Judgment",
    level: 1,
    bucket: "subsystem",
    note: "forces the Law domain (or a Law subdomain) as the sole domain — domain subsystem (class note 1)",
  },

  // ── cleric:mendevian-priest ──
  "cleric:mendevian-priest:channel-energy:7": {
    archetypeId: "cleric:mendevian-priest",
    name: "Channel energy",
    level: 7,
    bucket: "situational",
    note: "restates the base Channel Energy ability verbatim, gated to 7th level — channel energy is activated (class note 2)",
  },
  "cleric:mendevian-priest:demonic-knowledge:1": {
    archetypeId: "cleric:mendevian-priest",
    name: "Demonic Knowledge",
    level: 1,
    bucket: "situational",
    note: "the Knowledge (planes) bonus only applies to checks specifically about demons/demonic cults, not the whole skill",
  },
  "cleric:mendevian-priest:diminished-spellcasting:1": {
    archetypeId: "cleric:mendevian-priest",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two — domain subsystem (class note 1)",
  },
  "cleric:mendevian-priest:teamwork-feat:4": {
    archetypeId: "cleric:mendevian-priest",
    name: "Teamwork Feat",
    level: 4,
    bucket: "numeric",
    note: "a flat, unconditional bonus-feat count from a restricted list: +1 at 4th, +1 more (total 2) at 8th — the restriction to teamwork/named feats isn't modeled, only the count, same posture as other restricted-list bonusFeats entries",
  },
  "cleric:mendevian-priest:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:mendevian-priest",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric proficiency (with heavy armor added) — proficiency grant, no Change",
  },

  // ── cleric:merciful-healer ──
  "cleric:merciful-healer:channel-energy:7": {
    archetypeId: "cleric:merciful-healer",
    name: "Channel energy",
    level: 7,
    bucket: "situational",
    note: "restates the base Channel Energy ability, restricted to positive energy and no undead-targeting — channel energy is activated (class note 2)",
  },
  "cleric:merciful-healer:combat-medic:1": {
    archetypeId: "cleric:merciful-healer",
    name: "Combat Medic",
    level: 1,
    bucket: "subsystem",
    note: "removes the attack of opportunity for using Heal to stabilize or casting healing spells — an action-economy exemption, no engine target",
  },
  "cleric:merciful-healer:merciful-healing:3": {
    archetypeId: "cleric:merciful-healer",
    name: "Merciful Healing",
    level: 3,
    bucket: "situational",
    note: "channels energy to also strip a chosen condition from healed creatures — activated, tied to channel energy",
  },
  "cleric:merciful-healer:true-healer:8": {
    archetypeId: "cleric:merciful-healer",
    name: "True Healer",
    level: 8,
    bucket: "situational",
    note: "an activated choice to reroll 1s on channeled healing — resource-gated",
  },
  "cleric:merciful-healer:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:merciful-healer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric proficiency verbatim — no divergence",
  },
  "cleric:merciful-healer:willing-healer:1": {
    archetypeId: "cleric:merciful-healer",
    name: "Willing Healer",
    level: 1,
    bucket: "subsystem",
    note: "forces the Healing domain as the sole domain, and positive-energy channeling — domain subsystem (class note 1)",
  },

  // ── cleric:roaming-exorcist ──
  "cleric:roaming-exorcist:curse-eater:11": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Curse Eater",
    level: 11,
    bucket: "situational",
    note: "grants Improved Disarm plus a +2 CMB bonus scoped specifically to disarming a creature of a cursed item — a real number, but scoped to one maneuver against one item category",
  },
  "cleric:roaming-exorcist:curse-seeker:5": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Curse Seeker",
    level: 5,
    bucket: "subsystem",
    note: "lowers the DC margin needed to identify an item as cursed — an item-identification threshold, no engine target",
  },
  "cleric:roaming-exorcist:dedicated-wanderer:1": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Dedicated Wanderer",
    level: 1,
    bucket: "subsystem",
    note: "forces positive-energy channeling, one domain instead of two, and drops Medium Armor/Shield Proficiency — domain subsystem (class note 1) plus proficiency loss",
  },
  "cleric:roaming-exorcist:dispossession:8": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Dispossession",
    level: 8,
    bucket: "situational",
    note: "an activated melee-touch ability that expends a channel-energy use to eject a possessing creature — activated, resource-gated",
  },
  "cleric:roaming-exorcist:spirit-sleuth:2": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Spirit Sleuth",
    level: 2,
    bucket: "subsystem",
    note: "triggers a free Sense Motive check to learn how to neutralize a spirit/haunt — a check trigger, not a bonus",
  },
  "cleric:roaming-exorcist:unseen-revealed:1": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Unseen Revealed",
    level: 1,
    bucket: "situational",
    note: "the Perception/Sense Motive bonus only applies to detecting haunts/incorporeal creatures or diagnosing possession/curses/enchantment, not those skills generally",
  },
  "cleric:roaming-exorcist:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:roaming-exorcist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts to simple weapons and light armor only — proficiency swap, no Change",
  },

  // ── cleric:sacred-attendant ──
  "cleric:sacred-attendant:inspiring-camaraderie:8": {
    archetypeId: "cleric:sacred-attendant",
    name: "Inspiring Camaraderie",
    level: 8,
    bucket: "situational",
    note: "a swift-action buff to an ALLY's attack rolls, triggered by casting a cure spell on that ally — activated and ally-targeting (class note 5)",
  },
  "cleric:sacred-attendant:nimble:1": {
    archetypeId: "cleric:sacred-attendant",
    name: "Nimble",
    level: 1,
    bucket: "numeric",
    note: "always-on (armor- and encumbrance-gated) dodge bonus to AC/CMD, scaling from +1 at 1st to +6 at 18th — only the not-denied-Dex clause is dropped (a per-situation state no formula can check)",
  },
  "cleric:sacred-attendant:nurture-grace:1": {
    archetypeId: "cleric:sacred-attendant",
    name: "Nurture Grace",
    level: 1,
    bucket: "situational",
    note: "an activated, touch-range Charisma-check buff lasting 1 round (or 1 day at extra cost) — activated, resource-gated",
  },
  "cleric:sacred-attendant:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:sacred-attendant",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "drops medium/heavy armor proficiency, keeps shields — proficiency swap, no Change",
  },

  // ── cleric:scroll-scholar ──
  "cleric:scroll-scholar:diligent-student:1": {
    archetypeId: "cleric:scroll-scholar",
    name: "Diligent Student",
    level: 1,
    bucket: "subsystem",
    note: "adds half class level (min 1) to a Knowledge skill of the player's choice, with more skills addable at 5th/10th/etc. — a real, clean formula, but the specific skill.<x> target is a per-player choice-list with no CharacterDoc field to record it (same free-choice bar as the identical wizard:scroll-scholar:diligent-student:1 entry); replaces a 1st-level domain granted power",
  },
  "cleric:scroll-scholar:flash-of-insight:10": {
    archetypeId: "cleric:scroll-scholar",
    name: "Flash of Insight",
    level: 10,
    bucket: "situational",
    note: "a limited-use (1-3/day by level) +5 bonus on a single roll as an immediate action — activated, resource-gated",
  },
  "cleric:scroll-scholar:secrets-revealed:5": {
    archetypeId: "cleric:scroll-scholar",
    name: "Secrets Revealed",
    level: 5,
    bucket: "subsystem",
    note: "delays the cleric's normal 5th-level channel-energy-damage increase to 7th, running 1d6 behind the vendored progression for the rest of her career — no Change target for a dice-progression shift, but wired via channel-variants.ts's dedicated override (class note 3); the bundled comprehend languages/identify spell-like abilities are activated/resource-gated on their own schedule",
  },
  "cleric:scroll-scholar:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:scroll-scholar",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restates the base cleric proficiency verbatim — no divergence",
  },

  // ── cleric:separatist ──
  "cleric:separatist:forbidden-rites:0": {
    archetypeId: "cleric:separatist",
    name: "Forbidden Rites",
    level: 0,
    bucket: "subsystem",
    note: "adds an off-list second domain at a permanently reduced effective level/Wisdom/Charisma for that domain's powers — domain subsystem (class note 1)",
  },
  "cleric:separatist:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:separatist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "keeps the base proficiency but drops the deity's favored-weapon grant — proficiency swap, no Change",
  },

  // ── cleric:stoic-caregiver ──
  "cleric:stoic-caregiver:domains:1": {
    archetypeId: "cleric:stoic-caregiver",
    name: "Domains",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, otherwise a verbatim reprint of the base domains ability — domain subsystem (class note 1)",
  },
  "cleric:stoic-caregiver:fated-cures:1": {
    archetypeId: "cleric:stoic-caregiver",
    name: "Fated Cures",
    level: 1,
    bucket: "subsystem",
    note: "forces creatures to roll twice (take lower) on saves against her healing-subschool spells — a penalty on the TARGET's save, not a Change to the caregiver's own stats",
  },
  "cleric:stoic-caregiver:midwife-training:1": {
    archetypeId: "cleric:stoic-caregiver",
    name: "Midwife Training",
    level: 1,
    bucket: "situational",
    note: "the +2 Heal bonus only applies to treating expectant mothers/children, not Heal checks generally; the bleed/negative-energy resistance it grants is conferred onto whoever she heals (class note 5), not a bonus of her own",
  },
  "cleric:stoic-caregiver:positive-channeler:1": {
    archetypeId: "cleric:stoic-caregiver",
    name: "Positive Channeler",
    level: 1,
    bucket: "subsystem",
    note: "forces positive-energy channeling and a non-evil deity — no Change",
  },
  "cleric:stoic-caregiver:three-aspect-channel:6": {
    archetypeId: "cleric:stoic-caregiver",
    name: "Three-Aspect Channel",
    level: 6,
    bucket: "situational",
    note: "an activated choice to channel energy to heal and harm simultaneously at half effect — activated, tied to channel energy",
  },

  // ── cleric:theologian ──
  "cleric:theologian:domain-secret:5": {
    archetypeId: "cleric:theologian",
    name: "Domain Secret",
    level: 5,
    bucket: "subsystem",
    note: "permanently applies a chosen metamagic feat to a domain spell for free — domain subsystem (class note 1)",
  },
  "cleric:theologian:focused-domain:1": {
    archetypeId: "cleric:theologian",
    name: "Focused Domain",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, its granted powers effectively 2 levels ahead — domain subsystem (class note 1)",
  },

  // ── cleric:triadic-priest ──
  "cleric:triadic-priest:bonded-channeler:1": {
    archetypeId: "cleric:triadic-priest",
    name: "Bonded Channeler",
    level: 1,
    bucket: "situational",
    note: "channel energy must include-only or exclude-only her bonded allies — a targeting restriction on an already-activated ability (class note 2)",
  },
  "cleric:triadic-priest:bonded-domain:1": {
    archetypeId: "cleric:triadic-priest",
    name: "Bonded Domain",
    level: 1,
    bucket: "subsystem",
    note: "one domain instead of two, with proximity-gated bonuses while near a bonded ally — domain subsystem (class note 1); the vendored description is itself truncated ('gains the following benefits.' with no benefits listed), a data oddity worth flagging",
  },
  "cleric:triadic-priest:triadic-bond:1": {
    archetypeId: "cleric:triadic-priest",
    name: "Triadic Bond",
    level: 1,
    bucket: "subsystem",
    note: "a bonding ritual with two allies; the coupled Fortitude-save-or-negative-level penalty falls on the ALLIES if a bond partner dies, not the priest — bond/ally mechanic",
  },

  // ── cleric:undead-lord ──
  "cleric:undead-lord:bonus-feats:0": {
    archetypeId: "cleric:undead-lord",
    name: "Bonus Feats",
    level: 0,
    bucket: "numeric",
    note: "a flat, unconditional +1 bonus feat from a restricted list at 10th level, extracted as bonusFeats — the automatic Command Undead grant (a fixed named feat, not a countable slot) is dropped",
  },
  "cleric:undead-lord:corpse-companion:0": {
    archetypeId: "cleric:undead-lord",
    name: "Corpse Companion",
    level: 0,
    bucket: "subsystem",
    note: "animates a controlled skeleton/zombie companion — companion subsystem, not the character's own stats",
  },
  "cleric:undead-lord:death-magic:0": {
    archetypeId: "cleric:undead-lord",
    name: "Death Magic",
    level: 0,
    bucket: "subsystem",
    note: "forces the Death domain (and Undead subdomain) as the sole domain — domain subsystem (class note 1)",
  },
  "cleric:undead-lord:unlife-healer:8": {
    archetypeId: "cleric:undead-lord",
    name: "Unlife Healer",
    level: 8,
    bucket: "subsystem",
    note: "increases (and later maximizes) how much her healing effects restore to undead — spell/SLA/Su healing OUTPUT isn't a Change-summed value in this engine (the sheet doesn't total how much a cast spell heals), so there's nothing to extract",
  },

  // ── cleric:varisian-pilgrim ──
  "cleric:varisian-pilgrim:blessing-of-the-harrow:8": {
    archetypeId: "cleric:varisian-pilgrim",
    name: "Blessing of the Harrow",
    level: 8,
    bucket: "subsystem",
    note: "a once/day harrowing-reading ability replacing a domain power — narrative/divination subsystem",
  },
  "cleric:varisian-pilgrim:caravan-bond:1": {
    archetypeId: "cleric:varisian-pilgrim",
    name: "Caravan Bond",
    level: 1,
    bucket: "subsystem",
    note: "extends domain-granted powers to a group of traveling companions at range — domain/ally subsystem (class note 1), drops Medium Armor/Shield proficiency",
  },
  "cleric:varisian-pilgrim:fortunate-road:1": {
    archetypeId: "cleric:varisian-pilgrim",
    name: "Fortunate Road",
    level: 1,
    bucket: "subsystem",
    note: "forces one domain from a fixed list — domain subsystem (class note 1)",
  },
  "cleric:varisian-pilgrim:weapon-and-armor-proficiency:1": {
    archetypeId: "cleric:varisian-pilgrim",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "restricts to simple weapons and light armor only — proficiency swap, no Change",
  },
};

/**
 * ── CLERIC_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for cleric archetype class features
 * (the prose→Change extraction pipeline, cleric slice). Clean-room from the
 * published PF1 rules — the vendored prose this was extracted from
 * (`archetype-features.json`) is OGL, so reading it is fine; no Foundry
 * source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 9 of cleric's 137 features
 * cleared the `numeric` bar (11 are classified `numeric`, but 2 — Cloistered
 * Cleric's Breadth of Knowledge and Crusader's Bonus Feat — are already
 * hand-verified and intentionally NOT duplicated here, see this file's
 * header comment note 6). Cleric's kit leans heavily on domains (an entirely
 * deferred subsystem), an activated Channel Energy whose dice/uses
 * progression is hardcoded elsewhere, and grafted bardic performances — all
 * of which are `subsystem`/`situational` by this file's own class notes.
 *
 * Confidence rubric documented in this file's header comment.
 */
export const CLERIC_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Asmodean Advocate's "Devil in the Details" (Faiths of Corruption-era
  // supplement) grants an unconditional insight bonus on all Profession
  // (barrister) checks — a named Profession instance, same "player must have
  // created a matching-slug skill instance" shape as the hand-verified
  // table's Sorcerer of Sleep -> skill.crf.alchemy precedent and witch.ts's
  // Herb Witch -> skill.pro.herbalist precedent. The Linguistics-checks-
  // about-forgeries clause is narrowly scoped (dropped) and the familiar
  // extension isn't the character's own number.
  "cleric:asmodean-advocate:devil-in-the-details:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.pro.barrister", "insight")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Profession (barrister) (insight)`,
    confidence: "medium",
    provenance:
      "The Asmodean advocate gains an insight bonus equal to 1/2 her cleric level (minimum " +
      "+1) on Linguistics checks related to forgeries and on all Profession (barrister) checks.",
  },

  // Cardinal (Faiths of Purity) replaces the normal 2 + Int skill ranks/level
  // with 6 + Int — a flat +4/level delta, expressed the same way
  // `paladin.ts`'s Faithful Wanderer/Tortured Crusader express their own
  // 2+Int -> 4+Int doubling: a flat per-level `bonusSkillRanks` Change
  // (`apps/web/src/model/skills.ts`'s archetype-aware `skillBudget` loop
  // reads it; `compute()` itself never touches this target). The
  // class-skill-list swap, the one-domain restriction, the halved BAB, and
  // the spontaneous-casting replacement are unmodeled — no Change target
  // exists for a per-archetype class-skill list or for a class's BAB
  // progression tier.
  "cleric:cardinal:political-skill:1": {
    changes: [c("4 * @class.unlevel", "bonusSkillRanks")],
    detail: () => "6 + Int skill ranks/level (BAB/domain/class-skill swaps not modeled)",
    confidence: "high",
    provenance:
      "She gains a number of skill ranks equal to 6 + her Intelligence modifier at each " +
      "level, instead of the normal 2 + her Intelligence modifier.",
  },

  // Divine Strategist's "Master Tactician" (Faiths of Purity) grants an
  // unconditional bonus on the strategist's OWN initiative checks equal to
  // half her cleric level — clean and always-on. The surprise-round
  // action-economy grant, the ally initiative bonus (ally-only, per this
  // file's class note 5), and the 20th-level "automatically a natural 20"
  // clause (an absolute effect, not a modifier — same posture as Kensai's
  // Iaijutsu Master in the magus pilot) are dropped.
  "cleric:divine-strategist:master-tactician:1": {
    changes: [c("floor(@class.unlevel / 2)", "init")],
    detail: (level) =>
      `+${Math.floor(level / 2)} initiative (ally bonus/20th-level auto-20 not modeled)`,
    confidence: "high",
    provenance:
      "the divine strategist gains a bonus on initiative checks equal to 1/2 her cleric level.",
  },

  // Elder Mythos Cultist's "Forbidden Knowledge" (Occult Adventures-era
  // supplement) grants an unconditional +2 profane bonus on five NAMED
  // Knowledge skills — a clean, flat, always-on number. The doubling
  // condition ("if the check is related to the Elder Mythos") is a mixed-
  // feature clause left unmodeled per this pipeline's honesty bar.
  "cleric:elder-mythos-cultist:forbidden-knowledge:1": {
    changes: [
      c("2", "skill.kar", "profane"),
      c("2", "skill.kdu", "profane"),
      c("2", "skill.khi", "profane"),
      c("2", "skill.kpl", "profane"),
      c("2", "skill.kre", "profane"),
    ],
    detail: () =>
      "+2 profane Knowledge (arcana/dungeoneering/history/planes/religion) (doubling vs. Elder Mythos not modeled)",
    confidence: "medium",
    provenance:
      "An Elder Mythos cultist gains a +2 profane bonus on all Knowledge (arcana), Knowledge " +
      "(dungeoneering), Knowledge (history), Knowledge (planes), and Knowledge (religion) " +
      "checks, and can attempt these checks untrained.",
  },

  // Elder Mythos Cultist's "Unhinged Mind" imposes an unconditional -2
  // penalty on Will saves specifically against mind-affecting effects —
  // expressible via `Change.saveCategories` (the same mechanism
  // `class-feature-effects.ts`'s Bravery-style entries use for "+X vs. a
  // category," just negative here). The Charisma-for-Wisdom casting-stat
  // swap and the auto-fail-vs-higher-CL-effects clause are separate
  // abilities this pipeline doesn't model (no casting-stat-swap Change
  // target, and "automatically fails" is an absolute effect, not a
  // modifier).
  "cleric:elder-mythos-cultist:unhinged-mind:1": {
    changes: [
      {
        formula: "-2",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind"],
      } satisfies Change,
    ],
    detail: () => "-2 Will vs. mind-affecting (Cha-for-Wis casting swap not modeled)",
    confidence: "high",
    provenance:
      "the Elder Mythos cultist takes a -2 penalty on Will saves to resist mind-affecting effects.",
  },

  // Foundation of Faith's "Bastion" (Faiths of Purity) grants an
  // unconditional Constitution-modifier bonus to CMD — untyped since the
  // text names no bonus type. The paired "DC of Intimidate attempts against
  // her" clause has no reciprocal Change target (it isn't the foundation of
  // faith's own roll) and is dropped.
  "cleric:foundation-of-faith:bastion:1": {
    changes: [c("@abilities.con.mod", "cmd")],
    detail: () => "+Con modifier to CMD (Intimidate-DC clause not modeled)",
    confidence: "medium",
    provenance:
      "the foundation of faith adds her Constitution bonus to her CMD and to the DC of " +
      "attempts to use the Intimidate skill against her.",
  },

  // Mendevian Priest's "Teamwork Feat" grants a flat, unconditional
  // bonus-feat count from a restricted list: one at 4th level, one more
  // (running total 2) at 8th — no further scaling stated. The restricted
  // list itself isn't modeled, only the count, same posture as the magus
  // pilot's Iron-Ring-Striker Bonus Feat entry.
  "cleric:mendevian-priest:teamwork-feat:4": {
    changes: [c("if(gte(@class.unlevel, 8), 2, if(gte(@class.unlevel, 4), 1, 0))", "bonusFeats")],
    detail: (level) => `${level >= 8 ? 2 : level >= 4 ? 1 : 0} bonus feat(s) (restricted list)`,
    confidence: "medium",
    provenance: "At 4th level and 8th level, the Mendevian priest gains a bonus feat.",
  },

  // Sacred Attendant's "Nimble" grants a dodge bonus to AC/CMD while
  // unarmored AND unencumbered (both checkable: `@armor.type` 0 = no armor,
  // `@attributes.encumbrance.level` 0 = light load, the same axes the
  // vendored Fast Movement change reads); only the not-denied-Dex clause is
  // dropped, a per-situation state no formula can check. +1 at 1st, +1 more
  // at 2nd and every 4 levels thereafter, capped at +6 at 18th. Dodge-type
  // AC bonuses auto-flow into CMD too (compute.ts's CMD_AC_TYPES includes
  // "dodge"), so a single "ac" Change covers both halves of the prose
  // without a duplicate "cmd" entry.
  "cleric:sacred-attendant:nimble:1": {
    changes: [
      c(
        "if(and(eq(@armor.type, 0), lte(@attributes.encumbrance.level, 0)), min(6, 1 + floor((@class.unlevel + 2) / 4)), 0)",
        "ac",
        "dodge",
      ),
    ],
    detail: (level) =>
      `+${Math.min(6, 1 + Math.floor((level + 2) / 4))} dodge AC/CMD (unarmored and unencumbered; Dex-denial not checked)`,
    confidence: "medium",
    provenance:
      "The sacred attendant gains a +1 dodge bonus to AC and CMD when unarmored, " +
      "unencumbered, and not denied her Dexterity bonus to AC (regardless of whether she has " +
      "a Dexterity bonus). At 2nd level and every 4 cleric levels thereafter, the dodge bonus " +
      "increases by 1 (to a maximum of +6 at 18th level).",
  },

  // Undead Lord's "Bonus Feats" grants Command Undead automatically (a
  // fixed named feat, not a countable slot — dropped, same posture as every
  // other named-feat grant in this table) plus a single, unconditional
  // bonus feat from a restricted list at 10th level (no further scaling) —
  // extracted as a flat threshold on bonusFeats.
  "cleric:undead-lord:bonus-feats:0": {
    changes: [c("if(gte(@class.unlevel, 10), 1, 0)", "bonusFeats")],
    detail: (level) => (level >= 10 ? "1 bonus feat (restricted list)" : "Command Undead (fixed)"),
    confidence: "high",
    provenance:
      "In addition, at 10th level, she may select one of the following as a bonus feat: " +
      "Channel Smite, Extra Channel, Improved Channel, Quick Channel, Skeleton Summoner, Undead Master.",
  },
};
