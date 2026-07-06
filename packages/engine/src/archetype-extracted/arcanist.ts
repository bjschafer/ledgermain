/**
 * Arcanist's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns
 * `ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit —
 * every feature of every vendored arcanist archetype, individually read
 * against `packages/data-pipeline/data/archetype-features.json`) plus an
 * (empty) `ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED`, kept for shape-parity with
 * every other class file so `index.ts`'s aggregator spread pattern doesn't
 * need a special case.
 *
 * **Result: all 11 vendored arcanist archetypes (34 features) classify
 * `subsystem` — zero `numeric` extractions.** This confirms, at the
 * individual-feature level, what the hand-verified table's issue #7 audit
 * already concluded at the archetype level (`archetype-effects.ts`'s
 * "Audited all 11 vendored arcanist archetypes..." comment, School Savant
 * recorded there as the representative no-Change entry): every arcanist
 * archetype reworks the arcane reservoir, arcanist exploits, or
 * spells-known/spell-list subsystems — none of which this engine models via
 * `Change` — rather than granting a flat, unconditional number. An honest
 * all-subsystem classification is a valid result per this wave's brief; no
 * entry was force-fit into `numeric` to avoid an empty extracted table.
 *
 * The most common shapes seen: (1) an activated ability that spends 1+
 * points from the arcane reservoir for a scripted effect (debuff, spell
 * boost, reroll, summon, healing) — a resource + activation the engine
 * doesn't track; (2) a granted arcanist exploit (the exploit subsystem
 * itself has no engine hooks, confirmed by the pilot's round-2 note); (3) a
 * spells-known/spells-prepared/spell-list modification — no per-archetype
 * caster-model hook exists; (4) a player-choice-dependent grant (which
 * element, which bloodline, which card drawn) with no schema field to
 * record the choice, so no single Change could be selected safely even if
 * the underlying numbers were otherwise clean.
 */

