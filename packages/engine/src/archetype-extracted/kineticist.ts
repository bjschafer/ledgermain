/**
 * Kineticist's slice of the pipeline (2026-08-08). Kineticist carries the
 * deepest bespoke engine support of any class in this repo — kinetic blasts
 * (`kinetic-blast.ts`), form/substance infusions and their burn/DC math
 * (`kineticist-infusions.ts`, `INFUSION_BLAST_EFFECTS`), elemental defense's
 * burn-investment scaling (`kineticist-defense.ts`, riding
 * `live.kineticistDefenseBurn`), elemental overflow (a live-burn-dependent
 * attack/damage rider computed in `kinetic-blast.ts`/`tables.ts`, not a
 * `Change`), and internal buffer/gather power/infusion specialization's own
 * hardcoded burn arithmetic (`tables.ts`'s `internalBufferMax`,
 * `kineticist-infusions.ts`'s `gatherPowerReduction`/
 * `infusionSpecializationReduction`). None of that arithmetic is `Change`-
 * driven — it's plain TypeScript reading `doc.live`/class level directly — so
 * an archetype feature that reshapes any of it cannot be expressed as a
 * `Change` without conflicting with (or double-counting against) that
 * hardcoded math. Every such feature below is bucketed `blocked`, with a note
 * naming the specific file/function that would need a hook. This is by far
 * the largest blocked category in this file, and is expected: it is exactly
 * the surface the class's bespoke support was built for, not a gap in this
 * pass's effort.
 *
 * ── Kineticist-specific mechanical facts this pass relies on ──────────────
 *
 * 1. **Wild talents are a modeled pick-list** (`kineticist-wild-talents.ts`,
 *    `INFUSION_BLAST_EFFECTS`). A feature that merely GRANTS or SWAPS a known
 *    infusion/utility talent (even a brand-new homebrew one not in the
 *    catalog) is `subsystem` — the same posture magus arcana / rogue talents
 *    get elsewhere in this pipeline. Only a feature that rewrites the
 *    underlying burn/damage/DC ARITHMETIC those talents run on is `blocked`.
 * 2. **Kinetic blast attack/damage lines DO read the generic modifier
 *    pipeline** (`kinetic-blast.ts`'s `blastLine`, via
 *    `forTarget(collected, "attack.weapon.kinetic-blast")` /
 *    `"damage.weapon.kinetic-blast"`, alongside the untargeted "attack"/
 *    "damage" pulls every other attack line reads). A flat, unconditional
 *    attack or damage bonus to kinetic blasts specifically IS therefore
 *    extractable via `Change` on those two targets — this is the one place a
 *    "kinetic blast" number clears the bar despite the rest of the class's
 *    bespoke posture (see Overwhelming Power below).
 * 3. **Composite/simple blast CATALOG changes are blocked, not subsystem.**
 *    `kineticist-elements.ts`'s `KINETICIST_ELEMENTS`/`COMPOSITE_BLAST_LIST`
 *    are closed, hand-authored tables (full parity with the vendored 22
 *    composites). A homebrew blast an archetype invents (a new simple blast
 *    replacing an element's normal one, a new composite blast, or a
 *    non-associated-element substitution) has no catalog row and no
 *    `damageType`/`descriptor` this engine can resolve — `blocked`, citing
 *    `kineticist-elements.ts` as the file needing a new entry.
 * 4. **Elemental Defense's burn-investment scaling
 *    (`kineticist-defense.ts`)** is resolved per-element from
 *    `live.kineticistDefenseBurn`, not `Change`. A feature that changes which
 *    element grants a defense, delays its level gate, changes its formula, or
 *    invents an analogous burn-scaled defense mechanic is `blocked`, citing
 *    `kineticist-defense.ts`.
 * 5. **Key-ability-score swaps** (several archetypes replace Constitution
 *    with Strength/Intelligence/Wisdom/Charisma for wild-talent damage, DCs,
 *    durations, and concentration checks) have no `Change` mechanism at all —
 *    `kinetic-blast.ts`'s `kineticBlastConDamage` and
 *    `kineticist-infusions.ts`'s `wildTalentSaveDc`/`infusionSaveAbility` all
 *    hardcode Constitution (or Dexterity, for form infusions). `blocked`,
 *    citing those functions.
 * 6. **Burn's own cap and cost arithmetic**
 *    (`GJQ0VVH3rishb9X1`'s vendored `uses.maxFormula: "3 + @abilities.con.mod"`,
 *    `kineticist-infusions.ts`'s `gatherPowerReduction`/
 *    `infusionSpecializationReduction`, and `tables.ts`'s
 *    `internalBufferMax`) is the same "pool size is vendored, not a `Change`"
 *    trap this pipeline's other classes hit with spell/power points —
 *    `blocked` whenever a feature changes the cap, the per-round accept
 *    limit, or a reduction formula. The Psychokinetcist's Mind Burn (which
 *    swaps the burn cap to `@abilities.wis.mod` and its nonlethal penalty for
 *    a stacking Will/Wisdom penalty) is ALREADY hand-wired outside this
 *    pipeline entirely (`resources.ts`'s `isPsychokinetcist` branch,
 *    `tables.ts`'s `mindBurnDetailLabel`) — recorded here as `blocked` too,
 *    since a `Change` would conflict with that bespoke code, not because
 *    nothing exists for it.
 * 7. **Elemental Overflow's attack/damage bonus** (`tables.ts`'s
 *    `kineticOverflowBonus`) is a pure function of class level and
 *    `doc.live` burn held, called directly from `kinetic-blast.ts` — not a
 *    `Change`, and not exposed to the formula DSL via any roll-data path.
 *    Its published ability-score-boost/crit-negation upgrades (6th/11th/16th)
 *    are ALREADY display-only in the base class (`tables.ts`'s
 *    `kineticOverflowLabel`'s sibling, never wired as `Change`), so an
 *    archetype reflavor of them isn't suppressing anything modeled either way.
 *    A feature that rewires overflow's basis (what it scales with, whether it
 *    grants ability bonuses at all) is `blocked`, citing `kinetic-blast.ts`/
 *    `tables.ts`. The Psychokinetcist's Mental Overflow reflavor already has
 *    a prose-only entry in `archetype-effects.ts` (`changes: []`) for exactly
 *    this reason.
 *
 * Every `numeric` and `blocked` entry below carries its reasoning in
 * `KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION`'s own `note`, or in
 * `KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED`'s `provenance`/comments. All 86
 * vendored kineticist archetype features (19 archetypes) were read in full;
 * only 5 cleared the `numeric` bar, three of them partial extractions of a
 * multi-clause feature (the rest of each clause dropped and noted) rather
 * than whole-feature grants.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── kineticist:aquakinetcist ──
  "kineticist:aquakinetcist:aquatic-focus:1": {
    archetypeId: "kineticist:aquakinetcist",
    name: "Aquatic Focus",
    level: 1,
    bucket: "subsystem",
    note: "forces water as primary AND both expanded elements, and water blast as the first simple blast — a pure element-selection restriction, no number",
  },
  "kineticist:aquakinetcist:basis-aquakinesis:1": {
    archetypeId: "kineticist:aquakinetcist",
    name: "Basis Aquakinesis",
    level: 1,
    bucket: "subsystem",
    note: "replaces the basic hydrokinesis utility talent with a buoyancy-control SLA — pick-list swap, no baseline number",
  },
  "kineticist:aquakinetcist:call-of-the-deep:2": {
    archetypeId: "kineticist:aquakinetcist",
    name: "Call of the Deep",
    level: 2,
    bucket: "subsystem",
    note: "grants specific bonus utility wild talents (waterdancer, watersense) at fixed levels — pick-list grant, no flat number",
  },
  "kineticist:aquakinetcist:ice-propagation:7": {
    archetypeId: "kineticist:aquakinetcist",
    name: "Ice Propagation",
    level: 7,
    bucket: "blocked",
    note: "lets composite-blast infusions apply to a simple cold blast underwater — a blast-mechanics rule change with no Change target; would need a hook in kinetic-blast.ts/kineticist-elements.ts",
  },
  "kineticist:aquakinetcist:ocean-s-caress:2": {
    archetypeId: "kineticist:aquakinetcist",
    name: "Ocean's Caress",
    level: 2,
    bucket: "blocked",
    note: "replaces the elemental defense wild talent entirely with a bespoke cold-resistance/pressure-adaptation mechanic (burn-scaled, up to cold immunity) — kineticist-defense.ts's per-element defense table has no water-substitute row; would need a new resolveKineticistDefense case",
  },

  // ── kineticist:arakineticist ──
  "kineticist:arakineticist:accursed-infusion:13": {
    archetypeId: "kineticist:arakineticist",
    name: "Accursed Infusion",
    level: 13,
    bucket: "subsystem",
    note: "grants a new substance infusion (curse/bestow-curse-flavored) in place of a utility wild talent — pick-list addition, no baseline number (class note 1)",
  },
  "kineticist:arakineticist:accursed-shadow:4": {
    archetypeId: "kineticist:arakineticist",
    name: "Accursed Shadow",
    level: 4,
    bucket: "numeric",
    note: "flat, unconditional save bonus vs. death effects AND necromancy spells, both expressible via Change.saveCategories (['death', 'necromancy'])",
  },
  "kineticist:arakineticist:curse-spinner:6": {
    archetypeId: "kineticist:arakineticist",
    name: "Curse Spinner",
    level: 6,
    bucket: "subsystem",
    note: "remove curse (6th) and bestow curse (8th), each costed in accepted burn rather than a day/week counter — cross-pool spend, counted as utility wild talents",
  },
  "kineticist:arakineticist:living-curse:1": {
    archetypeId: "kineticist:arakineticist",
    name: "Living Curse",
    level: 1,
    bucket: "subsystem",
    note: "forces void as primary element and negative blast as the first simple blast — element-selection restriction, no number",
  },

  // ── kineticist:blightburner ──
  "kineticist:blightburner:blightburn-aura:2": {
    archetypeId: "kineticist:blightburner",
    name: "Blightburn Aura",
    level: 2,
    bucket: "subsystem",
    note: "deals fire damage to an ATTACKER equal to (a multiple of) elemental overflow's bonus — damage dealt to someone else has no applied target, the same posture kineticist-defense.ts's Searing Flesh stays display-only for; the ability-score-boost/earth-defense removal it also carries suppresses nothing this engine models as a Change (both are already display-only)",
  },
  "kineticist:blightburner:blightburn-manipulation:1": {
    archetypeId: "kineticist:blightburner",
    name: "Blightburn Manipulation",
    level: 1,
    bucket: "subsystem",
    note: "replaces the basic geokinesis utility talent with a radiation/heat SLA — pick-list swap, no number",
  },
  "kineticist:blightburner:earth-focus:1": {
    archetypeId: "kineticist:blightburner",
    name: "Earth Focus",
    level: 1,
    bucket: "subsystem",
    note: "forces earth as the elemental focus — restriction, no number",
  },
  "kineticist:blightburner:radiation-absorption:2": {
    archetypeId: "kineticist:blightburner",
    name: "Radiation Absorption",
    level: 2,
    bucket: "subsystem",
    note: "reactive burn-spend to reduce ability damage specifically from radiation — a narrow new use for burn, not a change to burn's own cap/cost arithmetic; activated and situational, no baseline sheet number",
  },
  "kineticist:blightburner:radiation-resistance:6": {
    archetypeId: "kineticist:blightburner",
    name: "Radiation Resistance",
    level: 6,
    bucket: "blocked",
    note: "explicitly 'alters gather power and internal buffer' — a burn-reduction/buffer-cap arithmetic change; would need hooks in kineticist-infusions.ts's gatherPowerReduction and tables.ts's internalBufferMax. The accompanying save bonus (scaled to elemental overflow's bonus, itself not exposed to the formula DSL) against 'radiation' also has no matching save category",
  },

  // ── kineticist:blighted-defiler ──
  "kineticist:blighted-defiler:elemental-might:1": {
    archetypeId: "kineticist:blighted-defiler",
    name: "Elemental Might",
    level: 1,
    bucket: "blocked",
    note: "swaps the key ability score for wild talents from Constitution to Strength (no Change mechanism; kinetic-blast.ts's kineticBlastConDamage hardcodes Con) AND rewrites elemental overflow's whole basis (burn total + steal-power uses, no size bonuses/crit negation) — would need hooks in kinetic-blast.ts/tables.ts",
  },
  "kineticist:blighted-defiler:life-buffer:6": {
    archetypeId: "kineticist:blighted-defiler",
    name: "Life Buffer",
    level: 6,
    bucket: "subsystem",
    note: "replaces internal buffer wholesale with an unrelated steal-power-fueled resource (cap 1/2/3 by level) — a brand-new, self-contained pool this engine doesn't model, not a modification of internalBufferMax (the base feature it replaces carries no Change to double-count)",
  },
  "kineticist:blighted-defiler:steal-life:20": {
    archetypeId: "kineticist:blighted-defiler",
    name: "Steal Life",
    level: 20,
    bucket: "subsystem",
    note: "activated, resource-gated save-or-die tied to gather power/steal power — no passive number",
  },
  "kineticist:blighted-defiler:steal-power:1": {
    archetypeId: "kineticist:blighted-defiler",
    name: "Steal Power",
    level: 1,
    bucket: "blocked",
    note: "explicitly 'alters gather power' — grants extra burn-reduction options tied to a new daily resource; would need a hook in kineticist-infusions.ts's gatherPowerReduction",
  },
  "kineticist:blighted-defiler:stolen-strength:6": {
    archetypeId: "kineticist:blighted-defiler",
    name: "Stolen Strength",
    level: 6,
    bucket: "situational",
    note: "real size bonuses to physical ability scores, but conditioned on how many times steal power succeeded that day — a daily resource-use counter this engine doesn't track",
  },

  // ── kineticist:blood-kineticist ──
  "kineticist:blood-kineticist:bleeding-infusion:5": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Bleeding Infusion",
    level: 5,
    bucket: "subsystem",
    note: "grants a new substance infusion (bleed damage) in place of the 5th-level infusion — pick-list swap, no baseline number (class note 1)",
  },
  "kineticist:blood-kineticist:blood-blast:7": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Blood Blast",
    level: 7,
    bucket: "blocked",
    note: "grants a homebrew 'blood blast' composite blast in place of cold/ice on the first expansion into water — no catalog row in kineticist-elements.ts's COMPOSITE_BLAST_LIST and no damage type this engine can resolve; would need a new entry there (class note 3)",
  },
  "kineticist:blood-kineticist:blood-focus:2": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Blood Focus",
    level: 2,
    bucket: "subsystem",
    note: "forces water as primary element/first simple blast and restricts this archetype's infusions to bleeding targets — restriction, no number",
  },
  "kineticist:blood-kineticist:blood-mastery:20": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Blood Mastery",
    level: 20,
    bucket: "numeric",
    note: "of the compound immunity grant, only 'immune to bleed' matches the closed immEffect vocabulary exactly (immEffect.bleed); 'injected poisons'/'injury diseases' are narrower than the available poison/disease slugs (using those would over-claim full immunity), the sickened/nauseated conditions and the nuanced non-aging clause have no matching slug — all dropped rather than guessed",
  },
  "kineticist:blood-kineticist:blood-tell:6": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Blood Tell",
    level: 6,
    bucket: "subsystem",
    note: "grants a fixed utility wild talent (blood biography analog) — pick-list grant, no number",
  },
  "kineticist:blood-kineticist:blood-throw:8": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Blood Throw",
    level: 8,
    bucket: "subsystem",
    note: "grants the foe throw infusion as a bonus, usable with additional blast types — pick-list grant, no number",
  },
  "kineticist:blood-kineticist:gut-wrenching-infusion:9": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Gut-Wrenching Infusion",
    level: 9,
    bucket: "subsystem",
    note: "grants a new substance infusion (sickened) in place of the 9th-level infusion — pick-list swap, no baseline number",
  },
  "kineticist:blood-kineticist:vampiric-infusion:11": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Vampiric Infusion",
    level: 11,
    bucket: "subsystem",
    note: "grants a new substance infusion tied to the (unrelated-pick) kinetic healer utility talent — pick-list swap, no baseline number",
  },
  "kineticist:blood-kineticist:wrack:1": {
    archetypeId: "kineticist:blood-kineticist",
    name: "Wrack",
    level: 1,
    bucket: "subsystem",
    note: "grants a new form infusion (half/quarter untyped damage) in place of the 1st-level infusion — pick-list swap, no baseline number",
  },

  // ── kineticist:cinderlands-adept ──
  "kineticist:cinderlands-adept:fire-focus:1": {
    archetypeId: "kineticist:cinderlands-adept",
    name: "Fire Focus",
    level: 1,
    bucket: "subsystem",
    note: "forces fire as the elemental focus and locks expanded element to fire — restriction, no number",
  },
  "kineticist:cinderlands-adept:galloping-siphon:1": {
    archetypeId: "kineticist:cinderlands-adept",
    name: "Galloping Siphon",
    level: 1,
    bucket: "subsystem",
    note: "grants Mounted Combat as a NAMED bonus feat (not a count — subsystem, same posture as other named-feat grants in this pipeline); the accompanying scaling bonus is on concentration checks, which isn't an applied target, and the fire resistance is mount-scoped and gather-power-duration-dependent",
  },
  "kineticist:cinderlands-adept:mount:4": {
    archetypeId: "kineticist:cinderlands-adept",
    name: "Mount",
    level: 4,
    bucket: "subsystem",
    note: "grants a druid-style animal companion mount, horse/pony, kineticist level -3 — wired via COMPANION_EFFECT_ARCHETYPE_FEATURES onto the tracked companion's stat block (species restriction unenforced, same as every other companion source)",
  },

  // ── kineticist:dark-elementalist ──
  "kineticist:dark-elementalist:dark-studies:1": {
    archetypeId: "kineticist:dark-elementalist",
    name: "Dark Studies",
    level: 1,
    bucket: "blocked",
    note: "reassigns which of the kineticist's three base saves is 'good' (Will good, Fort/Ref poor) — a base-save-PROGRESSION swap, not an additive bonus, and would conflict with tables.ts's hardcoded per-class save tier; also swaps the key ability score for wild talents (Con to Int, no Change mechanism) and grants all Knowledge skills as class skills (not Change-expressible)",
  },
  "kineticist:dark-elementalist:soul-power:1": {
    archetypeId: "kineticist:dark-elementalist",
    name: "Soul Power",
    level: 1,
    bucket: "blocked",
    note: "caps total burn at 3 (a Burn resource-cap override — GJQ0VVH3rishb9X1's vendored '3 + Con mod' uses.maxFormula would need a hook) and rewrites elemental overflow's basis to count soul-power uses instead of current burn — would need hooks in resources.ts/kinetic-blast.ts",
  },

  // ── kineticist:elemental-annihilator ──
  "kineticist:elemental-annihilator:blast-training:5": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Blast Training",
    level: 5,
    bucket: "blocked",
    note: "SUSPECTED VENDORED-DATA COPY-PASTE ERROR: the description is the base kineticist Infusion class feature's rules text verbatim (level-1/3/5/9/11/13/17/19 infusion progression, replace-an-infusion-at-5th/11th/17th), not anything named 'Blast Training' or scoped to 5th level as the id implies — recorded rather than guessed at",
  },
  "kineticist:elemental-annihilator:bonus-feat:2": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Bonus Feat",
    level: 2,
    bucket: "numeric",
    note: "flat bonus-feat COUNT (1 at 2nd, +1 each at 8th/10th/14th/18th, total 5) from a restricted list — the list restriction isn't modeled, only the count, same posture as this pipeline's other hand-verified bonus-feat-count precedents",
  },
  "kineticist:elemental-annihilator:dampened-versatility:1": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Dampened Versatility",
    level: 1,
    bucket: "subsystem",
    note: "pure restriction ('can never gain utility wild talents'), no number",
  },
  "kineticist:elemental-annihilator:devastating-infusion:1": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Devastating Infusion",
    level: 1,
    bucket: "blocked",
    note: "replaces the whole kinetic blast damage FORMULA with a fixed 1d8+Con (regardless of class level or composite blasts) and explicitly excludes elemental overflow's damage bonus — a blast-damage-arithmetic override; would need a hook in kinetic-blast.ts's blastLine",
  },
  "kineticist:elemental-annihilator:ever-present-threat:4": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Ever-Present Threat",
    level: 4,
    bucket: "subsystem",
    note: "grants an attack-of-opportunity trigger using devastating infusion (itself blocked, see devastating-infusion:1) — no additional number at this id, just a triggered-action grant",
  },
  "kineticist:elemental-annihilator:flurry-of-devastation:6": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Flurry of Devastation",
    level: 6,
    bucket: "blocked",
    note: "a full-attack extension of devastating infusion (itself blocked) with its own off-hand Con-to-damage rule for Two-Weapon Fighting — the same kinetic-blast.ts blastLine hook devastating-infusion:1 needs",
  },
  "kineticist:elemental-annihilator:increased-range:3": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Increased Range",
    level: 3,
    bucket: "subsystem",
    note: "grants the extended range / extreme range infusions at fixed levels — pick-list grant, no baseline number",
  },
  "kineticist:elemental-annihilator:omnicide:20": {
    archetypeId: "kineticist:elemental-annihilator",
    name: "Omnicide",
    level: 20,
    bucket: "blocked",
    note: "a unique five-element composite blast with fixed damage — no catalog row in kineticist-elements.ts's COMPOSITE_BLAST_LIST (class note 3)",
  },

  // ── kineticist:elemental-ascetic ──
  "kineticist:elemental-ascetic:ac-bonus:2": {
    archetypeId: "kineticist:elemental-ascetic",
    name: "AC Bonus",
    level: 2,
    bucket: "numeric",
    note: "monk-style Wisdom-to-AC/CMD while unarmored, shieldless, and unencumbered — @armor.type, @shield.type, and @attributes.encumbrance.level are all checkable (the same three axes the vendored monk AC Bonus Change itself gates on); only the immobilized/helpless exclusion is dropped, matching that same vendored Change's own omission. Replaces elemental defense",
  },
  "kineticist:elemental-ascetic:elemental-flurry:1": {
    archetypeId: "kineticist:elemental-ascetic",
    name: "Elemental Flurry",
    level: 1,
    bucket: "blocked",
    note: "rewires kinetic blast to require kinetic fist and enable a monk-style flurry of blows, sets kinetic fist's burn cost to 0, and forbids most ranged-attack-roll form infusions — a blast-usage-mechanics override; would need hooks in kinetic-blast.ts/kineticist-infusions.ts. Also replaces elemental overflow entirely",
  },
  "kineticist:elemental-ascetic:elemental-wisdom:1": {
    archetypeId: "kineticist:elemental-ascetic",
    name: "Elemental Wisdom",
    level: 1,
    bucket: "blocked",
    note: "swaps the key ability score for wild-talent DCs/durations/concentration from Constitution to Wisdom — no Change mechanism; would need a hook in kineticist-infusions.ts's wildTalentSaveDc/infusionSaveAbility",
  },
  "kineticist:elemental-ascetic:powerful-fist:5": {
    archetypeId: "kineticist:elemental-ascetic",
    name: "Powerful Fist",
    level: 5,
    bucket: "blocked",
    note: "raises kinetic fist's damage die (d6 to d8/d10/d12) for extra burn — an infusion-damage-formula override; would need a hook in kineticist-infusions.ts/kinetic-blast.ts",
  },

  // ── kineticist:elemental-purist ──
  "kineticist:elemental-purist:elemental-apocalypse:20": {
    archetypeId: "kineticist:elemental-purist",
    name: "Elemental Apocalypse",
    level: 20,
    bucket: "subsystem",
    note: "grants a new homebrew universal form infusion (1/day) — pick-list addition, no baseline number (class note 1)",
  },
  "kineticist:elemental-purist:elemental-impossibility:7": {
    archetypeId: "kineticist:elemental-purist",
    name: "Elemental Impossibility",
    level: 7,
    bucket: "subsystem",
    note: "grants a composite blast plus access to non-associated infusions via a burn-activated state — pick-list widening, no flat number",
  },
  "kineticist:elemental-purist:internal-buffer:11": {
    archetypeId: "kineticist:elemental-purist",
    name: "Internal Buffer",
    level: 11,
    bucket: "subsystem",
    note: "restates the base Internal Buffer ability's rules text verbatim (its actual 5-level delay is Limited Buffer's job, blocked separately below) — nothing new to extract at this id",
  },
  "kineticist:elemental-purist:limited-buffer:6": {
    archetypeId: "kineticist:elemental-purist",
    name: "Limited Buffer",
    level: 6,
    bucket: "blocked",
    note: "delays internal buffer to 11th level and treats kineticist level as 5 lower for its capacity — tables.ts's internalBufferMax has no level-offset parameter; would need a hook there",
  },

  // ── kineticist:elysiokineticist ──
  "kineticist:elysiokineticist:basic-elysiokinesis:1": {
    archetypeId: "kineticist:elysiokineticist",
    name: "Basic Elysiokinesis",
    level: 1,
    bucket: "subsystem",
    note: "grants at-will SLAs (resistance/stabilize/virtue) — utility grant, no number",
  },
  "kineticist:elysiokineticist:elysian-aura:2": {
    archetypeId: "kineticist:elysiokineticist",
    name: "Elysian Aura",
    level: 2,
    bucket: "blocked",
    note: "a scaling AC/save bonus invested via accepted burn (structurally identical to kineticist-defense.ts's per-element burn-investment defenses, but a new one — no live field records burn invested here), AND scoped to 'attacks from evil creatures' specifically, an enemy-alignment condition this engine can't check",
  },
  "kineticist:elysiokineticist:elysian-infusion:1": {
    archetypeId: "kineticist:elysiokineticist",
    name: "Elysian Infusion",
    level: 1,
    bucket: "subsystem",
    note: "grants a new substance infusion (damages evil outsiders as undead, adds alignment descriptors) — pick-list addition, no baseline number",
  },
  "kineticist:elysiokineticist:elysium-s-soul:1": {
    archetypeId: "kineticist:elysiokineticist",
    name: "Elysium's Soul",
    level: 1,
    bucket: "subsystem",
    note: "bundle of element/blast restrictions, alignment requirement, an alignment aura (no applied target), class-skill swaps, and fixed wild-talent/blast grants at 7th/15th — no clean flat number anywhere in the bundle",
  },
  "kineticist:elysiokineticist:ghaelelight-blast:15": {
    archetypeId: "kineticist:elysiokineticist",
    name: "Ghaelelight Blast",
    level: 15,
    bucket: "blocked",
    note: "grants a homebrew 'ghaelelight' composite blast (chaotic/good energy damage) — no catalog row in kineticist-elements.ts's COMPOSITE_BLAST_LIST (class note 3)",
  },

  // ── kineticist:ioun-kineticist ──
  "kineticist:ioun-kineticist:azlanti-blast:7": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Azlanti Blast",
    level: 7,
    bucket: "blocked",
    note: "replaces the force composite blast with a homebrew 'Azlanti blast' (physical, player-chosen damage type) — no catalog row in kineticist-elements.ts's COMPOSITE_BLAST_LIST (class note 3)",
  },
  "kineticist:ioun-kineticist:basic-iounkinesis:1": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Basic Iounkinesis",
    level: 1,
    bucket: "subsystem",
    note: "grants an ioun-stone manipulation ability plus at-will prestidigitation — utility grant, no number",
  },
  "kineticist:ioun-kineticist:ioun-buffer:6": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Ioun Buffer",
    level: 6,
    bucket: "blocked",
    note: "functions as internal buffer (same tables.ts internalBufferMax cap) PLUS an item-market-price-dependent extra burn reduction (2/3/4 points based on a specific ioun stone's gp value) — item-value-dependent arithmetic with no Change target; would need a hook in tables.ts/kineticist-infusions.ts",
  },
  "kineticist:ioun-kineticist:ioun-cloud:1": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Ioun Cloud",
    level: 1,
    bucket: "subsystem",
    note: "grants specific magic items (dull gray ioun stones) with item-level AC/hardness scaling, and gates gather power/kinetic blast on holding one — item mechanics and an activation gate, no character-sheet number",
  },
  "kineticist:ioun-kineticist:ioun-focus:1": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Ioun Focus",
    level: 1,
    bucket: "subsystem",
    note: "forces aether as elemental focus and reflavors/restricts which infusions and utility talents are available — pick-list restriction/reflavor, no number",
  },
  "kineticist:ioun-kineticist:personal-resonance:6": {
    archetypeId: "kineticist:ioun-kineticist",
    name: "Personal Resonance",
    level: 6,
    bucket: "subsystem",
    note: "grants burn-gated access to specific ioun stones' resonant powers, and can raise a stone's own ability-score enhancement bonus — item-dependent (which stones are owned/orbiting) with a player choice of which ability score, no baseline character number",
  },

  // ── kineticist:kinetic-chirurgeon ──
  "kineticist:kinetic-chirurgeon:healing-buffer:6": {
    archetypeId: "kineticist:kinetic-chirurgeon",
    name: "Healing Buffer",
    level: 6,
    bucket: "blocked",
    note: "doubles internal buffer's maximum capacity (restricted to Kinetic Healer) — a magnitude change to tables.ts's internalBufferMax; would need a hook there",
  },
  "kineticist:kinetic-chirurgeon:kinetic-chirurgery:1": {
    archetypeId: "kineticist:kinetic-chirurgeon",
    name: "Kinetic Chirurgery",
    level: 1,
    bucket: "subsystem",
    note: "grants kinetic healer plus paladin-mercy options on it, and forbids infusions entirely — pick-list grant/restriction, no flat number",
  },
  "kineticist:kinetic-chirurgeon:metahealer:5": {
    archetypeId: "kineticist:kinetic-chirurgeon",
    name: "Metahealer",
    level: 5,
    bucket: "blocked",
    note: "replaces metakinesis and infusion specialization with a menu of kinetic-healer upgrades — directly touches kineticist-infusions.ts's infusionSpecializationReduction/metakinesisBurn; would need a hook there",
  },

  // ── kineticist:kinetic-knight ──
  "kineticist:kinetic-knight:elemental-bastion:1": {
    archetypeId: "kineticist:kinetic-knight",
    name: "Elemental Bastion",
    level: 1,
    bucket: "blocked",
    note: "delays elemental defense to 4th level and scopes its benefit to wearing heavy armor + an attuned shield, and redirects Shroud of Water's burn-investment bonus onto armor/shield enhancement instead of AC — would need hooks in kineticist-defense.ts (both the level gate and Shroud of Water's own target)",
  },
  "kineticist:kinetic-knight:elemental-blade:1": {
    archetypeId: "kineticist:kinetic-knight",
    name: "Elemental Blade",
    level: 1,
    bucket: "blocked",
    note: "sets kinetic blade's burn cost to 0, forces every blast to use kinetic blade (or a kinetic-blade-prerequisite infusion), and grants further blade infusions on a fixed schedule — an infusion-burn-cost/blast-usage override; would need hooks in kineticist-infusions.ts/kinetic-blast.ts",
  },
  "kineticist:kinetic-knight:kinetic-warrior:1": {
    archetypeId: "kineticist:kinetic-knight",
    name: "Kinetic Warrior",
    level: 1,
    bucket: "subsystem",
    note: "lets Constitution substitute for Intelligence when qualifying for combat feats, and counts as having Combat Expertise for feat prerequisites — a feat-prerequisite substitution, not a Change-expressible number",
  },
  "kineticist:kinetic-knight:knight-s-resolve:3": {
    archetypeId: "kineticist:kinetic-knight",
    name: "Knight's Resolve",
    level: 3,
    bucket: "subsystem",
    note: "grants the samurai's Resolve class feature wholesale (an unmodeled resource mechanic, same posture as grit/panache)",
  },

  // ── kineticist:leshykineticist ──
  "kineticist:leshykineticist:basic-leshykinesis:1": {
    archetypeId: "kineticist:leshykineticist",
    name: "Basic Leshykinesis",
    level: 1,
    bucket: "situational",
    note: "real land/climb speeds, but scoped to being a vine leshy in alternate plant form (a shapechange state this engine doesn't track), with a GM-discretion caveat for other leshy varieties",
  },
  "kineticist:leshykineticist:green-rebirth:20": {
    archetypeId: "kineticist:leshykineticist",
    name: "Green Rebirth",
    level: 20,
    bucket: "subsystem",
    note: "activated area-heal/self-revival tied to an unrelated verdant-burst ability — no passive number",
  },
  "kineticist:leshykineticist:leshy-element:1": {
    archetypeId: "kineticist:leshykineticist",
    name: "Leshy Element",
    level: 1,
    bucket: "subsystem",
    note: "forces wood as primary/both expanded elements and specific blast choices, and grants fixed wild talents at set levels — bundle of restrictions/grants, no flat number",
  },
  "kineticist:leshykineticist:photosynthetic-buffer:6": {
    archetypeId: "kineticist:leshykineticist",
    name: "Photosynthetic Buffer",
    level: 6,
    bucket: "subsystem",
    note: "swaps the internal buffer's FILL mechanism (sunlight instead of burn) without changing its capacity formula (tables.ts's internalBufferMax is untouched) — a mechanism-only change, nothing numeric to extract or block",
  },

  // ── kineticist:overwhelming-soul ──
  "kineticist:overwhelming-soul:mental-prowess:1": {
    archetypeId: "kineticist:overwhelming-soul",
    name: "Mental Prowess",
    level: 1,
    bucket: "blocked",
    note: "forbids accepting burn at all (converting forced burn into a temporary negative level instead) and later grants a daily wild-talent burn-cost reduction — a direct override of the vendored Burn uses.maxFormula/accept mechanic; would need hooks in resources.ts/kineticist-infusions.ts",
  },
  "kineticist:overwhelming-soul:mind-over-matter:1": {
    archetypeId: "kineticist:overwhelming-soul",
    name: "Mind Over Matter",
    level: 1,
    bucket: "blocked",
    note: "swaps the key ability score for wild talents from Constitution to Charisma — no Change mechanism; would need a hook in kinetic-blast.ts/kineticist-infusions.ts. The Bluff/Diplomacy class-skill grant isn't Change-expressible either",
  },
  "kineticist:overwhelming-soul:overwhelming-power:3": {
    archetypeId: "kineticist:overwhelming-soul",
    name: "Overwhelming Power",
    level: 3,
    bucket: "numeric",
    note: "flat, unconditional attack bonus to kinetic blasts, expressible via 'attack.weapon.kinetic-blast' (kinetic-blast.ts's blastLine reads this target — class note 2); the matching DAMAGE bonus is excluded whenever kinetic blade/whip or a damage-suppressing infusion is in the loadout, a per-activation choice no static Change can check, so only the attack half is extracted",
  },

  // ── kineticist:psammokinetic ──
  "kineticist:psammokinetic:burning-winds:1": {
    archetypeId: "kineticist:psammokinetic",
    name: "Burning Winds",
    level: 1,
    bucket: "subsystem",
    note: "substitutes sand/sirocco blast for air/electric blast and reassigns which utility-talent prerequisites this element counts toward, banning several talents outright — a bundle of pick-list restrictions/reflavors, no flat number (the new blasts themselves are handled as their own ids below)",
  },
  "kineticist:psammokinetic:ki-pool:3": {
    archetypeId: "kineticist:psammokinetic",
    name: "Ki Pool",
    level: 3,
    bucket: "subsystem",
    note: "grants an entirely new, unmodeled ki-pool resource; its passive damage bonus is conditioned on 'at least 1 point in the pool' (a resource state this engine never tracks) and its other benefits are swift-action activations — no baseline number",
  },
  "kineticist:psammokinetic:sand-blast:1": {
    archetypeId: "kineticist:psammokinetic",
    name: "Sand Blast",
    level: 1,
    bucket: "blocked",
    note: "a stat-block definition for a new simple blast replacing air's — no matching entry in kineticist-elements.ts's KINETICIST_ELEMENTS air definition (class note 3)",
  },
  "kineticist:psammokinetic:sand-element:7": {
    archetypeId: "kineticist:psammokinetic",
    name: "Sand Element",
    level: 7,
    bucket: "subsystem",
    note: "changes the wild-talent LEVEL-GATE offset for earth-element picks (2 levels lower instead of 4) — a pick-list eligibility change (minKineticistLevelForTalent), not a sheet number",
  },
  "kineticist:psammokinetic:sirocco-blast:1": {
    archetypeId: "kineticist:psammokinetic",
    name: "Sirocco Blast",
    level: 1,
    bucket: "blocked",
    note: "a stat-block definition for a new simple blast replacing electric blast's — no matching entry in kineticist-elements.ts's KINETICIST_ELEMENTS air definition (class note 3)",
  },

  // ── kineticist:psychokinetcist ──
  "kineticist:psychokinetcist:emotional-intensity:1": {
    archetypeId: "kineticist:psychokinetcist",
    name: "Emotional Intensity",
    level: 1,
    bucket: "blocked",
    note: "swaps the key ability score for wild talents from Constitution to Wisdom — no Change mechanism; would need a hook in kinetic-blast.ts/kineticist-infusions.ts. The Sense Motive class-skill grant and the named Psychic Sensitivity bonus feat aren't separately extractable (feat is a named grant, not a count)",
  },
  "kineticist:psychokinetcist:mental-overflow:3": {
    archetypeId: "kineticist:psychokinetcist",
    name: "Mental Overflow",
    level: 3,
    bucket: "blocked",
    note: "rewrites elemental overflow to grant mental-ability-score bonuses instead of physical ones — already carries a prose-only entry (changes: []) in archetype-effects.ts (the hand-verified table, which wins resolution regardless); a real extraction would need a hook in kinetic-blast.ts/tables.ts (class note 7)",
  },
  "kineticist:psychokinetcist:mind-burn:1": {
    archetypeId: "kineticist:psychokinetcist",
    name: "Mind Burn",
    level: 1,
    bucket: "blocked",
    note: "swaps burn's accept cap to Wisdom modifier and its nonlethal-damage penalty for a stacking Will-save/Wisdom-check penalty — already hand-wired outside this pipeline (resources.ts's isPsychokinetcist branch, tables.ts's mindBurnDetailLabel); a Change here would conflict with that bespoke code (class note 6)",
  },

  // ── kineticist:terrakineticist ──
  "kineticist:terrakineticist:expanded-terrakinesis:7": {
    archetypeId: "kineticist:terrakineticist",
    name: "Expanded Terrakinesis",
    level: 7,
    bucket: "subsystem",
    note: "grants blasts and a wild-talent pick tied to the character's currently-known terrain-elements — pick-list grant riding an unmodeled terrain-element state, no flat number",
  },
  "kineticist:terrakineticist:omniterrakinesis:20": {
    archetypeId: "kineticist:terrakineticist",
    name: "Omniterrakinesis",
    level: 20,
    bucket: "subsystem",
    note: "a burn-spend activated ability to change element regardless of terrain — activated utility, no baseline number change",
  },
  "kineticist:terrakineticist:terrakinesis:1": {
    archetypeId: "kineticist:terrakineticist",
    name: "Terrakinesis",
    level: 1,
    bucket: "blocked",
    note: "the archetype's defining mechanic: primary element (and therefore blasts, class skills, basic utility talent, and elemental defense) dynamically changes with surrounding terrain — a structural rewrite touching kineticist-elements.ts, kinetic-blast.ts, AND kineticist-defense.ts all at once, far beyond a Change formula",
  },
  "kineticist:terrakineticist:terrakinetic-defense:2": {
    archetypeId: "kineticist:terrakineticist",
    name: "Terrakinetic Defense",
    level: 2,
    bucket: "blocked",
    note: "carries invested defense burn across an element change (e.g. Flesh of Stone's 2 invested burn becomes Force Ward's on switching to aether) — kineticist-defense.ts's resolveKineticistDefense resolves one element at a time with no cross-element burn-carryover state; would need a hook there",
  },
};

/**
 * ── KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED ────────────────────────────────
 *
 * Machine-extracted mechanical effects for kineticist archetype class
 * features (the prose→Change extraction pipeline, kineticist slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 5 of kineticist's 86
 * features cleared the `numeric` bar (see
 * `KINETICIST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — two of the five are partial extractions of a
 * multi-clause feature, with the unextractable clause dropped and noted
 * rather than guessed at.
 *
 * Confidence rubric (identical to magus.ts's/fighter.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general scaling bonus.
 *  - "medium": the extraction dropped a real clause of the same feature (a
 *    second save-category, a damage half excluded under a loadout condition,
 *    several immunities with no matching closed-vocabulary slug) while
 *    keeping the clause that DOES clear the bar — partial honesty, flagged
 *    in `detail`/the classification note.
 *  - "low": not used in this pass.
 */
