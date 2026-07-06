/**
 * Paladin's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns BOTH of
 * paladin's pipeline artifacts — `PALADIN_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `PALADIN_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) —
 * so a future wave working on a different class never has a reason to touch
 * this file; only `index.ts` (the aggregator) needs one new import + one new
 * spread per class.
 *
 * ── PALADIN_ARCHETYPE_FEATURE_CLASSIFICATION ──────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored paladin archetype (60
 * archetypes, 247 features), read individually and bucketed `numeric` /
 * `situational` / `subsystem` / `blocked` per the rubric in
 * IMPLEMENTATION_PLAN.md's dated #45 pipeline section (same bucket
 * definitions as `archetype-extracted/fighter.ts`'s doc comment — not
 * repeated here). Two paladin-specific composition hazards drove a
 * disproportionate share of the `blocked`/`subsystem` calls this class
 * surfaced, neither of which existed for fighter:
 *
 * 1. **Divine Grace is the only "big four" paladin base feature that's
 *    actually `Change`-shaped.** Of Smite Evil, Lay on Hands, Divine Grace,
 *    and Aura of Courage — the four base features archetypes most often
 *    claim to replace — only Divine Grace carries a real vendored `changes[]`
 *    (`c("@abilities.cha.mod", "allSavingThrows")`, see `class-features.json`
 *    entry `eYuNS8kf9Z3V6kjO`). Smite Evil's and Lay on Hands' numbers come
 *    from hand-authored `tables.ts` functions (`smiteEvilDetail`/
 *    `layOnHandsDice`) applied via name+classTag matching in
 *    `archetypes.ts`/`resources.ts` — NOT the generic `Change`/
 *    `activeArchetypeSwaps` suppression path at all (that matching is
 *    unconditional regardless of any archetype swap, a pre-existing gap, not
 *    fixed here) — and Aura of Courage carries no vendored `changes[]` or
 *    `uses` at all (confirmed via `class-features.json`). So an archetype
 *    feature that AMBIGUOUSLY (no `pairedBaseFeatureUuid`) restates a
 *    Divine-Grace-shaped number (Cha bonus to some or all saves) is the one
 *    genuine "double-count trap" this class has for a `Change`-shaped base
 *    mechanic — `blocked`, per the task's own explicit call-out. Ambiguous
 *    swaps of Smite Evil / Lay on Hands / Aura of Courage can't create the
 *    same trap (nothing `Change`-shaped to double), so those stay
 *    `situational`/`subsystem` on their own content's merits.
 * 2. **Many 20th-level "replaces holy champion" features literally restate
 *    Holy Champion's own two RAW sentences** ("Her DR increases to 10/evil.
 *    Whenever she channels positive energy or uses lay on hands to heal a
 *    creature, she heals the maximum possible amount.") verbatim inside their
 *    own prose, then add an archetype-specific rider. Every one of these is
 *    CLEANLY paired (`pairedBaseFeatureUuid` resolves to Holy Champion's own
 *    uuid `BPRtCoYTMDwsITXJ`), and base Holy Champion itself carries NO
 *    vendored `changes[]` (so there's nothing to double even without
 *    suppression) — the DR 10/evil half is extracted as `numeric` for every
 *    archetype whose prose repeats it (7 of them); archetypes whose 20th-
 *    level feature replaces Holy Champion with something else entirely (no
 *    DR mention) are `subsystem` instead. The "heals the maximum possible
 *    amount" half is never extracted (Lay on Hands/Channel healing amounts
 *    aren't `Change`-shaped in this engine at all — see hazard 1).
 *
 * Two more standing limitations, not paladin-specific traps but worth
 * recording since they suppressed several otherwise-clean numbers:
 *
 * - `chaSkills`/`dexSkills`/etc. (the ability-based skill-GROUP targets) are
 *   listed in `targets.ts`'s `UNAPPLIED_TARGET_LABELS`, not
 *   `APPLIED_TARGETS` — `compute()` never actually folds them into a skill
 *   total (see `oracle-curses.ts`'s Wasting curse, which authors one anyway
 *   for vendored-data fidelity but is honest that it's inert). No paladin
 *   feature needed this target, but it was checked and ruled out for one
 *   candidate — see Black Blood Revelation's cousin note in `oracle.ts`.
 * - `bonusSkillRanks` is listed in `targets.ts`'s `APPLIED_TARGETS`, but
 *   `apps/web/src/model/skills.ts`'s `skillBudget` only ever reads it from
 *   `refData.races[...].changes` — an archetype-authored `bonusSkillRanks`
 *   `Change` would be silently inert (never summed anywhere). This sank two
 *   otherwise-clean "4 + Int skill ranks instead of 2 + Int" numbers
 *   (Faithful Wanderer's Wanderer's Lore, Tortured Crusader's
 *   Self-Sufficient) to `subsystem` — flagged as a process-doc finding in the
 *   wave report rather than silently worked around.
 *
 * Also found: three suspected vendored-data duplicate-text bugs (a single
 * multi-tier ability's prose byte-for-byte repeated across 2-3 separate
 * archetype-feature ids at different levels) — Mind Sword's Touch Treatment
 * (Minor/Moderate/Major, ids at levels 3/12/18 but the shared text itself
 * says "at 3rd... at 9th... at 15th"), Temple Champion's Blessing
 * (Minor/Major, ids at levels 5/11, identical text), and — the one case where
 * this actually mattered for composition safety, since the shared text is a
 * clean `bonusFeats` formula — Holy Tactician's Tactical Acumen (id level 3)
 * / Bonus Teamwork Feat (id level 7), `blocked` rather than double-extracted.
 * None were fixed here (reported, not fixed, per the task's own instruction).
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const PALADIN_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "paladin:banishing-warden:banishing-smite:3": {
    archetypeId: "paladin:banishing-warden",
    name: "Banishing Smite",
    level: 3,
    bucket: "situational",
    note: "conditional on confirming a crit vs. the smite target specifically — same single-target scoping as base Smite Evil",
  },
  "paladin:banishing-warden:smiting-aura:11": {
    archetypeId: "paladin:banishing-warden",
    name: "Smiting Aura",
    level: 11,
    bucket: "subsystem",
    note: "grants allies use of banishing smite via aura of justice (which carries no vendored number) — unrelated ability grant, no exploitable number",
  },
  "paladin:champion-of-the-cascade:flowing-stride:3": {
    archetypeId: "paladin:champion-of-the-cascade",
    name: "Flowing Stride",
    level: 3,
    bucket: "subsystem",
    note: "grants water walk to a lay-on-hands target — unrelated ability, no exploitable number",
  },
  "paladin:champion-of-the-cascade:swiftsurge:3": {
    archetypeId: "paladin:champion-of-the-cascade",
    name: "Swiftsurge",
    level: 3,
    bucket: "situational",
    note: "removes armor-check-penalty on two specific skills — no roll-data path to the character's current ACP to cancel it with a formula",
  },
  "paladin:champion-of-the-cascade:rising-tide:5": {
    archetypeId: "paladin:champion-of-the-cascade",
    name: "Rising Tide",
    level: 5,
    bucket: "subsystem",
    note: "replaces divine bond (no vendored number to lose) with a terrain-shaping utility ability — no exploitable number",
  },
  "paladin:chaos-knight:entropic-touch:2": {
    archetypeId: "paladin:chaos-knight",
    name: "Entropic Touch",
    level: 2,
    bucket: "subsystem",
    note: "activated ally save-reroll ability, resource-gated — no exploitable number",
  },
  "paladin:chaos-knight:blessings-of-the-maelstrom:3": {
    archetypeId: "paladin:chaos-knight",
    name: "Blessings of the Maelstrom",
    level: 3,
    bucket: "situational",
    note: "real per-tier bonuses from a random (1d4) table, delivered to a chosen ally target — randomized + ally-targeting, not expressible",
  },
  "paladin:chaos-knight:aura-of-chaos:14": {
    archetypeId: "paladin:chaos-knight",
    name: "Aura of Chaos",
    level: 14,
    bucket: "subsystem",
    note: "DR-bypass alignment reflavor (self+allies), replaces aura of faith (no vendored number) — no flat number to extract",
  },
  "paladin:chosen-one:bondless:1": {
    archetypeId: "paladin:chosen-one",
    name: "Bondless",
    level: 1,
    bucket: "subsystem",
    note: "removes divine bond entirely, no replacement number",
  },
  "paladin:chosen-one:delayed-grace:1": {
    archetypeId: "paladin:chosen-one",
    name: "Delayed Grace",
    level: 1,
    bucket: "subsystem",
    note: "delays Divine Grace/Smite Evil's own grant LEVEL (2nd/4th instead of 1st/2nd) without changing their formulas — not expressible as a Change; no schema field shifts a base feature's level gate",
  },
  "paladin:chosen-one:divine-emissary:1": {
    archetypeId: "paladin:chosen-one",
    name: "Divine Emissary",
    level: 1,
    bucket: "subsystem",
    note: "grants a familiar — unrelated subsystem, no exploitable number",
  },
  "paladin:chosen-one:religious-mentor:1": {
    archetypeId: "paladin:chosen-one",
    name: "Religious Mentor",
    level: 1,
    bucket: "subsystem",
    note: "familiar-specific Knowledge (religion) rank emulation — unrelated subsystem",
  },
  "paladin:chosen-one:lay-on-paws:2": {
    archetypeId: "paladin:chosen-one",
    name: "Lay on Paws",
    level: 2,
    bucket: "subsystem",
    note: "lets the familiar spend the paladin's lay on hands/channel uses — resource trade; Lay on Hands/Channel aren't Change-shaped in this engine to begin with",
  },
  "paladin:chosen-one:smite-evil:2": {
    archetypeId: "paladin:chosen-one",
    name: "Smite Evil",
    level: 2,
    bucket: "subsystem",
    note: "identical Smite Evil mechanic, just at a shifted grant level (see Delayed Grace) — Smite Evil isn't Change-shaped in this engine (tables.ts smiteEvilDetail, applied via name+classTag matching, not a Change target)",
  },
  "paladin:chosen-one:true-form:7": {
    archetypeId: "paladin:chosen-one",
    name: "True Form",
    level: 7,
    bucket: "subsystem",
    note: "familiar transformation — unrelated subsystem, no exploitable number",
  },
  "paladin:chosen-one:emissary-s-smite:11": {
    archetypeId: "paladin:chosen-one",
    name: "Emissary's Smite",
    level: 11,
    bucket: "subsystem",
    note: "extends smite evil's benefits to the familiar — unrelated grant, no exploitable number (paired to aura of justice, which carries no vendored number either)",
  },
  "paladin:combat-healer-squire:careful-healer:1": {
    archetypeId: "paladin:combat-healer-squire",
    name: "Careful Healer",
    level: 1,
    bucket: "subsystem",
    note: "Heal-skill utility (no AoO) + flat bonus HP on a long-term-care use — not a sheet stat, no Change target for extra Heal-skill healing",
  },
  "paladin:combat-healer-squire:dress-wounds:2": {
    archetypeId: "paladin:combat-healer-squire",
    name: "Dress Wounds",
    level: 2,
    bucket: "subsystem",
    note: "Heal-skill substitute granting temporary HP to one ally — replaces divine grace ambiguously, but this feature itself carries no Divine-Grace-shaped number, so no composition trap; just an unrelated resource-gated ability",
  },
  "paladin:combat-healer-squire:swift-healer:3": {
    archetypeId: "paladin:combat-healer-squire",
    name: "Swift Healer",
    level: 3,
    bucket: "subsystem",
    note: "action-type change to a Heal-skill use, replaces divine health (no vendored number) — no exploitable number",
  },
  "paladin:divine-defender:shared-defense:3": {
    archetypeId: "paladin:divine-defender",
    name: "Shared Defense",
    level: 3,
    bucket: "situational",
    note: "real, cleanly-scaling AC/CMD/save bonus to nearby allies via a lay-on-hands spend — ally-targeting machinery not modeled, same honesty bar as aura reflavors",
  },
  "paladin:divine-defender:divine-bond:5": {
    archetypeId: "paladin:divine-defender",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "armor-bond variant of Divine Bond (item-property choices) — no flat number; Divine Bond itself carries no vendored Change",
  },
  "paladin:divine-guardian:divine-troth:1": {
    archetypeId: "paladin:divine-guardian",
    name: "Divine Troth",
    level: 1,
    bucket: "subsystem",
    note: "replaces detect evil (no vendored number) with a locate-creature utility — unrelated, no exploitable number",
  },
  "paladin:divine-guardian:martial-focus:1": {
    archetypeId: "paladin:divine-guardian",
    name: "Martial Focus",
    level: 1,
    bucket: "subsystem",
    note: "removes spellcasting entirely, no replacement number",
  },
  "paladin:divine-guardian:guarding-hands:2": {
    archetypeId: "paladin:divine-guardian",
    name: "Guarding Hands",
    level: 2,
    bucket: "subsystem",
    note: "changes lay on hands' action economy — Lay on Hands isn't Change-shaped in this engine",
  },
  "paladin:divine-guardian:courageous-defense:3": {
    archetypeId: "paladin:divine-guardian",
    name: "Courageous Defense",
    level: 3,
    bucket: "subsystem",
    note: "Bodyguard/In Harm's Way emulation + narrows aura of courage's radius to self-only (aura of courage carries no vendored number to lose) — no exploitable number",
  },
  "paladin:divine-guardian:bonus-feat:7": {
    archetypeId: "paladin:divine-guardian",
    name: "Bonus Feat",
    level: 7,
    bucket: "numeric",
    note: "restricted-list bonus feats at 7th/10th/13th (max 3), pure additive grant with no paired base-feature slot — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below)",
  },
  "paladin:divine-hunter:precise-shot:1": {
    archetypeId: "paladin:divine-hunter",
    name: "Precise Shot",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth (issue #7, archetype-effects.ts) — bonus feat, no baseline number of its own",
  },
  "paladin:divine-hunter:shared-precision:3": {
    archetypeId: "paladin:divine-hunter",
    name: "Shared Precision",
    level: 3,
    bucket: "situational",
    note: "grants nearby allies the benefit of Precise Shot vs. a hit target — ally-targeting machinery not modeled; replaces aura of courage (no vendored number)",
  },
  "paladin:divine-hunter:divine-bond:5": {
    archetypeId: "paladin:divine-hunter",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "narrows Divine Bond to ranged/thrown weapons + extra properties — no flat number; Divine Bond itself carries no vendored Change",
  },
  "paladin:divine-hunter:distant-mercy:6": {
    archetypeId: "paladin:divine-hunter",
    name: "Distant Mercy",
    level: 6,
    bucket: "subsystem",
    note: "range extension of lay on hands via a resource spend — Lay on Hands isn't Change-shaped",
  },
  "paladin:divine-hunter:aura-of-care:8": {
    archetypeId: "paladin:divine-hunter",
    name: "Aura of Care",
    level: 8,
    bucket: "subsystem",
    note: "removes ally-cover between nearby allies — a positional rule, not a sheet stat; replaces aura of resolve (no vendored number)",
  },
  "paladin:divine-hunter:hunter-s-blessing:11": {
    archetypeId: "paladin:divine-hunter",
    name: "Hunter's Blessing",
    level: 11,
    bucket: "subsystem",
    note: "grants allies temporary named feats via a smite-evil spend — unrelated grant, replaces aura of justice (no vendored number)",
  },
  "paladin:divine-hunter:righteous-hunter:14": {
    archetypeId: "paladin:divine-hunter",
    name: "Righteous Hunter",
    level: 14,
    bucket: "subsystem",
    note: "DR-bypass alignment reflavor for ranged attacks (self+allies) — no flat number",
  },
  "paladin:dusk-knight:shadow-smite:1": {
    archetypeId: "paladin:dusk-knight",
    name: "Shadow Smite",
    level: 1,
    bucket: "situational",
    note: "concealment vs. the smite target specifically — single-target scoping, same bar as base Smite Evil",
  },
  "paladin:dusk-knight:illuminating-zeal:4": {
    archetypeId: "paladin:dusk-knight",
    name: "Illuminating Zeal",
    level: 4,
    bucket: "subsystem",
    note: "grants darkvision via a lay-on-hands spend — a sense, not a sheet stat this engine models",
  },
  "paladin:dusk-knight:shadow-s-embrace:5": {
    archetypeId: "paladin:dusk-knight",
    name: "Shadow's Embrace",
    level: 5,
    bucket: "subsystem",
    note: "grants named bonus feats (Blind-Fight/Improved Blind-Fight) + darkvision — named-feat grants aren't a bonusFeats count, and darkvision isn't a sheet stat",
  },
  "paladin:dusk-knight:cloak-of-shadow:8": {
    archetypeId: "paladin:dusk-knight",
    name: "Cloak of Shadow",
    level: 8,
    bucket: "situational",
    note: "Stealth bonus scoped to dim-light/darkness — a lighting condition the engine can't check",
  },
  "paladin:dusk-knight:clouding-smite:11": {
    archetypeId: "paladin:dusk-knight",
    name: "Clouding Smite",
    level: 11,
    bucket: "subsystem",
    note: "reduces the smite TARGET's darkvision — affects the enemy, not the paladin; no sheet stat",
  },
  "paladin:empyreal-knight:voices-of-the-spheres:2": {
    archetypeId: "paladin:empyreal-knight",
    name: "Voices of the Spheres",
    level: 2,
    bucket: "subsystem",
    note: "bonus language — ambiguous swap of divine grace, but this feature itself carries no Divine-Grace-shaped number, so no composition trap; just an unrelated grant",
  },
  "paladin:empyreal-knight:celestial-heart:3": {
    archetypeId: "paladin:empyreal-knight",
    name: "Celestial Heart",
    level: 3,
    bucket: "numeric",
    note: "unconditional acid/cold/electricity resistance, scaling at 9th — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below); 6th/12th/15th/18th extras (poison-save bonus, petrification immunity, truespeech, an activated ally aura) not modeled",
  },
  "paladin:empyreal-knight:celestial-ally:4": {
    archetypeId: "paladin:empyreal-knight",
    name: "Celestial Ally",
    level: 4,
    bucket: "subsystem",
    note: "summon-monster-as-ally ability replacing lay on hands + channel positive energy — resource trade/unrelated grant; neither base feature is Change-shaped, and deriveResourcePools has no archetype-swap awareness at all (pre-existing gap, not fixed here) so their pools would keep showing regardless",
  },
  "paladin:empyreal-knight:divine-bond:5": {
    archetypeId: "paladin:empyreal-knight",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "mount-only Divine Bond variant + celestial template on the mount — no flat number",
  },
  "paladin:empyreal-knight:empyreal-champion:20": {
    archetypeId: "paladin:empyreal-knight",
    name: "Empyreal Champion",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; outsider type change, flight, darkvision, and max-healing extras not modeled",
  },
  "paladin:faithful-wanderer:hidden-aura:1": {
    archetypeId: "paladin:faithful-wanderer",
    name: "Hidden Aura",
    level: 1,
    bucket: "subsystem",
    note: "suppresses alignment auras' external visibility — narrative, no number",
  },
  "paladin:faithful-wanderer:stalk-evil:1": {
    archetypeId: "paladin:faithful-wanderer",
    name: "Stalk Evil",
    level: 1,
    bucket: "situational",
    note: "real, cleanly-scaling skill/attack/damage bonus, but scoped to specific enemy types (evil outsiders, later undead/evil dragons) — same 'specific enemy state' exclusion as favored-enemy-shaped bonuses",
  },
  "paladin:faithful-wanderer:wanderer-s-lore:1": {
    archetypeId: "paladin:faithful-wanderer",
    name: "Wanderer's Lore",
    level: 1,
    bucket: "subsystem",
    note: "class-skill swap + doubles skill ranks/level to 4+Int — bonusSkillRanks is only ever read from refData.races[...].changes by apps/web's skillBudget, never from archetype features, so an archetype-authored bonusSkillRanks Change would be silently inert (process-doc finding, not fixed here)",
  },
  "paladin:faithful-wanderer:champion-s-bond:5": {
    archetypeId: "paladin:faithful-wanderer",
    name: "Champion's Bond",
    level: 5,
    bucket: "situational",
    note: "20th-level capstone perks (DR to 5/-, banishment-on-crit, max healing) all gated on 'whenever her divine bond is active' — an activated-buff state with no roll-data check",
  },
  "paladin:forest-preserver:favored-terrain:3": {
    archetypeId: "paladin:forest-preserver",
    name: "Favored Terrain",
    level: 3,
    bucket: "subsystem",
    note: "ranger favored-terrain reflavor — favored terrain isn't modeled anywhere in this engine",
  },
  "paladin:forest-preserver:woodland-stride:3": {
    archetypeId: "paladin:forest-preserver",
    name: "Woodland Stride",
    level: 3,
    bucket: "subsystem",
    note: "movement-rule grant, no number",
  },
  "paladin:forest-preserver:sacred-botany:4": {
    archetypeId: "paladin:forest-preserver",
    name: "Sacred Botany",
    level: 4,
    bucket: "subsystem",
    note: "spell-list addition + situational caster-level bump in favored terrain — no flat number",
  },
  "paladin:forest-preserver:fireproof-aura:8": {
    archetypeId: "paladin:forest-preserver",
    name: "Fireproof Aura",
    level: 8,
    bucket: "situational",
    note: "ally fire-resistance/save aura + counterspell via a lay-on-hands spend — ally-targeting + resource-gated",
  },
  "paladin:forest-preserver:sacred-grove:11": {
    archetypeId: "paladin:forest-preserver",
    name: "Sacred Grove",
    level: 11,
    bucket: "situational",
    note: "ally attack/damage/save buff aura via a smite-evil spend, area-conditional (requires a living tree)",
  },
  "paladin:forest-preserver:aura-of-preservation:14": {
    archetypeId: "paladin:forest-preserver",
    name: "Aura of Preservation",
    level: 14,
    bucket: "situational",
    note: "grants nearby animals/plants spell resistance — ally-targeting machinery not modeled",
  },
  "paladin:forgefather-s-seeker:detect-construct:1": {
    archetypeId: "paladin:forgefather-s-seeker",
    name: "Detect Construct",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to constructs — narrative utility, no number",
  },
  "paladin:forgefather-s-seeker:smite-construct:1": {
    archetypeId: "paladin:forgefather-s-seeker",
    name: "Smite Construct",
    level: 1,
    bucket: "situational",
    note: "Smite Evil reflavor scoped to constructs — same single-target scoping as base Smite Evil",
  },
  "paladin:forgefather-s-seeker:aura-of-destruction:11": {
    archetypeId: "paladin:forgefather-s-seeker",
    name: "Aura of Destruction",
    level: 11,
    bucket: "subsystem",
    note: "grants allies smite-construct via aura of justice (no vendored number) — unrelated grant",
  },
  "paladin:forgefather-s-seeker:aura-of-unmaking:14": {
    archetypeId: "paladin:forgefather-s-seeker",
    name: "Aura of Unmaking",
    level: 14,
    bucket: "subsystem",
    note: "DR-bypass (adamantine) reflavor for self+allies — no flat number",
  },
  "paladin:forgefather-s-seeker:forgefather-s-champion:20": {
    archetypeId: "paladin:forgefather-s-seeker",
    name: "Forgefather's Champion",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; destroy-construct-on-hit and max-healing extras not modeled",
  },
  "paladin:ghost-hunter:ghostly-smite:1": {
    archetypeId: "paladin:ghost-hunter",
    name: "Ghostly Smite",
    level: 1,
    bucket: "situational",
    note: "alters smite evil's DR-bypass/bonus-damage rules — still single-target scoped like base Smite Evil",
  },
  "paladin:ghost-hunter:exorcise-possession:6": {
    archetypeId: "paladin:ghost-hunter",
    name: "Exorcise Possession",
    level: 6,
    bucket: "subsystem",
    note: "lay-on-hands-spend save-reroll utility — resource trade, no flat number",
  },
  "paladin:ghost-hunter:speak-to-the-restless:9": {
    archetypeId: "paladin:ghost-hunter",
    name: "Speak to the Restless",
    level: 9,
    bucket: "subsystem",
    note: "communication utility ability, resource-gated",
  },
  "paladin:gray-paladin:smite-evil:2": {
    archetypeId: "paladin:gray-paladin",
    name: "Smite Evil",
    level: 2,
    bucket: "subsystem",
    note: "identical base Smite Evil text at the normal grant level — nothing to extract; Smite Evil isn't Change-shaped anyway",
  },
  "paladin:gray-paladin:enhanced-health:3": {
    archetypeId: "paladin:gray-paladin",
    name: "Enhanced Health",
    level: 3,
    bucket: "situational",
    note: "real +4 bonus, but scoped to poison/disease saves specifically, not general saves",
  },
  "paladin:gray-paladin:smite-foe:4": {
    archetypeId: "paladin:gray-paladin",
    name: "Smite Foe",
    level: 4,
    bucket: "subsystem",
    note: "resource-spend rule allowing a smite vs. a nonevil creature — no new number",
  },
  "paladin:gray-paladin:aura-of-subtlety:11": {
    archetypeId: "paladin:gray-paladin",
    name: "Aura of Subtlety",
    level: 11,
    bucket: "situational",
    note: "self+ally save bonus vs. divinations specifically — narrow scope + ally-targeting",
  },
  "paladin:holy-guide:favored-terrain:3": {
    archetypeId: "paladin:holy-guide",
    name: "Favored Terrain",
    level: 3,
    bucket: "subsystem",
    note: "ranger favored-terrain reflavor of a mercy — favored terrain isn't modeled anywhere in this engine",
  },
  "paladin:holy-gun:have-gun:1": {
    archetypeId: "paladin:holy-gun",
    name: "Have Gun",
    level: 1,
    bucket: "subsystem",
    note: "gunslinger feat/gear grant, replaces detect evil (no vendored number) — unrelated",
  },
  "paladin:holy-gun:weapon-and-armor-proficiency:1": {
    archetypeId: "paladin:holy-gun",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency reprint (adds firearms)",
  },
  "paladin:holy-gun:divine-deed:2": {
    archetypeId: "paladin:holy-gun",
    name: "Divine Deed",
    level: 2,
    bucket: "subsystem",
    note: "grit/deed subsystem, not modeled",
  },
  "paladin:holy-gun:divine-bond:5": {
    archetypeId: "paladin:holy-gun",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "firearm-restricted Divine Bond variant, no flat number",
  },
  "paladin:holy-gun:holy-grit:11": {
    archetypeId: "paladin:holy-gun",
    name: "Holy Grit",
    level: 11,
    bucket: "subsystem",
    note: "grit-pool/deed grant, new subsystem",
  },
  "paladin:holy-gun:gunslinger-deed:14": {
    archetypeId: "paladin:holy-gun",
    name: "Gunslinger Deed",
    level: 14,
    bucket: "subsystem",
    note: "more grit/deeds, same subsystem as Holy Grit",
  },
  "paladin:holy-gun:holy-slinger:20": {
    archetypeId: "paladin:holy-gun",
    name: "Holy Slinger",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; banishment-via-smiting-shot and max-healing extras not modeled",
  },
  "paladin:holy-tactician:weal-s-champion:1": {
    archetypeId: "paladin:holy-tactician",
    name: "Weal's Champion",
    level: 1,
    bucket: "situational",
    note: "Smite-Evil-shaped self/ally attack-damage buff, target- and duration-scoped, replaces smite evil",
  },
  "paladin:holy-tactician:battlefield-presence:3": {
    archetypeId: "paladin:holy-tactician",
    name: "Battlefield Presence",
    level: 3,
    bucket: "subsystem",
    note: "grants a shared teamwork feat to allies — unrelated grant, replaces aura of courage (no vendored number)",
  },
  "paladin:holy-tactician:tactical-acumen:3": {
    archetypeId: "paladin:holy-tactician",
    name: "Tactical Acumen",
    level: 3,
    bucket: "blocked",
    note: "blocked: suspected vendored duplicate — this id's description is byte-identical to Bonus Teamwork Feat (level 7)'s, describing the SAME bonus-teamwork-feat-every-4-levels cadence twice under two different ids/levels. The underlying formula is clean and bonusFeats-shaped, but extracting it under both ids would double-count once a holy tactician reaches 7th level and both entries are simultaneously active archetype features. Reported, not fixed.",
  },
  "paladin:holy-tactician:bonus-teamwork-feat:7": {
    archetypeId: "paladin:holy-tactician",
    name: "Bonus Teamwork Feat",
    level: 7,
    bucket: "blocked",
    note: "blocked: suspected vendored duplicate — see Tactical Acumen (level 3)'s entry; same reasoning, mirrored id.",
  },
  "paladin:holy-tactician:guide-the-battle:8": {
    archetypeId: "paladin:holy-tactician",
    name: "Guide the Battle",
    level: 8,
    bucket: "subsystem",
    note: "grants allies a free 5-ft move — a positional rule, not a stat; replaces aura of resolve (no vendored number)",
  },
  "paladin:holy-tactician:weal-s-wrath:11": {
    archetypeId: "paladin:holy-tactician",
    name: "Weal's Wrath",
    level: 11,
    bucket: "situational",
    note: "extends weal's champion's duration — still target-scoped like the base ability",
  },
  "paladin:holy-tactician:masterful-presence:20": {
    archetypeId: "paladin:holy-tactician",
    name: "Masterful Presence",
    level: 20,
    bucket: "subsystem",
    note: "per-ally custom feat sharing + auto-confirm crit vs. weal's-champion-affected targets — no flat number; replaces holy champion but doesn't restate its DR text",
  },
  "paladin:hospitaler:smite-evil:1": {
    archetypeId: "paladin:hospitaler",
    name: "Smite Evil",
    level: 1,
    bucket: "subsystem",
    note: "shifts the smite-evil extra-use cadence to 7th/every 6 levels — not expressible, Smite Evil isn't Change-shaped in this engine",
  },
  "paladin:hospitaler:channel-positive-energy:4": {
    archetypeId: "paladin:hospitaler",
    name: "Channel Positive Energy",
    level: 4,
    bucket: "subsystem",
    note: "Channel Energy reflavor with its own resource economy (no lay-on-hands cost) — channelEnergyDetail (tables.ts) is only wired for classTag==='cleric' in resources.ts, so a paladin's channel energy never gets a computed dice/DC detail today, archetype or not; a pre-existing base-class gap, not fixable from a table entry",
  },
  "paladin:hospitaler:aura-of-healing:11": {
    archetypeId: "paladin:hospitaler",
    name: "Aura of Healing",
    level: 11,
    bucket: "situational",
    note: "ally-targeting stabilize/heal/save-vs-affliction aura via a channel-energy spend",
  },
  "paladin:hunting-paladin:detect-evil:1": {
    archetypeId: "paladin:hunting-paladin",
    name: "Detect Evil",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to tracked-creature alignment — narrative, no number",
  },
  "paladin:hunting-paladin:hunt-evil:1": {
    archetypeId: "paladin:hunting-paladin",
    name: "Hunt Evil",
    level: 1,
    bucket: "situational",
    note: "real Survival/Perception/Stealth bonus + uncanny dodge, but scoped to a single declared hunted target — same 'specific enemy state' exclusion as favored-enemy bonuses",
  },
  "paladin:hunting-paladin:smite-evil:4": {
    archetypeId: "paladin:hunting-paladin",
    name: "Smite Evil",
    level: 4,
    bucket: "subsystem",
    note: "shifts smite evil's grant level/offset — not expressible, Smite Evil isn't Change-shaped",
  },
  "paladin:hunting-paladin:divine-bond:5": {
    archetypeId: "paladin:hunting-paladin",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "adds ranger-spell-list access to the Divine Bond slot — spell-list addition, no flat number",
  },
  "paladin:hunting-paladin:tireless-aura:8": {
    archetypeId: "paladin:hunting-paladin",
    name: "Tireless Aura",
    level: 8,
    bucket: "situational",
    note: "self+ally fatigue/sleep immunity/save bonus aura — ally-targeting machinery not modeled",
  },
  "paladin:invigorator:bestow-hope:1": {
    archetypeId: "paladin:invigorator",
    name: "Bestow Hope",
    level: 1,
    bucket: "situational",
    note: "real, cleanly-scaling DR to self+chosen allies, but activated/toggled per combat with a re-chosen ally list each activation — the engine has no toggle mechanism for an activated buff like this (same bar as Archaeologist's Luck)",
  },
  "paladin:invigorator:holy-fount:11": {
    archetypeId: "paladin:invigorator",
    name: "Holy Fount",
    level: 11,
    bucket: "situational",
    note: "ally fast-healing aura via a resource spend — ally-targeting + activated",
  },
  "paladin:invigorator:champion-of-life:20": {
    archetypeId: "paladin:invigorator",
    name: "Champion of Life",
    level: 20,
    bucket: "subsystem",
    note: "breath-of-life spell-like ability, resource-gated — no flat number; replaces holy champion but doesn't restate its DR text",
  },
  "paladin:iomedaen-enforcer:detect-chaos:1": {
    archetypeId: "paladin:iomedaen-enforcer",
    name: "Detect Chaos",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to chaos — narrative, no number",
  },
  "paladin:iomedaen-enforcer:smite-chaos:1": {
    archetypeId: "paladin:iomedaen-enforcer",
    name: "Smite Chaos",
    level: 1,
    bucket: "situational",
    note: "Smite Evil reflavor scoped to chaotic-aligned creatures — same single-target scoping as base Smite Evil",
  },
  "paladin:iomedaen-enforcer:aura-of-order:14": {
    archetypeId: "paladin:iomedaen-enforcer",
    name: "Aura of Order",
    level: 14,
    bucket: "subsystem",
    note: "DR-bypass alignment reflavor (self+allies), no flat number",
  },
  "paladin:iomedaen-enforcer:armor-of-law:17": {
    archetypeId: "paladin:iomedaen-enforcer",
    name: "Armor of Law",
    level: 17,
    bucket: "subsystem",
    note: "retargets an existing DR source's bypass type from evil to chaos — a qualifier swap, not a new number; and the base DR sources it retargets (Aura of Righteousness/Holy Champion) aren't modeled at the base-class level either",
  },
  "paladin:iroran-paladin:aura-of-law:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Aura of Law",
    level: 1,
    bucket: "subsystem",
    note: "Aura of Good reflavor — aura 'power' isn't a sheet stat, replaces aura of good (no vendored number)",
  },
  "paladin:iroran-paladin:confident-defense:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Confident Defense",
    level: 1,
    bucket: "situational",
    note: "suspected vendored-data issue: prose reads 'adds 1 point of Charisma bonus per class level to her Dexterity bonus to AC', which taken literally is an unbounded per-level AC bonus — too ambiguous/risky to guess a formula for; not modeled",
  },
  "paladin:iroran-paladin:personal-trial:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Personal Trial",
    level: 1,
    bucket: "situational",
    note: "Smite-Evil-shaped insight bonus (attack/damage/AC/saves), single-target scoped, replaces smite evil",
  },
  "paladin:iroran-paladin:sense-perfection:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Sense Perfection",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to ki-pool detection, replaces detect evil (no vendored number) — unrelated",
  },
  "paladin:iroran-paladin:unarmed-strike:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants Improved Unarmed Strike + monk unarmed-damage-die emulation — a die-size progression, not a flat Change target",
  },
  "paladin:iroran-paladin:weapon-and-armor-proficiency:1": {
    archetypeId: "paladin:iroran-paladin",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency reprint (light armor only)",
  },
  "paladin:iroran-paladin:aura-of-excellence:3": {
    archetypeId: "paladin:iroran-paladin",
    name: "Aura of Excellence",
    level: 3,
    bucket: "subsystem",
    note: "reroll-immunity + ally reroll-improvement — no flat number; replaces aura of courage (no vendored number)",
  },
  "paladin:iroran-paladin:ki-pool:4": {
    archetypeId: "paladin:iroran-paladin",
    name: "Ki Pool",
    level: 4,
    bucket: "subsystem",
    note: "new ki-pool resource + DR-ignore rider on personal trial, replaces channel positive energy (see Hospitaler's channel-positive-energy finding — not hand-tabled for paladin regardless)",
  },
  "paladin:iroran-paladin:divine-body:5": {
    archetypeId: "paladin:iroran-paladin",
    name: "Divine Body",
    level: 5,
    bucket: "subsystem",
    note: "restricts Divine Bond to enhancing the unarmed strike only — no flat number",
  },
  "paladin:iroran-paladin:aura-of-perfection:11": {
    archetypeId: "paladin:iroran-paladin",
    name: "Aura of Perfection",
    level: 11,
    bucket: "subsystem",
    note: "reroll-improvement mechanic, replaces aura of justice (no vendored number) — no flat number",
  },
  "paladin:knight-of-coins:eye-for-forgeries:1": {
    archetypeId: "paladin:knight-of-coins",
    name: "Eye for Forgeries",
    level: 1,
    bucket: "subsystem",
    note: "detect-magic-on-an-item utility, narrative",
  },
  "paladin:knight-of-coins:blessing-of-prosperity:3": {
    archetypeId: "paladin:knight-of-coins",
    name: "Blessing of Prosperity",
    level: 3,
    bucket: "situational",
    note: "real, player-chosen sacred bonuses from a table via a lay-on-hands spend — choice-gated + resource-gated",
  },
  "paladin:kraken-slayer:smite-deepest-evil:1": {
    archetypeId: "paladin:kraken-slayer",
    name: "Smite Deepest Evil",
    level: 1,
    bucket: "situational",
    note: "Smite Evil reflavor scoped to aquatic/water-subtype evil creatures — same single-target scoping as base Smite Evil",
  },
  "paladin:kraken-slayer:divine-immunity:3": {
    archetypeId: "paladin:kraken-slayer",
    name: "Divine Immunity",
    level: 3,
    bucket: "subsystem",
    note: "poison/disease immunity vs. aquatic-creature attacks — an immunity, not a number",
  },
  "paladin:kraken-slayer:divine-bond:5": {
    archetypeId: "paladin:kraken-slayer",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "weapon-property-list/mount-restriction changes to Divine Bond, no flat number",
  },
  "paladin:kraken-slayer:aura-of-elusion:14": {
    archetypeId: "paladin:kraken-slayer",
    name: "Aura of Elusion",
    level: 14,
    bucket: "numeric",
    note: "the general Escape Artist half is unconditional and self-scoped — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below); the grapple-specific CMB/CMD half and the halved ally-facing bonus are excluded (maneuver-specific + ally-targeting)",
  },
  "paladin:martyr:aura-mastery:1": {
    archetypeId: "paladin:martyr",
    name: "Aura Mastery",
    level: 1,
    bucket: "subsystem",
    note: "widens 3 auras' radius and drops their fear/charm/compulsion immunity — modifies AREA, not a number; those base auras carry no vendored Change to begin with",
  },
  "paladin:martyr:stigmata:1": {
    archetypeId: "paladin:martyr",
    name: "Stigmata",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance emulation via self bleed damage, resource-gated activated ability",
  },
  "paladin:martyr:see-no-evil-hear-no-evil:2": {
    archetypeId: "paladin:martyr",
    name: "See No Evil, Hear No Evil",
    level: 2,
    bucket: "situational",
    note: "self+ally save bonus vs. bardic performance/sonic/language-dependent/gaze — narrow scope + ally-targeting",
  },
  "paladin:martyr:aura-of-health:3": {
    archetypeId: "paladin:martyr",
    name: "Aura of Health",
    level: 3,
    bucket: "situational",
    note: "self+ally save bonus vs. disease specifically — narrow scope + ally-targeting",
  },
  "paladin:martyr:martyr-s-mercy:3": {
    archetypeId: "paladin:martyr",
    name: "Martyr's Mercy",
    level: 3,
    bucket: "subsystem",
    note: "mercy-sharing/condition-transfer mechanic on lay on hands — resource trade, no flat number",
  },
  "paladin:mind-sword:mind-arsenal:2": {
    archetypeId: "paladin:mind-sword",
    name: "Mind Arsenal",
    level: 2,
    bucket: "subsystem",
    note: "telekinetic-attack ability replacing lay on hands — Lay on Hands isn't Change-shaped",
  },
  "paladin:mind-sword:touch-treatment-minor:3": {
    archetypeId: "paladin:mind-sword",
    name: "Touch Treatment (Minor)",
    level: 3,
    bucket: "subsystem",
    note: "condition-removal utility replacing a mercy — no flat number. Suspected vendored duplicate: this id's description is byte-identical to Touch Treatment (Moderate)/(Major)'s (levels 12/18) — a single multi-tier ability (3rd/9th/15th per its own text) split across 3 mismatched-level ids. Not itself Change-shaped either way, so no double-count risk; reported, not fixed.",
  },
  "paladin:mind-sword:spells:4": {
    archetypeId: "paladin:mind-sword",
    name: "Spells",
    level: 4,
    bucket: "subsystem",
    note: "adds psychic spells to the paladin spell list, replaces channel positive energy — spell-list addition, no flat number",
  },
  "paladin:mind-sword:touch-treatment-moderate:12": {
    archetypeId: "paladin:mind-sword",
    name: "Touch Treatment (Moderate)",
    level: 12,
    bucket: "subsystem",
    note: "same ability as Touch Treatment (Minor) — see that entry's vendored-duplicate note",
  },
  "paladin:mind-sword:touch-treatment-major:18": {
    archetypeId: "paladin:mind-sword",
    name: "Touch Treatment (Major)",
    level: 18,
    bucket: "subsystem",
    note: "same ability as Touch Treatment (Minor) — see that entry's vendored-duplicate note",
  },
  "paladin:oath-against-chaos:detect-chaos:1": {
    archetypeId: "paladin:oath-against-chaos",
    name: "Detect Chaos",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to chaos, replaces detect evil (no vendored number)",
  },
  "paladin:oath-against-chaos:smite-chaos:1": {
    archetypeId: "paladin:oath-against-chaos",
    name: "Smite Chaos",
    level: 1,
    bucket: "situational",
    note: "Smite Evil reflavor to chaotic alignment, replaces smite evil — same single-target scoping as base Smite Evil",
  },
  "paladin:oath-against-chaos:order-of-good:4": {
    archetypeId: "paladin:oath-against-chaos",
    name: "Order of Good",
    level: 4,
    bucket: "subsystem",
    note: "lay-on-hands spend to smite evil instead of chaos — resource trade, replaces channel positive energy",
  },
  "paladin:oath-against-corruption:aura-of-purity:3": {
    archetypeId: "paladin:oath-against-corruption",
    name: "Aura of Purity",
    level: 3,
    bucket: "situational",
    note: "self+ally save bonus vs. aberration spells — narrow scope + ally-targeting, replaces aura of courage (no vendored number)",
  },
  "paladin:oath-against-corruption:cleansing-flame:11": {
    archetypeId: "paladin:oath-against-corruption",
    name: "Cleansing Flame",
    level: 11,
    bucket: "situational",
    note: "weapon-attack-penalty-to-aberrations aura via a smite-evil spend, replaces aura of justice (no vendored number)",
  },
  "paladin:oath-against-corruption:cast-into-the-void:20": {
    archetypeId: "paladin:oath-against-corruption",
    name: "Cast into the Void",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; banishment-vs-aberration-on-smite and max-healing extras not modeled",
  },
  "paladin:oath-against-fiends:anchoring-aura:8": {
    archetypeId: "paladin:oath-against-fiends",
    name: "Anchoring Aura",
    level: 8,
    bucket: "situational",
    note: "dimensional-anchor aura/smite-spend ability vs. evil outsiders — enemy-type scoped + area/resource-gated, replaces aura of resolve (no vendored number)",
  },
  "paladin:oath-against-fiends:holy-vessel:9": {
    archetypeId: "paladin:oath-against-fiends",
    name: "Holy Vessel",
    level: 9,
    bucket: "subsystem",
    note: "redistributes Divine Bond's enhancement bonus across armor/shield too — no new flat number, replaces the 9th-level mercy",
  },
  "paladin:oath-against-grotesquery:beauty-unyielding:3": {
    archetypeId: "paladin:oath-against-grotesquery",
    name: "Beauty Unyielding",
    level: 3,
    bucket: "situational",
    note: "spell resistance scoped to non-harmless transmutation only (not general SR, so the spellResist target can't safely be used) + a Cha-damage-reduction rider with no Change target; replaces divine health (no vendored number)",
  },
  "paladin:oath-against-grotesquery:restore-true-beauty:14": {
    archetypeId: "paladin:oath-against-grotesquery",
    name: "Restore True Beauty",
    level: 14,
    bucket: "subsystem",
    note: "dispel/restoration via a lay-on-hands spend, resource trade, replaces aura of faith",
  },
  "paladin:oath-against-savagery:holy-reach:2": {
    archetypeId: "paladin:oath-against-savagery",
    name: "Holy Reach",
    level: 2,
    bucket: "subsystem",
    note: "reach extension via a smite-evil spend — ambiguous swap of divine grace, but this feature itself carries no Divine-Grace-shaped number, so no composition trap; reach isn't a Change target either way",
  },
  "paladin:oath-against-savagery:hordebreaker:11": {
    archetypeId: "paladin:oath-against-savagery",
    name: "Hordebreaker",
    level: 11,
    bucket: "situational",
    note: "extra-attack-of-opportunity bonus scoped to evil humanoids — enemy-type scoped, replaces aura of justice (no vendored number)",
  },
  "paladin:oath-against-the-whispering-way:aura-against-necromancy:8": {
    archetypeId: "paladin:oath-against-the-whispering-way",
    name: "Aura against Necromancy",
    level: 8,
    bucket: "situational",
    note: "self+ally save bonus vs. necromancy — narrow scope + ally-targeting, replaces aura of resolve (no vendored number)",
  },
  "paladin:oath-against-the-wyrm:breath-evasion:4": {
    archetypeId: "paladin:oath-against-the-wyrm",
    name: "Breath Evasion",
    level: 4,
    bucket: "subsystem",
    note: "evasion vs. dragon breath weapons specifically — a conditional save-mechanic rider, not a flat Change; replaces channel positive energy",
  },
  "paladin:oath-against-the-wyrm:divine-bond:5": {
    archetypeId: "paladin:oath-against-the-wyrm",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "weapon-property-list changes to Divine Bond (bane vs. dragons), no flat number",
  },
  "paladin:oath-against-the-wyrm:dragon-slaying-strike:20": {
    archetypeId: "paladin:oath-against-the-wyrm",
    name: "Dragon-Slaying Strike",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; holy-word-vs-dragon-on-smite and max-healing extras not modeled",
  },
  "paladin:oath-against-undeath:detect-undead:1": {
    archetypeId: "paladin:oath-against-undeath",
    name: "Detect Undead",
    level: 1,
    bucket: "subsystem",
    note: "Detect Evil reflavor to undead, replaces detect evil (no vendored number)",
  },
  "paladin:oath-against-undeath:ghost-touch-aura:3": {
    archetypeId: "paladin:oath-against-undeath",
    name: "Ghost Touch Aura",
    level: 3,
    bucket: "subsystem",
    note: "armor/shield ghost-touch property grant — item-property emulation, no flat number, replaces the 3rd/9th-level mercies",
  },
  "paladin:oath-against-undeath:aura-of-life:8": {
    archetypeId: "paladin:oath-against-undeath",
    name: "Aura of Life",
    level: 8,
    bucket: "situational",
    note: "self+ally save bonus vs. negative levels — narrow scope + ally-targeting, replaces aura of resolve (no vendored number)",
  },
  "paladin:oath-against-undeath:superior-channeler:11": {
    archetypeId: "paladin:oath-against-undeath",
    name: "Superior Channeler",
    level: 11,
    bucket: "subsystem",
    note: "halves the lay-on-hands cost of channeling vs. undead — a resource-cost change, not a flat number, replaces aura of justice",
  },
  "paladin:oath-of-charity:charitable-hands:2": {
    archetypeId: "paladin:oath-of-charity",
    name: "Charitable Hands",
    level: 2,
    bucket: "subsystem",
    note: "reweights lay on hands' self/ally healing percentages — Lay on Hands isn't Change-shaped",
  },
  "paladin:oath-of-charity:charitable-mercy:5": {
    archetypeId: "paladin:oath-of-charity",
    name: "Charitable Mercy",
    level: 5,
    bucket: "subsystem",
    note: "daily mercy re-selection flexibility, replaces divine bond (no vendored number)",
  },
  "paladin:oath-of-chastity:pure-of-mind:2": {
    archetypeId: "paladin:oath-of-chastity",
    name: "Pure of Mind",
    level: 2,
    bucket: "blocked",
    note: "blocked: ambiguous (unpaired) swap of Divine Grace, restating a narrower '+Cha bonus on Will saves' version of the same mechanic — extracting it would double-count the Will-save component of Divine Grace's allSavingThrows Change, which remains active since there's no pairedBaseFeatureUuid to suppress it. The accompanying '+4 sacred bonus vs. charm/figments' is separately narrow-scope regardless.",
  },
  "paladin:oath-of-chastity:pure-of-body:8": {
    archetypeId: "paladin:oath-of-chastity",
    name: "Pure of Body",
    level: 8,
    bucket: "subsystem",
    note: "50% crit/sneak-attack-negation chance — a fortification-style mechanic, no Change target; replaces aura of resolve",
  },
  "paladin:oath-of-loyalty:loyal-oath:1": {
    archetypeId: "paladin:oath-of-loyalty",
    name: "Loyal Oath",
    level: 1,
    bucket: "situational",
    note: "Smite-Evil-shaped save/AC bonus, scoped to a specific ally target adjacent to the paladin; replaces smite evil",
  },
  "paladin:oath-of-loyalty:loyal-guardian:8": {
    archetypeId: "paladin:oath-of-loyalty",
    name: "Loyal Guardian",
    level: 8,
    bucket: "subsystem",
    note: "redirect-attack mechanic, no flat number",
  },
  "paladin:oath-of-the-mendevian-crusade:divine-bond:5": {
    archetypeId: "paladin:oath-of-the-mendevian-crusade",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "weapon-property-list swap on Divine Bond, no flat number",
  },
  "paladin:oath-of-the-people-s-council:stirring-monologue:1": {
    archetypeId: "paladin:oath-of-the-people-s-council",
    name: "Stirring Monologue",
    level: 1,
    bucket: "subsystem",
    note: "bardic-performance emulation, resource-gated new subsystem",
  },
  "paladin:oath-of-the-people-s-council:aura-of-truth:11": {
    archetypeId: "paladin:oath-of-the-people-s-council",
    name: "Aura of Truth",
    level: 11,
    bucket: "situational",
    note: "self+ally illusion-disbelief bonus — narrow scope + ally-targeting",
  },
  "paladin:oath-of-the-people-s-council:champion-of-andoran:20": {
    archetypeId: "paladin:oath-of-the-people-s-council",
    name: "Champion of Andoran",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; SR-vs-evil-via-monologue, weapon-alignment property, and max-healing extras not modeled",
  },
  "paladin:oath-of-the-skyseeker:smite-evil-hordes:1": {
    archetypeId: "paladin:oath-of-the-skyseeker",
    name: "Smite Evil Hordes",
    level: 1,
    bucket: "subsystem",
    note: "retargeting rule for an active smite — not a flat number either way",
  },
  "paladin:oath-of-the-skyseeker:oath-spells:4": {
    archetypeId: "paladin:oath-of-the-skyseeker",
    name: "Oath Spells",
    level: 4,
    bucket: "subsystem",
    note: "spell-list addition, no flat number",
  },
  "paladin:oath-of-the-skyseeker:divine-bond:5": {
    archetypeId: "paladin:oath-of-the-skyseeker",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "weapon-property-list swap on Divine Bond, no flat number",
  },
  "paladin:oath-of-the-skyseeker:mercy-for-the-lost:11": {
    archetypeId: "paladin:oath-of-the-skyseeker",
    name: "Mercy for the Lost",
    level: 11,
    bucket: "subsystem",
    note: "find-the-path/plane-shift utility replacing a mercy, resource trade",
  },
  "paladin:oath-of-the-skyseeker:stalwart:14": {
    archetypeId: "paladin:oath-of-the-skyseeker",
    name: "Stalwart",
    level: 14,
    bucket: "subsystem",
    note: "save-negation mechanic on a partial-effect save — no Change target for 'avoid the reduced effect entirely'",
  },
  "paladin:oath-of-vengeance:channel-wrath:4": {
    archetypeId: "paladin:oath-of-vengeance",
    name: "Channel Wrath",
    level: 4,
    bucket: "numeric",
    note: "hand-verified, ground truth (issue #7, archetype-effects.ts) — resource trade, no baseline number of its own",
  },
  "paladin:oath-of-vengeance:oath-spells:4": {
    archetypeId: "paladin:oath-of-vengeance",
    name: "Oath Spells",
    level: 4,
    bucket: "subsystem",
    note: "spell-list addition, no flat number",
  },
  "paladin:oath-of-vengeance:powerful-justice:11": {
    archetypeId: "paladin:oath-of-vengeance",
    name: "Powerful Justice",
    level: 11,
    bucket: "subsystem",
    note: "grants allies smite evil's damage-only half via a smite spend — unrelated ally grant, replaces aura of justice (no vendored number)",
  },
  "paladin:pearl-seeker:seek-impressions:1": {
    archetypeId: "paladin:pearl-seeker",
    name: "Seek Impressions",
    level: 1,
    bucket: "subsystem",
    note: "bonus feat + at-will detect ability, unrelated",
  },
  "paladin:pearl-seeker:weapon-and-armor-proficiency:1": {
    archetypeId: "paladin:pearl-seeker",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency restriction (no shields) + class skill",
  },
  "paladin:pearl-seeker:aquatic-domain:3": {
    archetypeId: "paladin:pearl-seeker",
    name: "Aquatic Domain",
    level: 3,
    bucket: "subsystem",
    note: "domain-power grant, unrelated",
  },
  "paladin:pearl-seeker:vision-magic:4": {
    archetypeId: "paladin:pearl-seeker",
    name: "Vision Magic",
    level: 4,
    bucket: "subsystem",
    note: "spontaneous-casting progression swap + spell-list additions — a casting mechanic change, no Change target",
  },
  "paladin:pearl-seeker:divine-hippocampus:5": {
    archetypeId: "paladin:pearl-seeker",
    name: "Divine Hippocampus",
    level: 5,
    bucket: "subsystem",
    note: "mount-only Divine Bond variant with a fixed stat block — no flat number for the paladin herself",
  },
  "paladin:sacred-servant:spells:4": {
    archetypeId: "paladin:sacred-servant",
    name: "Spells",
    level: 4,
    bucket: "subsystem",
    note: "domain-spell-slot grant, unrelated",
  },
  "paladin:sacred-servant:divine-bond:5": {
    archetypeId: "paladin:sacred-servant",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "holy-symbol-bond variant granting activated, chosen-per-call enhancement points (CL/DC/dice/LoH-use bumps) — all activated and resource-gated, no flat always-on number",
  },
  "paladin:sacred-servant:call-celestial-ally:8": {
    archetypeId: "paladin:sacred-servant",
    name: "Call Celestial Ally",
    level: 8,
    bucket: "subsystem",
    note: "planar-ally-as-spell-like-ability grant, unrelated, replaces aura of resolve",
  },
  "paladin:sacred-shield:bastion-of-good:1": {
    archetypeId: "paladin:sacred-shield",
    name: "Bastion of Good",
    level: 1,
    bucket: "situational",
    note: "Smite-Evil-shaped deflection/half-damage-to-allies ability, single-target scoped, replaces smite evil",
  },
  "paladin:sacred-shield:holy-shield:4": {
    archetypeId: "paladin:sacred-shield",
    name: "Holy Shield",
    level: 4,
    bucket: "situational",
    note: "ally shield-bonus-sharing via a lay-on-hands spend — ally-targeting, replaces channel positive energy",
  },
  "paladin:sacred-shield:divine-bond:5": {
    archetypeId: "paladin:sacred-shield",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "shield-bond variant, item-property choices, no flat number",
  },
  "paladin:sacred-shield:improved-bastion:11": {
    archetypeId: "paladin:sacred-shield",
    name: "Improved Bastion",
    level: 11,
    bucket: "subsystem",
    note: "radius increase to bastion of good — modifies AREA of an already-situational ability, not itself a new number; replaces aura of justice",
  },
  "paladin:sacred-shield:perfect-bastion:20": {
    archetypeId: "paladin:sacred-shield",
    name: "Perfect Bastion",
    level: 20,
    bucket: "subsystem",
    note: "regeneration-vs-smite-target ability, target-conditional, no unconditional number; replaces holy champion but doesn't restate its DR text",
  },
  "paladin:scion-of-talmandor:scion-s-faith:1": {
    archetypeId: "paladin:scion-of-talmandor",
    name: "Scion's Faith",
    level: 1,
    bucket: "subsystem",
    note: "class-skill swap, narrative",
  },
  "paladin:scion-of-talmandor:egalitarian:2": {
    archetypeId: "paladin:scion-of-talmandor",
    name: "Egalitarian",
    level: 2,
    bucket: "subsystem",
    note: "activated Divine-Grace-halving/sharing mechanic — modifies HOW Divine Grace is used (not a permanent swap), resource/activated-gated, no new flat number",
  },
  "paladin:scion-of-talmandor:bonded-eagle:5": {
    archetypeId: "paladin:scion-of-talmandor",
    name: "Bonded Eagle",
    level: 5,
    bucket: "subsystem",
    note: "animal-companion grant via the Divine Bond slot, unrelated",
  },
  "paladin:scion-of-talmandor:consensus:8": {
    archetypeId: "paladin:scion-of-talmandor",
    name: "Consensus",
    level: 8,
    bucket: "situational",
    note: "ally attack/save/AC bonus via a voted choice — ally-targeting + player-choice-gated",
  },
  "paladin:scion-of-talmandor:talmandor-s-gift:11": {
    archetypeId: "paladin:scion-of-talmandor",
    name: "Talmandor's Gift",
    level: 11,
    bucket: "subsystem",
    note: "summon-monster-as-spell-like-ability grant, unrelated, replaces aura of justice",
  },
  "paladin:shining-knight:skilled-rider:3": {
    archetypeId: "paladin:shining-knight",
    name: "Skilled Rider",
    level: 3,
    bucket: "subsystem",
    note: "Ride-ACP removal (no roll-data path, same as Swiftsurge) + extends Divine Grace's bonus to the mount (an unrelated extension, not a swap) — replaces divine health (no vendored number)",
  },
  "paladin:shining-knight:divine-bond:5": {
    archetypeId: "paladin:shining-knight",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "mount-only restriction on Divine Bond, no flat number",
  },
  "paladin:shining-knight:knight-s-charge:11": {
    archetypeId: "paladin:shining-knight",
    name: "Knight's Charge",
    level: 11,
    bucket: "situational",
    note: "charge-AoO-immunity + panic-on-smite-hit — action/target-state scoped, replaces aura of justice",
  },
  "paladin:silver-champion:dragon-magic:4": {
    archetypeId: "paladin:silver-champion",
    name: "Dragon Magic",
    level: 4,
    bucket: "subsystem",
    note: "spell-list swap + reduced spells-per-level — a spellcasting mechanic, no Change target",
  },
  "paladin:silver-champion:drake-mount:5": {
    archetypeId: "paladin:silver-champion",
    name: "Drake Mount",
    level: 5,
    bucket: "subsystem",
    note: "drake companion via Divine Bond, unrelated — also drops the normal smite-evil-uses/mercy progression, but neither is Change-shaped so there's nothing to double-count by not modeling the removal",
  },
  "paladin:soul-sentinel:reprieve:6": {
    archetypeId: "paladin:soul-sentinel",
    name: "Reprieve",
    level: 6,
    bucket: "subsystem",
    note: "lay-on-hands-mercy-substitute condition removal, resource trade",
  },
  "paladin:soul-sentinel:sacred-soul:11": {
    archetypeId: "paladin:soul-sentinel",
    name: "Sacred Soul",
    level: 11,
    bucket: "situational",
    note: "self+ally save bonus vs. hexes/curses — narrow scope + ally-targeting, replaces aura of justice",
  },
  "paladin:soul-sentinel:greater-reprieve:12": {
    archetypeId: "paladin:soul-sentinel",
    name: "Greater Reprieve",
    level: 12,
    bucket: "subsystem",
    note: "corruption-manifestation-suppression mechanic, lay-on-hands-mercy-substitute, out-of-scope subsystem",
  },
  "paladin:stonelord:stonestrike:1": {
    archetypeId: "paladin:stonelord",
    name: "Stonestrike",
    level: 1,
    bucket: "situational",
    note: "activated attack/damage/CMB/CMD bonus, scaling, but only 'until the beginning of her next turn' once activated — an activated buff, not always-on; replaces smite evil",
  },
  "paladin:stonelord:heartstone:2": {
    archetypeId: "paladin:stonelord",
    name: "Heartstone",
    level: 2,
    bucket: "blocked",
    note: "blocked: verbatim Divine Grace text ('gains a bonus equal to her Charisma bonus (if any) on all saving throws'), ambiguous (unpaired) reflavor of the exact same mechanic. Extracting it would double the Cha-to-all-saves bonus alongside the still-unsuppressed base Divine Grace Change — the exact double-count trap the task flagged for this base feature.",
  },
  "paladin:stonelord:stoneblood:3": {
    archetypeId: "paladin:stonelord",
    name: "Stoneblood",
    level: 3,
    bucket: "subsystem",
    note: "stabilize bonus + crit/precision-negation chance — no Change target for either; replaces divine health + the 3rd/9th/15th mercies",
  },
  "paladin:stonelord:defensive-stance:4": {
    archetypeId: "paladin:stonelord",
    name: "Defensive Stance",
    level: 4,
    bucket: "subsystem",
    note: "stalwart-defender stance grant, new subsystem",
  },
  "paladin:stonelord:earth-channel:4": {
    archetypeId: "paladin:stonelord",
    name: "Earth Channel",
    level: 4,
    bucket: "subsystem",
    note: "Elemental Channel feat via a lay-on-hands spend, replaces channel positive energy — resource trade",
  },
  "paladin:stonelord:stone-servant:5": {
    archetypeId: "paladin:stonelord",
    name: "Stone Servant",
    level: 5,
    bucket: "subsystem",
    note: "earth-elemental companion via Divine Bond, unrelated",
  },
  "paladin:stonelord:stonebane:11": {
    archetypeId: "paladin:stonelord",
    name: "Stonebane",
    level: 11,
    bucket: "subsystem",
    note: "bane-property rider on stonestrike vs. earth-subtype/stone — target-type-scoped rider on an already-activated ability, replaces aura of justice",
  },
  "paladin:stonelord:phase-strike:12": {
    archetypeId: "paladin:stonelord",
    name: "Phase Strike",
    level: 12,
    bucket: "subsystem",
    note: "cover/AC-bypass rider on stonestrike via a resource spend, replaces the 12th-level mercy",
  },
  "paladin:stonelord:mobile-defense:18": {
    archetypeId: "paladin:stonelord",
    name: "Mobile Defense",
    level: 18,
    bucket: "subsystem",
    note: "movement-while-in-stance rule, replaces the 18th-level mercy",
  },
  "paladin:stonelord:stone-body:20": {
    archetypeId: "paladin:stonelord",
    name: "Stone Body",
    level: 20,
    bucket: "subsystem",
    note: "immunity list (paralysis/poison/stunning/crit/precision), no flat number; replaces holy champion but doesn't restate its DR text",
  },
  "paladin:sword-of-valor:first-into-battle:2": {
    archetypeId: "paladin:sword-of-valor",
    name: "First Into Battle",
    level: 2,
    bucket: "blocked",
    note: "blocked: ambiguous (unpaired) swap of Divine Grace. This feature's own Initiative bonus doesn't target-overlap Divine Grace's allSavingThrows Change, but per the task's guidance any ambiguous swap of this base feature is treated as the double-count-trap category — recorded conservatively rather than extracted, since Divine Grace itself would remain unsuppressed and keep showing as an active, un-replaced ability on the sheet.",
  },
  "paladin:sword-of-valor:prayer-of-the-fourth-act:6": {
    archetypeId: "paladin:sword-of-valor",
    name: "Prayer of the Fourth Act",
    level: 6,
    bucket: "subsystem",
    note: "channel-energy-to-temp-HP conversion, resource trade, replaces the 6th-level mercy",
  },
  "paladin:sword-of-valor:worthy-enemy:11": {
    archetypeId: "paladin:sword-of-valor",
    name: "Worthy Enemy",
    level: 11,
    bucket: "situational",
    note: "Will-save-vs-surrender effect on a smite-crit — single-target/action scoped, replaces aura of justice",
  },
  "paladin:tempered-champion:divine-weapon-specialization:4": {
    archetypeId: "paladin:tempered-champion",
    name: "Divine Weapon Specialization",
    level: 4,
    bucket: "numeric",
    note: "restricted-list bonus feats every 4 levels from 4th, pure additive grant with no paired base-feature slot — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below); the sacred-weapon damage-die rider is not modeled",
  },
  "paladin:tempered-champion:divine-bond:5": {
    archetypeId: "paladin:tempered-champion",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "lay-on-hands-spend fallback for an exhausted Divine Bond use, resource trade",
  },
  "paladin:temple-champion:domain-granted-power:4": {
    archetypeId: "paladin:temple-champion",
    name: "Domain Granted Power",
    level: 4,
    bucket: "subsystem",
    note: "domain 1st-level power grant using paladin-level-as-cleric-level, unrelated",
  },
  "paladin:temple-champion:spells:4": {
    archetypeId: "paladin:temple-champion",
    name: "Spells",
    level: 4,
    bucket: "subsystem",
    note: "removes paladin spellcasting entirely, no replacement number",
  },
  "paladin:temple-champion:blessing-minor:5": {
    archetypeId: "paladin:temple-champion",
    name: "Blessing (Minor)",
    level: 5,
    bucket: "subsystem",
    note: "warpriest minor-blessing grant, replaces divine bond + aura of justice (neither carries a vendored number) — unrelated subsystem. Suspected vendored duplicate: this id's description is byte-identical to Blessing (Major)'s (level 11).",
  },
  "paladin:temple-champion:blessing-major:11": {
    archetypeId: "paladin:temple-champion",
    name: "Blessing (Major)",
    level: 11,
    bucket: "subsystem",
    note: "same ability as Blessing (Minor) — see that entry's vendored-duplicate note",
  },
  "paladin:tortured-crusader:all-is-darkness:1": {
    archetypeId: "paladin:tortured-crusader",
    name: "All is Darkness",
    level: 1,
    bucket: "situational",
    note: "removes Divine Grace/Detect Evil entirely (a removal, not a new number to extract) and replaces Smite Evil's Cha-based bonus with a flat +4 at 2nd — still single-target scoped like base Smite Evil, so no unconditional number either way",
  },
  "paladin:tortured-crusader:alone-in-the-dark:1": {
    archetypeId: "paladin:tortured-crusader",
    name: "Alone in the Dark",
    level: 1,
    bucket: "subsystem",
    note: "restricts lay on hands to self-only + converts 2 uses into an extra smite at 4th — resource restriction/trade, no flat number; also narrows 4 auras to self-only (none carry a vendored number to lose)",
  },
  "paladin:tortured-crusader:self-sufficient:1": {
    archetypeId: "paladin:tortured-crusader",
    name: "Self-Sufficient",
    level: 1,
    bucket: "subsystem",
    note: "class-skill swap + doubles skill ranks/level to 4+Int — same bonusSkillRanks-is-race-only limitation as Faithful Wanderer's Wanderer's Lore",
  },
  "paladin:tortured-crusader:torment:1": {
    archetypeId: "paladin:tortured-crusader",
    name: "Torment",
    level: 1,
    bucket: "subsystem",
    note: "swaps the paladin's key spellcasting/lay-on-hands ability score from Cha to Wis — a cross-cutting mechanic this engine's formula convention doesn't parameterize",
  },
  "paladin:tortured-crusader:second-chance:2": {
    archetypeId: "paladin:tortured-crusader",
    name: "Second Chance",
    level: 2,
    bucket: "subsystem",
    note: "triggered/conditional lay-on-hands-mercy spend, resource trade",
  },
  "paladin:tortured-crusader:last-stand:11": {
    archetypeId: "paladin:tortured-crusader",
    name: "Last Stand",
    level: 11,
    bucket: "situational",
    note: "doubles smite evil's damage bonus for a declared smite — still single-target/action scoped, replaces aura of justice",
  },
  "paladin:tranquil-guardian:touch-of-serenity:1": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Touch of Serenity",
    level: 1,
    bucket: "subsystem",
    note: "bonus-feat-emulation (a specific named feat, not a bonusFeats count) + duration scaling, replaces smite evil",
  },
  "paladin:tranquil-guardian:serene-strike:3": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Serene Strike",
    level: 3,
    bucket: "subsystem",
    note: "crit-triggered rider on touch of serenity, action-scoped, replaces aura of courage",
  },
  "paladin:tranquil-guardian:divine-bond:5": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Divine Bond",
    level: 5,
    bucket: "subsystem",
    note: "weapon-property-list swap on Divine Bond, no flat number",
  },
  "paladin:tranquil-guardian:aura-of-calm:8": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Aura of Calm",
    level: 8,
    bucket: "situational",
    note: "self+ally fear/emotion immunity/save bonus — ally-targeting; self-immunity isn't a Change-shaped number either, replaces aura of resolve",
  },
  "paladin:tranquil-guardian:waves-of-peace:11": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Waves of Peace",
    level: 11,
    bucket: "subsystem",
    note: "AoE rider on touch of serenity via a resource spend, replaces aura of justice",
  },
  "paladin:tranquil-guardian:apostle-of-peace:20": {
    archetypeId: "paladin:tranquil-guardian",
    name: "Apostle of Peace",
    level: 20,
    bucket: "numeric",
    note: "DR increases to 10/evil (verbatim Holy Champion text, cleanly paired) — extracted; max-healing and extra-Will-save-on-touch-of-serenity extras not modeled",
  },
  "paladin:undead-scourge:smite-evil:1": {
    archetypeId: "paladin:undead-scourge",
    name: "Smite Evil",
    level: 1,
    bucket: "situational",
    note: "Smite Evil reflavor scoped to undead — same single-target scoping as base Smite Evil",
  },
  "paladin:undead-scourge:aura-of-life:8": {
    archetypeId: "paladin:undead-scourge",
    name: "Aura of Life",
    level: 8,
    bucket: "situational",
    note: "undead-debuff aura — enemy-type scoped and affects enemies, not the paladin/allies; no Change target for weakening a category of enemies, replaces aura of resolve",
  },
  "paladin:undead-scourge:undead-annihilation:11": {
    archetypeId: "paladin:undead-scourge",
    name: "Undead Annihilation",
    level: 11,
    bucket: "situational",
    note: "Will-save-vs-destruction on a smite-spend attack vs. undead — single-target/enemy-type scoped, replaces aura of justice",
  },
  "paladin:vindictive-bastard:locate-ally:1": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Locate Ally",
    level: 1,
    bucket: "subsystem",
    note: "locate-creature-as-spell-like-ability utility, unrelated",
  },
  "paladin:vindictive-bastard:no-aura:1": {
    archetypeId: "paladin:vindictive-bastard",
    name: "No Aura",
    level: 1,
    bucket: "subsystem",
    note: "removes alignment aura visibility, narrative",
  },
  "paladin:vindictive-bastard:vindictive-smite:1": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Vindictive Smite",
    level: 1,
    bucket: "situational",
    note: "Smite-Evil-shaped attack/damage/AC bonus, single-target scoped, replaces smite evil",
  },
  "paladin:vindictive-bastard:faded-grace:2": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Faded Grace",
    level: 2,
    bucket: "subsystem",
    note: "named bonus feat from a short list, not a bonusFeats count — ambiguous swap of divine grace, but this feature itself carries no Divine-Grace-shaped number, so no composition trap",
  },
  "paladin:vindictive-bastard:solo-tactics:2": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Solo Tactics",
    level: 2,
    bucket: "subsystem",
    note: "inquisitor solo-tactics emulation, activated/resource-gated",
  },
  "paladin:vindictive-bastard:spiteful-tenacity:3": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Spiteful Tenacity",
    level: 3,
    bucket: "subsystem",
    note: "Diehard-feat emulation conditional on an active vindictive smite — activated-state gated, no flat number",
  },
  "paladin:vindictive-bastard:teamwork-feat:3": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Teamwork Feat",
    level: 3,
    bucket: "numeric",
    note: "restricted-list (teamwork feats) bonus feats at 3rd and every 6 levels thereafter, pure additive grant with no paired base-feature slot — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below)",
  },
  "paladin:vindictive-bastard:gang-up:5": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Gang Up",
    level: 5,
    bucket: "situational",
    note: "half-vindictive-smite-bonus shared with allies via a move action — ally-targeting + target-scoped",
  },
  "paladin:vindictive-bastard:swift-justice:11": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Swift Justice",
    level: 11,
    bucket: "subsystem",
    note: "action-type change to gang up, replaces aura of justice",
  },
  "paladin:vindictive-bastard:stalwart:14": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Stalwart",
    level: 14,
    bucket: "subsystem",
    note: "save-negation mechanic on a partial-effect save, replaces aura of faith — no Change target for this",
  },
  "paladin:vindictive-bastard:aura-of-self-righteousness:17": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Aura of Self-Righteousness",
    level: 17,
    bucket: "situational",
    note: "real DR 5/lawful-or-good, but a COMPOUND bypass qualifier ('lawful OR good') this engine's per-qualifier dr.<bypass> target vocabulary can't express as one entry without misrepresenting it as two independent DR sources — not modeled; the compulsion immunity/ally save-bonus half is separately narrow-scope + ally-targeting",
  },
  "paladin:vindictive-bastard:ultimate-vindication:20": {
    archetypeId: "paladin:vindictive-bastard",
    name: "Ultimate Vindication",
    level: 20,
    bucket: "subsystem",
    note: "disintegrate-on-next-hit rider, conditional/resource-gated, replaces holy champion but doesn't restate its DR text",
  },
  "paladin:virtuoso-bravo:bravo-s-finesse:1": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Bravo's Finesse",
    level: 1,
    bucket: "subsystem",
    note: "Weapon-Finesse emulation + prerequisite-substitution rule, no flat Change",
  },
  "paladin:virtuoso-bravo:bravo-s-smite:1": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Bravo's Smite",
    level: 1,
    bucket: "subsystem",
    note: "removes the AC-deflection half of smite evil — a removal, not a new number",
  },
  "paladin:virtuoso-bravo:weapon-and-armor-proficiency:1": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency restriction reprint",
  },
  "paladin:virtuoso-bravo:nimble:3": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Nimble",
    level: 3,
    bucket: "numeric",
    note: "dodge AC bonus while wearing light/no armor, scaling — @armor.type-gated (the same real-condition precedent as the hand-verified table's Savage Barbarian) — extracted (see PALADIN_ARCHETYPE_EFFECTS_EXTRACTED below)",
  },
  "paladin:virtuoso-bravo:panache-and-deeds:4": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Panache and Deeds",
    level: 4,
    bucket: "subsystem",
    note: "swashbuckler panache/deeds grant, new subsystem",
  },
  "paladin:virtuoso-bravo:advanced-deeds:11": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Advanced Deeds",
    level: 11,
    bucket: "subsystem",
    note: "more swashbuckler deeds, same subsystem as Panache and Deeds",
  },
  "paladin:virtuoso-bravo:bravo-s-holy-strike:20": {
    archetypeId: "paladin:virtuoso-bravo",
    name: "Bravo's Holy Strike",
    level: 20,
    bucket: "subsystem",
    note: "crit-triggered save-or-suffer effect, action/target scoped, no flat number; replaces holy champion but doesn't restate its DR text",
  },
  "paladin:warrior-of-the-holy-light:power-of-faith:4": {
    archetypeId: "paladin:warrior-of-the-holy-light",
    name: "Power of Faith",
    level: 4,
    bucket: "situational",
    note: "real, cleanly-scaling AC/attack/damage/fear-save aura via a lay-on-hands spend — activated (standard action, lasts 1 minute) + ally-targeting, matches the activated-buff exclusion (same bar as Archaeologist's Luck)",
  },
  "paladin:warrior-of-the-holy-light:shining-light:14": {
    archetypeId: "paladin:warrior-of-the-holy-light",
    name: "Shining Light",
    level: 14,
    bucket: "situational",
    note: "AoE damage/blind vs. evil + heal/buff vs. good — activated, area, save-DC-gated, replaces aura of faith",
  },
  "paladin:wilderness-warden:natural-defense:2": {
    archetypeId: "paladin:wilderness-warden",
    name: "Natural Defense",
    level: 2,
    bucket: "situational",
    note: "real, cleanly-scaling energy resistance + CMD bonus, but activated (once/day, lasts minutes) with a chosen energy type each use",
  },
  "paladin:wilderness-warden:aura-of-comfort:3": {
    archetypeId: "paladin:wilderness-warden",
    name: "Aura of Comfort",
    level: 3,
    bucket: "situational",
    note: "self+ally Con-check/save bonus scoped to specific conditions (fatigue/exhaustion/hunger/thirst/climate) — narrow scope + ally-targeting",
  },
  "paladin:wilderness-warden:favored-terrain:3": {
    archetypeId: "paladin:wilderness-warden",
    name: "Favored Terrain",
    level: 3,
    bucket: "subsystem",
    note: "ranger favored-terrain reflavor — favored terrain isn't modeled anywhere in this engine",
  },
  "paladin:wilderness-warden:smite-evil:4": {
    archetypeId: "paladin:wilderness-warden",
    name: "Smite Evil",
    level: 4,
    bucket: "subsystem",
    note: "shifts smite evil's grant level/enemy-type scoping — not expressible, Smite Evil isn't Change-shaped",
  },
  "paladin:wilderness-warden:spells:4": {
    archetypeId: "paladin:wilderness-warden",
    name: "Spells",
    level: 4,
    bucket: "subsystem",
    note: "druid-spell-list substitution, no flat number",
  },
  "paladin:wilderness-warden:aura-of-purity:8": {
    archetypeId: "paladin:wilderness-warden",
    name: "Aura of Purity",
    level: 8,
    bucket: "subsystem",
    note: "self poison immunity (not a Change-shaped number) + ally save bonus vs. disease/poison — dominant effect is an immunity",
  },
  "paladin:wilderness-warden:natural-shield:11": {
    archetypeId: "paladin:wilderness-warden",
    name: "Natural Shield",
    level: 11,
    bucket: "situational",
    note: "extends natural-defense's benefit to allies via a resource spend — ally-targeting",
  },
};

/**
 * ── PALADIN_ARCHETYPE_EFFECTS_EXTRACTED ───────────────────────────────────
 *
 * Machine-extracted mechanical effects for paladin archetype class features
 * (issue #45 wave 2). Clean-room from the published PF1 rules — the vendored
 * prose this was extracted from (`archetype-features.json`) is OGL, so
 * reading it is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * Separate from `archetype-effects.ts`'s `ARCHETYPE_FEATURE_EFFECTS`
 * (hand-verified table, which already covers Oath of Vengeance and Divine
 * Hunter for this class) — every entry here additionally carries
 * `confidence`/`provenance`. `resolveArchetypeFeatureEffect`
 * (`archetype-effects-resolve.ts`) always checks the hand-verified table
 * first, so no id can double-apply between the two tables; no paladin id is
 * present in both.
 *
 * Confidence rubric (same as `archetype-extracted/fighter.ts`): "high" =
 * literal/near-literal reflavor of an already-established mechanism or a
 * single, clearly-worded, fully-general scaling bonus; "medium" = a
 * non-obvious cadence or a partially-dropped second condition (flagged in
 * `detail`); "low" = reserved, unused this wave.
 */
