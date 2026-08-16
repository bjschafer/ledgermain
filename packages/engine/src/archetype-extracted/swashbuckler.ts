/**
 * Swashbuckler's slice of the pipeline. Every vendored archetype feature for
 * the class (20 swashbuckler archetypes, 68 features) is read in full and
 * bucketed as `numeric` / `situational` / `subsystem` / `blocked`, and the
 * `numeric` ones get a real `Change`-shaped extraction. Per the per-class file
 * convention (`index.ts`'s doc comment), this file owns BOTH of swashbuckler's
 * pipeline artifacts; only `index.ts` (the aggregator, a later integration
 * step not done here) needs a new import + spread line.
 *
 * ── Swashbuckler-specific mechanical facts this pass relies on ────────────
 *
 * 1. **Panache** (base L1 feature) rides a vendored
 *    `uses.maxFormula: "max(1, @abilities.cha.mod)"`, applied generically via
 *    `deriveResourcePools`. Any archetype feature that changes the pool's
 *    SIZE or stat basis is `blocked` (double-count/conflict with the vendored
 *    formula). A feature that only changes WHEN panache is regained (crit vs.
 *    killing blow, weapon restrictions, steal-a-thing triggers) is
 *    `subsystem` — regain triggers were never Change-modeled.
 * 2. **Deeds** are a modeled subsystem: panache is spent (or must be banked,
 *    "at least 1 panache point") to power them, and live resource state has
 *    no formula input the engine can check. Features that swap, add, or
 *    retarget deeds bucket `subsystem`; a real number gated on having 1+
 *    panache points is `situational` (same posture as gunslinger's
 *    grit-gated numbers).
 * 3. **Charmed Life** rides a vendored
 *    `uses.maxFormula: "2 + floor((@class.unlevel + 2) / 4)"` and carries no
 *    `changes`. Features that change its uses-per-day count are `blocked`
 *    (pool-size trap); features that change what the uses can be spent on
 *    are `subsystem`.
 * 4. **Nimble (SWA)** (`H9Rq9os7iM27l8Gt`) carries a real vendored dodge-AC
 *    Change (`floor((@class.unlevel + 1) / 4)`); replacements ride the
 *    vendored `pairedBaseFeatureUuid` strike-through. NOTE a vendoring
 *    artifact: seven level-3 "Deeds" features (mouser, musketeer, rondelero,
 *    rostland-bravo, shackles-corsair, veiled-blade, wildstrider) are
 *    spuriously paired to Nimble (SWA) even though their prose replaces
 *    individual deeds, not nimble — a level-matching pairing error upstream,
 *    recorded here but not this pipeline's to fix.
 * 5. **Swashbuckler Weapon Training** (`dfTaltqK6RlSaLVt`) carries vendored
 *    mattack/wdamage/bonusFeats changes; the archetype reflavors that
 *    replace it all scope their bonuses to specific named weapons (rapier,
 *    dagger/starknife) or to the "light or one-handed piercing" weapon
 *    category — neither is expressible without over-applying (no
 *    weapon-category formula input, and WEAPON_GROUPS tags are broader than
 *    the named weapons), so they stay `situational` per the skald
 *    club-strike precedent. The base feature's own suppression rides the
 *    pairing either way.
 * 6. **Bonus Feats (SWA)** (`qzrYai2tj5Ehg6Um`) carries a vendored
 *    `floor(@class.unlevel / 4)` bonusFeats Change. An archetype feature
 *    that replaces the progression with its own feat count but is NOT
 *    structurally paired to that compendium item would double-count if
 *    extracted — `blocked` (same shape as gunslinger's Siege Gunner gap).
 * 7. The vendored **Musketeer** archetype's prose is largely the CAVALIER
 *    Musketeer archetype's text (it references the mount, expert trainer,
 *    and challenge class features and says "cavalier" throughout) — a
 *    misfiled-source artifact. None of it promises an unconditional number,
 *    so each feature buckets on its actual content, with the cross-class
 *    prose flagged in its note.
 */

