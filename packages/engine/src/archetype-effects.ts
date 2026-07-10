/**
 * Hand-authored mechanical effects for archetype class features (issue #7).
 * Clean-room from the published PF1 rules — no Foundry source was consulted
 * (DESIGN.md §6).
 *
 * Context: the vendored archetype dataset (`packages/data-pipeline/src/
 * transform/archetypes.ts`, ultimately from the third-party `pf1e-archetypes`
 * CSV/XML compilation) carries only prose (`ArchetypeFeature.description`) —
 * no structured mechanical data at all, and its prose has at least one
 * verified copy-paste error (see `ArchetypeFeature`'s doc comment in
 * `@pf1/schema`), so it isn't trustworthy as a mechanics source either. Across
 * all 2,326 vendored archetype features, essentially none carry anything a
 * script could turn into a `Change` — numeric support has to be hand-authored
 * per feature, the same posture as `feat-effects.ts`/`traits.ts`/`tables.ts`.
 *
 * Scope (audited, not exhaustive): this table only covers archetype features
 * that grant an UNCONDITIONAL, always-on numeric effect — the same bar
 * `traits.ts` uses (a narrowly-scoped "+X vs. fear" or "+X while wielding your
 * chosen weapon" bonus is deliberately left unmodeled here, same as
 * `traits.ts`'s `courageous`/`birthmark`/`fencer` entries, to avoid
 * over-applying a number the static sheet can't scope correctly). Most
 * archetype features are either purely narrative, an activated ability with a
 * resource cost the engine doesn't track (ki, drunken ki, grit, panache), or
 * conditional on a per-attack/per-round situation (rage state, charging,
 * wielding a specific chosen weapon) — those are left prose-only rather than
 * risk a wrong always-on number.
 *
 * Map key: the archetype feature's own `RefEntity.id` (as synthesized by
 * `data-pipeline/transform/archetypes.ts`:
 * `${archetypeId}:${slug(abilityName)}:${level}`) — stable as long as the
 * archetype/ability names in the vendored CSVs don't change, and directly
 * usable as `refData.archetypeFeatures[id]` without a second lookup table.
 *
 * Applied through the same `collectModifiers` pipeline as every other change
 * source (see `collect.ts`'s "archetype feature effects" section): only when
 * the granting archetype is active (`doc.build.archetypes`) AND the
 * character's level in that archetype's class has reached the feature's
 * `level` gate. `detail()` produces the short summary `ClassFeaturesList`
 * shows next to the feature name — the same mechanism `tables.ts`'s
 * `sneakAttackDice`/`barbarianDamageReduction` already feed into
 * `DerivedClassFeature.detail`.
 */

import type { Change } from "@pf1/schema";

export interface ArchetypeFeatureEffect {
  /**
   * Typed modifiers this feature grants — evaluated via the normal formula
   * pipeline. Empty for a feature that's genuinely activated/resource-gated
   * or otherwise conditional in a way the static sheet can't safely
   * auto-apply (see `detail` below) — present in the table anyway so the UI
   * still surfaces a terse mechanical summary instead of nothing, but
   * `archetypeHasModeledEffects` (the picker's "M" badge) only counts an
   * entry once `changes.length > 0`, so a notes-only entry never claims to
   * be a modeled numeric effect.
   */
  changes: Change[];
  /**
   * Short mechanical summary for `ClassFeaturesList` (e.g. "DR 5/—" for a
   * real Change, or "swift action, 4+Cha rounds/day — not modeled" for a
   * notes-only entry).
   */
  detail?: (classLevel: number) => string;
}

const c = (formula: string, target: string, type = "untyped"): Change => ({
  formula,
  target,
  type,
});

