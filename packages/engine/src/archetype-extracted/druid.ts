/**
 * Druid's slice of the issue #45 batch-extraction pipeline (wave 2,
 * 2026-07-06). Per the per-class file convention (IMPLEMENTATION_PLAN.md's
 * dated #45 "Batch-extraction wave prep" section), this file owns BOTH of
 * druid's pipeline artifacts — `DRUID_ARCHETYPE_FEATURE_CLASSIFICATION` (the
 * full per-feature audit) and `DRUID_ARCHETYPE_EFFECTS_EXTRACTED` (the
 * machine-extracted `Change`-shaped effects table) — so a future wave working
 * on a different class never has a reason to touch this file; only
 * `index.ts` (the aggregator) needs one new import + one new spread per class.
 *
 * ── DRUID_ARCHETYPE_FEATURE_CLASSIFICATION ────────────────────────────────
 *
 * Classification audit: EVERY feature of EVERY vendored druid archetype (71
 * archetypes, 360 features), read and bucketed as `numeric` / `situational` /
 * `subsystem` / `blocked` — see the fighter pilot's rubric
 * (IMPLEMENTATION_PLAN.md's dated pipeline section) for the full bucket
 * definitions this was applied against; summarized:
 *  - "numeric": an unconditional (or armor-state-gated, matching the
 *    hand-verified table's `@armor.type` precedent) bonus expressible via a
 *    real `packages/engine/src/targets.ts` target.
 *  - "situational": a REAL number, but scoped to a specific terrain, a
 *    narrow save-vs-category (matching `traits.ts`'s `courageous`/`birthmark`
 *    precedent — `fort`/`ref`/`will` are unqualified totals, so a "+X vs.
 *    fear" style bonus can't be applied without over-applying to every
 *    other save too), a specific maneuver/action, or a companion/ally rather
 *    than the druid herself.
 *  - "subsystem": grants an unrelated ability, resource, proficiency, or
 *    choice-list (or removes a penalty the engine never modeled) — no
 *    Change-shaped number to extract at all. This is druid's dominant
 *    bucket by a wide margin: Nature Bond (animal companion or domain
 *    choice), Wild Empathy, Totem Transformation, and Totemic Summons —
 *    every single one of druid's ~10 "Animal Shaman" archetypes (Bat, Bear,
 *    Boar, Dragon, Eagle, Lion, Saurian, Serpent, Shark, Wolf Shaman) shares
 *    this same four-feature reflavor kit — are ALL subsystem: Wild Empathy
 *    has no engine target at all (verified — no `empathy`-shaped target
 *    exists anywhere in `compute.ts`/`targets.ts`), Totem Transformation and
 *    Totemic Summons are activated/resource-gated or summon-list tweaks with
 *    no baseline Change, and Wild Shape's cadence/available-forms tweaks
 *    have no per-archetype modification hook (uses/day still rides the base
 *    Wild Shape class feature's own vendored `uses.maxFormula` unmodified,
 *    per the task's own guidance). Per-class base-feature audit: unlike
 *    fighter's Armor Training / Bonus Feats (FGT) or monk's AC Bonus / Fast
 *    Movement, NONE of druid's base progression features (Nature Bond, Wild
 *    Empathy, Wild Shape, Trackless Step, Woodland Stride, Resist Nature's
 *    Lure, Venom Immunity, A Thousand Faces, Timeless Body) are themselves
 *    `Change`-driven upstream — so there is no atomic-partial-tier
 *    composition trap for druid archetypes to fall into (see "blocked"
 *    below).
 *  - "blocked": none found. Checked every archetype's swap against druid's
 *    base kit (see the audit note above) — since none of druid's base
 *    features carry a vendored `Change` in the first place, there is no
 *    "unpaired partial replacement of an atomic Change-driven grant" trap
 *    for a druid archetype to trigger (the fighter Armor Training / monk
 *    Wis-to-AC shape of bug). Wild Shape's uses/day is read directly from
 *    the class feature's own `uses.maxFormula`, not through
 *    `collectModifiers`, so a partial-tier wild-shape-frequency tweak
 *    (e.g. Wild Whisperer's "replaces the additional use of wild shape at
 *    6th/8th level") has no `Change` to double-count against either — it's
 *    RAW-imperfect in the same spirit as fighter's Unbreakable case, but not
 *    a composition trap this table needs to record specially; classified
 *    `subsystem` like every other Wild Shape cadence tweak.
 *
 * Methodology note (disclosed, not hidden — same posture as the fighter
 * pilot): the `numeric` bucket (24 new entries + 1 pre-existing hand-verified
 * overlap, Menhir Savant's Spirit Sense) was individually hand-verified
 * against the vendored prose, each carrying its own `provenance` sentence
 * below. The `situational` bucket (47 entries) was likewise individually
 * flagged during the full read — every entry's note states the specific
 * narrow scope (terrain, save-vs-category, maneuver, or companion-target)
 * that keeps it off the `numeric` list. The large `subsystem` bulk (288
 * entries) was heuristic-assisted for its generic notes (regex over the
 * prose for "grants an immunity" / "activated, resource-gated ability" /
 * "proficiency change" / "removes a penalty" shapes, cross-checked against
 * every archetype this agent read in full) — the boundary within
 * `subsystem` doesn't affect engine correctness (no bucket in `subsystem`
 * emits a `Change`), only audit-file clarity, so this is a deliberate,
 * disclosed scoping choice for the wave rather than an oversight.
 *
 * **Composition-safety finding worth carrying into future waves**: Aquatic
 * Druid's Natural Swimmer (3rd level, swim speed = half land speed) and
 * Seaborn (9th level, swim speed = full land speed) are two features of the
 * SAME archetype describing an evolving single number, not two independent
 * additive bonuses — `swimSpeed`/`landSpeed` targets are untyped and SUM, so
 * extracting both as separate Changes would over-grant 1.5x land speed at
 * 9th+. Folded into one conditional formula on Natural Swimmer's own entry;
 * Seaborn's classification note explains why it doesn't also get a
 * `swimSpeed` Change. Worth checking for on every future within-archetype
 * "upgrades an earlier feature's own number" pattern (distinct from the
 * cross-feature `pairedBaseFeatureUuid` swap machinery, which only
 * suppresses a BASE class feature, not a sibling archetype feature).
 *
 * **Suspected vendored-data bugs found (not fixed here, per the task's
 * "report suspects, don't fix" instruction — flagged in the relevant
 * classification entries' notes too):**
 *  - `druid:feral-child:favored-terrain-upgrade:13` — description is a
 *    byte-for-byte duplicate of `favored-terrain:3`'s text; the real
 *    13th-level favored-terrain upgrade prose appears to be missing from
 *    the vendored compilation.
 *  - `druid:swarm-monger:wild-shape:4` — description is a verbatim copy of
 *    a DIFFERENT archetype's (Swamp Druid's) Wild Shape text, including a
 *    mismatched "6th level" clause on a feature keyed to level 4.
 *  - `druid:urban-druid:a-thousand-faces:6` — description says "At 13th
 *    level" but the feature's own `level` field is 6.
 *  - `druid:jungle-druid:wild-shape:6` — description duplicates its own
 *    opening sentence verbatim (minor, cosmetic).
 *  - Two different archetypes (Storm Druid and Tempest Druid) each have a
 *    feature named "Eyes of the Storm" with completely unrelated mechanics
 *    (a see-through-fog utility vs. a narrow save bonus) — not necessarily a
 *    bug (PF1 splatbooks do reuse ability names across sourcebooks), but
 *    flagged since it could trip up a future id/name-based lookup.
 *
 * ── DRUID_ARCHETYPE_EFFECTS_EXTRACTED ──────────────────────────────────────
 *
 * Machine-extracted mechanical effects for druid archetype class features
 * (issue #45, wave 2). Clean-room from the published PF1 rules — the
 * vendored prose this was extracted from (`archetype-features.json`) is OGL,
 * so reading it is fine; no Foundry source was consulted (DESIGN.md §6).
 *
 * This table is deliberately SEPARATE from `archetype-effects.ts`'s
 * `ARCHETYPE_FEATURE_EFFECTS` (the hand-verified table) — every entry here
 * additionally carries `confidence`/`provenance` so a reviewer (or the UI)
 * can never confuse "a human read the rulebook and checked this" with "an
 * extraction pass inferred this from prose." `collect.ts` and `archetypes.ts`
 * both resolve through `resolveArchetypeFeatureEffect`
 * (`archetype-effects-resolve.ts`), which always checks the hand-verified
 * table FIRST — Menhir Savant's `spirit-sense:1` is present in the
 * hand-verified table (issue #7) and is deliberately NOT duplicated here;
 * it is still recorded as `numeric` in the classification table above with
 * a "hand-verified, ground truth" note, matching the fighter file's own
 * `weapon-master:weapon-training:3` precedent for the same situation.
 *
 * Confidence rubric (identical to the fighter file's):
 *  - "high": a literal, fully-general, unconditional scaling bonus, or an
 *    armor-state-gated bonus matching the `@armor.type` precedent.
 *  - "medium": the formula required dropping a second textual condition the
 *    engine can't check (encumbrance/light-load, "when about her own deity"),
 *    an id/prose level-gate mismatch in the vendored data, a nonstandard
 *    compound `dr.<bypass>` qualifier (Aquatic Druid's Deep Diver, "DR/
 *    slashing or piercing" — no precedent for a combined bypass string in
 *    this table yet), or (Aquatic Druid's Natural Swimmer) folding a
 *    same-archetype composition-safety fix (see the finding above) into one
 *    formula spanning two feature levels.
 *  - "low": not used this wave, same as the fighter pilot.
 */

