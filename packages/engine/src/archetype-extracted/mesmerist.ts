/**
 * Mesmerist's slice of the pipeline (2026-08-08). All 92 vendored archetype
 * features across mesmerist's 21 archetypes are read in full and bucketed as
 * `numeric` / `situational` / `subsystem` / `blocked`, and the `numeric` ones
 * get a real `Change`-shaped extraction, the same methodology the magus pilot
 * (`magus.ts`) established. Per the per-class file convention (`index.ts`'s
 * doc comment), this file owns BOTH of mesmerist's pipeline artifacts —
 * `MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED` and
 * `MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION` — so a future wave working on a
 * different class never has a reason to touch this file; only `index.ts` (the
 * aggregator, a later integration step not done here) needs a new import +
 * spread line.
 *
 * ── Mesmerist-specific mechanical facts this pass relies on ───────────────
 *
 * 1. **Hypnotic Stare** (base L1 feature, `changes: []` upstream) imposes a
 *    -2/-3 Will-save penalty on an ENEMY the mesmerist is staring at — it's
 *    display-only, per-target, and there is no "current stared creature"
 *    field a Change could apply to. Enemy-facing penalties are never
 *    extracted in this pipeline (they aren't the character's own number).
 *    Any archetype feature that reflavors, redirects, or extends the stare's
 *    AoE (Autohypnotist's Wide Stare, Aromaphile's Hypnotic Aroma, Vox's
 *    Compelling Voice, ...) is `subsystem` for the same reason.
 * 2. **Painful Stare** (base feature, `changes: []`) adds precision damage
 *    to an attack that hits the stared target — real dice, but per-attack
 *    and free-action-triggered on the mesmerist's choice. Per the class
 *    brief, this is `situational`; any archetype feature that only retypes
 *    or riders it (Dreamstalker's Dreams of Pain, Toxitician's Painful
 *    Injection) inherits the same bucket.
 * 3. **Bold Stare** (base feature) and **Mesmerist Tricks**
 *    (`doc.build.mesmeristTricks`, pool tag `mesmeristTricks`) are both
 *    modeled PICK-LIST subsystems elsewhere (`mesmerist-bold-stares.ts`,
 *    `mesmerist-tricks.ts`) — every archetype feature that adds new bold
 *    stare options, new tricks, or changes trick implant mechanics is
 *    `subsystem`. The tricks resource pool's SIZE is a real vendored
 *    `uses.maxFormula` (`floor(@class.unlevel / 2) + @abilities.cha.mod`,
 *    minimum 1) — any feature that would change how many uses/day or how
 *    many can be concurrently implanted has no engine target to hook (no
 *    "concurrent trick count" Change target exists), so those stay
 *    `subsystem` too rather than risk double-counting or inventing a target.
 * 4. **Touch Treatment** (base feature, real vendored
 *    `uses.maxFormula: "3 + @abilities.cha.mod"`) is an activated,
 *    limited-use condition-removal ability — every archetype feature that
 *    alters what it removes or redirects its use is `subsystem`.
 * 5. **Consummate Liar** (base L1 feature) carries a REAL vendored `Change`:
 *    `{ formula: "max(1, floor(@class.unlevel / 2))", target: "skill.blf",
 *    type: "untyped" }` (a flat Bluff bonus). Nine archetype features across
 *    this dataset replace it with an equivalent bonus on a different skill
 *    (Diplomacy, Intimidate, Sleight of Hand, Stealth) — the vendored data
 *    has NO `pairedBaseFeatureUuid` recorded for any of them (verified: zero
 *    of the ~9 "replaces consummate liar" features carry that link, unlike
 *    the ~20 mesmerist features paired to Towering Ego/Glib Lie/Rule Minds),
 *    so the UI won't auto-strike Consummate Liar's row for these builds — a
 *    pre-existing data gap, not something this pass can fix (no `data-
 *    pipeline` edits in scope). Six of the nine state the replacement in
 *    plain prose ("This ability replaces consummate liar"), so extracting
 *    their own distinct-skill bonus is safe (no double-count: different
 *    skill, and the prose is unambiguous about the swap even though the
 *    structured link is missing) — see class notes on each entry below. The
 *    ninth, Vexing Trickster's "Consummate Trickster", does NOT state a
 *    replacement anywhere in its vendored text despite the name and duplicate
 *    1st-level slot strongly implying one — that ambiguity is exactly the
 *    "replacement suppression" trap the wave brief calls out, and it's
 *    `blocked` rather than guessed at (see its entry below).
 * 6. **Towering Ego** (base L2 feature) carries a real vendored Change
 *    (`will += @abilities.cha.mod`, untyped) with its own "loses the bonus
 *    while unable to provide an emotion component" exception — several
 *    archetype features replace Towering Ego outright with an unrelated
 *    ability and gain no compensating number (Fey Trickster's Feytouched,
 *    Umbral Mesmerist's Umbral Solipsism, Thought Eater's Assume Morality);
 *    nothing to extract there, the archetype simply forfeits the self-buff.
 * 7. **Glib Lie**, **Rule Minds**, and **Manifold Tricks** (base features)
 *    all carry `changes: []` upstream — pure narrative/utility abilities, so
 *    any archetype feature replacing them starts from a zero baseline (no
 *    suppression risk either way).
 *
 * Confidence rubric (identical to magus.ts's):
 *  - "high": a literal or near-literal reflavor of an already-modeled base
 *    mechanism, or a single, clearly-worded, fully general (no scope
 *    restriction) scaling bonus.
 *  - "medium": the formula required deriving a non-obvious cadence from
 *    prose, or the extraction cherry-picks one unconditional clause out of a
 *    larger mixed feature (dropping a genuinely uncheckable condition or a
 *    per-choice variable sub-effect), flagged in `detail`.
 *  - "low": not used in this pass.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  // ── mesmerist:aromaphile ──
  "mesmerist:aromaphile:aromatic-manipulation:3": {
    archetypeId: "mesmerist:aromaphile",
    name: "Aromatic Manipulation",
    level: 3,
    bucket: "subsystem",
    note: "alters touch treatment's condition list (adds fatigued/exhausted, restricts others) and adds a separate touch-delivered hampering-condition track (fascinated/calm emotions/stunned/deep slumber by tier) — activated, targeted, and condition-grant rather than a number; touch treatment is a modeled subsystem (class note 4)",
  },
  "mesmerist:aromaphile:debilitating-aroma:3": {
    archetypeId: "mesmerist:aromaphile",
    name: "Debilitating Aroma",
    level: 3,
    bucket: "subsystem",
    note: "adds bold-stare-style rider options to the hypnotic aroma (same option list as Bold Stare) — pick-list subsystem, no flat number (class note 3)",
  },
  "mesmerist:aromaphile:hypnotic-aroma:1": {
    archetypeId: "mesmerist:aromaphile",
    name: "Hypnotic Aroma",
    level: 1,
    bucket: "subsystem",
    note: "replaces hypnotic stare, painful stare, and towering ego with an AoE Will-save penalty on ENEMIES in the burst/scent radius — an enemy-facing penalty, same posture as hypnotic stare itself (class note 1); the towering ego self-buff it forfeits has no replacement, nothing to extract there",
  },
  "mesmerist:aromaphile:spells:1": {
    archetypeId: "mesmerist:aromaphile",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "restates the base mesmerist spellcasting rules verbatim — no Change",
  },

  // ── mesmerist:autohypnotist ──
  "mesmerist:autohypnotist:autohypnosis:1": {
    archetypeId: "mesmerist:autohypnotist",
    name: "Autohypnosis",
    level: 1,
    bucket: "subsystem",
    note: "alters hypnotic stare: the enemy's penalty increases by 1 but the mesmerist takes a matching self-penalty while maintaining the stare, reducible/negatable with a chance the stare ends — a self-debuff entirely conditioned on an active enemy-facing stare state (class note 1), no baseline number",
  },
  "mesmerist:autohypnotist:wide-stare:5": {
    archetypeId: "mesmerist:autohypnotist",
    name: "Wide Stare",
    level: 5,
    bucket: "subsystem",
    note: "broadens hypnotic stare's penalty to creatures near the stared target — extends an enemy-facing subsystem, no baseline number (class note 1)",
  },

  // ── mesmerist:chart-caster ──
  "mesmerist:chart-caster:feign-destiny:3": {
    archetypeId: "mesmerist:chart-caster",
    name: "Feign Destiny",
    level: 3,
    bucket: "situational",
    note: "real +1/+2/+5 competence bonus retroactively applied to an ally's already-failed roll, but an immediate-action, limited-use (Cha mod/day), ally-targeted ability — not a standing bonus on any roll",
  },
  "mesmerist:chart-caster:subject-of-the-stars:1": {
    archetypeId: "mesmerist:chart-caster",
    name: "Subject of the Stars",
    level: 1,
    bucket: "subsystem",
    note: "alters mesmerist trick implant mechanics (multi-instance/multi-target, slower cast time) — trick subsystem, no flat number (class note 3)",
  },

  // ── mesmerist:cult-master ──
  "mesmerist:cult-master:cult-tricks:1": {
    archetypeId: "mesmerist:cult-master",
    name: "Cult Tricks",
    level: 1,
    bucket: "subsystem",
    note: "adds new tricks (cohort/follower-only) to the trick catalog — pick-list subsystem, no flat number (class note 3)",
  },
  "mesmerist:cult-master:faithful-followers:7": {
    archetypeId: "mesmerist:cult-master",
    name: "Faithful Followers",
    level: 7,
    bucket: "subsystem",
    note: "grants Leadership as a bonus feat, replaces the 7th-level bold stare — Leadership isn't modeled, feat grant only",
  },
  "mesmerist:cult-master:false-healing:3": {
    archetypeId: "mesmerist:cult-master",
    name: "False Healing",
    level: 3,
    bucket: "situational",
    note: "real temp-HP (1d8+Cha, later 2d8+Cha) or ability-damage removal, but an activated, limited-use (3+Cha/day), touch-targeted ability with dice output — not a standing number",
  },
  "mesmerist:cult-master:fanatical-devotion:10": {
    archetypeId: "mesmerist:cult-master",
    name: "Fanatical Devotion",
    level: 10,
    bucket: "subsystem",
    note: "Leadership-score adjustments plus an enchantment-DC bump scoped to the cult master's own cohort/followers — Leadership isn't modeled and there's no per-target-class DC scoping",
  },
  "mesmerist:cult-master:fanatical-stare:1": {
    archetypeId: "mesmerist:cult-master",
    name: "Fanatical Stare",
    level: 1,
    bucket: "situational",
    note: "replaces painful stare with an ally-buff instead: competence attack/damage/Will-save bonus to the creature under the cult master's gaze — real numbers, but scoped to a chosen ally target via an active stare, not the mesmerist's own standing bonus",
  },
  "mesmerist:cult-master:insidious-personality:1": {
    archetypeId: "mesmerist:cult-master",
    name: "Insidious Personality",
    level: 1,
    bucket: "numeric",
    note: "flat Diplomacy bonus = 1/2 class level (minimum 1), replaces consummate liar with the identical formula shape on a different skill — plain-prose replacement, no double-count risk (class note 5)",
  },
  "mesmerist:cult-master:masterful-cult-tricks:12": {
    archetypeId: "mesmerist:cult-master",
    name: "Masterful Cult Tricks",
    level: 12,
    bucket: "subsystem",
    note: "adds masterful tricks (cohort/follower-only) to the trick catalog — pick-list subsystem, no flat number (class note 3)",
  },
  "mesmerist:cult-master:reborn:20": {
    archetypeId: "mesmerist:cult-master",
    name: "Reborn",
    level: 20,
    bucket: "subsystem",
    note: "clone-like death-survival ritual tied to a specific cohort, replaces rule minds — unrelated mechanic, no Change",
  },

  // ── mesmerist:dreamstalker ──
  "mesmerist:dreamstalker:dreams-of-pain:1": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Dreams of Pain",
    level: 1,
    bucket: "situational",
    note: "retypes painful stare's damage as nonlethal — no new number, inherits painful stare's own bucket (class note 2)",
  },
  "mesmerist:dreamstalker:dreamwalker:5": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Dreamwalker",
    level: 5,
    bucket: "situational",
    note: "real, scaling favored-terrain bonus (+2, +2/4 levels) plus a favored-enemy-vs-dream-creatures bonus, but scoped to 'while in a dreamscape' — an uncheckable planar-location condition — replaces manifold tricks",
  },
  "mesmerist:dreamstalker:mesmerist-trick:2": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Mesmerist Trick",
    level: 2,
    bucket: "subsystem",
    note: "restates the base mesmerist trick mechanic (implant count, DC, cadence) verbatim — trick subsystem, no Change (class note 3)",
  },
  "mesmerist:dreamstalker:sleepless:2": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Sleepless",
    level: 2,
    bucket: "numeric",
    note: "immunity to sleep effects maps cleanly to the engine's closed immEffect vocabulary (immEffect.sleep); the accompanying Cha-bonus save vs. fatigue/exhaustion is dropped — 'fatigue'/'exhaustion' aren't categories in the engine's SAVE_CATEGORIES vocabulary (save-categories.ts), so a saveCategories-scoped bonus for them would never render or apply anywhere",
  },
  "mesmerist:dreamstalker:somnomancer:1": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Somnomancer",
    level: 1,
    bucket: "subsystem",
    note: "grants a witch hex (activated via trick-pool spend) plus trick-for-spell swaps — hex/trick subsystem, no Change, replaces the 1st-level mesmerist trick",
  },
  "mesmerist:dreamstalker:touch-of-night:3": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Touch of Night",
    level: 3,
    bucket: "subsystem",
    note: "alters touch treatment's condition list — touch treatment subsystem, no number (class note 4)",
  },
  "mesmerist:dreamstalker:tramautic-spell:11": {
    archetypeId: "mesmerist:dreamstalker",
    name: "Tramautic Spell",
    level: 11,
    bucket: "subsystem",
    note: "grants Traumatic Spell as a bonus feat, replaces glib lie — feat grant, no Change",
  },

  // ── mesmerist:enigma ──
  "mesmerist:enigma:absentia:20": {
    archetypeId: "mesmerist:enigma",
    name: "Absentia",
    level: 20,
    bucket: "subsystem",
    note: "adjacent creatures are always flat-footed to the enigma and don't count as observing him for Stealth — an absolute rule effect with no formula/magnitude and no engine target for 'always flat-footed to me', replaces rule minds",
  },
  "mesmerist:enigma:detection-void:11": {
    archetypeId: "mesmerist:enigma",
    name: "Detection Void",
    level: 11,
    bucket: "subsystem",
    note: "a caster-level-check gate that makes detect-type spells fail against the enigma, replaces glib lie — a threshold rule (nondetection-style), no Change target",
  },
  "mesmerist:enigma:enigmatic-stare:1": {
    archetypeId: "mesmerist:enigma",
    name: "Enigmatic Stare",
    level: 1,
    bucket: "subsystem",
    note: "the hypnotic-stare target takes a Perception penalty to notice the enigma — an enemy-facing penalty tied to the stare, same posture as hypnotic stare itself (class note 1), replaces painful stare",
  },
  "mesmerist:enigma:sneak-attack:5": {
    archetypeId: "mesmerist:enigma",
    name: "Sneak Attack",
    level: 5,
    bucket: "situational",
    note: "real, scaling rogue sneak attack dice (+1d6 at 5th, +1d6/4 levels), but precision damage scoped to flat-footed/flanked targets — a per-attack condition, replaces manifold tricks",
  },
  "mesmerist:enigma:solipsism:1": {
    archetypeId: "mesmerist:enigma",
    name: "Solipsism",
    level: 1,
    bucket: "subsystem",
    note: "alters hypnotic stare to grant the enigma concealment then invisibility against the stared target instead of a Will-save penalty — no 'concealment'/'invisibility' Change target exists, and the effect is entirely conditioned on active-stare state (class note 1)",
  },
  "mesmerist:enigma:transfer-affliction:3": {
    archetypeId: "mesmerist:enigma",
    name: "Transfer Affliction",
    level: 3,
    bucket: "subsystem",
    note: "alters touch treatment to transfer the enigma's own harmful conditions onto a touch-attacked creature — touch treatment subsystem, activated and targeted (class note 4)",
  },
  "mesmerist:enigma:veiled-steps:1": {
    archetypeId: "mesmerist:enigma",
    name: "Veiled Steps",
    level: 1,
    bucket: "numeric",
    note: "flat Stealth bonus = 1/4 class level (minimum +1), replaces consummate liar with a different skill and formula shape — plain-prose replacement, no double-count risk (class note 5)",
  },

  // ── mesmerist:eyebiter ──
  "mesmerist:eyebiter:ocular-occlusion-cause-or-cure-blindness:6": {
    archetypeId: "mesmerist:eyebiter",
    name: "Ocular Occlusion (Cause or Cure Blindness)",
    level: 6,
    bucket: "subsystem",
    note: "one of four vendored ids (levels 3/6/10/14) that all carry the IDENTICAL full description text (a vendoring artifact covering the whole Ocular Occlusion progression) — the ability itself is an activated, hypnotic-stare-target-scoped enemy debuff (dazzle/blind/fear/spellblight by tier), an attack-form action rather than a standing Change, so every tier lands in the same bucket regardless of which id is 'earliest'; replaces all instances of touch treatment",
  },
  "mesmerist:eyebiter:ocular-occlusion-clouded-vision:3": {
    archetypeId: "mesmerist:eyebiter",
    name: "Ocular Occlusion (Clouded Vision)",
    level: 3,
    bucket: "subsystem",
    note: "duplicate-description tier of Ocular Occlusion (see the L6 entry's note) — activated, stare-target-scoped enemy debuff, no standing Change; replaces all instances of touch treatment",
  },
  "mesmerist:eyebiter:ocular-occlusion-eyeless-horror:10": {
    archetypeId: "mesmerist:eyebiter",
    name: "Ocular Occlusion (Eyeless Horror)",
    level: 10,
    bucket: "subsystem",
    note: "duplicate-description tier of Ocular Occlusion (see the L6 entry's note) — activated, stare-target-scoped enemy debuff, no standing Change; replaces all instances of touch treatment",
  },
  "mesmerist:eyebiter:ocular-occlusion-spellblight:14": {
    archetypeId: "mesmerist:eyebiter",
    name: "Ocular Occlusion (Spellblight)",
    level: 14,
    bucket: "subsystem",
    note: "duplicate-description tier of Ocular Occlusion (see the L6 entry's note) — activated, stare-target-scoped enemy debuff, no standing Change; replaces all instances of touch treatment",
  },
  "mesmerist:eyebiter:omnivisual:11": {
    archetypeId: "mesmerist:eyebiter",
    name: "Omnivisual",
    level: 11,
    bucket: "subsystem",
    note: "grants all-around vision and immunity to flanking while the familiar is out and watching — no 'all-around vision' sense target exists (senses.ts's SENSE_TARGETS) and no target for flanking immunity, replaces glib lie",
  },
  "mesmerist:eyebiter:staring-eye:5": {
    archetypeId: "mesmerist:eyebiter",
    name: "Staring Eye",
    level: 5,
    bucket: "subsystem",
    note: "spends a trick use to project the stare/gaze abilities through the familiar — trick-pool resource mechanic, replaces mental potency",
  },

  // ── mesmerist:fey-trickster ──
  "mesmerist:fey-trickster:fey-veil:3": {
    archetypeId: "mesmerist:fey-trickster",
    name: "Fey Veil",
    level: 3,
    bucket: "situational",
    note: "real circumstance/Disguise/mood-altering effects by tier, but an activated, limited-use (3+Cha/day), touch-targeted ability — not a standing bonus, replaces touch treatment",
  },
  "mesmerist:fey-trickster:feytouched:2": {
    archetypeId: "mesmerist:fey-trickster",
    name: "Feytouched",
    level: 2,
    bucket: "subsystem",
    note: "grants the druid's resist nature's lure and woodland stride plus a dual creature-type — no Change target for either, replaces towering ego with no compensating number (class note 6)",
  },
  "mesmerist:fey-trickster:nature-s-lure:1": {
    archetypeId: "mesmerist:fey-trickster",
    name: "Nature's Lure",
    level: 1,
    bucket: "subsystem",
    note: "swaps the mesmerist's spell list source (druid/ranger spells instead of the mesmerist list) — no Change-shaped number",
  },
  "mesmerist:fey-trickster:one-with-the-fey:20": {
    archetypeId: "mesmerist:fey-trickster",
    name: "One with the Fey",
    level: 20,
    bucket: "numeric",
    note: "grants low-light vision unconditionally alongside a player-chosen fey-type ability (haste/unearthly grace/supernatural speed/tress attacks) — the low-light vision clause is extracted (maps to the standard sensell grant), the chosen fey-type ability is dropped as a variable, per-choice sub-effect with no single Change target; replaces rule minds",
  },

  // ── mesmerist:gaslighter ──
  "mesmerist:gaslighter:consummate-cruelty:1": {
    archetypeId: "mesmerist:gaslighter",
    name: "Consummate Cruelty",
    level: 1,
    bucket: "numeric",
    note: "flat Intimidate bonus = 1/2 class level (minimum 1), replaces consummate liar with the identical formula shape on a different skill — plain-prose replacement, no double-count risk (class note 5); the accompanying Dirty Trick feat-prerequisite exemption is dropped (not a Change)",
  },
  "mesmerist:gaslighter:corosion-of-sanity:14": {
    archetypeId: "mesmerist:gaslighter",
    name: "Corosion of Sanity",
    level: 14,
    bucket: "situational",
    note: "real 1-point Wisdom-damage (or 2 sanity-damage) rider, but triggered only when a target fails its save against a single-target mind-affecting effect the gaslighter cast — a per-cast, enemy-facing trigger, replaces touch treatment (break enchantment)",
  },
  "mesmerist:gaslighter:horrid-mask:3": {
    archetypeId: "mesmerist:gaslighter",
    name: "Horrid Mask",
    level: 3,
    bucket: "subsystem",
    note: "implants a no-save fear/gaze effect enabling a later damage-less painful-stare trigger near a mirror, plus an Intimidate-assist option — no flat magnitude of its own (enables a trigger, doesn't add a number), limited-use (3+Cha/day), replaces touch treatment (minor) and alters painful stare",
  },
  "mesmerist:gaslighter:phantasmal-foes:10": {
    archetypeId: "mesmerist:gaslighter",
    name: "Phantasmal Foes",
    level: 10,
    bucket: "subsystem",
    note: "spends a Horrid Mask use to treat the stared target as flanked — a status effect with no magnitude, replaces touch treatment (greater)",
  },
  "mesmerist:gaslighter:phantasmal-force:6": {
    archetypeId: "mesmerist:gaslighter",
    name: "Phantasmal Force",
    level: 6,
    bucket: "subsystem",
    note: "forces a Will save or the target must flee/attack a mirror — a save-DC-gated status effect, no flat magnitude, replaces touch treatment (moderate)",
  },

  // ── mesmerist:hate-monger ──
  "mesmerist:hate-monger:insidious-emotions:11": {
    archetypeId: "mesmerist:hate-monger",
    name: "Insidious Emotions",
    level: 11,
    bucket: "subsystem",
    note: "raises the DC for OTHERS to detect/identify the hate-monger's own emotion effects, plus a caster-level-check gate on divinations — no Change target for 'DC to detect my spells', replaces glib lie",
  },
  "mesmerist:hate-monger:insidious-hatred:3": {
    archetypeId: "mesmerist:hate-monger",
    name: "Insidious Hatred",
    level: 3,
    bucket: "situational",
    note: "real -2 penalty on the target's save/SR, but only while sneaking a mental-manipulator-list spell into a touch treatment use — a per-use, resource-gated trigger, alters touch treatment",
  },
  "mesmerist:hate-monger:mental-manipulator:1": {
    archetypeId: "mesmerist:hate-monger",
    name: "Mental Manipulator",
    level: 1,
    bucket: "subsystem",
    note: "expands the spell list plus a favored-enemy spell-DC bump at 5th — spell-DC isn't a Change target and spell-list additions aren't numbers, replaces consummate liar and alters mesmerist tricks with no compensating number to extract",
  },
  "mesmerist:hate-monger:out-for-blood:7": {
    archetypeId: "mesmerist:hate-monger",
    name: "Out for Blood",
    level: 7,
    bucket: "situational",
    note: "real 1-point bleed rider, but triggered only when painful stare deals extra damage — inherits painful stare's per-attack conditionality (class note 2), replaces the 7th-level bold stare",
  },
  "mesmerist:hate-monger:xenophobe:5": {
    archetypeId: "mesmerist:hate-monger",
    name: "Xenophobe",
    level: 5,
    bucket: "situational",
    note: "ranger favored-enemy analog (+2, +2/4 levels, also on Intimidate) — real numbers scoped to a single chosen enemy creature type the engine has no build field to track for a non-ranger class, same posture as other classes' favored-enemy reflavors; replaces mental potency and manifold tricks",
  },

  // ── mesmerist:material-manipulator ──
  "mesmerist:material-manipulator:manipulator-spells:1": {
    archetypeId: "mesmerist:material-manipulator",
    name: "Manipulator Spells",
    level: 1,
    bucket: "subsystem",
    note: "adds illusion/transmutation spells to the spell list — no Change-shaped number, replaces consummate liar, the 2nd-level mesmerist trick, and manifold tricks with no compensating number to extract",
  },
  "mesmerist:material-manipulator:revision:3": {
    archetypeId: "mesmerist:material-manipulator",
    name: "Revision",
    level: 3,
    bucket: "subsystem",
    note: "activated polymorph-like ability (height/weight/gender/age/type adjustments) with no formula-shaped magnitude at any tier — replaces touch treatment and rule minds",
  },

  // ── mesmerist:mindwyrm-mesmer ──
  "mesmerist:mindwyrm-mesmer:draconic-trick:1": {
    archetypeId: "mesmerist:mindwyrm-mesmer",
    name: "Draconic Trick",
    level: 1,
    bucket: "subsystem",
    note: "adds a new trick (Threatening Mien) to the trick catalog — pick-list subsystem, no flat number even though the trick's own effect is a real -4 attack penalty (class note 3)",
  },
  "mesmerist:mindwyrm-mesmer:innate-coercion:1": {
    archetypeId: "mesmerist:mindwyrm-mesmer",
    name: "Innate Coercion",
    level: 1,
    bucket: "numeric",
    note: "flat Intimidate bonus = 1/2 class level (minimum 1), replaces consummate liar with the identical formula shape on a different skill — plain-prose replacement, no double-count risk (class note 5); the accompanying 'no size penalty on Intimidate' clause is dropped (not a Change)",
  },
  "mesmerist:mindwyrm-mesmer:masterful-draconic-trick:12": {
    archetypeId: "mesmerist:mindwyrm-mesmer",
    name: "Masterful Draconic Trick",
    level: 12,
    bucket: "subsystem",
    note: "adds a masterful trick (Frightful Countenance) to the trick catalog — pick-list subsystem, no flat number (class note 3)",
  },
  "mesmerist:mindwyrm-mesmer:phantasmagorical-breath:1": {
    archetypeId: "mesmerist:mindwyrm-mesmer",
    name: "Phantasmagorical Breath",
    level: 1,
    bucket: "subsystem",
    note: "a limited-use (Cha/day) breath-weapon-style AoE attack dealing scaling energy damage — a whole new attack action, not a Change target on the mesmerist's own stats, replaces painful stare",
  },

  // ── mesmerist:projectionist ──
  "mesmerist:projectionist:hidden-presence:5": {
    archetypeId: "mesmerist:projectionist",
    name: "Hidden Presence",
    level: 5,
    bucket: "subsystem",
    note: "grants Hidden Presence as a bonus feat (with prerequisites waived) for use while possessing objects/creatures — feat grant, no Change, replaces mental potency",
  },
  "mesmerist:projectionist:implant-consciousness:4": {
    archetypeId: "mesmerist:projectionist",
    name: "Implant Consciousness",
    level: 4,
    bucket: "subsystem",
    note: "spends a trick use to possess a linked object (enter image-style) — trick-pool resource mechanic, replaces the 4th- and 8th-level mesmerist tricks",
  },
  "mesmerist:projectionist:spells:1": {
    archetypeId: "mesmerist:projectionist",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "restates the base mesmerist spellcasting rules plus a fixed must-learn spell list — no Change",
  },

  // ── mesmerist:spirit-walker ──
  "mesmerist:spirit-walker:command-undead:6": {
    archetypeId: "mesmerist:spirit-walker",
    name: "Command Undead",
    level: 6,
    bucket: "subsystem",
    note: "grants Command Undead as a limited-use bonus feat with a later DC bump — undead-only interaction, no general Change, replaces the 6th- and 10th-level touch treatments",
  },
  "mesmerist:spirit-walker:continued-animation:3": {
    archetypeId: "mesmerist:spirit-walker",
    name: "Continued Animation",
    level: 3,
    bucket: "subsystem",
    note: "reanimates a dying stared target as a temporary dominated undead-like puppet — a resource-limited, enemy/corpse-scoped mechanic with no self-buff number, replaces the 3rd- and 14th-level touch treatments",
  },
  "mesmerist:spirit-walker:master-of-the-dead:20": {
    archetypeId: "mesmerist:spirit-walker",
    name: "Master of the Dead",
    level: 20,
    bucket: "subsystem",
    note: "1/day undead-control capstone ability — no Change, replaces rule minds",
  },
  "mesmerist:spirit-walker:spells:1": {
    archetypeId: "mesmerist:spirit-walker",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "restates the base mesmerist spellcasting rules plus optional spell-list additions — no Change",
  },
  "mesmerist:spirit-walker:undead-inception:1": {
    archetypeId: "mesmerist:spirit-walker",
    name: "Undead Inception",
    level: 1,
    bucket: "subsystem",
    note: "extends hypnotic stare's bold-stare-style effect to undead targets specifically, easing later restrictions — enemy-facing stare subsystem (class note 1), replaces consummate liar and mental potency with no compensating number to extract",
  },

  // ── mesmerist:thought-eater ──
  "mesmerist:thought-eater:assume-identity:1": {
    archetypeId: "mesmerist:thought-eater",
    name: "Assume Identity",
    level: 1,
    bucket: "situational",
    note: "real Disguise bonus = class level, but scoped to impersonating the ONE creature currently (or most recently) targeted by hypnotic stare — a specific-target, time-limited condition, replaces consummate liar",
  },
  "mesmerist:thought-eater:assume-knowledge:3": {
    archetypeId: "mesmerist:thought-eater",
    name: "Assume Knowledge",
    level: 3,
    bucket: "subsystem",
    note: "borrows the hypnotic-stare target's own Knowledge ranks in place of the thought eater's — not a formula-shaped bonus on the thought eater's own sheet, replaces touch treatment",
  },
  "mesmerist:thought-eater:assume-morality:2": {
    archetypeId: "mesmerist:thought-eater",
    name: "Assume Morality",
    level: 2,
    bucket: "subsystem",
    note: "matches the thought eater's alignment to the impersonated creature's for detection purposes — no engine target for alignment, replaces towering ego with no compensating number (class note 6)",
  },
  "mesmerist:thought-eater:consume-identity:20": {
    archetypeId: "mesmerist:thought-eater",
    name: "Consume Identity",
    level: 20,
    bucket: "subsystem",
    note: "capstone identity-theft/resurrection-block ability tied to a killed hypnotic-stare target — no Change, replaces rule minds",
  },

  // ── mesmerist:toxitician ──
  "mesmerist:toxitician:deft-fingers:1": {
    archetypeId: "mesmerist:toxitician",
    name: "Deft Fingers",
    level: 1,
    bucket: "numeric",
    note: "flat Sleight of Hand bonus = 1/2 class level (minimum 1), replaces consummate liar with the identical formula shape on a different skill — plain-prose replacement, no double-count risk (class note 5)",
  },
  "mesmerist:toxitician:improved-injections:11": {
    archetypeId: "mesmerist:toxitician",
    name: "Improved Injections",
    level: 11,
    bucket: "subsystem",
    note: "lets two injection improvements stack on one injection — pick-list interaction, no flat number of its own",
  },
  "mesmerist:toxitician:injection-improvement:3": {
    archetypeId: "mesmerist:toxitician",
    name: "Injection Improvement",
    level: 3,
    bucket: "subsystem",
    note: "a pick-list of enemy-facing debuff riders added to injections (ability-score/Fort/Reflex/natural-armor decreases, slow) — same posture as Bold Stare's/Debilitating Aroma's option lists, activated and DC-gated, no self number",
  },
  "mesmerist:toxitician:injections:1": {
    archetypeId: "mesmerist:toxitician",
    name: "Injections",
    level: 1,
    bucket: "subsystem",
    note: "replaces hypnotic stare with an injection-delivered Will-save penalty (touch attack instead of a gaze) — same enemy-facing posture as hypnotic stare itself (class note 1)",
  },
  "mesmerist:toxitician:painful-injection:1": {
    archetypeId: "mesmerist:toxitician",
    name: "Painful Injection",
    level: 1,
    bucket: "situational",
    note: "mirrors painful stare's extra-damage mechanic onto injections — inherits painful stare's per-attack conditionality (class note 2), replaces painful stare",
  },
  "mesmerist:toxitician:treatment-vials:3": {
    archetypeId: "mesmerist:toxitician",
    name: "Treatment Vials",
    level: 3,
    bucket: "subsystem",
    note: "converts touch treatment uses into portable vials anyone can administer — touch treatment subsystem, no number (class note 4)",
  },

  // ── mesmerist:umbral-mesmerist ──
  "mesmerist:umbral-mesmerist:diminished-spellcasting:1": {
    archetypeId: "mesmerist:umbral-mesmerist",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "reduces spells per day by one per level — no Change target for spell-slot counts",
  },
  "mesmerist:umbral-mesmerist:ephemeral-stare:5": {
    archetypeId: "mesmerist:umbral-mesmerist",
    name: "Ephemeral Stare",
    level: 5,
    bucket: "subsystem",
    note: "grants invisibility against the hypnotic-stare target while passive — no 'invisibility' Change target, entirely conditioned on active-stare state (class note 1)",
  },
  "mesmerist:umbral-mesmerist:shadow-summoning:1": {
    archetypeId: "mesmerist:umbral-mesmerist",
    name: "Shadow Summoning",
    level: 1,
    bucket: "subsystem",
    note: "a limited-use summon-monster-style ability — summoning isn't modeled, no Change",
  },
  "mesmerist:umbral-mesmerist:umbral-solipsism:2": {
    archetypeId: "mesmerist:umbral-mesmerist",
    name: "Umbral Solipsism",
    level: 2,
    bucket: "subsystem",
    note: "imposes a penalty on an enemy's Will save to disbelieve a summoned shadow creature — enemy-facing, scoped to the Shadow Summoning subsystem, no Change target, replaces towering ego with no compensating number (class note 6)",
  },

  // ── mesmerist:vexing-daredevil ──
  "mesmerist:vexing-daredevil:bonus-feat:3": {
    archetypeId: "mesmerist:vexing-daredevil",
    name: "Bonus Feat",
    level: 3,
    bucket: "subsystem",
    note: "grants Improved/Greater Feint, Greater Mesmerizing Feint, and a stare feat across levels — feat grants only, no Change, replaces touch treatment",
  },
  "mesmerist:vexing-daredevil:dazzling-feint:3": {
    archetypeId: "mesmerist:vexing-daredevil",
    name: "Dazzling Feint",
    level: 3,
    bucket: "subsystem",
    note: "a pick-list of feint-triggered combat riders (blind, crit-confirm bonus, extra attack, ...) — same pick-list posture as Bold Stare, each option is per-attack and DC-gated, replaces bold stare",
  },
  "mesmerist:vexing-daredevil:martial-weapon-proficiency:1": {
    archetypeId: "mesmerist:vexing-daredevil",
    name: "Martial Weapon Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency grant, no Change, replaces the 1st-level mesmerist trick",
  },
  "mesmerist:vexing-daredevil:shimmering-body:11": {
    archetypeId: "mesmerist:vexing-daredevil",
    name: "Shimmering Body",
    level: 11,
    bucket: "subsystem",
    note: "the stared target sees the daredevil as under a blur effect after she moves — no 'blur'/concealment Change target, conditioned on active-stare state (class note 1), replaces glib tongue",
  },

  // ── mesmerist:vexing-trickster ──
  "mesmerist:vexing-trickster:bonus-feat:3": {
    archetypeId: "mesmerist:vexing-trickster",
    name: "Bonus Feat",
    level: 3,
    bucket: "subsystem",
    note: "grants trick feats as bonus feats (prerequisites still required) — feat grant, no Change",
  },
  "mesmerist:vexing-trickster:consummate-trickster:1": {
    archetypeId: "mesmerist:vexing-trickster",
    name: "Consummate Trickster",
    level: 1,
    bucket: "blocked",
    note: "a flat +1 (scaling to +6) bonus on Bluff, Disguise, Sleight of Hand, AND Stealth — unlike this dataset's other 1st-level Consummate-Liar-style reflavors, the vendored description names NO replacement at all (no 'replaces consummate liar' sentence, no pairedBaseFeatureUuid), despite the name and shared 1st-level slot strongly implying one; extracting it as an unconditional addition risks stacking untyped with the base Consummate Liar Change on skill.blf specifically (both untyped, so they'd sum) — recorded rather than guessed at (class note 5)",
  },
  "mesmerist:vexing-trickster:manifold-hijinks:6": {
    archetypeId: "mesmerist:vexing-trickster",
    name: "Manifold Hijinks",
    level: 6,
    bucket: "subsystem",
    note: "raises how many modified tricks can be implanted in one target at once — no Change target for a concurrent-implant count (class note 3), replaces touch treatment (moderate) and touch treatment (break enchantment)",
  },
  "mesmerist:vexing-trickster:trickster-s-ego:2": {
    archetypeId: "mesmerist:vexing-trickster",
    name: "Trickster's Ego",
    level: 2,
    bucket: "subsystem",
    note: "grants Combat Expertise as a bonus feat plus an Intelligence-13 prerequisite override — feat grant, no Change",
  },

  // ── mesmerist:vizier ──
  "mesmerist:vizier:insidious-influence:1": {
    archetypeId: "mesmerist:vizier",
    name: "Insidious Influence",
    level: 1,
    bucket: "subsystem",
    note: "imposes a hypnotic-stare-sized penalty on the vizier's OWN allies who currently have a trick implanted (on their saves vs. the vizier, and on social checks against him) — scoped to 'allies with an implanted trick', a per-session state the engine doesn't track, no Change target",
  },
  "mesmerist:vizier:power-behind-the-throne:2": {
    archetypeId: "mesmerist:vizier",
    name: "Power Behind the Throne",
    level: 2,
    bucket: "subsystem",
    note: "an illusion misattributing the vizier's spellcasting to an ally, plus a later no-AoO clause — a rule effect with a Will-save-to-disbelieve gate, no flat magnitude",
  },

  // ── mesmerist:vox ──
  "mesmerist:vox:compelling-voice:1": {
    archetypeId: "mesmerist:vox",
    name: "Compelling Voice",
    level: 1,
    bucket: "subsystem",
    note: "reflavors hypnotic stare as a voice-based effect (with a deafness fail chance) instead of a gaze — identical mechanic, same enemy-facing posture as hypnotic stare (class note 1)",
  },
  "mesmerist:vox:spells:1": {
    archetypeId: "mesmerist:vox",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "restates the base mesmerist spellcasting rules plus spell-list additions and a verbal-component note — no Change",
  },
  "mesmerist:vox:subsonic-strike:10": {
    archetypeId: "mesmerist:vox",
    name: "Subsonic Strike",
    level: 10,
    bucket: "subsystem",
    note: "a limited-use multi-target ranged-touch attack (spends a Wounding Words use) — a whole new attack action, not a Change on the vox's own stats",
  },
  "mesmerist:vox:wounding-words:3": {
    archetypeId: "mesmerist:vox",
    name: "Wounding Words",
    level: 3,
    bucket: "subsystem",
    note: "a limited-use (3+Cha/day) touch-attack sonic-damage ability, with an enemy-facing penalty rider if the target is also under compelling voice — a new attack action plus a stare-conditioned enemy debuff, no Change on the vox's own standing stats",
  },
};

/**
 * ── MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED ─────────────────────────────────
 *
 * Machine-extracted mechanical effects for mesmerist archetype class
 * features (the prose→Change extraction pipeline, mesmerist slice).
 * Clean-room from the published PF1 rules — the vendored prose this was
 * extracted from (`archetype-features.json`) is OGL, so reading it is fine;
 * no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." Only 7 of mesmerist's 92
 * features cleared the `numeric` bar (see
 * `MESMERIST_ARCHETYPE_FEATURE_CLASSIFICATION` above for the full per-feature
 * audit) — mesmerist's kit leans heavily on the hypnotic-stare/painful-stare/
 * bold-stare/mesmerist-trick/touch-treatment family, all of which are
 * enemy-facing, per-attack, pick-list, or activated-resource subsystems
 * already modeled (or deliberately deferred) elsewhere in this engine (see
 * this file's header doc comment).
 */