export const KINETICIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Arakineticist's "Accursed Shadow" grants a flat, unconditional save bonus
  // vs. death effects AND necromancy spells (Change.saveCategories: ["death",
  // "necromancy"]) on top of the ordinary Fortitude/Reflex/Will total. Both
  // halves are real SAVE_CATEGORIES entries, so nothing is dropped.
  "kineticist:arakineticist:accursed-shadow:4": {
    changes: [
      {
        formula: "min(6, 2 + floor(max(0, @class.unlevel - 4) / 4))",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["death", "necromancy"],
      },
    ],
    detail: (level) =>
      `+${Math.min(6, 2 + Math.floor(Math.max(0, level - 4) / 4))} vs. necromancy spells and death effects`,
    confidence: "high",
    provenance:
      "She gains a +2 bonus on saving throws against necromancy spells and death effects. " +
      "This bonus increases by 1 every 4 levels beyond 4th, to a maximum of +6 at 20th level.",
  },

  // Elemental Ascetic's "AC Bonus" is a monk-style Wisdom-to-AC/CMD grant,
  // scaling the same way the vendored monk AC Bonus Change does (see this
  // file's header doc comment): the same three checkable roll-data axes
  // (armor.type, shield.type, encumbrance.level) gate it, and only the
  // immobilized/helpless exclusion is dropped — matching the vendored monk
  // Change's own omission of that exact clause. Untyped (not dodge), so it
  // needs its own explicit "cmd" Change alongside "ac" (dodge-type bonuses
  // auto-flow into CMD via compute.ts's CMD_AC_TYPES; untyped ones don't).
  "kineticist:elemental-ascetic:ac-bonus:2": {
    changes: [
      c(
        "if(and(eq(@armor.type, 0), lt(@shield.type, 1), lte(@attributes.encumbrance.level, 0)), max(0, @abilities.wis.mod) + floor(max(0, @class.unlevel - 2) / 4), 0)",
        "ac",
      ),
      c(
        "if(and(eq(@armor.type, 0), lt(@shield.type, 1), lte(@attributes.encumbrance.level, 0)), max(0, @abilities.wis.mod) + floor(max(0, @class.unlevel - 2) / 4), 0)",
        "cmd",
      ),
    ],
    detail: (level) =>
      `+Wis mod (+${Math.floor(Math.max(0, level - 2) / 4)} tier) to AC/CMD — unarmored, shieldless, unencumbered`,
    confidence: "high",
    provenance:
      "At 2nd level, when unarmored, not using a shield, and unencumbered, an elemental ascetic " +
      "adds his Wisdom bonus (if any) to his AC and his CMD. These bonuses to AC apply even " +
      "against touch attacks or when the elemental ascetic is flat-footed. He loses these " +
      "bonuses when he is immobilized or helpless. This bonus increases by 1 for every 4 " +
      "kineticist levels the elemental ascetic possesses beyond 2nd.",
  },

  // Elemental Annihilator's "Bonus Feat" is an unpaired, additive bonus-feat
  // COUNT (1 at 2nd, +1 each at 8th/10th/14th/18th) from a restricted list —
  // the restriction isn't modeled, only the count, same posture as this
  // pipeline's other hand-verified bonus-feat-count entries.
  "kineticist:elemental-annihilator:bonus-feat:2": {
    changes: [
      c(
        "1 + if(gte(@class.unlevel, 8), 1, 0) + if(gte(@class.unlevel, 10), 1, 0) + " +
          "if(gte(@class.unlevel, 14), 1, 0) + if(gte(@class.unlevel, 18), 1, 0)",
        "bonusFeats",
      ),
    ],
    detail: (level) =>
      `${1 + (level >= 8 ? 1 : 0) + (level >= 10 ? 1 : 0) + (level >= 14 ? 1 : 0) + (level >= 18 ? 1 : 0)} bonus feat(s) (restricted list)`,
    confidence: "high",
    provenance:
      "At 2nd level, an elemental annihilator can select a bonus feat from the following list: " +
      "Deadly Aim, Double Slice, Point-Blank Shot, Power Attack, Precise Shot, Rapid Shot, Two- " +
      "Weapon Fighting, Weapon Finesse, and Weapon Focus. Rapid Shot and Two-Weapon Fighting can " +
      "be used with a kinetic blast only if the annihilator also possesses flurry of devastation " +
      "(see below). She gains an additional bonus feat at 8th, 10th, 14th, and 18th levels.",
  },

  // Overwhelming Soul's "Overwhelming Power" grants a flat, unconditional
  // attack bonus to kinetic blasts — kinetic-blast.ts's blastLine reads
  // "attack.weapon.kinetic-blast" via the generic modifier pipeline (this
  // file's header doc comment, class note 2), so this is a genuine Change
  // despite the rest of the class's bespoke posture. The matching DAMAGE
  // bonus is excluded whenever kinetic blade, kinetic whip, or a
  // damage-suppressing infusion is in the loadout — a per-activation choice
  // (`suppressOverflowDamage`, resolved from the loadout at blast-line time,
  // not from any roll-data path) no static Change formula can see, so only
  // the attack half is extracted; the damage half is dropped rather than
  // over-applied to every blast including kinetic-blade ones.
  "kineticist:overwhelming-soul:overwhelming-power:3": {
    changes: [c("1 + floor(max(0, @class.unlevel - 3) / 3)", "attack.weapon.kinetic-blast")],
    detail: (level) =>
      `+${1 + Math.floor(Math.max(0, level - 3) / 3)} kinetic blast attack (damage half not modeled — kinetic blade/whip exclusion)`,
    confidence: "medium",
    provenance:
      "At 3rd level, an overwhelming soul gains a +1 bonus on attack rolls and damage rolls " +
      "with her kinetic blasts. The damage bonus doesn't apply to kinetic blade, kinetic whip, " +
      "or other infusions that don't apply the damage bonus from elemental overflow. This bonus " +
      "increases by 1 at 6th level and every 3 levels thereafter.",
  },

  // Blood Kineticist's "Blood Mastery" grants a compound set of immunities;
  // only "immune to bleed" matches the closed immEffect vocabulary
  // (defenses.ts's EFFECT_IMMUNITY_LABELS) exactly. "Injected poisons" and
  // "injury diseases" are narrower than the available "poison"/"disease"
  // slugs — using those would over-claim full poison/disease immunity the
  // text doesn't grant. The sickened/nauseated-condition immunity and the
  // nuanced non-aging clause (still accrues age bonuses, doesn't die of old
  // age) have no matching slug either, and are dropped rather than guessed.
  "kineticist:blood-kineticist:blood-mastery:20": {
    changes: [c("1", "immEffect.bleed")],
    detail: () =>
      "immune to bleed (injected-poison/injury-disease/condition immunities and non-aging not modeled)",
    confidence: "medium",
    provenance:
      "she is immune to bleed, injected poisons, injury diseases, and the sickened and " +
      "nauseated conditions unless she chooses to be affected.",
  },
};