export const PALADIN_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // ── Pure additive bonus-feat grants (no paired base-feature slot) ─────────

  "paladin:divine-guardian:bonus-feat:7": {
    changes: [
      c(
        "(if(gte(@class.unlevel,7),1,0)) + (if(gte(@class.unlevel,10),1,0)) + (if(gte(@class.unlevel,13),1,0))",
        "bonusFeats",
      ),
    ],
    detail: (level) =>
      `${(level >= 7 ? 1 : 0) + (level >= 10 ? 1 : 0) + (level >= 13 ? 1 : 0)} bonus feat(s) (restricted, shield-focused list)`,
    confidence: "high",
    provenance:
      "A divine guardian gains a bonus feat at 7th level, and additional bonus feats at 10th and " +
      "13th level. These bonus feats must be chosen from the following list: Diehard, Endurance, " +
      "Greater Shield Focus, ...",
  },
  "paladin:tempered-champion:divine-weapon-specialization:4": {
    changes: [c("1 + floor((@class.unlevel - 4) / 4)", "bonusFeats")],
    detail: (level) =>
      `${1 + Math.floor((level - 4) / 4)} bonus feat(s) (restricted, weapon-focused list)`,
    confidence: "high",
    provenance:
      "At 4th level and every 4 levels thereafter, a tempered champion gains a bonus feat from " +
      "the following list: Disruptive, Divine Fighting Technique, Greater Penetrating Strike, " +
      "Greater Weapon Focus, Greater Weapon Specialization, Penetrating Strike, Weapon Focus, " +
      "Weapon Specialization, and Weapon Trick.",
  },
  "paladin:vindictive-bastard:teamwork-feat:3": {
    changes: [c("1 + floor((@class.unlevel - 3) / 6)", "bonusFeats")],
    detail: (level) => `${1 + Math.floor((level - 3) / 6)} bonus feat(s) (teamwork feats)`,
    confidence: "high",
    provenance:
      "At 3rd level and every 6 levels thereafter, the vindictive bastard gains a bonus feat in " +
      "addition to those gained from normal advancement. These bonus feats must be selected from " +
      "those listed as teamwork feats.",
  },

  // ── General, unconditional scaling bonuses ────────────────────────────────

  "paladin:empyreal-knight:celestial-heart:3": {
    changes: [
      c("if(gte(@class.unlevel,9), 10, 5)", "eres.acid"),
      c("if(gte(@class.unlevel,9), 10, 5)", "eres.cold"),
      c("if(gte(@class.unlevel,9), 10, 5)", "eres.electricity"),
    ],
    detail: (level) => `resist acid/cold/electricity ${level >= 9 ? 10 : 5}`,
    confidence: "high",
    provenance:
      "At 3rd level, she gains resistance 5 against acid, cold, and electricity. ... At 9th " +
      "level, her defenses improve to resistance 10 against acid, cold, and electricity.",
  },
  "paladin:kraken-slayer:aura-of-elusion:14": {
    changes: [c("@class.unlevel", "skill.esc")],
    detail: (level) => `+${level} Escape Artist`,
    confidence: "medium",
    provenance:
      "At 14th level, a kraken slayer gains a sacred bonus equal to her kraken slayer level on " +
      "Escape Artist checks and combat maneuver checks to escape a grapple and to her CMD to " +
      "avoid being grappled. (only the general Escape Artist half is extracted — the CMB/CMD " +
      "half is scoped to the grapple maneuver specifically, and the ally-facing half is halved " +
      "and ally-targeted)",
  },

  // ── Armor-state-gated dodge AC (the hand-verified table's Savage Barbarian
  // ── @armor.type precedent) ────────────────────────────────────────────────

  "paladin:virtuoso-bravo:nimble:3": {
    changes: [
      c("if(lte(@armor.type,1), min(5, 1 + floor((@class.unlevel - 3) / 4)), 0)", "ac", "dodge"),
    ],
    detail: (level) => `+${Math.min(5, 1 + Math.floor((level - 3) / 4))} dodge AC (light/no armor)`,
    confidence: "high",
    provenance:
      "At 3rd level, a virtuous bravo gains a +1 dodge bonus to AC while wearing light armor or " +
      "no armor. ... This bonus increases by 1 for every 4 paladin levels beyond 3rd (to a " +
      "maximum of +5 at 19th level).",
  },

  // ── Holy Champion "DR increases to 10/evil" reflavors ─────────────────────
  // Seven 20th-level archetype features cleanly paired to Holy Champion
  // (uuid Compendium.pf1.class-abilities.Item.BPRtCoYTMDwsITXJ, which carries
  // no vendored `changes[]` of its own — nothing to double) that literally
  // restate its "Her DR increases to 10/evil" sentence alongside their own
  // capstone rider. The "heals the maximum possible amount" half is never
  // extracted (Lay on Hands/Channel healing amounts aren't Change-shaped in
  // this engine — see this file's header note).

  "paladin:empyreal-knight:empyreal-champion:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:forgefather-s-seeker:forgefather-s-champion:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:holy-gun:holy-slinger:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:oath-against-corruption:cast-into-the-void:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:oath-against-the-wyrm:dragon-slaying-strike:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:oath-of-the-people-s-council:champion-of-andoran:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "Her DR increases to 10/evil.",
  },
  "paladin:tranquil-guardian:apostle-of-peace:20": {
    changes: [c("10", "dr.evil")],
    detail: () => "DR 10/evil",
    confidence: "high",
    provenance: "a tranquil guardian's DR increases to 10/evil.",
  },
};