export const MESMERIST_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  // Cult Master's "Insidious Personality" replaces Consummate Liar's flat
  // Bluff bonus with the identical formula shape on Diplomacy instead — the
  // vendored data has no pairedBaseFeatureUuid linking the two (see class
  // note 5), but the prose is explicit ("This ability replaces consummate
  // liar"), so there's no double-count risk from a different skill target.
  "mesmerist:cult-master:insidious-personality:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dip")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Diplomacy`,
    confidence: "high",
    provenance:
      "A cult master adds 1/2 his class level (minimum 1) as a bonus on all Diplomacy checks.",
  },

  // Dreamstalker's "Sleepless" grants sleep immunity unconditionally — maps
  // to the engine's closed immEffect vocabulary (immEffect.sleep, same slug
  // Cognatogen already uses). The Cha-bonus save vs. fatigue/exhaustion and
  // the emotion-component exception are both dropped (class note per this
  // entry's classification: no saveCategories vocabulary entry for fatigue/
  // exhaustion, and the exception mirrors Towering Ego's own dropped
  // exception elsewhere in this pipeline).
  "mesmerist:dreamstalker:sleepless:2": {
    changes: [c("1", "immEffect.sleep")],
    detail: () => "immune to sleep effects (save bonus vs. fatigue/exhaustion not modeled)",
    confidence: "medium",
    provenance: "a dreamstalker gains immunity to sleep effects",
  },

  // Enigma's "Veiled Steps" replaces Consummate Liar's flat Bluff bonus with
  // a differently-scaled Stealth bonus — plain-prose replacement (class note
  // 5), no double-count risk from a different skill target.
  "mesmerist:enigma:veiled-steps:1": {
    changes: [c("max(1, floor(@class.unlevel / 4))", "skill.ste")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 4))} Stealth`,
    confidence: "high",
    provenance:
      "An enigma gains a bonus to his Stealth checks equal to 1/4 his mesmerist level (minimum +1).",
  },

  // Fey Trickster's "One with the Fey" (20th level) grants low-light vision
  // unconditionally alongside a player-chosen fey-type ability (haste,
  // unearthly grace, supernatural speed, or tress attacks) — only the
  // low-light vision clause is unconditional across every choice, so it's
  // the one extracted (mixed-feature precedent: extract the unconditional
  // clause, drop the variable one). Standard sensell grant shape.
  "mesmerist:fey-trickster:one-with-the-fey:20": {
    changes: [c("1", "sensell")],
    detail: () => "low-light vision (chosen fey-type ability not modeled)",
    confidence: "medium",
    provenance: "She gains low-light vision",
  },

  // Gaslighter's "Consummate Cruelty" replaces Consummate Liar's flat Bluff
  // bonus with the identical formula shape on Intimidate — plain-prose
  // replacement (class note 5). The Dirty Trick feat-prerequisite exemption
  // is a non-numeric grant, dropped.
  "mesmerist:gaslighter:consummate-cruelty:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.int")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Intimidate`,
    confidence: "high",
    provenance:
      "A gaslighter gains a bonus equal to 1/2 his mesmerist level (minimum 1) on Intimidate checks.",
  },

  // Mindwyrm Mesmer's "Innate Coercion" replaces Consummate Liar's flat
  // Bluff bonus with the identical formula shape on Intimidate — plain-prose
  // replacement (class note 5). The "no size penalty on Intimidate" clause
  // is a non-numeric rule exemption, dropped.
  "mesmerist:mindwyrm-mesmer:innate-coercion:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.int")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Intimidate`,
    confidence: "high",
    provenance:
      "a mindwyrm mesmer gains a bonus equal to 1/2 his mesmerist level (minimum 1) on Intimidate checks.",
  },

  // Toxitician's "Deft Fingers" replaces Consummate Liar's flat Bluff bonus
  // with the identical formula shape on Sleight of Hand — plain-prose
  // replacement (class note 5). Note the vendored text's own typo, "Sleight
  // of Hands", preserved verbatim in provenance.
  "mesmerist:toxitician:deft-fingers:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.slt")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Sleight of Hand`,
    confidence: "high",
    provenance:
      "A toxitician adds 1/2 his class level (minimum 1) as a bonus on all Sleight of Hands checks.",
  },
};