export const ARCHETYPE_FEATURE_EFFECTS: Readonly<Record<string, ArchetypeFeatureEffect>> = {
  // ── Fighter ──────────────────────────────────────────────────────────────

  // Weapon Master's "Weapon Training" (Ultimate Combat p. 16) replaces Armor
  // Training but is mechanically identical to it (reduce ACP by 1, +1 max Dex
  // bonus at 3rd, then every 4 levels thereafter to a max of -4/+4 at 15th) —
  // a pure reflavor. Same formula the vendored Armor Training class feature
  // uses (see `class-features.json`), just granted under a different feature
  // name/archetype.
  "fighter:weapon-master:weapon-training:3": {
    changes: [
      c("clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "mDexA"),
      c("-clamp(floor((@class.unlevel + 1) / 4), 0, 4)", "acpA"),
    ],
    detail: (level) => `+${Math.min(4, Math.floor((level + 1) / 4))} max Dex / -ACP (armor)`,
  },

  // Archer's "Hawkeye" (Ultimate Combat p. 8) replaces bravery (which carries
  // no vendored `changes` upstream — nothing to suppress) with a flat, always-
  // on Perception bonus: +1 at 2nd, +1 for every 4 levels beyond. The
  // accompanying "+5 ft. bow range increment, +5 ft. more every 4 levels" half
  // of the same ability is left unmodeled — there's no engine target for a
  // weapon's range increment (attack rolls don't currently model range at
  // all), so adding only the Perception half rather than guessing at the
  // other is the honest call here.
  "fighter:archer:hawkeye:2": {
    changes: [c("1 + floor((@class.unlevel - 2) / 4)", "skill.per")],
    detail: (level) => `+${1 + Math.floor((level - 2) / 4)} Perception`,
  },

  // Two-Handed Fighter's own replacement for Armor Training, "Overhand Chop"
  // (Advanced Player's Guide p. 20-ish era reprint, Ultimate Combat), is a
  // per-attack situational rule (double Str bonus on damage for a single
  // attack/charge with a two-handed weapon) — a real number, but one that
  // only applies to a specific attack the player chooses each round, not an
  // always-on Change (same bar as Power Attack/Deadly Aim's situational
  // treatment in `feat-effects.ts`). Left as a display-only note; the swap
  // itself (Armor Training's `mDexA`/`acpA` no longer applying) is already
  // exercised by the "issue #7 bug fix" describe block above.
  "fighter:two-handed-fighter:overhand-chop:3": {
    changes: [],
    detail: () => "double Str bonus on a single 2H attack/charge — situational, not modeled",
  },

  // ── Barbarian ────────────────────────────────────────────────────────────

  // Urban Barbarian's "Controlled Rage" (Ultimate Combat p. 18) replaces the
  // rage ability's normal +4 Str/+4 Con (and later +6/+8) bonuses with a
  // flat morale bonus the player splits across Str/Dex/Con. This is only
  // meaningful relative to a "base rage bonus" the engine doesn't apply in
  // the first place today (rage's ability bonuses are activated/toggled by
  // the player as a manual buff, same posture this file's own doc comment
  // gives for ki/grit/panache — there is nothing baseline to override, and
  // adding a number here with no corresponding base-rage number to replace
  // would be a net-new invented mechanic, not a faithful reflavor). Notes only.
  "barbarian:urban-barbarian:controlled-rage-ex:1": {
    changes: [],
    detail: () => "+4/+6/+8 morale bonus (Str/Dex/Con split) while raging — not modeled (see rage)",
  },

  // Invulnerable Rager's "Invulnerability (Ex)" (Advanced Player's Guide p.
  // 18) replaces uncanny dodge, improved uncanny dodge, AND damage reduction
  // in one feature — the CSV pairing script can't link a single feature to
  // three base-feature slots, so this is an "ambiguous" (unpaired) swap in
  // `RefData.archetypeFeatures`. DR/— equal to half barbarian level (doubled
  // vs. nonlethal — not modeled, see the omitted contextNote below). Always
  // on once granted (2nd level), so a flat Change is safe.
  "barbarian:invulnerable-rager:invulnerability-ex:2": {
    changes: [c("floor(@class.unlevel / 2)", "dr")],
    detail: (level) => `DR ${Math.floor(level / 2)}/— (×2 vs. nonlethal)`,
  },

  // Savage Barbarian's "Natural Toughness" (Ultimate Combat p. 18) replaces
  // Damage Reduction with a scaling natural armor bonus while wearing no
  // armor (shields still allowed) — +1 at 7th, +1 every 3 levels thereafter.
  // `nac`/type "base" matches the vendored natural-armor convention (see
  // races.json's `nac` changes) so it correctly doesn't stack with another
  // natural-armor source.
  "barbarian:savage-barbarian:natural-toughness-1:7": {
    changes: [c("if(lt(@armor.type, 1), 1 + floor((@class.unlevel - 7) / 3), 0)", "nac", "base")],
    detail: (level) => `+${1 + Math.floor((level - 7) / 3)} natural armor (no armor worn)`,
  },

  // Wildborn's "Damage reduction" (Blood of the Beast) replaces the base
  // Damage Reduction class feature with an identical progression (1/— at
  // 7th, +1 every 3 levels) — a pure reflavor, same numbers as
  // `tables.ts`'s `barbarianDamageReduction`.
  "barbarian:wildborn:damage-reduction:7": {
    changes: [c("1 + floor((@class.unlevel - 7) / 3)", "dr")],
    detail: (level) => `DR ${1 + Math.floor((level - 7) / 3)}/—`,
  },

  // ── Cleric ───────────────────────────────────────────────────────────────

  // Cloistered Cleric's "Breadth of Knowledge" (Advanced Player's Guide p.
  // 22): +1/2 class level (min +1) on all Knowledge skills, usable untrained.
  // Purely additive (traded for Weapon and Armor Proficiency, which the
  // engine doesn't model), same formula/target as the vendored Bardic
  // Knowledge class feature (`skill.knowledge` fans out to every Knowledge
  // subskill — see `compute.ts`'s `SKILL_GROUPS`).
  "cleric:cloistered-cleric:breadth-of-knowledge:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.knowledge")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Knowledge (untrained)`,
  },

  // Crusader (Faiths of Purity) grants a bonus feat (from a restricted,
  // armor/shield/weapon-focused list) at 1st, then again at 5th and every 5
  // levels thereafter — additive, no paired base-feature slot (a cleric has
  // no ordinary bonus-feat progression to swap out), so this is a pure grant
  // rather than a reflavor. The published text's "to a maximum of six at
  // 20th level" doesn't reconcile with its own enumerated schedule (1st, 5th,
  // 10th, 15th, 20th = five feats, not six) — hand-verified against the
  // schedule as written and modeled as five, flagging the discrepancy here
  // rather than inventing a sixth gate the prose never states.
  "cleric:crusader:bonus-feat:1": {
    changes: [c("1 + floor(@class.unlevel / 5)", "bonusFeats")],
    detail: (level) => `${1 + Math.floor(level / 5)} bonus feat(s) (restricted list)`,
  },

  // ── Ranger ───────────────────────────────────────────────────────────────
  // The following six archetypes replace the ranger's Combat Style Feat with
  // a same-schedule bonus-feat progression restricted to a specific style
  // list (archery/mounted/natural-weapon/etc.) — the restriction itself isn't
  // modeled (feat choices aren't gated by style here), but the *count* of
  // bonus feats is identical to the base feature's formula (2nd, 6th, 10th,
  // 14th, 18th), so reusing it is a safe reflavor rather than a guess.

  "ranger:bow-nomad:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:horse-lord:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} mounted combat bonus feat(s)`,
  },
  "ranger:ilsurian-archer:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:shapeshifter:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} natural weapon bonus feat(s)`,
  },
  "ranger:stormwalker:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} archery bonus feat(s)`,
  },
  "ranger:toxophilite:combat-style-feat:2": {
    changes: [c("floor((@class.unlevel + 2) / 4)", "bonusFeats")],
    detail: (level) => `${Math.floor((level + 2) / 4)} ranged combat bonus feat(s)`,
  },

  // ── Sorcerer ─────────────────────────────────────────────────────────────

  // Sorcerer of Sleep's (Bloodforge/Pathfinder Player Companion) "Pesh
  // Expert" replaces the bloodline arcana ability with a flat +1/2 sorcerer
  // level (min +1) bonus across four specific, named skills — unconditional
  // and untrained, the same shape as Cloistered Cleric's Breadth of
  // Knowledge above. NOTE: the vendored dataset can't pair this feature to
  // "bloodline arcana" (bloodline arcana isn't a normal `RefData.classFeatures`
  // entry — it's hand-authored in `bloodlines.ts`, applied by `collect.ts`'s
  // dedicated bloodline-arcana loop, which has no archetype-swap awareness at
  // all), so a Sorcerer of Sleep with a bloodline selected still gets both
  // this bonus AND their bloodline's arcana — a pre-existing composition gap
  // (same shape as the "ambiguous swap" cases `archetypes.ts` already
  // documents for barbarian DR), not introduced by this entry. The UI's
  // "may replace an existing ability" warning already surfaces this (the
  // swap has no `pairedBaseFeatureUuid`), so it's flagged to the player
  // rather than silently wrong.
  "sorcerer:sorcerer-of-sleep:pesh-expert:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.apr"),
      c("max(1, floor(@class.unlevel / 2))", "skill.crf.alchemy"),
      c("max(1, floor(@class.unlevel / 2))", "skill.hea"),
      c("max(1, floor(@class.unlevel / 2))", "skill.klo"),
    ],
    detail: (level) =>
      `+${Math.max(1, Math.floor(level / 2))} Appraise/Craft (alchemy)/Heal/Knowledge (local)`,
  },

  // Seeker's (Occult Adventures) "Tinkering" adds Disable Device as a class
  // skill and grants +1/2 sorcerer-or-oracle level (min +1) on ALL Disable
  // Device checks — unconditional. Its companion Perception bonus is scoped
  // to "checks made to locate traps" only (situational — omitted, same bar as
  // every other narrowly-scoped bonus in this file). No paired base-feature
  // slot (replaces the sorcerer's bonus Eschew Materials feat, which the
  // engine doesn't model either way, so nothing to suppress).
  "sorcerer:seeker:tinkering:1": {
    changes: [c("max(1, floor(@class.unlevel / 2))", "skill.dev")],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Disable Device`,
  },

  // ── Rogue ────────────────────────────────────────────────────────────────

  // Scout's "Scout's Charge" (Ultimate Combat p. 21) and "Skirmisher" (its
  // 8th-level follow-up) grant sneak-attack-as-if-flat-footed on a charge or
  // a move-then-attack, respectively — genuinely conditional on the specific
  // action taken that round (same bar as `traits.ts`'s combat-situational
  // entries), not an always-on Change. Sneak attack's own die count is
  // unaffected (still `sneakAttackDice` in `tables.ts`), so nothing here
  // changes the static sheet's numbers; this is a pure at-table reminder.
  "rogue:scout:scout-s-charge:4": {
    changes: [],
    detail: () => "sneak attack on a charge (as if flat-footed) — situational, not modeled",
  },

  // Knife Master's kit (Advanced Class Guide p. 21) is entirely conditional
  // on the specific weapon in hand: "Hidden Blade" only bonuses concealing a
  // light blade (not Sleight of Hand generally), "Sneak Stab" upsizes sneak
  // attack dice to d8s only with a dagger/kukri/etc. (die *count* is
  // unaffected), and "Blade Sense" is a dodge bonus that only applies against
  // attacks made with a light blade — a fact about the ATTACKER's weapon the
  // static sheet has no way to know. None of these clear the "unconditional"
  // bar this file uses elsewhere; left prose-only.
  "rogue:knife-master:hidden-blade:1": {
    changes: [],
    detail: () => "light-blade-only Sleight of Hand/sneak attack tweaks — situational, not modeled",
  },

  // ── Paladin ──────────────────────────────────────────────────────────────

  // Oath of Vengeance's (Advanced Class Guide p. 24) "Channel Wrath" trades
  // lay-on-hands uses for an extra smite (a resource conversion, not a flat
  // number) and its 11th-level "Powerful Justice" grants allies a conditional
  // smite-damage-only ability. Both are resource-gated activated abilities,
  // the same category as ki/grit/panache this file already excludes.
  "paladin:oath-of-vengeance:channel-wrath:4": {
    changes: [],
    detail: () => "spend 2 lay on hands for 1 extra smite/day — resource trade, not modeled",
  },

  // Divine Hunter (Ultimate Combat p. 23) is a ranged-focused paladin rebuild:
  // Precise Shot as a 1st-level bonus feat (Precise Shot itself has no
  // baseline static number — see `feat-effects.ts`'s `SituationalFeatEffect`
  // treatment of it), then a run of conditional ally auras (Shared Precision,
  // Aura of Care, Hunter's Blessing, Righteous Hunter) that only matter within
  // 10 ft. of specific allies taking specific actions. Nothing here clears
  // the unconditional bar.
  "paladin:divine-hunter:precise-shot:1": {
    changes: [],
    detail: () => "bonus feat: Precise Shot — no baseline number to model",
  },

  // ── Monk ─────────────────────────────────────────────────────────────────

  // Nornkith's (Blood of the Beast's "Nimble Guardian") "Nimble Reflexes"
  // replaces Still Mind (which carries no vendored `changes` upstream —
  // nothing to suppress) with a flat, always-on +2 Reflex save bonus at 3rd
  // level. No further scaling in the published text.
  "monk:nornkith:nimble-reflexes:3": {
    changes: [c("2", "ref")],
    detail: () => "+2 Reflex saves",
  },

  // ── Bard ─────────────────────────────────────────────────────────────────

  // Archaeologist's "Archaeologist's Luck" (Ultimate Combat p. 30) is a real,
  // precisely-scaling number (+1 luck bonus to attack/saves/skills/weapon
  // damage, +2 at 5th, +3 at 11th, +4 at 17th) — but it's activated as a
  // swift action, treated as bardic performance (rounds/day = 4 + Cha mod,
  // maintained as a free action each round), and mutually exclusive with
  // every other performance. The engine has no generic "activated performance
  // buff" mechanism yet (bardic performance today is tracked only as a
  // rounds/day resource pool in `resources.ts` — there's no toggle that
  // applies its numeric benefit while active, for Inspire Courage or anything
  // else), so wiring one bespoke buff just for this archetype would be new
  // engine machinery, not a hand-authored effects-table entry. Notes only —
  // the scaling numbers are recorded here so a future generic
  // performance-buff feature can pick them up.
  "bard:archaeologist:archaeologist-s-luck:1": {
    changes: [],
    detail: (level) =>
      `+${level >= 17 ? 4 : level >= 11 ? 3 : level >= 5 ? 2 : 1} luck (swift action, 4+Cha rounds/day) — not modeled`,
  },

  // ── Druid ────────────────────────────────────────────────────────────────

  // Menhir Savant's (Adventurer's Guide-era Ley Line archetype) entire kit —
  // Spirit Sense (a detection ability), Place Magic (a per-use caster-level
  // bump), Walk the Lines and Empty Body (both limited-use spell-likes) — is
  // activated and resource-gated, none of it an always-on number.
  "druid:menhir-savant:spirit-sense:1": {
    changes: [],
    detail: () => "detect undead/fey/outsiders — no numeric effect to model",
  },

  // ── Wizard ───────────────────────────────────────────────────────────────

  // Spell Sage's (Ultimate Intrigue) whole identity is "spend a limited daily
  // use to borrow another class's spell or spike caster level for one spell"
  // — Focused Spells (a 1-3/day +4 CL boost) and Spell Study (spontaneous
  // bard/cleric/druid spells) are both activated, resource-gated abilities
  // with no baseline number the static sheet applies passively.
  "wizard:spell-sage:focused-spells:1": {
    changes: [],
    detail: (level) =>
      `${level >= 16 ? 3 : level >= 8 ? 2 : 1}/day: +4 CL for one spell — not modeled (activated)`,
  },

  // ── Arcanist ─────────────────────────────────────────────────────────────

  // Audited all 11 vendored arcanist archetypes (Arcane Tinkerer, Blood
  // Arcanist, Brown-Fur Transmuter, Eldritch Font, Elemental Master,
  // Magaambyan Initiate, Occultist, School Savant, Tarot Student, Twilight
  // Sage, White Mage) — every one of them reworks the arcane
  // reservoir/exploit/spells-known subsystems (extra prepared spells, reservoir
  // point costs, spell-list additions) rather than granting a flat number.
  // School Savant is the most-played of the set (a direct arcanist analogue
  // of the wizard's arcane school) and is recorded here as the representative
  // no-Change entry: its "gains the wizard arcane school's abilities, using
  // arcanist level as wizard level" hook would require wiring a whole new
  // cross-class feature-grant path (mirroring `collectGrantedFeatures`'s
  // domain/school handling) rather than a table entry — out of scope here,
  // noted for a future pass.
  "arcanist:school-savant:school-focus-su:1": {
    changes: [],
    detail: () => "grants a wizard arcane school's powers — not modeled (see doc comment)",
  },
};
