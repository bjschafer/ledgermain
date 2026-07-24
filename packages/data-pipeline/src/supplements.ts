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
  Buff,
  Change,
  Class,
  ClassFeature,
  ClassFeatureGrant,
  ContextNote,
  Race,
  SourceRef,
  Spell,
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
 * Hand-authored fixes for vendored `ClassFeature.uses.maxFormula` values,
 * keyed by feature **name** (unique in the vendored slice). Applied
 * unconditionally (unlike the bloodline-spell-list supplement above, this
 * isn't a "fill only if missing" gap-fill — it corrects an
 * existing-but-incomplete or existing-but-wrong formula).
 *
 * - Grit (gunslinger, Ultimate Combat p. 9) and Panache (swashbuckler,
 *   Advanced Class Guide p. 16) are each RAW "equal to her Wisdom/Charisma
 *   modifier (minimum 1)", but the vendored formula is a bare
 *   `@abilities.wis.mod` / `@abilities.cha.mod` — for a character with a 0 or
 *   negative modifier this evaluates to <= 0, and `deriveResourcePools` drops
 *   any pool whose max evaluates to <= 0 entirely (no pool at all, instead of
 *   RAW's 1). Compare `Arcane Pool` / `Inspiration`, whose vendored formulas
 *   already bake in an equivalent `max(1, ...)` floor — this brings
 *   Grit/Panache in line with that existing pattern.
 * - Smite Evil (paladin, CRB p. 60-61) is RAW "1/day, +1 at 4th/7th/10th/
 *   13th/16th/19th [paladin level]", but the vendored formula reads
 *   `floor((@attributes.hd.total - 1) / 3) + 1` — TOTAL character Hit Dice,
 *   not paladin level. Single-classed paladins are unaffected (the two are
 *   equal), but a multiclass paladin (e.g. paladin 4/fighter 3) gets
 *   `floor((7-1)/3)+1 = 3` instead of the correct 2. Retargeted to
 *   `@class.unlevel`, the granting-class-level roll-data binding
 *   `deriveResourcePools` sets up for every class-feature-scoped
 *   `uses.maxFormula` (see `resources.ts`). (Swept every other vendored
 *   `uses.maxFormula` referencing `@attributes.hd.total`: the only other hit
 *   is Stunning Fist's `@class.unlevel + floor((@attributes.hd.total -
 *   @class.unlevel) / 4)`, which is RAW-correct as written — Stunning Fist's
 *   daily-use count genuinely scales off total character level plus a
 *   monk-level bonus, not off a single class's level alone — so it's left
 *   untouched.)
 */
export const SUPPLEMENTAL_CLASS_FEATURE_USES_MAX_FORMULA: Record<string, string> = {
  Grit: "max(1, @abilities.wis.mod)",
  Panache: "max(1, @abilities.cha.mod)",
  "Smite Evil": "floor((@class.unlevel - 1) / 3) + 1",
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
 * Hand-authored replacement for the brawler's "AC Bonus (BRA)" `changes[]`
 * (Advanced Class Guide p. 26), keyed by feature **name** (unique in the
 * vendored slice). RAW schedule is a +1 dodge bonus to AC/CMD at 4th level,
 * increasing by +1 at 9th, 13th, and 18th (irregular 5/4/5-level gaps — not a
 * fixed-divisor progression). The vendored formula,
 * `clamp(floor((@class.unlevel-1)/4),0,4)`, is a divisor-4 approximation that
 * lands on the right value at 5-8/10-12/14-16/19-20 but is off by one at
 * exactly 4th (reads +0, should be +1) and at 17th (reads +4 a level early —
 * RAW's +4 doesn't arrive until 18th). Replaced with explicit level-tier
 * `if`/`gte` nesting rather than a divisor, since the tier gaps aren't even;
 * the light-armor/unencumbered gate multiplier is unchanged from the vendored
 * formula.
 */
export const SUPPLEMENTAL_CLASS_FEATURE_CHANGES: Record<string, Change[]> = {
  "AC Bonus (BRA)": [
    {
      formula:
        "(if(and(lt(@armor.type, 2), lt(@attributes.encumbrance.level, 1)), 1)) * if(gte(@class.unlevel, 18), 4, if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 9), 2, if(gte(@class.unlevel, 4), 1, 0))))",
      target: "ac",
      type: "dodge",
    },
    {
      formula:
        "(if(and(lt(@armor.type, 2), lt(@attributes.encumbrance.level, 1)), 1)) * if(gte(@class.unlevel, 18), 4, if(gte(@class.unlevel, 13), 3, if(gte(@class.unlevel, 9), 2, if(gte(@class.unlevel, 4), 1, 0))))",
      target: "cmd",
      type: "dodge",
    },
  ],
};

/**
 * Apply `SUPPLEMENTAL_CLASS_FEATURE_CHANGES` in place, replacing the named
 * feature's whole `changes` array. Throws if a named feature is absent from
 * the vendored set — a data-drift guard, mirroring
 * `resolveBloodlineSupplements`.
 */
export function applyClassFeatureChangesSupplements(features: ClassFeature[]): void {
  const byName = new Map(features.map((f) => [f.name, f]));
  for (const [name, changes] of Object.entries(SUPPLEMENTAL_CLASS_FEATURE_CHANGES)) {
    const feature = byName.get(name);
    if (feature === undefined) {
      throw new Error(`[supplements] class feature "${name}" not found in vendored class features`);
    }
    feature.changes = changes;
  }
}

/**
 * Hand-authored additions to vendored `Buff.changes`/`contextNotes` that omit
 * numeric effects the published spell text actually grants, keyed by buff
 * **name** (unique in the vendored slice). Additive only — appended alongside
 * the vendored `changes`/`contextNotes`, never replacing them (unlike
 * `SUPPLEMENTAL_CLASS_FEATURE_CHANGES` above, which corrects an
 * existing-but-wrong formula rather than filling a gap).
 *
 * (Unchained Rage's own missing temp-HP grant — the same family of gap as
 * these — is NOT here: it's already patched at the engine layer, see
 * `@pf1/engine` `buff-effects.ts`'s `BUFF_CHANGE_PATCHES`. Don't re-add it
 * here — the two mechanisms would double up, both keyed by the same buff
 * name, and `computeGrantedTempHp` groups temp HP by source name, so a
 * duplicate here would render as a spurious struck-through second component
 * rather than actually double-counting the total, but it's still dead
 * weight.)
 *
 * - Divine Power (CRB p. 273): "+1 temp HP per caster level" — the vendored
 *   buff's own description already quotes this ([[@item.level]] temp. HP)
 *   but `changes[]` never encoded it. `@item.level` (not `@cl`) matches the
 *   buff's own existing changes and is bound to the same caster-level value
 *   as `@cl` for an active buff (see `collect.ts`'s `withBuffCasterLevel`).
 * - Heroism, Greater (CRB p. 295): "temp HP equal to caster level (max 20)".
 * - Stoneskin (CRB p. 350): grants DR 10/adamantine; vendored `changes` is
 *   empty. `dr.adamantine` is the engine's existing qualified-DR convention
 *   (see `defenses.ts`), already exercised by Barbarian DR / Resiliency's
 *   `dr.magic`.
 * - Aid (CRB p. 239): "1d8 + caster level" temp HP — dice-based, so it can't
 *   be a static `Change`; a context note is the honest option (same posture
 *   as judgments.ts's energy-resistance-of-choice note).
 */
export const SUPPLEMENTAL_BUFF_CHANGES: Record<string, Change[]> = {
  "Divine Power": [{ formula: "@item.level", target: "tempHp", type: "untyped" }],
  "Heroism, Greater": [{ formula: "min(20, @item.level)", target: "tempHp", type: "untyped" }],
  Stoneskin: [{ formula: "10", target: "dr.adamantine", type: "untyped" }],
};

export const SUPPLEMENTAL_BUFF_CONTEXT_NOTES: Record<string, ContextNote[]> = {
  Aid: [
    {
      target: "tempHp",
      text: "Also grants 1d8+CL temporary hit points — dice-based, not modeled as a static bonus; track manually.",
    },
  ],
};

/**
 * Apply `SUPPLEMENTAL_BUFF_CHANGES`/`SUPPLEMENTAL_BUFF_CONTEXT_NOTES` in
 * place, appending to the named buff's existing `changes`/`contextNotes`.
 * Throws if a named buff is absent from the vendored set — a data-drift
 * guard, mirroring `resolveBloodlineSupplements`.
 */
export function applyBuffSupplements(buffs: Buff[]): void {
  const byName = new Map(buffs.map((b) => [b.name, b]));
  for (const [name, changes] of Object.entries(SUPPLEMENTAL_BUFF_CHANGES)) {
    const buff = byName.get(name);
    if (buff === undefined) {
      throw new Error(`[supplements] buff "${name}" not found in vendored buffs`);
    }
    buff.changes = [...buff.changes, ...changes];
  }
  for (const [name, notes] of Object.entries(SUPPLEMENTAL_BUFF_CONTEXT_NOTES)) {
    const buff = byName.get(name);
    if (buff === undefined) {
      throw new Error(`[supplements] buff "${name}" not found in vendored buffs`);
    }
    buff.contextNotes = [...buff.contextNotes, ...notes];
  }
}

/**
 * Hand-authored fixed energy resistances for the six planetouched races,
 * prose-only upstream (races.json carries no mechanical `eres.*` changes for
 * any race). Values per the published Bestiary/Advanced Race Guide entries:
 * Aasimar acid/cold/electricity 5, Tiefling cold/electricity/fire 5, and the
 * four elemental-scion kineticist-adjacent races (Ifrit/Oread/Sylph/Undine)
 * 5 against their own element (fire/acid/electricity/cold respectively).
 * `eres.<energy>` is the engine's own convention for a qualified energy-
 * resistance `Change` (see `targets.ts`/`defenses.ts`) — already exercised by
 * several archetype-extracted entries and sorcerer/bloodrager bloodlines, so
 * this rides an existing, tested consumer rather than a new one. Deliberately
 * excludes Resist Energy / Protection From Energy spell buffs, which need a
 * player-chosen element this table has no generic way to record.
 */
export const SUPPLEMENTAL_RACE_ENERGY_RESISTANCE: Record<string, readonly string[]> = {
  Aasimar: ["acid", "cold", "electricity"],
  Tiefling: ["cold", "electricity", "fire"],
  Ifrit: ["fire"],
  Oread: ["acid"],
  Sylph: ["electricity"],
  Undine: ["cold"],
};

/**
 * Apply `SUPPLEMENTAL_RACE_ENERGY_RESISTANCE` in place, appending one
 * `eres.<energy>` change per listed energy type to the matching race's
 * `changes`. Throws if a named race is absent from the vendored slice — a
 * data-drift guard, mirroring `resolveBloodlineSupplements`.
 */
export function applyRaceEnergyResistanceSupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, energies] of Object.entries(SUPPLEMENTAL_RACE_ENERGY_RESISTANCE)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    race.changes = [
      ...race.changes,
      ...energies.map((energy) => ({ formula: "5", target: `eres.${energy}`, type: "untyped" })),
    ];
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
 * Hand-authored spell resistance for races whose signature SR is prose-only
 * upstream (races.json carries no `spellResist` change for these). Values per
 * the published Advanced Race Guide entries: Svirfneblin SR 11 + class
 * levels, a standard (not alternate) racial trait — same non-suppressing
 * posture as every other vendored alternate trait (`collect.ts`'s doc
 * comment) applies here too, so this is not wired to any trait swap.
 */
export const SUPPLEMENTAL_RACE_SPELL_RESISTANCE: Record<string, string> = {
  Svirfneblin: "11 + @attributes.hd.total",
};

/**
 * Apply `SUPPLEMENTAL_RACE_SPELL_RESISTANCE` in place, appending a
 * `spellResist` change to the matching race's `changes`. Throws if a named
 * race is absent from the vendored slice — a data-drift guard, mirroring
 * `resolveBloodlineSupplements`.
 */
export function applyRaceSpellResistanceSupplements(races: Race[]): void {
  const byName = new Map(races.map((r) => [r.name, r]));
  for (const [name, formula] of Object.entries(SUPPLEMENTAL_RACE_SPELL_RESISTANCE)) {
    const race = byName.get(name);
    if (race === undefined) {
      throw new Error(`[supplements] race "${name}" not found in vendored races`);
    }
    race.changes = [...race.changes, { formula, target: "spellResist", type: "racial" }];
  }
}

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

/**
 * `@cl`-keyed projectile-count formulas for the handful of spells whose EFFECT
 * COUNT scales with caster level (rather than their `damage.parts[].formula`).
 * The vendored `damage.parts` carries only the flat per-hit damage — Magic
 * Missile's `1d4+1`, Scorching Ray's `4d6` — because the "N per M levels" rule
 * lives in the spell's prose, so `Spell.projectileCount` can't be derived and
 * is hand-authored here from the published CRB, keyed by spell **name** and
 * applied in `normalize.ts`. The tracker's spell strip renders it as
 * `<per-hit dice> ×N` (see `spellDamageParts`), keeping each ray/missile an
 * honest separate roll rather than folding the count into one dice total.
 *
 * Formulas floor RAW's "one, plus one per M levels beyond L, max K":
 *   - Magic Missile   — 1 + 1/2 levels beyond 1st, max 5 (5 at CL 9).
 *   - Scorching Ray   — 1 + 1/4 levels beyond 3rd, max 3 (3 at CL 11).
 * The `max(1, …)` floor guards a below-minimum caster level from yielding 0.
 */
export const SPELL_PROJECTILE_COUNTS: Record<string, string> = {
  "Magic Missile": "min(5, max(1, 1 + floor((@cl - 1) / 2)))",
  "Scorching Ray": "min(3, max(1, 1 + floor((@cl - 3) / 4)))",
};

/**
 * Apply `SPELL_PROJECTILE_COUNTS` in place, setting `projectileCount` on each
 * named spell. Throws if a named spell is absent from the vendored set — a
 * data-version drift guard, mirroring `resolveBloodlineSupplements`: a bump
 * that renames or drops one of these fails the build loudly rather than
 * silently dropping the ×N count.
 */
export function applySpellProjectileSupplements(spells: Spell[]): void {
  const byName = new Map(spells.map((s) => [s.name, s]));
  for (const [name, formula] of Object.entries(SPELL_PROJECTILE_COUNTS)) {
    const spell = byName.get(name);
    if (spell === undefined) {
      throw new Error(
        `[supplements] projectile-count spell "${name}" not found in vendored spells`,
      );
    }
    spell.projectileCount = formula;
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
  /**
   * Trivially-correct mechanical effect, e.g. Dragon Disciple's flat ability-
   * score increases (issue #66 chunk 4). Empty for the overwhelming majority
   * of hand-authored prestige features, which stay prose-only per the same
   * honesty bar as chunk 1 — see the chunk-4 module doc comment above.
   */
  changes: Change[] = [],
  /**
   * Publication the feature comes from. Defaults to the CRB because every
   * prestige class authored here until Student of War was one of the CRB ten.
   */
  sources: SourceRef[] = [{ id: "PZO1110" }],
): ClassFeature {
  const id = `prestige:${classSlug}:${slug}`;
  return {
    id,
    name,
    uuid: `prestige-feature:${classSlug}:${slug}`,
    description,
    sources,
    tag,
    subType: "classFeat",
    changes,
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

/**
 * Issue #66 chunk 4 — the remaining eight CRB (PZO1110) prestige classes.
 * Same clean-room posture and verification method as chunk 1 above: fetched
 * and cross-checked raw HTML from BOTH legacy.aonprd.com AND the current
 * aonprd.com (two independently-rendered sources per class, agreeing
 * line-for-line on every table cell quoted here).
 *
 * The CRB actually has TEN prestige classes, not the nine chunk 1's doc
 * comment might suggest by omission — chunk 1 covered Eldritch Knight and
 * Mystic Theurge; **Arcane Archer** is the CRB's tenth and was not part of
 * either chunk's original enumeration until now (confirmed against
 * `legacy.aonprd.com/corerulebook/prestigeClasses.html`'s own table of
 * contents: Arcane Archer, Arcane Trickster, Assassin, Dragon Disciple,
 * Duelist, Eldritch Knight, Loremaster, Mystic Theurge, Pathfinder
 * Chronicler, Shadowdancer).
 *
 * Save/BAB tiers all verified against the `highPrestige`/`lowPrestige`/
 * `high`/`med`/`low` formulas in `@pf1/schema` `primitives.ts`. A genuine
 * surprise turned up repeatedly: several of these classes have TWO good
 * saves rather than the usual one-good/two-poor split (they're built to
 * splice two source classes' strengths together) — Arcane Archer (Fort+Ref),
 * Arcane Trickster (Ref+Will), Dragon Disciple (Fort+Will), Pathfinder
 * Chronicler (Ref+Will). Nothing here violates the tier formulas themselves;
 * it's just an unusual (but doubly-source-confirmed) choice of which two
 * tiers a class uses.
 *
 * Ability-score-increase features (Dragon Disciple's Str/Con/Int bumps) use
 * `changes` with `type: "untyped"` (always sums, per `stacking.ts`) rather
 * than `"racial"` or similar typed category — typed bonuses of the same type
 * do NOT stack (highest wins), which would silently cap Dragon Disciple's
 * two separate +2 Str increases (2nd and 4th level) at +2 total instead of
 * the correct +4. Where the same flat bonus needs to apply at two DIFFERENT
 * levels, this reuses ONE `ClassFeature` (one `changes` array) referenced by
 * TWO separate `ClassFeatureGrant` entries at the two levels — `collect.ts`'s
 * per-class feature loop applies a grant's changes once per grant whose level
 * has been reached, so two grants of the same feature correctly double the
 * effect once both levels are reached, without inventing two differently-
 * named features for what the CRB table treats as the same repeating line.
 * All other numeric-flavored abilities (natural armor increases, dragon
 * bite, breath weapon, etc.) stay prose-only per the same honesty bar as
 * chunk 1 (no `changes`/`uses` wiring beyond what's trivially correct).
 *
 * A handful of feature NAMES collide with already-vendored (real, Foundry-
 * sourced) `ClassFeature` names — e.g. Assassin's own "Sneak Attack" vs.
 * Rogue's, or Shadowdancer's "Hide in Plain Sight" vs. Assassin's own (both
 * hand-authored in this same file) — since `applyPrestigeClassSupplements`
 * throws loudly on any name collision (against vendored features AND against
 * earlier entries in this same supplemental list, since it mutates in place
 * as it pushes). Colliding names are disambiguated with a parenthetical
 * class suffix (e.g. "Sneak Attack (Assassin)"); everything else keeps its
 * plain published name, matching chunk 1's economy.
 */
const KNOWLEDGE_ALL = ["kar", "kdu", "ken", "kge", "khi", "klo", "kna", "kno", "kpl", "kre"];

const ARCANE_ARCHER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "arcane-archer",
    "enhance-arrows",
    "Enhance Arrows",
    "<p>Every nonmagical arrow an arcane archer nocks and looses becomes magical for that shot, gaining a +1 enhancement bonus; she need not pay any gp cost to do this, and the arrows only function as magical for her. At 3rd level she can add flaming, frost, or shock; at 5th level, distance; at 7th level, flaming burst, icy burst, or shocking burst; and at 9th level, anarchic, axiomatic, holy, or unholy (matching her own alignment).</p>",
    "enhanceArrows",
  ),
  prestigeFeature(
    "arcane-archer",
    "imbue-arrow",
    "Imbue Arrow",
    "<p>At 2nd level, an arcane archer can cast an area-effect spell and center it where an arrow she fires lands, using the bow's range instead of the spell's own range.</p>",
    "imbueArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "seeker-arrow",
    "Seeker Arrow",
    "<p>At 4th level, once per day (and one additional time per day for every two levels beyond 4th, to a maximum of four times per day at 10th level), an arcane archer can fire an arrow at a known target within range that travels to strike it, even around corners or behind cover.</p>",
    "seekerArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "phase-arrow",
    "Phase Arrow",
    "<p>At 6th level, once per day (and one additional time per day for every two levels beyond 6th, to a maximum of three times per day at 10th level), an arcane archer can fire an arrow that passes through any nonmagical barrier or wall on its way to the target.</p>",
    "phaseArrow",
  ),
  prestigeFeature(
    "arcane-archer",
    "hail-of-arrows",
    "Hail of Arrows",
    "<p>Once per day at 8th level, an arcane archer can fire a single arrow at each and every target within range, up to a maximum number of targets equal to her arcane archer level.</p>",
    "hailOfArrows",
  ),
  prestigeFeature(
    "arcane-archer",
    "arrow-of-death",
    "Arrow of Death",
    "<p>At 10th level, an arcane archer can spend a day crafting a single slaying arrow. A target struck by it must succeed at a Fortitude save (DC 20 + the arcane archer's Charisma modifier) or die instantly.</p>",
    "arrowOfDeath",
  ),
];

const ARCANE_TRICKSTER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "arcane-trickster",
    "ranged-legerdemain",
    "Ranged Legerdemain",
    "<p>An arcane trickster can use Disable Device and Sleight of Hand at a range of 30 feet. Working at a distance increases the check's DC by 5, and she cannot take 10 on the check; the targeted object must weigh 5 pounds or less.</p>",
    "rangedLegerdemain",
  ),
  prestigeFeature(
    "arcane-trickster",
    "sneak-attack",
    "Sneak Attack (Arcane Trickster)",
    "<p>Functions as the rogue ability of the same name, and stacks with sneak attack granted by another class. The extra damage is +1d6 at 2nd level, increasing by +1d6 every other level thereafter (4th, 6th, 8th, 10th) to a maximum of +5d6 at 10th level.</p>",
    "sneakAttackArcaneTrickster",
  ),
  prestigeFeature(
    "arcane-trickster",
    "impromptu-sneak-attack",
    "Impromptu Sneak Attack",
    "<p>Starting at 3rd level, once per day an arcane trickster can declare one melee or ranged attack (target no more than 30 feet away, if ranged) to be a sneak attack — the target loses its Dexterity bonus to AC against that attack only. At 7th level she can do this twice per day.</p>",
    "impromptuSneakAttack",
  ),
  prestigeFeature(
    "arcane-trickster",
    "tricky-spells",
    "Tricky Spells",
    "<p>Starting at 5th level, an arcane trickster can cast her spells without verbal or somatic components, as though under the effect of both Still Spell and Silent Spell, without a level or casting-time increase. Usable 3 times per day at 5th level, 4 times per day at 7th, and 5 times per day at 9th.</p>",
    "trickySpells",
  ),
  prestigeFeature(
    "arcane-trickster",
    "invisible-thief",
    "Invisible Thief",
    "<p>At 9th level, an arcane trickster can become invisible as a free action, as though under the effect of greater invisibility, for a number of rounds per day equal to her arcane trickster level.</p>",
    "invisibleThief",
  ),
  prestigeFeature(
    "arcane-trickster",
    "surprise-spells",
    "Surprise Spells",
    "<p>At 10th level, an arcane trickster can add her sneak attack damage to any damaging spell against a flat-footed target; the additional damage applies only to hit-point damage and is of the same type as the spell.</p>",
    "surpriseSpells",
  ),
];

const ASSASSIN_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "assassin",
    "sneak-attack",
    "Sneak Attack (Assassin)",
    "<p>Functions as the rogue ability of the same name, and stacks with sneak attack granted by another class. The extra damage is +1d6 at 1st level, increasing by +1d6 at 3rd, 5th, 7th, and 9th level, to a maximum of +5d6 at 9th level.</p>",
    "sneakAttackAssassin",
  ),
  prestigeFeature(
    "assassin",
    "death-attack",
    "Death Attack",
    "<p>If an assassin studies her victim for 3 consecutive rounds (a standard action each round) and then makes a sneak attack with a melee weapon that deals damage, the target must succeed at a Fortitude save (DC 10 + the assassin's class level + her Intelligence modifier) or die; on a failed save against a chosen paralysis effect instead, the target is helpless for 1d6 rounds plus 1 round per assassin level. The death attack fails if the target notices the assassin or recognizes her as an enemy first, and if not used within 3 rounds of completing the study, or if it fails, a fresh 3 rounds of study is required.</p>",
    "deathAttack",
  ),
  prestigeFeature(
    "assassin",
    "poison-use",
    "Poison Use (Assassin)",
    "<p>An assassin is trained in the use of poison and never risks accidentally poisoning herself when applying poison to a blade.</p>",
    "poisonUseAssassin",
  ),
  prestigeFeature(
    "assassin",
    "save-bonus-against-poison",
    "Save Bonus Against Poison",
    "<p>Starting at 2nd level, an assassin gains a +1 bonus on saving throws against poison; this bonus increases by +1 every two levels thereafter (4th, 6th, 8th, 10th), to a maximum of +5 at 10th level.</p>",
    "saveBonusAgainstPoison",
  ),
  prestigeFeature(
    "assassin",
    "uncanny-dodge",
    "Uncanny Dodge (Assassin)",
    "<p>At 2nd level, an assassin can't be caught flat-footed, even by an invisible attacker (though she still loses her Dexterity bonus to AC if immobilized, or if successfully feinted). If she already has uncanny dodge from another class, she gains improved uncanny dodge instead.</p>",
    "uncannyDodgeAssassin",
  ),
  prestigeFeature(
    "assassin",
    "hidden-weapons",
    "Hidden Weapons",
    "<p>At 4th level, an assassin adds her assassin level as a bonus on Sleight of Hand checks made to conceal a weapon on her body.</p>",
    "hiddenWeapons",
  ),
  prestigeFeature(
    "assassin",
    "true-death",
    "True Death",
    "<p>Starting at 4th level, a creature slain by an assassin's death attack is harder to restore to life: any raise dead or similar spell requires a caster level check (DC 15 + the assassin's level) or the spell fails and its material component is wasted. Casting remove curse (DC 10 + the assassin's level) the round before negates this effect.</p>",
    "trueDeath",
  ),
  prestigeFeature(
    "assassin",
    "improved-uncanny-dodge",
    "Improved Uncanny Dodge (Assassin)",
    "<p>At 5th level, an assassin can no longer be flanked, unless the attacker has at least four more rogue levels than she has assassin levels (levels from other uncanny-dodge-granting classes stack for this purpose).</p>",
    "improvedUncannyDodgeAssassin",
  ),
  prestigeFeature(
    "assassin",
    "quiet-death",
    "Quiet Death",
    "<p>At 6th level, whenever an assassin kills with a death attack during a surprise round, she can attempt a Stealth check opposed by nearby creatures' Perception checks to keep them from identifying her as the killer, or even noticing the death, for a few moments.</p>",
    "quietDeath",
  ),
  prestigeFeature(
    "assassin",
    "hide-in-plain-sight",
    "Hide in Plain Sight (Assassin)",
    "<p>At 8th level, an assassin can use Stealth even while being observed, as long as she is within 10 feet of some sort of shadow (though not her own).</p>",
    "hideInPlainSightAssassin",
  ),
  prestigeFeature(
    "assassin",
    "swift-death",
    "Swift Death",
    "<p>Once per day at 9th level, an assassin can attempt a death attack with a melee weapon against a foe she has not studied beforehand.</p>",
    "swiftDeath",
  ),
  prestigeFeature(
    "assassin",
    "angel-of-death",
    "Angel of Death",
    "<p>At 10th level, once per day, an assassin can declare (before the attack roll) that a successful death attack crumbles the target's body to dust, preventing raise dead and resurrection (though not true resurrection). If the attack misses or the target saves, the ability is wasted.</p>",
    "angelOfDeath",
  ),
];

const DRAGON_DISCIPLE_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "dragon-disciple",
    "blood-of-dragons",
    "Blood of Dragons",
    "<p>A dragon disciple's levels in this class stack with any sorcerer levels she has for the purpose of determining the powers of a draconic bloodline (though not spells per day). A dragon disciple with no sorcerer levels instead gains draconic bloodline powers as if her dragon disciple level were her sorcerer level; if she has sorcerer levels, they must be (and any future sorcerer levels must also be) of the draconic bloodline, and she must choose the same dragon type as that bloodline (or choose one, if she has no sorcerer levels).</p>",
    "bloodOfDragons",
  ),
  prestigeFeature(
    "dragon-disciple",
    "natural-armor",
    "Natural Armor",
    "<p>A dragon disciple's hide gradually toughens as she takes on draconic traits, granting a cumulative +1 natural armor bonus to AC at 1st, 4th, and 7th level (+3 total by 7th level).</p>",
    "naturalArmor",
  ),
  prestigeFeature(
    "dragon-disciple",
    "strength-increase",
    "Strength Increase",
    "<p>A dragon disciple's Strength score permanently increases by 2 at 2nd level, and again at 4th level.</p>",
    "strengthIncrease",
    [{ formula: "2", target: "str", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "bloodline-feat",
    "Draconic Bloodline Feat",
    "<p>At 2nd level, and again at 5th and 8th level, a dragon disciple gains a bonus feat drawn from her draconic sorcerer bloodline's bonus feat list, in addition to any feats gained from advancing in level as normal.</p>",
    "bloodlineFeat",
  ),
  prestigeFeature(
    "dragon-disciple",
    "dragon-bite",
    "Dragon Bite",
    "<p>At 2nd level, a dragon disciple gains a bite attack, usable as a primary natural attack, dealing 1d6 points of damage (1d4 if Small) plus 1-1/2 times her Strength modifier. At 6th level, the bite deals an additional 1d6 points of energy damage matching her draconic bloodline's associated energy type.</p>",
    "dragonBite",
  ),
  prestigeFeature(
    "dragon-disciple",
    "breath-weapon",
    "Breath Weapon",
    "<p>Starting at 3rd level, a dragon disciple gains a breath weapon usable once per day, matching her draconic bloodline's breath weapon in shape, damage type, and save; she gains an additional daily use whenever her draconic bloodline power would grant one.</p>",
    "breathWeapon",
  ),
  prestigeFeature(
    "dragon-disciple",
    "blindsense",
    "Blindsense",
    "<p>At 5th level, a dragon disciple gains blindsense out to 30 feet; this range increases to 60 feet at 10th level.</p>",
    "blindsense",
  ),
  prestigeFeature(
    "dragon-disciple",
    "constitution-increase",
    "Constitution Increase",
    "<p>A dragon disciple's Constitution score permanently increases by 2 at 6th level.</p>",
    "constitutionIncrease",
    [{ formula: "2", target: "con", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "dragon-form",
    "Dragon Form",
    "<p>At 7th level, once per day, a dragon disciple can assume dragon form as though using form of the dragon I. At 10th level she can do so twice per day, and it functions as form of the dragon II; both must match her draconic bloodline's dragon type.</p>",
    "dragonForm",
  ),
  prestigeFeature(
    "dragon-disciple",
    "intelligence-increase",
    "Intelligence Increase",
    "<p>A dragon disciple's Intelligence score permanently increases by 2 at 8th level.</p>",
    "intelligenceIncrease",
    [{ formula: "2", target: "int", type: "untyped" }],
  ),
  prestigeFeature(
    "dragon-disciple",
    "wings",
    "Wings",
    "<p>At 9th level, a dragon disciple sprouts wings, granting a fly speed as her draconic bloodline's wings power (or the appropriate speed for her size if no sorcerer bloodline levels apply).</p>",
    "wings",
  ),
];

const DUELIST_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "duelist",
    "canny-defense",
    "Canny Defense",
    "<p>When wearing light or no armor and not using a shield, a duelist adds 1 point of Intelligence bonus (if any) per duelist level as a dodge bonus to AC while wielding a melee weapon; she loses this bonus whenever she loses her Dexterity bonus to AC.</p>",
    "cannyDefense",
  ),
  prestigeFeature(
    "duelist",
    "precise-strike",
    "Precise Strike",
    "<p>A duelist adds her duelist level to the damage roll when striking with a light or one-handed piercing weapon, provided she attacks with no weapon in her other hand and no shield; this only works against living creatures with discernible anatomy.</p>",
    "preciseStrike",
  ),
  prestigeFeature(
    "duelist",
    "improved-reaction",
    "Improved Reaction",
    "<p>At 2nd level, a duelist gains a +2 bonus on initiative checks, increasing to +4 at 8th level; this stacks with the Improved Initiative feat.</p>",
    "improvedReaction",
  ),
  prestigeFeature(
    "duelist",
    "parry",
    "Parry",
    "<p>At 2nd level, a duelist who takes a full attack action with a light or one-handed piercing weapon can forgo one attack to instead attempt, as an immediate action before her next turn, to parry an attack against her or an adjacent ally: she makes an attack roll with the same bonus as the forgone attack, and if it exceeds the attacker's roll, the attack automatically misses. She takes a &minus;4 penalty per size category the attacker is larger than her, and a further &minus;4 penalty when parrying on an ally's behalf.</p>",
    "parry",
  ),
  prestigeFeature(
    "duelist",
    "enhanced-mobility",
    "Enhanced Mobility",
    "<p>Starting at 3rd level, when wearing light or no armor and not using a shield, a duelist gains an additional +4 bonus to AC against attacks of opportunity provoked by moving out of a threatened square.</p>",
    "enhancedMobility",
  ),
  prestigeFeature(
    "duelist",
    "combat-reflexes",
    "Combat Reflexes (Duelist)",
    "<p>At 4th level, a duelist gains the benefit of the Combat Reflexes feat when wielding a light or one-handed piercing weapon.</p>",
    "combatReflexesDuelist",
  ),
  prestigeFeature(
    "duelist",
    "grace",
    "Grace",
    "<p>At 4th level, a duelist gains a +2 competence bonus on Reflex saves while wearing light or no armor and not using a shield.</p>",
    "grace",
  ),
  prestigeFeature(
    "duelist",
    "riposte",
    "Riposte",
    "<p>Starting at 5th level, a duelist who successfully parries an attack can make an attack of opportunity against the attacker, if it is within reach.</p>",
    "riposte",
  ),
  prestigeFeature(
    "duelist",
    "acrobatic-charge",
    "Acrobatic Charge",
    "<p>At 6th level, a duelist can charge through difficult terrain that would normally prevent a charge, though she may still need to make checks appropriate to the terrain.</p>",
    "acrobaticCharge",
  ),
  prestigeFeature(
    "duelist",
    "elaborate-defense",
    "Elaborate Defense",
    "<p>At 7th level, when fighting defensively or using total defense in melee, a duelist gains an additional +1 dodge bonus to AC for every 3 duelist levels she has.</p>",
    "elaborateDefense",
  ),
  prestigeFeature(
    "duelist",
    "deflect-arrows",
    "Deflect Arrows (Duelist)",
    "<p>At 9th level, a duelist gains the benefit of the Deflect Arrows feat while wielding a light or one-handed piercing weapon, without needing a free hand.</p>",
    "deflectArrowsDuelist",
  ),
  prestigeFeature(
    "duelist",
    "no-retreat",
    "No Retreat",
    "<p>At 9th level, an adjacent enemy that takes a withdraw action provokes an attack of opportunity from the duelist.</p>",
    "noRetreat",
  ),
  prestigeFeature(
    "duelist",
    "crippling-critical",
    "Crippling Critical",
    "<p>At 10th level, when a duelist confirms a critical hit with a light or one-handed piercing weapon, she can apply one additional effect on top of the damage dealt: reduce all the target's speeds by 10 feet (minimum 5 feet) for 1 minute, 1d4 points of Strength or Dexterity damage, a &minus;4 penalty on saves for 1 minute, a &minus;4 penalty to AC for 1 minute, or 2d6 points of bleed damage.</p>",
    "cripplingCritical",
  ),
];

const LOREMASTER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "loremaster",
    "secret",
    "Secret",
    "<p>At 1st level, and every two levels thereafter (3rd, 5th, 7th, 9th), a loremaster chooses one secret from the Loremaster Secrets list, gaining its benefit.</p>",
    "secret",
  ),
  prestigeFeature(
    "loremaster",
    "lore",
    "Lore",
    "<p>At 2nd level, a loremaster adds half her loremaster level to all Knowledge skill checks, and can make all Knowledge checks untrained.</p>",
    "lore",
  ),
  prestigeFeature(
    "loremaster",
    "bonus-languages",
    "Bonus Languages",
    "<p>At 4th level, and again at 8th level, a loremaster can learn any one new language.</p>",
    "bonusLanguages",
  ),
  prestigeFeature(
    "loremaster",
    "greater-lore",
    "Greater Lore",
    "<p>At 6th level, a loremaster gains a +10 circumstance bonus on Spellcraft checks made to identify the properties of a magic item she examines.</p>",
    "greaterLore",
  ),
  prestigeFeature(
    "loremaster",
    "true-lore",
    "True Lore",
    "<p>Once per day at 10th level, a loremaster can use her knowledge to duplicate the effect of legend lore or analyze dweomer.</p>",
    "trueLore",
  ),
];

const PATHFINDER_CHRONICLER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "pathfinder-chronicler",
    "bardic-knowledge",
    "Bardic Knowledge (Pathfinder Chronicler)",
    "<p>Identical to the bard class feature of the same name; levels in this class stack with levels in any other class that grants a similar ability.</p>",
    "bardicKnowledgePathfinderChronicler",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "deep-pockets",
    "Deep Pockets",
    "<p>A Pathfinder chronicler can carry a stock of unspecified minor equipment worth up to 100 gp per class level; as a full-round action she can retrieve any specific item weighing 10 pounds or less, deducting its value from the allocated total. Spending an hour and the necessary gold restores the stock to full. With an hour spent packing daily, she also gains a +4 bonus to effective Strength for determining her light load, and a +4 bonus on Sleight of Hand checks to conceal small objects.</p>",
    "deepPockets",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "master-scribe",
    "Master Scribe",
    "<p>A Pathfinder chronicler adds her class level as a bonus on Linguistics, Profession (scribe), and Use Magic Device checks involving scrolls or other written magic; she can decipher unfamiliar text as a full-round action, and can always take 10 on Linguistics and Profession (scribe) checks, even under duress.</p>",
    "masterScribe",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "live-to-tell-the-tale",
    "Live to Tell the Tale",
    "<p>Once per day per two class levels, a Pathfinder chronicler can attempt a new saving throw against any ongoing effect against which she failed a save in a previous round.</p>",
    "liveToTellTheTale",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "pathfinding",
    "Pathfinding",
    "<p>A Pathfinder chronicler gains a +5 bonus on Survival checks to avoid getting lost and on Intelligence checks to escape a maze spell, and always uses the road/trail overland movement rate even in trackless terrain. With a DC 15 Survival check, she can extend this benefit to one companion per class level.</p>",
    "pathfinding",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "bardic-performance",
    "Bardic Performance (Pathfinder Chronicler)",
    "<p>Functions as the bard class feature of the same name, except the Pathfinder chronicler's effective bard level for it is 2 lower than her class level.</p>",
    "bardicPerformancePathfinderChronicler",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "improved-aid",
    "Improved Aid",
    "<p>At 3rd level, a successful aid another action grants a +4 bonus rather than the normal +2.</p>",
    "improvedAid",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "epic-tales",
    "Epic Tales",
    "<p>At 4th level, a Pathfinder chronicler can spend 1 hour inscribing an epic tale that conveys the effects of her bardic performance through the written word, expending a number of rounds of bardic performance equal to twice the tale's duration (maximum 10 rounds). Activating it is a full-round action; it lasts 1 day per class level and grants its reader bardic-music-like benefits for half the rounds expended.</p>",
    "epicTales",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "whispering-campaign",
    "Whispering Campaign",
    "<p>At 5th level, a Pathfinder chronicler can spend a use of bardic performance to denounce a creature in person (as doom) or denounce it to others (as enthrall, shifting the listeners' attitude toward the target one step for 1 day per class level).</p>",
    "whisperingCampaign",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "inspire-action",
    "Inspire Action",
    "<p>At 6th level, a Pathfinder chronicler can exhort one ally within hearing to immediately take an extra move action; at 9th level she can instead grant an extra standard action.</p>",
    "inspireAction",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "call-down-the-legends",
    "Call Down the Legends",
    "<p>Once per week as a full-round action at 7th level, a Pathfinder chronicler can summon 2d4 4th-level human barbarians with standard starting equipment, as though using a bronze horn of Valhalla.</p>",
    "callDownTheLegends",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "greater-epic-tales",
    "Greater Epic Tales",
    "<p>At 8th level, an epic tale read aloud by someone else takes effect as though the Pathfinder chronicler herself had used the bardic performance, but targets and uses the reader's Charisma score.</p>",
    "greaterEpicTales",
  ),
  prestigeFeature(
    "pathfinder-chronicler",
    "lay-of-the-exalted-dead",
    "Lay of the Exalted Dead",
    "<p>Once per week as a full-round action at 10th level, a Pathfinder chronicler can summon 1d4+1 5th-level incorporeal human barbarians equipped with +2 studded leather and +1 ghost touch greataxes, as though using an iron horn of Valhalla. Enemies who see them must succeed at a Will save (DC 15 + the chronicler's Charisma modifier) or be shaken for 1 round per summoned barbarian.</p>",
    "layOfTheExaltedDead",
  ),
];

const SHADOWDANCER_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "shadowdancer",
    "hide-in-plain-sight",
    "Hide in Plain Sight (Shadowdancer)",
    "<p>A shadowdancer can use Stealth even while being observed, as long as she is within 10 feet of an area of dim light (though not her own shadow).</p>",
    "hideInPlainSightShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "evasion",
    "Evasion (Shadowdancer)",
    "<p>At 2nd level, a shadowdancer takes no damage on a successful Reflex save against an effect that normally deals half damage on a successful save, as long as she is wearing light or no armor. A helpless shadowdancer does not gain the benefit of evasion.</p>",
    "evasionShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "darkvision",
    "Darkvision",
    "<p>At 2nd level, a shadowdancer gains darkvision with a range of 60 feet, or increases her existing darkvision range by 30 feet.</p>",
    "darkvision",
  ),
  prestigeFeature(
    "shadowdancer",
    "uncanny-dodge",
    "Uncanny Dodge (Shadowdancer)",
    "<p>At 2nd level, a shadowdancer can't be caught flat-footed, even by an invisible attacker (though she still loses her Dexterity bonus to AC if immobilized, or if successfully feinted). If she already has uncanny dodge from another class, she gains improved uncanny dodge instead.</p>",
    "uncannyDodgeShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "rogue-talent",
    "Rogue Talent",
    "<p>At 3rd level, and every three levels thereafter (6th, 9th), a shadowdancer gains a rogue talent, functioning as the rogue class feature of the same name; she can't select the same talent twice.</p>",
    "rogueTalent",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-illusion",
    "Shadow Illusion",
    "<p>At 3rd level, a shadowdancer can create visual illusions as silent image, using her shadowdancer level as caster level, usable once per day for every two shadowdancer levels she has.</p>",
    "shadowIllusion",
  ),
  prestigeFeature(
    "shadowdancer",
    "summon-shadow",
    "Summon Shadow",
    "<p>At 3rd level, a shadowdancer gains the service of an undead shadow companion matching her alignment, with hit points equal to half her own total; dismissing it prematurely requires a DC 15 Fortitude save or she takes a permanent negative level.</p>",
    "summonShadow",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-call",
    "Shadow Call",
    "<p>At 4th level, a shadowdancer can create quasi-real illusions of objects and creatures as shadow conjuration, using her shadowdancer level as caster level; at 10th level this instead functions as greater shadow conjuration.</p>",
    "shadowCall",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-jump",
    "Shadow Jump",
    "<p>Starting at 4th level, a shadowdancer can travel between two shadows as though using dimension door, as long as both areas have at least dim light; the total distance she can travel this way per day is 40 feet at 4th level, 80 feet at 6th, 160 feet at 8th, and 320 feet at 10th.</p>",
    "shadowJump",
  ),
  prestigeFeature(
    "shadowdancer",
    "defensive-roll",
    "Defensive Roll",
    "<p>Once per day at 5th level, when a shadowdancer would be reduced to 0 or fewer hit points by a blow that isn't an instant kill, she can attempt a Reflex save (DC = the damage dealt) to take only half damage.</p>",
    "defensiveRoll",
  ),
  prestigeFeature(
    "shadowdancer",
    "improved-uncanny-dodge",
    "Improved Uncanny Dodge (Shadowdancer)",
    "<p>At 5th level, a shadowdancer can no longer be flanked, unless the attacker has at least four more rogue levels than she has shadowdancer levels (levels from other uncanny-dodge-granting classes stack for this purpose).</p>",
    "improvedUncannyDodgeShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "slippery-mind",
    "Slippery Mind",
    "<p>At 7th level, if a shadowdancer fails a Will save against an enchantment spell or effect, she can attempt a second save one round later to negate its effect.</p>",
    "slipperyMind",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-power",
    "Shadow Power",
    "<p>Once per day at 8th level (twice per day at 10th level), a shadowdancer can create quasi-real illusions of energy or other effects as shadow evocation, using her shadowdancer level as caster level.</p>",
    "shadowPower",
  ),
  prestigeFeature(
    "shadowdancer",
    "improved-evasion",
    "Improved Evasion (Shadowdancer)",
    "<p>At 10th level, a shadowdancer takes no damage on a successful Reflex save against an effect that normally deals half damage on a success, and only half damage even on a failed save, as long as she is wearing light or no armor.</p>",
    "improvedEvasionShadowdancer",
  ),
  prestigeFeature(
    "shadowdancer",
    "shadow-master",
    "Shadow Master",
    "<p>At 10th level, while in an area of dim light, a shadowdancer gains DR 10/&mdash; and a +2 luck bonus on all saving throws; a critical hit she scores against a foe in dim light blinds that foe for 1d6 rounds.</p>",
    "shadowMaster",
  ),
];

/**
 * Student of War — the first prestige class here that isn't one of the CRB
 * ten. Adventurer's Guide (PZO1138) p. 142, originally Seekers of Secrets
 * (PZO9410) p. 62; the two printings are mechanically identical and the table
 * below was cross-checked line-for-line against both d20pfsrd and aonprd, the
 * same two-independent-sources method as the CRB batch.
 *
 * Tiers: full BAB, one good save (Will, `highPrestige` — 1,1,2,2,3,3,4,4,5,5)
 * and two poor (Fort/Ref, `lowPrestige` — 0,1,1,1,2,2,2,3,3,3). Both match the
 * published table exactly under the existing formulas, so this class needed no
 * new tier.
 *
 * Three features are more than prose:
 *   - **Mind Over Metal** is an ability *substitution* (Int in place of Dex for
 *     AC), not a bonus, so it can't be a `Change` — it is registered in the
 *     engine's `ability-substitution.ts` by name slug. Renaming this feature
 *     breaks that link; the engine test asserts the wiring end-to-end.
 *   - **Bonus Combat Feat** grants real feat slots via `bonusFeats`
 *     (1/2/3 at levels 2/5/8 = `floor((level + 1) / 3)`), rather than the
 *     prose-only posture the CRB batch took for Eldritch Knight's bonus combat
 *     feats — the progression is a plain function of level, so wiring it is
 *     trivially correct rather than a guess.
 *   - **Additional Skill** grants player-chosen class skills through the
 *     generic mechanism in the engine's `bonus-class-skills.ts`, also keyed by
 *     name slug — same renaming caveat as Mind Over Metal.
 */
const AG: SourceRef[] = [{ id: "PZO1138", pages: "142" }];

const STUDENT_OF_WAR_FEATURES: ClassFeature[] = [
  prestigeFeature(
    "student-of-war",
    "additional-skill",
    "Additional Skill",
    "<p>At 1st level and every 2 levels thereafter (3rd, 5th, 7th, and 9th), a student of war gains a new class skill of her choice.</p><p><em>Choose the skills under Bonus Class Skills in the class builder; they count as class skills automatically.</em></p>",
    "additionalSkill",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "know-your-enemy",
    "Know Your Enemy",
    "<p>As a move action, a student of war can study a foe she can see and attempt a Knowledge check appropriate to the creature's type (DC = 10 + the target's HD). Success grants a +1 insight bonus against that enemy, applied through one of three stances chosen when the check is attempted: defensive (AC), martial (attack rolls), or tactical (CMB and CMD). The bonus increases to +2 at 4th level and +3 at 7th level, and at 7th level studying a foe becomes a swift action.</p>",
    "knowYourEnemy",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "bonus-combat-feat",
    "Bonus Combat Feat (SOW)",
    "<p>At 2nd, 5th, and 8th level, a student of war gains a bonus Combat feat. She must meet the prerequisites for the chosen feat.</p>",
    "bonusCombatFeatStudentOfWar",
    [{ formula: "floor((@class.unlevel + 1) / 3)", target: "bonusFeats", type: "untyped" }],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "mind-over-metal",
    "Mind Over Metal",
    "<p>At 2nd level, when a student of war is using armor or a shield, she can use her Intelligence modifier in place of her Dexterity modifier for determining her Armor Class.</p><p><em>Applied automatically while armor or a shield is equipped, and only when Intelligence is the better modifier. The armor's maximum Dexterity bonus still caps the substituted value.</em></p>",
    "mindOverMetal",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "anticipate",
    "Anticipate",
    "<p>At 3rd level, once per day as an immediate action, a student of war can ignore any damage and effects of a spell or ability she successfully saved against. She can use this ability one additional time per day at 6th level and again at 9th level.</p>",
    "anticipate",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "telling-blow",
    "Telling Blow",
    "<p>At 6th level, a student of war can aim her blows at the weakest point in a studied foe's defense, ignoring up to 5 points of damage reduction. She is also treated as having the Mobility feat when provoking attacks of opportunity from a studied foe.</p>",
    "tellingBlow",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "nemesis",
    "Nemesis",
    "<p>At 9th level, once per day as a swift action, a student of war can focus on a weapon she holds and render it anathema to her studied foe for 1 minute.</p>",
    "nemesis",
    [],
    AG,
  ),
  prestigeFeature(
    "student-of-war",
    "deadly-blow",
    "Deadly Blow",
    "<p>At 10th level, a student of war can find weak spots where none should exist. When she uses her know your enemy ability and exceeds the Knowledge check DC by 10 or more, she ignores the target's natural damage reduction and its immunity to critical hits.</p>",
    "deadlyBlow",
    [],
    AG,
  ),
];

/** Hand-authored `ClassFeature`s granted by the two chunk-1 prestige classes. */
export const SUPPLEMENTAL_PRESTIGE_CLASS_FEATURES: ClassFeature[] = [
  ...ELDRITCH_KNIGHT_FEATURES,
  ...MYSTIC_THEURGE_FEATURES,
  ...ARCANE_ARCHER_FEATURES,
  ...ARCANE_TRICKSTER_FEATURES,
  ...ASSASSIN_FEATURES,
  ...DRAGON_DISCIPLE_FEATURES,
  ...DUELIST_FEATURES,
  ...LOREMASTER_FEATURES,
  ...PATHFINDER_CHRONICLER_FEATURES,
  ...SHADOWDANCER_FEATURES,
  ...STUDENT_OF_WAR_FEATURES,
];

/**
 * Issue #66 chunk 4 — chassis for the eight remaining CRB prestige classes
 * (see the chunk-4 module doc comment above `ARCANE_ARCHER_FEATURES` for
 * sourcing/verification notes, the CRB-has-ten-not-nine correction, the
 * two-good-saves surprise, and the ability-score-increase `changes` posture).
 * Every entry below carries no armor/weapon proficiencies (published CRB
 * standard for all ten CRB prestige classes, EK/MT included).
 */
const CHUNK4_PRESTIGE_CLASSES: Class[] = [
  {
    id: "prestige:arcane-archer",
    name: "Arcane Archer",
    uuid: "prestige-class:arcane-archer",
    description:
      "<p>The arcane archer weaves ancient elven magic into her bow, turning ordinary arrows into instruments of devastating, supernatural precision.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "arcaneArcher",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "highPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: ["per", "rid", "ste", "sur"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "arcane-archer", "enhance-arrows", "Enhance Arrows"),
      prestigeGrant(2, "arcane-archer", "imbue-arrow", "Imbue Arrow"),
      prestigeGrant(4, "arcane-archer", "seeker-arrow", "Seeker Arrow"),
      prestigeGrant(6, "arcane-archer", "phase-arrow", "Phase Arrow"),
      prestigeGrant(8, "arcane-archer", "hail-of-arrows", "Hail of Arrows"),
      prestigeGrant(10, "arcane-archer", "arrow-of-death", "Arrow of Death"),
    ],
    // Spells per Day column reads "—" at 1st, 5th, 9th and "+1 level of
    // existing arcane spellcasting class" every other level (verified
    // identically on legacy.aonprd.com and aonprd.com).
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }],
    prereqs: {
      bab: 6,
      feats: ["Point-Blank Shot", "Precise Shot"],
      casting: [{ kind: "arcane", spellLevel: 1 }],
      prereqText:
        "Base Attack Bonus: +6. Feats: Point-Blank Shot, Precise Shot, Weapon Focus (longbow or shortbow). Spells: Ability to cast 1st-level arcane spells.",
    },
  },
  {
    id: "prestige:arcane-trickster",
    name: "Arcane Trickster",
    uuid: "prestige-class:arcane-trickster",
    description:
      "<p>The arcane trickster fuses arcane spellcasting with a rogue's guile, using magic to enhance her thievery, misdirection, and escapes.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "arcaneTrickster",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" },
    skillsPerLevel: 4,
    classSkills: [
      "acr",
      "apr",
      "blf",
      "clm",
      "dip",
      "dev",
      "dis",
      "esc",
      ...KNOWLEDGE_ALL,
      "per",
      "sen",
      "slt",
      "spl",
      "ste",
      "swm",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "arcane-trickster", "ranged-legerdemain", "Ranged Legerdemain"),
      prestigeGrant(2, "arcane-trickster", "sneak-attack", "Sneak Attack (Arcane Trickster)"),
      prestigeGrant(3, "arcane-trickster", "impromptu-sneak-attack", "Impromptu Sneak Attack"),
      prestigeGrant(5, "arcane-trickster", "tricky-spells", "Tricky Spells"),
      prestigeGrant(9, "arcane-trickster", "invisible-thief", "Invisible Thief"),
      prestigeGrant(10, "arcane-trickster", "surprise-spells", "Surprise Spells"),
    ],
    // Spells per Day reads "+1 level of existing class" at every level, 1-10.
    castingAdvancement: [{ kind: "arcane", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    prereqs: {
      skillRanks: [
        { skill: "dev", ranks: 4 },
        { skill: "esc", ranks: 4 },
        { skill: "kar", ranks: 4 },
      ],
      casting: [{ kind: "arcane", spellLevel: 2 }],
      prereqText:
        "Alignment: Any nonlawful. Skills: Disable Device 4 ranks, Escape Artist 4 ranks, Knowledge (arcana) 4 ranks. Spells: Able to cast mage hand and at least one arcane spell of 2nd level or higher. Special: Sneak attack +2d6.",
    },
  },
  {
    id: "prestige:assassin",
    name: "Assassin",
    uuid: "prestige-class:assassin",
    description:
      "<p>The assassin turns murder into an art, blending stealth, poison, and a supernatural killing strike honed through cold-blooded training.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "assassin",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: [
      "acr",
      "blf",
      "clm",
      "dip",
      "dev",
      "dis",
      "esc",
      "int",
      "lin",
      "per",
      "sen",
      "slt",
      "ste",
      "swm",
      "umd",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "assassin", "sneak-attack", "Sneak Attack (Assassin)"),
      prestigeGrant(1, "assassin", "death-attack", "Death Attack"),
      prestigeGrant(1, "assassin", "poison-use", "Poison Use (Assassin)"),
      prestigeGrant(2, "assassin", "save-bonus-against-poison", "Save Bonus Against Poison"),
      prestigeGrant(2, "assassin", "uncanny-dodge", "Uncanny Dodge (Assassin)"),
      prestigeGrant(4, "assassin", "hidden-weapons", "Hidden Weapons"),
      prestigeGrant(4, "assassin", "true-death", "True Death"),
      prestigeGrant(5, "assassin", "improved-uncanny-dodge", "Improved Uncanny Dodge (Assassin)"),
      prestigeGrant(6, "assassin", "quiet-death", "Quiet Death"),
      prestigeGrant(8, "assassin", "hide-in-plain-sight", "Hide in Plain Sight (Assassin)"),
      prestigeGrant(9, "assassin", "swift-death", "Swift Death"),
      prestigeGrant(10, "assassin", "angel-of-death", "Angel of Death"),
    ],
    prereqs: {
      skillRanks: [
        { skill: "dis", ranks: 2 },
        { skill: "ste", ranks: 5 },
      ],
      prereqText:
        "Alignment: Any evil. Skills: Disguise 2 ranks, Stealth 5 ranks. Special: The character must kill someone for no other reason than to become an assassin.",
    },
  },
  {
    id: "prestige:dragon-disciple",
    name: "Dragon Disciple",
    uuid: "prestige-class:dragon-disciple",
    description:
      "<p>The dragon disciple awakens the draconic blood within her, gradually taking on a dragon's toughness, strength, and elemental power.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "dragonDisciple",
    subType: "prestige",
    hd: 12,
    bab: "med",
    saves: { fort: "highPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 2,
    classSkills: ["dip", "esc", "fly", ...KNOWLEDGE_ALL, "per", "spl"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "dragon-disciple", "blood-of-dragons", "Blood of Dragons"),
      prestigeGrant(1, "dragon-disciple", "natural-armor", "Natural Armor"),
      prestigeGrant(2, "dragon-disciple", "strength-increase", "Strength Increase"),
      prestigeGrant(2, "dragon-disciple", "bloodline-feat", "Draconic Bloodline Feat"),
      prestigeGrant(2, "dragon-disciple", "dragon-bite", "Dragon Bite"),
      prestigeGrant(3, "dragon-disciple", "breath-weapon", "Breath Weapon"),
      // Second grant of the SAME feature (Strength Increase, +2 at 2nd AND
      // 4th) — see the chunk-4 module doc comment: two grants of one
      // `changes`-bearing feature correctly double the effect once both
      // levels are reached, without a second differently-named feature.
      prestigeGrant(4, "dragon-disciple", "strength-increase", "Strength Increase"),
      prestigeGrant(5, "dragon-disciple", "blindsense", "Blindsense"),
      prestigeGrant(6, "dragon-disciple", "constitution-increase", "Constitution Increase"),
      prestigeGrant(7, "dragon-disciple", "dragon-form", "Dragon Form"),
      prestigeGrant(8, "dragon-disciple", "intelligence-increase", "Intelligence Increase"),
      prestigeGrant(9, "dragon-disciple", "wings", "Wings"),
    ],
    // Spells per Day reads "—" at 1st, 5th, 9th and "+1 level arcane" every
    // other level (verified identically on legacy.aonprd.com and aonprd.com).
    castingAdvancement: [{ kind: "arcane", levels: [2, 3, 4, 6, 7, 8, 10] }],
    prereqs: {
      skillRanks: [{ skill: "kar", ranks: 5 }],
      casting: [{ kind: "arcane", spellLevel: 1 }],
      prereqText:
        "Race: Any nondragon. Skills: Knowledge (arcana) 5 ranks. Languages: Draconic. Spells: Ability to cast 1st-level arcane spells without preparation. A character with sorcerer levels must have the draconic bloodline, and any sorcerer levels gained after taking this class must also be in the draconic bloodline.",
    },
  },
  {
    id: "prestige:duelist",
    name: "Duelist",
    uuid: "prestige-class:duelist",
    description:
      "<p>The duelist is a master of finesse combat, turning speed, precision, and elegant swordplay into a deadly, mobile fighting style.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "duelist",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 4,
    classSkills: ["acr", "blf", "esc", "per", "prf", "sen"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "duelist", "canny-defense", "Canny Defense"),
      prestigeGrant(1, "duelist", "precise-strike", "Precise Strike"),
      prestigeGrant(2, "duelist", "improved-reaction", "Improved Reaction"),
      prestigeGrant(2, "duelist", "parry", "Parry"),
      prestigeGrant(3, "duelist", "enhanced-mobility", "Enhanced Mobility"),
      prestigeGrant(4, "duelist", "combat-reflexes", "Combat Reflexes (Duelist)"),
      prestigeGrant(4, "duelist", "grace", "Grace"),
      prestigeGrant(5, "duelist", "riposte", "Riposte"),
      prestigeGrant(6, "duelist", "acrobatic-charge", "Acrobatic Charge"),
      prestigeGrant(7, "duelist", "elaborate-defense", "Elaborate Defense"),
      prestigeGrant(9, "duelist", "deflect-arrows", "Deflect Arrows (Duelist)"),
      prestigeGrant(9, "duelist", "no-retreat", "No Retreat"),
      prestigeGrant(10, "duelist", "crippling-critical", "Crippling Critical"),
    ],
    prereqs: {
      bab: 6,
      feats: ["Dodge", "Mobility", "Weapon Finesse"],
      skillRanks: [
        { skill: "acr", ranks: 2 },
        { skill: "prf", ranks: 2 },
      ],
      prereqText:
        "Base Attack Bonus: +6. Skills: Acrobatics 2 ranks, Perform 2 ranks. Feats: Dodge, Mobility, Weapon Finesse.",
    },
  },
  {
    id: "prestige:loremaster",
    name: "Loremaster",
    uuid: "prestige-class:loremaster",
    description:
      "<p>The loremaster pursues knowledge for its own sake, accumulating secrets and lore that grant subtle but far-reaching supernatural insight.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "loremaster",
    subType: "prestige",
    hd: 6,
    bab: "low",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 4,
    classSkills: ["apr", "dip", "han", "hea", ...KNOWLEDGE_ALL, "lin", "prf", "spl", "umd"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "loremaster", "secret", "Secret"),
      prestigeGrant(2, "loremaster", "lore", "Lore"),
      prestigeGrant(4, "loremaster", "bonus-languages", "Bonus Languages"),
      prestigeGrant(6, "loremaster", "greater-lore", "Greater Lore"),
      prestigeGrant(10, "loremaster", "true-lore", "True Lore"),
    ],
    // Spells per Day reads "+1 level of existing class" at every level, 1-10,
    // with NO arcane/divine restriction in the column text ("+1 level of
    // existing spellcasting class") — hence "any", unlike EK/MT/AT/DD's
    // arcane-only slots.
    castingAdvancement: [{ kind: "any", levels: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10] }],
    prereqs: {
      // Every requirement here is either an OR/"any N of" count (Knowledge
      // "any two", "any three metamagic or item creation feats") or a
      // parametrized Skill Focus target — none fits the flat
      // feats[]/skillRanks[] shape cleanly, so this class is prose-only.
      prereqText:
        "Skills: Knowledge (any two) 7 ranks in each. Feats: Any three metamagic or item creation feats, plus Skill Focus (Knowledge [any individual Knowledge skill]). Spells: Able to cast seven different divination spells, one of which must be 3rd level or higher.",
    },
  },
  {
    id: "prestige:pathfinder-chronicler",
    name: "Pathfinder Chronicler",
    uuid: "prestige-class:pathfinder-chronicler",
    description:
      "<p>The Pathfinder chronicler travels widely to record the deeds and discoveries of the Pathfinder Society, weaving bardic performance and scholarship together.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "pathfinderChronicler",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "highPrestige" },
    skillsPerLevel: 8,
    classSkills: [
      "apr",
      "blf",
      "dip",
      "dis",
      "esc",
      "int",
      ...KNOWLEDGE_ALL,
      "lin",
      "per",
      "prf",
      "rid",
      "sen",
      "slt",
      "sur",
      "umd",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(
        1,
        "pathfinder-chronicler",
        "bardic-knowledge",
        "Bardic Knowledge (Pathfinder Chronicler)",
      ),
      prestigeGrant(1, "pathfinder-chronicler", "deep-pockets", "Deep Pockets"),
      prestigeGrant(1, "pathfinder-chronicler", "master-scribe", "Master Scribe"),
      prestigeGrant(2, "pathfinder-chronicler", "live-to-tell-the-tale", "Live to Tell the Tale"),
      prestigeGrant(2, "pathfinder-chronicler", "pathfinding", "Pathfinding"),
      prestigeGrant(
        3,
        "pathfinder-chronicler",
        "bardic-performance",
        "Bardic Performance (Pathfinder Chronicler)",
      ),
      prestigeGrant(3, "pathfinder-chronicler", "improved-aid", "Improved Aid"),
      prestigeGrant(4, "pathfinder-chronicler", "epic-tales", "Epic Tales"),
      prestigeGrant(5, "pathfinder-chronicler", "whispering-campaign", "Whispering Campaign"),
      prestigeGrant(6, "pathfinder-chronicler", "inspire-action", "Inspire Action"),
      prestigeGrant(7, "pathfinder-chronicler", "call-down-the-legends", "Call Down the Legends"),
      prestigeGrant(8, "pathfinder-chronicler", "greater-epic-tales", "Greater Epic Tales"),
      prestigeGrant(
        10,
        "pathfinder-chronicler",
        "lay-of-the-exalted-dead",
        "Lay of the Exalted Dead",
      ),
    ],
    prereqs: {
      // Perform (oratory) and Profession (scribe) are parametrized subskill
      // requirements (no bare "prf"/"pro" SkillId match), so only the plain
      // Linguistics requirement is structured.
      skillRanks: [{ skill: "lin", ranks: 3 }],
      prereqText:
        "Skills: Linguistics 3 ranks, Perform (oratory) 5 ranks, Profession (scribe) 5 ranks. Special: Must have authored or scribed something (other than a magic scroll or similar device) for which another person (who is not a player character) paid at least 50 gp.",
    },
  },
  {
    id: "prestige:shadowdancer",
    name: "Shadowdancer",
    uuid: "prestige-class:shadowdancer",
    description:
      "<p>The shadowdancer forges a pact with the plane of shadow, gaining the ability to slip between shadows and command a shade of her own.</p>",
    sources: [{ id: "PZO1110" }],
    tag: "shadowdancer",
    subType: "prestige",
    hd: 8,
    bab: "med",
    saves: { fort: "lowPrestige", ref: "highPrestige", will: "lowPrestige" },
    skillsPerLevel: 6,
    classSkills: ["acr", "blf", "dip", "dis", "esc", "per", "prf", "slt", "ste"],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "shadowdancer", "hide-in-plain-sight", "Hide in Plain Sight (Shadowdancer)"),
      prestigeGrant(2, "shadowdancer", "evasion", "Evasion (Shadowdancer)"),
      prestigeGrant(2, "shadowdancer", "darkvision", "Darkvision"),
      prestigeGrant(2, "shadowdancer", "uncanny-dodge", "Uncanny Dodge (Shadowdancer)"),
      prestigeGrant(3, "shadowdancer", "rogue-talent", "Rogue Talent"),
      prestigeGrant(3, "shadowdancer", "shadow-illusion", "Shadow Illusion"),
      prestigeGrant(3, "shadowdancer", "summon-shadow", "Summon Shadow"),
      prestigeGrant(4, "shadowdancer", "shadow-call", "Shadow Call"),
      prestigeGrant(4, "shadowdancer", "shadow-jump", "Shadow Jump"),
      prestigeGrant(5, "shadowdancer", "defensive-roll", "Defensive Roll"),
      prestigeGrant(
        5,
        "shadowdancer",
        "improved-uncanny-dodge",
        "Improved Uncanny Dodge (Shadowdancer)",
      ),
      prestigeGrant(7, "shadowdancer", "slippery-mind", "Slippery Mind"),
      prestigeGrant(8, "shadowdancer", "shadow-power", "Shadow Power"),
      prestigeGrant(10, "shadowdancer", "improved-evasion", "Improved Evasion (Shadowdancer)"),
      prestigeGrant(10, "shadowdancer", "shadow-master", "Shadow Master"),
    ],
    prereqs: {
      feats: ["Combat Reflexes", "Dodge", "Mobility"],
      skillRanks: [{ skill: "ste", ranks: 5 }],
      prereqText:
        "Skills: Stealth 5 ranks, Perform (dance) 2 ranks. Feats: Combat Reflexes, Dodge, Mobility.",
    },
  },
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
    prereqs: {
      casting: [{ kind: "arcane", spellLevel: 3 }],
      prereqText:
        "Weapon Proficiency: Must be proficient with all martial weapons. Spells: Able to cast 3rd-level arcane spells.",
    },
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
    prereqs: {
      skillRanks: [
        { skill: "kar", ranks: 3 },
        { skill: "kre", ranks: 3 },
      ],
      casting: [
        { kind: "arcane", spellLevel: 2 },
        { kind: "divine", spellLevel: 2 },
      ],
      prereqText:
        "Skills: Knowledge (arcana) 3 ranks, Knowledge (religion) 3 ranks. Spells: Able to cast 2nd-level divine spells and 2nd-level arcane spells.",
    },
  },
  ...CHUNK4_PRESTIGE_CLASSES,
  {
    id: "prestige:student-of-war",
    name: "Student of War",
    uuid: "prestige-class:student-of-war",
    description:
      "<p>The student of war treats battle as a subject to be studied rather than a craft to be drilled, reading her enemies as readily as she reads a manual and turning what she knows into openings no one else can see.</p>",
    sources: AG,
    tag: "studentOfWar",
    subType: "prestige",
    hd: 10,
    bab: "high",
    saves: { fort: "lowPrestige", ref: "lowPrestige", will: "highPrestige" },
    skillsPerLevel: 6,
    classSkills: [
      "clm",
      "crf",
      "dev",
      "han",
      ...KNOWLEDGE_ALL,
      "lin",
      "per",
      "pro",
      "sen",
      "spl",
      "sur",
      "swm",
    ],
    armorProf: [],
    weaponProf: [],
    features: [
      prestigeGrant(1, "student-of-war", "additional-skill", "Additional Skill"),
      prestigeGrant(1, "student-of-war", "know-your-enemy", "Know Your Enemy"),
      prestigeGrant(2, "student-of-war", "bonus-combat-feat", "Bonus Combat Feat (SOW)"),
      prestigeGrant(2, "student-of-war", "mind-over-metal", "Mind Over Metal"),
      prestigeGrant(3, "student-of-war", "anticipate", "Anticipate"),
      prestigeGrant(6, "student-of-war", "telling-blow", "Telling Blow"),
      prestigeGrant(9, "student-of-war", "nemesis", "Nemesis"),
      prestigeGrant(10, "student-of-war", "deadly-blow", "Deadly Blow"),
    ],
    prereqs: {
      // Combat Expertise and Dodge are plain named feats, so they hard-block.
      // The rest stay advisory for the reasons the hybrid model already
      // enumerates: Skill Focus (any Knowledge) and Knowledge (any two) are
      // parametrized/OR requirements, martial-weapon proficiency counts
      // *any two* of a category rather than a named grant, and the
      // five-creatures requirement is pure table history.
      bab: 5,
      feats: ["Combat Expertise", "Dodge"],
      prereqText:
        "Base Attack Bonus: +5. Feats: Combat Expertise, Dodge, Skill Focus (any one Knowledge skill). Proficiency: Must be proficient with two martial weapons. Skills: Knowledge (any two) 4 ranks in each. Special: Must have succeeded at Knowledge checks against five distinct creatures prior to defeating them.",
    },
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
