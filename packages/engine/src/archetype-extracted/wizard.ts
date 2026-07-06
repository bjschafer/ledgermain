/**
 * Wizard's slice of the issue #45 batch-extraction pipeline (prose→Change
 * extraction wave, 2026-07-06), mechanically repeating the Fighter pilot
 * (`fighter.ts`) for wizard's 31 vendored archetypes / 108 archetype
 * features. Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns BOTH of
 * wizard's pipeline artifacts — `WIZARD_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) and
 * `WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION` (the full per-feature audit) —
 * so a future wave working on a different class never has a reason to touch
 * this file; only `index.ts` (the aggregator) needs one new import + one new
 * spread per class.
 *
 * ── WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION ───────────────────────────────
 *
 * Classification audit for issue #45's wizard slice: EVERY feature of EVERY
 * vendored wizard archetype (31 archetypes, 108 features), read in full (not
 * heuristic-sampled — small enough class to read exhaustively) and bucketed
 * as `numeric` / `situational` / `subsystem` / `blocked`, applying the exact
 * same rubric fighter's pilot used:
 *
 *  - "numeric": an unconditional bonus, or one gated on a condition the
 *    engine can actually check, expressible via a real
 *    `packages/engine/src/targets.ts` target. A bonus scoped to a specific
 *    maneuver, enemy state, or action that round does NOT qualify even with
 *    a clean real number.
 *  - "situational": a real number that fails the `numeric` bar above for
 *    scoping/conditionality reasons — never given a Change; the vendored
 *    prose (rendered in full elsewhere in the UI) stays the source of truth.
 *  - "subsystem": grants an unrelated ability, resource, proficiency, or
 *    choice-list, or removes a penalty the engine never modeled in the first
 *    place. No Change-shaped number exists to extract.
 *  - "blocked": a genuine composition trap — an UNPAIRED archetype feature
 *    that claims to replace (all or part of) an atomic, single-formula,
 *    multi-tier base grant.
 *
 * Two wizard-specific mechanical facts drive most of the bucketing below
 * (verified against the vendored data and `archetypes.ts`/`targets.ts`
 * before this pass started, not re-derived per feature):
 *
 * 1. **Arcane School is unsuppressible.** The actual school POWERS (Hand of
 *    the Apprentice, elemental blasts, etc.) are granted through
 *    `collectGrantedFeatures()` (`archetypes.ts`), gated purely on
 *    `doc.build.wizardSchool` and wizard level — there is no per-archetype
 *    override hook into that grant path. Any archetype that modifies,
 *    reworks, or replaces arcane-school mechanics is `subsystem`: the base
 *    school power keeps applying in full regardless of what the archetype's
 *    prose claims to swap it for (the same "unsuppressible magic subsystem"
 *    shape `archetype-effects.ts`'s Sorcerer of Sleep entry already
 *    documents for bloodline arcana). None of the 31 wizard archetypes here
 *    needed the stronger `blocked` treatment for this reason — every one
 *    that touches arcane school either grants something wholly unrelated to
 *    the school power's own target (safe, ordinary `subsystem`) or grants a
 *    number that survives fine alongside an un-suppressed school power with
 *    no vendored `changes` of its own (Diligent Student, see below).
 *
 * 2. **Every one of the 108 vendored wizard archetype features is UNPAIRED**
 *    (`pairedBaseFeatureUuid` absent on all 108 — verified directly against
 *    `archetype-features.json`, not assumed). Unlike fighter (183/383 paired
 *    features, whose `activeArchetypeSwaps` mechanism cleanly suppresses the
 *    replaced base feature), NO wizard archetype swap is ever suppressed
 *    automatically. This matters because wizard's base class carries exactly
 *    two `classFeatures` entries with a real vendored `Change`: Scribe
 *    Scroll (`1` → `bonusFeats`, flat) and Bonus Feats (WIZ)
 *    (`floor(@class.unlevel/5)` → `bonusFeats`, the exact fighter-Bonus-
 *    Feats-(FGT)-shaped atomic multi-tier formula spanning 5th/10th/15th/
 *    20th). A striking number of wizard archetypes (mostly at 5th, 10th,
 *    15th, or 20th level) explicitly say "this replaces the bonus feat
 *    gained at Nth level" — since NONE of them can be paired/suppressed, the
 *    base Bonus Feats (WIZ) formula keeps granting that tier's feat in full
 *    regardless, making every one of these a `blocked` composition trap
 *    (the atomic-partial-tier trap called out in the task brief), not a
 *    `numeric` extraction. This turned out to be wizard's dominant `blocked`
 *    pattern — one root cause (Bonus Feats (WIZ)'s un-suppressible atomic
 *    formula), not ~20 independent bespoke traps. Arcane Bond and Cantrips
 *    both carry NO vendored `changes` at all, so archetypes that swap those
 *    out (the large majority of "replaces arcane bond"/"replaces cantrips"
 *    entries) have nothing to double-count against and are ordinary
 *    `subsystem` grants instead. A named-feat swap (e.g. "gains Siege
 *    Engineer instead of Scribe Scroll") does NOT trip this trap either: the
 *    engine's `bonusFeats` target is an abstract count of freed-up feat
 *    slots, indifferent to which specific feat fills them, so trading one
 *    named feat for another leaves the count correct with nothing to
 *    suppress.
 *
 * `wizard:spell-sage:focused-spells:1` is intentionally classified here
 * (`subsystem`, matching its true mechanical shape) without a corresponding
 * entry in `WIZARD_ARCHETYPE_EFFECTS_EXTRACTED` — it already lives in the
 * hand-verified `ARCHETYPE_FEATURE_EFFECTS` table (`archetype-effects.ts`,
 * "── Wizard ──" section) with an empty `changes` array (notes-only), and
 * `resolveArchetypeFeatureEffect` always prefers the hand-verified table, so
 * duplicating it here would be redundant at best.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "wizard:arcane-bomber:bomb:1": {
    archetypeId: "wizard:arcane-bomber",
    name: "Bomb",
    level: 1,
    bucket: "subsystem",
    note: "alchemist-bomb clone (scaling bomb damage dice, energy type chosen at 1st) — no engine target for a thrown-splash-weapon damage pool; replaces arcane bond",
  },
  "wizard:arcane-bomber:school-of-the-bomb:1": {
    archetypeId: "wizard:arcane-bomber",
    name: "School of the Bomb",
    level: 1,
    bucket: "subsystem",
    note: "widens opposition schools to four and adds a crafting skill-check penalty — modifies/reworks arcane school mechanics, which the engine grants generically via collectGrantedFeatures with no per-archetype override hook (unsuppressible, same shape as the bloodline-arcana composition gap)",
  },
  "wizard:arcane-bomber:spellblast-bombs:1": {
    archetypeId: "wizard:arcane-bomber",
    name: "Spellblast Bombs",
    level: 1,
    bucket: "situational",
    note: "attack/damage bonus equal to the level of a spell sacrificed, but only on the next bomb thrown before the end of the caster's own turn — a real number scoped to a specific action that round, not an always-on Change; replaces cantrips",
  },

  "wizard:arcane-physician:arcane-bond:1": {
    archetypeId: "wizard:arcane-physician",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Arcane Bond ability verbatim with no stated mechanical change (see report — likely a vendored-data duplication artifact); a bond-mechanic entry either way carries no Change-shaped stat (issue #45 wizard rubric note 2)",
  },
  "wizard:arcane-physician:brew-potion:1": {
    archetypeId: "wizard:arcane-physician",
    name: "Brew Potion",
    level: 1,
    bucket: "subsystem",
    note: "grants Brew Potion as a named bonus feat — no baseline number to model (same bar as Divine Hunter's Precise Shot in the hand-verified table)",
  },
  "wizard:arcane-physician:medicinal-alchemy:1": {
    archetypeId: "wizard:arcane-physician",
    name: "Medicinal Alchemy",
    level: 1,
    bucket: "subsystem",
    note: "spell-list/item-crafting interaction (treats alchemist healing extracts as wizard spells for UMD/crafting purposes) — no numeric Change involved",
  },

  "wizard:arcane-warden:arcane-bond:1": {
    archetypeId: "wizard:arcane-warden",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Arcane Bond ability verbatim with no stated mechanical change — bond mechanic, no Change-shaped stat (rubric note 2)",
  },
  "wizard:arcane-warden:generous-touch:1": {
    archetypeId: "wizard:arcane-warden",
    name: "Generous Touch",
    level: 1,
    bucket: "subsystem",
    note: "extends touch-spell durations by the caster's Int modifier — no duration target exists in targets.ts",
  },
  "wizard:arcane-warden:ready-for-anything:1": {
    archetypeId: "wizard:arcane-warden",
    name: "Ready for Anything",
    level: 1,
    bucket: "blocked",
    note: "grants a restricted-list bonus feat at 1st, then again at 5th/10th/15th/20th 'instead of' the wizard's normal item-creation/metamagic bonus-feat progression — an UNPAIRED swap of Bonus Feats (WIZ), whose atomic 'floor(@class.unlevel/5)' formula keeps applying in full regardless (no suppression hook for wizard archetypes — none of the 108 vendored wizard archetype features carry a pairedBaseFeatureUuid at all). Backfilling this archetype's own restricted-list count would double it on top of the base grant's still-unsuppressed formula, the same composition trap as Fighter's Unbreakable/Armor Training case",
  },
  "wizard:arcane-warden:bonus-feat:5": {
    archetypeId: "wizard:arcane-warden",
    name: "Bonus Feat",
    level: 5,
    bucket: "blocked",
    note: "restates the 5th/10th/15th/20th portion of Ready for Anything's own text nearly verbatim as a separate feature entry (likely a vendored-data splitting artifact — see report) — same unpaired Bonus Feats (WIZ) collision as Ready for Anything; not given a second, doubled-up entry",
  },
  "wizard:arcane-warden:restorative-shelter:8": {
    archetypeId: "wizard:arcane-warden",
    name: "Restorative Shelter",
    level: 8,
    bucket: "subsystem",
    note: "grants specific free-to-prepare spells and a save bonus for creatures resting in the conjured shelter — narrative/utility spell-list ability, no Change-shaped stat",
  },

  "wizard:bonded-wizard:arcane-bond:1": {
    archetypeId: "wizard:bonded-wizard",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "bonded object gains +1 hp/hardness per wizard level — an item-property mechanic, not a wizard stat the engine tracks (rubric note 2)",
  },
  "wizard:bonded-wizard:hidden-bond:1": {
    archetypeId: "wizard:bonded-wizard",
    name: "Hidden Bond",
    level: 1,
    bucket: "subsystem",
    note: "disguise-self/magic-aura effect on the bonded item's appearance — no numeric effect",
  },
  "wizard:bonded-wizard:bonded-force:5": {
    archetypeId: "wizard:bonded-wizard",
    name: "Bonded Force",
    level: 5,
    bucket: "subsystem",
    note: "activated force-point pool creating temporary mage armor/shield/spiritual-weapon effects — resource-gated activated ability, same category as ki/grit/panache exclusions",
  },
  "wizard:bonded-wizard:reshape-bond:10": {
    archetypeId: "wizard:bonded-wizard",
    name: "Reshape Bond",
    level: 10,
    bucket: "blocked",
    note: "repairs/reshapes the bonded item; 'replaces the wizard's bonus feat normally gained at 10th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)'s atomic formula (the 10th-level slice), leaving 5th/15th/20th unaffected — the same atomic-partial-tier trap as Fighter's Armor Training/Bonus Feats (FGT) precedent",
  },

  "wizard:chronomancer:temporal-pool:1": {
    archetypeId: "wizard:chronomancer",
    name: "Temporal Pool",
    level: 1,
    bucket: "subsystem",
    note: "a resource pool (half class level + Int mod) spent on a grab-bag of initiative/reroll/haste/contingency/emergency-clone effects — entirely activated and resource-gated, no baseline always-on number",
  },

  "wizard:clocksmith:arcane-bond:1": {
    archetypeId: "wizard:clocksmith",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Arcane Bond ability verbatim with no stated mechanical change — bond mechanic, no Change-shaped stat (rubric note 2)",
  },
  "wizard:clocksmith:clockwork-bond:1": {
    archetypeId: "wizard:clocksmith",
    name: "Clockwork Bond",
    level: 1,
    bucket: "subsystem",
    note: "forces a constructed familiar as the arcane bond, halving its normal familiar-ability bonus — familiar/bond mechanic, no wizard-stat Change",
  },
  "wizard:clocksmith:clockwork-expertise:1": {
    archetypeId: "wizard:clocksmith",
    name: "Clockwork Expertise",
    level: 1,
    bucket: "situational",
    note: "+2 (later +4) saves and +1/+2 effective caster level, but only against/targeting creatures of the clockwork subtype — a real number scoped to a specific enemy subtype the engine can't check",
  },
  "wizard:clocksmith:craft-construct:1": {
    archetypeId: "wizard:clocksmith",
    name: "Craft Construct",
    level: 1,
    bucket: "subsystem",
    note: "grants Craft Construct as a named bonus feat — no baseline number to model",
  },
  "wizard:clocksmith:familiar-tinkering:5": {
    archetypeId: "wizard:clocksmith",
    name: "Familiar Tinkering",
    level: 5,
    bucket: "subsystem",
    note: "grants the familiar eidolon-evolution points — a familiar-stat mechanic, not a wizard Change",
  },

  "wizard:cruoromancer:blood-infusion:1": {
    archetypeId: "wizard:cruoromancer",
    name: "Blood Infusion",
    level: 1,
    bucket: "situational",
    note: "+1 DC or a sicken rider on necromancy spells, chosen per-cast via a swift action at a self-inflicted HP cost — a real number, but scoped to a specific spell school cast that round, and DC isn't a target the engine applies anyway",
  },
  "wizard:cruoromancer:blood-command:5": {
    archetypeId: "wizard:cruoromancer",
    name: "Blood Command",
    level: 5,
    bucket: "subsystem",
    note: "changes the HD math for animate dead — a spell-effect mechanic, no Change-shaped stat",
  },
  "wizard:cruoromancer:blood-desecration:10": {
    archetypeId: "wizard:cruoromancer",
    name: "Blood Desecration",
    level: 10,
    bucket: "blocked",
    note: "grants a desecrate-infusion ability; 'replaces the 10th-level wizard bonus feat' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ), same atomic-partial-tier trap as reshape-bond above",
  },
  "wizard:cruoromancer:blood-ability:15": {
    archetypeId: "wizard:cruoromancer",
    name: "Blood Ability",
    level: 15,
    bucket: "blocked",
    note: "grants a scrying-through-undead ability; 'replaces the 15th-level wizard bonus feat' — same unpaired partial-tier Bonus Feats (WIZ) trap",
  },
  "wizard:cruoromancer:perfect-infusion:20": {
    archetypeId: "wizard:cruoromancer",
    name: "Perfect Infusion",
    level: 20,
    bucket: "blocked",
    note: "removes blood infusion's HP cost; the vendored text says this 'replaces the 20th-level wizard bonus spell' (likely a copy-paste inconsistency with the sibling entries' '...bonus feat' wording — see report) — either reading is an UNPAIRED removal from an atomic, unsuppressible wizard progression, so no number is backfilled",
  },

  "wizard:elder-mythos-scholar:arcane-bond:1": {
    archetypeId: "wizard:elder-mythos-scholar",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Arcane Bond ability (with a cosmetic 'inscribe eldritch runes' framing) — bond mechanic, no Change-shaped stat",
  },
  "wizard:elder-mythos-scholar:eldritch-grimoire:1": {
    archetypeId: "wizard:elder-mythos-scholar",
    name: "Eldritch Grimoire",
    level: 1,
    bucket: "subsystem",
    note: "+2 caster-level-check bonus and +1 save DC when casting from the grimoire — neither caster-level checks nor save DCs are targets the engine applies (targets.ts has no `cl` or DC target)",
  },
  "wizard:elder-mythos-scholar:eldritch-knowledge:1": {
    archetypeId: "wizard:elder-mythos-scholar",
    name: "Eldritch Knowledge",
    level: 1,
    bucket: "subsystem",
    note: "trades daily uses of a school ability to substitute Int for Wis on specific saves, with a nightmare drawback — a resource/ability substitution, no Change-shaped stat",
  },
  "wizard:elder-mythos-scholar:talisman-of-revealing:1": {
    archetypeId: "wizard:elder-mythos-scholar",
    name: "Talisman of Revealing",
    level: 1,
    bucket: "situational",
    note: "+2 circumstance bonus on Knowledge/Spellcraft checks, but only to identify a specific named list of Elder-Mythos-aligned creatures/effects — a real number scoped to a specific creature-identification context the engine can't check",
  },
  "wizard:elder-mythos-scholar:eldritch-infusion:8": {
    archetypeId: "wizard:elder-mythos-scholar",
    name: "Eldritch Infusion",
    level: 8,
    bucket: "subsystem",
    note: "a once-daily brewed elixir granting temporary ability-score/Perception swings — an activated, resource-gated consumable buff, same category as Archaeologist's Luck's exclusion in the hand-verified table",
  },

  "wizard:exploiter-wizard:arcane-reservoir:1": {
    archetypeId: "wizard:exploiter-wizard",
    name: "Arcane Reservoir",
    level: 1,
    bucket: "subsystem",
    note: "replaces arcane bond with the arcanist's arcane reservoir subsystem — grants an unrelated resource pool, no exploitable number (same posture as the Arcanist archetypes audited in the hand-verified table)",
  },
  "wizard:exploiter-wizard:exploiter-exploit:1": {
    archetypeId: "wizard:exploiter-wizard",
    name: "Exploiter Exploit",
    level: 1,
    bucket: "subsystem",
    note: "replaces arcane school with arcanist exploits — modifies/reworks arcane school mechanics (unsuppressible school-power grant path, rubric note 1), directly analogous to the arcanist School Savant precedent already documented",
  },

  "wizard:familiar-adept:diminished-expertise:1": {
    archetypeId: "wizard:familiar-adept",
    name: "Diminished Expertise",
    level: 1,
    bucket: "blocked",
    note: "removes Scribe Scroll's free-feat grant entirely and removes the Bonus Feats (WIZ) slices at 5th and 10th level (leaving 15th/20th untouched) — an UNPAIRED partial-tier removal from two atomic, unsuppressible wizard progressions (Scribe Scroll's flat +1 bonusFeats and Bonus Feats (WIZ)'s scaling formula both keep applying in full)",
  },
  "wizard:familiar-adept:familiar-spells:1": {
    archetypeId: "wizard:familiar-adept",
    name: "Familiar Spells",
    level: 1,
    bucket: "subsystem",
    note: "stores/prepares spells via the familiar instead of a spellbook (witch-style) — a spellbook mechanic, no Change-shaped stat",
  },
  "wizard:familiar-adept:focused-school:1": {
    archetypeId: "wizard:familiar-adept",
    name: "Focused School",
    level: 1,
    bucket: "subsystem",
    note: "lets the familiar use the wizard's 1st-level school power for free extra daily uses — a uses/day resource mechanic (no Change target for uses pools) applied to the familiar, not the wizard",
  },
  "wizard:familiar-adept:school-familiar:1": {
    archetypeId: "wizard:familiar-adept",
    name: "School Familiar",
    level: 1,
    bucket: "subsystem",
    note: "familiar gains the (unvendored) 'school familiar' archetype and delayed access to school powers — familiar/bond mechanic, no wizard-stat Change",
  },

  "wizard:first-world-caller:fey-familiar:1": {
    archetypeId: "wizard:first-world-caller",
    name: "Fey Familiar",
    level: 1,
    bucket: "subsystem",
    note: "changes familiar type/creature-type interactions, natural armor, and grants flight at 10th — all familiar-stat mechanics, not wizard Changes",
  },
  "wizard:first-world-caller:fey-summoner:1": {
    archetypeId: "wizard:first-world-caller",
    name: "Fey Summoner",
    level: 1,
    bucket: "subsystem",
    note: "grants Augment Summoning as a named bonus feat plus fey additions to the summon monster lists — spell-list/feat mechanic, no Change-shaped stat",
  },
  "wizard:first-world-caller:warp-reality:10": {
    archetypeId: "wizard:first-world-caller",
    name: "Warp Reality",
    level: 10,
    bucket: "subsystem",
    note: "applies planar-trait effects to the local area via a Charisma check — an environmental/area effect, no Change-shaped stat",
  },

  "wizard:hallowed-necromancer:arcane-school:1": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Arcane School",
    level: 1,
    bucket: "subsystem",
    note: "forces necromancy specialization and forbids creating undead — modifies arcane school mechanics (rubric note 1)",
  },
  "wizard:hallowed-necromancer:positive-touch:1": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Positive Touch",
    level: 1,
    bucket: "subsystem",
    note: "spontaneous cure-as-necromancy vs. undead, resource-gated (3 + Int mod/day) — activated ability, no baseline number",
  },
  "wizard:hallowed-necromancer:turn-undead:1": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Turn Undead",
    level: 1,
    bucket: "subsystem",
    note: "must select Turn Undead as the bonus feat tied to the necromancy school's Power Over Undead ability — a school-power-adjacent feat choice, no Change-shaped stat of its own",
  },
  "wizard:hallowed-necromancer:death-bane:5": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Death Bane",
    level: 5,
    bucket: "subsystem",
    note: "maximizes cure-spell damage vs. undead, raises save DCs by 1 vs. undead, and grants a resource-gated weapon-property buff — DCs/maximization aren't engine targets, and the weapon buff is activated/resource-gated",
  },
  "wizard:hallowed-necromancer:ghostbane:10": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Ghostbane",
    level: 10,
    bucket: "subsystem",
    note: "resource-gated ability to apply metamagic-like feats to spells targeting undead — activated ability, no baseline number",
  },
  "wizard:hallowed-necromancer:guarded-life:15": {
    archetypeId: "wizard:hallowed-necromancer",
    name: "Guarded Life",
    level: 15,
    bucket: "subsystem",
    note: "resource-gated reroll/damage-reduction ability vs. specific negative effects — activated ability, no baseline number",
  },

  "wizard:instructor:apprentice:1": {
    archetypeId: "wizard:instructor",
    name: "Apprentice",
    level: 1,
    bucket: "subsystem",
    note: "Leadership-cohort mechanic (an apprentice NPC) — no Change-shaped stat",
  },
  "wizard:instructor:trained-teamwork:5": {
    archetypeId: "wizard:instructor",
    name: "Trained Teamwork",
    level: 5,
    bucket: "subsystem",
    note: "widens the existing Bonus Feats (WIZ) pick-list to include teamwork feats (and mirrors the pick to the apprentice) without changing the underlying feat count/schedule — no numeric Change, and no composition trap since the atomic formula's total is untouched",
  },

  "wizard:pact-wizard-ff:aura:1": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "Aura",
    level: 1,
    bucket: "subsystem",
    note: "alignment-based cleric-style aura — no Change-shaped stat",
  },
  "wizard:pact-wizard-ff:familiar:1": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "Familiar",
    level: 1,
    bucket: "subsystem",
    note: "forces a familiar bond reporting to a patron — bond mechanic, no wizard-stat Change (rubric note 2)",
  },
  "wizard:pact-wizard-ff:pact-focus:1": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "Pact Focus",
    level: 1,
    bucket: "subsystem",
    note: "forces an additional opposition school (and forbids conjuration as one) — modifies arcane school mechanics (rubric note 1)",
  },
  "wizard:pact-wizard-ff:pact-summons:1": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "Pact Summons",
    level: 1,
    bucket: "subsystem",
    note: "grants Sacred Summons as a named, restricted-use bonus feat — no baseline number to model",
  },
  "wizard:pact-wizard-ff:pact:1": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "Pact",
    level: 1,
    bucket: "subsystem",
    note: "narrative patron-selection/alignment mechanic — no Change-shaped stat",
  },
  "wizard:pact-wizard-ff:true-form:7": {
    archetypeId: "wizard:pact-wizard-ff",
    name: "True Form",
    level: 7,
    bucket: "subsystem",
    note: "familiar transforms into an improved outsider familiar — familiar-stat mechanic, no wizard Change",
  },

  "wizard:pact-wizard-hhh:effortless-magic:1": {
    archetypeId: "wizard:pact-wizard-hhh",
    name: "Effortless Magic",
    level: 1,
    bucket: "subsystem",
    note: "reduces spell-preparation time — no preparation-time target exists in the engine",
  },
  "wizard:pact-wizard-hhh:patron-spells:1": {
    archetypeId: "wizard:pact-wizard-hhh",
    name: "Patron Spells",
    level: 1,
    bucket: "subsystem",
    note: "witch-style patron spell list added to the spellbook plus spontaneous casting of them — spell-list mechanic, no Change-shaped stat",
  },
  "wizard:pact-wizard-hhh:great-power-greater-expense:5": {
    archetypeId: "wizard:pact-wizard-hhh",
    name: "Great Power, Greater Expense",
    level: 5,
    bucket: "subsystem",
    note: "grants an oracle curse and a resource-gated roll-twice ability on checks/saves — activated ability plus a curse subsystem, no baseline always-on number",
  },

  "wizard:poleiheira-adherent:bonded-book:1": {
    archetypeId: "wizard:poleiheira-adherent",
    name: "Bonded Book",
    level: 1,
    bucket: "subsystem",
    note: "bonded spellbook variant granting extra spells learned per level and faster preparation — spellbook mechanic, no Change-shaped stat",
  },
  "wizard:poleiheira-adherent:great-odyssey:1": {
    archetypeId: "wizard:poleiheira-adherent",
    name: "Great Odyssey",
    level: 1,
    bucket: "subsystem",
    note: "replaces arcane school with a Mount spell-like ability and a ship-command ability — modifies/reworks arcane school mechanics (rubric note 1)",
  },

  "wizard:primalist:primal-magic:1": {
    archetypeId: "wizard:primalist",
    name: "Primal Magic",
    level: 1,
    bucket: "subsystem",
    note: "swift-action gamble to re-cast a prepared spell without expending it (risking a random 'primal magic event' on failure); replaces arcane bond — an activated, resource-gated, risk/reward mechanic, no baseline number",
  },
  "wizard:primalist:enhance-primal-magic-event:5": {
    archetypeId: "wizard:primalist",
    name: "Enhance Primal Magic Event",
    level: 5,
    bucket: "blocked",
    note: "lets the primalist adjust a primal magic event's CR; 'replaces the wizard bonus feat acquired at 5th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)",
  },
  "wizard:primalist:primal-surge:10": {
    archetypeId: "wizard:primalist",
    name: "Primal Surge",
    level: 10,
    bucket: "blocked",
    note: "grants SR-like resistance to primal magic events; 'replaces the wizard bonus feat acquired at 10th level' — same unpaired partial-tier Bonus Feats (WIZ) trap",
  },

  "wizard:runesage:runic-focus:1": {
    archetypeId: "wizard:runesage",
    name: "Runic Focus",
    level: 1,
    bucket: "subsystem",
    note: "an ioun-stone-like bonded focus granting Thassilonian-school spell slots and reduced material-component costs, explicitly WITHOUT granting that school's actual powers ('always functions as a universalist wizard') — a spellbook/bond mechanic with no Change-shaped stat, and no arcane-school composition gap since the ability itself disclaims the school powers",
  },

  "wizard:scroll-scholar:diligent-student:1": {
    archetypeId: "wizard:scroll-scholar",
    name: "Diligent Student",
    level: 1,
    bucket: "subsystem",
    note: "adds half class level (min 1) to a Knowledge skill of the player's choice, with more skills addable at 5th/10th/etc. — a real, clean formula, but the specific skill.<x> target is a per-player choice-list with no CharacterDoc field to record it (same free-choice bar that keeps Fighter's own player-chosen Weapon Training groups out of a fixed Change); replaces diviner's fortune/hand of the apprentice, neither of which carries a vendored Change to double-count against",
  },
  "wizard:scroll-scholar:secrets-revealed:5": {
    archetypeId: "wizard:scroll-scholar",
    name: "Secrets Revealed",
    level: 5,
    bucket: "blocked",
    note: "grants comprehend languages/identify as scaling spell-like abilities; 'replaces her bonus feat for 5th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)",
  },
  "wizard:scroll-scholar:flash-of-insight:10": {
    archetypeId: "wizard:scroll-scholar",
    name: "Flash of Insight",
    level: 10,
    bucket: "situational",
    note: "+5 bonus on a single attack roll, caster-level check, or saving throw, player's choice, once per day (more uses at 15th/20th) — a real number, but tied to a specific once-per-day declared roll rather than an always-on Change",
  },

  "wizard:scrollmaster:scroll-blade:1": {
    archetypeId: "wizard:scrollmaster",
    name: "Scroll Blade",
    level: 1,
    bucket: "subsystem",
    note: "wields a scroll as an enhancement-bonus short sword scaled to the highest-level spell on it; replaces arcane bond — an equipment/item-property mechanic, no wizard-stat Change",
  },
  "wizard:scrollmaster:scroll-shield:1": {
    archetypeId: "wizard:scrollmaster",
    name: "Scroll Shield",
    level: 1,
    bucket: "subsystem",
    note: "wields a scroll as an enhancement-bonus light shield, same mechanic as Scroll Blade — equipment/item-property mechanic, no wizard-stat Change",
  },
  "wizard:scrollmaster:improved-scroll-casting:10": {
    archetypeId: "wizard:scrollmaster",
    name: "Improved Scroll Casting",
    level: 10,
    bucket: "blocked",
    note: "lets the scrollmaster use his own DC/caster level when casting from a scroll; 'replaces the 10th-level wizard bonus feat' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)",
  },

  "wizard:shadowcaster:shadow-spells:1": {
    archetypeId: "wizard:shadowcaster",
    name: "Shadow Spells",
    level: 1,
    bucket: "subsystem",
    note: "prepares extra spells stored in the caster's shadow, usable only in dim/normal light; replaces arcane bond — a spell-preparation mechanic, no Change-shaped stat",
  },
  "wizard:shadowcaster:shadowsight:5": {
    archetypeId: "wizard:shadowcaster",
    name: "Shadowsight",
    level: 5,
    bucket: "blocked",
    note: "grants darkvision 60 ft.; 'replaces the shadowcaster's 5th-level wizard bonus feat' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ) (darkvision itself has no Change-shaped sense target modeled here either)",
  },
  "wizard:shadowcaster:shadowy-specialization:10": {
    archetypeId: "wizard:shadowcaster",
    name: "Shadowy Specialization",
    level: 10,
    bucket: "blocked",
    note: "increases shadow-conjuration/evocation-style spells' partial-effect percentage; 'replaces the shadowcaster's 10th-level wizard bonus feat' — same unpaired partial-tier Bonus Feats (WIZ) trap",
  },

  "wizard:siege-mage:empower-siege-engine:1": {
    archetypeId: "wizard:siege-mage",
    name: "Empower Siege Engine",
    level: 1,
    bucket: "situational",
    note: "attack/damage bonus on a bonded siege engine equal to (2x) the level of a spell sacrificed, but only on the next siege-engine attack before end of turn — a real number scoped to a specific action that round; replaces cantrips",
  },
  "wizard:siege-mage:siege-engine-bond:1": {
    archetypeId: "wizard:siege-mage",
    name: "Siege Engine Bond",
    level: 1,
    bucket: "subsystem",
    note: "replaces arcane bond with a remote siege-engine link — bond/equipment mechanic, no wizard-stat Change",
  },
  "wizard:siege-mage:siege-engineer:1": {
    archetypeId: "wizard:siege-mage",
    name: "Siege Engineer",
    level: 1,
    bucket: "subsystem",
    note: "grants Siege Engineer as a named bonus feat, replacing Scribe Scroll — Scribe Scroll's +1 bonusFeats represents an abstract free feat slot regardless of which specific feat fills it, so swapping the named feat doesn't change the bonusFeats count and isn't a composition trap; still not modeled as its own number since it's a fixed named-feat grant, same bar as other named-feat entries in this table",
  },
  "wizard:siege-mage:siege-school:1": {
    archetypeId: "wizard:siege-mage",
    name: "Siege School",
    level: 1,
    bucket: "subsystem",
    note: "widens opposition schools to three; modifies arcane school mechanics (rubric note 1)",
  },

  "wizard:spell-sage:focused-spells:1": {
    archetypeId: "wizard:spell-sage",
    name: "Focused Spells",
    level: 1,
    bucket: "subsystem",
    note: "1-3/day +4 caster-level boost for a single spell — an activated, resource-gated ability with no baseline number; already recorded (with empty `changes`, notes-only) in the hand-verified ARCHETYPE_FEATURE_EFFECTS table per the wizard-slice task instructions, so it is intentionally NOT duplicated in WIZARD_ARCHETYPE_EFFECTS_EXTRACTED",
  },
  "wizard:spell-sage:spell-study:2": {
    archetypeId: "wizard:spell-sage",
    name: "Spell Study",
    level: 2,
    bucket: "subsystem",
    note: "spontaneous bard/cleric/druid spellcasting by spending prepared slots; replaces arcane school — modifies/reworks arcane school mechanics (rubric note 1), also an activated resource-gated ability",
  },

  "wizard:spellbinder:spell-bond:1": {
    archetypeId: "wizard:spellbinder",
    name: "Spell Bond",
    level: 1,
    bucket: "subsystem",
    note: "swaps prepared spells for a pre-selected 'bonded spell' set; replaces arcane bond — a spell-preparation mechanic, no Change-shaped stat",
  },

  "wizard:spellslinger:arcane-gun:1": {
    archetypeId: "wizard:spellslinger",
    name: "Arcane Gun",
    level: 1,
    bucket: "subsystem",
    note: "casts ranged-touch/cone/line/ray spells through a firearm with misfire/overload risk; replaces arcane bond — an equipment/spellcasting-delivery mechanic, no wizard-stat Change",
  },
  "wizard:spellslinger:gunsmith:1": {
    archetypeId: "wizard:spellslinger",
    name: "Gunsmith",
    level: 1,
    bucket: "subsystem",
    note: "grants Gunsmithing as a named feat plus a starting firearm, replacing Scribe Scroll — same 'named feat swap doesn't change the bonusFeats count' reasoning as Siege Engineer above; not modeled as its own number",
  },
  "wizard:spellslinger:mage-bullets:1": {
    archetypeId: "wizard:spellslinger",
    name: "Mage Bullets",
    level: 1,
    bucket: "situational",
    note: "a temporary weapon-enhancement bonus (up to the sacrificed spell's level) on a firearm barrel, lasting minutes; replaces cantrips — a real number, but a temporary, player-triggered equipment buff rather than an always-on Change",
  },
  "wizard:spellslinger:school-of-the-gun:1": {
    archetypeId: "wizard:spellslinger",
    name: "School of the Gun",
    level: 1,
    bucket: "subsystem",
    note: "widens opposition schools to four; modifies arcane school mechanics (rubric note 1)",
  },

  "wizard:spirit-binder:arcane-school:1": {
    archetypeId: "wizard:spirit-binder",
    name: "Arcane School",
    level: 1,
    bucket: "subsystem",
    note: "forbids necromancy as an opposition school choice — modifies arcane school mechanics (rubric note 1)",
  },
  "wizard:spirit-binder:lost-talents:1": {
    archetypeId: "wizard:spirit-binder",
    name: "Lost Talents",
    level: 1,
    bucket: "blocked",
    note: "grants the familiar bonus feats at 1st/5th/every 5 levels thereafter; 'replaces Scribe Scroll and the wizard's bonus feats' with no stated schedule limit — an UNPAIRED removal of BOTH atomic, unsuppressible wizard progressions (Scribe Scroll's flat +1 and Bonus Feats (WIZ)'s full scaling formula) in favor of a benefit that accrues to the familiar, not the wizard; nothing is backfilled to avoid leaving the wizard's own bonusFeats total wrong in either direction",
  },
  "wizard:spirit-binder:soulbound-familiar:1": {
    archetypeId: "wizard:spirit-binder",
    name: "Soulbound Familiar",
    level: 1,
    bucket: "subsystem",
    note: "familiar personality/alignment/base-attack mechanic tied to a lost loved one; alters arcane bond — bond mechanic, no wizard-stat Change",
  },

  "wizard:spirit-whisperer:arcane-bond:1": {
    archetypeId: "wizard:spirit-whisperer",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "forces the familiar bond and stores spells via the familiar (witch-style); alters arcane bond and replaces spellbooks — bond/spellbook mechanic, no wizard-stat Change",
  },
  "wizard:spirit-whisperer:spirit-link:1": {
    archetypeId: "wizard:spirit-whisperer",
    name: "Spirit Link",
    level: 1,
    bucket: "blocked",
    note: "grants shaman spirit abilities using wizard level as shaman level; 'replaces arcane school and the bonus feat gained at 20th level' — modifies arcane school (rubric note 1, unsuppressible) AND is an UNPAIRED partial-tier removal of the 20th-level slice of Bonus Feats (WIZ); recorded as blocked for the bonus-feat half rather than guessed at",
  },
  "wizard:spirit-whisperer:spirit-hex:5": {
    archetypeId: "wizard:spirit-whisperer",
    name: "Spirit Hex",
    level: 5,
    bucket: "blocked",
    note: "lets the wizard pick a shaman hex at 5th/10th/15th level; 'each hex selected in this way replaces the bonus feat gained at that level' — an UNPAIRED partial-tier removal of three separate Bonus Feats (WIZ) slices (5th/10th/15th, leaving 20th intact)",
  },

  "wizard:sword-binder:arcane-bond:1": {
    archetypeId: "wizard:sword-binder",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "forces a sword as the bonded item, granting proficiency with it — bond mechanic, no wizard-stat Change",
  },
  "wizard:sword-binder:sword-of-the-mage:1": {
    archetypeId: "wizard:sword-binder",
    name: "Sword of the Mage",
    level: 1,
    bucket: "subsystem",
    note: "grants a restricted, expanded-uses version of Hand of the Apprentice tied to the bound sword — the uses/day formula (3 + Int mod + 1/2 level) has no Change target (uses pools aren't Changes), and the underlying Hand of the Apprentice class feature itself carries no vendored Change to double-count against",
  },
  "wizard:sword-binder:telekinetic-sword:10": {
    archetypeId: "wizard:sword-binder",
    name: "Telekinetic Sword",
    level: 10,
    bucket: "blocked",
    note: "telekinesis-style control of the bound sword plus clairaudience/clairvoyance; 'replaces the 10th level bonus feat' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)",
  },

  "wizard:undead-master:command-undead:1": {
    archetypeId: "wizard:undead-master",
    name: "Command Undead",
    level: 1,
    bucket: "subsystem",
    note: "grants Command Undead as a named bonus feat (with a resource-trade fallback) — no baseline number to model",
  },
  "wizard:undead-master:corpse-bond:1": {
    archetypeId: "wizard:undead-master",
    name: "Corpse Bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts the bonded item to bone material, or substitutes a corpse companion — bond mechanic, no wizard-stat Change",
  },
  "wizard:undead-master:necromantic-focus:1": {
    archetypeId: "wizard:undead-master",
    name: "Necromantic Focus",
    level: 1,
    bucket: "subsystem",
    note: "alignment restriction and a necromancy-opposition-school restriction — modifies arcane school mechanics (rubric note 1) plus a narrative alignment gate",
  },
  "wizard:undead-master:necropolitan:1": {
    archetypeId: "wizard:undead-master",
    name: "Necropolitan",
    level: 1,
    bucket: "situational",
    note: "+half wizard level (min 1) on Diplomacy/Knowledge checks 'regarding undead creatures', with a -2 penalty on such checks 'regarding living creatures' — real numbers, but scoped to the conversational/research SUBJECT MATTER of the check, which the engine has no way to check",
  },
  "wizard:undead-master:reanimator:1": {
    archetypeId: "wizard:undead-master",
    name: "Reanimator",
    level: 1,
    bucket: "subsystem",
    note: "adds necromancy spells to the spellbook with spontaneous-casting and reduced effective spell level for animate-dead-family spells — spell-list mechanic, no Change-shaped stat",
  },
  "wizard:undead-master:lich-loved:20": {
    archetypeId: "wizard:undead-master",
    name: "Lich-Loved",
    level: 20,
    bucket: "subsystem",
    note: "grants the undead sorcerer bloodline's 'one of us' ability — grants an unrelated bloodline power wholesale, no exploitable number of its own",
  },

  "wizard:wind-listener:arcane-school:1": {
    archetypeId: "wizard:wind-listener",
    name: "Arcane School",
    level: 1,
    bucket: "subsystem",
    note: "forbids divination/illusion as prohibited (opposition) schools — modifies arcane school mechanics (rubric note 1)",
  },
  "wizard:wind-listener:spontaneous-divination:1": {
    archetypeId: "wizard:wind-listener",
    name: "Spontaneous Divination",
    level: 1,
    bucket: "subsystem",
    note: "spontaneously casts divination spells by sacrificing a prepared spell of the same level; replaces arcane bond — a spellcasting-flexibility mechanic, no Change-shaped stat",
  },
  "wizard:wind-listener:abjuration-sense:5": {
    archetypeId: "wizard:wind-listener",
    name: "Abjuration Sense",
    level: 5,
    bucket: "blocked",
    note: "+half level bonus to notice/identify abjuration effects (a real number, but scoped to one specific spell school — would be situational on its own); 'replaces the bonus feat gained at 5th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ), which takes priority as the composition trap over the ordinary scoping issue",
  },
  "wizard:wind-listener:wispy-form:10": {
    archetypeId: "wizard:wind-listener",
    name: "Wispy Form",
    level: 10,
    bucket: "blocked",
    note: "grants DR 10/magic and greater invisibility for level rounds/day; 'replaces the bonus feat gained at 10th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ) (DR/invisibility themselves would also need per-round activation tracking this engine doesn't do)",
  },
  "wizard:wind-listener:listening-to-the-wind:15": {
    archetypeId: "wizard:wind-listener",
    name: "Listening to the Wind",
    level: 15,
    bucket: "blocked",
    note: "a once-per-week legend-lore-as-downtime-research ability; 'replaces the bonus feat gained at 15th level' — an UNPAIRED partial-tier removal from Bonus Feats (WIZ)",
  },

  "wizard:worldseeker:arcane-bond:1": {
    archetypeId: "wizard:worldseeker",
    name: "Arcane Bond",
    level: 1,
    bucket: "subsystem",
    note: "restates the base Arcane Bond ability verbatim with no stated mechanical change — bond mechanic, no Change-shaped stat (rubric note 2)",
  },
  "wizard:worldseeker:planar-associates:1": {
    archetypeId: "wizard:worldseeker",
    name: "Planar Associates",
    level: 1,
    bucket: "subsystem",
    note: "forces a familiar bond, later an outsider Improved Familiar, plus scaling planar-ally spells-known — familiar/spell-list mechanic, no wizard-stat Change",
  },
  "wizard:worldseeker:walk-the-planes:1": {
    archetypeId: "wizard:worldseeker",
    name: "Walk the Planes",
    level: 1,
    bucket: "numeric",
    note: "flat, unconditional +2 bonus to a single fixed skill (Knowledge (planes)) plus a constant endure elements effect — the skill half is a clean, always-on Change; endure elements has no engine target and is dropped (flagged in detail)",
  },
  "wizard:worldseeker:planar-adaptation:8": {
    archetypeId: "wizard:worldseeker",
    name: "Planar Adaptation",
    level: 8,
    bucket: "subsystem",
    note: "constant protection from planar environmental effects, later extended to nearby allies — an environmental-immunity mechanic, no Change-shaped stat",
  },
  "wizard:worldseeker:planar-redoubt:15": {
    archetypeId: "wizard:worldseeker",
    name: "Planar Redoubt",
    level: 15,
    bucket: "subsystem",
    note: "creates a personal demiplane retreat — a utility/downtime ability, no Change-shaped stat",
  },
};

/**
 * ── WIZARD_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────────
 *
 * Machine-extracted mechanical effects for wizard archetype class features
 * (issue #45's wizard slice). Clean-room from the published PF1 rules — the
 * vendored prose this was extracted from (`archetype-features.json`) is OGL,
 * so reading it is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Both tables resolve through
 * `resolveArchetypeFeatureEffect`, which always checks the hand-verified
 * table FIRST. `wizard:spell-sage:focused-spells:1` already lives in the
 * hand-verified table (with an empty `changes` array — notes-only) and is
 * intentionally NOT duplicated here.
 *
 * Wizard's numeric yield is much smaller than fighter's: of the 108 vendored
 * features, only ONE cleared the `numeric` bar (see
 * `WIZARD_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full accounting of
 * why the rest landed in `situational`/`subsystem`/`blocked`) — wizard
 * archetypes overwhelmingly trade bonded-item/familiar/school/spellbook
 * subsystems and un-suppressible atomic bonus-feat tiers for one another,
 * rather than granting fresh always-on stat bonuses the way fighter's
 * armor-training/weapon-training reflavors do.
 */
export const WIZARD_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  "wizard:worldseeker:walk-the-planes:1": {
    changes: [c("2", "skill.kpl")],
    detail: () => "+2 Knowledge (planes); constant endure elements not modeled",
    confidence: "high",
    provenance:
      "A worldseeker learns every plane's place in the Great Beyond and trains to survive even on the " +
      "harshest of them. She gains a +2 bonus on Knowledge (planes) checks and is constantly under the " +
      "effects of endure elements.",
  },
};
