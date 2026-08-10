/**
 * Unchained Summoner's slice of the pipeline. All 17 vendored archetype
 * features across the 5 vendored `summonerUnchained` archetypes (Construct
 * Caller, Devil Binder, Devil Impostor, Fey Caller, Soulbound Summoner) are
 * read in full and bucketed as `numeric` / `situational` / `subsystem` /
 * `blocked`, per the per-class file convention (`./index.ts`'s doc comment).
 *
 * Unlike `barbarianUnchained`, this slice is NOT a byte-copy of the chained
 * `summoner:` slice — the 5 archetypes here are unchained-specific (none of
 * their slugs appear under `summoner:`). But the chained file's five class
 * notes transfer one-for-one, because the unchained kit has the same shape;
 * restated here so each entry's `note` can cite them:
 *
 * 1. **The eidolon** is modeled as its own derived creature
 *    (`eidolon.ts`/`eidolon-unchained.ts`) with NO archetype hooks into that
 *    model — nothing wires an archetype feature's prose into a change to the
 *    eidolon's subtype, base form, evolution pool, or evolutions. Every
 *    feature that only modifies the EIDOLON is `subsystem`, never `numeric`:
 *    there is no applied target on the summoner's own sheet for any of it.
 * 2. **Life Link, Shield Ally / Greater Shield Ally, and Bond Senses** (the
 *    base class features these archetypes replace or reflavor) are
 *    companion-interaction features — presence/state-gated bonuses or pure
 *    information/HP-sacrifice mechanics with no flat modifier. A feature
 *    that IS a variant of one of these is `situational`; a feature that
 *    merely REPLACES one with an unrelated eidolon ability follows that
 *    ability's own bucket (usually `subsystem`), same split the chained file
 *    draws between e.g. Fused Link (situational) and Animal Focus
 *    (subsystem, replaces shield ally).
 * 3. **Summon monster / gate SLA changes** (list swaps, templates applied to
 *    summoned creatures, losing the SLA outright) are `subsystem` — no
 *    schema field or Change target represents what the SLA summons or
 *    whether it exists.
 * 4. **Ally/companion-only bonuses never count**: a bonus that lands on the
 *    eidolon or a summoned creature is not a number on the SUMMONER's own
 *    sheet, regardless of how flat or unconditional it reads.
 * 5. **Spells-known / bloodline-power grants** have no Change target — a
 *    grant of another class's power package (oracle curses, sorcerer
 *    bloodline powers) is a deferred pick-list/subsystem, same posture as
 *    the chained file's rage-power and oracle-curse entries.
 *
 * Given these five facts, the unchained slice produces ZERO `numeric`
 * entries across all 17 features — every feature lands on the eidolon, the
 * summon SLA, or a cross-class subsystem grant. This was verified by reading
 * each of the 17 features individually, not inferred from a class-level
 * heuristic; see each entry's `note`. No `blocked` entries either: no
 * feature promises an unconditional summoner-sheet number that a missing
 * target or double-count risk keeps out (the one near-miss, Infernal
 * Affinity, names bloodline powers without restating any of their numbers —
 * a subsystem grant, see its entry).
 */