import {
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const ARCANIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "arcanist:arcane-tinkerer:manipulate-construct-su:1": {
    archetypeId: "arcanist:arcane-tinkerer",
    name: "Manipulate Construct (Su)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-spend debuff ability (Will save, temporary attack/damage penalty on a construct) — activated resource ability, no Change-shaped number to extract.",
  },
  "arcanist:arcane-tinkerer:break-magic-immunity-su:5": {
    archetypeId: "arcanist:arcane-tinkerer",
    name: "Break Magic Immunity (Su)",
    level: 5,
    bucket: "subsystem",
    note: "grants the arcanist's TARGET an effective spell resistance value (reducing a construct's normal immunity to magic) — not a bonus to the arcanist's own stats, no matching Change target exists for 'set my target's effective SR'.",
  },
  "arcanist:blood-arcanist:bloodline:1": {
    archetypeId: "arcanist:blood-arcanist",
    name: "Bloodline",
    level: 1,
    bucket: "subsystem",
    note: "grafts a full sorcerer bloodline subsystem (bloodline arcana + bloodline powers) onto the arcanist, replacing exploits at 1st/3rd/9th/15th and magical supremacy — same posture as the hand-verified table's Sorcerer of Sleep entry (archetype-effects.ts): the bloodline subsystem itself is hand-authored elsewhere (bloodlines.ts) with no archetype-swap awareness, out of scope for a single feature's Change.",
  },
  "arcanist:brown-fur-transmuter:powerful-change-su:3": {
    archetypeId: "arcanist:brown-fur-transmuter",
    name: "Powerful Change (Su)",
    level: 3,
    bucket: "subsystem",
    note: "reservoir-spend ability that boosts a transmutation SPELL's own ability-score bonus by a further +2 — modifies another spell's effect, not a standing Change on the caster.",
  },
  "arcanist:brown-fur-transmuter:share-transmutation-su:9": {
    archetypeId: "arcanist:brown-fur-transmuter",
    name: "Share Transmutation (Su)",
    level: 9,
    bucket: "subsystem",
    note: "reservoir-spend ability that changes a transmutation spell's range from personal to touch — a casting-mechanic modification, not a Change-shaped bonus.",
  },
  "arcanist:brown-fur-transmuter:transmutation-supremacy-su:20": {
    archetypeId: "arcanist:brown-fur-transmuter",
    name: "Transmutation Supremacy (Su)",
    level: 20,
    bucket: "subsystem",
    note: "extends transmutation spells (as Extend Spell) and improves the two abilities above — casting-mechanic modification, no flat number.",
  },
  "arcanist:eldritch-font:font-of-power:1": {
    archetypeId: "arcanist:eldritch-font",
    name: "Font of Power",
    level: 1,
    bucket: "subsystem",
    note: "reworks spells-known/prepared counts (extra slots, fewer prepared) — spellcasting-model subsystem, no engine hook.",
  },
  "arcanist:eldritch-font:eldritch-surge-su:3": {
    archetypeId: "arcanist:eldritch-font",
    name: "Eldritch Surge (Su)",
    level: 3,
    bucket: "subsystem",
    note: "activated ability that boosts a spell/exploit's CL or DC at the cost of fatigue/exhaustion — resource- and condition-gated, no standing Change.",
  },
  "arcanist:eldritch-font:improved-surge-su:7": {
    archetypeId: "arcanist:eldritch-font",
    name: "Improved Surge (Su)",
    level: 7,
    bucket: "subsystem",
    note: "activated reroll mechanic for an attack/damage roll — not Change-shaped.",
  },
  "arcanist:eldritch-font:greater-surge-su:13": {
    archetypeId: "arcanist:eldritch-font",
    name: "Greater Surge (Su)",
    level: 13,
    bucket: "subsystem",
    note: "activated reroll mechanic forced on a target's saving throw — not Change-shaped.",
  },
  "arcanist:eldritch-font:bottomless-well:20": {
    archetypeId: "arcanist:eldritch-font",
    name: "Bottomless Well",
    level: 20,
    bucket: "subsystem",
    note: "reservoir-refuel mechanic via spending downtime — resource subsystem, no flat number.",
  },
  "arcanist:elemental-master:elemental-focus-su:1": {
    archetypeId: "arcanist:elemental-master",
    name: "Elemental Focus (Su)",
    level: 1,
    bucket: "subsystem",
    note: "extra prepared spell restricted to one chosen element + an opposition-school spell-slot cost — spellcasting-model subsystem.",
  },
  "arcanist:elemental-master:elemental-attack-su:3": {
    archetypeId: "arcanist:elemental-master",
    name: "Elemental Attack (Su)",
    level: 3,
    bucket: "subsystem",
    note: "grants a specific arcanist exploit tied to the chosen element — the arcanist exploit subsystem itself has no engine hooks (per the pilot's round-2 audit).",
  },
  "arcanist:elemental-master:powerful-exploit-su:9": {
    archetypeId: "arcanist:elemental-master",
    name: "Powerful Exploit (Su)",
    level: 9,
    bucket: "subsystem",
    note: "scales the damage of an unmodeled exploit-granted attack — no Change target for exploit damage.",
  },
  "arcanist:elemental-master:greater-elemental-attack-su:11": {
    archetypeId: "arcanist:elemental-master",
    name: "Greater Elemental Attack (Su)",
    level: 11,
    bucket: "subsystem",
    note: "grants another element-tied exploit — same as elemental-attack-su above.",
  },
  "arcanist:elemental-master:elemental-movement-su:15": {
    archetypeId: "arcanist:elemental-master",
    name: "Elemental Movement (Su)",
    level: 15,
    bucket: "subsystem",
    note: "grants one of four different flat movement-speed bonuses depending on the element chosen at 1st level — no schema field records which element was chosen, so the correct Change can't be selected safely.",
  },
  "arcanist:magaambyan-initiate:aura-of-good-ex:1": {
    archetypeId: "arcanist:magaambyan-initiate",
    name: "Aura of Good (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "grants a detect-good-style aura ability — not Change-shaped.",
  },
  "arcanist:magaambyan-initiate:halcyon-spell-lore-su:1": {
    archetypeId: "arcanist:magaambyan-initiate",
    name: "Halcyon Spell Lore (Su)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-spend mechanic to cast off-list spells as prepared — spellcasting-model subsystem.",
  },
  "arcanist:magaambyan-initiate:spell-mastery:5": {
    archetypeId: "arcanist:magaambyan-initiate",
    name: "Spell Mastery",
    level: 5,
    bucket: "subsystem",
    note: "grants Spell Mastery as a bonus feat plus prestige-class-adjacent reservoir-stacking rules — feat/subsystem grant, no flat number.",
  },
  "arcanist:occultist:conjurer-s-focus-sp:1": {
    archetypeId: "arcanist:occultist",
    name: "Conjurer's Focus (Sp)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-spend summon monster spell-like ability with a scaling spell level — activated resource ability.",
  },
  "arcanist:occultist:planar-spells:1": {
    archetypeId: "arcanist:occultist",
    name: "Planar Spells",
    level: 1,
    bucket: "subsystem",
    note: "spell-list additions (planar ally, plane shift) — spellcasting-model subsystem.",
  },
  "arcanist:occultist:planar-contact-sp:7": {
    archetypeId: "arcanist:occultist",
    name: "Planar Contact (Sp)",
    level: 7,
    bucket: "subsystem",
    note: "grants augury/contact other plane spell-like abilities — not Change-shaped.",
  },
  "arcanist:occultist:perfect-summoner:20": {
    archetypeId: "arcanist:occultist",
    name: "Perfect Summoner",
    level: 20,
    bucket: "subsystem",
    note: "removes the reservoir cost of conjurer's focus and extends its duration — modifies an unmodeled resource ability, no flat number.",
  },
  "arcanist:school-savant:school-focus-su:1": {
    archetypeId: "arcanist:school-savant",
    name: "School Focus (Su)",
    level: 1,
    bucket: "subsystem",
    note: "hand-verified in archetype-effects.ts (issue #7) as a no-Change entry — the wizard-arcane-school grant would need a whole new cross-class feature-grant path, out of scope; not duplicated into this file's extracted table.",
  },
  "arcanist:tarot-student:psychic-reader-ex:1": {
    archetypeId: "arcanist:tarot-student",
    name: "Psychic Reader (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "grants a bonus feat (Psychic Sensitivity) and adds three skills to the class-skill list — no Change target exists for 'make skill X a class skill' (that's a structural relationship computed from refData.classes, not a Change).",
  },
  "arcanist:tarot-student:tarot-reservoir-ex:1": {
    archetypeId: "arcanist:tarot-student",
    name: "Tarot Reservoir (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-refill mechanic via a daily ritual, replaces consume spells — resource subsystem.",
  },
  "arcanist:tarot-student:divine-the-mysteries-ex:5": {
    archetypeId: "arcanist:tarot-student",
    name: "Divine the Mysteries (Ex)",
    level: 5,
    bucket: "subsystem",
    note: "expands spells known with divination spells from other class lists — spellcasting-model subsystem.",
  },
  "arcanist:tarot-student:trump-card-su:9": {
    archetypeId: "arcanist:tarot-student",
    name: "Trump Card (Su)",
    level: 9,
    bucket: "subsystem",
    note: "reservoir-spend activated buff/debuff whose effect depends on a random card draw (6 different possible bonuses) — no single Change can represent a randomized, player-target-chosen effect.",
  },
  "arcanist:twilight-sage:consume-life-su:1": {
    archetypeId: "arcanist:twilight-sage",
    name: "Consume Life (Su)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-gain mechanic via a death effect on a helpless creature, replaces consume spells — resource subsystem.",
  },
  "arcanist:twilight-sage:necromatic-focus:1": {
    archetypeId: "arcanist:twilight-sage",
    name: "Necromatic Focus",
    level: 1,
    bucket: "subsystem",
    note: "spell-preparation restriction (must prepare a necromancy spell each level) — no numeric effect.",
  },
  "arcanist:twilight-sage:twilight-barrier-ex:1": {
    archetypeId: "arcanist:twilight-sage",
    name: "Twilight Barrier (Ex)",
    level: 1,
    bucket: "subsystem",
    note: "alters the (unmodeled) arcane barrier exploit's retaliation behavior — exploit subsystem.",
  },
  "arcanist:twilight-sage:twilight-transfer-su:11": {
    archetypeId: "arcanist:twilight-sage",
    name: "Twilight Transfer (Su)",
    level: 11,
    bucket: "subsystem",
    note: "reservoir-spend resurrection-like effect with a death-effect side cost — activated resource ability.",
  },
  "arcanist:twilight-sage:death-s-release-su:20": {
    archetypeId: "arcanist:twilight-sage",
    name: "Death's Release (Su)",
    level: 20,
    bucket: "subsystem",
    note: "grants a post-death spellcasting-as-a-spirit ability — not Change-shaped.",
  },
  "arcanist:white-mage:spontaneous-healing-su:1": {
    archetypeId: "arcanist:white-mage",
    name: "Spontaneous Healing (Su)",
    level: 1,
    bucket: "subsystem",
    note: "reservoir-spend ability to cast cleric cure spells from the arcanist's own slots — spellcasting-model subsystem.",
  },
};

/**
 * No arcanist feature classified `numeric` — see this file's doc comment.
 * Kept as an empty, correctly-typed table so `index.ts`'s per-class
 * import + two-spread pattern needs no special case for an all-subsystem
 * class.
 */
export const ARCANIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {};
