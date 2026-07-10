/**
 * Hand-authored supplements for content the pinned Foundry pack omits.
 *
 * `bloodlineSpellLists` is normally derived purely by inverting each spell's
 * `learnedAt.bloodline` (see `normalize.ts`). A handful of Core Rulebook
 * bloodlines are fully authored in `@pf1/engine` `BLOODLINES` (arcana + powers)
 * but have NO bonus-spell list upstream — no vendored spell ever references the
 * tag, so the inversion produces nothing and the bloodline is unselectable in
 * the builder's picker (issue #38). The Aberrant bloodline is the concrete case.
 *
 * This fills the gap clean-room from the published CRB (Aberrant, p. 73), the
 * same posture as `traits.ts`/`bloodlines.ts` for content the compendium
 * doesn't carry. Entries are authored by spell **name** and resolved to the
 * vendored spell id at build time (see `resolveBloodlineSupplements`); a data
 * bump that renames or drops one of these spells fails the build loudly rather
 * than silently emitting a broken list. If upstream ever starts tagging a
 * supplemented bloodline, the real derived list wins and the supplement is
 * ignored (see the merge in `normalize.ts`).
 *
 * Tests exempt these tags from the "every list entry traces back to a spell's
 * learnedAt.bloodline" invariants — see `packages/data-pipeline/test/refdata.test.ts`.
 */

import type {
  ArchetypeFeature,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  SpellList,
} from "@pf1/schema";

/**
 * Supplemental bonus-spell lists keyed by bloodline tag, then by spell level
 * (1–9), listing spell **names** (resolved to ids at build time). PF1 grants a
 * bloodline's level-`L` spell at sorcerer level `2L+1`.
 */
export const SUPPLEMENTAL_BLOODLINE_SPELLS: Record<string, Record<number, string[]>> = {
  // Aberrant sorcerer bloodline — CRB p. 73.
  Aberrant: {
    1: ["Enlarge Person"],
    2: ["See Invisibility"],
    3: ["Tongues"],
    4: ["Black Tentacles"],
    5: ["Feeblemind"],
    6: ["Veil"],
    7: ["Plane Shift"],
    8: ["Mind Blank"],
    9: ["Shapechange"],
  },
};

/** Bloodline tags carried by the hand-authored supplement above. */
export const SUPPLEMENTAL_BLOODLINE_TAGS: ReadonlySet<string> = new Set(
  Object.keys(SUPPLEMENTAL_BLOODLINE_SPELLS),
);

/**
 * Resolve the supplemental bloodline spell names to vendored spell ids, using
 * the given name→id lookup. Throws if a named spell is absent from the vendored
 * set (a data-version drift guard). Only tags NOT already present in
 * `existing` are resolved — upstream-derived lists always win.
 */
export function resolveBloodlineSupplements(
  spellIdByName: ReadonlyMap<string, string>,
  existing: Record<string, SpellList>,
): Record<string, SpellList> {
  const out: Record<string, SpellList> = {};
  for (const [tag, byLevel] of Object.entries(SUPPLEMENTAL_BLOODLINE_SPELLS)) {
    if (existing[tag]) continue;
    const list: SpellList = {};
    for (const [lvl, names] of Object.entries(byLevel)) {
      for (const name of names) {
        const id = spellIdByName.get(name);
        if (id === undefined) {
          throw new Error(
            `[supplements] bloodline "${tag}" L${lvl}: spell "${name}" not found in vendored spells`,
          );
        }
        (list[Number(lvl)] ??= []).push(id);
      }
      list[Number(lvl)]!.sort();
    }
    out[tag] = list;
  }
  return out;
}

/**
 * Hand-authored fixes for vendored `ClassFeature.uses.maxFormula` values that
 * omit a RAW "minimum 1" floor, keyed by feature **name** (both are unique in
 * the vendored slice). Grit (gunslinger, Ultimate Combat p. 9) and Panache
 * (swashbuckler, Advanced Class Guide p. 16) are each RAW "equal to her
 * Wisdom/Charisma modifier (minimum 1)", but the vendored formula is a bare
 * `@abilities.wis.mod` / `@abilities.cha.mod` — for a character with a 0 or
 * negative modifier this evaluates to <= 0, and `deriveResourcePools` drops
 * any pool whose max evaluates to <= 0 entirely (no pool at all, instead of
 * RAW's 1). Compare `Arcane Pool` / `Inspiration`, whose vendored formulas
 * already bake in an equivalent `max(1, ...)` floor — this supplement brings
 * Grit/Panache in line with that existing pattern. Applied unconditionally
 * (unlike the bloodline-spell-list supplement above, this isn't a "fill only
 * if missing" gap-fill — it corrects an existing-but-incomplete formula).
 */