import type { Change } from "@pf1/schema";

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── swashbuckler:arrow-champion ──
  "swashbuckler:arrow-champion:arrow-champion-s-panache:1": {
    archetypeId: "swashbuckler:arrow-champion",
    name: "Arrow Champion's Panache",
    level: 1,
    bucket: "subsystem",
    note: "extends the panache killing-blow regain trigger to bows — regain triggers were never Change-modeled (class note 1)",
  },
  "swashbuckler:arrow-champion:deeds:1": {
    archetypeId: "swashbuckler:arrow-champion",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds (Retaliation, Precise Aim, Swift Switch, Archer's Feint) for panache-spend/panache-gated bow abilities — deeds subsystem (class note 2)",
  },
  "swashbuckler:arrow-champion:versatile-weapon-mastery:20": {
    archetypeId: "swashbuckler:arrow-champion",
    name: "Versatile Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "extends swashbuckler weapon mastery (crit auto-confirm) to bows — no engine target for crit auto-confirm, same posture as the kensai/fighter Weapon Mastery reflavors",
  },
  "swashbuckler:arrow-champion:weapon-versatility:5": {
    archetypeId: "swashbuckler:arrow-champion",
    name: "Weapon Versatility",
    level: 5,
    bucket: "subsystem",
    note: "extends six precision deeds to bow attacks within 30 feet — deeds subsystem (class note 2); the vendored pairing strikes Swashbuckler Weapon Training (class note 5), which this pipeline leaves as-is",
  },

  // ── swashbuckler:azatariel ──
  "swashbuckler:azatariel:affection-of-elysium:4": {
    archetypeId: "swashbuckler:azatariel",
    name: "Affection of Elysium",
    level: 4,
    bucket: "subsystem",
    note: "grants paladin mercies on a pick-list with a uses-per-day resource — activated ally-healing subsystem, no baseline number",
  },
  "swashbuckler:azatariel:battle-dance:3": {
    archetypeId: "swashbuckler:azatariel",
    name: "Battle Dance",
    level: 3,
    bucket: "numeric",
    note: "+10 ft. enhancement to base speed at 3rd and every 4 levels thereafter, lost in medium/heavy armor or medium/heavy load — both conditions checkable (@armor.type, @attributes.encumbrance.level), a true faster-than-the-norm increase with no sibling speed changes to compose against",
  },
  "swashbuckler:azatariel:deeds:1": {
    archetypeId: "swashbuckler:azatariel",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps four deeds (Bralani's Swiftness, Whimsical Riposte, Lillend's Misdirection, Ghaele's Assault) for panache-gated/panache-spend abilities — deeds subsystem (class note 2)",
  },
  "swashbuckler:azatariel:elysian-conviction:2": {
    archetypeId: "swashbuckler:azatariel",
    name: "Elysian Conviction",
    level: 2,
    bucket: "situational",
    note: "real Cha-to-saves bonus vs. mind-affecting, gated on live resource state the engine can't check statically — surfaced as a panache-pool spend toggle instead (grit-panache-spends.ts)",
  },

  // ── swashbuckler:courser ──
  "swashbuckler:courser:confounding-target:4": {
    archetypeId: "swashbuckler:courser",
    name: "Confounding Target",
    level: 4,
    bucket: "situational",
    note: "real +10 ft. speed, gated on at least 1 panache point (live resource state, class note 2) plus light/no armor — surfaced as a panache-pool spend toggle instead (grit-panache-spends.ts); the Spring Attack grant is a named-feat grant, not a count",
  },
  "swashbuckler:courser:deeds:1": {
    archetypeId: "swashbuckler:courser",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps three deeds (Wall Run, Impossible Leap, Swift Strikes) for panache-spend/panache-gated movement abilities — deeds subsystem (class note 2)",
  },
  "swashbuckler:courser:nimble-toes:3": {
    archetypeId: "swashbuckler:courser",
    name: "Nimble Toes",
    level: 3,
    bucket: "situational",
    note: "modifies nimble's AC bonus by +1/-1 depending on distance moved this turn — a per-round movement condition the static sheet can't check",
  },
  "swashbuckler:courser:swift-target:1": {
    archetypeId: "swashbuckler:courser",
    name: "Swift Target",
    level: 1,
    bucket: "situational",
    note: "real +5 ft. speed, gated on at least 1 panache point (live resource state, class note 2) plus light/no armor — surfaced as a panache-pool spend toggle instead (grit-panache-spends.ts), tiered up to +10 ft. at Confounding Target's 4th level; the Dodge grant is a named-feat grant, not a count",
  },

  // ── swashbuckler:daring-infiltrator ──
  "swashbuckler:daring-infiltrator:deeds:1": {
    archetypeId: "swashbuckler:daring-infiltrator",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps three deeds (Clandestine Expertise, Silence Is Golden, Authoritative Bluff) for panache-gated/panache-spend infiltration abilities — deeds subsystem (class note 2)",
  },
  "swashbuckler:daring-infiltrator:quick-tongued:2": {
    archetypeId: "swashbuckler:daring-infiltrator",
    name: "Quick-Tongued",
    level: 2,
    bucket: "numeric",
    note: "unconditional, level-scaling Bluff bonus (+1 at 2nd, +1 per 4 levels beyond) — clean skill.blf extraction; the paired base feature (Charmed Life) carries no vendored changes, nothing to double-count",
  },

  // ── swashbuckler:dashing-thief ──
  "swashbuckler:dashing-thief:bold-thief:1": {
    archetypeId: "swashbuckler:dashing-thief",
    name: "Bold Thief",
    level: 1,
    bucket: "subsystem",
    note: "swaps class skills (Disable Device in, Fly/Ride out) and retargets the derring-do/swashbuckler's edge deeds — class-skill-list and deed-scope alteration, no number",
  },
  "swashbuckler:dashing-thief:rogue-talent:4": {
    archetypeId: "swashbuckler:dashing-thief",
    name: "Rogue Talent",
    level: 4,
    bucket: "subsystem",
    note: "grants rogue talents on a pick-list (4th and every 4 levels) in place of bonus feats — rogue talents are a deferred pick-list subsystem",
  },
  "swashbuckler:dashing-thief:thief-s-confidence:1": {
    archetypeId: "swashbuckler:dashing-thief",
    name: "Thief 's Confidence",
    level: 1,
    bucket: "subsystem",
    note: "swaps the panache killing-blow regain trigger for a steal-maneuver trigger — regain triggers were never Change-modeled (class note 1)",
  },

  // ── swashbuckler:flying-blade ──
  "swashbuckler:flying-blade:deeds:1": {
    archetypeId: "swashbuckler:flying-blade",
    name: "Deeds",
    level: 1,
    bucket: "subsystem",
    note: "swaps six deeds (Subtle Throw, Disrupting Counter, Precise Throw, Targeted Throw, Bleeding Wound, Perfect Throw) for dagger/starknife-thrown variants — deeds subsystem (class note 2)",
  },
  "swashbuckler:flying-blade:flying-blade-mastery:20": {
    archetypeId: "swashbuckler:flying-blade",
    name: "Flying Blade Mastery",
    level: 20,
    bucket: "subsystem",
    note: "crit auto-confirm plus crit-multiplier increase for daggers/starknives — no engine target for either (class note 5's mastery posture)",
  },
  "swashbuckler:flying-blade:flying-blade-training:5": {
    archetypeId: "swashbuckler:flying-blade",
    name: "Flying Blade Training",
    level: 5,
    bucket: "situational",
    note: "real, scaling attack/damage bonus but scoped to daggers and starknives specifically — narrower than any WEAPON_GROUPS tag ('blades-light'/'thrown' would over-apply to other weapons), same shape as skald's club-scoped strike (class note 5); Improved Critical grant and range-increment increase have no targets either",
  },
  "swashbuckler:flying-blade:panache:1": {
    archetypeId: "swashbuckler:flying-blade",
    name: "Panache",
    level: 1,
    bucket: "subsystem",
    note: "restricts panache regain to dagger/starknife crits and killing blows — regain trigger, never Change-modeled (class note 1)",
  },

  // ── swashbuckler:guiding-blade ──
  "swashbuckler:guiding-blade:charmed-guardian:2": {
    archetypeId: "swashbuckler:guiding-blade",
    name: "Charmed Guardian",
    level: 2,
    bucket: "subsystem",
    note: "extends charmed life's uses to allies' saves — spend-scope change to a vendored uses pool, no number (class note 3)",
  },
  "swashbuckler:guiding-blade:daring-teamwork:1": {
    archetypeId: "swashbuckler:guiding-blade",
    name: "Daring Teamwork",
    level: 1,
    bucket: "blocked",
    note: "the teamwork-feat count (1 at 1st, +1 at 4th and every 4 levels) is real and unconditional, but the feature claims to replace the base bonus feats while carrying NO pairedBaseFeatureUuid — Bonus Feats (SWA) keeps its vendored floor(@class.unlevel/4) bonusFeats Change live, so extracting this count would stack on top of the unsuppressed base (class note 6); the panache-spend feat-sharing and regain-trigger halves are subsystem-shaped either way",
  },
  "swashbuckler:guiding-blade:interfering-blade:3": {
    archetypeId: "swashbuckler:guiding-blade",
    name: "Interfering Blade",
    level: 3,
    bucket: "situational",
    note: "real, scaling AC bonus but granted to an adjacent ALLY against a single attack — ally-only, per-attack numbers are never extracted; replaces nimble (suppression rides the pairing)",
  },

  // ── swashbuckler:inspired-blade ──
  "swashbuckler:inspired-blade:deeds:0": {
    archetypeId: "swashbuckler:inspired-blade",
    name: "Deeds",
    level: 11,
    bucket: "subsystem",
    note: "swaps bleeding wound for Inspired Strike, a panache-spend attack rider — deeds subsystem (class note 2); note the vendored id's level suffix is 0 while the level field says 11, a vendoring quirk",
  },
  "swashbuckler:inspired-blade:inspired-finesse:1": {
    archetypeId: "swashbuckler:inspired-blade",
    name: "Inspired Finesse",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse benefits with the rapier plus Weapon Focus (rapier) as a named bonus feat — feat grants, no count delta",
  },
  "swashbuckler:inspired-blade:inspired-panache:0": {
    archetypeId: "swashbuckler:inspired-blade",
    name: "Inspired Panache",
    level: 0,
    bucket: "blocked",
    note: "resizes the panache pool to Cha modifier plus Int modifier (minimum 1 each) — a genuine size/basis divergence from the vendored max(1, @abilities.cha.mod) uses.maxFormula that would double-count or conflict if backfilled (class note 1); the crit-only regain restriction is a trigger change, outside scope regardless",
  },
  "swashbuckler:inspired-blade:rapier-training:5": {
    archetypeId: "swashbuckler:inspired-blade",
    name: "Rapier Training",
    level: 5,
    bucket: "situational",
    note: "real, scaling attack/damage bonus but scoped to rapiers specifically — narrower than any WEAPON_GROUPS tag, not expressible without over-applying (class note 5); Improved Critical while wielding a rapier has no target either",
  },
  "swashbuckler:inspired-blade:rapier-weapon-mastery:20": {
    archetypeId: "swashbuckler:inspired-blade",
    name: "Rapier Weapon Mastery",
    level: 20,
    bucket: "subsystem",
    note: "crit auto-confirm, threat-range increase, and crit-multiplier increase for rapiers — no engine targets for any of the three",
  },

  // ── swashbuckler:mouser ──
  "swashbuckler:mouser:deeds:3": {
    archetypeId: "swashbuckler:mouser",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps four deeds (Underfoot Assault, Quick Steal, Hamstring, Cat's Charge) for panache-spend/panache-gated in-foe's-space abilities — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },

  // ── swashbuckler:musketeer ──
  "swashbuckler:musketeer:deeds:3": {
    archetypeId: "swashbuckler:musketeer",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps dodging panache for Quick Clear, a panache-spend firearm-repair action — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },
  "swashbuckler:musketeer:gifted-firearm:1": {
    archetypeId: "swashbuckler:musketeer",
    name: "Gifted Firearm",
    level: 1,
    bucket: "subsystem",
    note: "bonded firearm plus Gunsmithing and an activated, uses-per-day focus ability — and the prose is the CAVALIER Musketeer's text (it replaces 'the standard cavalier's mount ability' and scales per 'cavalier level'), a misfiled-source artifact (class note 7); nothing unconditional to extract either way",
  },
  "swashbuckler:musketeer:musketeer-instruction:1": {
    archetypeId: "swashbuckler:musketeer",
    name: "Musketeer Instruction",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse benefits with the rapier plus Rapid Reload and Gunsmithing as named bonus feats — feat grants, no count delta",
  },
  "swashbuckler:musketeer:swift-powder:4": {
    archetypeId: "swashbuckler:musketeer",
    name: "Swift Powder",
    level: 4,
    bucket: "subsystem",
    note: "Rapid Reload as a named bonus feat plus a free-action reload tied to the cavalier challenge ability — cross-class prose (class note 7), no number",
  },
  "swashbuckler:musketeer:weapon-and-armor-proficiency:1": {
    archetypeId: "swashbuckler:musketeer",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant plus a fighter-level stacking rule for firearm feats — cross-class prose referencing 'a cavalier's levels' (class note 7), no Change",
  },
  "swashbuckler:musketeer:weapon-proficiency:1": {
    archetypeId: "swashbuckler:musketeer",
    name: "Weapon Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── swashbuckler:mysterious-avenger ──
  "swashbuckler:mysterious-avenger:alignment:0": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Alignment",
    level: 0,
    bucket: "subsystem",
    note: "alignment restriction and narrative feature-loss condition, no number",
  },
  "swashbuckler:mysterious-avenger:avenger-finesse:0": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Avenger Finesse",
    level: 0,
    bucket: "subsystem",
    note: "swashbuckler finesse reflavor extending the class's weapon category to whips — weapon-category rule, no Change",
  },
  "swashbuckler:mysterious-avenger:avenger-s-target:5": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Avenger’s Target",
    level: 5,
    bucket: "situational",
    note: "the flat +1 attack/damage clause is scoped to the 'light or one-handed piercing melee weapons and whips' category — no weapon-category formula input exists, and no prior wave has followed the vendored base Weapon Training's unscoped-mattack simplification (class note 5); the scaling studied-target bonuses are per-chosen-enemy on top",
  },
  "swashbuckler:mysterious-avenger:class-skills:0": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Class Skills",
    level: 0,
    bucket: "subsystem",
    note: "adds Disguise to class skills — class-skill-list change, no Change",
  },
  "swashbuckler:mysterious-avenger:greater-charmed-life:4": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Greater Charmed Life",
    level: 4,
    bucket: "blocked",
    note: "grants three extra uses of charmed life — a uses-count change to the vendored Charmed Life uses.maxFormula that would double-count if backfilled (class note 3); the expend-a-use Cha-to-AC option is an activated immediate action regardless",
  },
  "swashbuckler:mysterious-avenger:secret-identity:3": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Secret Identity",
    level: 3,
    bucket: "situational",
    note: "+4 Disguise only in one chosen disguise (a specific-use condition), and +4 saves vs. divination effects — no 'divination' save category exists in SAVE_CATEGORIES, so the save half would over-apply to all Will saves (same shape as magus's Nameless Mask); the 11th-level scrying immunity is an absolute effect, not a modifier",
  },
  "swashbuckler:mysterious-avenger:weapon-and-armor-proficiency:0": {
    archetypeId: "swashbuckler:mysterious-avenger",
    name: "Weapon and Armor Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "trades buckler proficiency for whip proficiency, no Change",
  },

  // ── swashbuckler:noble-fencer ──
  "swashbuckler:noble-fencer:aristocratic-discipline:2": {
    archetypeId: "swashbuckler:noble-fencer",
    name: "Aristocratic Discipline",
    level: 2,
    bucket: "numeric",
    note: "unconditional, level-scaling Will-save bonus vs. mind-affecting effects — expressible via Change.saveCategories ('mind'), same mechanism as the bravery-style entries in class-feature-effects.ts; replaces charmed life (uses-only, no vendored changes to double-count)",
  },
  "swashbuckler:noble-fencer:incredible-aspirations:7": {
    archetypeId: "swashbuckler:noble-fencer",
    name: "Incredible Aspirations",
    level: 7,
    bucket: "subsystem",
    note: "panache-gated extra-d6 reroll rider on the derring-do/social panache deeds — deeds subsystem (class note 2)",
  },
  "swashbuckler:noble-fencer:social-panache:1": {
    archetypeId: "swashbuckler:noble-fencer",
    name: "Social Panache",
    level: 1,
    bucket: "subsystem",
    note: "new panache-spend deed (d6 on social skill checks, verbal-duel edges) — deeds subsystem (class note 2)",
  },
  "swashbuckler:noble-fencer:unshakable-presence:11": {
    archetypeId: "swashbuckler:noble-fencer",
    name: "Unshakable Presence",
    level: 11,
    bucket: "situational",
    note: "real demoralize immunity (immEffect would fit), but only while he has at least 1 panache point — live resource state the engine can't check (class note 2)",
  },

  // ── swashbuckler:okayo-corsair ──
  "swashbuckler:okayo-corsair:bonus-feat:4": {
    archetypeId: "swashbuckler:okayo-corsair",
    name: "Bonus Feat",
    level: 4,
    bucket: "subsystem",
    note: "counts swashbuckler levels as fighter and monk levels for combat-feat prerequisites — virtual-level prereq rule, no Change",
  },
  "swashbuckler:okayo-corsair:okayo-finesse:1": {
    archetypeId: "swashbuckler:okayo-corsair",
    name: "Okayo Finesse",
    level: 1,
    bucket: "subsystem",
    note: "Weapon Finesse benefits with monk-group weapons plus Cha-for-Int/Wis feat-prerequisite substitution — feat-benefit and prereq rules, no Change",
  },
  "swashbuckler:okayo-corsair:okayo-panache:1": {
    archetypeId: "swashbuckler:okayo-corsair",
    name: "Okayo Panache",
    level: 1,
    bucket: "subsystem",
    note: "swaps the panache regain trigger and the class's usable weapon category to monk-group weapons — regain trigger plus weapon-category rule (class note 1)",
  },
  "swashbuckler:okayo-corsair:weapon-and-armor-proficiency:1": {
    archetypeId: "swashbuckler:okayo-corsair",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency swap, no Change",
  },

  // ── swashbuckler:picaroon ──
  "swashbuckler:picaroon:panache:0": {
    archetypeId: "swashbuckler:picaroon",
    name: "Panache",
    level: 1,
    bucket: "subsystem",
    note: "extends the panache regain trigger to one-handed firearms and swaps four deeds (Melee Shooter, Quick Clear, Gun Feint, Lightning Reload) — regain trigger plus deeds subsystem (class notes 1/2)",
  },
  "swashbuckler:picaroon:two-weapon-finesse:0": {
    archetypeId: "swashbuckler:picaroon",
    name: "Two-Weapon Finesse",
    level: 0,
    bucket: "subsystem",
    note: "Weapon Finesse benefits plus conditional Two-Weapon Fighting feat effects — feat-benefit grants, no Change",
  },
  "swashbuckler:picaroon:weapon-proficiency:0": {
    archetypeId: "swashbuckler:picaroon",
    name: "Weapon Proficiency",
    level: 0,
    bucket: "subsystem",
    note: "proficiency grant, no Change",
  },

  // ── swashbuckler:rondelero-swashbuckler ──
  "swashbuckler:rondelero-swashbuckler:buckler-bash:2": {
    archetypeId: "swashbuckler:rondelero-swashbuckler",
    name: "Buckler Bash",
    level: 2,
    bucket: "subsystem",
    note: "treats a buckler as a one-handed piercing weapon for class features — weapon-category rule, no number; spuriously paired to Charmed Life upstream (level-matched pairing artifact, harmless since Charmed Life carries no vendored changes)",
  },
  "swashbuckler:rondelero-swashbuckler:charmed-life:10": {
    archetypeId: "swashbuckler:rondelero-swashbuckler",
    name: "Charmed Life",
    level: 10,
    bucket: "blocked",
    note: "delays charmed life to 10th and resizes it to 1/day (+1 at 14th and 18th) — a uses-count divergence from the vendored Charmed Life uses.maxFormula that would double-count or conflict if backfilled (class note 3)",
  },
  "swashbuckler:rondelero-swashbuckler:falcata-emphasis:1": {
    archetypeId: "swashbuckler:rondelero-swashbuckler",
    name: "Falcata Emphasis",
    level: 1,
    bucket: "subsystem",
    note: "falcata proficiency plus a weapon-category treatment rule, replacing the derring-do deed — no Change",
  },
  "swashbuckler:rondelero-swashbuckler:rondelero-deeds:3": {
    archetypeId: "swashbuckler:rondelero-swashbuckler",
    name: "Rondelero Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps three deeds (Shield Catch, Rondelero Chop, Shattering Chop) for panache-gated/panache-spend maneuver abilities — deeds subsystem (class note 2)",
  },
  "swashbuckler:rondelero-swashbuckler:rondelero-flexibility:6": {
    archetypeId: "swashbuckler:rondelero-swashbuckler",
    name: "Rondelero Flexibility",
    level: 6,
    bucket: "subsystem",
    note: "full-attack action-economy rule for alternating falcata and buckler attacks — no number",
  },

  // ── swashbuckler:rostland-bravo ──
  "swashbuckler:rostland-bravo:aldori-swashbuckler:1": {
    archetypeId: "swashbuckler:rostland-bravo",
    name: "Aldori Swashbuckler",
    level: 1,
    bucket: "subsystem",
    note: "Exotic Weapon Proficiency (Aldori dueling sword) as a named bonus feat, loses buckler proficiency and two class skills — feat grant plus list changes, no Change",
  },
  "swashbuckler:rostland-bravo:deeds:3": {
    archetypeId: "swashbuckler:rostland-bravo",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps four deeds (Inevitable Victory, Sweeping Wind Feint, Dragon's Rage, Terror of the Great Wyrm) for panache-spend dueling-sword abilities — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },

  // ── swashbuckler:shackles-corsair ──
  "swashbuckler:shackles-corsair:deeds:3": {
    archetypeId: "swashbuckler:shackles-corsair",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "adds two deeds (Eyes of Abendego, Plunder), both panache-gated or full-round conditional actions — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },
  "swashbuckler:shackles-corsair:swagger:3": {
    archetypeId: "swashbuckler:shackles-corsair",
    name: "Swagger",
    level: 3,
    bucket: "numeric",
    note: "the Intimidate-check and Profession (sailor) bonus clauses are unconditional and level-scaling — extracted (Profession (sailor) is a fixed, non-player-chosen instance, using the established skill.pro.<slug> convention; only the corsair's own share of the self-and-ally morale bonus is wired, same ally-drop posture as cleric:divine-strategist:master-tactician:1); the Intimidate-DC-against-her clause has no reciprocal target, and the 7th-level charmed-life rider is a resource mechanic — both dropped and flagged",
  },

  // ── swashbuckler:veiled-blade ──
  "swashbuckler:veiled-blade:deeds:3": {
    archetypeId: "swashbuckler:veiled-blade",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "adds four deeds (Quick Draw, Hidden Blade, Instant Unveil, Soul Veil), all panache-gated weapon-concealment abilities — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },

  // ── swashbuckler:whirling-dervish ──
  "swashbuckler:whirling-dervish:dawnflower-s-mercy:1": {
    archetypeId: "swashbuckler:whirling-dervish",
    name: "Dawnflower's Mercy",
    level: 1,
    bucket: "subsystem",
    note: "restricts panache regain to evil outsiders/undead/nonlethal kills and adds a surrender trigger — regain triggers, never Change-modeled (class note 1)",
  },
  "swashbuckler:whirling-dervish:dervish-dance:4": {
    archetypeId: "swashbuckler:whirling-dervish",
    name: "Dervish Dance",
    level: 4,
    bucket: "subsystem",
    note: "Dex-for-Str substitution on melee damage rolls plus a virtual Dervish Dance feat for prerequisites — stat-basis substitutions aren't Change-shaped (same posture as the Eldritch Scion pool-basis swap)",
  },
  "swashbuckler:whirling-dervish:dervish-finesse:1": {
    archetypeId: "swashbuckler:whirling-dervish",
    name: "Dervish Finesse",
    level: 1,
    bucket: "subsystem",
    note: "treats a scimitar as a one-handed piercing weapon while the off hand is free — weapon-category rule, no number",
  },

  // ── swashbuckler:wildstrider ──
  "swashbuckler:wildstrider:deeds:3": {
    archetypeId: "swashbuckler:wildstrider",
    name: "Deeds",
    level: 3,
    bucket: "subsystem",
    note: "swaps three deeds (Subterfuge, Adroit Step, Keen Gaze) for panache-gated terrain/concealment abilities — deeds subsystem (class note 2); spuriously paired to Nimble (SWA) upstream (class note 4)",
  },
};

/**
 * ── SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────
 *
 * Machine-extracted mechanical effects for swashbuckler archetype class
 * features (the prose→Change extraction pipeline, swashbuckler slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * Only 4 of swashbuckler's 68 features cleared the `numeric` bar (see
 * `SWASHBUCKLER_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full
 * per-feature audit) — the class's kit leans almost entirely on
 * panache-gated deeds, regain-trigger swaps, and named-weapon training
 * reflavors, all of which are resource-gated or scope-restricted in ways the
 * static sheet can't check (see this file's header doc comment).
 *
 * Confidence rubric (identical to fighter.ts's/magus.ts's):
 *  - "high": a single, clearly-worded scaling bonus with every textual
 *    condition either absent or checkable in the formula.
 *  - "medium": one clause of a multi-clause feature is extracted while
 *    sibling clauses (no-target DC shifts, freeform sub-skill scopes,
 *    resource riders) are dropped — partial honesty, flagged in `detail`.
 *  - "low": not used in this pass.
 */
export const SWASHBUCKLER_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Azatariel's "Battle Dance" is a true faster-than-the-norm enhancement
  // bonus to base speed on a 4-level cadence (+10 at 3rd to +50 at 19th),
  // lost in medium/heavy armor or under a medium/heavy load — BOTH loss
  // conditions are checkable (@armor.type, @attributes.encumbrance.level),
  // so unlike the esoteric/spell-dancer AC entries nothing textual is
  // dropped. Plain additive change; no sibling set/additive speed mods on
  // this class, and Slow-and-Steady composition isn't implicated (this is
  // not a cap-relative offset against the armor reduction). Replaces nimble
  // per the vendored pairing (dodge-AC suppression rides the pairing;
  // different target, no interaction).
  "swashbuckler:azatariel:battle-dance:3": {
    changes: [
      c(
        "if(and(lte(@armor.type, 1), eq(@attributes.encumbrance.level, 0)), " +
          "10 * (1 + floor((@class.unlevel - 3) / 4)), 0)",
        "landSpeed",
        "enhancement",
      ),
    ],
    detail: (level) =>
      `+${10 * (1 + Math.floor((level - 3) / 4))} ft. enhancement speed (light/no armor, light load)`,
    confidence: "high",
    provenance:
      "At 3rd level and every 4 levels thereafter, an azatariel's base speed increases by 10 " +
      "feet. This is an enhancement bonus. An azatariel in medium or heavy armor or carrying " +
      "a medium or heavy load loses this extra speed.",
  },

  // Daring Infiltrator's "Quick-Tongued" is a clean, unconditional Bluff
  // bonus on the standard 2nd-then-every-4-levels cadence. Untyped (the
  // text names no bonus type). The paired base feature (Charmed Life)
  // carries no vendored changes — only a uses pool — so nothing is
  // double-counted by the pairing's strike-through.
  "swashbuckler:daring-infiltrator:quick-tongued:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "skill.blf")],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} Bluff`,
    confidence: "high",
    provenance:
      "At 2nd level, a daring infiltrator gains a +1 bonus on Bluff checks. This bonus " +
      "increases by 1 for every 4 levels beyond 2nd.",
  },

  // Noble Fencer's "Aristocratic Discipline" is an unconditional Will-save
  // bonus scoped to mind-affecting effects — exactly what
  // `Change.saveCategories` exists for (the same "allSavingThrows +
  // ['mind']" idiom class-feature-effects.ts's Unchained Heart and the
  // cleric slice's Unhinged Mind use; the 'mind' category already narrows
  // application to Will saves via SAVE_CATEGORIES). Cadence: +1 at 2nd,
  // +2 at 6th, then every 4 levels (+5 at 18th). Replaces charmed life
  // (uses-only, no vendored changes).
  "swashbuckler:noble-fencer:aristocratic-discipline:2": {
    changes: [
      {
        formula: "1 + floor((@class.unlevel - 2) / 4)",
        target: "allSavingThrows",
        type: "untyped",
        saveCategories: ["mind"],
      } satisfies Change,
    ],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} Will vs. mind-affecting`,
    confidence: "high",
    provenance:
      "The noble fencer gains a +1 bonus on Will saves against mind-affecting effects. This " +
      "bonus increases by 1 at 6th level and every 4 swashbuckler levels thereafter.",
  },

  // Shackles Corsair's "Swagger": the Intimidate-check and Profession
  // (sailor) clauses are extracted. The Intimidate-DC-against-her clause has
  // no reciprocal Change target (it isn't the corsair's own roll — same drop
  // as the cleric slice's Bastion); only the corsair's own share of the
  // self-and-ally Profession (sailor) morale bonus is wired (the ally half
  // has no reciprocal target, same drop as cleric:divine-strategist's
  // Master Tactician); the 7th-level demoralize-on-charmed-life rider is a
  // resource mechanic. Intimidate is untyped (the clause names no bonus
  // type); Profession (sailor) is morale, per the text. Replaces nimble per
  // the vendored pairing (different target, no interaction).
  "swashbuckler:shackles-corsair:swagger:3": {
    changes: [
      c("1 + floor((@class.unlevel - 3) / 4)", "skill.int"),
      c("1 + floor((@class.unlevel - 3) / 4)", "skill.pro.sailor", "morale"),
    ],
    detail: (level) =>
      `+${1 + Math.floor((level - 3) / 4)} Intimidate / Profession (sailor) (DC-against-her half and ally share not modeled)`,
    confidence: "medium",
    provenance:
      "She gains a +1 bonus on Intimidate checks, and the DC of Intimidate checks made " +
      "against her increases by 1. She and her allies gain a +1 morale bonus on Profession " +
      "(sailor) checks. These bonuses and her Intimidate DC increase by 1 for every 4 levels " +
      "beyond 3rd.",
  },
};