import {
  c,
  type ArchetypeFeatureClassificationEntry,
  type ExtractedArchetypeFeatureEffect,
} from "./types.js";

/** Keyed by the archetype feature's own `RefEntity.id` (same key `archetype-effects.ts` uses). */
export const DRUID_ARCHETYPE_FEATURE_CLASSIFICATION: Readonly<
  Record<string, ArchetypeFeatureClassificationEntry>
> = {
  "druid:aerie-protector:nature-bond:1": {
    archetypeId: "druid:aerie-protector",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:aerie-protector:wild-empathy:1": {
    archetypeId: "druid:aerie-protector",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:aerie-protector:sky-and-stone:2": {
    archetypeId: "druid:aerie-protector",
    name: "Sky and Stone",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to mountainous/high-altitude terrain — terrain-conditional, same bar as favored-terrain-style bonuses",
  },
  "druid:aerie-protector:wind-at-her-back:4": {
    archetypeId: "druid:aerie-protector",
    name: "Wind at Her Back",
    level: 4,
    bucket: "situational",
    note: "+4 CMD/save bonus scoped to a narrow trigger list (altitude, air pressure, wind, electricity Reflex saves) — not general cmd/fort/ref",
  },
  "druid:aerie-protector:wild-shape:6": {
    archetypeId: "druid:aerie-protector",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:aerie-protector:in-the-wind:9": {
    archetypeId: "druid:aerie-protector",
    name: "In the Wind",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:ancient-guardian:ancient-arms:1": {
    archetypeId: "druid:ancient-guardian",
    name: "Ancient Arms",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:ancient-guardian:community-bond:1": {
    archetypeId: "druid:ancient-guardian",
    name: "Community Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:ancient-guardian:dispel-hostility:1": {
    archetypeId: "druid:ancient-guardian",
    name: "Dispel Hostility",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:ancient-guardian:patience-of-nature:1": {
    archetypeId: "druid:ancient-guardian",
    name: "Patience of Nature",
    level: 1,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:ancient-guardian:ancient-ways:3": {
    archetypeId: "druid:ancient-guardian",
    name: "Ancient Ways",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:ancient-guardian:unimpeachable:4": {
    archetypeId: "druid:ancient-guardian",
    name: "Unimpeachable",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (enchantments) — not general fort/ref/will",
  },
  "druid:ancient-guardian:undo-artifice:13": {
    archetypeId: "druid:ancient-guardian",
    name: "Undo Artifice",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:ape-shaman:nature-bond:1": {
    archetypeId: "druid:ape-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:ape-shaman:wild-empathy:1": {
    archetypeId: "druid:ape-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:ape-shaman:totem-transformation:2": {
    archetypeId: "druid:ape-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:ape-shaman:wild-shape:6": {
    archetypeId: "druid:ape-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:ape-shaman:totemic-summons:13": {
    archetypeId: "druid:ape-shaman",
    name: "Totemic Summons",
    level: 13,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:aquatic-druid:wild-empathy:1": {
    archetypeId: "druid:aquatic-druid",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:aquatic-druid:aquatic-adaptation:2": {
    archetypeId: "druid:aquatic-druid",
    name: "Aquatic Adaptation",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to aquatic terrain — terrain-conditional",
  },
  "druid:aquatic-druid:natural-swimmer:3": {
    archetypeId: "druid:aquatic-druid",
    name: "Natural Swimmer",
    level: 3,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:aquatic-druid:resist-ocean-s-fury:4": {
    archetypeId: "druid:aquatic-druid",
    name: "Resist Ocean's Fury",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (water-type spells / aquatic-subtype abilities) — not general fort/ref/will",
  },
  "druid:aquatic-druid:wild-shape:6": {
    archetypeId: "druid:aquatic-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:aquatic-druid:seaborn:9": {
    archetypeId: "druid:aquatic-druid",
    name: "Seaborn",
    level: 9,
    bucket: "subsystem",
    note: "aquatic subtype/amphibious/endure-cold-as-elements; its swim-speed-to-full-land-speed upgrade is already folded into natural-swimmer's own extracted formula (see DRUID_ARCHETYPE_EFFECTS_EXTRACTED) rather than given a second swimSpeed Change here — two separate untyped swimSpeed Changes on the same archetype would sum instead of superseding, over-granting 1.5x land speed",
  },
  "druid:aquatic-druid:deep-diver:13": {
    archetypeId: "druid:aquatic-druid",
    name: "Deep Diver",
    level: 13,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:arctic-druid:arctic-native:2": {
    archetypeId: "druid:arctic-druid",
    name: "Arctic Native",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to cold/icy terrain — terrain-conditional",
  },
  "druid:arctic-druid:icewalking:3": {
    archetypeId: "druid:arctic-druid",
    name: "Icewalking",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:arctic-druid:arctic-endurance:4": {
    archetypeId: "druid:arctic-druid",
    name: "Arctic Endurance",
    level: 4,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:arctic-druid:wild-shape:6": {
    archetypeId: "druid:arctic-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:arctic-druid:snowcaster:9": {
    archetypeId: "druid:arctic-druid",
    name: "Snowcaster",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:arctic-druid:flurry-form:13": {
    archetypeId: "druid:arctic-druid",
    name: "Flurry Form",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:bat-shaman:nature-bond:1": {
    archetypeId: "druid:bat-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:bat-shaman:wild-empathy:1": {
    archetypeId: "druid:bat-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:bat-shaman:totem-transformation:2": {
    archetypeId: "druid:bat-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:bat-shaman:totemic-summons:5": {
    archetypeId: "druid:bat-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:bat-shaman:bonus-feat:9": {
    archetypeId: "druid:bat-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:bear-shaman:nature-bond:1": {
    archetypeId: "druid:bear-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:bear-shaman:wild-empathy:1": {
    archetypeId: "druid:bear-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:bear-shaman:totem-transformation:2": {
    archetypeId: "druid:bear-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:bear-shaman:totemic-summons:5": {
    archetypeId: "druid:bear-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:bear-shaman:wild-shape:6": {
    archetypeId: "druid:bear-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:bear-shaman:bonus-feat:9": {
    archetypeId: "druid:bear-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:blight-druid:nature-bond:1": {
    archetypeId: "druid:blight-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:blight-druid:vermin-empathy:1": {
    archetypeId: "druid:blight-druid",
    name: "Vermin Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:blight-druid:miasma:5": {
    archetypeId: "druid:blight-druid",
    name: "Miasma",
    level: 5,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:blight-druid:blightblooded:9": {
    archetypeId: "druid:blight-druid",
    name: "Blightblooded",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:blight-druid:plaguebearer:13": {
    archetypeId: "druid:blight-druid",
    name: "Plaguebearer",
    level: 13,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:boar-shaman:nature-bond:1": {
    archetypeId: "druid:boar-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:boar-shaman:wild-empathy:1": {
    archetypeId: "druid:boar-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:boar-shaman:totem-transformation:2": {
    archetypeId: "druid:boar-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:boar-shaman:totemic-summons:5": {
    archetypeId: "druid:boar-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:boar-shaman:wild-shape:6": {
    archetypeId: "druid:boar-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:cave-druid:cavesense:1": {
    archetypeId: "druid:cave-druid",
    name: "Cavesense",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:cave-druid:nature-bond:1": {
    archetypeId: "druid:cave-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:cave-druid:wild-empathy:1": {
    archetypeId: "druid:cave-druid",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:cave-druid:tunnelrunner:2": {
    archetypeId: "druid:cave-druid",
    name: "Tunnelrunner",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:cave-druid:lightfoot:3": {
    archetypeId: "druid:cave-druid",
    name: "Lightfoot",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:cave-druid:resist-subterranean-corruption:4": {
    archetypeId: "druid:cave-druid",
    name: "Resist Subterranean Corruption",
    level: 4,
    bucket: "situational",
    note: "+2 save bonus scoped to a narrow category (oozes'/aberrations' abilities) — not general fort/ref/will",
  },
  "druid:cave-druid:wild-shape:6": {
    archetypeId: "druid:cave-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:death-druid:phantom:1": {
    archetypeId: "druid:death-druid",
    name: "Phantom",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:death-druid:soul-magic:1": {
    archetypeId: "druid:death-druid",
    name: "Soul Magic",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:death-druid:resist-death-s-call:4": {
    archetypeId: "druid:death-druid",
    name: "Resist Death's Call",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (death effects, negative energy, energy drain) — not general fort/ref/will",
  },
  "druid:death-druid:negative-immunity:9": {
    archetypeId: "druid:death-druid",
    name: "Negative Immunity",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:defender-of-the-true-world:enemy-of-the-first-world:1": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "Enemy of the First World",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:defender-of-the-true-world:fey-empathy:1": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "Fey Empathy",
    level: 1,
    bucket: "situational",
    note: "real scaling competence bonus (Bluff/Diplomacy/Intimidate), but scoped to interactions with fey creatures specifically",
  },
  "druid:defender-of-the-true-world:fey-stalker:3": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "Fey Stalker",
    level: 3,
    bucket: "situational",
    note: "real scaling morale bonus, but applies to the animal companion/summons' attack/damage vs. fey, not the druid herself — no target for a companion's per-enemy-type bonus",
  },
  "druid:defender-of-the-true-world:feybane:4": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "Feybane",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:defender-of-the-true-world:beguiling-immunity:9": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "Beguiling Immunity",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:defender-of-the-true-world:first-world-deceiver:13": {
    archetypeId: "druid:defender-of-the-true-world",
    name: "First World Deceiver",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:desert-druid:desert-native:2": {
    archetypeId: "druid:desert-druid",
    name: "Desert Native",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to desert terrain — terrain-conditional",
  },
  "druid:desert-druid:sandwalker:3": {
    archetypeId: "druid:desert-druid",
    name: "Sandwalker",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:desert-druid:desert-endurance:4": {
    archetypeId: "druid:desert-druid",
    name: "Desert Endurance",
    level: 4,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:desert-druid:wild-shape:6": {
    archetypeId: "druid:desert-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:desert-druid:shaded-vision:9": {
    archetypeId: "druid:desert-druid",
    name: "Shaded Vision",
    level: 9,
    bucket: "situational",
    note: "+2 save bonus scoped to a narrow category (gaze attacks, figment/pattern illusions) — not general fort/ref/will",
  },
  "druid:desert-druid:dunemeld:13": {
    archetypeId: "druid:desert-druid",
    name: "Dunemeld",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:devolutionist:devolved-companion:1": {
    archetypeId: "druid:devolutionist",
    name: "Devolved Companion",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:devolutionist:undomesticate:4": {
    archetypeId: "druid:devolutionist",
    name: "Undomesticate",
    level: 4,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:devolutionist:devolution:9": {
    archetypeId: "druid:devolutionist",
    name: "Devolution",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:dinosaur-druid:dinosaur-bond:1": {
    archetypeId: "druid:dinosaur-druid",
    name: "Dinosaur Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:dinosaur-druid:nature-bond:1": {
    archetypeId: "druid:dinosaur-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:dinosaur-druid:summon-dinosaur:1": {
    archetypeId: "druid:dinosaur-druid",
    name: "Summon Dinosaur",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:dinosaur-druid:dinosaur-shape:4": {
    archetypeId: "druid:dinosaur-druid",
    name: "Dinosaur Shape",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:dinosaur-druid:primeval-voice:4": {
    archetypeId: "druid:dinosaur-druid",
    name: "Primeval Voice",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:draconic-druid:dragon-sense:1": {
    archetypeId: "druid:draconic-druid",
    name: "Dragon Sense",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:draconic-druid:drake-companion:1": {
    archetypeId: "druid:draconic-druid",
    name: "Drake Companion",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:draconic-druid:dragon-shape:4": {
    archetypeId: "druid:draconic-druid",
    name: "Dragon Shape",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:draconic-druid:resist-dragon-s-might:4": {
    archetypeId: "druid:draconic-druid",
    name: "Resist Dragon's Might",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (dragons' abilities) — not general fort/ref/will",
  },
  "druid:dragon-shaman:nature-bond:1": {
    archetypeId: "druid:dragon-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:dragon-shaman:wild-empathy:1": {
    archetypeId: "druid:dragon-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:dragon-shaman:totem-transformation:2": {
    archetypeId: "druid:dragon-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:dragon-shaman:totemic-summons:5": {
    archetypeId: "druid:dragon-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:dragon-shaman:wild-shape:6": {
    archetypeId: "druid:dragon-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:dragon-shaman:dragon-bite:8": {
    archetypeId: "druid:dragon-shaman",
    name: "Dragon Bite",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:dragon-shaman:bonus-feat:9": {
    archetypeId: "druid:dragon-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:drovier:nature-bond:1": {
    archetypeId: "druid:drovier",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:drovier:communal-aspect:4": {
    archetypeId: "druid:drovier",
    name: "Communal Aspect",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:eagle-shaman:nature-bond:1": {
    archetypeId: "druid:eagle-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:eagle-shaman:wild-empathy:1": {
    archetypeId: "druid:eagle-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:eagle-shaman:totem-transformation:2": {
    archetypeId: "druid:eagle-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:eagle-shaman:totemic-summons:5": {
    archetypeId: "druid:eagle-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:eagle-shaman:wild-shape:6": {
    archetypeId: "druid:eagle-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:eagle-shaman:bonus-feat:9": {
    archetypeId: "druid:eagle-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:feral-child:beast-family:1": {
    archetypeId: "druid:feral-child",
    name: "Beast Family",
    level: 1,
    bucket: "situational",
    note: "+2 circumstance bonus, but scoped to Handle Animal/wild empathy checks with one chosen animal type — narrow scope, and wild empathy itself has no engine target either way",
  },
  "druid:feral-child:illiteracy:1": {
    archetypeId: "druid:feral-child",
    name: "Illiteracy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feral-child:improved-unarmed-strike:1": {
    archetypeId: "druid:feral-child",
    name: "Improved Unarmed Strike",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feral-child:nature-bond:1": {
    archetypeId: "druid:feral-child",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:feral-child:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:feral-child",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:feral-child:favored-terrain:3": {
    archetypeId: "druid:feral-child",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "ranger favored-terrain bonus — real numbers, but terrain-conditional by definition",
  },
  "druid:feral-child:native-cunning:3": {
    archetypeId: "druid:feral-child",
    name: "Native Cunning",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feral-child:native-fortitude:4": {
    archetypeId: "druid:feral-child",
    name: "Native Fortitude",
    level: 4,
    bucket: "situational",
    note: "+1 save bonus scoped to a narrow list (disease/exhaustion/fatigue/fear/poison), upgraded to the favored-terrain bonus while in favored terrain — not general fort",
  },
  "druid:feral-child:native-call:9": {
    archetypeId: "druid:feral-child",
    name: "Native Call",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feral-child:favored-terrain-upgrade:13": {
    archetypeId: "druid:feral-child",
    name: "Favored Terrain Upgrade",
    level: 13,
    bucket: "situational",
    note: "vendored description is a verbatim duplicate of favored-terrain:3's text (likely a vendored-data copy/paste bug — the real 13th-level favored-terrain upgrade text appears to be missing) — terrain-conditional regardless",
  },
  "druid:feral-shifter:animal-focus:1": {
    archetypeId: "druid:feral-shifter",
    name: "Animal Focus",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:feral-shifter:second-animal-focus:9": {
    archetypeId: "druid:feral-shifter",
    name: "Second Animal Focus",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:feyspeaker:fey-magic:1": {
    archetypeId: "druid:feyspeaker",
    name: "Fey Magic",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feyspeaker:fey-speech:1": {
    archetypeId: "druid:feyspeaker",
    name: "Fey Speech",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feyspeaker:wild-mischief:1": {
    archetypeId: "druid:feyspeaker",
    name: "Wild Mischief",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:feyspeaker:wild-shape:6": {
    archetypeId: "druid:feyspeaker",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:fungal-pilgrim:devotion-to-ascension:1": {
    archetypeId: "druid:fungal-pilgrim",
    name: "Devotion to Ascension",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:fungal-pilgrim:fungal-companion:4": {
    archetypeId: "druid:fungal-pilgrim",
    name: "Fungal Companion",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:fungal-pilgrim:spore-spawning:4": {
    archetypeId: "druid:fungal-pilgrim",
    name: "Spore Spawning",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:fungal-pilgrim:mycological-transformation:15": {
    archetypeId: "druid:fungal-pilgrim",
    name: "Mycological Transformation",
    level: 15,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:goliath-druid:primal-bond:1": {
    archetypeId: "druid:goliath-druid",
    name: "Primal Bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts the nature bond animal-companion choice (dinosaur/megafauna) and grants a companion-targeting spell option — no Change-shaped number for the druid herself",
  },
  "druid:goliath-druid:primal-empathy:1": {
    archetypeId: "druid:goliath-druid",
    name: "Primal Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:goliath-druid:primal-size:1": {
    archetypeId: "druid:goliath-druid",
    name: "Primal Size",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:goliath-druid:primal-summons:1": {
    archetypeId: "druid:goliath-druid",
    name: "Primal Summons",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:goliath-druid:face-nature-s-might:4": {
    archetypeId: "druid:goliath-druid",
    name: "Face Nature's Might",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (giants' spell-like/supernatural abilities) — not general fort/ref/will",
  },
  "druid:goliath-druid:wild-shape:4": {
    archetypeId: "druid:goliath-druid",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:green-faith-initiate:mediator-s-ear:3": {
    archetypeId: "druid:green-faith-initiate",
    name: "Mediator's Ear",
    level: 3,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:green-faith-initiate:zephyr-message:6": {
    archetypeId: "druid:green-faith-initiate",
    name: "Zephyr Message",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:green-faith-initiate:path-to-refuge:9": {
    archetypeId: "druid:green-faith-initiate",
    name: "Path to Refuge",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:green-faith-initiate:secrets-across-lifetimes:10": {
    archetypeId: "druid:green-faith-initiate",
    name: "Secrets across Lifetimes",
    level: 10,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:green-faith-initiate:a-thousand-voices:13": {
    archetypeId: "druid:green-faith-initiate",
    name: "A Thousand Voices",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:green-scourge:aberration-sense:1": {
    archetypeId: "druid:green-scourge",
    name: "Aberration Sense",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:green-scourge:nature-s-armaments:1": {
    archetypeId: "druid:green-scourge",
    name: "Nature's Armaments",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:green-scourge:scentless:3": {
    archetypeId: "druid:green-scourge",
    name: "Scentless",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:green-scourge:resist-unnatural-influence:4": {
    archetypeId: "druid:green-scourge",
    name: "Resist Unnatural Influence",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (aberrations' abilities/poison) — not general fort/ref/will",
  },
  "druid:halcyon-druid:bonded-mask:1": {
    archetypeId: "druid:halcyon-druid",
    name: "Bonded Mask",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:halcyon-druid:magaambya-trained:1": {
    archetypeId: "druid:halcyon-druid",
    name: "Magaambya-Trained",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:halcyon-druid:peacekeeper:1": {
    archetypeId: "druid:halcyon-druid",
    name: "Peacekeeper",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:halcyon-druid:spontaneous-casting:1": {
    archetypeId: "druid:halcyon-druid",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "modifies which spells can be cast spontaneously (domain spells vs. summon nature's ally) — a spellcasting-mechanic swap, no Change-shaped number",
  },
  "druid:halcyon-druid:natural-arcana:4": {
    archetypeId: "druid:halcyon-druid",
    name: "Natural Arcana",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:halcyon-druid:resist-fiendish-influence:4": {
    archetypeId: "druid:halcyon-druid",
    name: "Resist Fiendish Influence",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (evil outsiders' abilities, evil-descriptor spells) — not general fort/ref/will",
  },
  "druid:halcyon-druid:embody-mask:13": {
    archetypeId: "druid:halcyon-druid",
    name: "Embody Mask",
    level: 13,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:jungle-druid:jungle-guardian:2": {
    archetypeId: "druid:jungle-druid",
    name: "Jungle Guardian",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to jungle terrain — terrain-conditional",
  },
  "druid:jungle-druid:woodland-stride:3": {
    archetypeId: "druid:jungle-druid",
    name: "Woodland Stride",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:jungle-druid:torrid-endurance:4": {
    archetypeId: "druid:jungle-druid",
    name: "Torrid Endurance",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (disease, animals'/magical beasts' exceptional abilities) — not general fort/ref/will",
  },
  "druid:jungle-druid:wild-shape:6": {
    archetypeId: "druid:jungle-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "vendored description duplicates its own opening sentence verbatim (minor vendored-data text-duplication artifact) — still a Wild Shape cadence tweak, subsystem",
  },
  "druid:jungle-druid:verdant-sentinel:13": {
    archetypeId: "druid:jungle-druid",
    name: "Verdant Sentinel",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:kraken-caller:call-of-the-waves:1": {
    archetypeId: "druid:kraken-caller",
    name: "Call of the Waves",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:kraken-caller:dauntless-swimmer:2": {
    archetypeId: "druid:kraken-caller",
    name: "Dauntless Swimmer",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:kraken-caller:hold-breath:3": {
    archetypeId: "druid:kraken-caller",
    name: "Hold Breath",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:kraken-caller:resist-the-waves-lure:4": {
    archetypeId: "druid:kraken-caller",
    name: "Resist the Waves' Lure",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (aquatic-subtype abilities) — not general fort/ref/will",
  },
  "druid:kraken-caller:wild-shape:4": {
    archetypeId: "druid:kraken-caller",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:kraken-caller:beast-of-the-depths:13": {
    archetypeId: "druid:kraken-caller",
    name: "Beast of the Depths",
    level: 13,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:leshy-warden:green-empathy:1": {
    archetypeId: "druid:leshy-warden",
    name: "Green Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:leshy-warden:leshy-familiar:1": {
    archetypeId: "druid:leshy-warden",
    name: "Leshy Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:leshy-warden:leshy-summoner:1": {
    archetypeId: "druid:leshy-warden",
    name: "Leshy Summoner",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:leshy-warden:leshy-tender:4": {
    archetypeId: "druid:leshy-warden",
    name: "Leshy Tender",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:leshy-warden:wild-shape:6": {
    archetypeId: "druid:leshy-warden",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:leshy-warden:plant-whisperer:13": {
    archetypeId: "druid:leshy-warden",
    name: "Plant Whisperer",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:life-channeler:plant-preservation:1": {
    archetypeId: "druid:life-channeler",
    name: "Plant Preservation",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:life-channeler:rampant-growth:4": {
    archetypeId: "druid:life-channeler",
    name: "Rampant Growth",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:life-channeler:wicker-talismans:4": {
    archetypeId: "druid:life-channeler",
    name: "Wicker Talismans",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:life-channeler:stored-life:9": {
    archetypeId: "druid:life-channeler",
    name: "Stored Life",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:lion-shaman:nature-bond:1": {
    archetypeId: "druid:lion-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:lion-shaman:wild-empathy:1": {
    archetypeId: "druid:lion-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:lion-shaman:totem-transformation:2": {
    archetypeId: "druid:lion-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:lion-shaman:totemic-summons:5": {
    archetypeId: "druid:lion-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:lion-shaman:wild-shape:6": {
    archetypeId: "druid:lion-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:lion-shaman:bonus-feat:9": {
    archetypeId: "druid:lion-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:mantella:poison-affinity:4": {
    archetypeId: "druid:mantella",
    name: "Poison Affinity",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:mantella:toxic-diet:6": {
    archetypeId: "druid:mantella",
    name: "Toxic Diet",
    level: 6,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:menhir-savant:spirit-sense:1": {
    archetypeId: "druid:menhir-savant",
    name: "Spirit Sense",
    level: 1,
    bucket: "numeric",
    note: "hand-verified, ground truth — see archetype-effects.ts",
  },
  "druid:menhir-savant:place-magic:2": {
    archetypeId: "druid:menhir-savant",
    name: "Place Magic",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:menhir-savant:walk-the-lines:9": {
    archetypeId: "druid:menhir-savant",
    name: "Walk the Lines",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:menhir-savant:empty-body:13": {
    archetypeId: "druid:menhir-savant",
    name: "Empty Body",
    level: 13,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:mooncaller:night-sight:2": {
    archetypeId: "druid:mooncaller",
    name: "Night Sight",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:mooncaller:resist-call-of-the-wild:4": {
    archetypeId: "druid:mooncaller",
    name: "Resist Call of the Wild",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow list (confusion/daze/feeblemind/insanity, shapechanger-subtype abilities) — not general fort/ref/will",
  },
  "druid:mooncaller:purity-of-body:9": {
    archetypeId: "druid:mooncaller",
    name: "Purity of Body",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:mooncaller:wolfsbane:13": {
    archetypeId: "druid:mooncaller",
    name: "Wolfsbane",
    level: 13,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:mountain-druid:mountaineer:2": {
    archetypeId: "druid:mountain-druid",
    name: "Mountaineer",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to mountainous terrain — terrain-conditional",
  },
  "druid:mountain-druid:sure-footed:3": {
    archetypeId: "druid:mountain-druid",
    name: "Sure-Footed",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:mountain-druid:spire-walker:4": {
    archetypeId: "druid:mountain-druid",
    name: "Spire Walker",
    level: 4,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:mountain-druid:wild-shape:6": {
    archetypeId: "druid:mountain-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:mountain-druid:mountain-stance:9": {
    archetypeId: "druid:mountain-druid",
    name: "Mountain Stance",
    level: 9,
    bucket: "situational",
    note: "+4 save/CMD bonus scoped to a narrow maneuver list (push/pull/bull rush/drag/forced movement) — not general cmd/fort",
  },
  "druid:mountain-druid:mountain-stone:13": {
    archetypeId: "druid:mountain-druid",
    name: "Mountain Stone",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:naga-aspirant:aspirant-s-bond:1": {
    archetypeId: "druid:naga-aspirant",
    name: "Aspirant's Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:naga-aspirant:aspirant-s-enlightenment:4": {
    archetypeId: "druid:naga-aspirant",
    name: "Aspirant's Enlightenment",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (nagas' abilities/poison) — not general fort/ref/will",
  },
  "druid:naga-aspirant:naga-shape:6": {
    archetypeId: "druid:naga-aspirant",
    name: "Naga Shape",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:naga-aspirant:augmented-form:9": {
    archetypeId: "druid:naga-aspirant",
    name: "Augmented Form",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:naga-aspirant:true-naga:20": {
    archetypeId: "druid:naga-aspirant",
    name: "True Naga",
    level: 20,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nature-fang:studied-target:1": {
    archetypeId: "druid:nature-fang",
    name: "Studied Target",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nature-fang:slayer-talent:4": {
    archetypeId: "druid:nature-fang",
    name: "Slayer Talent",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nature-fang:sneak-attack:4": {
    archetypeId: "druid:nature-fang",
    name: "Sneak Attack",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nature-fang:swift-studied-target:9": {
    archetypeId: "druid:nature-fang",
    name: "Swift Studied Target",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:nature-priest:chosen-druid:1": {
    archetypeId: "druid:nature-priest",
    name: "Chosen Druid",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nature-priest:studious-piety:1": {
    archetypeId: "druid:nature-priest",
    name: "Studious Piety",
    level: 1,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:nature-priest:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:nature-priest",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:nature-priest:shepherd-of-the-faithful:4": {
    archetypeId: "druid:nature-priest",
    name: "Shepherd of the Faithful",
    level: 4,
    bucket: "situational",
    note: "+2 insight bonus scoped to noticing/avoiding natural hazards specifically (and saves against natural hazards) — not general skill/save totals, and affects allies within 60 ft. rather than a self-only stat",
  },
  "druid:nature-priest:divine-servants:9": {
    archetypeId: "druid:nature-priest",
    name: "Divine Servants",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nithveil-adept:animal-speech:1": {
    archetypeId: "druid:nithveil-adept",
    name: "Animal Speech",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:nithveil-adept:nature-bond:1": {
    archetypeId: "druid:nithveil-adept",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:nithveil-adept:nithveil-skills:1": {
    archetypeId: "druid:nithveil-adept",
    name: "Nithveil Skills",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:nithveil-adept:resist-fey-influence:4": {
    archetypeId: "druid:nithveil-adept",
    name: "Resist Fey Influence",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (fey abilities) — not general fort/ref/will",
  },
  "druid:nithveil-adept:locate-nithveil:9": {
    archetypeId: "druid:nithveil-adept",
    name: "Locate Nithveil",
    level: 9,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:pack-lord:pack-bond:1": {
    archetypeId: "druid:pack-lord",
    name: "Pack Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:pack-lord:improved-empathic-link:6": {
    archetypeId: "druid:pack-lord",
    name: "Improved Empathic Link",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:plains-druid:plains-traveler:2": {
    archetypeId: "druid:plains-druid",
    name: "Plains Traveler",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to plains terrain — terrain-conditional",
  },
  "druid:plains-druid:run-like-the-wind:3": {
    archetypeId: "druid:plains-druid",
    name: "Run Like the Wind",
    level: 3,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:plains-druid:savanna-ambush:4": {
    archetypeId: "druid:plains-druid",
    name: "Savanna Ambush",
    level: 4,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:plains-druid:wild-shape:6": {
    archetypeId: "druid:plains-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:plains-druid:canny-charger:9": {
    archetypeId: "druid:plains-druid",
    name: "Canny Charger",
    level: 9,
    bucket: "situational",
    note: "+4 dodge AC / +4 damage bonuses scoped to charge-related combat specifically (defending against or readying for a charge) — not a general AC/damage total",
  },
  "druid:plains-druid:evasion:13": {
    archetypeId: "druid:plains-druid",
    name: "Evasion",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:planar-extremist:aura:1": {
    archetypeId: "druid:planar-extremist",
    name: "Aura",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:planar-extremist:planar-bond:1": {
    archetypeId: "druid:planar-extremist",
    name: "Planar Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:planar-extremist:spells:1": {
    archetypeId: "druid:planar-extremist",
    name: "Spells",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:planar-extremist:spontaneous-casting:1": {
    archetypeId: "druid:planar-extremist",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "modifies which spells can be cast spontaneously (domain spells vs. summon nature's ally) — a spellcasting-mechanic swap, no Change-shaped number",
  },
  "druid:planar-extremist:planar-aspect:4": {
    archetypeId: "druid:planar-extremist",
    name: "Planar Aspect",
    level: 4,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:planar-extremist:resist-the-opposite:4": {
    archetypeId: "druid:planar-extremist",
    name: "Resist the Opposite",
    level: 4,
    bucket: "situational",
    note: "+2 save bonus scoped to a narrow category (opposed-alignment outsiders' abilities) — not general fort/ref/will",
  },
  "druid:progenitor:infused-summoning:1": {
    archetypeId: "druid:progenitor",
    name: "Infused Summoning",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:progenitor:primal-bond:1": {
    archetypeId: "druid:progenitor",
    name: "Primal Bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts the nature bond animal-companion choice (dinosaur/megafauna) and grants a companion-targeting spell option — no Change-shaped number for the druid herself",
  },
  "druid:progenitor:fey-shape:4": {
    archetypeId: "druid:progenitor",
    name: "Fey Shape",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:river-druid:ferrier:1": {
    archetypeId: "druid:river-druid",
    name: "Ferrier",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:river-druid:read-the-currents:2": {
    archetypeId: "druid:river-druid",
    name: "Read the Currents",
    level: 2,
    bucket: "situational",
    note: "real scaling bonus, but scoped to being in/on/adjacent to flowing water — terrain-conditional",
  },
  "druid:river-druid:countercurrent:3": {
    archetypeId: "druid:river-druid",
    name: "Countercurrent",
    level: 3,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:river-druid:deep-breath:4": {
    archetypeId: "druid:river-druid",
    name: "Deep Breath",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:river-druid:wild-shape:6": {
    archetypeId: "druid:river-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:river-druid:tongue-of-the-sun-and-moon:15": {
    archetypeId: "druid:river-druid",
    name: "Tongue of the Sun and Moon",
    level: 15,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:road-keeper:road-bond:1": {
    archetypeId: "druid:road-keeper",
    name: "Road Bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:road-keeper:take-the-high-road:2": {
    archetypeId: "druid:road-keeper",
    name: "Take the High Road",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:road-keeper:road-less-traveled:4": {
    archetypeId: "druid:road-keeper",
    name: "Road Less Traveled",
    level: 4,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:road-keeper:trodden-path:4": {
    archetypeId: "druid:road-keeper",
    name: "Trodden Path",
    level: 4,
    bucket: "situational",
    note: "+4 bonus scoped to tracking specifically (not general Survival) and to saves against severe weather specifically — not general survival/fort",
  },
  "druid:rot-warden:invoke-decay:1": {
    archetypeId: "druid:rot-warden",
    name: "Invoke Decay",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:rot-warden:nature-bond:1": {
    archetypeId: "druid:rot-warden",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:rot-warden:vermin-empathy:1": {
    archetypeId: "druid:rot-warden",
    name: "Vermin Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:rot-warden:swarmcaller:3": {
    archetypeId: "druid:rot-warden",
    name: "Swarmcaller",
    level: 3,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:rot-warden:enduring-druid:4": {
    archetypeId: "druid:rot-warden",
    name: "Enduring Druid",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (vermin/swarm abilities, aging/decay effects) — not general fort/ref/will",
  },
  "druid:rot-warden:wild-shape:6": {
    archetypeId: "druid:rot-warden",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:saurian-shaman:nature-bond:1": {
    archetypeId: "druid:saurian-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:saurian-shaman:wild-empathy:1": {
    archetypeId: "druid:saurian-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:saurian-shaman:totem-transformation:2": {
    archetypeId: "druid:saurian-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:saurian-shaman:totemic-summons:5": {
    archetypeId: "druid:saurian-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:saurian-shaman:wild-shape:6": {
    archetypeId: "druid:saurian-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:saurian-shaman:bonus-feat:9": {
    archetypeId: "druid:saurian-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:season-keeper:nature-bond:1": {
    archetypeId: "druid:season-keeper",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:season-keeper:seasonal-spirits:1": {
    archetypeId: "druid:season-keeper",
    name: "Seasonal Spirits",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-keeper:spirit-of-summer:1": {
    archetypeId: "druid:season-keeper",
    name: "Spirit of Summer",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-keeper:spirit-of-winter:1": {
    archetypeId: "druid:season-keeper",
    name: "Spirit of Winter",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-keeper:wild-shape:6": {
    archetypeId: "druid:season-keeper",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:season-sage:nature-bond:1": {
    archetypeId: "druid:season-sage",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:season-sage:autumn-rot:4": {
    archetypeId: "druid:season-sage",
    name: "Autumn Rot",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:season-s-touch:4": {
    archetypeId: "druid:season-sage",
    name: "Season's Touch",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:summer-might:4": {
    archetypeId: "druid:season-sage",
    name: "Summer Might",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:vernal-growth:4": {
    archetypeId: "druid:season-sage",
    name: "Vernal Growth",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:winter-frost:4": {
    archetypeId: "druid:season-sage",
    name: "Winter Frost",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:autumn-squall:6": {
    archetypeId: "druid:season-sage",
    name: "Autumn Squall",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:season-s-veil:6": {
    archetypeId: "druid:season-sage",
    name: "Season's Veil",
    level: 6,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:season-sage:summer-heat:6": {
    archetypeId: "druid:season-sage",
    name: "Summer Heat",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:vernal-bloom:6": {
    archetypeId: "druid:season-sage",
    name: "Vernal Bloom",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:winter-chill:6": {
    archetypeId: "druid:season-sage",
    name: "Winter Chill",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:season-sage:season-mastery:12": {
    archetypeId: "druid:season-sage",
    name: "Season Mastery",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:serpent-shaman:nature-bond:1": {
    archetypeId: "druid:serpent-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:serpent-shaman:wild-empathy:1": {
    archetypeId: "druid:serpent-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:serpent-shaman:totem-transformation:2": {
    archetypeId: "druid:serpent-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:serpent-shaman:totemic-summons:5": {
    archetypeId: "druid:serpent-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:serpent-shaman:wild-shape:6": {
    archetypeId: "druid:serpent-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:serpent-shaman:bonus-feat:9": {
    archetypeId: "druid:serpent-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:shark-shaman:nature-bond:1": {
    archetypeId: "druid:shark-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:shark-shaman:wild-empathy:1": {
    archetypeId: "druid:shark-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:shark-shaman:totem-transformation:2": {
    archetypeId: "druid:shark-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:shark-shaman:totemic-summons:5": {
    archetypeId: "druid:shark-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:shark-shaman:wild-shape:6": {
    archetypeId: "druid:shark-shaman",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:shark-shaman:bonus-feat:9": {
    archetypeId: "druid:shark-shaman",
    name: "Bonus Feat",
    level: 9,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:skinshaper:nature-bond:1": {
    archetypeId: "druid:skinshaper",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:skinshaper:skinshaping:4": {
    archetypeId: "druid:skinshaper",
    name: "Skinshaping",
    level: 4,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:skinshaper:flashmorph:13": {
    archetypeId: "druid:skinshaper",
    name: "Flashmorph",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:sky-druid:nature-bond:1": {
    archetypeId: "druid:sky-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:sky-druid:sky-s-embrace:2": {
    archetypeId: "druid:sky-druid",
    name: "Sky's Embrace",
    level: 2,
    bucket: "subsystem",
    note: "removes a penalty or grants immunity to a specific hazard — the engine never modeled the penalty in the first place, so nothing to reduce",
  },
  "druid:sky-druid:resist-storm:4": {
    archetypeId: "druid:sky-druid",
    name: "Resist Storm",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (air/electricity spells, weather-control effects) — not general fort/ref/will",
  },
  "druid:sky-druid:skymaster:5": {
    archetypeId: "druid:sky-druid",
    name: "Skymaster",
    level: 5,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:sky-druid:wild-shape:6": {
    archetypeId: "druid:sky-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:storm-druid:nature-bond:1": {
    archetypeId: "druid:storm-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:storm-druid:spontaneous-domain-casting:1": {
    archetypeId: "druid:storm-druid",
    name: "Spontaneous Domain Casting",
    level: 1,
    bucket: "subsystem",
    note: "modifies which spells can be cast spontaneously (domain spells vs. summon nature's ally) — a spellcasting-mechanic swap, no Change-shaped number",
  },
  "druid:storm-druid:windwalker:2": {
    archetypeId: "druid:storm-druid",
    name: "Windwalker",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:storm-druid:stormvoice:3": {
    archetypeId: "druid:storm-druid",
    name: "Stormvoice",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:storm-druid:eyes-of-the-storm:4": {
    archetypeId: "druid:storm-druid",
    name: "Eyes of the Storm",
    level: 4,
    bucket: "subsystem",
    note: "sees through 10 ft. (scaling) of magical fog/mist/gas/wind/rain — a see-through-concealment utility ability, no Change-shaped target (distinct ability from tempest-druid's same-named narrow save bonus, despite the shared name)",
  },
  "druid:storm-druid:windlord:9": {
    archetypeId: "druid:storm-druid",
    name: "Windlord",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:storm-druid:storm-lord:13": {
    archetypeId: "druid:storm-druid",
    name: "Storm Lord",
    level: 13,
    bucket: "situational",
    note: "+2 save bonus scoped to a narrow category (sonic effects) — not general fort/ref/will",
  },
  "druid:sunrider:nature-bond:1": {
    archetypeId: "druid:sunrider",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:sunrider:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:sunrider",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:sunrider:born-to-the-saddle:2": {
    archetypeId: "druid:sunrider",
    name: "Born to the Saddle",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:sunrider:mounted-advantage:3": {
    archetypeId: "druid:sunrider",
    name: "Mounted Advantage",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:sunrider:concerted-effort:4": {
    archetypeId: "druid:sunrider",
    name: "Concerted Effort",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:sunrider:desert-born:4": {
    archetypeId: "druid:sunrider",
    name: "Desert Born",
    level: 4,
    bucket: "situational",
    note: "real scaling bonus, but scoped to desert terrain (and further split self/mounted-ally amounts) — terrain-conditional",
  },
  "druid:supernaturalist:eldritch-botanist:1": {
    archetypeId: "druid:supernaturalist",
    name: "Eldritch Botanist",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:supernaturalist:paranormal-scholar:1": {
    archetypeId: "druid:supernaturalist",
    name: "Paranormal Scholar",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:supernaturalist:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:supernaturalist",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:supernaturalist:animal-spirit:4": {
    archetypeId: "druid:supernaturalist",
    name: "Animal Spirit",
    level: 4,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:survivor:diminished-spellcasting:1": {
    archetypeId: "druid:survivor",
    name: "Diminished Spellcasting",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:survivor:nature-bond:1": {
    archetypeId: "druid:survivor",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:survivor:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:survivor",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:survivor:element-of-surprise:4": {
    archetypeId: "druid:survivor",
    name: "Element of Surprise",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:survivor:trap:4": {
    archetypeId: "druid:survivor",
    name: "Trap",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:survivor:launch-trap:9": {
    archetypeId: "druid:survivor",
    name: "Launch Trap",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:swamp-druid:nature-bond:1": {
    archetypeId: "druid:swamp-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:swamp-druid:wild-shape:6": {
    archetypeId: "druid:swamp-druid",
    name: "Wild shape",
    level: 6,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:swamp-druid:slippery:13": {
    archetypeId: "druid:swamp-druid",
    name: "Slippery",
    level: 13,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:swarm-monger:fecund-familiar:1": {
    archetypeId: "druid:swarm-monger",
    name: "Fecund Familiar",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:swarm-monger:shadowy-opportunist:1": {
    archetypeId: "druid:swarm-monger",
    name: "Shadowy Opportunist",
    level: 1,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:swarm-monger:low-friends:2": {
    archetypeId: "druid:swarm-monger",
    name: "Low Friends",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:swarm-monger:child-of-pollution:4": {
    archetypeId: "druid:swarm-monger",
    name: "Child of Pollution",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (disease and poison) — not general fort/ref/will",
  },
  "druid:swarm-monger:wild-shape:4": {
    archetypeId: "druid:swarm-monger",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "vendored description is a verbatim copy of a different archetype's (swamp druid's) Wild Shape text, including a mismatched '6th level' clause on a level-4 feature — suspected vendored-data copy/paste bug; still a Wild Shape cadence tweak either way, subsystem",
  },
  "druid:swarm-monger:swarm-shape:12": {
    archetypeId: "druid:swarm-monger",
    name: "Swarm Shape",
    level: 12,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:tempest-druid:nature-bond:1": {
    archetypeId: "druid:tempest-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:tempest-druid:sodden-shore-sense:1": {
    archetypeId: "druid:tempest-druid",
    name: "Sodden Shore Sense",
    level: 1,
    bucket: "situational",
    note: "+4 bonus, but scoped to coastal/marshy terrain — terrain-conditional",
  },
  "druid:tempest-druid:spontaneous-casting:1": {
    archetypeId: "druid:tempest-druid",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "modifies which spells can be cast spontaneously (domain spells vs. summon nature's ally) — a spellcasting-mechanic swap, no Change-shaped number",
  },
  "druid:tempest-druid:weapon-and-armor-proficiency:1": {
    archetypeId: "druid:tempest-druid",
    name: "Weapon and Armor Proficiency",
    level: 1,
    bucket: "subsystem",
    note: "proficiency change — no Change-shaped target",
  },
  "druid:tempest-druid:electrical-resistance:3": {
    archetypeId: "druid:tempest-druid",
    name: "Electrical Resistance",
    level: 3,
    bucket: "numeric",
    note: "medium confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:tempest-druid:eyes-of-the-storm:4": {
    archetypeId: "druid:tempest-druid",
    name: "Eyes of the Storm",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (fey abilities, plant-targeting spells) — not general fort/ref/will (distinct ability from storm-druid's same-named utility feature)",
  },
  "druid:tempest-druid:bend-bolt:9": {
    archetypeId: "druid:tempest-druid",
    name: "Bend Bolt",
    level: 9,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:tempest-tamer:speech-of-the-sea:1": {
    archetypeId: "druid:tempest-tamer",
    name: "Speech of the Sea",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:tempest-tamer:tempest-wild-shape:4": {
    archetypeId: "druid:tempest-tamer",
    name: "Tempest Wild Shape",
    level: 4,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:tempest-tamer:whirlpool-walker:4": {
    archetypeId: "druid:tempest-tamer",
    name: "Whirlpool Walker",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (air/water spells, aquatic-subtype abilities, vortex/whirlpool effects) — not general fort/ref/will",
  },
  "druid:toxicologist:expanded-repertoire:1": {
    archetypeId: "druid:toxicologist",
    name: "Expanded Repertoire",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:toxicologist:natural-poison-lore:2": {
    archetypeId: "druid:toxicologist",
    name: "Natural Poison Lore",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:toxicologist:expert-poisoner:4": {
    archetypeId: "druid:toxicologist",
    name: "Expert Poisoner",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:toxicologist:toxic-shaper:4": {
    archetypeId: "druid:toxicologist",
    name: "Toxic Shaper",
    level: 4,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:treesinger:green-empathy:1": {
    archetypeId: "druid:treesinger",
    name: "Green Empathy",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:treesinger:plant-bond:1": {
    archetypeId: "druid:treesinger",
    name: "Plant bond",
    level: 1,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:treesinger:wild-shape:4": {
    archetypeId: "druid:treesinger",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:troll-fury:inspire-fervor:1": {
    archetypeId: "druid:troll-fury",
    name: "Inspire Fervor",
    level: 1,
    bucket: "subsystem",
    note: "activated, resource-gated ability (uses/day) — no baseline always-on number",
  },
  "druid:troll-fury:chosen-prey:4": {
    archetypeId: "druid:troll-fury",
    name: "Chosen Prey",
    level: 4,
    bucket: "situational",
    note: "ranger favored-enemy bonus — real numbers, but conditional on the specific chosen creature type being present",
  },
  "druid:troll-fury:troll-fury-s-mark:9": {
    archetypeId: "druid:troll-fury",
    name: "Troll Fury's Mark",
    level: 9,
    bucket: "situational",
    note: "+10 insight bonus scoped to tracking one specific creature just struck — not a general Survival total",
  },
  "druid:undine-adept:nature-bond:1": {
    archetypeId: "druid:undine-adept",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:undine-adept:amphibious:2": {
    archetypeId: "druid:undine-adept",
    name: "Amphibious",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:undine-adept:augment-summoning:3": {
    archetypeId: "druid:undine-adept",
    name: "Augment Summoning",
    level: 3,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:undine-adept:resist-water-s-call:4": {
    archetypeId: "druid:undine-adept",
    name: "Resist Water's Call",
    level: 4,
    bucket: "situational",
    note: "+4 save bonus scoped to a narrow category (aquatic/water-subtype abilities, water-descriptor spells) — not general fort/ref/will",
  },
  "druid:undine-adept:wild-shape:4": {
    archetypeId: "druid:undine-adept",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:undine-adept:commune-with-water-spirits:9": {
    archetypeId: "druid:undine-adept",
    name: "Commune with Water Spirits",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:urban-druid:nature-bond:1": {
    archetypeId: "druid:urban-druid",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:urban-druid:spontaneous-casting:1": {
    archetypeId: "druid:urban-druid",
    name: "Spontaneous Casting",
    level: 1,
    bucket: "subsystem",
    note: "modifies which spells can be cast spontaneously (domain spells vs. summon nature's ally) — a spellcasting-mechanic swap, no Change-shaped number",
  },
  "druid:urban-druid:lorekeeper:2": {
    archetypeId: "druid:urban-druid",
    name: "Lorekeeper",
    level: 2,
    bucket: "numeric",
    note: "high confidence — see DRUID_ARCHETYPE_EFFECTS_EXTRACTED below",
  },
  "druid:urban-druid:resist-temptation:4": {
    archetypeId: "druid:urban-druid",
    name: "Resist Temptation",
    level: 4,
    bucket: "situational",
    note: "+2 save bonus scoped to a narrow category (divinations and enchantments) — not general fort/ref/will",
  },
  "druid:urban-druid:a-thousand-faces:6": {
    archetypeId: "druid:urban-druid",
    name: "A thousand faces",
    level: 6,
    bucket: "subsystem",
    note: "vendored description says 'At 13th level' but the feature's own level field is 6 — suspected vendored-data level mismatch; either way this is an alter-self-like transformation, no Change-shaped number",
  },
  "druid:urban-druid:wild-shape:8": {
    archetypeId: "druid:urban-druid",
    name: "Wild shape",
    level: 8,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:urban-druid:mental-strength:9": {
    archetypeId: "druid:urban-druid",
    name: "Mental Strength",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:urushiol:toxic-secretions:1": {
    archetypeId: "druid:urushiol",
    name: "Toxic Secretions",
    level: 1,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
  "druid:wild-whisperer:inspiration:2": {
    archetypeId: "druid:wild-whisperer",
    name: "Inspiration",
    level: 2,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:wild-whisperer:wild-shape:4": {
    archetypeId: "druid:wild-whisperer",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:wild-whisperer:natural-expertise:6": {
    archetypeId: "druid:wild-whisperer",
    name: "Natural Expertise",
    level: 6,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:wild-whisperer:investigator-talent:8": {
    archetypeId: "druid:wild-whisperer",
    name: "Investigator Talent",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:wild-whisperer:investigator-talents:8": {
    archetypeId: "druid:wild-whisperer",
    name: "Investigator Talents",
    level: 8,
    bucket: "subsystem",
    note: "grants an unrelated ability, subsystem interaction, or choice-list — no Change-shaped number to extract",
  },
  "druid:wolf-shaman:nature-bond:1": {
    archetypeId: "druid:wolf-shaman",
    name: "Nature bond",
    level: 1,
    bucket: "subsystem",
    note: "restricts or modifies the nature bond animal-companion/domain choice — no Change-shaped number",
  },
  "druid:wolf-shaman:wild-empathy:1": {
    archetypeId: "druid:wolf-shaman",
    name: "Wild empathy",
    level: 1,
    bucket: "subsystem",
    note: "modifies wild empathy (bonus, penalty, or creature-type restriction) — the engine has no Change target for wild empathy checks at all",
  },
  "druid:wolf-shaman:totem-transformation:2": {
    archetypeId: "druid:wolf-shaman",
    name: "Totem Transformation",
    level: 2,
    bucket: "subsystem",
    note: "activated aspect-of-the-totem polymorph effect, resource-gated (minutes/day) — no baseline Change",
  },
  "druid:wolf-shaman:totemic-summons:5": {
    archetypeId: "druid:wolf-shaman",
    name: "Totemic Summons",
    level: 5,
    bucket: "subsystem",
    note: "modifies the summon nature's ally creature list / grants summoned creatures temporary hit points — no Change target for a summoned creature's own stats",
  },
  "druid:world-walker:favored-terrain:3": {
    archetypeId: "druid:world-walker",
    name: "Favored Terrain",
    level: 3,
    bucket: "situational",
    note: "ranger favored-terrain bonus — real numbers, but terrain-conditional by definition",
  },
  "druid:world-walker:wild-shape:4": {
    archetypeId: "druid:world-walker",
    name: "Wild shape",
    level: 4,
    bucket: "subsystem",
    note: "modifies Wild Shape's effective level / available forms / cadence — subsystem (no per-archetype Wild Shape modification hooks exist; uses/day still rides the base class feature's own vendored uses.maxFormula unmodified)",
  },
  "druid:world-walker:path-of-trees:9": {
    archetypeId: "druid:world-walker",
    name: "Path of Trees",
    level: 9,
    bucket: "subsystem",
    note: "grants an immunity — no Change-shaped number to extract",
  },
};

/**
 * Machine-extracted mechanical effects — see the file-level doc comment
 * above for the confidence rubric and the Menhir Savant/Aquatic Druid
 * composition notes.
 */
export const DRUID_ARCHETYPE_EFFECTS_EXTRACTED: Readonly<
  Record<string, ExtractedArchetypeFeatureEffect>
> = {
  "druid:cave-druid:cavesense:1": {
    changes: [c("2", "skill.kdu"), c("2", "skill.sur")],
    detail: () => "+2 Knowledge (dungeoneering) / Survival",
    confidence: "high",
    provenance:
      "A underground druid adds Knowledge (dungeoneering) rather than Knowledge (geography) as a class skill and gains a +2 bonus on Knowledge (dungeoneering) and Survival skill checks.",
  },
  "druid:draconic-druid:dragon-sense:1": {
    changes: [c("2", "skill.kar"), c("2", "skill.khi")],
    detail: () => "+2 Knowledge (arcana) / Knowledge (history)",
    confidence: "high",
    provenance:
      "A draconic druid studies dragons and their history. She gains a +2 bonus on Knowledge (arcana) and Knowledge (history) checks.",
  },
  "druid:green-faith-initiate:mediator-s-ear:3": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.dip"),
      c("floor(@class.unlevel / 2)", "skill.sen"),
    ],
    detail: (level) => `+${Math.floor(level / 2)} Diplomacy / Sense Motive`,
    confidence: "high",
    provenance:
      "By 3rd level, a Green Faith initiate is respected for her neutrality... A Green Faith initiate gains a bonus on Diplomacy and Sense Motive checks equal to half her druid level.",
  },
  "druid:green-scourge:aberration-sense:1": {
    changes: [c("2", "skill.kdu")],
    detail: () => "+2 Knowledge (dungeoneering)",
    confidence: "high",
    provenance:
      "At 1st level, a green scourge adds Knowledge (dungeoneering) to her class skills and gains a +2 bonus on Knowledge (dungeoneering) checks.",
  },
  "druid:halcyon-druid:peacekeeper:1": {
    changes: [
      c("max(1, floor(@class.unlevel / 2))", "skill.dip"),
      c("max(1, floor(@class.unlevel / 2))", "skill.klo"),
    ],
    detail: (level) => `+${Math.max(1, Math.floor(level / 2))} Diplomacy / Knowledge (local)`,
    confidence: "high",
    provenance:
      "A halcyon druid adds half her class level (minimum 1) to Diplomacy and Knowledge (local) checks.",
  },
  "druid:mooncaller:wolfsbane:13": {
    changes: [c("if(gte(@class.unlevel, 19), 5, if(gte(@class.unlevel, 16), 4, 3))", "dr.silver")],
    detail: (level) => `DR ${level >= 19 ? 5 : level >= 16 ? 4 : 3}/silver`,
    confidence: "high",
    provenance:
      "At 13th level, a mooncaller gains DR 3/silver, increasing to DR 4/silver at 16th level and DR 5/silver at 19th level.",
  },
  "druid:nature-priest:studious-piety:1": {
    changes: [c("1", "skill.kre")],
    detail: () => "+1 Knowledge (religion) (+2 re: her own deity/faith not modeled)",
    confidence: "medium",
    provenance:
      "A nature priest gains a +1 bonus on Knowledge (religion) checks. This bonus increases to +2 when attempting checks that involve knowledge of her deity or her faith.",
  },
  "druid:river-druid:ferrier:1": {
    changes: [c("2", "skill.dip"), c("2", "skill.kna")],
    detail: () => "+2 Diplomacy / Knowledge (nature)",
    confidence: "high",
    provenance:
      "A river druid adds Diplomacy to her list of class skills and gains a +2 bonus on Diplomacy and Knowledge (nature) skill checks.",
  },
  "druid:swarm-monger:shadowy-opportunist:1": {
    changes: [c("2", "skill.klo"), c("2", "skill.ste")],
    detail: () => "+2 Knowledge (local) / Stealth",
    confidence: "high",
    provenance: "A swarm monger gains a +2 bonus on Knowledge (local) and Stealth checks.",
  },
  "druid:urban-druid:lorekeeper:2": {
    changes: [c("2", "skill.dip"), c("2", "skill.khi"), c("2", "skill.klo"), c("2", "skill.kno")],
    detail: () => "+2 Diplomacy / Knowledge (history, local, nobility)",
    confidence: "high",
    provenance:
      "At 2nd level, an urban druid adds Diplomacy, Knowledge (history), Knowledge (local), and Knowledge (nobility) skills to her list of class skills. She also receives a +2 bonus on these skill checks.",
  },
  "druid:ancient-guardian:patience-of-nature:1": {
    changes: [
      c("floor(@class.unlevel / 2)", "skill.dip"),
      c("floor(@class.unlevel / 2)", "skill.prf.oratory"),
      c("floor(@class.unlevel / 2)", "skill.sen"),
    ],
    detail: (level) =>
      level >= 2
        ? `+${Math.floor(level / 2)} Diplomacy/Perform (oratory)/Sense Motive`
        : "no bonus yet (gained at 2nd level)",
    confidence: "medium",
    provenance:
      "An ancient guardian does not gain wild empathy at 1st level. Instead, at 2nd level, an ancient guardian adds Diplomacy, Perform (oratory), and Sense Motive to her list of class skills and gains an insight bonus equal to half her druid level on such checks. (feature id carries level 1; prose gates the actual bonus at 2nd — floor(level/2) is 0 at level 1 either way, so behavior is correct despite the id/prose level mismatch.)",
  },
  "druid:aquatic-druid:natural-swimmer:3": {
    changes: [
      c(
        "if(gte(@class.unlevel, 9), @attributes.speed.land.total, floor(@attributes.speed.land.total / 2))",
        "swimSpeed",
      ),
    ],
    detail: (level) => (level >= 9 ? "swim speed = land speed" : "swim speed = half land speed"),
    confidence: "medium",
    provenance:
      "At 3rd level, an aquatic druid gains a swim speed equal to half her land speed. [seaborn, 9th level:] a swim speed equal to her land speed. Folded into one formula spanning both thresholds — see the seaborn subsystem note explaining why seaborn itself does not also get a swimSpeed Change (two separate untyped swimSpeed Changes on the same archetype would sum instead of superseding, over-granting 1.5x land speed at 9th+).",
  },
  "druid:kraken-caller:beast-of-the-depths:13": {
    changes: [c("@attributes.speed.land.total", "swimSpeed")],
    detail: () => "swim speed = land speed",
    confidence: "high",
    provenance:
      "At 13th level, a kraken caller gains a swim speed equal to her base land speed and can breathe water as though affected by the spell water breathing.",
  },
  "druid:plains-druid:run-like-the-wind:3": {
    changes: [c("if(lte(@armor.type, 1), 10, 0)", "landSpeed")],
    detail: () => "+10 land speed (light or no armor; light-load requirement not modeled)",
    confidence: "medium",
    provenance:
      "At 3rd level, a plains druid gains +10 feet to her land speed when wearing light or no armor and carrying a light load, and once per hour, she may run or charge at double the normal speed for 1 round. (armor-state gate follows the Savage Barbarian @armor.type precedent; the additional light-load requirement can't be checked and is dropped; the once-per-hour double-speed run/charge is a separate situational action, not modeled.)",
  },
  "druid:tempest-druid:electrical-resistance:3": {
    changes: [c("5", "eres.electricity")],
    detail: () => "electricity resistance 5",
    confidence: "medium",
    provenance:
      "At 3rd level, a tempest druid gains electricity resistance 5. As a standard action, he can transfer this resistance to another creature for 1 hour, after which time it reverts to him. (the temporary transfer-away window isn't modeled — the static sheet always shows the baseline 5.)",
  },
  "druid:aquatic-druid:deep-diver:13": {
    changes: [c("floor(@class.unlevel / 2)", "dr.slashing-or-piercing")],
    detail: (level) => `DR ${Math.floor(level / 2)}/slashing-or-piercing`,
    confidence: "medium",
    provenance:
      "At 13th level, an aquatic druid gains DR/slashing or piercing equal to 1/2 her level. This damage reduction also applies against spells and spell-like abilities that inflict damage by grappling or crushing (e.g., black tentacles, crushing hand). (compound bypass qualifier is a nonstandard dr.<bypass> string for this table; the grapple/crush spell clause isn't modeled.)",
  },
  "druid:bat-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every four levels thereafter, a bat shaman gains one of the following bonus feats: Acrobatic, Agile Maneuvers, Improved Initiative, Lightning Reflexes, or Skill Focus (Perception).",
  },
  "druid:bear-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a bear shaman gains one of the following bonus feats: Diehard, Endurance, Great Fortitude, Improved Great Fortitude, Toughness.",
  },
  "druid:dragon-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a dragon shaman gains one of the following bonus feats: Combat Casting, Dazzling Display, Magical Aptitude, Skill Focus (Knowledge [arcana]), and Spell Penetration. This ability replaces venom immunity.",
  },
  "druid:eagle-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, an eagle shaman gains one of the following bonus feats: Flyby Attack, Improved Lightning Reflexes, Lightning Reflexes, Skill Focus (Perception), or Wind Stance. This ability replaces venom immunity.",
  },
  "druid:lion-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a lion shaman gains one of the following bonus feats: Dodge, Lunge, Improved Iron Will, Iron Will, or Skill Focus (Acrobatics). This ability replaces venom immunity.",
  },
  "druid:saurian-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a saurian shaman gains one of the following bonus feats: Improved Overrun, Nimble Moves, Power Attack, Skill Focus (Intimidate), or Vital Strike. This ability replaces venom immunity.",
  },
  "druid:serpent-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a serpent shaman gains one of the following bonus feats: Combat Expertise, Improved Feint, Skill Focus (Bluff), Stealthy, or Strike Back. This ability replaces venom immunity.",
  },
  "druid:shark-shaman:bonus-feat:9": {
    changes: [c("1 + floor((@class.unlevel - 9) / 4)", "bonusFeats")],
    detail: (level) =>
      level >= 9
        ? `${1 + Math.floor((level - 9) / 4)} bonus feat(s) (restricted list)`
        : "no bonus feat yet (gained at 9th level)",
    confidence: "high",
    provenance:
      "At 9th level and every 4 levels thereafter, a shark shaman gains one of the following bonus feats: Bleeding Critical, Improved Initiative, Lightning Reflexes, Self-Sufficient, or Skill Focus (Swim). She must meet prerequisites for these bonus feats.",
  },
};