import type {
  ArchetypeFeatureClassificationEntry,
  ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SUMMONER_UNCHAINED_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── summonerUnchained:construct-caller ──
  "summonerUnchained:construct-caller:construct-eidolon:1": {
    archetypeId: "summonerUnchained:construct-caller",
    name: "Construct Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "locks the eidolon to the inevitable subtype and alters its stat block (no Con score, construct bonus HP, DR 5/adamantine instead of DR 5/chaotic at 12th) — all eidolon-only stat-block changes with no engine hook (class note 1)",
  },
  "summonerUnchained:construct-caller:planar-tinkering:3": {
    archetypeId: "summonerUnchained:construct-caller",
    name: "Planar Tinkering",
    level: 3,
    bucket: "subsystem",
    note: "increases the EIDOLON's evolution pool by 1 at 3rd and every 4 levels after 7th (5 total at 19th) — an eidolon evolution-pool change, never a number on the summoner's own sheet (class note 1)",
  },

  // ── summonerUnchained:devil-binder ──
  "summonerUnchained:devil-binder:infernal-affinity:1": {
    archetypeId: "summonerUnchained:devil-binder",
    name: "Infernal Affinity",
    level: 1,
    bucket: "subsystem",
    note: "grants the summoner the infernal sorcerer bloodline's five powers by name (corrupting touch, infernal resistances, hellfire, on dark wings, power of the Pit) — a cross-class power-package grant with no engine hook (class note 5); the vendored text never restates any of the powers' own numbers, so even the passive members have nothing quotable to extract",
  },
  "summonerUnchained:devil-binder:infernal-arcana:1": {
    archetypeId: "summonerUnchained:devil-binder",
    name: "Infernal Arcana",
    level: 1,
    bucket: "subsystem",
    note: "grants the EIDOLON a ladder of 1/day spell-like abilities (3/day at 19th) — ally-only SLA grants, no summoner number (class note 4)",
  },
  "summonerUnchained:devil-binder:infernal-binding:1": {
    archetypeId: "summonerUnchained:devil-binder",
    name: "Infernal Binding",
    level: 1,
    bucket: "subsystem",
    note: "locks the eidolon to the devil subtype, halves its BAB, freezes its attack count, and raises its Cha every 4 levels — all eidolon-only stat changes (class notes 1 and 4)",
  },
  "summonerUnchained:devil-binder:smite-chaos:6": {
    archetypeId: "summonerUnchained:devil-binder",
    name: "Smite Chaos",
    level: 6,
    bucket: "subsystem",
    note: "grants the EIDOLON a Hellknight-style smite chaos, X/day — ally-only activated ability, no summoner number (class note 4); replaces maker's call (per the vendored pairing)",
  },

  // ── summonerUnchained:devil-impostor ──
  "summonerUnchained:devil-impostor:bond-alignment:2": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Bond Alignment",
    level: 2,
    bucket: "subsystem",
    note: "both summoner and eidolon radiate lawful-evil auras to divination spells while within 1,000 ft — a qualitative information effect, no number anywhere; replaces bond senses",
  },
  "summonerUnchained:devil-impostor:deceptive-eidolon:1": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Deceptive Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "fixes the eidolon's appearance/aura as a devil and restricts its evolution choices to its true subtype — eidolon-only appearance/build changes with no engine hook (class note 1)",
  },
  "summonerUnchained:devil-impostor:devil-s-flesh:4": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Devil's Flesh",
    level: 4,
    bucket: "subsystem",
    note: "grants the EIDOLON the skilled (Bluff) and resistance (fire) evolutions and opens the devil-subtype evolution list — eidolon evolution grants, ally-only (class notes 1 and 4); replaces shield ally, but is not a Shield Ally variant, so class note 2's situational posture doesn't apply",
  },
  "summonerUnchained:devil-impostor:devil-s-tongue:12": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Devil's Tongue",
    level: 12,
    bucket: "subsystem",
    note: "the EIDOLON borrows its master's skill ranks for Bluff/Diplomacy/Intimidate — an ally-only skill mechanic, no summoner number (class note 4); replaces greater shield ally, but is not a Shield Ally variant",
  },
  "summonerUnchained:devil-impostor:fiendish-appearance:8": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Fiendish Appearance",
    level: 8,
    bucket: "subsystem",
    note: "activated, duration-limited alter-self-style transformation into the eidolon's form (the borrowed natural attack depends on whatever the eidolon happens to have) — an activated ability with no flat number; replaces transposition",
  },
  "summonerUnchained:devil-impostor:fiendish-summons:1": {
    archetypeId: "summonerUnchained:devil-impostor",
    name: "Fiendish Summons",
    level: 1,
    bucket: "subsystem",
    note: "forces the fiendish template onto creatures summoned via the summon monster SLA — a summon-mechanic change landing on the summoned creature, not the summoner (class notes 3 and 4)",
  },

  // ── summonerUnchained:fey-caller ──
  "summonerUnchained:fey-caller:fey-eidolon:1": {
    archetypeId: "summonerUnchained:fey-caller",
    name: "Fey Eidolon",
    level: 1,
    bucket: "subsystem",
    note: "swaps the eidolon's subtype for Fey (base statistics explicitly unchanged) — an eidolon-only type change with no engine hook (class note 1)",
  },
  "summonerUnchained:fey-caller:nature-s-call:1": {
    archetypeId: "summonerUnchained:fey-caller",
    name: "Nature's Call",
    level: 1,
    bucket: "subsystem",
    note: "the summoning SLA draws from the summon nature's ally lists instead of summon monster — a summon-list swap (class note 3)",
  },

  // ── summonerUnchained:soulbound-summoner ──
  "summonerUnchained:soulbound-summoner:pactbond-curse:1": {
    archetypeId: "summonerUnchained:soulbound-summoner",
    name: "Pactbond Curse",
    level: 1,
    bucket: "subsystem",
    note: "grants an oracle curse selection (using summoner level as oracle level) and ties the eidolon's alignment to the summoner's — a deferred cross-class pick-list plus an eidolon-only change, no flat number (class notes 1 and 5; same posture as chained synthesist's Fused Eidolon)",
  },
  "summonerUnchained:soulbound-summoner:soulbound-life-link:1": {
    archetypeId: "summonerUnchained:soulbound-summoner",
    name: "Soulbound Life Link",
    level: 1,
    bucket: "situational",
    note: "Life Link variant (sacrifice any number of HP with no action, even while the eidolon is dead) — a companion-interaction HP-sacrifice mechanic with no flat modifier (class note 2)",
  },
  "summonerUnchained:soulbound-summoner:weakened-summoning:1": {
    archetypeId: "summonerUnchained:soulbound-summoner",
    name: "Weakened Summoning",
    level: 1,
    bucket: "subsystem",
    note: "removes the summon monster / gate spell-like ability outright — a summon-SLA existence change with no Change target (class note 3)",
  },
};

/**
 * ── SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────
 *
 * Empty this wave — see the file-header notes. None of the 17 vendored
 * `summonerUnchained` archetype features clears the `numeric` bar (every
 * one lands on the eidolon, the summon SLA, or a cross-class subsystem
 * grant, and the hand-verified table in `archetype-effects.ts` has no
 * `summonerUnchained:` keys to defer to either — there is simply no
 * unconditional summoner-sheet number in this slice). Kept as a typed empty
 * object (not omitted) so `index.ts`'s spread and this file's export shape
 * stay identical to every other class file in this directory.
 */
export const SUMMONER_UNCHAINED_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {};