export const SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA: Record<string, string> = {
  Grit: "max(1, @abilities.wis.mod)",
  Panache: "max(1, @abilities.cha.mod)",
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA` in place to a list of
 * normalized class features (mutates `uses.maxFormula` only, on the matching
 * feature's own `uses` object — never invents a `uses` block where none
 * exists).
 */
export function applyClassFeatureUsesSupplements(features: ClassFeature[]): void {
  for (const feature of features) {
    const formula = SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA[feature.name];
    if (formula && feature.uses) {
      feature.uses = { ...feature.uses, maxFormula: formula };
    }
  }
}

/**
 * Hand-authored corrections for vendored `ArchetypeFeature.level` values that
 * contradict the feature's own description prose — issue #47 (consolidated
 * #45-wave archetype-extraction bug list). The third-party archetype CSV
 * dataset (`config.ts`'s `CLASS_ARCHETYPE_FILES`, read by
 * `transform/archetypes.ts`) occasionally tags a row's level column with a
 * value its own prose disagrees with, which shifts WHEN the (here, always
 * non-numeric/subsystem) ability starts showing as granted in
 * `resolveClassFeatures`'s `f.level <= <class level>` gate — sometimes by
 * several levels.
 *
 * Keyed by the feature's **id** (NOT its level-suffixed form re-derived from
 * the corrected level) — every consumer across `packages/engine/src/
 * archetype-extracted/` and `archetypes.ts` keys off the original id string
 * verbatim (e.g. `MISPAIRED_TARGET_REMAP`, the classification tables), so
 * only the numeric `level` field actually used for gating is corrected here;
 * the id/uuid intentionally keep their original (now level-mismatched)
 * suffix, same posture as `barbarian:jungle-rager:damage-reduction:8` (left
 * unfixed, per its own classification note) already tolerates.
 *
 * A mismatch that's numerically inert regardless (e.g.
 * `druid:ancient-guardian:patience-of-nature:1`, whose extracted formula
 * gates on `@class.unlevel` directly rather than this level field — see that
 * entry's note in `archetype-extracted/druid.ts`) is deliberately left out.
 */
export const SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL: Record<string, number> = {
  // Prose: "At 3rd level, a seeker of the lost gains a +1 competence bonus
  // on Perception checks to notice magical traps..." — vendored level column
  // reads 2.
  "rogue:seeker-of-the-lost:arcana-breaker:2": 3,
  // Prose: "At 13th level, a druid gains the ability to change her
  // appearance at will, as if using the alter self spell..." — vendored
  // level column reads 6.
  "druid:urban-druid:a-thousand-faces:6": 13,
  // Prose: "At 4th level, a realm wanderer must choose an animal companion
  // for his hunter's bond..." — vendored level column reads 0, which (unlike
  // a too-early level) shows the whole ability as granted from 1st level on.
  "ranger:realm-wanderer:queen-s-bond:0": 4,
};

/**
 * Apply `SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL` in place to a list of
 * normalized archetype features (mutates `.level` only; `id`/`uuid` are left
 * untouched — see that map's doc comment for why).
 */
export function applyArchetypeFeatureLevelSupplements(features: ArchetypeFeature[]): void {
  for (const feature of features) {
    const level = SUPPLEMENTAL_ARCHETYPE_FEATURE_LEVEL[feature.id];
    if (level !== undefined) feature.level = level;
  }
}

/* ---------------------------------------------------------- prestige classes -- */

/**
 * Hand-authored prestige-class chassis (issue #66 chunk 1) — the pinned
 * Foundry pf1 pack ships NO prestige classes at all (confirmed: every doc
 * under `packs/classes` carries `system.subType: "base"`), so unlike every
 * other entity in this pipeline there is no upstream doc to transform. These
 * two entries are authored clean-room from the published Core Rulebook class
 * tables (PZO1110), fetched and verified directly against raw HTML from
 * legacy.aonprd.com (not summarized) — cross-checked line-by-line against
 * d20pfsrd.com and the live aonprd.com class pages, all three agreeing.
 *
 * A save-table surprise worth flagging: naive expectation was "good saves use
 * the new `highPrestige` tier, poor saves reuse the existing `low` tier" —
 * but the fetched tables show BOTH classes' poor-save columns following
 * 0,1,1,1,2,2,2,3,3,3 (levels 1-10), which is NOT `low`'s `floor(level/3)`
 * (0,0,1,1,1,2,2,2,3,3). Cross-checked against a third CRB prestige class
 * (Assassin) to rule out a one-off transcription error — Assassin's poor
 * columns (Fort/Will) match the same 0,1,1,1,2,2,2,3,3,3 sequence, and its
 * good column (Ref) matches `highPrestige` exactly, while Wizard (a base
 * class) matches base `low` exactly. So PF1's 10-level prestige classes
 * genuinely use a DIFFERENT poor-save formula than 20-level base classes —
 * see the new `lowPrestige` `SaveTier` and its doc comment in `@pf1/schema`
 * `primitives.ts` for the formula. Both classes' good saves DO use the
 * expected `highPrestige` tier (verified: Fort for Eldritch Knight, Will for
 * Mystic Theurge, both 1,1,2,2,3,3,4,4,5,5).
 *
 * Synthetic ids follow the same non-Foundry-shaped posture as
 * `Archetype`/`ArchetypeFeature` (also hand/third-party-authored, not
 * Foundry docs): a `prestige:` id prefix and a distinct `prestige-class:` /
 * `prestige-feature:` uuid scheme that can never collide with a real
 * `Compendium.pf1.<pack>.Item.<foundryId>` uuid or a real class/feature's
 * 16-character alphanumeric Foundry id.
 *
 * `applyPrestigeClassSupplements` (below) throws loudly on any id/uuid/tag
 * collision against the already-normalized vendored classes/classFeatures,
 * the same "fail the build, don't silently overwrite" posture as
 * `resolveBloodlineSupplements`.
 */
function prestigeFeature(
  classSlug: string,
  slug: string,
  name: string,
  description: string,
  tag: string,
): ClassFeature {
  const id = `prestige:${classSlug}:${slug}`;
  return {
    id,
    name,
    uuid: `prestige-feature:${classSlug}:${slug}`,
    description,
    sources: [{ id: "PZO1110" }],
    tag,
    subType: "classFeat",
    changes: [],
    grantsBuffs: [],
  };
}

function prestigeGrant(
  level: number,
  classSlug: string,
  slug: string,
  name: string,
): ClassFeatureGrant {
  return {
    level,
    uuid: `prestige-feature:${classSlug}:${slug}`,
    featureId: `prestige:${classSlug}:${slug}`,
    name,
    resolved: true,
  };
}

const ELDRITCH_KNIGHT_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "eldritch-knight",
    "diverse-training",
    "Diverse Training",
    "<p>For the purpose of qualifying for feats, an eldritch knight treats her eldritch knight levels as fighter levels (adding them to any fighter levels she already has, or treating them as fighter levels outright if she has none), and separately treats her eldritch knight levels as levels of whatever arcane spellcasting class she used to qualify for the prestige class.</p>",
    "diverseTraining",
  ),
  prestigeFeature(
    "eldritch-knight",
    "bonus-combat-feat",
    "Bonus Combat Feat",
    "<p>At 1st level, and again at 5th and 9th level, an eldritch knight gains a bonus feat drawn from the list of combat feats available to a fighter, in addition to the feats she gains from advancing in level as normal. She must meet a chosen feat's prerequisites as usual.</p>",
    "bonusCombatFeatEk",
  ),
  prestigeFeature(
    "eldritch-knight",
    "spell-critical",
    "Spell Critical",
    "<p>Starting at 10th level, whenever an eldritch knight confirms a critical hit with a weapon attack, she can cast a spell as a swift action. The spell must target the struck creature or include it within its area of effect.</p>",
    "spellCritical",
  ),
];

const MYSTIC_THEURGE_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "mystic-theurge",
    "combined-spells",
    "Combined Spells",
    "<p>Starting at 1st level, a mystic theurge can prepare a spell from one of her two spellcasting classes into a spell slot one level higher belonging to her other spellcasting class. At 1st level, the highest-level spell she can prepare this way is a 1st-level spell; the maximum increases by one every two levels thereafter (2nd at 3rd level, 3rd at 5th level, 4th at 7th level, 5th at 9th level).</p>",
    "combinedSpells",
  ),
  prestigeFeature(
    "mystic-theurge",
    "spell-synthesis",
    "Spell Synthesis",
    "<p>Once per day at 10th level, a mystic theurge can spend a single action to cast two spells at once, one drawn from each of her spellcasting classes. A target struck by both spells takes a &minus;2 penalty on saving throws made against them, and the mystic theurge gains a +2 bonus on caster level checks made to overcome that target's spell resistance.</p>",
    "spellSynthesis",
  ),
];

/** Hand-authored `ClassFeature`s granted by the two supplemental prestige classes. */
export const SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES: ClassFeature[] = [
  ...ELDRITCH_KNIGHT_FEATURES,
  ...MYSTIC_THEURGE_FEATURES,
];

/**
 * Hand-authored prestige `Class` chassis. See the module doc comment above
 * this section for sourcing/verification notes; chassis numbers verified
 * against legacy.aonprd.com raw HTML (levels 1-10):
 *
 * Eldritch Knight — d10 HD, full (`"high"`) BAB, good Fort (`highPrestige`:
 * 1,1,2,2,3,3,4,4,5,5), poor Ref/Will (`lowPrestige`: 0,1,1,1,2,2,2,3,3,3),
 * 2 + Int skill ranks/level, no armor/weapon proficiencies, one arcane
 * casting-advancement slot starting at 2nd level (the table's Spells per Day
 * column reads "—" at 1st level, "+1 level of existing arcane spellcasting
 * class" from 2nd on).
 *
 * Mystic Theurge — d6 HD, half (`"low"`) BAB, good Will (`highPrestige`),
 * poor Fort/Ref (`lowPrestige`), 2 + Int skill ranks/level, no armor/weapon
 * proficiencies, two casting-advancement slots (one arcane, one divine) BOTH
 * starting at 1st level.
 */
export const SUPPLEMENTAL_PRESTIGE_CLASSES: Class[] = [
  {
    id: "prestige:eldritch-knight",
    name: "Eldritch Knight",
    uuid: "prestige-class:eldritch-knight",
    description:
      "<p>The eldritch knight combines martial training with arcane spellcasting, blending blade and spell into a single, versatile fighting style.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "eldritchKnight",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "highPrestige", ref: "lowPrestige", will: "lowPrestige" },
    skillsPerLevel: 2,
    classSkills: ["clm", "kar", "kno", "lin", "rid", "sen", "spl", "swm"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "eldritch-knight", "diverse-training", "Diverse Training"),
      prestigeGrant(1, "eldritch-knight", "bonus-combat-feat", "Bonus Combat Feat"),
      prestigeGrant(10, "eldritch-knight", "spell-critical", "Spell Critical"),
    ],
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 5, 6, 7, 8, 9, 10] }],
  },
  {
    id: "prestige:mystic-theurge",
    name: "Mystic Theurge",
    uuid: "prestige-class:mystic-theurge",
    description:
      "<p>The mystic theurge draws on both arcane and divine sources of magic, advancing two separate spellcasting traditions side by side.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "mysticTheurge",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 2,
    classSkills: ["kar", "kre", "sen", "spl"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "mystic-theurge", "combined-spells", "Combined Spells"),
      prestigeGrant(10, "mystic-theurge", "spell-synthesis", "Spell Synthesis"),
    ],
    castingAdvancement: [
      { kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
      { kind: "divine", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] },
    ],
  },
];

/**
 * Append `SUPPLEMENTAL_PRESTIGE_CLASSES`/`SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES`
 * onto the already-normalized vendored lists, in place. Throws loudly (rather
 * than silently overwriting or duplicating) if a future data bump ever
 * introduces a real class/feature whose id, uuid, tag, or name collides with
 * one of these synthetic entries — the same "fail the build" posture as
 * `resolveBloodlineSupplements`.
 */
export function applyPrestigeClassSupplements(
  classes: Class[],
  classFeatures: ClassFeature[],
): void {
  for (const cls of SUPPLEMENTAL_PRESTIGE_CLASSES) {
    const collision = classes.find(
      (c) => c.id === cls.id || c.uuid === cls.uuid || c.tag === cls.tag || c.name === cls.name,
    );
    if (collision) {
      throw new Error(
        `[supplements] prestige class "${cls.name}" collides with vendored class "${collision.name}" (id=${collision.id})`,
      );
    }
    classes.push(cls);
  }
  for (const feature of SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES) {
    const collision = classFeatures.find(
      (f) => f.id === feature.id || f.uuid === feature.uuid || f.name === feature.name,
    );
    if (collision) {
      throw new Error(
        `[supplements] prestige class feature "${feature.name}" collides with vendored class feature "${collision.name}" (id=${collision.id})`,
      );
    }
    classFeatures.push(feature);
  }
}
